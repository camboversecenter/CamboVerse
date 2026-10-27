"""Update saved review cameras without rebuilding or changing exported geometry."""
import bpy
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[1]; OUT=ROOT/'output/bayon-review-v2'
def xyz(p): return (p[0],-p[2],p[1])
for tier in ['normal','ultra']:
    bpy.ops.wm.open_mainfile(filepath=str(OUT/f'bayon-{tier}.blend'))
    sc=bpy.context.scene; bpy.context.preferences.filepaths.save_version=0
    for name,pos,target,lens in [('faces',(0,2.8,3.6),(3.5,2.5,4),40),('central',(.1,7.5,4.5),(0,5.8,-4),28)]:
        cam=bpy.data.objects['Review '+name]; cam.location=xyz(pos)
        cam.rotation_euler=(Vector(xyz(target))-cam.location).to_track_quat('-Z','Y').to_euler(); cam.data.lens=lens
        if tier=='ultra':
            sc.camera=cam; sc.render.filepath=str(OUT/f'{tier}-{name}.png'); bpy.ops.render.render(write_still=True)
    sc.camera=bpy.data.objects['Review overview']
    bpy.ops.wm.save_as_mainfile(filepath=str(OUT/f'bayon-{tier}.blend'))
