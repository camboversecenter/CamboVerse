"""Review candidate eyes, including a physical mesh cutaway in a temporary scene."""
import bpy,bmesh
from pathlib import Path
from mathutils import Vector
OUT=Path(__file__).resolve().parents[1]/'public/models/local'
bpy.ops.wm.open_mainfile(filepath=str(OUT/'lab-head-fitted-v3-review.blend'))
scene=bpy.context.scene;cam=scene.camera
def shot(name,target,offset,span):
 cam.location=Vector(target)+Vector(offset);cam.rotation_euler=(Vector(target)-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.ortho_scale=span
 scene.render.filepath=str(OUT/f'lab-head-fitted-v3-{name}.png');bpy.ops.render.render(write_still=True)
shot('side',(0,0,73),(55,-16,0),30)
pts=[]
for o in scene.objects:
 if o.type!='MESH':continue
 o.hide_render=o.get('anatomyPart')!='eyes'
 if not o.hide_render:pts.extend(o.matrix_world@Vector(v) for v in o.bound_box)
lo=Vector(tuple(min(p[i] for p in pts) for i in range(3)));hi=Vector(tuple(max(p[i] for p in pts) for i in range(3)));target=(lo+hi)/2
shot('isolated',target,(2,-35,3),(hi.x-lo.x)*1.3)
# Remove upper half only for the review render. Never export this scene.
for o in scene.objects:
 if o.type!='MESH' or o.hide_render:continue
 if 'nerve' in o.name.lower():continue
 bm=bmesh.new();bm.from_mesh(o.data)
 bmesh.ops.bisect_plane(bm,geom=list(bm.verts)+list(bm.edges)+list(bm.faces),dist=.00001,plane_co=target,plane_no=Vector((0,0,1)),clear_outer=True,clear_inner=False)
 bm.to_mesh(o.data);bm.free()
shot('cutaway',target,(1,-15,25),(hi.x-lo.x)*1.3)
