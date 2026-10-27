import bpy
from pathlib import Path
from mathutils import Vector
OUT=Path(__file__).resolve().parents[1]/'public/models/local'
bpy.ops.wm.open_mainfile(filepath=str(OUT/'lab-head-fitted-v2-review.blend'))
pts=[]
for o in bpy.context.scene.objects:
 if o.type!='MESH':continue
 o.hide_render=o.get('anatomyPart')!='ears'
 if not o.hide_render:pts.extend(o.matrix_world@Vector(v) for v in o.bound_box)
lo=Vector(tuple(min(p[i] for p in pts) for i in range(3)));hi=Vector(tuple(max(p[i] for p in pts) for i in range(3)))
target=(lo+hi)/2;cam=bpy.context.scene.camera;cam.location=target+Vector((8,-45,10));cam.rotation_euler=(target-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.ortho_scale=(hi.x-lo.x)*1.25
bpy.context.scene.render.filepath=str(OUT/'lab-head-fitted-v2-ears.png');bpy.ops.render.render(write_still=True)
