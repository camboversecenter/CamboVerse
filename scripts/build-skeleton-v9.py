"""Shoulder/knee review candidate, preserving V8 head and all other regions.
Original schematic anatomy; not a clinically validated joint simulation.
"""
import bpy, bmesh, math, json, importlib.util
from pathlib import Path
from mathutils import Vector

ROOT=Path(__file__).resolve().parent;OUT=ROOT.parent/'public/models/local'
spec=importlib.util.spec_from_file_location('joint_helpers',ROOT/'build-anatomy-room-v2.py')
h=importlib.util.module_from_spec(spec);spec.loader.exec_module(h)
PREFIX='lab-skeleton-v9'
def select(objects):
    bpy.ops.object.select_all(action='DESELECT')
    for o in objects:o.select_set(True)
    bpy.context.view_layer.objects.active=objects[0]
def region(o):
    while o:
        if o.get('skeletonRegion'):return o['skeletonRegion']
        o=o.parent
def rebuild_bone_joins(obj,tier):
    """Close old tube ends and blend shaft/head pieces, never across a joint."""
    rid=region(obj);obj.data.calc_loop_triangles();budget=len(obj.data.loop_triangles)+(300 if tier=='normal' else 1200)
    select([obj]);bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
    bm=bmesh.new();bm.from_mesh(obj.data)
    bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=.0001)
    bm.to_mesh(obj.data);bm.free()
    bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.mesh.separate(type='LOOSE');bpy.ops.object.mode_set(mode='OBJECT')
    pieces=list(bpy.context.selected_objects)
    groups={}
    for o in pieces:
        pts=[o.matrix_world@Vector(c) for c in o.bound_box]
        lo=Vector(tuple(min(p[i] for p in pts) for i in range(3)));hi=Vector(tuple(max(p[i] for p in pts) for i in range(3)));c=(lo+hi)/2
        name=None
        if 'arm' in rid and hi.z>35:name='humerus'
        if 'leg' in rid:
            if (lo.z<-30 and hi.z>-25) or (-50.5<c.z<-46 and c.y>-.8):name='femur'
            if (lo.z<-70 and hi.z>-56 and abs(c.x)<9.8) or (-54<c.z<-50.5 and abs(c.x)<9.8 and c.y>-.9):name='tibia'
        if name:groups.setdefault(name,[]).append(o)
    survivors=list(pieces)
    for name,parts in groups.items():
        for o in parts:
            if name=='humerus':
                coords=[v.co for v in o.data.vertices]
                low=min(v.z for v in coords);high=max(v.z for v in coords)
                if high-low>15:
                    side=1 if rid=='left-arm' else -1
                    for v in o.data.vertices:
                        t=max(0,min(1,(v.co.z-38)/6));t=t*t*(3-2*t)
                        axis=side*(19+(44-v.co.z)*4/26)
                        v.co.x=axis+(v.co.x-axis)*(1-.32*t)
                        v.co.y*=1-.32*t
            bm=bmesh.new();bm.from_mesh(o.data)
            boundary=[e for e in bm.edges if e.is_boundary]
            if boundary:bmesh.ops.holes_fill(bm,edges=boundary,sides=0)
            bm.to_mesh(o.data);bm.free()
        select(parts)
        if len(parts)>1:bpy.ops.object.join()
        o=bpy.context.object
        for p in parts:
            if p in survivors:survivors.remove(p)
        survivors.append(o)
        m=o.modifiers.new('Continuous shaft and articular end','REMESH');m.mode='VOXEL';m.voxel_size=.13 if tier=='normal' else .075
        bpy.ops.object.modifier_apply(modifier=m.name)
        m=o.modifiers.new('Smooth bone junction','SMOOTH');m.factor=.65;m.iterations=5;bpy.ops.object.modifier_apply(modifier=m.name)
        for p in o.data.polygons:p.use_smooth=True
    select(survivors)
    if len(survivors)>1:bpy.ops.object.join()
    result=bpy.context.object;result.data.calc_loop_triangles()
    if len(result.data.loop_triangles)>budget:
        m=result.modifiers.new('Region budget','DECIMATE');m.ratio=budget/len(result.data.loop_triangles);bpy.ops.object.modifier_apply(modifier=m.name)
    result['skeletonRegion']=rid;result['anatomyPart']='skeleton'
    return result
def cup(side,mat,tier):
    # Shallow medial socket opposing the existing humeral head, with a closed
    # bone backing. It is deliberately not a deep hip-like hemispherical cup.
    n=16 if tier=='normal' else 32;rings=4 if tier=='normal' else 8
    verts=[];faces=[]
    for outer in [False,True]:
        for j in range(rings+1):
            a=.015+.68*j/rings
            for i in range(n):
                t=2*math.pi*i/n;r=1.94+(.22 if outer else 0)
                verts.append((side*(19-r*math.cos(a)),r*math.sin(a)*math.cos(t),44+1.15*r*math.sin(a)*math.sin(t)))
    block=(rings+1)*n
    for layer in range(2):
        for j in range(rings):
            for i in range(n):
                a=layer*block+j*n+i;b=layer*block+j*n+(i+1)%n
                face=(a,b,b+n,a+n);faces.append(tuple(reversed(face)) if layer else face)
    for j in [0,rings]:
        for i in range(n):
            a=j*n+i;b=j*n+(i+1)%n;faces.append((a,a+block,b+block,b))
    mesh=bpy.data.meshes.new('Shallow glenoid surface');mesh.from_pydata(verts,[],faces);mesh.update()
    o=bpy.data.objects.new('Glenoid '+str(side),mesh);bpy.context.collection.objects.link(o);mesh.materials.append(mat)
    for p in mesh.polygons:p.use_smooth=True
    return o

stats={}
for tier in ['normal','ultra']:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(OUT/f'lab-skeleton-v8-{tier}.glb'))
    meshes=[o for o in bpy.context.scene.objects if o.type=='MESH']
    girdle=next(o for o in meshes if region(o)=='shoulder-girdle');bone=girdle.data.materials[0]
    for o in meshes:
        if region(o) not in ['left-leg','right-leg']:continue
        select([o]);bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
        side=1 if region(o)=='left-leg' else -1
        for v in o.data.vertices:
            x,d,z=v.co;dx=x-side*8
            # Local proximal tibia envelope: broaden the plateau and reduce the
            # ball-like apex. Leave fibula and femoral surfaces outside this box.
            if abs(dx)<2.05 and abs(d)<1.9 and -55<z<-50.30:
                w=max(0,1-abs(z+52)/3)
                v.co.x=side*8+dx*(1+.27*w)
                if z>-52:v.co.z=-52+(z+52)*.60
            # Patellar anterior envelope: narrow towards the inferior apex.
            if abs(dx)<1.9 and d<-1.45 and -52.2<z<-47.8:
                t=max(0,min(1,(z+52)/4))
                w=max(0,min(1,(-d-1.45)/.45))
                v.co.x=side*8+dx*(1-w*.28*(1-t))
        o.data.update()
    for o in list(meshes):
        if region(o) in ['left-arm','right-arm','left-leg','right-leg']:rebuild_bone_joins(o,tier)
    additions=[];h.N=6 if tier=='normal' else 12
    for s in [-1,1]:
        additions.append(cup(s,bone,tier))
        additions.append(h.tube('Scapular neck',[(s*15,43,-5),(s*16,43.8,-2.5),(s*17,44,0)],lambda t:.85-.2*t,bone,10 if tier=='normal' else 20))
    select([girdle]+additions);bpy.ops.object.join()
    girdle['skeletonRegion']='shoulder-girdle';girdle['anatomyPart']='skeleton'
    girdle['jointReview']='V9 shallow glenoid and scapular neck; simplified bone-only study'
    meshes=[o for o in bpy.context.scene.objects if o.type=='MESH']
    for o in meshes:
        o.data.validate(verbose=True);o.data.update();o.data.calc_loop_triangles()
        assert not o.data.validate(), f'Unrepaired mesh: {o.name}'
    path=OUT/f'{PREFIX}-{tier}.glb'
    bpy.ops.export_scene.gltf(filepath=str(path),export_format='GLB',export_extras=True,export_animations=False)
    stats[tier]={'triangles':sum(len(o.data.loop_triangles) for o in meshes),'bytes':path.stat().st_size}

scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=24
scene.render.resolution_x=900;scene.render.resolution_y=800;scene.render.resolution_percentage=100
scene.world=bpy.data.worlds.new('Joint review');scene.world.use_nodes=True
scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.05,.07,.09,1)
scene.world.node_tree.nodes['Background'].inputs[1].default_value=.65
def aim(o,p):o.rotation_euler=(Vector(p)-o.location).to_track_quat('-Z','Y').to_euler()
for loc,power in [((-80,-120,130),180000),((80,-60,-30),120000),((0,70,50),160000)]:
    bpy.ops.object.light_add(type='AREA',location=loc);o=bpy.context.object;o.data.energy=power;o.data.size=60;aim(o,(0,0,0))
bpy.ops.object.camera_add();scene.camera=bpy.context.object;scene.camera.data.type='ORTHO'
for name,target,loc,span in [('shoulder',(18,0,43),(44,-65,53),18),('shoulder-back',(18,0,43),(43,65,52),18),('knees',(0,0,-50),(16,-80,-44),26),('body',(0,0,0),(20,-360,30),192)]:
    scene.camera.location=loc;scene.camera.data.ortho_scale=span;aim(scene.camera,target)
    scene.render.filepath=str(OUT/f'{PREFIX}-{name}.png');bpy.ops.render.render(write_still=True)
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/f'{PREFIX}.blend'))
(OUT/f'{PREFIX}-stats.json').write_text(json.dumps(stats,indent=2));print(stats)
