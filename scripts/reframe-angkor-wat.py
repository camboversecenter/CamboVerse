"""Update saved review cameras without changing exported geometry."""
import bpy
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[1]; OUT=ROOT/'output/angkor-wat-review-v3'
def xyz(p): return (p[0],-p[2],p[1])
for tier in ['normal','ultra']:
    bpy.ops.wm.open_mainfile(filepath=str(OUT/f'angkor-wat-{tier}.blend'))
    sc=bpy.context.scene; bpy.context.preferences.filepaths.save_version=0
    for name,pos,target,lens in [('sanctuary',(1,7.5,5.5),(0,6,-6),28),('gallery',(-6,3.4,8.5),(-5,1.45,2.5),30)]:
        cam=bpy.data.objects['Review '+name]; cam.location=xyz(pos)
        cam.rotation_euler=(Vector(xyz(target))-cam.location).to_track_quat('-Z','Y').to_euler(); cam.data.lens=lens
        if tier=='ultra':
            sc.camera=cam; sc.render.filepath=str(OUT/f'{tier}-{name}.png'); bpy.ops.render.render(write_still=True)
    sc.camera=bpy.data.objects['Review overview']
    bpy.ops.wm.save_as_mainfile(filepath=str(OUT/f'angkor-wat-{tier}.blend'))
