"""Generate the local Blender-to-Three.js Learning Lab heart pilot.

Run from the repository root:
  blender.exe --background --python scripts/generate-lab-heart-pilot.py

The outputs intentionally stay in public/models/local/ (git-ignored) until the
asset has passed licence, educator, and low-end Android review.
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
    for datablocks in (bpy.data.meshes, bpy.data.materials, bpy.data.cameras, bpy.data.lights):
        for block in datablocks:
            datablocks.remove(block)


def material(name, color, roughness=0.4, metallic=0.0):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*color, 1.0)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (*color, 1.0)
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Metallic"].default_value = metallic
    return mat


def smooth(obj):
    for polygon in obj.data.polygons:
        polygon.use_smooth = True


def ellipsoid(name, at, scale, mat, segments, rings):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments, ring_count=rings, location=at)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(mat)
    smooth(obj)
    return obj


def heart_shell(name, mat, segments):
    """An original heart-like hull: broad at the base, narrowing to an apex."""
    rings = [
        (-6.3, 0.45, 0.45), (-5.5, 1.2, 1.0), (-4.1, 2.75, 2.0),
        (-2.0, 4.35, 3.15), (0.4, 5.25, 3.75), (2.8, 5.45, 3.7),
        (4.6, 4.85, 3.25), (5.35, 3.7, 2.7),
    ]
    verts = []
    faces = []
    for y, rx, rz in rings:
        for i in range(segments):
            a = i / segments * math.tau
            # The front is gently fuller; the left side carries the apex.
            x = math.cos(a) * rx - (0.18 if y < 0 else 0)
            z = math.sin(a) * rz + max(0, math.sin(a)) * 0.35
            verts.append((x, y, z))
    for row in range(len(rings) - 1):
        for col in range(segments):
            nxt = (col + 1) % segments
            a = row * segments + col
            b = row * segments + nxt
            c = (row + 1) * segments + nxt
            d = (row + 1) * segments + col
            faces.append((a, b, c, d))
    # Close the two ends.
    bottom = len(verts)
    verts.append((0, rings[0][0] - 0.15, 0))
    top = len(verts)
    verts.append((0, rings[-1][0] + 0.18, 0))
    for col in range(segments):
        nxt = (col + 1) % segments
        faces.append((bottom, nxt, col))
        a = (len(rings) - 1) * segments + col
        b = (len(rings) - 1) * segments + nxt
        faces.append((top, a, b))
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(verts, [], faces)
    mesh.materials.append(mat)
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    smooth(obj)
    return obj


def tube(name, points, radius, mat, bevel_resolution):
    curve = bpy.data.curves.new(name, "CURVE")
    curve.dimensions = "3D"
    curve.resolution_u = bevel_resolution
    curve.bevel_depth = radius
    curve.bevel_resolution = bevel_resolution
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


def make_heart(ultra):
    seg = 32 if ultra else 16
    rings = 20 if ultra else 10
    bevel = 3 if ultra else 1
    muscle = material("Heart muscle", (0.37, 0.035, 0.025), 0.3)
    oxy = material("Oxygen-rich chamber", (0.63, 0.06, 0.035), 0.35)
    deoxy = material("Oxygen-poor chamber", (0.05, 0.10, 0.36), 0.38)
    artery = material("Artery", (0.72, 0.035, 0.02), 0.32)
    vein = material("Vein", (0.08, 0.13, 0.42), 0.35)

    # Original, stylised anatomy: a purpose-built hull and landmark vessels,
    # not a reconstruction of any supplied illustration or medical scan.
    myocardium = heart_shell("part-myocardium", muscle, seg)
    # Atria make the base read as a pair of distinct lobes.
    atrial_lobe_l = ellipsoid("part-la", (-2.45, 4.5, -0.1), (2.25, 1.8, 2.3), muscle, seg, rings)
    atrial_lobe_r = ellipsoid("part-ra", (2.35, 4.35, -0.15), (2.1, 1.65, 2.15), muscle, seg, rings)
    # Internal parts remain present for future cutaway exports but stay inside
    # the opaque external hull in this assembled-view pilot.
    lv = ellipsoid("part-lv", (-1.45, -0.9, 0.1), (2.4, 3.8, 1.9), oxy, seg, rings)
    rv = ellipsoid("part-rv", (1.55, -0.9, 0.1), (2.1, 3.4, 1.75), deoxy, seg, rings)
    la = ellipsoid("part-la-inner", (-2.1, 2.9, 0), (1.7, 1.4, 1.45), oxy, seg, rings)
    ra = ellipsoid("part-ra-inner", (2.05, 2.75, 0), (1.6, 1.3, 1.4), deoxy, seg, rings)

    aorta = tube("part-aorta", [(-1.3, 4.5, 0), (-1.45, 7.4, -0.15), (0.4, 9.1, -0.2), (3.35, 7.4, -0.35)], 0.82, artery, bevel)
    aorta_branches = [
        tube("part-aorta-branch-1", [(-0.65, 8.55, -0.2), (-1.2, 10.35, -0.25)], 0.32, artery, bevel),
        tube("part-aorta-branch-2", [(0.55, 8.75, -0.2), (0.45, 10.65, -0.15)], 0.34, artery, bevel),
        tube("part-aorta-branch-3", [(1.65, 8.35, -0.25), (2.25, 9.9, -0.3)], 0.3, artery, bevel),
    ]
    pulmonary = tube("part-pulmonary-trunk", [(0.9, 4.4, 0.25), (1.25, 6.8, 0.55), (4.2, 7.2, 0.45)], 0.7, vein, bevel)
    vena_cava = tube("part-vena-cava", [(2.25, 3.6, -0.7), (3.75, 5.7, -0.8), (3.25, 8.1, -0.85)], 0.58, vein, bevel)
    coronary = [
        tube("part-coronary-main", [(-3.7, 0.3, 3.45), (-3.0, 2.5, 4.0), (-0.2, 4.25, 4.0), (2.55, 1.55, 4.05), (2.8, -2.5, 3.3)], 0.24, artery, bevel),
        tube("part-coronary-left", [(-2.8, 2.35, 4.0), (-4.45, 1.0, 3.75), (-4.1, -1.9, 3.2)], 0.15, artery, bevel),
        tube("part-coronary-right", [(1.25, 2.7, 4.1), (3.9, 2.5, 3.55), (4.25, -0.4, 2.95)], 0.15, artery, bevel),
        tube("part-coronary-blue", [(2.85, 0.2, 4.0), (1.7, -1.6, 4.05), (0.35, -3.9, 3.45)], 0.12, vein, bevel),
    ]

    objects = [myocardium, atrial_lobe_l, atrial_lobe_r, lv, rv, la, ra, aorta, pulmonary, vena_cava, *aorta_branches, *coronary]
    for obj in objects:
        obj.rotation_mode = "XYZ"
        # A short, baked-friendly idle beat; normal and ultra share the same clip.
        obj.scale = (1, 1, 1)
        obj.keyframe_insert(data_path="scale", frame=1)
        obj.scale = (1.025, 1.04, 1.025)
        obj.keyframe_insert(data_path="scale", frame=12)
        obj.scale = (1, 1, 1)
        obj.keyframe_insert(data_path="scale", frame=24)

    # Name every object animation uniquely. Three.js can play all of these
    # tracks together, while duplicate names would overwrite each other.
    for obj in objects:
        if obj.animation_data and obj.animation_data.action:
            obj.animation_data.action.name = f"idle-{obj.name}"
    return objects


def export(ultra):
    reset_scene()
    objects = make_heart(ultra)
    bpy.context.scene.frame_start = 1
    bpy.context.scene.frame_end = 24
    bpy.context.scene.render.fps = 24
    bpy.ops.object.select_all(action="DESELECT")
    for obj in objects:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = objects[0]
    path = OUT / ("lab-heart-ultra.glb" if ultra else "lab-heart-normal.glb")
    bpy.ops.export_scene.gltf(
        filepath=str(path),
        export_format="GLB",
        use_selection=True,
        export_animations=True,
        export_frame_range=True,
        export_apply=True,
        export_yup=True,
    )
    return path


normal = export(False)
ultra = export(True)
# Save the editable Ultra source beside the local evaluation models.
bpy.ops.wm.save_as_mainfile(filepath=str(OUT / "lab-heart-pilot.blend"))
print(f"Generated {normal}")
print(f"Generated {ultra}")
