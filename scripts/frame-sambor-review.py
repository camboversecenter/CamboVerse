"""Final facade framing: clear the foreground satellite tower without hiding geometry."""
import bpy, sys
from pathlib import Path
from mathutils import Vector
root=Path(__file__).resolve().parents[1]/'output/sambor-prei-kuk-review-v2'
tiers=['normal'] if '--normal' in sys.argv else ['ultra'] if '--ultra' in sys.argv else ['normal','ultra']
for tier in tiers:
    source=root/('sambor-prei-kuk-'+tier+'.blend')
    bpy.ops.wm.open_mainfile(filepath=str(source))
    sc=bpy.context.scene; cam=bpy.data.objects['Review 01-tao-facade']
    cam.location=(12,-20,10); cam.data.lens=22
    cam.rotation_euler=(Vector((0,0,10))-cam.location).to_track_quat('-Z','Y').to_euler()
    sc.camera=cam; sc.render.filepath=str(root/(tier+'-01-tao-facade.png'))
    bpy.context.preferences.filepaths.save_version=0
    bpy.ops.wm.save_as_mainfile(filepath=str(source))
    bpy.ops.render.render(write_still=True)
