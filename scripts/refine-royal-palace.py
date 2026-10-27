"""Photo-guided illustrative EXTERIOR, not a survey or complete palace inventory.
Blender --background --python scripts/refine-royal-palace.py -- --normal/--ultra
Writes a new version only; original heritage-blender-v1 assets are untouched.
Viewer coordinates: Y up, +Z towards the river-facing frontage (schematic).
"""
import bpy, math, random, json, sys, hashlib
from pathlib import Path
from mathutils import Vector

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'output/royal-palace-review-v2'
PUBLIC=ROOT/'public/models/local/royal-palace-refined-v2'
for folder in (OUT,PUBLIC): folder.mkdir(parents=True,exist_ok=True)
ULTRA='--normal' not in sys.argv
TIER='ultra' if ULTRA else 'normal'
original=ROOT/f'public/models/local/heritage-blender-v1/royal-palace-{TIER}.glb'
original_hash=hashlib.sha256(original.read_bytes()).hexdigest()
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.context.preferences.filepaths.save_version=0
BATCH={}
def xyz(p): return (p[0],-p[2],p[1])
def mat(name,color,metal=0):
    m=bpy.data.materials.new(name); m.diffuse_color=(*color,1); m.use_nodes=True
    p=m.node_tree.nodes.get('Principled BSDF'); p.inputs['Base Color'].default_value=(*color,1)
    p.inputs['Roughness'].default_value=.68; p.inputs['Metallic'].default_value=metal
    return m
CREAM=mat('Warm ivory plaster',(.82,.72,.50))
WHITE=mat('Lime white mouldings',(.88,.85,.72))
GOLD=mat('Gilded ochre ornament',(.72,.43,.075),.28)
ROOF=mat('Orange glazed tile',(.56,.19,.045))
TILE=mat('Sunlit tile ribs',(.69,.29,.065))
GREEN=mat('Green roof borders',(.055,.19,.10))
RED=mat('Dark red timber shutters',(.18,.025,.018))
MARBLE=mat('Warm grey marble',(.53,.48,.43))
PAVE=mat('Courtyard paving',(.58,.51,.39))
GRASS=mat('Formal lawns',(.13,.24,.045))
HEDGE=mat('Clipped hedges',(.045,.13,.026))
BARK=mat('Tree trunks',(.22,.15,.075))
LEAF=[mat('Canopy '+str(i),(.045+i*.025,.16+i*.035,.028+i*.013)) for i in range(3)]

def add(m,v,f):
    vv,ff=BATCH.setdefault(m.name,([],[])); offset=len(vv)
    vv.extend(xyz(p) for p in v); ff.extend(tuple(offset+i for i in face) for face in f)
def box(p,s,m):
    add(m,[(p[0]+a*s[0]/2,p[1]+b*s[1]/2,p[2]+c*s[2]/2) for a,b,c in [(-1,-1,-1),(1,-1,-1),(1,-1,1),(-1,-1,1),(-1,1,-1),(1,1,-1),(1,1,1),(-1,1,1)]],[(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)])
def tube(pts,r,m,n=None):
    n=n or (8 if ULTRA else 5); v=[]; rr=[r]*len(pts) if isinstance(r,(float,int)) else r
    for i,(p,rad) in enumerate(zip(pts,rr)):
        d=Vector(pts[min(i+1,len(pts)-1)])-Vector(pts[max(0,i-1)])
        q=d.to_track_quat('Z','Y')
        v.extend(tuple(Vector(p)+q@Vector((rad*math.cos(j*math.tau/n),rad*math.sin(j*math.tau/n),0))) for j in range(n))
    f=[tuple(range(n-1,-1,-1)),tuple(range((len(pts)-1)*n,len(pts)*n))]
    for i in range(len(pts)-1):
        for j in range(n):
            a=i*n+j; b=i*n+(j+1)%n; f.append((a,b,b+n,a+n))
    add(m,v,f)
def lathe(x,z,profile,m):
    n=32 if ULTRA else 16; v=[(x+r*math.cos(j*math.tau/n),y,z+r*math.sin(j*math.tau/n)) for y,r in profile for j in range(n)]
    f=[]
    for i in range(len(profile)-1):
        for j in range(n): f.append((i*n+j,i*n+(j+1)%n,(i+1)*n+(j+1)%n,(i+1)*n+j))
    f.extend([tuple(range(n-1,-1,-1)),tuple(range((len(profile)-1)*n,len(profile)*n))]); add(m,v,f)
bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2 if ULTRA else 1)
proto=bpy.context.object; SV=[tuple(v.co) for v in proto.data.vertices]; SF=[tuple(p.vertices) for p in proto.data.polygons]
bpy.data.objects.remove(proto,do_unlink=True)
def ell(p,s,m): add(m,[(p[0]+v[0]*s[0],p[1]+v[1]*s[1],p[2]+v[2]*s[2]) for v in SV],SF)
def slab(v,m):
    add(m,v+[(x,y-.055,z) for x,y,z in v],[(0,1,2,3),(7,6,5,4),(0,4,5,1),(1,5,6,2),(2,6,7,3),(3,7,4,0)])

def roof(x,z,w,d,y,h,turn=False):
    # Layered gable roofs with green tile-panel frames, gold fascia and hooked ends.
    def p(a,b,c): return (x+c,b,z+a) if turn else (x+a,b,z+c)
    for side in [-1,1]:
        slab([p(side*w/2,y,-d/2),p(0,y+h,-d/2),p(0,y+h,d/2),p(side*w/2,y,d/2)],ROOF)
        # Thick green border strips, lifted from orange roof to avoid z-fighting.
        for end in [-1,1]:
            slab([p(side*w/2,y+.035,end*d/2),p(0,y+h+.035,end*d/2),p(0,y+h+.035,end*(d/2-.14)),p(side*w/2,y+.035,end*(d/2-.14))],GREEN)
            tube([p(side*w/2,y+.09,end*d/2),p(side*w*.25,y+h*.5+.09,end*d/2),p(0,y+h+.09,end*d/2)],.045,GOLD)
            tube([p(side*w/2,y+.08,end*d/2),p(side*(w/2+.14),y+.23,end*(d/2+.10)),p(side*(w/2+.15),y+.52,end*(d/2+.15))],[.055,.04,.008],GOLD)
        count=max(6,int(d/(.13 if ULTRA else .28)))
        for i in range(1,count):
            zz=-d/2+d*i/count
            tube([p(side*(w/2-.03),y+.035,zz),p(side*.02,y+h+.035,zz)],.018 if ULTRA else .024,TILE,4)
        tube([p(side*w/2,y+.04,-d/2),p(side*w/2,y+.04,d/2)],.07,GREEN)
    tube([p(0,y+h+.04,-d/2),p(0,y+h+.04,d/2)],.07,GOLD)
    for end in [-1,1]:
        # Closed gold tympanum inset behind its border, abstract floral medallion.
        zz=end*(d/2-.08)
        v=[p(-w*.43,y+.03,zz),p(w*.43,y+.03,zz),p(0,y+h-.09,zz)]
        add(GOLD,v+[p(a,b,c+end*.04) for a,b,c in [(-w*.43,y+.03,zz),(w*.43,y+.03,zz),(0,y+h-.09,zz)]],[(0,1,2),(5,4,3),(0,3,4,1),(1,4,5,2),(2,5,3,0)])
        for j in range(-2,3):
            a=j*w*.11
            tube([p(a,y+.15,end*(d/2+.015)),p(a*.55,y+h*.54,end*(d/2+.02)),p(0,y+h*.74,end*(d/2+.025))],.025,CREAM)
        tube([p(0,y+h,end*d/2),p(0,y+h+.28,end*(d/2+.10)),p(0,y+h+.58,end*(d/2+.03))],[.065,.035,.005],GOLD)

def spire(x,z,y,h,faces=False):
    for i in range(6):
        yy=y+i*h*.075; r=.78*(1-i*.115)
        # Square tiered tower (not a generic cone).
        box((x,yy+.06,z),(r*1.8,.12,r*1.8),GOLD)
        lathe(x,z,[(yy+.12,r*.95),(yy+h*.074,r*.69)],GOLD)
    yy=y+h*.45
    if faces:
        box((x,yy+.27,z),(.49,.54,.49),CREAM)
        for a in range(4):
            dx,dz=math.sin(a*math.pi/2),math.cos(a*math.pi/2)
            ell((x+dx*.26,yy+.30,z+dz*.26),(.11,.17,.11),CREAM)
        yy+=.5
    lathe(x,z,[(yy,.31),(yy+.15,.38),(yy+h*.12,.23),(yy+h*.21,.20),(y+h,.012)],GOLD)

def hall(x,z,w,d,kind):
    base=.65; coltop=3.05 if kind=='throne' else 2.65
    for yy,sx,sz,hh in [(.15,w+.9,d+.9,.3),(.40,w+.65,d+.65,.20),(.58,w+.8,d+.8,.16)]: box((x,yy,z),(sx,hh,sz),WHITE if kind=='silver' else CREAM)
    # Broad staircase on the river-facing end, real stepped geometry.
    for i in range(7): box((x,(i+1)*base/14,z+d/2+1.05-i*.13),(w*.52,(i+1)*base/7,.15),MARBLE)
    for side in [-1,1]:
        tube([(x+side*w*.29,.22,z+d/2+1.1),(x+side*w*.29,.92,z+d/2+.2)],[.09,.09],WHITE)
    if kind!='moonlight':
        box((x,(base+coltop)/2,z),(w*.68,coltop-base,d*.83),CREAM)
        # Timber shutters sit proud of walls, not coplanar decals.
        for side in [-1,1]:
            for j in range(6):
                zz=z-d*.34+j*d*.136
                box((x+side*(w*.34+.024),1.67,zz),(.045,1.05,.42),RED)
                for dy in [-.57,.57]: box((x+side*(w*.34+.05),1.67+dy,zz),(.065,.065,.53),GOLD)
        for xx in [-w*.22,0,w*.22]:
            box((x+xx,1.55,z+d*.42),(.44,1.65,.045),RED)
            for s in [-1,1]: box((x+xx+s*.25,1.55,z+d*.43),(.07,1.76,.065),GOLD)
    for xx in [-w*.46,w*.46]:
        for j in range(9):
            zz=z-d*.45+j*d*.9/8
            box((x+xx,.77,zz),(.25,.24,.25),WHITE)
            tube([(x+xx,.89,zz),(x+xx,coltop-.13,zz)],.085,MARBLE if kind=='silver' else CREAM,12 if ULTRA else 8)
            box((x+xx,coltop-.07,zz),(.27,.16,.27),GOLD)
    for zz in [-d*.45,d*.45]:
        for j in range(1,6):
            xx=-w*.46+j*w*.92/6
            tube([(x+xx,base, z+zz),(x+xx,coltop-.12,z+zz)],.085,MARBLE if kind=='silver' else CREAM)
            box((x+xx,coltop-.07,z+zz),(.25,.16,.25),GOLD)
    for i in range(3): roof(x,z-i*.16,w+1-i*.58,d+1-i*.63,coltop+i*.48,.92+i*.05)
    if kind=='throne':
        roof(x,z-1,w+1,3,coltop+.9,1.25,True)
        spire(x,z-1,coltop+2.2,4.8,True)
        spire(x,z-d*.36,coltop+1.9,2.05)
    if kind=='moonlight': spire(x,z,coltop+1.95,2.9)
    if kind=='silver':
        for side in [-1,1]:
            for j in range(35):
                zz=z-d/2+j*d/34
                tube([(x+side*(w/2+.48),.10,zz),(x+side*(w/2+.48),.64,zz)],.016,GREEN,4)
            tube([(x+side*(w/2+.48),.62,z-d/2),(x+side*(w/2+.48),.62,z+d/2)],.025,GREEN)

# Compact exterior composition; dimensions and spacing are NOT geographic data.
box((0,-.12,0),(27,.24,28),PAVE)
hall(-4,-4,4.6,7.8,'throne')
hall(-5,9,5.9,2.1,'moonlight')
hall(7,-1,3.8,7.1,'silver')
for x in [-8.4,2.3]:
    for z in [2.5,5.4]:
        box((x,.025,z),(3,.05,2.25),GRASS)
        for s in [-1,1]:
            box((x+s*1.47,.19,z),(.14,.30,2.25),HEDGE)
            box((x,.19,z+s*1.08),(2.95,.30,.14),HEDGE)
        ell((x,.48,z),(.50,.45,.50),HEDGE)
# Perimeter wall with open entrance at x=0 and open internal connection.
for x,w in [(-7.65,11.7),(7.6,11.6)]:
    box((x,.54,11.3),(w,1.08,.23),CREAM)
    box((x,1.10,11.3),(w,.12,.31),WHITE)
for x in [-13,13]:
    box((x,.5,-1.2),(.23,1,25),CREAM)
    box((x,1.06,-1.2),(.31,.12,25),WHITE)
box((0,.5,-13.5),(26,1,.23),CREAM)
for x in [-1.8,1.8]:
    box((x,.88,11.3),(.5,1.76,.5),WHITE)
    lathe(x,11.3,[(1.76,.32),(1.93,.23),(2.22,.01)],GOLD)
# Small ancillary roofed buildings, deliberately unnamed approximations.
for x,z in [(-10,-7),(1,-9)]:
    box((x,.85,z),(2.4,1.7,3.2),CREAM); roof(x,z,2.9,3.7,1.8,.95)
# Pale courtyard stupas, visibly secondary to the pagoda.
for x,z in [(10,5),(10,-7)]:
    box((x,.18,z),(1.3,.36,1.3),WHITE)
    lathe(x,z,[(.36,.58),(.55,.46),(.75,.52),(1.15,.32),(1.45,.23),(1.55,.31),(2.5,.015)],WHITE)
trees=[]; rng=random.Random(1866)
for x,z in [(-11.4,-11),(-7.7,-11.7),(-3,-11.9),(3.5,-11.8),(8,-11.5),(11.4,-10.8),(-11.8,-3),(-11.8,1),(-11.8,5),(11.7,-3),(11.8,1),(11.7,8)]:
    h=rng.uniform(3.2,4.5); trees.append([x,z,h])
    tube([(x,0,z),(x,h*.68,z)],[.16,.08],BARK)
    for j in range(5):
        a=j*math.tau/5; ell((x+math.cos(a)*.65,h*.8,z+math.sin(a)*.65),(1,.90,1),LEAF[j%3])
    ell((x,h,z),(1,.7,1),LEAF[1])

for name,(vv,ff) in BATCH.items():
    assert all(math.isfinite(c) for v in vv for c in v)
    mesh=bpy.data.meshes.new(name); mesh.from_pydata(vv,[],ff); mesh.update()
    o=bpy.data.objects.new(name,mesh); bpy.context.collection.objects.link(o); mesh.materials.append(bpy.data.materials[name])
    bpy.context.view_layer.objects.active=o; o.select_set(True)
    bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT'); bpy.ops.mesh.normals_make_consistent(inside=False); bpy.ops.object.mode_set(mode='OBJECT'); o.select_set(False)
sc=bpy.context.scene
sc['provenance']='Photo-guided schematic exterior; not surveyed. No reference-photo textures. Private interiors not reconstructed.'
sc['tier']=TIER
sc.world=bpy.data.worlds.new('Daylight'); sc.world.use_nodes=True
sc.world.node_tree.nodes['Background'].inputs[0].default_value=(.64,.75,.88,1)
sc.world.node_tree.nodes['Background'].inputs[1].default_value=.55
bpy.ops.object.light_add(type='SUN'); bpy.context.object.rotation_euler=(.48,-.5,-.4); bpy.context.object.data.energy=2.6; bpy.context.object.data.angle=.12
sc.render.engine='CYCLES'; sc.cycles.samples=20; sc.cycles.use_denoising=True
sc.render.resolution_x=1440; sc.render.resolution_y=1080; sc.render.resolution_percentage=100; sc.view_settings.view_transform='AgX'
views=[('overview',(25,25,34),(0,2,0),42),('throne',(-.7,5,10),(-4,4.5,-4),28),('frontage',(-2,5,24),(-5,3.6,9),32),('silver',(3.7,4.4,10),(7,2.7,-1),32)]
for name,pos,target,lens in views:
    bpy.ops.object.camera_add(location=xyz(pos)); cam=bpy.context.object; cam.name='Review '+name
    cam.rotation_euler=(Vector(xyz(target))-cam.location).to_track_quat('-Z','Y').to_euler(); cam.data.lens=lens; cam.data.clip_end=200
    sc.camera=cam
    if ULTRA or name=='overview':
        sc.render.filepath=str(OUT/f'{TIER}-{name}.png'); bpy.ops.render.render(write_still=True)
sc.camera=bpy.data.objects['Review overview']
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/f'royal-palace-{TIER}.blend'))
bpy.ops.object.select_all(action='DESELECT')
meshes=[o for o in sc.objects if o.type=='MESH']
for o in meshes: o.select_set(True)
bpy.context.view_layer.objects.active=meshes[0]
dest=PUBLIC/f'royal-palace-{TIER}.glb'
bpy.ops.export_scene.gltf(filepath=str(dest),export_format='GLB',use_selection=True,export_cameras=False,export_lights=False,export_animations=False,export_yup=True,export_meshopt_compression_enable=True,export_meshopt_extension='EXT_meshopt_compression')
tri=sum(len(p.vertices)-2 for o in meshes for p in o.data.polygons)
report={'tier':TIER,'triangles':tri,'drawCalls':len(meshes),'bytes':dest.stat().st_size,'trees':trees,'surveyed':False,'photographsEmbedded':False,'originalSha256':original_hash,'sha256':hashlib.sha256(dest.read_bytes()).hexdigest(),'landmarks':{'throne':[-4,-4],'moonlight':[-5,9],'silver':[7,-1]}}
assert hashlib.sha256(original.read_bytes()).hexdigest()==original_hash
assert tri < (180000 if ULTRA else 80000)
(OUT/f'{TIER}-report.json').write_text(json.dumps(report,indent=2))
print('ROYAL_PALACE_COMPLETE',json.dumps(report),flush=True)
