"""Original, simplified head-anatomy teaching asset authored in Blender.

Creates local-only Normal and Ultra GLB variants plus the editable .blend file.
It is intentionally illustrative: it teaches the relationship of surface,
facial muscles, skull and brain; it is not a clinical or surgical model.
"""
from pathlib import Path
import json
import bpy

OUT = Path(__file__).resolve().parent.parent / "public/models/local"
OUT.mkdir(parents=True, exist_ok=True)


def material(name, color, roughness=.5):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*color, 1)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (*color, 1)
    bsdf.inputs["Roughness"].default_value = roughness
    return mat


def uv(name, at, scale, mat, seg, rings):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=seg, ring_count=rings, location=at)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(mat)
    for polygon in obj.data.polygons:
        polygon.use_smooth = True
    return obj


def capsule(name, at, scale, mat, seg, rings=None):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=seg, ring_count=rings or max(8, seg // 2), location=at)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(mat)
    for polygon in obj.data.polygons:
        polygon.use_smooth = True
    return obj


def build(ultra):
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    seg = 64 if ultra else 28
    skin = material("skin", (.62, .34, .23), .52)
    skin_dark = material("skin-shadow", (.42, .18, .12), .66)
    feature = material("facial-feature", (.22, .055, .035), .7)
    white = material("eye-white", (.78, .82, .79), .34)
    iris = material("iris", (.17, .32, .27), .4)
    pupil = material("pupil", (.01, .008, .006), .8)
    bone = material("bone", (.73, .67, .52), .62)
    muscle = material("facial-muscle", (.54, .075, .055), .6)
    tendon = material("tendon", (.78, .50, .35), .66)
    brain = material("brain", (.60, .32, .32), .7)
    objects = []

    # Surface head: cranial vault + tapered lower face, deliberately stylised.
    objects += [
        # The skull sits behind a narrower, longer facial mass.  Keeping these
        # proportions distinct avoids the toy-like "ball on a face" silhouette.
        uv("part-skin-cranium", (0, .35, 8.2), (5.6, 5.25, 5.9), skin, seg, seg // 2),
        capsule("part-skin-face", (0, -1.65, 4.35), (4.85, 4.1, 5.55), skin, seg, seg // 2),
        capsule("part-skin-chin", (0, -1.45, .0), (3.05, 2.7, 2.25), skin, seg, seg // 2),
    ]
    # Nose, ears and neck make the exterior recognisable without a photo texture.
    bpy.ops.mesh.primitive_cone_add(vertices=seg // 2, radius1=.9, radius2=.25, depth=2.8, location=(0, -5.65, 4.95), rotation=(1.5708, 0, 0))
    nose = bpy.context.object; nose.name = "part-skin-nose"; nose.data.materials.append(skin); objects.append(nose)
    for side in (-1, 1):
        objects.append(capsule("part-ear", (side * 5.35, -.1, 5.7), (.95, .5, 1.7), skin, seg // 2))
        objects.append(uv("part-eye", (side * 1.95, -5.15, 5.35), (1.22, .5, .92), white, seg // 2, seg // 3))
        objects.append(uv("part-iris", (side * 1.95, -5.63, 5.35), (.58, .14, .58), iris, seg // 2, seg // 3))
        objects.append(uv("part-pupil", (side * 1.95, -5.76, 5.35), (.24, .07, .24), pupil, seg // 3, 8))
        # Brow ridges and mouth give the exterior a readable human expression
        # while staying deliberately neutral and non-photoreal.
        objects.append(capsule("part-skin-brow", (side * 2.0, -5.04, 6.45), (1.45, .18, .2), feature, seg // 3))
    objects.append(capsule("part-skin-mouth", (0, -5.2, 1.7), (1.65, .12, .2), feature, seg // 3))
    objects.append(capsule("part-skin-neck", (0, .7, -3.0), (4.1, 3.8, 5.2), skin_dark, seg, seg // 2))

    # Skull and jaw form a readable bony framework, with open orbit indication.
    objects += [
        uv("part-skull-cranium", (0, .45, 8.1), (5.15, 4.85, 5.4), bone, seg, seg // 2),
        capsule("part-skull-face", (0, -1.25, 3.8), (4.25, 3.45, 4.6), bone, seg, seg // 2),
        capsule("part-skull-jaw", (0, -1.2, .1), (3.5, 2.65, 1.65), bone, seg, seg // 2),
    ]
    for side in (-1, 1):
        # Dark orbit recess is grouped with skull so it remains an explanatory layer.
        objects.append(uv("part-skull-orbit", (side * 2.25, -4.45, 5.6), (1.65, .25, 1.45), pupil, seg // 2, seg // 3))

    # Brain lobes and a few broad gyri make the relationship to the skull visible.
    for side in (-1, 1):
        objects.append(uv("part-brain", (side * 2.15, .15, 8.2), (2.85, 3.95, 4.15), brain, seg, seg // 2))
        for row in range(4 if ultra else 3):
            objects.append(capsule("part-brain-gyrus", (side * 2.15, -3.68, 6.8 + row * 1.12), (2.05, .16, .19), tendon, seg // 3))

    # Muscle plaques on the anatomical right half of the face (viewer left).
    side = -1
    for name, at, scale in [
        ("frontalis", (side*1.8, -5.25, 9.2), (2.55, .22, 2.25)),
        ("temporalis", (side*4.45, -3.6, 7.2), (1.65, .24, 3.5)),
        ("orbicularis-oculi", (side*2.3, -5.55, 5.7), (1.78, .16, 1.55)),
        ("zygomaticus", (side*2.0, -5.45, 3.2), (1.2, .16, 2.7)),
        ("masseter", (side*4.1, -4.3, 1.7), (1.45, .25, 2.65)),
        ("orbicularis-oris", (0, -5.45, 1.8), (2.15, .18, .95)),
        ("sternocleidomastoid", (side*2.7, -2.7, -2.5), (1.0, .24, 3.8)),
    ]:
        objects.append(capsule(f"part-facial-muscles-{name}", at, scale, muscle, seg // 2))
    return objects


stats = {}
for tier in ("normal", "ultra"):
    objects = build(tier == "ultra")
    bpy.ops.object.select_all(action="DESELECT")
    triangles = 0
    for obj in objects:
        obj.select_set(True)
        obj.data.calc_loop_triangles()
        triangles += len(obj.data.loop_triangles)
    output = OUT / f"lab-head-anatomy-{tier}.glb"
    bpy.ops.export_scene.gltf(filepath=str(output), export_format="GLB", use_selection=True, export_yup=True)
    stats[tier] = {"triangles": triangles, "bytes": output.stat().st_size, "meshes": len(objects)}

bpy.ops.wm.save_as_mainfile(filepath=str(OUT / "lab-head-anatomy-pilot.blend"))
(OUT / "lab-head-anatomy-stats.json").write_text(json.dumps(stats, indent=2))
print(json.dumps(stats, indent=2))
