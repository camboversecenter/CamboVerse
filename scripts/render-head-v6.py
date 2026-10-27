"""Isolated review of the new head structures, never modifies exported meshes."""
import bpy
from pathlib import Path
from mathutils import Vector
OUT=Path(__file__).resolve().parents[1]/'public/models/local'
bpy.ops.wm.open_mainfile(filepath=str(OUT/'lab-head-fitted-v6-review.blend'))
scene=bpy.context.scene;scene.cycles.samples=12
scene.render.resolution_x=640;scene.render.resolution_y=640
for part in ['nose','mouth','ears']:
 points=[]
 for o in scene.objects:
  if o.type!='MESH':continue
  o.hide_render=o.get('anatomyPart')!=part
  if not o.hide_render:points.extend(o.matrix_world@Vector(v) for v in o.bound_box)
 lo=Vector(tuple(min(p[i] for p in points) for i in range(3)))
 hi=Vector(tuple(max(p[i] for p in points) for i in range(3)))
 target=(lo+hi)/2;scene.camera.location=target+Vector((15,-40,16))
 scene.camera.rotation_euler=(target-scene.camera.location).to_track_quat('-Z','Y').to_euler()
 scene.camera.data.ortho_scale=max(hi-lo)*1.4
 scene.render.filepath=str(OUT/f'lab-head-fitted-v6-{part}.png')
 bpy.ops.render.render(write_still=True)
