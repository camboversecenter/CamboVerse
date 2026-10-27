"""Blender 5.x: original fashion display, with the existing CC0 MakeHuman base.
Run: blender --background --python scripts/build-fashion-day-blender.py
References and asset license: docs/FASHION-DAY-REFERENCES.md.
"""
from pathlib import Path
import math, hashlib, json
import bpy
from mathutils import Vector, Matrix

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'public/models/fashion'
REVIEW = ROOT / 'public/models/local/fashion-day-v2'
OUT.mkdir(parents=True, exist_ok=True)
REVIEW.mkdir(parents=True, exist_ok=True)
SOURCE = ROOT / 'public/models/local/makehuman-source/base.obj'
assert hashlib.sha256(SOURCE.read_bytes()).hexdigest() == '8e761e6624b8f54536409135d1636da63b32486a90d4897f84e121d144f6fb4c'
verts, groups, group = [], {}, None
for line in SOURCE.read_text().splitlines():
    p = line.split()
    if not p: continue
    if p[0] == 'v': verts.append(tuple(map(float, p[1:4])))
    elif p[0] == 'g': group = p[1]; groups.setdefault(group, [])
    elif p[0] == 'f' and group: groups[group].append([int(x.split('/')[0])-1 for x in p[1:]])
ids = sorted({i for f in groups['body'] for i in f})
bottom = min(verts[i][1] for i in ids)
scale = 175 / (max(verts[i][1] for i in ids)-bottom)

def smooth(t):
    t = max(0, min(1, t)); return t*t*(3-2*t)

def pose(p):
    x, y, z = p[0]*scale, -p[2]*scale, (p[1]-bottom)*scale-86.1
    a = math.radians(35)*smooth((abs(x)-17)/9)*smooth((z+8)/8)
    dx, dz = abs(x)-17, z-46
    x, z = math.copysign(17+math.cos(a)*dx+math.sin(a)*dz, x), 46-math.sin(a)*dx+math.cos(a)*dz
    x -= math.copysign(15*smooth((-z-10)/68), x)
    return (x/100, y/100, (z+86.1)/100)

def rest(p):
    return Vector((p[0]*scale/100,-p[2]*scale/100,(p[1]-bottom)*scale/100))

def joint(name):
    selected={i for face in groups['joint-l-'+name] for i in face}
    return sum((rest(verts[i]) for i in selected),Vector())/len(selected)

S,E,W=joint('shoulder'),joint('elbow'),joint('hand')
TS,TW=S.copy(),Vector((.014,-.26,1.27))
# Two-bone inverse kinematics preserves arm lengths while placing the palms.
axis=(TW-TS).normalized();distance=(TW-TS).length
upper_length,lower_length=(E-S).length,(W-E).length
along=(upper_length**2-lower_length**2+distance**2)/(2*distance)
centre=TS+axis*along
pole=Vector((.36,-.03,1.10))-centre
pole=(pole-axis*pole.dot(axis)).normalized()
TE=centre+pole*math.sqrt(max(0,upper_length**2-along**2))
hand_long=(joint('finger-3-4')-W).normalized()
hand_wide=joint('finger-2-1')-joint('finger-5-1')
hand_wide=(hand_wide-hand_long*hand_wide.dot(hand_long)).normalized()
hand_normal=hand_wide.cross(hand_long).normalized()
hand_source=Matrix((hand_wide,hand_long,hand_normal)).transposed()
hand_target=Matrix((Vector((0,1,0)),Vector((0,0,1)),Vector((1,0,0)))).transposed()
finger_chains=[]
for finger,width,start in [(2,.030,.080),(3,.010,.085),(4,-.010,.080),(5,-.028,.070),(1,.045,.025)]:
    chain=[hand_source.transposed() @ (joint(f'finger-{finger}-{k}')-W) for k in range(1,5)]
    target=[];height=start
    for k,point in enumerate(chain):
        if k:height+=(chain[k]-chain[k-1]).length
        target.append(Vector((width if finger!=1 else width-k*.006,height,0)))
    finger_chains.append((chain,target))

def closed_hand(q):
    local=hand_source.transposed() @ (q-W)
    best=None
    for chain,target in finger_chains:
        for a,b,ta,tb in zip(chain,chain[1:],target,target[1:]):
            d=b-a;t=max(0,min(1,(local-a).dot(d)/d.length_squared))
            distance=(local-(a+d*t)).length
            if best is None or distance<best[0]:best=(distance,a,b,ta,tb,chain[0],chain[1])
    _,a,b,ta,tb,base,second=best
    weight=smooth(((local-base).dot((second-base).normalized())+.007)/.028)
    local=local.lerp(bone_map(local,a,b,ta,tb),weight)
    # Contact with the other palm gently flattens the inner surface, rather
    # than mirroring intersecting vertices back through the hand.
    local.z=max(-.012,local.z)
    return TW+hand_target @ local

def bone_map(p,a,b,ta,tb):
    direction=(b-a).normalized();offset=p-a
    stretch=(tb-ta).length/(b-a).length
    return ta+direction.rotation_difference((tb-ta).normalized()) @ (offset+direction*offset.dot(direction)*(stretch-1))

def sampeah(p):
    """Continuous two-bone arm deformation, preserving the authored hand topology."""
    original=rest(p);q=Vector((abs(original.x),original.y,original.z))
    # Separate arms from the torso/hips in the unposed base mesh.
    if q.z < 1.10-(q.x-.18) or q.x<.13:return pose(p)
    shoulder_weight=smooth((q.x-.13)/.085)
    elbow_axis=((E-S).normalized()+(W-E).normalized()).normalized()
    elbow_weight=smooth(((q-E).dot(elbow_axis)+.035)/.07)
    wrist_weight=smooth(((q-W).dot((W-E).normalized())+.025)/.05)
    upper=bone_map(q,S,E,TS,TE);lower=bone_map(q,E,W,TE,TW)
    hand=closed_hand(q)
    moved=upper.lerp(lower,elbow_weight).lerp(hand,wrist_weight)
    result=q.lerp(moved,shoulder_weight)
    result.x*=1 if original.x>=0 else -1
    return result

def make_body(ivory,ultra,praying=False):
    mapping={old:new for new,old in enumerate(ids)}
    body=mesh('Sampeah mannequin' if praying else 'Fitting form',[(sampeah if praying else pose)(verts[i]) for i in ids],[[mapping[i] for i in f] for f in groups['body']],ivory)
    active(body)
    sub=body.modifiers.new('Human silhouette','SUBSURF');sub.levels=1;bpy.ops.object.modifier_apply(modifier=sub.name)
    dec=body.modifiers.new('Mobile budget','DECIMATE');dec.ratio=.26 if ultra else .075;bpy.ops.object.modifier_apply(modifier=dec.name)
    return body

def mat(name, rgb, rough=.5, metal=0):
    m = bpy.data.materials.new(name); m.diffuse_color=(*rgb,1); m.use_nodes=True
    p = m.node_tree.nodes.get('Principled BSDF')
    p.inputs['Base Color'].default_value=(*rgb,1)
    p.inputs['Roughness'].default_value=rough; p.inputs['Metallic'].default_value=metal
    return m

def mesh(name, vs, fs, material):
    m=bpy.data.meshes.new(name); m.from_pydata(vs,[],fs); m.update()
    o=bpy.data.objects.new(name,m); bpy.context.collection.objects.link(o); m.materials.append(material)
    for p in m.polygons:p.use_smooth=True
    return o

def active(o):
    bpy.ops.object.select_all(action='DESELECT'); o.select_set(True); bpy.context.view_layer.objects.active=o

def tube(name, points, radius, material, sides=6):
    c=bpy.data.curves.new(name,'CURVE');c.dimensions='3D'; c.bevel_depth=radius;c.bevel_resolution=1
    s=c.splines.new('POLY');s.points.add(len(points)-1)
    for p,co in zip(s.points,points):p.co=(*co,1)
    o=bpy.data.objects.new(name,c);bpy.context.collection.objects.link(o);c.materials.append(material)
    active(o);bpy.ops.object.convert(target='MESH');return bpy.context.object

def lerp_profile(profile,z):
    for a,b in zip(profile,profile[1:]):
        if a[0]<=z<=b[0]:
            t=smooth((z-a[0])/(b[0]-a[0]));return tuple(a[k]*(1-t)+b[k]*t for k in range(1,4))
    return profile[-1][1:]

def garment(name, profile, rings, segments, material, fold, fit=None):
    vs=[];fs=[]
    for j in range(rings+1):
        z=profile[0][0]+(profile[-1][0]-profile[0][0])*j/rings
        rx,ry,yc=lerp_profile(profile,z)
        for i in range(segments):
            t=i*2*math.pi/segments
            f=fold*(.65+.35*math.sin(z*3))*math.cos(18*t+z*.8)
            x,y=(rx+f)*math.sin(t),yc-(ry+f)*math.cos(t)
            if fit:
                front=math.cos(t)>=0
                hit,point,_,_=fit.ray_cast(Vector((x,-.7 if front else .7,z)),Vector((0,1 if front else -1,0)))
                if hit:y=min(y,point.y-.008) if front else max(y,point.y+.008)
            vs.append((x,y,z))
    for j in range(rings):
        for i in range(segments):
            a=j*segments+i;b=j*segments+(i+1)%segments
            fs.append((a,b,b+segments,a+segments))
    o=mesh(name,vs,fs,material)
    active(o);s=o.modifiers.new('Cloth hem thickness','SOLIDIFY');s.thickness=.002;bpy.ops.object.modifier_apply(modifier=s.name)
    return o

def catmull(points,t):
    q=t*(len(points)-1);i=min(int(q),len(points)-2);u=q-i
    p0=Vector(points[max(0,i-1)]);p1=Vector(points[i]);p2=Vector(points[i+1]);p3=Vector(points[min(len(points)-1,i+2)])
    return .5*((2*p1)+(-p0+p2)*u+(2*p0-5*p1+4*p2-p3)*u*u+(-p0+3*p1-3*p2+p3)*u*u*u)

def build(ultra):
    bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
    ivory=mat('mannequin-ivory',(.57,.53,.45),.57)
    cloth=mat('day-fabric',(.62,.19,.035),.54)
    gold=mat('antique-gold',(.45,.29,.095),.38,.65)
    body=make_body(ivory,ultra)
    for side in ['l','r']:
        eyeids={i for f in groups['joint-'+side+'-eye'] for i in f}
        pos=tuple(sum(verts[i][a] for i in eyeids)/len(eyeids) for a in range(3))
        bpy.ops.mesh.primitive_uv_sphere_add(segments=20 if ultra else 12,ring_count=10 if ultra else 6,radius=.0112,location=pose(pos))
        bpy.context.object.data.materials.append(ivory)
        for p in bpy.context.object.data.polygons:p.use_smooth=True
    n=96 if ultra else 48
    skirt=[(.12,.235,.145,-.025),(.42,.225,.148,-.025),(.78,.226,.159,-.025),(.94,.205,.159,-.025),(1.065,.158,.124,-.052)]
    garment('Wrapped sampot',skirt,46 if ultra else 20,n,cloth,.0045)
    bodice=[(1.04,.158,.124,-.05),(1.14,.146,.132,-.061),(1.24,.149,.136,-.054),(1.32,.166,.112,-.045)]
    bpy.context.view_layer.update()
    garment('Fitted under-wrap',bodice,22 if ultra else 12,n,cloth,.0015,body)
    # The visible overlap is a narrow draped panel, not a cone.
    vs=[];fs=[];rows=55 if ultra else 26;cols=24 if ultra else 12
    for j in range(rows+1):
        z=.13+.927*j/rows;rx,ry,yc=lerp_profile(skirt,z)
        for i in range(cols+1):
            u=i/cols;x=.028+(u-.5)*(.115+.025*(1-j/rows))
            y=yc-ry*math.sqrt(max(.1,1-(x/rx)**2))-.008-.005*math.cos(u*8*math.pi)
            vs.append((x,y,z))
    for j in range(rows):
        for i in range(cols):
            a=j*(cols+1)+i;fs.append((a,a+1,a+cols+2,a+cols+1))
    mesh('Sampot overlap folds',vs,fs,cloth)
    path=[(-.07,-.173,1.055),(-.035,-.194,1.2),(.105,-.163,1.34),(.174,-.113,1.412),(.174,-.008,1.435),(.17,.083,1.35),(.128,.083,1.15),(.09,.15,.78)]
    rows=75 if ultra else 36;cols=24 if ultra else 12;vs=[];fs=[];edges=[[],[]]
    for j in range(rows+1):
        t=j/rows;c=catmull(path,t);width=.17+.025*math.sin(t*math.pi*2)
        for i in range(cols+1):
            u=i/cols-.5;wave=.004*math.cos((u+.5)*10*math.pi)*math.sin(math.pi*(u+.5))
            x,y,z=c.x+u*width,c.y+wave*(1 if t>.55 else -1),c.z-.014*math.cos(u*math.pi)
            if t<.36 or t>.67:
                front=t<.36
                hit,point,_,_=body.ray_cast(Vector((x,-.7 if front else .7,z)),Vector((0,1 if front else -1,0)))
                if hit:y=min(y,point.y-.022) if front else max(y,point.y+.022)
            else:
                hit,point,_,_=body.ray_cast(Vector((x,y,2)),Vector((0,0,-1)))
                if hit and point.z>1.3:z=max(z,point.z+.018)
                # Fabric bends downward at the outside of the shoulder.
                z-=smooth((x-.225)/.05)*.035
            p=(x,y,z)
            vs.append(p)
            if i==0:edges[0].append(p)
            if i==cols:edges[1].append(p)
    for j in range(rows):
        for i in range(cols):
            a=j*(cols+1)+i;fs.append((a,a+1,a+cols+2,a+cols+1))
    drape=mesh('Sbai shoulder drape',vs,fs,cloth);active(drape)
    s=drape.modifiers.new('Cloth thickness','SOLIDIFY');s.thickness=.002;bpy.ops.object.modifier_apply(modifier=s.name)
    for e in edges:tube('Sbai woven edge',e,.0016,gold)
    for z in [.14,.153,1.055,1.069]:
        rx,ry,yc=lerp_profile(skirt,min(z,1.065))
        tube('Woven border',[( (rx+.002)*math.sin(i*2*math.pi/n),yc-(ry+.002)*math.cos(i*2*math.pi/n),z) for i in range(n+1)],.0017 if z<1 else .003,gold)
    # Original small diamond border, not a copied historical textile pattern.
    for i in range(40):
        t=i*2*math.pi/40;rx,ry,yc=lerp_profile(skirt,.18)
        points=[]
        for da,dz in [(0,.008),(.019,0),(0,-.008),(-.019,0),(0,.008)]:
            points.append(((rx+.003)*math.sin(t+da),yc-(ry+.003)*math.cos(t+da),.18+dz))
        tube('Hem diamond',points,.0012,gold)
    bpy.ops.mesh.primitive_uv_sphere_add(segments=24,ring_count=12,radius=1,location=(0,-.182,1.062))
    clasp=bpy.context.object;clasp.name='Belt clasp';clasp.scale=(.026,.008,.017);clasp.data.materials.append(gold)
    # Fit clothing before bending arms so ray fitting cannot hit the raised hands.
    bpy.data.objects.remove(body,do_unlink=True)
    make_body(ivory,ultra,True)
    # One draw call per material. Geometry and parts are identical across tiers.
    for material in [ivory,cloth,gold]:
        objs=[o for o in bpy.context.scene.objects if o.type=='MESH' and o.data.materials and o.data.materials[0]==material]
        bpy.ops.object.select_all(action='DESELECT')
        for o in objs:o.select_set(True)
        bpy.context.view_layer.objects.active=objs[0];bpy.ops.object.join();objs[0].name=material.name
    return [o for o in bpy.context.scene.objects if o.type=='MESH']

stats={}
for tier in ['normal','ultra']:
    objects=build(tier=='ultra')
    path=OUT/f'fashion-day-v2-{tier}.glb'
    bpy.ops.export_scene.gltf(filepath=str(path),export_format='GLB',export_animations=False,export_yup=True)
    tris=0
    for o in objects:o.data.calc_loop_triangles();tris+=len(o.data.loop_triangles)
    stats[tier]={'bytes':path.stat().st_size,'triangles':tris,'meshes':len(objects)}
(OUT/'fashion-day-v2.stats.json').write_text(json.dumps(stats,indent=2))
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=24
scene.render.resolution_x=750;scene.render.resolution_y=1000;scene.render.resolution_percentage=100
scene.world.color=(.3,.3,.3)
def aim(o,target):o.rotation_euler=(Vector(target)-o.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.mesh.primitive_plane_add(size=200);floor=bpy.context.object;floor.data.materials.append(mat('Studio floor',(.32,.3,.27),.9))
bpy.ops.object.camera_add(location=(.6,-3.8,1.35));scene.camera=bpy.context.object;scene.camera.data.type='ORTHO';scene.camera.data.ortho_scale=2.05;aim(scene.camera,(0,-.02,.89))
for pos,energy,size in [((-2,-3,4),350,3),((2,-1,2),150,2),((1,2,3),350,2)]:
    bpy.ops.object.light_add(type='AREA',location=pos);l=bpy.context.object;l.data.energy=energy;l.data.shape='DISK';l.data.size=size;aim(l,(0,0,1))
scene.view_settings.view_transform='AgX';scene.render.filepath=str(REVIEW/'fashion-day-v2-front.png')
bpy.ops.wm.save_as_mainfile(filepath=str(REVIEW/'fashion-day-v2.blend'))
bpy.ops.render.render(write_still=True)
scene.camera.location=(3.8,-.6,1.25);aim(scene.camera,(0,0,.89))
scene.render.filepath=str(REVIEW/'fashion-day-v2-side.png');bpy.ops.render.render(write_still=True)
print(json.dumps(stats))
