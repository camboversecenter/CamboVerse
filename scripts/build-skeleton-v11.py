"""Original illustrative hand/foot refinement; preserves V10 outside extremities.
Reference: OpenStax A&P 2e 8.2 / 8.4. Not a scanned or clinical model.
"""
import ast, bpy, bmesh, math, json
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parent
source=ROOT/'build-skeleton-v10.py'; tree=ast.parse(source.read_text()); nodes=[]
for node in tree.body:
    if isinstance(node,ast.Assign) and any(isinstance(t,ast.Name) and t.id=='stats' for t in node.targets):break
    nodes.append(node)
scope={'__file__':str(source)};exec(compile(ast.Module(body=nodes,type_ignores=[]),str(source),'exec'),scope)
h=scope['h'];OUT=scope['OUT'];select=scope['select'];region=scope['region'];split=scope['split'];bounds=scope['bounds']
PREFIX='lab-skeleton-v11';stats={}

def short_bone(name,at,radii,mat,bend=0):
    # Rounded, flattened articular blocks rather than identical spheres.
    def deform(x,y,z):
        def rounded(v):return math.copysign(abs(v)**.72,v)
        return rounded(x)+bend*y,rounded(y),rounded(z)*(.91+.09*y)
    return h.ellipsoid(name,at,radii,mat,deform)

def long_bone(name,a,b,width,mat,terminal=False):
    a,b=Vector(a),Vector(b);d=(b-a).normalized()
    v=d.cross(Vector((0,0,1)))
    if v.length<.01:v=d.cross(Vector((1,0,0)))
    v.normalize();w=d.cross(v).normalized();verts=[];faces=[]
    profile=[(.0,.65),(.06,1.05),(.16,.83),(.32,.57),(.55,.53),(.76,.66),(.88,1),(.96,.98),(1,.60)]
    if terminal:profile=[(0,.7),(.08,1),(.23,.72),(.46,.52),(.65,.58),(.8,.85),(.94,.8),(1,.35)]
    for t,r in profile:
        c=a.lerp(b,t)+w*(.08*math.sin(math.pi*t))
        for i in range(h.N):
            angle=2*math.pi*i/h.N
            q=c+width*r*(v*math.cos(angle)+w*.72*math.sin(angle))
            verts.append(tuple(q))
    for j in range(len(profile)-1):
        for i in range(h.N):
            p=j*h.N+i;n=j*h.N+(i+1)%h.N;faces.append((p,n,n+h.N,p+h.N))
    faces += [tuple(reversed(range(h.N))),tuple((len(profile)-1)*h.N+i for i in range(h.N))]
    o=h.mesh(name,verts,faces,mat);select([o])
    m=o.modifiers.new('Round articular ends','SUBSURF');m.levels=1;bpy.ops.object.modifier_apply(modifier=m.name)
    o.data.calc_loop_triangles();limit=115 if h.N==6 else 330
    m=o.modifiers.new('Small bone budget','DECIMATE');m.ratio=min(1,limit/len(o.data.loop_triangles));bpy.ops.object.modifier_apply(modifier=m.name)
    return o

def finish(parts,rid):
    names=[o.name for o in parts];assert len(parts)==(27 if rid.endswith('hand') else 26)
    select(parts);bpy.ops.object.join();o=bpy.context.object
    o.name='skeleton-'+rid+'-v11';o['skeletonRegion']=rid;o['anatomyPart']='skeleton'
    o['illustrativeBones']=names;o['boneCount']=len(names)
    o.data.validate();o.data.update()

for tier in ['normal','ultra']:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(OUT/f'lab-skeleton-v10-{tier}.glb'))
    h.N=6 if tier=='normal' else 12
    for old in list(bpy.context.scene.objects):
        if old.type!='MESH':continue
        rid=region(old)
        if rid not in ['left-hand','right-hand','left-foot','right-foot']:continue
        s=1 if rid.startswith('left') else -1;mat=old.data.materials[0];parts=[]
        if rid.endswith('hand'):
            bpy.data.objects.remove(old,do_unlink=True)
            # Radius/thumb side is lateral. Pisiform sits anterior to triquetrum.
            carpals=[('scaphoid',26.2,-6.4,1.6,.62,.85,.60,.25),('lunate',25,-6.25,1.5,.62,.63,.64,-.1),
              ('triquetrum',23.9,-6.65,1.4,.58,.59,.61,.12),('pisiform',23.7,-6.55,2.38,.32,.40,.32,0),
              ('trapezium',26.9,-7.75,1.65,.54,.55,.60,-.15),('trapezoid',26,-7.8,1.5,.38,.50,.56,.1),
              ('capitate',25,-7.75,1.4,.53,.75,.61,.08),('hamate',23.9,-7.8,1.4,.56,.65,.62,-.15)]
            for n,x,y,z,rx,ry,rz,bend in carpals:parts.append(short_bone(n,(s*x,y,z),(rx,ry,rz),mat,bend*s))
            # Metacarpal fan, staggered knuckles and unequal phalange lengths.
            rays=[((27,-8.3,1.7),(29,-11.2,2),[2.5,1.75]),
                  ((26.1,-8.5,1.5),(26.9,-13.4,1.75),[2.8,1.8,1.35]),
                  ((25,-8.55,1.4),(25.45,-13.8,1.55),[3.05,2,1.4]),
                  ((24.1,-8.55,1.4),(24,-13.35,1.65),[2.75,1.8,1.3]),
                  ((23.3,-8.4,1.5),(22.7,-12.6,1.85),[2.1,1.4,1.15])]
            for f,(a,b,lengths) in enumerate(rays):
                a=(s*a[0],a[1],a[2]);b=(s*b[0],b[1],b[2])
                parts.append(long_bone(f'metacarpal-{f+1}',a,b,.47 if f==0 else .40,mat))
                p=Vector(b);direction=Vector((s*(.42 if f==0 else (2-f)*.045),-1,.07)).normalized()
                for j,length in enumerate(lengths):
                    a=p+direction*.16;b=a+direction*length
                    parts.append(long_bone(f'digit-{f+1}-phalanx-{j+1}',a,b,(.37 if f==0 else .33)*(1-j*.13),mat,j==len(lengths)-1));p=b
        else:
            # Preserve V10 talus exactly, including the ankle fit.
            for o in split(old):
                lo,hi=bounds(o);c=(lo+hi)/2
                if -81.4<c.z<-80.7 and abs(c.y+1)<.3:
                    o.name='talus-v10-preserved';parts.append(o)
                else:bpy.data.objects.remove(o,do_unlink=True)
            assert len(parts)==1,'Talus identification failed'
            tarsals=[('calcaneus',8,-83,-.35,1.55,1.15,2.25,.15),
              ('navicular',7.1,-81.9,3.1,1.10,.66,.62,.08),
              ('cuboid',9.45,-82.7,3.7,.74,.66,1.00,-.16),
              ('medial-cuneiform',5.9,-82.25,4.5,.53,.68,.85,-.1),
              ('intermediate-cuneiform',7.1,-82.3,4.55,.46,.56,.68,.1),
              ('lateral-cuneiform',8.18,-82.4,4.55,.48,.56,.72,.1)]
            for n,x,y,z,rx,ry,rz,bend in tarsals:parts.append(short_bone(n,(s*x,y,z),(rx,ry,rz),mat,bend*s))
            for f in range(5):
                x=5.6+f*1.14;end=8.6-f*.36
                a=(s*(5.9+f*.94),-82.35-f*.10,5.2 if f<3 else 4.7)
                b=(s*x,-83.1,end)
                parts.append(long_bone(f'metatarsal-{f+1}',a,b,.53 if f==0 else .36,mat))
                lengths=[1.45,1.05] if f==0 else [1.25-f*.10,.70-f*.045,.65-f*.035]
                p=Vector(b);direction=Vector((s*.025,-.015,1)).normalized()
                for j,length in enumerate(lengths):
                    a=p+direction*.15;b=a+direction*length
                    parts.append(long_bone(f'toe-{f+1}-phalanx-{j+1}',a,b,(.48 if f==0 else .28)*(1-j*.13),mat,j==len(lengths)-1));p=b
        finish(parts,rid)
    meshes=[o for o in bpy.context.scene.objects if o.type=='MESH']
    for o in meshes:
        assert not o.data.validate();o.data.calc_loop_triangles()
    path=OUT/f'{PREFIX}-{tier}.glb'
    bpy.ops.export_scene.gltf(filepath=str(path),export_format='GLB',export_extras=True,export_animations=False)
    stats[tier]={'triangles':sum(len(o.data.loop_triangles) for o in meshes),'bytes':path.stat().st_size}

scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=16
scene.render.resolution_x=900;scene.render.resolution_y=850;scene.render.resolution_percentage=100
scene.world=bpy.data.worlds.new('Extremity studio');scene.world.use_nodes=True
scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.045,.065,.085,1)
scene.world.node_tree.nodes['Background'].inputs[1].default_value=.65
def aim(o,p):o.rotation_euler=(Vector(p)-o.location).to_track_quat('-Z','Y').to_euler()
for loc,power in [((-80,-120,100),180000),((80,-60,-30),120000),((0,70,50),160000)]:
    bpy.ops.object.light_add(type='AREA',location=loc);o=bpy.context.object;o.data.energy=power;o.data.size=60;aim(o,(0,0,0))
bpy.ops.object.camera_add();scene.camera=bpy.context.object;scene.camera.data.type='ORTHO'
for name,target,loc,span in [('hand',(25,-1.5,-12.5),(29,-70,-9),18),('foot',(8,-4,-82),(19,-28,-59),17),('body',(0,0,0),(20,-360,30),192)]:
    scene.camera.location=loc;scene.camera.data.ortho_scale=span;aim(scene.camera,target)
    scene.render.filepath=str(OUT/f'{PREFIX}-{name}.png');bpy.ops.render.render(write_still=True)
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/f'{PREFIX}.blend'))
(OUT/f'{PREFIX}-stats.json').write_text(json.dumps(stats,indent=2));print(stats)
