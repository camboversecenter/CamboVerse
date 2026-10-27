"""Read-only V9 joint renders before the next authoring pass."""
import bpy
from pathlib import Path
from mathutils import Vector
OUT=Path(__file__).resolve().parents[1]/'public/models/local'
bpy.ops.wm.open_mainfile(filepath=str(OUT/'lab-skeleton-v9.blend'))
scene=bpy.context.scene
for name,target,loc,span in [('elbow',(23,-1,18),(40,-70,22),15),('hip',(9,0,-18),(40,-70,-10),30),('ankle',(8,-1,-81),(28,-60,-70),18)]:
    scene.camera.location=loc;scene.camera.data.ortho_scale=span
    scene.camera.rotation_euler=(Vector(target)-scene.camera.location).to_track_quat('-Z','Y').to_euler()
    scene.render.filepath=str(OUT/f'joint-before-v10-{name}.png');bpy.ops.render.render(write_still=True)
