"""Non-destructive assembled-head review. No asset export or mesh modification."""
import bpy
from pathlib import Path
from mathutils import Vector
OUT=Path(__file__).resolve().parents[1]/'public/models/local'
bpy.ops.wm.open_mainfile(filepath=str(OUT/'lab-head-fitted-v12-review.blend'))
for o in bpy.context.scene.objects:
 if o.type!='MESH':continue
 p=o
 while not p.get('anatomyPart') and p.parent:p=p.parent
 o.hide_render=bool(p.get('studyDentition'))
before=set(bpy.context.scene.objects)
bpy.ops.import_scene.gltf(filepath=str(OUT/'lab-skeleton-v11-ultra.glb'))
for o in set(bpy.context.scene.objects)-before:
 if o.type=='MESH':o.hide_render=min((o.matrix_world@Vector(c)).z for c in o.bound_box)<60
scene=bpy.context.scene;target=Vector((0,0,71))
scene.render.resolution_x=800;scene.render.resolution_y=800
scene.camera.data.ortho_scale=29
for name,delta in [('front',(0,-40,1)),('side',(36,-12,1))]:
 scene.camera.location=target+Vector(delta)
 scene.camera.rotation_euler=(target-scene.camera.location).to_track_quat('-Z','Y').to_euler()
 scene.render.filepath=str(OUT/f'lab-head-v12-assembled-{name}.png')
 bpy.ops.render.render(write_still=True)
