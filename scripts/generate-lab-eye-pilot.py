"""Original schematic eye asset, authored in Blender; no external assets.
Run in a fresh background process. Outputs are a local-only teaching pilot.
"""
from pathlib import Path
import math
import json
import bpy
from mathutils import Vector

OUT = Path(__file__).resolve().parent.parent / 'public/models/local'
OUT.mkdir(parents=True, exist_ok=True)


def material(name, color, roughness=0.5):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*color, 1)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get('Principled BSDF')
    bsdf.inputs['Base Color'].default_value = (*color, 1)
    bsdf.inputs['Roughness'].default_value = roughness
    return mat


def mesh(name, verts, faces, mat, colors=None):
    data = bpy.data.meshes.new(name)
    # Author in lab Y-up, convert to Blender Z-up before glTF export.
    data.from_pydata([(x, -z, y) for x, y, z in verts], [], faces)
    data.materials.append(mat)
    data.update()
    for poly in data.polygons:
        poly.use_smooth = True
    if colors:
        attr = data.color_attributes.new(name='Color', type='FLOAT_COLOR', domain='POINT')
        for item, color in zip(attr.data, colors):
            item.color = (*color, 1)
    obj = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(obj)
    return obj


def grid(name, rows, columns, fn, mat, color_fn=None):
    verts, faces, colors = [], [], []
    for i in range(rows + 1):
        for j in range(columns + 1):
            u, v = i / rows, j / columns
            verts.append(fn(u, v))
            if color_fn:
                colors.append(color_fn(u, v))
    for i in range(rows):
        for j in range(columns):
            a = i * (columns + 1) + j
            faces.append((a, a + columns + 1, a + columns + 2, a + 1))
    return mesh(name, verts, faces, mat, colors)


def shell(name, radius, start, end, angle, segments, rows, mat):
    return grid(name, rows, segments, lambda u, v: (
        radius * math.sin(start + u * (end-start)) * math.cos(angle + v * math.pi),
        radius * math.sin(start + u * (end-start)) * math.sin(angle + v * math.pi),
        radius * math.cos(start + u * (end-start))), mat)


def build(ultra):
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    for blocks in (bpy.data.meshes, bpy.data.materials, bpy.data.curves):
        for block in list(blocks):
            if not block.users:
                blocks.remove(block)
    seg, rows = (96, 32) if ultra else (40, 16)
    white = material('sclera', (0.82, 0.79, 0.70), 0.33)
    iris = material('iris', (1, 1, 1), 0.5)
    color_node = iris.node_tree.nodes.new('ShaderNodeVertexColor')
    color_node.layer_name = 'Color'
    iris.node_tree.links.new(color_node.outputs['Color'], iris.node_tree.nodes.get('Principled BSDF').inputs['Base Color'])
    dark = material('pupil', (0.002, 0.001, 0.0005), 0.95)
    clear = material('cornea', (0.82, 0.93, 1), 0.08)
    retina = material('retina', (0.42, 0.11, 0.06), 0.8)
    nerve = material('optic-nerve', (0.74, 0.61, 0.38), 0.65)
    lens = material('lens', (0.55, 0.8, 0.85), 0.2)
    vitreous = material('vitreous', (0.5, 0.72, 0.78), 0.3)
    objects = []
    for side, angle in [('back', math.pi / 2), ('front', -math.pi / 2)]:
        objects.append(shell(f'part-sclera-{side}', 11, math.pi/6, math.pi, angle, seg//2, rows, white))
        objects.append(shell(f'part-retina-{side}', 10.55, 1.0, math.pi, angle, seg//2, rows, retina))
    def iris_color(u, v):
        angle = v * math.tau
        fibers = (math.sin(angle * 61 + u * 9) + math.sin(angle * 43 - u * 13)) * 0.5
        value = 0.38 + fibers * 0.12 + math.sin(u * 30 + angle * 7) * 0.04
        edge = 0.28 if u < 0.08 or u > 0.92 else 1
        return (value * edge, (value * 0.56 + 0.03) * edge, (value * 0.19 + 0.015) * edge)
    iris_obj = grid('part-iris', 20 if ultra else 8, 256 if ultra else 96,
        lambda u, v: ((1.5 + 4*u)*math.cos(v*math.tau), (1.5 + 4*u)*math.sin(v*math.tau), 9.56 + 0.16*math.sin(u*math.pi)), iris, iris_color)
    # Morph only the inner boundary, so dilation exposes a true aperture.
    iris_obj.shape_key_add(name='Basis')
    dilation = iris_obj.shape_key_add(name='Dilation')
    for point in dilation.data:
        x, depth, height = point.co
        radius = math.hypot(x, height)
        expanded = radius + 2.3 * (5.5-radius) / 4
        point.co.x *= expanded / radius
        point.co.z *= expanded / radius
    objects.append(iris_obj)
    objects.append(grid('part-iris-pupil', 1, seg, lambda u,v: (1.5*u*math.cos(v*math.tau), 1.5*u*math.sin(v*math.tau), 9.48), dark))
    objects.append(grid('part-cornea-dome', rows//2, seg, lambda u,v: (5.5*u*math.cos(v*math.tau), 5.5*u*math.sin(v*math.tau), 9.53+2.1*(1-u*u)), clear))
    objects.append(grid('part-cornea-rim', 2, seg, lambda u,v: ((5.45+.10*u)*math.cos(v*math.tau), (5.45+.10*u)*math.sin(v*math.tau), 9.56), clear))
    # Separate lens, vitreous and nerve retain all existing lesson IDs.
    objects.append(grid('part-lens', rows, seg, lambda u,v: (4.1*math.sin(u*math.pi)*math.cos(v*math.tau), 4.1*math.sin(u*math.pi)*math.sin(v*math.tau), 6.1+1.7*math.cos(u*math.pi)), lens))
    objects.append(shell('part-vitreous', 9.8, 0.85, math.pi, math.pi/2, seg//2, rows, vitreous))
    objects.append(grid('part-optic-nerve', 8, seg//2, lambda u,v: (1.2+u*.7+1.35*math.cos(v*math.tau), -1.2+1.35*math.sin(v*math.tau), -10-u*8), nerve))
    # Sparse branching vessels, merged into one mesh/draw, visible on the white.
    verts, faces = [], []
    for branch in range(14 if ultra else 7):
        for step in range(16):
            theta = .65 + step / 15 * .85
            phi = branch * math.tau / (14 if ultra else 7) + .045*math.sin(step*.8 + branch)
            for offset in [-.003, .003]:
                verts.append((11.025*math.sin(theta)*math.cos(phi+offset), 11.025*math.sin(theta)*math.sin(phi+offset), 11.025*math.cos(theta)))
            if step:
                a = len(verts)-4
                faces.append((a,a+2,a+3,a+1))
    objects.append(mesh('part-sclera-vessels', verts, faces, material('surface-vessels', (.36,.075,.05), .65)))
    return objects


stats = {}
for tier in ['normal', 'ultra']:
    objects = build(tier == 'ultra')
    bpy.ops.object.select_all(action='DESELECT')
    count = 0
    for obj in objects:
        obj.select_set(True)
        obj.data.calc_loop_triangles()
        count += len(obj.data.loop_triangles)
    path = OUT / f'lab-eye-{tier}.glb'
    bpy.ops.export_scene.gltf(filepath=str(path), export_format='GLB', use_selection=True,
        export_yup=True, export_morph=True, export_animations=False)
    stats[tier] = {'triangles': count, 'bytes': path.stat().st_size, 'meshes': len(objects)}
# Make the saved authoring file open on the exterior, with the internal parts
# still available individually in the Outliner. Runtime visibility is in React.
for obj in objects:
    if any(obj.name.startswith('part-' + part) for part in ['retina', 'lens', 'vitreous']) or obj.name == 'part-cornea-dome':
        obj.hide_set(True)
bpy.ops.wm.save_as_mainfile(filepath=str(OUT / 'lab-eye-pilot.blend'))
(OUT/'lab-eye-stats.json').write_text(json.dumps(stats, indent=2))
print(json.dumps(stats, indent=2))
