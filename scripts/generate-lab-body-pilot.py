"""Generate an original, stylised Blender body pilot for the Learning Lab.

Outputs remain local-only until educator, licence, and mobile review are done.
The model intentionally contains no reproductive anatomy, facial likeness, or
clinical claim. It improves the external silhouette only; the app's existing
procedural cutaway, organs, and skeleton remain the teaching representations.
"""

from pathlib import Path
import math
import bpy

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "models" / "local"
OUT.mkdir(parents=True, exist_ok=True)


def reset_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for blocks in (bpy.data.meshes, bpy.data.materials, bpy.data.curves):
        for block in blocks:
            blocks.remove(block)


def skin_material():
    mat = bpy.data.materials.new("Neutral teaching skin")
    mat.diffuse_color = (0.64, 0.42, 0.30, 1)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (0.64, 0.42, 0.30, 1)
    bsdf.inputs["Roughness"].default_value = 0.58
    bsdf.inputs["Subsurface Weight"].default_value = 0.04
    return mat


def smooth(obj):
    for polygon in obj.data.polygons:
        polygon.use_smooth = True


def capsule(name, at, scale, mat, seg, rings):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=seg, ring_count=rings, location=at)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(mat)
    smooth(obj)
    return obj


def limb(name, points, radius, mat, bevel):
    curve = bpy.data.curves.new(name, "CURVE")
    curve.dimensions = "3D"
    curve.resolution_u = bevel
    curve.bevel_depth = radius
    curve.bevel_resolution = bevel
    spline = curve.splines.new("BEZIER")
    spline.bezier_points.add(len(points) - 1)
    for point, co in zip(spline.bezier_points, points):
        point.co = co
        point.handle_left_type = "AUTO"
        point.handle_right_type = "AUTO"
    obj = bpy.data.objects.new(name, curve)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(mat)
    return obj


def torso(name, mat, seg):
    # Continuous torso: shoulders broaden, waist narrows, hips return gently.
    rings = [
        (-34, 12.5, 8.5), (-25, 14.5, 9.0), (-12, 12.0, 8.0),
        (2, 14.5, 8.5), (17, 18.0, 8.8), (28, 20.0, 8.2), (35, 17.5, 7.2),
    ]
    verts, faces = [], []
    for y, rx, rz in rings:
        for i in range(seg):
            a = i / seg * math.tau
            # Back is slightly flatter; chest is fuller at the front.
            z = math.sin(a) * rz + max(0, math.sin(a)) * 1.0
            verts.append((math.cos(a) * rx, y, z))
    for row in range(len(rings) - 1):
        for col in range(seg):
            nxt = (col + 1) % seg
            a = row * seg + col
            faces.append((a, row * seg + nxt, (row + 1) * seg + nxt, (row + 1) * seg + col))
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(verts, [], faces)
    mesh.materials.append(mat)
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    smooth(obj)
    return obj


def create_body(ultra):
    seg = 32 if ultra else 16
    rings = 20 if ultra else 10
    bevel = 3 if ultra else 1
    skin = skin_material()
    objects = [torso("part-skin-torso", skin, seg)]
    objects += [
        capsule("part-skin-head", (0, 54, 0.4), (11.0, 13.0, 10.0), skin, seg, rings),
        capsule("part-skin-neck", (0, 39, 0), (5.2, 7.0, 5.0), skin, seg, rings),
        capsule("part-skin-hand-l", (-34, -13, 0), (4.2, 6.0, 2.7), skin, seg, rings),
        capsule("part-skin-hand-r", (34, -13, 0), (4.2, 6.0, 2.7), skin, seg, rings),
        capsule("part-skin-foot-l", (-10, -86, 4.0), (6.0, 4.0, 12.0), skin, seg, rings),
        capsule("part-skin-foot-r", (10, -86, 4.0), (6.0, 4.0, 12.0), skin, seg, rings),
    ]
    # Arms and legs bend slightly, avoiding the rigid mannequin look.
    objects += [
        limb("part-skin-arm-l", [(-18, 27, 0), (-29, 10, 0), (-31, -8, 0)], 4.5, skin, bevel),
        limb("part-skin-arm-r", [(18, 27, 0), (29, 10, 0), (31, -8, 0)], 4.5, skin, bevel),
        limb("part-skin-leg-l", [(-9, -30, 0), (-11, -58, 0), (-10, -80, 1)], 6.2, skin, bevel),
        limb("part-skin-leg-r", [(9, -30, 0), (11, -58, 0), (10, -80, 1)], 6.2, skin, bevel),
    ]
    # Gentle breathing animation, deliberately subtle in both modes.
    for obj in objects:
        obj.scale = (1, 1, 1)
        obj.keyframe_insert(data_path="scale", frame=1)
        obj.scale = (1.01, 1.018, 1.014)
        obj.keyframe_insert(data_path="scale", frame=30)
        obj.scale = (1, 1, 1)
        obj.keyframe_insert(data_path="scale", frame=60)
        if obj.animation_data and obj.animation_data.action:
            obj.animation_data.action.name = f"idle-{obj.name}"
    return objects


def export(ultra):
    reset_scene()
    objects = create_body(ultra)
    bpy.context.scene.frame_start = 1
    bpy.context.scene.frame_end = 60
    bpy.context.scene.render.fps = 24
    bpy.ops.object.select_all(action="DESELECT")
    for obj in objects:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = objects[0]
    path = OUT / ("lab-body-ultra.glb" if ultra else "lab-body-normal.glb")
    bpy.ops.export_scene.gltf(filepath=str(path), export_format="GLB", use_selection=True,
        export_animations=True, export_frame_range=True, export_apply=True, export_yup=True)
    return path


normal = export(False)
ultra = export(True)
bpy.ops.wm.save_as_mainfile(filepath=str(OUT / "lab-body-pilot.blend"))
print(f"Generated {normal}")
print(f"Generated {ultra}")
