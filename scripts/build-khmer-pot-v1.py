"""Original illustrative clay pot, not a measured heritage capture.
Blender --background --python scripts/build-khmer-pot-v1.py
Keeps the existing Khmer Life pot coordinates and separate lid.
"""
import bpy, math, os, json
from mathutils import Vector
from mathutils.noise import noise_vector

OUT = os.path.abspath(os.path.join(os.path.dirname(__file__), '../public/models/local'))
os.makedirs(OUT, exist_ok=True)
PROFILE = [(0,.34),(.12,.54),(.30,.74),(.50,.92),(.72,1.02),(.92,1.03),(1.10,.98),(1.28,.86),(1.45,.68),(1.58,.50),(1.70,.35),(1.76,.38),(1.80,.41)]

def smooth_profile(points, steps):
    result=[]
    for i in range(len(points)-1):
        a,b,c,d=points[max(0,i-1)],points[i],points[i+1],points[min(len(points)-1,i+2)]
        for j in range(steps):
            t=j/steps
            result.append(tuple(.5*(2*b[k]+(-a[k]+c[k])*t+(2*a[k]-5*b[k]+4*c[k]-d[k])*t*t+(-a[k]+3*b[k]-3*c[k]+d[k])*t**3) for k in range(2)))
    return result+[points[-1]]

def lathe(name, profile, segments, mat):
    verts=[]
    for z,r in profile:
        for j in range(segments):
            a=2*math.pi*j/segments
            # Small handmade irregularities; no large stacked colour bands.
            rr=r*(1+.004*math.sin(3*a+z*2)+.003*math.sin(7*a-z*5))
            rr+=.0015*math.sin(z*150)*min(1,r*3)
            verts.append((rr*math.cos(a),rr*math.sin(a),z))
    faces=[]
    for i in range(len(profile)-1):
        for j in range(segments):
            n=(j+1)%segments
            faces.append((i*segments+j,i*segments+n,(i+1)*segments+n,(i+1)*segments+j))
    mesh=bpy.data.meshes.new(name); mesh.from_pydata(verts,[],faces); mesh.update()
    obj=bpy.data.objects.new(name,mesh); bpy.context.collection.objects.link(obj)
    obj.data.materials.append(mat); obj['artifactPart']='lid' if name=='Lid' else 'body'
    colors=mesh.color_attributes.new(name='Clay',type='FLOAT_COLOR',domain='POINT')
    for i,v in enumerate(verts):
        p=Vector(v); n=noise_vector(p*3.4).x; fine=noise_vector(p*85).y
        cloud=max(0,noise_vector(p*1.9+Vector((7,2,0))).z)*.24
        gain=1+n*.10+fine*.035-cloud
        colors.data[i].color=(.43*gain,.19*gain,.095*gain,1)
    for f in mesh.polygons: f.use_smooth=True
    return obj

stats={}
for tier,seg,steps in [('normal',48,3),('ultra',128,7)]:
    bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
    mat=bpy.data.materials.new('Unglazed fired clay'); mat.use_nodes=True
    bs=mat.node_tree.nodes.get('Principled BSDF'); bs.inputs['Roughness'].default_value=.86
    attr=mat.node_tree.nodes.new('ShaderNodeVertexColor'); attr.layer_name='Clay'
    mat.node_tree.links.new(attr.outputs['Color'],bs.inputs['Base Color'])
    outer=smooth_profile(PROFILE,steps)
    # Continuous rim and inner wall, closed floor; genuinely hollow under lid.
    rim=[(1.818,.402),(1.824,.385),(1.815,.365),(1.80,.355)]
    inner=[(z,max(.015,r-.055)) for z,r in reversed(outer[:-1]) if z>.10]
    body=lathe('Pot',[(0,.001)]+outer+rim+inner+[(.10,.001)],seg,mat)
    lid_profile=[(1.827,.001),(1.827,.43),(1.846,.442),(1.87,.42),(1.92,.37),(1.97,.29),(2.015,.18),(2.035,.067),(2.14,.06),(2.17,.087),(2.215,.09),(2.25,.06),(2.26,.001)]
    lid=lathe('Lid',smooth_profile(lid_profile,steps),seg,mat)
    meshes=[body,lid]
    path=os.path.join(OUT,f'khmer-kaom-v1-{tier}.glb')
    bpy.ops.export_scene.gltf(filepath=path,export_format='GLB',export_extras=True)
    stats[tier]={'triangles':sum(len(o.data.polygons)*2 for o in meshes),'bytes':os.path.getsize(path),'meshes':2}
    if tier=='ultra':
        bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT,'khmer-kaom-v1.blend'))
        # Studio render is review-only and is never exported in the GLB.
        bpy.ops.mesh.primitive_plane_add(size=200)
        floor=bpy.context.object; floor.location.z=-.015
        m=bpy.data.materials.new('Studio'); m.diffuse_color=(.16,.18,.17,1); floor.data.materials.append(m)
        for pos,power,size in [((3,-4,6),650,4),((-4,-1,3),350,3),((1,4,4),450,3)]:
            bpy.ops.object.light_add(type='AREA',location=pos); light=bpy.context.object; light.data.energy=power; light.data.shape='DISK'; light.data.size=size
            light.rotation_euler=(Vector((0,0,1))-light.location).to_track_quat('-Z','Y').to_euler()
        bpy.ops.object.camera_add(location=(3,-5,3.1)); cam=bpy.context.object
        cam.rotation_euler=(Vector((0,0,1.12))-cam.location).to_track_quat('-Z','Y').to_euler(); cam.data.type='ORTHO'; cam.data.ortho_scale=3.1
        scene=bpy.context.scene; scene.camera=cam; scene.render.engine='CYCLES'; scene.cycles.samples=32
        scene.render.resolution_x=800; scene.render.resolution_y=800; scene.render.resolution_percentage=100
        scene.world.color=(.25,.25,.25); scene.render.filepath=os.path.join(OUT,'khmer-kaom-v1-preview.png')
        bpy.ops.render.render(write_still=True)
with open(os.path.join(OUT,'khmer-kaom-v1-stats.json'),'w') as f: json.dump(stats,f,indent=2)
print(stats)
