"""Export the reviewed exterior only; retain the earlier teaching internals.

Procedural Blender skin is converted to portable vertex color plus glTF PBR.
The editable review source is never overwritten.
"""
from pathlib import Path
import json
import bpy
from mathutils import Vector

OUT = Path(__file__).resolve().parent.parent / 'public/models/local'
stats = {}
for tier in ('normal', 'ultra'):
    bpy.ops.wm.open_mainfile(filepath=str(OUT / 'lab-head-enhanced-review.blend'))
    objects = [o for o in bpy.context.scene.objects if o.type in ('MESH', 'CURVE')]
    bpy.ops.object.select_all(action='DESELECT')
    for obj in objects:
        bpy.context.view_layer.objects.active = obj
        obj.select_set(True)
        for mod in obj.modifiers:
            if mod.type == 'SUBSURF':
                mod.levels = 1 if tier == 'normal' else 2
        if obj.type == 'CURVE':
            obj.data.bevel_resolution = 0 if tier == 'normal' else 1
        bpy.ops.object.convert(target='MESH')
        obj = bpy.context.object
        if obj.name.startswith('HEAD_SURFACE'):
            obj.name = 'part-skin-head'
            dec = obj.modifiers.new('Web budget', 'DECIMATE')
            dec.ratio = .45 if tier == 'normal' else .65
            bpy.ops.object.modifier_apply(modifier=dec.name)
            mat = obj.data.materials[0]
            nodes = mat.node_tree.nodes
            nodes.clear()
            output = nodes.new('ShaderNodeOutputMaterial')
            shader = nodes.new('ShaderNodeBsdfPrincipled')
            shader.inputs['Base Color'].default_value = (.39, .20, .13, 1)
            shader.inputs['Roughness'].default_value = .53
            mat.node_tree.links.new(shader.outputs[0], output.inputs[0])
            color = obj.data.color_attributes.get('Face tone')
            if color:
                for item in color.data:
                    r, g, b, a = item.color
                    item.color = (.39*r, .20*g, .13*b, a)
                vertex = nodes.new('ShaderNodeVertexColor')
                vertex.layer_name = 'Face tone'
                mat.node_tree.links.new(vertex.outputs['Color'], shader.inputs['Base Color'])
        elif obj.name.startswith('Eyebrow'):
            obj.name = 'part-skin-' + obj.name
        else:
            obj.name = 'part-eye-' + obj.name
            if tier == 'normal':
                dec = obj.modifiers.new('Eye budget', 'DECIMATE')
                dec.ratio = .22
                bpy.ops.object.modifier_apply(modifier=dec.name)
        # Bake the shared world-space transform into meshes for stable framing.
        world = obj.matrix_world.copy()
        for vert in obj.data.vertices:
            point = world @ vert.co
            vert.co = Vector((point.x*.65, point.y*.65, (point.z-68.3)*.65))
        obj.matrix_world.identity()
        obj.select_set(False)
    meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH']
    for obj in meshes:
        obj.select_set(True)
        obj.data.calc_loop_triangles()
    path = OUT / f'lab-head-reviewed-{tier}.glb'
    bpy.ops.export_scene.gltf(filepath=str(path), export_format='GLB', use_selection=True,
        export_yup=True, export_animations=False)
    stats[tier] = dict(bytes=path.stat().st_size,
        triangles=sum(len(o.data.loop_triangles) for o in meshes), meshes=len(meshes))
(OUT / 'lab-head-reviewed-stats.json').write_text(json.dumps(stats, indent=2))
print(json.dumps(stats, indent=2))
