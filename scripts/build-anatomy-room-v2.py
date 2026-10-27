"""Original Blender teaching meshes, cm, authored Y-up/front +Z then converted.
Not scan-derived or medically validated. Keeps previous assets untouched.
Reference: OpenStax Anatomy & Physiology 2e, chapters 7, 8, 23.
Run: blender --background --python scripts/build-anatomy-room-v2.py
"""
import bpy
import math
import json
from pathlib import Path
from mathutils import Vector

OUT = Path(__file__).resolve().parents[1] / 'public/models/local'
PI = math.pi
N = 12

def xyz(p): return Vector((p[0], -p[2], p[1]))

def material(name, rgb, rough=.58):
    m = bpy.data.materials.new(name); m.diffuse_color=(*rgb,1); m.use_nodes=True
    p=m.node_tree.nodes.get('Principled BSDF')
    p.inputs['Base Color'].default_value=(*rgb,1); p.inputs['Roughness'].default_value=rough
    return m

def mesh(name, verts, faces, mat):
    d=bpy.data.meshes.new(name); d.from_pydata([xyz(p) for p in verts],[],faces); d.update()
    o=bpy.data.objects.new(name,d); bpy.context.collection.objects.link(o); d.materials.append(mat)
    for p in d.polygons:p.use_smooth=True
    return o

def ellipsoid(name, at, radius, mat, deform=None):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=N*2,ring_count=N,location=xyz(at))
    o=bpy.context.object; o.name=name
    for v in o.data.vertices:
        x,y,z=v.co.x,v.co.z,-v.co.y
        if deform:x,y,z=deform(x,y,z)
        v.co=xyz((x*radius[0],y*radius[1],z*radius[2]))
    o.data.materials.append(mat)
    for p in o.data.polygons:p.use_smooth=True
    return o

def tube(name, controls, radius, mat, steps=None):
    # Catmull-Rom, varying radius, parallel local ring basis.
    steps=steps or (len(controls)-1)*5
    pts=[Vector(p) for p in controls]; verts=[]; faces=[]
    previous=None
    for j in range(steps+1):
        t=j/steps*(len(pts)-1); k=min(int(t),len(pts)-2); u=t-k
        a,b,c,d=pts[max(0,k-1)],pts[k],pts[k+1],pts[min(len(pts)-1,k+2)]
        p=.5*((2*b)+(-a+c)*u+(2*a-5*b+4*c-d)*u*u+(-a+3*b-3*c+d)*u*u*u)
        tangent=((-a+c)+2*(2*a-5*b+4*c-d)*u+3*(-a+3*b-3*c+d)*u*u).normalized(); ref=Vector((0,0,1))
        if abs(tangent.dot(ref))>.95:ref=Vector((1,0,0))
        v=tangent.cross(ref).normalized(); w=tangent.cross(v).normalized()
        if previous is not None and previous.dot(v)<0:v=-v;w=-w
        previous=v
        r=radius(j/steps) if callable(radius) else radius
        for i in range(N):
            q=p+r*(math.cos(2*PI*i/N)*v+math.sin(2*PI*i/N)*w);verts.append(tuple(q))
        if j:
            for i in range(N):
                a=(j-1)*N+i;b=(j-1)*N+(i+1)%N;faces.append((a,b,b+N,a+N))
    faces.extend([tuple(reversed(range(N))),tuple(steps*N+i for i in range(N))])
    return mesh(name,verts,faces,mat)

def plate(name, outline, thickness, mat):
    verts=[(x,y,z+off) for off in [-thickness/2,thickness/2] for x,y,z in outline]
    n=len(outline);faces=[tuple(reversed(range(n))),tuple(n+i for i in range(n))]
    faces += [(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
    o=mesh(name,verts,faces,mat)
    bpy.context.view_layer.objects.active=o
    bevel=o.modifiers.new('Rounded plate edges','BEVEL');bevel.width=thickness*.45;bevel.segments=3
    bpy.ops.object.modifier_apply(modifier=bevel.name)
    return o

def skeleton(tier):
    bone=material('Warm ivory cortical bone',(.72,.65,.50),.7)
    cartilage=material('Costal cartilage',(.48,.54,.51),.82)
    # Reuse existing locally authored skull, without brain/skin; place in body frame.
    bpy.ops.import_scene.gltf(filepath=str(OUT/f'lab-head-internal-v2-{tier}.glb'))
    skull=[]
    for o in list(bpy.context.scene.objects):
        if o.type=='MESH' and o.name.startswith('part-skull'):skull.append(o)
        else:bpy.data.objects.remove(o,do_unlink=True)
    coords=[o.matrix_world@Vector(c) for o in skull for c in o.bound_box]
    lo=Vector(tuple(min(p[i] for p in coords) for i in range(3)))
    hi=Vector(tuple(max(p[i] for p in coords) for i in range(3)));center=(lo+hi)/2
    scale=22/(hi.z-lo.z)
    for o in skull:
        transform=o.matrix_world.copy()
        for v in o.data.vertices:v.co=(transform@v.co-center)*scale+xyz((0,72,-1))
        o.matrix_world.identity();o.name='skeleton-skull'
    # The source is an open teaching cutaway: restore the cranial roof here.
    rim=[p for p in coords if p.z>hi.z-.3]
    roof_center=Vector(((min(p.x for p in rim)+max(p.x for p in rim))/2,(min(p.y for p in rim)+max(p.y for p in rim))/2,hi.z))
    roof_at=(roof_center-center)*scale+xyz((0,72,-1))
    roof_rx=(max(p.x for p in rim)-min(p.x for p in rim))*scale/2
    roof_ry=(max(p.y for p in rim)-min(p.y for p in rim))*scale/2
    verts=[];faces=[]
    for j in range(N+1):
        a=(PI/2)*j/N
        for i in range(N*2):
            t=2*PI*i/(N*2)
            verts.append((roof_at.x+roof_rx*math.cos(a)*math.cos(t),roof_at.z-.10+roof_rx*.55*math.sin(a),-roof_at.y+roof_ry*math.cos(a)*math.sin(t)))
    for j in range(N):
        for i in range(N*2):
            a=j*N*2+i;b=j*N*2+(i+1)%(N*2);faces.append((a,b,b+N*2,a+N*2))
    mesh('skeleton-cranial-roof',verts,faces,bone)
    for i in range(24):
        y=58-i*2.8; z=-5.3+2*math.sin(i/23*PI*2)
        r=1.2+i*.047
        ellipsoid('skeleton-vertebra',(0,y,z),(r,1.05,r*.85),bone)
        tube('skeleton-neural-arch',[(-r,y,z),(0,y,z-2.4),(r,y,z)],.43,bone)
        tube('skeleton-spinous-process',[(0,y,z-2),(0,y-.7,z-4)],.48,bone)
        for s in [-1,1]:tube('skeleton-transverse-process',[(s*r*.6,y,z-1),(s*(r+1.5),y-.2,z-1.7)],.38,bone)
    for i in range(12):
        y=45-i*2.45; width=8+8*math.sin((i+1)/14*PI)
        for s in [-1,1]:
            end=.97*PI if i<10 else .62*PI
            points=[(s*(1.4+width*math.sin(t)),y-3.2*t/PI,-6+7.5*(1-math.cos(t))) for t in [end*j/22 for j in range(23)]]
            tube('skeleton-rib',points,.46 if i<9 else .38,bone,30 if tier=='normal' else 55)
            if i<10:
                p=points[-1]; target=(s*.8,40-i*2.2 if i<7 else 25,8)
                tube('skeleton-costal-cartilage',[p,(s*3,p[1]-1,8.4),target],.40,cartilage)
    plate('skeleton-sternum',[(-2,45,8),(2,45,8),(1.3,39,9),(1.1,26,8),(0,22,7),(-1.1,26,8),(-1.3,39,9)],1.2,bone)
    for s in [-1,1]:
        tube('skeleton-clavicle',[(s*1,47,7),(s*7,48,6),(s*13,47,3),(s*18,46,0)],.7,bone)
        plate('skeleton-scapula',[(s*4,44,-8),(s*16,46,-5),(s*14,40,-8),(s*8,29,-9)],1,bone)
        # Broad iliac wings and open obturator rings, not a solid pelvis blob.
        plate('skeleton-ilium',[(s*2,-7,-5),(s*5,0,-7),(s*11,1,-5),(s*16,-3,-1),(s*13,-13,1),(s*8,-17,0),(s*5,-12,-3)],1.7,bone)
        tube('skeleton-pubic-arch',[(s*8,-15,0),(s*10,-22,1),(s*5,-25,5),(s*.8,-21,6),(s*3,-16,4),(s*8,-15,0)],1.0,bone)
        for name,a,b,r in [('humerus',(s*19,44,0),(s*23,18,1),1.05),('radius',(s*24,17,2),(s*26,-5,2),.60),('ulna',(s*22,17,0),(s*24,-5,1),.67),('femur',(s*9,-17,0),(s*8,-49,0),1.35),('tibia',(s*8,-52,0),(s*8,-80,0),1.10),('fibula',(s*11,-52,-1),(s*10,-80,-1),.5)]:
            tube('skeleton-'+name,[a,tuple((Vector(a)+Vector(b))/2+Vector((s*.6,0,-.5))),b],lambda t:r*(1+.8*abs(2*t-1)**5),bone,22)
            ellipsoid('skeleton-'+name+'-head',a,(r*1.55,r*1.5,r*1.55),bone)
        ellipsoid('skeleton-patella',(s*8,-50,2.2),(1.8,2,1),bone)
        ellipsoid('skeleton-carpals',(s*25,-7,1.5),(2,1.5,1),bone)
        ellipsoid('skeleton-tarsals',(s*8,-82,1),(2.6,1.8,3),bone)
        for f in range(5):
            x=s*(23.2+f*.95);length=6.3-abs(f-2)*1.1
            tube('skeleton-metacarpal',[(x,-8,1.5),(x,-12,1.8)],.34,bone)
            for j in range(3 if f else 2):
                tube('skeleton-finger',[(x,-12-j*length/3,1.8),(x+s*.18,-12-(j+1)*length/3+.2,2)],.25,bone)
            x=s*(5.8+f*1.1)
            tube('skeleton-metatarsal',[(x,-82,2),(x,-83,7)],.4,bone)
            tube('skeleton-toe',[(x,-83,7),(x,-83,10-abs(f)*.55)],.36,bone)
    plate('skeleton-sacrum',[(-3,-6,-5),(3,-6,-5),(2,-15,-3),(0,-20,-2),(-2,-15,-3)],2,bone)

def organs():
    liver=material('Liver burgundy',(.30,.065,.048),.42)
    gut=material('Digestive tissue',(.60,.27,.20),.53)
    renal=material('Renal capsule',(.35,.07,.055),.40)
    bile=material('Gallbladder olive',(.23,.30,.075),.5)
    nerve=material('Nervous tissue',(.78,.69,.46),.65)
    gland=material('Gland tissue',(.65,.38,.18),.60)
    tendon=material('Diaphragm tendon',(.70,.59,.45),.66)
    red=material('Arterial wall',(.42,.035,.025),.48);blue=material('Venous wall',(.085,.13,.28),.5)
    ellipsoid('liver',(-5,18,1),(10,4.7,6),liver,lambda x,y,z:(x,y*(.70+.3*(-x+1)/2)+.2*x,z*(1-.28*max(0,x))))
    tube('gallbladder',[(-4,14,3),(-4.4,11,3.5),(-3.3,9,3),(-2,13,1)],lambda t:.3+1.2*math.sin(PI*t)**1.2,bile)
    # Fundus/body turning into pyloric channel: actual curved volume, not an egg.
    tube('stomach',[(4,23,-1),(7,21,1),(8,17,2),(7,12,3),(3,11,3),(1,13,1)],lambda t:.9+3.3*math.sin(PI*t)**.8,gut,48)
    tube('oesophagus',[(0,53,-3),(0,38,-4),(1,29,-3),(4,23,-1)],1.0,gut)
    tube('pancreas',[(-4,11,-2),(-2,9,-2),(3,11,-3),(8,13,-3)],lambda t:.5+1.5*(1-t)*(1+.1*math.cos(t*50)),gland,40)
    ellipsoid('spleen',(11,18,-3),(2.6,4.4,2.0),material('Splenic tissue',(.24,.045,.09)),lambda x,y,z:(x+.20*y,y,z))
    for s in [-1,1]:
        ellipsoid('kidneys',(s*6.5,5+s,-5.5),(3,5.2,2.6),renal,lambda x,y,z,s=s:(x+s*.44*math.exp(-y*y*7)*(1-abs(z)),y,z))
        tube('ureters',[(s*5,4,-4.5),(s*5,-5,-3),(s*2,-15,1)],.38,gland)
    ellipsoid('bladder',(0,-17,3),(4,3.8,3),gland,lambda x,y,z:(x*(.85+.15*y),y,z*(.85+.15*y)))
    tube('bladder',[(0,-19,3),(0,-23,3)],.55,gland)
    # Meandering compact bowel loops, separate from the surrounding haustrated colon.
    pts=[]
    for i in range(81):
        t=i/80; pts.append((6*math.sin(t*PI*10),5-15*t,2+1.4*math.cos(t*PI*6)))
    tube('small-intestine',pts,1.15,gut,160 if N==12 else 300)
    tube('large-intestine',[(-9,-10,1),(-10,-2,1),(-10,8,1),(-6,10,2),(0,8,4),(7,10,2),(10,7,1),(10,-5,0),(7,-11,1),(2,-10,2),(0,-16,1)],lambda t:1.75*(1+.12*math.cos(t*PI*64)),gut,170 if N==12 else 300)
    tube('large-intestine',[(-9,-10,1),(-10,-13,1),(-8,-14,1)],.4,gut)
    for s in [-1,1]:ellipsoid('thyroid',(s*1.8,51,2),(1.35,2.8,1.2),gland)
    tube('thyroid',[(-1.5,50,2.5),(0,50,3),(1.5,50,2.5)],.65,gland)
    tube('spinal-cord',[(0,59,-5),(0,40,-6),(0,18,-5),(0,2,-4)],.65,nerve)
    for i in range(9):
        for s in [-1,1]:tube('spinal-cord',[(0,4,-4),(s*(.5+i*.13),-5,-4),(s*(1+i*.2),-13,-4)],.11,nerve)
    tube('great-vessels',[(1,36,1),(0,43,-1),(-3,46,-3),(-5,42,-5),(-3,15,-6),(-2,-9,-6)],1.15,red)
    tube('great-vessels',[(4,44,-3),(4,30,-4),(4,10,-5),(4,-12,-4)],1.1,blue)
    for s in [-1,1]:tube('great-vessels',[(-2,-9,-6),(s*4,-14,-5),(s*7,-19,-4)],.65,red)
    # Thin dome rather than solid oblate sphere; tendon area separately colored.
    verts=[];faces=[];steps=N*2
    for j in range(N+1):
        r=.01+.99*j/N
        for i in range(steps):
            a=2*PI*i/steps;verts.append((14*r*math.cos(a),21+4*(1-r*r),9*r*math.sin(a)-1))
    for j in range(N):
        for i in range(steps):faces.append((j*steps+i,j*steps+(i+1)%steps,(j+1)*steps+(i+1)%steps,(j+1)*steps+i))
    o=mesh('diaphragm',verts,faces,gut);o.data.materials.append(tendon)
    for p in o.data.polygons:
        if p.index<steps*N//3:p.material_index=1
    bpy.context.view_layer.objects.active=o
    mod=o.modifiers.new('Muscle sheet thickness','SOLIDIFY');mod.thickness=.18;bpy.ops.object.modifier_apply(modifier=mod.name)

def consolidate():
    buckets={}
    for o in list(bpy.context.scene.objects):
        if o.type!='MESH':continue
        part='skeleton' if o.name.startswith('skeleton') else o.name.split('.')[0]
        key=(part,tuple(m.name for m in o.data.materials));buckets.setdefault(key,[]).append(o)
    for (part,_),objects in buckets.items():
        bpy.ops.object.select_all(action='DESELECT')
        for o in objects:o.select_set(True)
        bpy.context.view_layer.objects.active=objects[0]
        if len(objects)>1:bpy.ops.object.join()
        objects[0].name='part-'+part+'__mesh';objects[0]['anatomyPart']=part

def preview(kind):
    scene=bpy.context.scene;scene.render.engine='BLENDER_EEVEE'
    scene.render.resolution_x=650;scene.render.resolution_y=900;scene.render.resolution_percentage=100
    scene.world=bpy.data.worlds.new('Review studio');scene.world.use_nodes=True
    scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.055,.075,.09,1)
    scene.world.node_tree.nodes['Background'].inputs[1].default_value=.5
    target=Vector((0,0,0 if kind=='skeleton' else 18));distance=200 if kind=='skeleton' else 112
    bpy.ops.object.camera_add(location=(distance*.22,-distance*1.8,distance*.20))
    camera=bpy.context.object;camera.rotation_euler=(target-camera.location).to_track_quat('-Z','Y').to_euler()
    camera.data.type='ORTHO';camera.data.ortho_scale=distance;scene.camera=camera
    for loc,power in [((-80,-110,140),190000),((80,-50,30),110000),((0,80,100),180000)]:
        bpy.ops.object.light_add(type='AREA',location=loc);o=bpy.context.object;o.data.energy=power;o.data.size=90
        o.rotation_euler=(target-o.location).to_track_quat('-Z','Y').to_euler()
    bpy.ops.wm.save_as_mainfile(filepath=str(OUT/f'lab-{kind}-v2.blend'))
    scene.render.filepath=str(OUT/f'lab-{kind}-v2-preview.png');bpy.ops.render.render(write_still=True)

if __name__ == '__main__':
    stats={}
    for kind,build in [('skeleton',skeleton),('viscera',lambda tier:organs())]:
        for tier in ['normal','ultra']:
            bpy.ops.wm.read_factory_settings(use_empty=True);N=12 if tier=='normal' else 24
            build(tier);consolidate()
            if tier=='normal' and kind=='skeleton':
                for o in list(bpy.context.scene.objects):
                    if o.type!='MESH':continue
                    bpy.context.view_layer.objects.active=o
                    mod=o.modifiers.new('Mobile geometry budget','DECIMATE');mod.ratio=.32
                    bpy.ops.object.modifier_apply(modifier=mod.name)
            bpy.ops.object.select_all(action='SELECT')
            meshes=[o for o in bpy.context.scene.objects if o.type=='MESH']
            triangles=0
            for o in meshes:o.data.calc_loop_triangles();triangles+=len(o.data.loop_triangles)
            path=OUT/f'lab-{kind}-v2-{tier}.glb'
            bpy.ops.export_scene.gltf(filepath=str(path),export_format='GLB',use_selection=True,export_animations=False,export_extras=True)
            stats[kind+'-'+tier]={'triangles':triangles,'meshes':len(meshes),'bytes':path.stat().st_size,'parts':sorted(set(o['anatomyPart'] for o in meshes))}
            if tier=='ultra':preview(kind)
    (OUT/'lab-anatomy-v2-stats.json').write_text(json.dumps(stats,indent=2))
    print(json.dumps(stats,indent=2))
