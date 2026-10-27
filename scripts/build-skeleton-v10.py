"""V10 elbow/hip/ankle bone-surface pass. Original illustrative anatomy.
Retains V9 shoulder/knee work and head. No soft tissues or joint simulation.
"""
import bpy,bmesh,math,json,importlib.util
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parent;OUT=ROOT.parent/'public/models/local'
spec=importlib.util.spec_from_file_location('helpers',ROOT/'build-anatomy-room-v2.py')
h=importlib.util.module_from_spec(spec);spec.loader.exec_module(h)
PREFIX='lab-skeleton-v10'
def select(objects):
    bpy.ops.object.select_all(action='DESELECT')
    for o in objects:o.select_set(True)
    bpy.context.view_layer.objects.active=objects[0]
def region(o):
    while o:
        if o.get('skeletonRegion'):return o['skeletonRegion']
        o=o.parent
def bounds(o):
    pts=[o.matrix_world@Vector(c) for c in o.bound_box]
    return Vector(tuple(min(p[i] for p in pts) for i in range(3))),Vector(tuple(max(p[i] for p in pts) for i in range(3)))
def split(o):
    select([o]);bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
    bm=bmesh.new();bm.from_mesh(o.data);bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=.0001);bm.to_mesh(o.data);bm.free()
    bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.mesh.separate(type='LOOSE');bpy.ops.object.mode_set(mode='OBJECT')
    return list(bpy.context.selected_objects)
def fuse(parts,tier):
    for o in parts:
        bm=bmesh.new();bm.from_mesh(o.data)
        edges=[e for e in bm.edges if e.is_boundary]
        if edges:bmesh.ops.holes_fill(bm,edges=edges,sides=0)
        bm.to_mesh(o.data);bm.free()
    select(parts)
    if len(parts)>1:bpy.ops.object.join()
    o=bpy.context.object
    m=o.modifiers.new('Blend bone components','REMESH');m.mode='VOXEL';m.voxel_size=.13 if tier=='normal' else .075;bpy.ops.object.modifier_apply(modifier=m.name)
    m=o.modifiers.new('Surface smoothing','SMOOTH');m.factor=.55;m.iterations=4;bpy.ops.object.modifier_apply(modifier=m.name)
    for p in o.data.polygons:p.use_smooth=True
    return o
def pack(parts,rid,budget):
    select(parts)
    if len(parts)>1:bpy.ops.object.join()
    o=bpy.context.object;o.name='skeleton-'+rid+'-v10';o['skeletonRegion']=rid;o['anatomyPart']='skeleton'
    o.data.calc_loop_triangles()
    if len(o.data.loop_triangles)>budget:
        m=o.modifiers.new('Region geometry budget','DECIMATE');m.ratio=budget/len(o.data.loop_triangles);bpy.ops.object.modifier_apply(modifier=m.name)
    o.data.validate();o.data.update();return o
stats={}
for tier in ['normal','ultra']:
    bpy.ops.wm.read_factory_settings(use_empty=True);bpy.ops.import_scene.gltf(filepath=str(OUT/f'lab-skeleton-v9-{tier}.glb'))
    h.N=8 if tier=='normal' else 20
    for original in list(bpy.context.scene.objects):
        if original.type!='MESH':continue
        rid=region(original)
        if rid not in ['left-arm','right-arm','left-leg','right-leg','left-foot','right-foot']:continue
        s=1 if rid.startswith('left') else -1
        original.data.calc_loop_triangles();budget=len(original.data.loop_triangles)
        mat=original.data.materials[0]
        parts=split(original)
        if rid.endswith('arm'):
            keep=[];upper=[]
            for o in parts:
                lo,hi=bounds(o)
                if hi.z<18.2 and lo.z<0:
                    bpy.data.objects.remove(o,do_unlink=True)
                elif lo.z>15 and hi.z<18.5:
                    bpy.data.objects.remove(o,do_unlink=True)
                else:upper.append(o)
            # Close the remaining distal humeral flare into its condyles.
            for o in upper:
                lo,hi=bounds(o)
                if hi.z-lo.z>15:
                    for v in o.data.vertices:
                        t=max(0,min(1,(23-v.co.z)/5));t=t*t*(3-2*t)
                        v.co.x=s*23+(v.co.x-s*23)*(1-.17*t)
            keep.append(fuse(upper,tier))
            radius=h.tube('Radius shaft',[(s*24,16.6,2),(s*25.5,5.5,1.7),(s*26,-5,2)],lambda t:.52+.36*t*t,mat,24)
            disc=h.ellipsoid('Radial head',(s*24,16.7,2),(.95,.42,.95),mat)
            keep.append(fuse([radius,disc],tier))
            ulna=h.tube('Ulna shaft',[(s*22,17,.65),(s*23.2,6,.25),(s*24,-5,1)],lambda t:.65-.16*t,mat,24)
            hook=[(s*22,18+1.25*math.sin(a),1-1.25*math.cos(a)) for a in [-1.5+3.1*i/24 for i in range(25)]]
            notch=h.tube('Olecranon and trochlear notch',hook,.40,mat,36)
            keep.append(fuse([ulna,notch],tier));pack(keep,rid,budget+(350 if tier=='normal' else 1800))
        elif rid.endswith('leg'):
            groups={'femur':[],'tibia':[],'fibula':[]};keep=[]
            for o in parts:
                lo,hi=bounds(o);c=(lo+hi)/2
                if hi.z>-26 and lo.z<-14:groups['femur'].append(o)
                elif lo.z<-70:
                    groups['tibia' if abs(c.x)<9.8 else 'fibula'].append(o)
                elif -54<c.z<-50 and abs(c.x)>9.8:groups['fibula'].append(o)
                else:keep.append(o)
            groups['tibia'].append(h.ellipsoid('Medial malleolus',(s*6.7,-80.5,0),(.62,1.35,.85),mat))
            groups['fibula'].append(h.ellipsoid('Lateral malleolus',(s*10,-81,-1),(.62,1.65,.82),mat))
            for name,bones in groups.items():
                if not bones:raise RuntimeError('Missing '+name)
                keep.append(fuse(bones,tier))
            pack(keep,rid,budget+(350 if tier=='normal' else 1800))
        else:
            # Reshape only the talus component, leave the heel and toe rays alone.
            found=0
            for o in parts:
                lo,hi=bounds(o);c=(lo+hi)/2
                if -82<c.z<-81 and hi.z-lo.z>2 and abs(c.y+1)<.3:
                    matrix=o.matrix_world.copy();inverse=matrix.inverted()
                    for v in o.data.vertices:
                        p=matrix@v.co;dz=p.z+81.5
                        p.z=-81.05+dz*.65
                        p.x=s*8+(p.x-s*8)*1.08
                        v.co=inverse@p
                    found+=1
            assert found==1, f'Expected one talus in {rid}, found {found}'
            pack(parts,rid,budget)
    meshes=[o for o in bpy.context.scene.objects if o.type=='MESH']
    for o in meshes:
        o.data.validate();o.data.update();assert not o.data.validate();o.data.calc_loop_triangles()
    path=OUT/f'{PREFIX}-{tier}.glb';bpy.ops.export_scene.gltf(filepath=str(path),export_format='GLB',export_extras=True,export_animations=False)
    stats[tier]={'triangles':sum(len(o.data.loop_triangles) for o in meshes),'bytes':path.stat().st_size}
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=20
scene.render.resolution_x=900;scene.render.resolution_y=800;scene.render.resolution_percentage=100
scene.world=bpy.data.worlds.new('Joint studio');scene.world.use_nodes=True
scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.05,.07,.09,1);scene.world.node_tree.nodes['Background'].inputs[1].default_value=.65
def aim(o,p):o.rotation_euler=(Vector(p)-o.location).to_track_quat('-Z','Y').to_euler()
for loc,power in [((-80,-120,130),180000),((80,-60,-30),120000),((0,70,50),160000)]:
    bpy.ops.object.light_add(type='AREA',location=loc);o=bpy.context.object;o.data.energy=power;o.data.size=60;aim(o,(0,0,0))
bpy.ops.object.camera_add();scene.camera=bpy.context.object;scene.camera.data.type='ORTHO'
for name,target,loc,span in [('elbow',(23,-1,18),(40,-70,22),15),('hip',(9,0,-18),(40,-70,-10),30),('ankle',(8,-1,-81),(28,-60,-70),18),('body',(0,0,0),(20,-360,30),192)]:
    scene.camera.location=loc;scene.camera.data.ortho_scale=span;aim(scene.camera,target)
    scene.render.filepath=str(OUT/f'{PREFIX}-{name}.png');bpy.ops.render.render(write_still=True)
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/f'{PREFIX}.blend'))
(OUT/f'{PREFIX}-stats.json').write_text(json.dumps(stats,indent=2));print(stats)
