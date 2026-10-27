"""Build the local exterior-body pilot from MakeHuman's CC0 hm08 base mesh.

Run in a fresh Blender background process. Source is pinned and verified; no
MakeHuman/MPFB executable code or third-party community assets are used.
"""
from pathlib import Path
import hashlib
import json
import math
import sys
import random
import bpy
import bmesh
from mathutils import Vector

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public/models/local"
FACIAL = '--facial-v2' in sys.argv
PREFIX = 'lab-body-face-v2' if FACIAL else 'lab-body-makehuman'
SOURCE = OUT / "makehuman-source/base.obj"
SHA256 = "8e761e6624b8f54536409135d1636da63b32486a90d4897f84e121d144f6fb4c"
assert hashlib.sha256(SOURCE.read_bytes()).hexdigest() == SHA256, "Unexpected source mesh"


def read_source():
    vertices, groups = [], {}
    group = None
    for line in SOURCE.read_text().splitlines():
        fields = line.split()
        if not fields:
            continue
        if fields[0] == "v":
            vertices.append(tuple(map(float, fields[1:4])))
        elif fields[0] == "g":
            group = fields[1]
            groups.setdefault(group, [])
        elif fields[0] == "f" and group:
            groups[group].append([int(item.split('/')[0]) - 1 for item in fields[1:]])
    return vertices, groups


VERTS, GROUPS = read_source()
BODY_IDS = sorted({i for face in GROUPS['body'] for i in face})
BOTTOM = min(VERTS[i][1] for i in BODY_IDS)
TOP = max(VERTS[i][1] for i in BODY_IDS)
SCALE = 175 / (TOP - BOTTOM)


def position(co):
    # MakeHuman Y-up -> Blender Z-up -> glTF Y-up. Feet match the lab bench.
    x, y, z = co
    return (x * SCALE, -z * SCALE, (y - BOTTOM) * SCALE - 86.1)


def material(name, color, roughness):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*color, 1)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get('Principled BSDF')
    bsdf.inputs['Base Color'].default_value = (*color, 1)
    bsdf.inputs['Roughness'].default_value = roughness
    return mat


def build(ultra):
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    for blocks in (bpy.data.meshes, bpy.data.materials):
        for block in list(blocks):
            if block.users == 0:
                blocks.remove(block)
    skin = material('skin', (0.48, 0.265, 0.16), 0.62)
    shorts = material('teaching-shorts', (0.025, 0.075, 0.09), 0.9)
    remap = {old: new for new, old in enumerate(BODY_IDS)}
    mesh = bpy.data.meshes.new('MakeHuman-hm08-body')
    mesh.from_pydata([position(VERTS[i]) for i in BODY_IDS], [],
                     [[remap[i] for i in face] for face in GROUPS['body']])
    mesh.update()
    body = bpy.data.objects.new('part-skin', mesh)
    bpy.context.collection.objects.link(body)
    mesh.materials.append(skin)
    mesh.materials.append(shorts)
    # A modest, neutral teaching presentation. No genital helper is imported.
    for poly in mesh.polygons:
        poly.use_smooth = True
    bpy.context.view_layer.objects.active = body
    body.select_set(True)
    if ultra or FACIAL:
        sub = body.modifiers.new('Smooth silhouette', 'SUBSURF')
        sub.levels = 1
        bpy.ops.object.modifier_apply(modifier=sub.name)
    dec = body.modifiers.new('Web geometry budget', 'DECIMATE')
    dec.ratio = 0.38 if ultra else 0.45
    if FACIAL:
        # Weight body reduction more strongly; preserve facial openings and ears.
        budget = body.vertex_groups.new(name='body-reduction')
        for v in body.data.vertices:
            budget.add([v.index], 0.05 if v.co.z > 60 else 1.0, 'REPLACE')
        dec.vertex_group = budget.name
        dec.vertex_group_factor = 1.0
        dec.ratio = .32 if ultra else .14
    bpy.ops.object.modifier_apply(modifier=dec.name)
    # Cut clean horizontal material boundaries after simplification.
    bm = bmesh.new()
    bm.from_mesh(body.data)
    for height in [-32, 13]:
        bmesh.ops.bisect_plane(bm, geom=list(bm.verts) + list(bm.edges) + list(bm.faces),
            dist=0.00001, plane_co=(0, 0, height), plane_no=(0, 0, 1))
    for face in bm.faces:
        center = face.calc_center_median()
        face.material_index = 1 if -32 < center.z < 13 and abs(center.x) < 25 else 0
        face.smooth = True
    bm.to_mesh(body.data)
    bm.free()
    # Localized chest expansion keeps feet, hands, and face stationary.
    body.shape_key_add(name='Basis')
    breath = body.shape_key_add(name='Breath')
    for vert in breath.data:
        x, y, z = vert.co
        weight = math.exp(-((z - 32) / 16) ** 2) * math.exp(-(x / 17) ** 4)
        vert.co.y += y * 0.018 * weight
        vert.co.x += x * 0.007 * weight
    for frame, value in [(1, 0), (49, 1), (97, 0)]:
        breath.value = value
        breath.keyframe_insert(data_path='value', frame=frame)
    body.data.shape_keys.animation_data.action.name = 'idle-breath'
    objects = [body]
    if FACIAL:
        eye_ids={i for face in GROUPS['joint-l-eye'] for i in face}
        lip_height=sum(position(VERTS[i])[2] for i in eye_ids)/len(eye_ids)-6.4*SCALE/10.4
        colors=body.data.color_attributes.new(name='Skin tone',type='FLOAT_COLOR',domain='POINT')
        for v in body.data.vertices:
            x,y,z=v.co
            front=max(0,min(1,(-y-4)/4))
            lip=math.exp(-(x/2.25)**6-((z-lip_height)/.65)**4)*front
            colors.data[v.index].color=(.48-.06*lip,.265-.12*lip,.16-.055*lip,1)
        node=skin.node_tree.nodes.new('ShaderNodeVertexColor');node.layer_name='Skin tone'
        skin.node_tree.links.new(node.outputs['Color'],skin.node_tree.nodes.get('Principled BSDF').inputs['Base Color'])
    white = material('eye-white', (0.76, 0.72, 0.65), 0.4)
    iris = material('iris', (0.055, 0.028, 0.016), 0.45)
    pupil = material('pupil', (.002,.001,.001), .25)
    brow_material = material('eyebrow', (.045,.022,.012), .9)
    for side in ['l', 'r']:
        ids = {i for face in GROUPS[f'joint-{side}-eye'] for i in face}
        center = Vector(position(tuple(sum(VERTS[i][axis] for i in ids) / len(ids) for axis in range(3))))
        eye_parts=[('eye', 1.12, white, 0), ('iris', 0.49, iris, 1.02)]
        if FACIAL:eye_parts.append(('pupil',.21,pupil,1.12))
        for suffix, radius, mat, offset in eye_parts:
            at = center + Vector((0, -offset, 0))
            bpy.ops.mesh.primitive_uv_sphere_add(segments=24 if ultra else 12, ring_count=12 if ultra else 8, radius=radius, location=at)
            eye = bpy.context.object
            eye.name = f'part-skin-{suffix}-{side}'
            if suffix in ('iris','pupil'):
                eye.scale.y = 0.18
            eye.data.materials.append(mat)
            for poly in eye.data.polygons:
                poly.use_smooth = True
            objects.append(eye)
        if FACIAL:
            # Project tapered brow strands onto this exact head surface.
            rng=random.Random(43)
            curve=bpy.data.curves.new('Brow strands','CURVE');curve.dimensions='3D'
            curve.bevel_depth=.022;curve.bevel_resolution=0
            sign=1 if center.x>0 else -1
            for strand in range(60 if ultra else 28):
                t=rng.random();x=sign*(abs(center.x)-1.25+t*2.9)
                z=center.z+1.45+.5*math.sin(t*math.pi)+rng.uniform(-.12,.12)
                points=[]
                for step in range(3):
                    hit,at,normal,_=body.ray_cast(Vector((x+sign*step*.11,-40,z+step*.10*(1-t))),Vector((0,1,0)))
                    if hit:points.append(at+normal*.035)
                if len(points)==3:
                    spline=curve.splines.new('POLY');spline.points.add(2)
                    for i,p in enumerate(points):spline.points[i].co=(*p,1);spline.points[i].radius=(1,.65,.05)[i]
            brow=bpy.data.objects.new('part-skin-brow-'+side,curve);bpy.context.collection.objects.link(brow);curve.materials.append(brow_material)
            bpy.ops.object.select_all(action='DESELECT');brow.select_set(True);bpy.context.view_layer.objects.active=brow
            bpy.ops.object.convert(target='MESH');objects.append(bpy.context.object)
    return objects


stats = {}
for tier in ['normal', 'ultra']:
    objects = build(tier == 'ultra')
    scene = bpy.context.scene
    scene.frame_start, scene.frame_end = 1, 97
    scene.render.fps = 24
    scene.frame_set(1)
    bpy.ops.object.select_all(action='DESELECT')
    triangles = 0
    for obj in objects:
        obj.select_set(True)
        obj.data.calc_loop_triangles()
        triangles += len(obj.data.loop_triangles)
    path = OUT / f'{PREFIX}-{tier}.glb'
    bpy.ops.export_scene.gltf(filepath=str(path), export_format='GLB', use_selection=True,
        export_animations=True, export_frame_range=True, export_yup=True, export_morph=True)
    stats[tier] = {'triangles': triangles, 'bytes': path.stat().st_size, 'mesh_objects': len(objects)}

bpy.ops.wm.save_as_mainfile(filepath=str(OUT / f'{PREFIX}.blend'))
(OUT / f'{PREFIX}-stats.json').write_text(json.dumps(stats, indent=2))
print(json.dumps(stats, indent=2))

# Reproducible visual check; these lights/camera are NOT exported to the GLBs.
scene = bpy.context.scene
scene.render.engine = 'CYCLES'
scene.cycles.samples = 16
scene.render.resolution_x, scene.render.resolution_y = 650, 850
scene.render.resolution_percentage = 100
scene.world.color = (0.2, 0.2, 0.2)
def aim(obj, point):
    obj.rotation_euler = (Vector(point) - obj.location).to_track_quat('-Z', 'Y').to_euler()
bpy.ops.object.camera_add(location=(110, -340, 55))
scene.camera = bpy.context.object
scene.camera.data.type = 'ORTHO'
scene.camera.data.ortho_scale = 210
aim(scene.camera, (0, 0, 0))
for location, energy, size in [((-100, -150, 180), 700000, 160), ((100, -80, 60), 250000, 120), ((20, 100, 100), 400000, 100)]:
    bpy.ops.object.light_add(type='AREA', location=location)
    light = bpy.context.object
    light.data.energy, light.data.shape, light.data.size = energy, 'DISK', size
    aim(light, (0, 0, 20))
scene.render.filepath = str(OUT / f'{PREFIX}-preview.png')
bpy.ops.render.render(write_still=True)
if FACIAL:
    scene.camera.location=(18,-95,79);scene.camera.data.ortho_scale=35
    aim(scene.camera,(0,0,75))
    scene.render.filepath=str(OUT/f'{PREFIX}-face.png')
    bpy.ops.wm.save_as_mainfile(filepath=str(OUT/f'{PREFIX}.blend'))
    bpy.ops.render.render(write_still=True)
