"""Lower the reviewed V2 body's arms without replacing its face or hands.
Run only in a fresh background Blender process. Original sources are untouched.
"""
import math
import sys
from pathlib import Path
import bpy
from mathutils import Vector

OUT = Path(__file__).resolve().parents[1] / 'public/models/local'
STANCE = '--stance-v5' in sys.argv
PREFIX = 'lab-body-stance-v5' if STANCE else 'lab-body-arms-v4'
SOURCE = 'lab-body-arms-v4' if STANCE else 'lab-body-face-v2'

def refine_stance(co):
    x, y, z = co
    # Bring the leg centre-lines under the hips without narrowing each foot.
    # Pelvis and upper body stay fixed. Both feet retain their ground height.
    t = min(1.0, max(0.0, (-z - 10.0) / 68.0))
    shift = 15.0 * t * t * (3.0 - 2.0 * t)
    return Vector((x - math.copysign(shift, x), y, z))

def lower_arm(co):
    x, y, z = co
    # Blend across the shoulder; retain the trunk and all finger topology.
    t = min(1.0, max(0.0, (abs(x) - 17.0) / 9.0))
    t = t * t * (3 - 2 * t)
    # The source also has lateral leg/foot vertices. Never pose those as arms.
    height_weight = min(1.0, max(0.0, (z + 8.0) / 8.0))
    t *= height_weight * height_weight * (3 - 2 * height_weight)
    angle = math.radians(35) * t
    dx, dz = abs(x) - 17, z - 46
    return Vector(((17 + math.cos(angle) * dx + math.sin(angle) * dz) * (1 if x >= 0 else -1),
                   y, 46 - math.sin(angle) * dx + math.cos(angle) * dz))

for tier in ['normal', 'ultra']:
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    bpy.ops.import_scene.gltf(filepath=str(OUT / f'{SOURCE}-{tier}.glb'))
    for obj in list(bpy.context.scene.objects):
        if obj.type != 'MESH':
            continue
        bpy.ops.object.select_all(action='DESELECT')
        obj.select_set(True)
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
        if obj.data.shape_keys:
            for key in obj.data.shape_keys.key_blocks:
                for vertex in key.data:
                    vertex.co = refine_stance(vertex.co) if STANCE else lower_arm(vertex.co)
        else:
            for vertex in obj.data.vertices:
                vertex.co = refine_stance(vertex.co) if STANCE else lower_arm(vertex.co)
        obj.data.update()
    bpy.ops.export_scene.gltf(filepath=str(OUT / f'{PREFIX}-{tier}.glb'),
                              export_format='GLB', export_animations=True, export_morph=True)

scene = bpy.context.scene
scene.render.engine = 'CYCLES'
scene.cycles.samples = 16
scene.render.resolution_x, scene.render.resolution_y = 650, 850
scene.render.resolution_percentage = 100
scene.world.color = (.2, .2, .2)
def aim(obj, target):
    obj.rotation_euler = (Vector(target) - obj.location).to_track_quat('-Z', 'Y').to_euler()
bpy.ops.object.camera_add(location=(35, -360, 30))
scene.camera = bpy.context.object
scene.camera.data.type = 'ORTHO'
scene.camera.data.ortho_scale = 198
aim(scene.camera, (0, 0, 0))
for position, energy in [((-100, -150, 180), 700000), ((100, -80, 60), 250000), ((20, 100, 100), 400000)]:
    bpy.ops.object.light_add(type='AREA', location=position)
    bpy.context.object.data.energy = energy
    bpy.context.object.data.size = 140
    aim(bpy.context.object, (0, 0, 20))
scene.render.filepath = str(OUT / f'{PREFIX}-preview.png')
bpy.ops.wm.save_as_mainfile(filepath=str(OUT / f'{PREFIX}.blend'))
bpy.ops.render.render(write_still=True)
