"""Local relaxed-pose surface and schematic superficial-muscle study model.
Keeps previous reviewed assets untouched. Units are centimetres, Blender Z-up.
"""
import bpy
import math
from pathlib import Path
from mathutils import Vector

OUT = Path(__file__).resolve().parents[1] / 'public/models/local'

def clear():
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)

def relax(co):
    # Smoothly blend a 48-degree shoulder adduction into the lateral arm.
    x,y,z = co
    a = abs(x)
    if a <= 16 or z <= 2: return co.copy()
    t = min(1, max(0, (a-16)/10))
    t = t*t*(3-2*t)
    angle = math.radians(48)*t
    dx, dz = a-17, z-46
    return Vector(((17 + math.cos(angle)*dx + math.sin(angle)*dz)*(1 if x>0 else -1), y, 46-math.sin(angle)*dx+math.cos(angle)*dz))

for tier in ['normal','ultra']:
    clear()
    bpy.ops.import_scene.gltf(filepath=str(OUT/f'lab-body-makehuman-{tier}.glb'))
    # Import glTF into Blender restores Z-up coordinates. Bake each mesh transform.
    for o in list(bpy.context.scene.objects):
        if o.type != 'MESH': continue
        bpy.context.view_layer.objects.active=o
        bpy.ops.object.select_all(action='DESELECT')
        o.select_set(True)
        bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
        if o.data.shape_keys:
            for key in o.data.shape_keys.key_blocks:
                for v in key.data: v.co=relax(v.co)
        else:
            for v in o.data.vertices: v.co=relax(v.co)
    bpy.ops.export_scene.gltf(filepath=str(OUT/f'lab-body-relaxed-{tier}.glb'),export_format='GLB',export_animations=False)
    if tier=='ultra': bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'lab-body-relaxed.blend'))

def mat(name,color):
    m=bpy.data.materials.new(name); m.diffuse_color=(*color,1); m.use_nodes=True
    p=m.node_tree.nodes.get('Principled BSDF'); p.inputs['Base Color'].default_value=(*color,1); p.inputs['Roughness'].default_value=.65
    attr=m.node_tree.nodes.new('ShaderNodeVertexColor');attr.layer_name='FibreTint';m.node_tree.links.new(attr.outputs['Color'],p.inputs['Base Color'])
    return m

def mass(name, center, radius, material, seg, direction=None):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=seg,ring_count=seg//2,location=center)
    o=bpy.context.object; o.name='part-muscles-'+name; o.scale=radius
    if direction: o.rotation_euler=Vector(direction).to_track_quat('Z','Y').to_euler()
    o.data.materials.append(material)
    colors=o.data.color_attributes.new(name='FibreTint',type='FLOAT_COLOR',domain='CORNER')
    for loop in o.data.loops:
        v=o.data.vertices[loop.vertex_index].co
        stripe=.92+.08*math.cos(math.atan2(v.y,v.x)*24)
        base=material.diffuse_color
        colors.data[loop.index].color=(base[0]*stripe,base[1]*stripe,base[2]*stripe,1)
    for p in o.data.polygons: p.use_smooth=True
    return o

for tier in ['normal','ultra']:
    clear(); seg=16 if tier=='normal' else 32
    muscle=mat('muscle-red',(.34,.065,.055)); deep=mat('deep-muscle',(.23,.036,.028)); tendon=mat('tendons',(.69,.55,.4))
    # Deep regional muscle masses connect the superficial bellies; no skin mesh.
    mass('deep-head',(0,0,72),(7,5.5,10),deep,seg)
    mass('deep-neck',(0,1,57),(4.1,3.2,10),deep,seg)
    mass('deep-trunk',(0,1.5,21),(12,4.6,27),deep,seg)
    mass('deep-pelvis',(0,1,-8),(12.5,5,13),deep,seg)
    # Separate superficial muscle volumes. Deliberately no skin or organs.
    for s in [-1,1]:
        mass('temporalis',(s*6.4,0,73),(2.8,6,8),muscle,seg)
        mass('masseter',(s*5.3,-4.2,64),(2.4,2.7,5.2),muscle,seg)
        mass('frontalis',(s*3.1,-6.4,78),(3.3,1.5,5.2),muscle,seg)
        mass('neck',(s*3,-.6,57),(2.5,3.5,8.5),muscle,seg,(-s*.2,0,1))
        mass('trapezius',(s*7,3.5,47),(8.7,2.8,5.7),muscle,seg)
        mass('deltoid',(s*17.5,0,43),(5.1,5,6.3),muscle,seg)
        mass('pectoralis',(s*8,-7,39),(9.3,3.1,6.6),muscle,seg)
        mass('latissimus',(s*9,5,30),(7.5,3,13),deep,seg)
        mass('obliques',(s*10.2,-3.7,17),(4.5,3.8,11),muscle,seg,(-s*.16,0,1))
        for z in [29,23,17,11]: mass('rectus-abdominis',(s*3.4,-8,z),(3.2,1.9,3.1),muscle,seg)
        mass('biceps',(s*21,-2,29),(3.5,3.2,10),muscle,seg,(-s*.12,0,1))
        mass('triceps',(s*21,2,29),(3.7,3.1,11),deep,seg,(-s*.12,0,1))
        mass('forearm-flexors',(s*23.1,-1.6,9),(2.6,2.5,10),muscle,seg,(-s*.04,0,1))
        mass('forearm-extensors',(s*23.1,1.1,9),(2.5,2.5,10),deep,seg)
        mass('hand',(s*23.5,-.2,-5),(2.8,1.5,5),deep,seg)
        mass('gluteus',(s*7,5,-9),(8,5.5,9),muscle,seg)
        mass('adductors',(s*4,-.5,-26),(4.3,4,13),deep,seg,(s*.12,0,1))
        mass('quadriceps',(s*9,-4,-28),(5.7,4,16),muscle,seg)
        mass('hamstrings',(s*9,3,-28),(5,4,16),deep,seg)
        mass('knee-tendon',(s*9,-3.5,-47),(2.8,1.5,4.5),tendon,seg)
        mass('calf',(s*8.7,2.5,-61),(4,3.7,12),muscle,seg)
        mass('tibialis',(s*9,-2.8,-62),(2.6,2.3,13),muscle,seg)
        mass('achilles',(s*8.5,2.5,-77),(1.1,1.1,6),tendon,seg)
        mass('foot',(s*8.5,-3.8,-83),(3.3,6,2),deep,seg)
    # Merge by material: three draws, not one draw per muscle belly.
    for m in [muscle,deep,tendon]:
        objs=[o for o in bpy.context.scene.objects if o.type=='MESH' and o.active_material==m]
        bpy.ops.object.select_all(action='DESELECT')
        for o in objs:o.select_set(True)
        bpy.context.view_layer.objects.active=objs[0]; bpy.ops.object.join()
        bpy.context.object.name='part-muscles-'+m.name
    bpy.ops.export_scene.gltf(filepath=str(OUT/f'lab-body-muscles-{tier}.glb'),export_format='GLB')
    if tier=='ultra': bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'lab-body-muscles.blend'))

# Front preview of muscles for local visual QA.
scene=bpy.context.scene; scene.render.engine='BLENDER_EEVEE'; scene.world.color=(.3,.3,.3)
bpy.ops.object.light_add(type='AREA',location=(70,-130,140)); bpy.context.object.data.energy=180000; bpy.context.object.data.size=150
bpy.context.object.rotation_euler=(Vector((0,0,10))-bpy.context.object.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add(location=(0,-360,15)); cam=bpy.context.object; cam.rotation_euler=(Vector((0,0,5))-cam.location).to_track_quat('-Z','Y').to_euler(); cam.data.type='ORTHO'; cam.data.ortho_scale=192; scene.camera=cam
scene.render.resolution_x=600;scene.render.resolution_y=900;scene.render.resolution_percentage=100;scene.render.filepath=str(OUT/'lab-body-muscles-preview.png');bpy.ops.render.render(write_still=True)
