"""Temporary web trial: preserve all evaluated v3 geometry; never overwrite live assets.

Procedural Blender shaders are approximated with vertex-coloured PBR materials.
This is NOT the final baked/optimized mobile asset. Native .blend remains untouched.
"""
import bpy
import json
from array import array
from pathlib import Path
from mathutils import Vector
from mathutils.noise import noise

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'public/models/local/banteay-chhmar-review-v3'
bpy.ops.wm.open_mainfile(filepath=str(OUT / 'banteay-chhmar-review-v3.blend'))
scene = bpy.context.scene
meshes = [o for o in scene.objects if o.type == 'MESH']
deps = bpy.context.evaluated_depsgraph_get()
materials = {}
triangles = 0
for obj in meshes:
    # Apply bevels/normals to the export copy only, retaining the detailed geometry.
    evaluated = obj.evaluated_get(deps)
    mesh = bpy.data.meshes.new_from_object(evaluated, depsgraph=deps)
    original = obj.data.materials[0]
    original_name = original.name
    base = tuple(original.diffuse_color[:3])
    obj.modifiers.clear()
    obj.data = mesh
    if original_name not in materials:
        mat = bpy.data.materials.new('Trial PBR • ' + original_name)
        mat.use_nodes = True
        bs = mat.node_tree.nodes.get('Principled BSDF')
        source_bs = original.node_tree.nodes.get('Principled BSDF') if original.use_nodes else None
        bs.inputs['Roughness'].default_value = source_bs.inputs['Roughness'].default_value if source_bs else .85
        colors = mat.node_tree.nodes.new('ShaderNodeVertexColor')
        colors.layer_name = 'TrialColor'
        mat.node_tree.links.new(colors.outputs['Color'], bs.inputs['Base Color'])
        mat.diffuse_color = (*base, 1)
        materials[original_name] = mat
    mesh.materials.clear()
    mesh.materials.append(materials[original_name])
    colors = mesh.color_attributes.new(name='TrialColor', type='BYTE_COLOR', domain='POINT')
    mesh.color_attributes.active_color = colors
    values = array('f')
    stone = 'sandstone' in original_name.lower()
    for vertex in mesh.vertices:
        p = obj.matrix_world @ vertex.co
        variation = 1 + .32 * noise(p * 2.5) + .09 * noise(p * 32) if stone else 1
        values.extend((min(1, max(0, base[0] * variation)),
                       min(1, max(0, base[1] * variation)),
                       min(1, max(0, base[2] * variation)), 1))
    colors.data.foreach_set('color', values)
    mesh.calc_loop_triangles()
    triangles += len(mesh.loop_triangles)
    # Fit the existing project viewer, centred on the principal face tower.
    obj.location = (obj.location - Vector((8, -10, 0))) * .45
    obj.scale *= .45
    print('EXPORT_PREP ' + obj.name, flush=True)

bpy.ops.object.select_all(action='DESELECT')
for obj in meshes:
    obj.select_set(True)
path = OUT / 'banteay-chhmar-v3-trial.glb'
bpy.ops.export_scene.gltf(filepath=str(path), export_format='GLB', use_selection=True,
                          export_apply=True, export_cameras=False, export_lights=False,
                          export_animations=False, export_meshopt_compression_enable=True,
                          export_meshopt_extension='EXT_meshopt_compression')
report = {'status': 'temporary dev-only trial; not production approved',
          'triangles': triangles, 'mesh_objects': len(meshes), 'bytes': path.stat().st_size,
          'materials': 'Vertex-colour approximation, not baked Blender procedural shaders',
          'compression': 'EXT_meshopt_compression; no decimation',
          'scale': .45, 'blender_origin': [8, -10, 0], 'source_modified': False}
(OUT / 'web-trial-report.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
print('TRIAL_EXPORTED ' + json.dumps(report), flush=True)
