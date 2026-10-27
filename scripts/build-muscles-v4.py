"""Continuous superficial-muscle teaching illustration from CC0 body topology.
Not a scanned/dissected atlas. Original surface asset is never overwritten.
Blender renders + two web tiers, with baked vertex-colour fibre illustration.
"""
import bpy, math, json
from pathlib import Path
from mathutils import Vector
OUT=Path(__file__).resolve().parents[1]/'public/models/local'

def build(tier):
    bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
    bpy.ops.import_scene.gltf(filepath=str(OUT/'lab-body-makehuman-ultra.glb'))
    meshes=[o for o in bpy.context.scene.objects if o.type=='MESH']
    body=max(meshes,key=lambda o:len(o.data.vertices))
    for o in meshes:
        if o!=body:bpy.data.objects.remove(o,do_unlink=True)
    bpy.ops.object.select_all(action='DESELECT');body.select_set(True);bpy.context.view_layer.objects.active=body
    bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
    if body.data.shape_keys:body.shape_key_clear()
    # Add genuine surface resolution for the shallow fibre relief, then simplify Normal.
    sub=body.modifiers.new('continuous surface detail','SUBSURF');sub.levels=1
    bpy.ops.object.modifier_apply(modifier=sub.name)
    if tier=='normal':
        dec=body.modifiers.new('mobile budget','DECIMATE');dec.ratio=.12;bpy.ops.object.modifier_apply(modifier=dec.name)
    body.name='part-muscles-continuous-study'
    mat=bpy.data.materials.new('illustrated muscle fibres');mat.use_nodes=True
    bs=mat.node_tree.nodes.get('Principled BSDF');bs.inputs['Roughness'].default_value=.57
    attr=mat.node_tree.nodes.new('ShaderNodeVertexColor');attr.layer_name='MuscleColour';mat.node_tree.links.new(attr.outputs['Color'],bs.inputs['Base Color'])
    body.data.materials.clear();body.data.materials.append(mat)
    col=body.data.color_attributes.new(name='MuscleColour',type='FLOAT_COLOR',domain='POINT')
    normals=[v.normal.copy() for v in body.data.vertices]
    for v in body.data.vertices:
        x,y,z=v.co;a=abs(x);front=y<0
        # Region-dependent directions: fans over chest/back; longitudinal limbs.
        phase=x*5
        seam=False;tendon=False
        if z>58:
            phase=z*5+a*2
            tendon=abs(x)<1 and z>77
        elif a>17 and z>0:
            phase=(a*.75+z*.66)*7
            tendon=z<8
        elif z>31:
            phase=(math.atan2(z-36,a+1)*48 if front else (z+a*.65)*6)
            seam=a<.55 or (front and abs(z-(32+a*.12))<.5)
        elif z>3:
            phase=(a*7 if a<6 else (z+a*.85)*6)
            seam=a<.5 or (a<6 and min(abs(z-h) for h in [8,15,22,29])<.45)
            tendon=a<.3
        elif z>-18:
            phase=(a+z*.6)*5
            tendon=front and a<5
        else:
            phase=(a+.12*z)*8
            seam=abs(a-8)<.25 and z>-47
            tendon=(-51<z<-45) or z<-76
        wave=.5+.5*math.sin(phase)
        # Delicate baked fibres, never high-gloss plastic or detached spheres.
        color=(.34+.105*wave,.065+.05*wave,.045+.027*wave)
        if seam:color=(.12,.025,.018)
        if tendon:color=(.57+.05*wave,.43+.045*wave,.30+.04*wave)
        col.data[v.index].color=(*color,1)
        if tier=='ultra':v.co+=normals[v.index]*(.035*math.sin(phase))
    for p in body.data.polygons:p.material_index=0;p.use_smooth=True
    body.data.update()
    body.data.calc_loop_triangles()
    bpy.ops.export_scene.gltf(filepath=str(OUT/f'lab-muscles-v4-{tier}.glb'),export_format='GLB',use_selection=True,export_animations=False)
    return body,len(body.data.loop_triangles)

stats={}
for tier in ['normal','ultra']:
    body,tris=build(tier);stats[tier]={'triangles':tris,'bytes':(OUT/f'lab-muscles-v4-{tier}.glb').stat().st_size}
(OUT/'lab-muscles-v4-stats.json').write_text(json.dumps(stats,indent=2))
scene=bpy.context.scene;scene.render.engine='BLENDER_EEVEE';scene.world.color=(.22,.22,.22)
for pos,energy in [((90,-170,140),350000),((-100,-80,30),180000),((0,90,100),220000)]:
    bpy.ops.object.light_add(type='AREA',location=pos);o=bpy.context.object;o.data.energy=energy;o.data.size=130;o.rotation_euler=(Vector((0,0,5))-o.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add(location=(0,-360,15));cam=bpy.context.object;cam.rotation_euler=(Vector((0,0,5))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=192;scene.camera=cam
scene.render.resolution_x=700;scene.render.resolution_y=950;scene.render.resolution_percentage=100
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'lab-muscles-v4.blend'))
scene.render.filepath=str(OUT/'lab-muscles-v4-front.png');bpy.ops.render.render(write_still=True)
cam.location=(180,-310,20);cam.rotation_euler=(Vector((0,0,5))-cam.location).to_track_quat('-Z','Y').to_euler()
scene.render.filepath=str(OUT/'lab-muscles-v4-quarter.png');bpy.ops.render.render(write_still=True)
print(json.dumps(stats))
