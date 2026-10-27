"""Fuse the reviewed teaching assembly into a continuous Blender surface."""
import bpy,json
from pathlib import Path
OUT=Path(__file__).resolve().parents[1]/'public/models/local'
bpy.ops.wm.open_mainfile(filepath=str(OUT/'humerus-study-v1-macro.blend'))
bpy.ops.object.select_all(action='DESELECT')
meshes=[o for o in bpy.context.scene.objects if o.type=='MESH']
for o in meshes:o.select_set(True)
bpy.context.view_layer.objects.active=meshes[0];bpy.ops.object.join();bone=bpy.context.object
bone.name='humerus-continuous';bone['studyPart']='humerus'
mod=bone.modifiers.new('Continuous bone surface','REMESH');mod.mode='VOXEL';mod.voxel_size=.085;mod.use_smooth_shade=True
bpy.ops.object.modifier_apply(modifier=mod.name)
mod=bone.modifiers.new('Blend landmark transitions','SMOOTH');mod.factor=1.1;mod.iterations=7
bpy.ops.object.modifier_apply(modifier=mod.name)
for face in bone.data.polygons:face.use_smooth=True
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'humerus-study-v2-macro.blend'))
stats={}
for tier,target in [('ultra',45000),('normal',9000)]:
    bone.data.calc_loop_triangles();total=len(bone.data.loop_triangles)
    if total>target:
        mod=bone.modifiers.new('Fidelity budget','DECIMATE');mod.ratio=target/total;bpy.ops.object.modifier_apply(modifier=mod.name)
    bone.data.calc_loop_triangles()
    path=OUT/f'humerus-study-v2-macro-{tier}.glb'
    bpy.ops.export_scene.gltf(filepath=str(path),export_format='GLB',use_selection=True,export_extras=True,export_animations=False)
    stats[tier]={'triangles':len(bone.data.loop_triangles),'bytes':path.stat().st_size}
bpy.ops.wm.open_mainfile(filepath=str(OUT/'humerus-study-v2-macro.blend'))
bpy.context.scene.render.filepath=str(OUT/'humerus-study-v2-macro-preview.png');bpy.ops.render.render(write_still=True)
(OUT/'humerus-study-v2-stats.json').write_text(json.dumps(stats,indent=2));print(stats)
