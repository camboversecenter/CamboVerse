"""Refresh review cameras only; exported geometry does not change.
These poses also live in the generator and the site's hotspot configuration.
"""
import bpy
from pathlib import Path
from mathutils import Vector
OUT=Path(__file__).resolve().parents[1]/'output/royal-palace-review-v2'
def xyz(p): return (p[0],-p[2],p[1])
for tier in ['normal','ultra']:
    path=OUT/f'royal-palace-{tier}.blend'
    bpy.ops.wm.open_mainfile(filepath=str(path))
    bpy.context.preferences.filepaths.save_version=0
    sc=bpy.context.scene
    for name,pos,target in [('frontage',(-2,5,24),(-5,3.6,9)),('silver',(3.7,4.4,10),(7,2.7,-1))]:
        cam=bpy.data.objects['Review '+name]; cam.location=xyz(pos)
        cam.rotation_euler=(Vector(xyz(target))-cam.location).to_track_quat('-Z','Y').to_euler(); cam.data.lens=32
        if tier=='ultra':
            sc.camera=cam; sc.render.filepath=str(OUT/f'{tier}-{name}.png'); bpy.ops.render.render(write_still=True)
    sc.camera=bpy.data.objects['Review overview']
    bpy.ops.wm.save_as_mainfile(filepath=str(path))
