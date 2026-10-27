"""Fit approved skull/pelvis Blender review sources to the teaching skeleton.
Preserves review .blend files, prior GLBs, skin and viscera. Original local art.
"""
import bpy
import json
import math
import importlib.util
from pathlib import Path
from mathutils import Vector

ROOT=Path(__file__).resolve().parent
spec=importlib.util.spec_from_file_location('helpers',ROOT/'build-anatomy-room-v2.py')
h=importlib.util.module_from_spec(spec);spec.loader.exec_module(h)
OUT=h.OUT

def reviewed(name,target_min,target_max):
    with bpy.data.libraries.load(str(OUT/f'{name}-review-v3.blend'),link=False) as (source,destination):
        destination.objects=source.objects
    meshes=[]
    for o in destination.objects:
        if o and o.type=='MESH':bpy.context.collection.objects.link(o);meshes.append(o)
    bpy.context.view_layer.update()
    points=[o.matrix_world@Vector(c) for o in meshes for c in o.bound_box]
    lo=Vector(tuple(min(p[i] for p in points) for i in range(3)))
    hi=Vector(tuple(max(p[i] for p in points) for i in range(3)))
    # Uniform scale preserves the approved shape. Only vertical fit/centering changes.
    scale=(target_max-target_min)/(hi.z-lo.z)
    center=(lo+hi)/2
    offset=h.xyz((0,(target_min+target_max)/2,-1 if name=='skull' else 0))
    for o in meshes:
        transform=o.matrix_world.copy()
        for v in o.data.vertices:v.co=(transform@v.co-center)*scale+offset
        o.matrix_world.identity();o.name='skeleton-approved-'+name+'-'+o.name

def build():
    h.N=24;h.skeleton('ultra')
    remove=('skeleton-skull','skeleton-cranial','skeleton-ilium','skeleton-pubic','skeleton-sacrum','skeleton-vertebra','skeleton-rib','skeleton-costal','skeleton-femur')
    for o in list(bpy.context.scene.objects):
        if o.type=='MESH' and o.name.startswith(remove):bpy.data.objects.remove(o,do_unlink=True)
    reviewed('skull',60,86);reviewed('pelvis',-25,0)
    bone=h.material('Skeleton ivory',(.63,.55,.42),.68)
    cartilage=h.material('Costal and disc cartilage',(.46,.50,.46),.78)
    enamel=h.material('Dental enamel',(.78,.73,.61),.4)
    for i in range(24):
        t=i/23;y=58-i*2.8;z=-5.3+2*math.sin(t*math.pi*2)
        h.ellipsoid('skeleton-vertebral-body',(0,y,z),(1.6+t*.8,1.12,1.35+t*.5),bone)
        if i<23:h.ellipsoid('skeleton-disc',(0,y-1.35,z),(1.45+t*.8,.24,1.2+t*.5),cartilage)
    for i in range(12):
        t=i/11;level=45-i*2.45;width=8+8*math.sin((i+1)/14*math.pi)
        for s in [-1,1]:
            # Posterior bend, lateral sweep, downward anterior slope.
            arc=math.pi*(.95 if i<10 else .57)
            points=[]
            for j in range(45):
                a=arc*j/44
                points.append((s*(1.1+width*math.sin(a)),level-5*(j/44)**1.4,-6+(7.4-.6*t)*(1-math.cos(a))))
            h.tube('skeleton-rib',points,.46-.09*t,bone,60)
            if i<10:
                end=points[-1];height=40-i*2.15 if i<7 else 25-(i-7)*.25
                h.tube('skeleton-costal-cartilage',[end,(s*3,end[1]-.4,7.2),(s*.85,height,8)],.37,cartilage)
    for s in [-1,1]:
        h.tube('skeleton-femur',[(s*9,-17,0),(s*12,-21,0),(s*10.2,-31,-.6),(s*8,-47,0)],lambda t:1.15+.65*abs(2*t-1)**4,bone,42)
        h.ellipsoid('skeleton-femoral-head',(s*9,-17,0),(2,2,2),bone)
        h.ellipsoid('skeleton-greater-trochanter',(s*12,-21,0),(1.8,2.3,1.6),bone)
        for d in [-1,1]:
            h.ellipsoid('skeleton-femoral-condyle',(s*8+d*1.15,-48.4,0),(1.25,1.6,1.8),bone)
            h.ellipsoid('skeleton-humeral-condyle',(s*23+d*.75,18,1),(.85,1.1,1.15),bone)
    # Keep material batches bounded while retaining every disconnected bone mesh.
    for o in bpy.context.scene.objects:
        if o.type!='MESH':continue
        for i,m in enumerate(o.data.materials):
            label=m.name.lower()
            o.data.materials[i]=enamel if 'enamel' in label or 'teeth' in label else cartilage if 'cartilage' in label else bone
    h.consolidate()

def budget(target):
    meshes=[o for o in bpy.context.scene.objects if o.type=='MESH']
    total=sum(len(o.data.polygons)*2 for o in meshes)
    for o in meshes:
        o.data.calc_loop_triangles()
    total=sum(len(o.data.loop_triangles) for o in meshes)
    if total>target:
        for o in meshes:
            bpy.context.view_layer.objects.active=o
            m=o.modifiers.new('Tier geometry budget','DECIMATE');m.ratio=target/total
            bpy.ops.object.modifier_apply(modifier=m.name)
    for o in meshes:o.data.calc_loop_triangles()
    return sum(len(o.data.loop_triangles) for o in meshes)

bpy.ops.wm.read_factory_settings(use_empty=True);build();budget(190000)
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'lab-skeleton-v3.blend'))
stats={}
for tier in ['ultra','normal']:
    triangles=budget(190000 if tier=='ultra' else 32000)
    bpy.ops.object.select_all(action='SELECT')
    path=OUT/f'lab-skeleton-v3-{tier}.glb'
    bpy.ops.export_scene.gltf(filepath=str(path),export_format='GLB',use_selection=True,export_animations=False,export_extras=True)
    stats[tier]={'triangles':triangles,'bytes':path.stat().st_size}
(OUT/'lab-skeleton-v3-stats.json').write_text(json.dumps(stats,indent=2));print(stats)
# Render the exact Ultra export geometry, not the later decimated Normal scene.
bpy.ops.wm.open_mainfile(filepath=str(OUT/'lab-skeleton-v3.blend'))
scene=bpy.context.scene;scene.render.engine='BLENDER_EEVEE';scene.render.resolution_x=650;scene.render.resolution_y=900;scene.render.resolution_percentage=100
scene.world=bpy.data.worlds.new('Studio');scene.world.use_nodes=True
scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.04,.06,.08,1)
scene.world.node_tree.nodes['Background'].inputs[1].default_value=.5
target=Vector((0,0,0))
bpy.ops.object.camera_add(location=(20,-360,30));cam=bpy.context.object;cam.rotation_euler=(target-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=192;scene.camera=cam
for at,power in [((-80,-110,140),180000),((80,-50,30),100000),((0,80,100),180000)]:
    bpy.ops.object.light_add(type='AREA',location=at);o=bpy.context.object;o.data.energy=power;o.data.size=90;o.rotation_euler=(target-o.location).to_track_quat('-Z','Y').to_euler()
scene.render.filepath=str(OUT/'lab-skeleton-v3-preview.png');bpy.ops.render.render(write_still=True)
