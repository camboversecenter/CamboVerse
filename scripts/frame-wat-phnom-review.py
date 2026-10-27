"""Reframe saved review views without altering the model geometry."""
import bpy,sys
from pathlib import Path
from mathutils import Vector
OUT=Path(__file__).resolve().parents[1]/'output/wat-phnom-review-v4'
tier='normal' if '--normal' in sys.argv else 'ultra'
bpy.ops.wm.open_mainfile(filepath=str(OUT/f'wat-phnom-{tier}.blend'))
bpy.context.preferences.filepaths.save_version=0
# Separate the moulding top from the underlying podium top; coplanar faces
# produced dark bands in the initial render and could flicker in the viewer.
if not bpy.context.scene.get('stupa_cap_separation_fixed'):
    bpy.data.objects['Stupa base moulding'].location.z+=.04
    bpy.context.scene['stupa_cap_separation_fixed']=True
def xyz(p): return(p[0],-p[2],p[1])
for name,pos,target,lens in [('01-hall',(3,4,10),(0,2.3,-.8),32),('03-stupa',(2,3.8,-9),(0,3.2,-5.65),14)]:
    cam=bpy.data.objects['Review '+name]; cam.location=xyz(pos)
    cam.rotation_euler=(Vector(xyz(target))-cam.location).to_track_quat('-Z','Y').to_euler(); cam.data.lens=lens
    if '--stupa-only' in sys.argv and name!='03-stupa': continue
    if tier=='normal' and name!='01-hall': continue
    bpy.context.scene.camera=cam
    bpy.context.scene.render.filepath=str(OUT/f'{tier}-{name}.png')
    bpy.ops.render.render(write_still=True)
bpy.context.scene.camera=bpy.data.objects['Review 01-hall']
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/f'wat-phnom-{tier}.blend'))
