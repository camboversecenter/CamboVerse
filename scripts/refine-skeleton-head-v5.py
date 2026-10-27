"""Local skull proportion pass on the approved skeleton; preserve V3 sources.
Illustrative geometry, not a clinically validated reconstruction.
"""
import bpy
import math
from pathlib import Path
from mathutils import Vector

OUT = Path(__file__).resolve().parents[1] / 'public/models/local'
PREFIX = 'lab-skeleton-head-v5'

def smooth(a, b, x):
    t = min(1, max(0, (x-a)/(b-a)))
    return t*t*(3-2*t)

for tier in ['normal', 'ultra']:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(OUT/f'lab-skeleton-v3-{tier}.glb'))
    for obj in list(bpy.context.scene.objects):
        if obj.type != 'MESH':
            continue
        bpy.ops.object.select_all(action='DESELECT')
        obj.select_set(True)
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
        for vertex in obj.data.vertices:
            x, depth, height = vertex.co
            if height < 60:
                continue
            # Slightly narrower vault instead of the previous spherical silhouette.
            vault = smooth(73, 80, height)
            # Taper the lower mandibular outline without shifting the neck joint.
            chin = (1-smooth(63, 68, height))*smooth(60, 62, height)
            vertex.co.x = x*(1-.03*vault-.10*chin)
            # Lower the exaggerated dome while retaining the orbital/neck levels.
            vertex.co.z = height - 2.8*smooth(74,86,height)
            # Reduce the projecting lower-jaw shelf, smoothly blending at the ramus.
            front = smooth(0, 7, -depth)
            vertex.co.y = depth + .65*chin*front
        obj.data.update()
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.export_scene.gltf(filepath=str(OUT/f'{PREFIX}-{tier}.glb'),
                              export_format='GLB', export_extras=True, export_animations=False)

# Render the exact exported Ultra geometry for review.
scene = bpy.context.scene
scene.render.engine = 'CYCLES'
scene.cycles.samples = 24
scene.render.resolution_x, scene.render.resolution_y = 700, 800
scene.render.resolution_percentage = 100
scene.world = bpy.data.worlds.new('Skull studio')
scene.world.use_nodes = True
scene.world.node_tree.nodes['Background'].inputs[0].default_value = (.055,.075,.09,1)
scene.world.node_tree.nodes['Background'].inputs[1].default_value = .6
def aim(obj, target):
    obj.rotation_euler = (Vector(target)-obj.location).to_track_quat('-Z','Y').to_euler()
target = (0,0,73)
for loc, power in [((-30,-40,105),26000),((35,-15,80),13000),((0,30,100),23000)]:
    bpy.ops.object.light_add(type='AREA', location=loc)
    light=bpy.context.object
    light.data.energy=power
    light.data.size=25
    aim(light,target)
bpy.ops.object.camera_add(location=(12,-75,78))
scene.camera=bpy.context.object
scene.camera.data.type='ORTHO'
scene.camera.data.ortho_scale=33
aim(scene.camera,target)
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/f'{PREFIX}.blend'))
scene.render.filepath=str(OUT/f'{PREFIX}-head.png')
bpy.ops.render.render(write_still=True)
scene.camera.location=(20,-360,30)
scene.camera.data.ortho_scale=192
aim(scene.camera,(0,0,0))
scene.render.filepath=str(OUT/f'{PREFIX}-body.png')
bpy.ops.render.render(write_still=True)
