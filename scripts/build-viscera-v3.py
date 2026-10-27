"""Digestive/renal shape refinement. Retains all 15 V2 teaching IDs.
Original illustrative geometry; not a scan or clinical reference.
"""
import bpy
import math
import json
import importlib.util
from pathlib import Path
from mathutils import Vector

spec=importlib.util.spec_from_file_location('helpers',Path(__file__).with_name('build-anatomy-room-v2.py'))
h=importlib.util.module_from_spec(spec);spec.loader.exec_module(h)
OUT=h.OUT

def rebuild():
    h.organs()
    for o in list(bpy.context.scene.objects):
        if o.type=='MESH' and o.name.split('.')[0] in ['small-intestine','stomach','liver','kidneys','pancreas']:
            bpy.data.objects.remove(o,do_unlink=True)
    gut=bpy.data.materials['Digestive tissue'];renal=bpy.data.materials['Renal capsule'];liver=bpy.data.materials['Liver burgundy'];gland=bpy.data.materials['Gland tissue']
    # Rounded paths with generous turn radii, replacing the pinched sinusoidal coil.
    controls=[(-5,5,1),(-1,6,1),(5,5,1),(6,2,2),(3,0,3),(-3,1,3),(-6,-1,2),(-4,-4,3),(2,-3,4),(5,-5,3),(3,-8,2),(-2,-7,3),(-5,-9,2),(-3,-11,1),(2,-11,1),(5,-9,0),(6,-5,-1),(2,-4,-1),(-3,-5,-1),(-5,-2,-1),(-2,1,-1),(3,1,-1)]
    h.tube('small-intestine',controls,.85,gut,150 if h.N==12 else 320)
    h.tube('stomach',[(3.5,23,-1),(6,23,0),(8,20,1),(8.3,15,2),(6,12,2),(2,13,1),(0,14,0)],lambda t:.85+2.9*math.sin(math.pi*t)**.9,gut,60)
    h.ellipsoid('liver',(-5,18,1),(9.9,4.4,5.8),liver,lambda x,y,z:(x,y*(.7-.20*x)+.22*x,z*(.84-.20*x)-.14*math.exp(-x*x*20)*max(0,-y)))
    # Medial kidney indentation with a fuller lateral contour. Patient right is -X.
    for s in [-1,1]:
        h.ellipsoid('kidneys',(s*6.5,5+s,-5.5),(3,5.1,2.6),renal,
            lambda x,y,z,s=s:(x+s*.55*math.exp(-y*y*6)*(1-abs(z)),y,z*(.92+.08*abs(y))))
    h.tube('pancreas',[(-4,11,-2),(-2,9.5,-2),(1,10,-3),(5,11.4,-3),(8,13,-3)],lambda t:.5+1.1*(1-t)*(1+.12*math.cos(t*54)),gland,55)
    # Subtle vertex tint survives glTF and is cheap in Normal; no shader-only noise.
    for o in list(bpy.context.scene.objects):
        if o.type!='MESH':continue
        colors=o.data.color_attributes.new(name='TissueTint',type='BYTE_COLOR',domain='CORNER')
        for poly in o.data.polygons:
            base=o.data.materials[poly.material_index].diffuse_color
            for index in poly.loop_indices:
                p=o.data.vertices[o.data.loops[index].vertex_index].co
                tint=.97+.03*math.sin(p.x*2.9+p.z*1.7)*math.sin(p.y*3.1-p.z*.9)
                colors.data[index].color=(base[0]*tint,base[1]*tint,base[2]*tint,1)
    for m in bpy.data.materials:
        if not m.use_nodes:continue
        shader=m.node_tree.nodes.get('Principled BSDF')
        if shader:
            attr=m.node_tree.nodes.new('ShaderNodeVertexColor');attr.layer_name='TissueTint'
            m.node_tree.links.new(attr.outputs['Color'],shader.inputs['Base Color'])
    h.consolidate()

def render():
    scene=bpy.context.scene;scene.render.engine='BLENDER_EEVEE';scene.render.resolution_x=720;scene.render.resolution_y=900;scene.render.resolution_percentage=100
    scene.world=bpy.data.worlds.new('Review studio');scene.world.use_nodes=True
    scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.04,.06,.08,1);scene.world.node_tree.nodes['Background'].inputs[1].default_value=.5
    target=h.xyz((0,8,0))
    bpy.ops.object.camera_add(location=target+Vector((14,-120,25)));camera=bpy.context.object;camera.rotation_euler=(target-camera.location).to_track_quat('-Z','Y').to_euler();camera.data.type='ORTHO';camera.data.ortho_scale=63;scene.camera=camera
    # Show the digestive/renal group without the upper cord/vessels obscuring it.
    for o in scene.objects:
        if o.type=='MESH' and o.get('anatomyPart') in ['great-vessels','spinal-cord','thyroid','diaphragm','oesophagus']:o.hide_render=True
    for at,power in [((-55,-75,70),80000),((55,-30,35),50000),((0,50,60),70000)]:
        bpy.ops.object.light_add(type='AREA',location=at);o=bpy.context.object;o.data.energy=power;o.data.size=55;o.rotation_euler=(target-o.location).to_track_quat('-Z','Y').to_euler()
    scene.render.filepath=str(OUT/'lab-viscera-v3-preview.png');bpy.ops.render.render(write_still=True)
    for o in scene.objects:o.hide_render=False
    bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'lab-viscera-v3.blend'))

stats={}
for tier in ['normal','ultra']:
    bpy.ops.wm.read_factory_settings(use_empty=True);h.N=12 if tier=='normal' else 24
    rebuild();bpy.ops.object.select_all(action='SELECT')
    meshes=[o for o in bpy.context.scene.objects if o.type=='MESH']
    for o in meshes:o.data.calc_loop_triangles()
    path=OUT/f'lab-viscera-v3-{tier}.glb'
    bpy.ops.export_scene.gltf(filepath=str(path),export_format='GLB',use_selection=True,export_animations=False,export_extras=True)
    stats[tier]={'triangles':sum(len(o.data.loop_triangles) for o in meshes),'bytes':path.stat().st_size,'parts':sorted(set(o['anatomyPart'] for o in meshes))}
    if tier=='ultra':render()
(OUT/'lab-viscera-v3-stats.json').write_text(json.dumps(stats,indent=2));print(stats)
