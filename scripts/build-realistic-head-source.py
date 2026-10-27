"""Create a Blender-only, neutral head source from the local CC0 MakeHuman base mesh.

This is an authoring checkpoint, not a web export.  It deliberately keeps the
source head as one clean, sculptable mesh so facial anatomy can be refined in
Blender before any Normal/Ultra GLB variants are generated.
"""
from pathlib import Path
import hashlib
import math
import random
import bpy
import bmesh
from mathutils import Vector

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "public/models/local/makehuman-source/base.obj"
OUT = ROOT / "public/models/local"


def parse_obj():
    verts, body_faces, group = [], [], None
    groups = {}
    assert hashlib.sha256(SOURCE.read_bytes()).hexdigest() == "8e761e6624b8f54536409135d1636da63b32486a90d4897f84e121d144f6fb4c"
    for raw in SOURCE.read_text().splitlines():
        fields = raw.split()
        if not fields:
            continue
        if fields[0] == "v":
            verts.append(tuple(map(float, fields[1:4])))
        elif fields[0] == "g":
            group = fields[1]
        elif fields[0] == "f":
            face = [int(value.split("/")[0]) - 1 for value in fields[1:]]
            groups.setdefault(group, []).append(face)
            if group == "body":
                body_faces.append(face)
    return verts, body_faces, groups


def make_material():
    material = bpy.data.materials.new("Neutral skin study")
    material.use_nodes = True
    nodes = material.node_tree.nodes
    links = material.node_tree.links
    bsdf = nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (0.43, 0.235, 0.155, 1)
    bsdf.inputs["Roughness"].default_value = 0.56
    bsdf.inputs["Subsurface Weight"].default_value = 0.08
    bsdf.inputs["Subsurface Radius"].default_value = (0.12, 0.06, 0.035)
    # Very subtle procedural breakup gives a matte skin-study appearance,
    # without baking or importing a photographic face texture.
    noise = nodes.new("ShaderNodeTexNoise")
    noise.inputs["Scale"].default_value = 190.0
    noise.inputs["Detail"].default_value = 2.0
    bump = nodes.new("ShaderNodeBump")
    bump.inputs["Strength"].default_value = 0.08
    bump.inputs["Distance"].default_value = 0.012
    links.new(noise.outputs["Fac"], bump.inputs["Height"])
    links.new(bump.outputs["Normal"], bsdf.inputs["Normal"])
    variation = nodes.new("ShaderNodeTexNoise")
    variation.inputs["Scale"].default_value = 5
    ramp = nodes.new("ShaderNodeValToRGB")
    ramp.color_ramp.elements[0].color = (.32, .145, .09, 1)
    ramp.color_ramp.elements[1].color = (.46, .26, .18, 1)
    links.new(variation.outputs["Fac"], ramp.inputs[0])
    links.new(ramp.outputs[0], bsdf.inputs["Base Color"])
    tint = nodes.new('ShaderNodeVertexColor')
    tint.layer_name = 'Face tone'
    mix = nodes.new('ShaderNodeMixRGB')
    mix.blend_type = 'MULTIPLY'
    mix.inputs[0].default_value = .65
    links.new(ramp.outputs[0], mix.inputs[1])
    links.new(tint.outputs['Color'], mix.inputs[2])
    links.new(mix.outputs[0], bsdf.inputs['Base Color'])
    rough = nodes.new('ShaderNodeMapRange')
    rough.inputs['To Min'].default_value = .42
    rough.inputs['To Max'].default_value = .60
    links.new(noise.outputs['Fac'], rough.inputs['Value'])
    links.new(rough.outputs[0], bsdf.inputs['Roughness'])
    return material


def eye_material(name, color, roughness):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*color, 1)
    mat.use_nodes = True
    shader = mat.node_tree.nodes.get("Principled BSDF")
    shader.inputs["Base Color"].default_value = (*color, 1)
    shader.inputs["Roughness"].default_value = roughness
    return mat


def sphere(name, center, radius, material, scale=(1, 1, 1)):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=64, ring_count=32, radius=radius, location=center)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    obj.data.materials.append(material)
    for face in obj.data.polygons:
        face.use_smooth = True
    return obj


def aim(obj, point):
    obj.rotation_euler = (Vector(point) - obj.location).to_track_quat("-Z", "Y").to_euler()


def main():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for collection in (bpy.data.meshes, bpy.data.materials, bpy.data.cameras, bpy.data.lights):
        for block in list(collection):
            if block.users == 0:
                collection.remove(block)

    verts, faces, groups = parse_obj()
    # MakeHuman is Y-up.  Use a compact, Blender-friendly head scale.
    scale = 10.4
    origin_y = -8.4488
    transformed = [(x * scale, -z * scale, (y - origin_y) * scale - 86.1) for x, y, z in verts]
    mesh = bpy.data.meshes.new("CC0_MakeHuman_head_source")
    mesh.from_pydata(transformed, [], faces)
    mesh.update()
    head = bpy.data.objects.new("HEAD_SURFACE__sculpt_here", mesh)
    bpy.context.collection.objects.link(head)
    mesh.materials.append(make_material())

    # Preserve head, ears and a short neck; remove the torso with a clean
    # horizontal cut.  The original topology remains available for sculpting.
    bm = bmesh.new()
    bm.from_mesh(mesh)
    bmesh.ops.bisect_plane(
        bm, geom=list(bm.verts) + list(bm.edges) + list(bm.faces),
        plane_co=(0, 0, 56.0), plane_no=(0, 0, 1), clear_inner=True,
    )
    # Seal only the new neck boundary; never cap the eye or mouth openings.
    bmesh.ops.holes_fill(bm, edges=[edge for edge in bm.edges if edge.is_boundary and all(abs(v.co.z - 56) < .001 for v in edge.verts)], sides=0)
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context='VERTS')
    for face in bm.faces:
        face.smooth = True
    bm.to_mesh(mesh)
    bm.free()
    crease = mesh.attributes.new('crease_edge', 'FLOAT', 'EDGE')
    for edge in mesh.edges:
        if all(abs(mesh.vertices[i].co.z - 56) < .001 for i in edge.vertices):
            crease.data[edge.index].value = 1
    # Subtle lip and cheek coloration follows actual vertex positions.
    eye_ids = {i for face in groups['joint-l-eye'] for i in face}
    eye_z = sum(transformed[i][2] for i in eye_ids) / len(eye_ids)
    colors = mesh.color_attributes.new(name='Face tone', type='FLOAT_COLOR', domain='POINT')
    for v in mesh.vertices:
        x, y, z = v.co
        front = max(0, min(1, (-y - 4) / 4))
        lips = math.exp(-(x / 2.25)**6 - ((z - (eye_z - 6.4)) / .65)**4) * front
        cheek = math.exp(-((abs(x) - 4.4) / 1.7)**2 - ((z - eye_z + 2.4) / 1.5)**2) * front
        colors.data[v.index].color = (1, 1 - .48*lips - .10*cheek, 1 - .40*lips - .10*cheek, 1)

    # A conservative subdivision helps the facial silhouette while retaining
    # editable quads from the source.  This stays unapplied for later tuning.
    bpy.context.view_layer.objects.active = head
    head.select_set(True)
    subdivision = head.modifiers.new("Preview subdivision", "SUBSURF")
    subdivision.levels = 2
    subdivision.render_levels = 2
    white = eye_material("Sclera warm ivory", (.72, .70, .65), .24)
    iris = eye_material("Brown iris", (.095, .042, .015), .3)
    pupil = eye_material("Pupil", (.002, .001, .001), .16)
    rim = eye_material("Iris outer rim", (.025, .012, .005), .28)
    hair = eye_material('Eyebrows dark brown', (.026, .013, .007), .75)
    bpy.context.view_layer.update()
    evaluated = head.evaluated_get(bpy.context.evaluated_depsgraph_get())
    rng = random.Random(43)
    for side in ('l', 'r'):
        indices = {i for face in groups[f'joint-{side}-eye'] for i in face}
        center = sum((Vector(transformed[i]) for i in indices), Vector()) / len(indices)
        sphere(f'Eye_{side}', center, 1.12, white)
        sphere(f'Iris_rim_{side}', center + Vector((0, -1.035, 0)), .49, rim, (1, .15, 1))
        sphere(f'Iris_{side}', center + Vector((0, -1.06, 0)), .445, iris, (1, .16, 1))
        sphere(f'Pupil_{side}', center + Vector((0, -1.12, 0)), .20, pupil, (1, .12, 1))
        # Individual tapered strands are projected onto the brow surface.
        curve = bpy.data.curves.new(f'Brow strands {side}', 'CURVE')
        curve.dimensions = '3D'
        curve.bevel_depth = .018
        curve.bevel_resolution = 2
        sign = 1 if center.x > 0 else -1
        for strand in range(150):
            t = rng.random()
            x = sign * (abs(center.x) - 1.25 + t * 2.9)
            z = center.z + 1.45 + .5 * math.sin(t*math.pi) + rng.uniform(-.18, .18)*(1-t*.65)
            points = []
            for step in range(3):
                xx = x + sign * step * .11
                zz = z + step * .12 * (1 - t)
                hit, at, normal, _ = evaluated.ray_cast(Vector((xx, -40, zz)), Vector((0, 1, 0)))
                if hit:
                    points.append(at + normal*.035)
            if len(points) == 3:
                spline = curve.splines.new('POLY')
                spline.points.add(2)
                for i, p in enumerate(points):
                    spline.points[i].co = (*p, 1)
                    spline.points[i].radius = (1, .7, .08)[i]
        brow = bpy.data.objects.new(f'Eyebrow_{side}', curve)
        bpy.context.collection.objects.link(brow)
        curve.materials.append(hair)

    # Preview lighting and camera are Blender-only and are not intended for web export.
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x, scene.render.resolution_y = 720, 720
    scene.render.resolution_percentage = 100
    scene.world.use_nodes = True
    scene.world.node_tree.nodes['Background'].inputs[0].default_value = (.16, .18, .22, 1)
    scene.world.node_tree.nodes['Background'].inputs[1].default_value = .4
    bpy.ops.object.camera_add(location=(0, -104, 66))
    camera = bpy.context.object
    camera.data.lens = 58
    camera.data.type = 'ORTHO'
    camera.data.ortho_scale = 43
    scene.camera = camera
    aim(camera, (0, 0, 73))
    for location, energy, size in [((-28, -38, 98), 45000, 28), ((28, -24, 76), 15000, 22), ((0, 25, 90), 35000, 20)]:
        bpy.ops.object.light_add(type="AREA", location=location)
        light = bpy.context.object
        light.data.energy, light.data.shape, light.data.size = energy, "DISK", size
        aim(light, (0, 0, 64))

    bpy.ops.object.select_all(action='DESELECT')
    head.select_set(True)
    bpy.context.view_layer.objects.active = head
    for screen in bpy.data.screens:
        for area in screen.areas:
            if area.type == 'VIEW_3D':
                area.spaces.active.region_3d.view_distance = 55
                area.spaces.active.region_3d.view_location = (0, 0, 73)
                area.spaces.active.region_3d.view_rotation = camera.rotation_euler.to_quaternion()
                area.spaces.active.shading.type = 'MATERIAL'
    head['source'] = 'Local MakeHuman hm08 base; source hash verified. Exterior study only.'
    scene.render.filepath = str(OUT / "lab-head-enhanced-front.png")
    bpy.ops.wm.save_as_mainfile(filepath=str(OUT / "lab-head-enhanced-review.blend"))
    bpy.ops.render.render(write_still=True)
    camera.location = (55, -104, 79)
    aim(camera, (0, 0, 73))
    scene.render.filepath = str(OUT / 'lab-head-enhanced-three-quarter.png')
    bpy.ops.render.render(write_still=True)
    camera.location = (104, -6, 76)
    aim(camera, (0, 0, 73))
    scene.render.filepath = str(OUT / 'lab-head-enhanced-profile.png')
    bpy.ops.render.render(write_still=True)


main()
