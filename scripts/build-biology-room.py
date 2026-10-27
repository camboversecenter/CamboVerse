"""Original Blender-authored anatomy study room. Metres, Z-up; glTF Y-up.
Run with Blender --background --python scripts/build-biology-room.py.
Local review assets only. Does not replace any anatomy mesh.
"""
import bpy
import math
from pathlib import Path
from mathutils import Vector

OUT = Path(__file__).resolve().parents[1] / 'public/models/local'
OUT.mkdir(parents=True, exist_ok=True)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)

def material(name, color, metallic=0):
    m = bpy.data.materials.new(name)
    m.diffuse_color = (*color, 1)
    m.use_nodes = True
    bs = m.node_tree.nodes.get('Principled BSDF')
    bs.inputs['Base Color'].default_value = (*color, 1)
    bs.inputs['Roughness'].default_value = .6
    bs.inputs['Metallic'].default_value = metallic
    return m

floor = material('mineral-floor', (.19, .23, .24))
wall = material('warm-ceramic', (.55, .60, .58))
dark = material('graphite-cabinet', (.035, .065, .072))
white = material('solid-surface', (.72, .77, .75))
teal = material('teal-trim', (.045, .32, .29), .2)
metal = material('brushed-aluminium', (.34, .4, .42), .55)

def box(name, pos, size, mat, bevel=.02):
    bpy.ops.mesh.primitive_cube_add(size=1, location=pos)
    o = bpy.context.object
    o.name = name
    o.dimensions = size
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    o.data.materials.append(mat)
    if bevel:
        mod = o.modifiers.new('soft manufactured edges', 'BEVEL')
        mod.width = bevel
        mod.segments = 3
        bpy.ops.object.modifier_apply(modifier=mod.name)
    return o

box('floor', (0, 0, -.06), (7, 6, .12), floor)
box('back-wall', (0, 2.5, 1.55), (7, .12, 3.1), wall)
box('side-wall', (-3.4, 0, 1.55), (.12, 5, 3.1), wall)
box('wall-dado', (0, 2.41, .85), (6.7, .04, .045), teal)
for x in [-2.6, -1.3, 0, 1.3, 2.6]:
    box('wall-panel-joint', (x, 2.427, 1.85), (.008, .008, 2.1), dark, 0)
for x in [-2.4, 2.2]:
    box('storage-base', (x, 1.92, .43), (1.25, .7, .86), dark)
    box('worktop', (x, 1.92, .89), (1.35, .8, .06), white)
    for z in [.25, .52, .76]:
        box('drawer', (x, 1.556, z), (1.14, .025, .19), wall, .008)
        box('drawer-pull', (x, 1.52, z+.04), (.28, .025, .018), metal, .006)
    box('light-panel', (x, 2.39, 2.22), (1.2, .055, .75), white)
# Display plinth under life-size body at browser x=-.7, z=0.
bpy.ops.mesh.primitive_cylinder_add(vertices=64, radius=.61, depth=.12, location=(-.7, 0, .06))
bpy.context.object.name='body-plinth'
bpy.context.object.data.materials.append(teal)
box('study-pedestal', (.7, -.45, .38), (.52, .52, .76), dark)
box('study-tray', (.7, -.45, .79), (.92, .74, .07), white)
for x in [-1.6, .2]:
    box('ceiling-light-frame', (x, .15, 2.95), (.06, 2.5, .06), metal)
    box('ceiling-light-diffuser', (x, .15, 2.91), (.045, 2.4, .016), white, .004)

# Merge static room by material to keep draw calls bounded.
for mat in [floor, wall, dark, white, teal, metal]:
    objects = [o for o in bpy.context.scene.objects if o.type=='MESH' and o.active_material == mat]
    bpy.ops.object.select_all(action='DESELECT')
    for o in objects: o.select_set(True)
    bpy.context.view_layer.objects.active = objects[0]
    bpy.ops.object.join()
    bpy.context.object.name = 'room-' + mat.name
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'biology-room-v1.blend'))
bpy.ops.export_scene.gltf(filepath=str(OUT/'biology-room-v1.glb'), export_format='GLB', export_animations=False)

# Offline review, not exported lights/camera.
scene = bpy.context.scene
scene.render.engine='BLENDER_EEVEE'
scene.world.color=(.25,.25,.25)
for pos, power, size in [((1,-2,5), 1100,5),((-3,-1,3),500,3)]:
    bpy.ops.object.light_add(type='AREA', location=pos)
    light=bpy.context.object
    light.data.energy=power
    light.data.shape='DISK'
    light.data.size=size
    light.rotation_euler=(Vector((0,0,1))-light.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add(location=(4,-6,3.4))
camera=bpy.context.object
camera.rotation_euler=(Vector((0,.3,1.1))-camera.location).to_track_quat('-Z','Y').to_euler()
camera.data.lens=40
scene.camera=camera
scene.render.resolution_x=1000
scene.render.resolution_y=750
scene.render.resolution_percentage=100
scene.render.filepath=str(OUT/'biology-room-v1-preview.png')
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'biology-room-v1.blend'))
bpy.ops.render.render(write_still=True)
