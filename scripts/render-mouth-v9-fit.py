import bpy
from pathlib import Path
from mathutils import Vector
OUT=Path(__file__).resolve().parents[1]/'public/models/local'
bpy.ops.wm.open_mainfile(filepath=str(OUT/'lab-head-fitted-v9-review.blend'))
before=set(bpy.context.scene.objects)
bpy.ops.import_scene.gltf(filepath=str(OUT/'lab-skeleton-v11-ultra.glb'))
for o in set(bpy.context.scene.objects)-before:
 if o.type=='MESH':
  points=[o.matrix_world@Vector(c) for c in o.bound_box]
  o.hide_render=min(p.z for p in points)<60
scene=bpy.context.scene
target=Vector((0,0,70))
scene.camera.location=target+Vector((12,-32,5))
scene.camera.rotation_euler=(target-scene.camera.location).to_track_quat('-Z','Y').to_euler()
scene.camera.data.ortho_scale=27
scene.render.filepath=str(OUT/'lab-head-fitted-v9-skull-fit.png')
bpy.ops.render.render(write_still=True)
