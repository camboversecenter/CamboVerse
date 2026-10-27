"""Update Oudong review cameras without modifying exported geometry."""
import bpy
from pathlib import Path
from mathutils import Vector
OUT=Path(__file__).resolve().parents[1]/'output/oudong-review-v2'
def xyz(p): return (p[0],-p[2],p[1])
for tier in ['normal','ultra']:
    path=OUT/f'oudong-{tier}.blend'; bpy.ops.wm.open_mainfile(filepath=str(path))
    bpy.context.preferences.filepaths.save_version=0; sc=bpy.context.scene
    for name,pos,target,lens in [('approach',(0,3,15),(0,7,-2),29),('royal',(0,9,-5),(0,7.5,-12),20)]:
        cam=bpy.data.objects['Review '+name]; cam.location=xyz(pos); cam.data.lens=lens
        cam.rotation_euler=(Vector(xyz(target))-cam.location).to_track_quat('-Z','Y').to_euler()
        if tier=='ultra':
            sc.camera=cam; sc.render.filepath=str(OUT/f'{tier}-{name}.png'); bpy.ops.render.render(write_still=True)
    sc.camera=bpy.data.objects['Review overview']; bpy.ops.wm.save_as_mainfile(filepath=str(path))
