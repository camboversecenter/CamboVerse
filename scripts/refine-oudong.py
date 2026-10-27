"""Oudong reference-led exterior, approximate ridge/spacing, not a survey.
Blender --background --python scripts/refine-oudong.py -- --normal/--ultra
Original v1 assets are read for verification only. No reference-photo textures.
"""
import bpy, math, random, json, sys, hashlib
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'output/oudong-review-v2'; PUBLIC=ROOT/'public/models/local/oudong-refined-v2'
for folder in (OUT,PUBLIC): folder.mkdir(parents=True,exist_ok=True)
ULTRA='--normal' not in sys.argv; TIER='ultra' if ULTRA else 'normal'
source=ROOT/f'public/models/local/heritage-blender-v1/oudong-{TIER}.glb'
source_hash=hashlib.sha256(source.read_bytes()).hexdigest()
bpy.ops.wm.read_factory_settings(use_empty=True); bpy.context.preferences.filepaths.save_version=0
BATCH={}
def xyz(p): return (p[0],-p[2],p[1])
def mat(name,c):
    m=bpy.data.materials.new(name); m.diffuse_color=(*c,1); m.use_nodes=True
    p=m.node_tree.nodes.get('Principled BSDF'); p.inputs['Base Color'].default_value=(*c,1); p.inputs['Roughness'].default_value=.88
    return m
WHITE=mat('White relic stupa',(.79,.81,.75)); TRIM=mat('Pale carved mouldings',(.88,.85,.73))
OLD=mat('Weathered royal stucco',(.47,.40,.29)); PATINA=mat('Old recessed ornament',(.26,.27,.21))
PINK=mat('Warm old plaster',(.62,.46,.35)); GOLD=mat('Ochre doorway',(.53,.30,.065))
DARK=mat('Recesses and doors',(.09,.085,.055)); TILE=mat('Green ceramic accents',(.07,.25,.15))
STONE=mat('Terraces and stairs',(.58,.56,.46)); EARTH=mat('Green hill surface',(.13,.23,.052))
BARK=mat('Tree bark',(.18,.12,.055)); LEAF=[mat('Forest canopy '+str(i),(.035+i*.025,.13+i*.04,.025+i*.014)) for i in range(3)]
def add(m,v,f):
    vv,ff=BATCH.setdefault(m.name,([],[])); n=len(vv); vv.extend(xyz(p) for p in v); ff.extend(tuple(n+i for i in a) for a in f)
def box(p,s,m):
    add(m,[(p[0]+a*s[0]/2,p[1]+b*s[1]/2,p[2]+c*s[2]/2) for a,b,c in [(-1,-1,-1),(1,-1,-1),(1,-1,1),(-1,-1,1),(-1,1,-1),(1,1,-1),(1,1,1),(-1,1,1)]],[(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)])
def tube(pts,r,m,n=None):
    n=n or (8 if ULTRA else 5); vv=[]; rr=[r]*len(pts) if isinstance(r,(int,float)) else r
    for i,(p,rad) in enumerate(zip(pts,rr)):
        q=(Vector(pts[min(i+1,len(pts)-1)])-Vector(pts[max(0,i-1)])).to_track_quat('Z','Y')
        vv.extend(tuple(Vector(p)+q@Vector((rad*math.cos(j*math.tau/n),rad*math.sin(j*math.tau/n),0))) for j in range(n))
    ff=[tuple(range(n-1,-1,-1)),tuple(range((len(pts)-1)*n,len(pts)*n))]
    for i in range(len(pts)-1):
        for j in range(n):
            a=i*n+j; b=i*n+(j+1)%n; ff.append((a,b,b+n,a+n))
    add(m,vv,ff)
def lathe(x,z,profile,m,n=None):
    n=n or (48 if ULTRA else 24)
    vv=[(x+r*math.cos(j*math.tau/n),y,z+r*math.sin(j*math.tau/n)) for y,r in profile for j in range(n)]
    ff=[]
    for i in range(len(profile)-1):
        for j in range(n): ff.append((i*n+j,i*n+(j+1)%n,(i+1)*n+(j+1)%n,(i+1)*n+j))
    ff.extend([tuple(range(n-1,-1,-1)),tuple(range((len(profile)-1)*n,len(profile)*n))]); add(m,vv,ff)
bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2 if ULTRA else 1)
proto=bpy.context.object; SV=[tuple(v.co) for v in proto.data.vertices]; SF=[tuple(p.vertices) for p in proto.data.polygons]; bpy.data.objects.remove(proto,do_unlink=True)
def ell(p,s,m): add(m,[(p[0]+v[0]*s[0],p[1]+v[1]*s[1],p[2]+v[2]*s[2]) for v in SV],SF)
def ring(x,z,y,r,m):
    n=40 if ULTRA else 20; tube([(x+r*math.cos(j*math.tau/n),y,z+r*math.sin(j*math.tau/n)) for j in range(n+1)],.04,m,5)

def ground(x,z):
    q=max(abs(x)/5,abs((z+8)/11))
    t=max(0,min(1,(q-1)/1.2)); h=4*(1-t*t*(3-2*t))
    # Carve below the stair treads, not through them. Landing at default spawn.
    if abs(x)<2 and 1.9<z<12:
        h=min(h,max(0,min(4,(9-z)*4/7))-.10)
    return max(-.15,h)
nx,nz=(96,144) if ULTRA else (64,96)
vv=[(-14+i*28/nx,ground(-14+i*28/nx,-25+j*40/nz),-25+j*40/nz) for i in range(nx+1) for j in range(nz+1)]
ff=[]
for i in range(nx):
    for j in range(nz):
        a=i*(nz+1)+j; ff.append((a,a+1,a+nz+2,a+nz+1))
add(EARTH,vv,ff)
# Top path is supported by the hill; surface separated above terrain.
box((0,4.06,-8),(10.2,.12,20),STONE)
box((0,-.03,10.3),(3.8,.06,2.6),STONE)
for i in range(48):
    z=9-(i+.5)*7/48; y=(i+1)*4/48
    box((0,(y-.18)/2,z),(2.8,y+.18,7/48+.002),STONE)
for s in [-1,1]:
    tube([(s*1.55,.70,9),(s*1.55,2.70,5.5),(s*1.55,4.70,2)],[.11,.11,.11],TRIM)
    for i in range(25):
        z=9-i*7/24; y=(9-z)*4/7
        tube([(s*1.55,y,z),(s*1.55,y+.70,z)],[.045,.045],TRIM,5)
    # Stylized seven-headed naga fans, not copied sacred relief panels.
    box((s*1.8,.20,9.3),(.72,.4,.72),STONE)
    tube([(s*1.8,.4,9.3),(s*1.8,1.05,9.3),(s*1.8,1.55,9.15)],[.22,.17,.10],TRIM)
    for j in range(-3,4):
        dx=j*.14; yy=1.75-abs(j)*.12
        tube([(s*1.8,1,9.3),(s*1.8+dx,yy-.18,9.24),(s*1.8+dx,yy,9.32)],[.07,.10,.05],TRIM)

def niche(x,z,y,w,h,m):
    box((x,y+h*.4,z),(.70*w,.80*h,.035),DARK)
    tube([(x-w*.44,y,z+.04),(x-w*.44,y+h*.65,z+.04),(x-w*.26,y+h*.87,z+.04),(x,y+h,z+.04),(x+w*.26,y+h*.87,z+.04),(x+w*.44,y+h*.65,z+.04),(x+w*.44,y,z+.04)],.055,m)
    box((x,y,z+.08),(w,.10,.18),m)
def tier(x,z,y,w,h,m,trim):
    # A single cross-shaped footprint, not overlapping coplanar boxes.
    def band(yy,ww,hh,material):
        a,b,c=ww*.19,ww*.50,ww*.60
        outline=[(-b,-b),(-a,-b),(-a,-c),(a,-c),(a,-b),(b,-b),(b,-a),(c,-a),(c,a),(b,a),(b,b),(a,b),(a,c),(-a,c),(-a,b),(-b,b),(-b,a),(-c,a),(-c,-a),(-b,-a)]
        n=len(outline); v=[(x+xx,level,z+zz) for level in [yy,yy+hh] for xx,zz in outline]
        f=[tuple(range(n-1,-1,-1)),tuple(range(n,2*n))]
        f.extend((i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)); add(material,v,f)
    band(y+.10,w,h-.20,m)
    band(y,w+.18,.10,trim); band(y+h-.10,w+.18,.10,trim)
    count=max(4,int(w/(.23 if ULTRA else .4)))
    for j in range(count):
        xx=x-w*.46+j*w*.92/(count-1)
        ell((xx,y+h*.55,z+w*.51),(.045,.075,.028),trim)

def ornate(x,z,scale,kind):
    base=4.12; m=WHITE if kind=='white' else PINK if kind=='ceramic' else OLD
    trim=TRIM if kind=='white' else PATINA
    for i in range(6):
        y=base+i*.48*scale; w=(4.3-i*.43)*scale
        tier(x,z,y,w,.48*scale,m,trim)
        if i%2==0: niche(x,z+w*.61+.02,y+.08,.75*scale,.85*scale,trim)
        if kind=='ceramic':
            for j in range(11):
                xx=x-w*.43+j*w*.086
                ell((xx,y+.23*scale,z+w*.52),(.07*scale,.07*scale,.035),TILE)
                if ULTRA:
                    for side in [-1,1]: ell((xx+side*.055*scale,y+.23*scale,z+w*.53),(.035,.025,.025),TRIM)
    yy=base+2.88*scale
    if kind=='white':
        lathe(x,z,[(yy,1.05*scale),(yy+.25*scale,.85*scale),(yy+1.85*scale,.75*scale),(yy+2.05*scale,.84*scale)],m)
        for j in range(20):
            a=j*math.tau/20
            tube([(x+.86*scale*math.cos(a),yy+.3*scale,z+.86*scale*math.sin(a)),(x+.76*scale*math.cos(a),yy+1.85*scale,z+.76*scale*math.sin(a))],.035*scale,TRIM)
        yy+=2.05*scale
    else:
        lathe(x,z,[(yy,1.05*scale),(yy+2.3*scale,.48*scale)],m,n=8)
        for j in range(8):
            a=j*math.tau/8
            tube([(x+1.04*scale*math.cos(a),yy,z+1.04*scale*math.sin(a)),(x+.48*scale*math.cos(a),yy+2.3*scale,z+.48*scale*math.sin(a))],.045*scale,trim)
        yy+=2.3*scale
    if kind=='faces':
        box((x,yy+.32*scale,z),(.68*scale,.65*scale,.68*scale),OLD)
        for j in range(4):
            a=j*math.pi/2; dx,dz=math.sin(a),math.cos(a)
            ell((x+dx*.35*scale,yy+.32*scale,z+dz*.35*scale),(.18*scale,.25*scale,.18*scale),TRIM)
            ell((x+dx*.50*scale,yy+.30*scale,z+dz*.50*scale),(.065*scale,.09*scale,.065*scale),OLD)
        yy+=.65*scale
    for i in range(10):
        y=yy+i*.17*scale; r=(.72-i*.061)*scale
        lathe(x,z,[(y,r*.85),(y+.045*scale,r),(y+.17*scale,r*.70)],m)
    lathe(x,z,[(yy+1.7*scale,.12*scale),(yy+2.40*scale,.012)],trim)
    if kind=='white':
        niche(x,z+2.7*scale,base,1.2*scale,1.65*scale,TRIM)
        box((x,base+.67*scale,z+2.72*scale),(.65*scale,1.25*scale,.04),GOLD)

ornate(0,-2,1,'white')
ornate(-2.6,-10,.80,'ceramic')
ornate(2.7,-11,.78,'faces')
# Distinct older bell-shaped stupa at the far end of the ridge.
bx,bz=-1,-16; yy=4.12
for i in range(4):
    lathe(bx,bz,[(yy+i*.20,1.25-i*.13),(yy+(i+1)*.20,1.25-i*.13)],OLD)
lathe(bx,bz,[(yy+.8,.90),(yy+1.1,1.0),(yy+1.7,.80),(yy+2.25,.42),(yy+2.4,.40)],OLD)
for i in range(12):
    y=yy+2.4+i*.16; r=.50-i*.035
    lathe(bx,bz,[(y,r),(y+.16,r*.79)],OLD)
lathe(bx,bz,[(yy+4.32,.08),(yy+4.9,.008)],PATINA)
# Low summit balustrade leaves the entrance and longitudinal path open.
for side in [-1,1]:
    for z in range(-17,2):
        tube([(side*5,4.12,z),(side*5,4.63,z)],.045,TRIM)
    tube([(side*5,4.65,-18),(side*5,4.65,1.7)],.065,TRIM)

trees=[]; rng=random.Random(1618)
for _ in range(8000):
    x=rng.uniform(-12.5,12.5); z=rng.uniform(-23,13)
    if abs(x)<6 and -19<z<2.5: continue
    if abs(x)<3.3 and z>1: continue
    if any((x-a)**2+(z-b)**2<1.9**2 for a,b,h in trees): continue
    trees.append((x,z,rng.uniform(2.2,3.7)))
    if len(trees)==112: break
for i,(x,z,h) in enumerate(trees):
    y=ground(x,z)
    tube([(x,y,z),(x+.10,y+h*.72,z)],[.13,.055],BARK)
    for j in range(3):
        a=j*math.tau/3+i
        ell((x+math.cos(a)*.55,y+h*.78,z+math.sin(a)*.55),(.92,.72,.93),LEAF[(i+j)%3])
    ell((x,y+h,z),(.82,.64,.85),LEAF[i%3])

for name,(verts,faces) in BATCH.items():
    assert all(math.isfinite(c) for v in verts for c in v)
    mesh=bpy.data.meshes.new(name); mesh.from_pydata(verts,[],faces); mesh.update()
    o=bpy.data.objects.new(name,mesh); bpy.context.collection.objects.link(o); mesh.materials.append(bpy.data.materials[name])
    if name!=EARTH.name:
        bpy.context.view_layer.objects.active=o; o.select_set(True)
        bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT'); bpy.ops.mesh.normals_make_consistent(inside=False); bpy.ops.object.mode_set(mode='OBJECT'); o.select_set(False)
    else:
        # Open terrain has explicit upward winding; do not infer an inside/outside.
        assert all(p.normal.z>.1 for p in mesh.polygons)
sc=bpy.context.scene; sc['provenance']='Illustrative exterior. Approximate ridge/placement. No copied textures or surveyed dimensions.'
sc.world=bpy.data.worlds.new('Daylight'); sc.world.use_nodes=True
sc.world.node_tree.nodes['Background'].inputs[0].default_value=(.63,.74,.86,1); sc.world.node_tree.nodes['Background'].inputs[1].default_value=.55
bpy.ops.object.light_add(type='SUN'); bpy.context.object.rotation_euler=(.5,-.45,-.4); bpy.context.object.data.energy=2.4; bpy.context.object.data.angle=.15
sc.render.engine='CYCLES'; sc.cycles.samples=20; sc.cycles.use_denoising=True
sc.render.resolution_x=1440; sc.render.resolution_y=1080; sc.render.resolution_percentage=100; sc.view_settings.view_transform='AgX'
views=[('overview',(24,25,32),(0,3,-5),39),('approach',(0,3,15),(0,7,-2),29),('royal',(0,9,-5),(0,7.5,-12),20)]
for name,pos,target,lens in views:
    bpy.ops.object.camera_add(location=xyz(pos)); cam=bpy.context.object; cam.name='Review '+name
    cam.rotation_euler=(Vector(xyz(target))-cam.location).to_track_quat('-Z','Y').to_euler(); cam.data.lens=lens; cam.data.clip_end=200
    sc.camera=cam
    if ULTRA or name=='overview':
        sc.render.filepath=str(OUT/f'{TIER}-{name}.png'); bpy.ops.render.render(write_still=True)
sc.camera=bpy.data.objects['Review overview']; bpy.ops.wm.save_as_mainfile(filepath=str(OUT/f'oudong-{TIER}.blend'))
bpy.ops.object.select_all(action='DESELECT'); meshes=[o for o in sc.objects if o.type=='MESH']
for o in meshes: o.select_set(True)
bpy.context.view_layer.objects.active=meshes[0]; dest=PUBLIC/f'oudong-{TIER}.glb'
bpy.ops.export_scene.gltf(filepath=str(dest),export_format='GLB',use_selection=True,export_cameras=False,export_lights=False,export_animations=False,export_yup=True,export_meshopt_compression_enable=True,export_meshopt_extension='EXT_meshopt_compression')
tri=sum(len(p.vertices)-2 for o in meshes for p in o.data.polygons)
report={'tier':TIER,'triangles':tri,'drawCalls':len(meshes),'bytes':dest.stat().st_size,'trees':trees,'originalSha256':source_hash,'sha256':hashlib.sha256(dest.read_bytes()).hexdigest(),'surveyed':False,'photographsEmbedded':False,'landmarks':{'white':[0,-2],'ceramic':[-2.6,-10],'faces':[2.7,-11],'bell':[-1,-16]}}
assert hashlib.sha256(source.read_bytes()).hexdigest()==source_hash
assert tri<(300000 if ULTRA else 120000)
(OUT/f'{TIER}-report.json').write_text(json.dumps(report,indent=2)); print('OUDONG_COMPLETE',TIER,tri,dest.stat().st_size,flush=True)
