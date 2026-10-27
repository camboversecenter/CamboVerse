"""Reference-led Phnom Kulen landscape study, not a survey or visitor-route map.
Blender -b -t 8 --python scripts/refine-phnom-kulen.py -- --normal/--ultra
Original geometry; reference photos are not embedded. See adjacent asset README.
"""
import ast, bpy, math, random, json, sys, hashlib
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[1]
WATERFALL_ONLY='--waterfall-only' in sys.argv
OUT=ROOT/('output/phnom-kulen-waterfall-v3' if WATERFALL_ONLY else 'output/phnom-kulen-review-v2')
PUBLIC=ROOT/('public/models/local/phnom-kulen-waterfall-v3' if WATERFALL_ONLY else 'public/models/local/phnom-kulen-refined-v2')
for folder in (OUT,PUBLIC): folder.mkdir(parents=True,exist_ok=True)
ULTRA='--normal' not in sys.argv; TIER='ultra' if ULTRA else 'normal'
source=ROOT/f'public/models/local/heritage-blender-v1/phnom-kulen-{TIER}.glb'
original_hash=hashlib.sha256(source.read_bytes()).hexdigest()
bpy.ops.wm.read_factory_settings(use_empty=True); bpy.context.preferences.filepaths.save_version=0
BATCH={}
def helpers(path,names):
    nodes=[n for n in ast.parse(path.read_text(encoding='utf-8')).body if isinstance(n,ast.FunctionDef) and n.name in names]
    assert {n.name for n in nodes}==names
    exec(compile(ast.Module(body=nodes,type_ignores=[]),str(path),'exec'),globals())
helpers(ROOT/'scripts/refine-oudong.py',{'xyz','mat','add','box','tube','lathe','ell'})
bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2 if ULTRA else 1)
proto=bpy.context.object; SV=[tuple(v.co) for v in proto.data.vertices]; SF=[tuple(p.vertices) for p in proto.data.polygons]; bpy.data.objects.remove(proto,do_unlink=True)
EARTH=mat('Green forest terrain',(.14,.22,.075)); PATH=mat('Dry bank path',(.36,.29,.18))
STONE=[mat('Layered sandstone '+str(i),c) for i,c in enumerate([(.20,.22,.17),(.27,.27,.21),(.32,.31,.23)])]
BED=mat('Carved riverbed sandstone',(.34,.31,.21)); WOOD=mat('Forest stair timber',(.25,.15,.075))
BARK=mat('Forest trunks',(.18,.15,.09)); LEAF=[mat('Forest canopy '+str(i),(.027+i*.019,.12+i*.036,.022+i*.013)) for i in range(3)]
WATER=mat('River and pool',(.075,.18,.155)); FALL=mat('Falling water',(.48,.66,.64)); FOAM=mat('White water',(.79,.86,.80))
for m in [WATER,FALL,FOAM]: m.node_tree.nodes.get('Principled BSDF').inputs['Roughness'].default_value=.38

def smooth(t):
    t=max(0,min(1,t)); return t*t*(3-2*t)
def lip(x): return -2.6+.26*math.sin(x*.85)+.12*math.sin(x*2.3)
def ground(x,z):
    # A broad, vegetated plateau rather than a pointed bare-rock mountain.
    high=7.5*smooth((-z+3)/8)
    if abs(x)<8:
        high=7.5 if z<lip(x)-.35 else -.18
        if z>8: high=.3
        if z<lip(x)-.35 and abs(x)<2.8: high=7.05
    else: high=max(.3,high)
    high+=.10*math.sin(x*.6)*math.sin(z*.55) if abs(x)>12 else 0
    # Supported stairs and path; all terrain stays below their top surfaces.
    if 9.35<x<11.65 and -9.6<z<10.5: high=min(high,max(.16,min(7.32,.3+(10-z)*.4-.12)))
    if z>9 and abs(x)<12: high=.22
    return high
nx,nz=(144,152) if ULTRA else (72,76)
vv=[(-18+i*36/nx,ground(-18+i*36/nx,-21+j*38/nz),-21+j*38/nz) for i in range(nx+1) for j in range(nz+1)]
ff=[]
for i in range(nx):
    for j in range(nz):
        a=i*(nz+1)+j; ff.append((a,a+1,a+nz+2,a+nz+1))
add(EARTH,vv,ff)

# Continuous, uneven sandstone scarp. Layered ledges are relief, not masonry blocks.
for band in range(9):
    bottom=band*.82; top=bottom+.86; points=[]; n=70 if ULTRA else 35
    for yy in [bottom,top]:
        for i in range(n+1):
            x=-8.2+i*16.4/n; front=lip(x)+.20*math.sin(x*1.8+band*.8)+(.16 if band%3==0 else 0)
            points.append((x,yy,front))
    faces=[(i,i+1,i+n+2,i+n+1) for i in range(n)]
    add(STONE[band%3],points,faces)
    # Ledge caps project from the cliff, separated vertically from other surfaces.
    add(STONE[(band+1)%3],[(x,top,z) for x,y,z in points[:n+1]]+[(x,top,z-.5) for x,y,z in points[:n+1]],faces)

# Pool outline and stream surface: opaque materials avoid transparent-surface sorting.
def pool():
    n=100 if ULTRA else 50
    points=[(0,.12,2.5)]+[(7.6*math.cos(a)*(1+.035*math.sin(a*7)),.12,2.5+5.6*math.sin(a)) for a in [j*math.tau/n for j in range(n)]]
    add(WATER,points,[(0,j+1,(j+1)%n+1) for j in range(n)])
pool()
# Stream widens at the brink; the carved-bed window is a low-water interpretive view.
box((0,7.10,-12.0),(5.35,.08,16.4),BED)
for a,b in ([(-20.2,-3.8)] if WATERFALL_ONLY else [(-20.2,-13.3),(-7.5,-3.8)]): box((0,7.17,(a+b)/2),(5.2,.025,b-a),WATER)
for x in ([] if WATERFALL_ONLY else [-2.25,2.25]): box((x,7.17,-10.4),(.7,.025,5.8),WATER)
lingas=[]
for j in range(0 if WATERFALL_ONLY else 8):
    for i in range(7):
        x=(i-3)*.52; z=-12.8+j*.69; lingas.append([x,z])
        lathe(x,z,[(7.14,.19),(7.19,.19),(7.25,.145),(7.27,.075)],BED,n=14 if ULTRA else 8)
# Small shallow current highlights, without putting a transparent sheet over the carvings.
for j in range(11):
    x=math.sin(j*2.4)*2; z=-19+j*.45
    tube([(x,7.195,z),(x+.25,7.195,z+.65),(x+.15,7.195,z+.9)],.012,FOAM,n=4)
# A connected fan of water over the lip, then broken falls with dark gaps.
add(WATER,[(-2.6,7.19,-3.8),(2.6,7.19,-3.8),(6.9,7.20,lip(6.9)+.15),(-6.9,7.20,lip(-6.9)+.15)],[(0,1,2,3)])
curtains=[]
for k,(x,width) in enumerate([(-6.3,.95),(-5.1,.75),(-4.15,1.0),(-2.8,1.45),(-1.45,.65),(-.4,1.0),(1.1,1.55),(2.75,.9),(4.0,1.3),(5.6,1.5),(6.7,.55)]):
    curtains.append([x,width]); ny=48 if ULTRA else 24; nw=8 if ULTRA else 4; points=[]
    for j in range(ny+1):
        t=j/ny; y=7.2*(1-t)+.16; zz=lip(x)+.28+.60*t*t
        for i in range(nw+1):
            side=i/nw-.5; xx=x+side*width*(1+.12*math.sin(t*19+k))+.035*math.sin(t*14+k)
            points.append((xx,y,zz+.055*math.sin(t*43+k+i*2)))
    add(FALL,points,[(j*(nw+1)+i,j*(nw+1)+i+1,(j+1)*(nw+1)+i+1,(j+1)*(nw+1)+i) for j in range(ny) for i in range(nw)])
    # Broken white highlights rather than cylindrical ropes of water.
    rng=random.Random(1700+k)
    for j in range(32):
        t=rng.uniform(.03,.95); xx=x+rng.uniform(-.4,.4)*width; yy=7.2*(1-t)+.16
        zz=lip(x)+.39+.60*t*t; w=rng.uniform(.018,.065); length=rng.uniform(.12,.55)
        add(FOAM,[(xx-w,yy,zz),(xx+w,yy,zz),(xx+w*.2,yy-length,zz+.03),(xx-w*.3,yy-length,zz+.03)],[(0,1,2,3)])
    for j in range(5): ell((x+(j-2)*width/5,.18,lip(x)+1.1+.1*math.sin(j*2)),(width*.28,.04,.32),FOAM)
# Discontinuous surface ripples suggest the current without extra transparent layers.
for j in range(16):
    z=-.2+j*.44; x=math.sin(j*2.1)*4
    tube([(x-.55,.14,z),(x,.15,z+.04),(x+.55,.14,z)],.009,FOAM,n=3)

rng=random.Random(903); rocks=[]
for i in range(48):
    x=rng.uniform(-9,9); z=rng.uniform(-1.8,8)
    if abs(x)<5.8 and z>0: continue
    if x>8.5: continue
    h=rng.uniform(.35,1.1); rocks.append([x,z,h])
    ell((x,h*.32,z),(h*1.4,h*.65,h),STONE[i%3])
# Dry bank path from default walk spawn (0,9.5) to the forest stair.
box((5.25,.26,10.75),(12.4,.08,2.4),PATH)
stairs={'x':10.5,'startZ':10,'endZ':-8,'startY':.3,'endY':7.5,'count':48,'width':1.8}
for i in range(48):
    z=10-(i+.5)*18/48; top=.3+(i+1)*7.2/48
    box((10.5,top-.12,z),(1.8,.24,18/48),WOOD)
    if i%4==0:
        for s in [-1,1]: box((10.5+s*.97,top+.42,z),(.09,1.36,.09),WOOD)
for s in [-1,1]:
    tube([(10.5+s*.97,1.25,10),(10.5+s*.97,8.45,-8)],.055,WOOD,n=6)
box((10.5,7.38,-8.75),(1.8,.24,1.5),WOOD)
# Landing joins a broad upper bank; keep the riverbed off the walking route.
box((6.7,7.50,-9),(5.8,.12,2),PATH)
box((4.5,7.50,-11.25),(1.8,.12,2.5),PATH)

trees=[]; rng=random.Random(4401)
for _ in range(8000):
    x=rng.uniform(-17,17); z=rng.uniform(-20,14)
    if abs(x)<9 and z>-4: continue
    if abs(x)<3.8: continue
    if 3<x<12 and -14<z<12: continue
    if any((x-a)**2+(z-b)**2<2.15**2 for a,b,h in trees): continue
    trees.append([x,z,rng.uniform(5.5,8.5)])
    if len(trees)==66: break
for i,(x,z,h) in enumerate(trees):
    base=ground(x,z)
    tube([(x,base,z),(x+.2,base+h*.60,z),(x-.12,base+h,z-.2)],[.27,.18,.055],BARK)
    for j in range(4):
        a=j*math.tau/4+i; dx=math.sin(a); dz=math.cos(a)
        tube([(x,base+h*.5,z),(x+dx*1.3,base+h*.82,z+dz*1.3)],[.13,.025],BARK)
        ell((x+dx*1.25,base+h*.87,z+dz*1.25),(1.6,1.25,1.55),LEAF[(i+j)%3])
    ell((x,base+h+.25,z),(1.6,1.2,1.6),LEAF[i%3])
    for j in range(3):
        a=j*math.tau/3+i; xx=x+math.sin(a); zz=z+math.cos(a)
        tube([(x,base+.8,z),(xx,ground(xx,zz)+.04,zz)],[.15,.025],BARK)
# Clinging plants at the waterfall's sides; the center view stays open.
for side in [-1,1]:
    for j in range(10):
        x=side*(7.2+.20*math.sin(j)); y=.8+j*.65; z=lip(x)+.18
        ell((x,y,z),(.55,.50,.32),LEAF[j%3])
    for j in range(8):
        x=side*(8.4+j*.65); z=5+math.sin(j*2)*2; y=ground(x,z)
        ell((x,y+.3,z),(.65,.55,.60),LEAF[j%3])

for name,(verts,faces) in BATCH.items():
    mesh=bpy.data.meshes.new(name); mesh.from_pydata(verts,[],faces); mesh.update()
    o=bpy.data.objects.new(name,mesh); bpy.context.collection.objects.link(o); material=bpy.data.materials[name]; mesh.materials.append(material)
    bpy.context.view_layer.objects.active=o; o.select_set(True)
    bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT'); bpy.ops.mesh.normals_make_consistent(inside=False); bpy.ops.object.mode_set(mode='OBJECT'); o.select_set(False)
    if name in [BARK.name,FALL.name,EARTH.name]:
        for polygon in mesh.polygons: polygon.use_smooth=True
    if 'sandstone' in name.lower() or name in [EARTH.name,FALL.name]:
        col=mesh.color_attributes.new(name='Natural variation',type='BYTE_COLOR',domain='POINT')
        for i,v in enumerate(mesh.vertices):
            x,y,z=v.co; c=material.diffuse_color; q=.84+.15*math.sin(x*4+z*2)*math.sin(y*3-z)
            if name==FALL.name:
                q=.5+.5*math.sin(x*23+z*7)*math.sin(z*19+x*11)
                col.data[i].color=(.48+q*.34,.64+q*.24,.62+q*.23,1)
            else: col.data[i].color=(c[0]*q,c[1]*q,c[2]*q,1)
        vc=material.node_tree.nodes.new('ShaderNodeVertexColor'); vc.layer_name=col.name
        material.node_tree.links.new(vc.outputs['Color'],material.node_tree.nodes.get('Principled BSDF').inputs['Base Color'])
sc=bpy.context.scene; sc['provenance']='Illustrative Phnom Kulen waterfall and riverbed study. Distances compressed; not a survey or a visitor route. Original geometry, no photo textures.'
sc.world=bpy.data.worlds.new('Daylight'); sc.world.use_nodes=True
sc.world.node_tree.nodes['Background'].inputs[0].default_value=(.65,.75,.86,1); sc.world.node_tree.nodes['Background'].inputs[1].default_value=.65
bpy.ops.object.light_add(type='SUN'); bpy.context.object.rotation_euler=(.55,-.45,-.6); bpy.context.object.data.energy=2.3; bpy.context.object.data.angle=.15
sc.render.engine='CYCLES'; sc.cycles.samples=16; sc.cycles.use_denoising=True
sc.render.resolution_x=1280; sc.render.resolution_y=960; sc.render.resolution_percentage=100; sc.view_settings.view_transform='AgX'
views=[('overview',(27,26,33),(0,4,-2),32),('waterfall',(3,2,10.5),(0,3.6,-2.2),26),('riverbed',(4.5,9,-10.5),(0,7.18,-10.5),26),('forest-path',(10.5,3,7),(10.5,5,-2),26)]
for name,pos,target,lens in views:
    bpy.ops.object.camera_add(location=xyz(pos)); cam=bpy.context.object; cam.name='Review '+name
    cam.rotation_euler=(Vector(xyz(target))-cam.location).to_track_quat('-Z','Y').to_euler(); cam.data.lens=lens; cam.data.clip_end=200; sc.camera=cam
    if '--no-render' not in sys.argv and (ULTRA or name=='overview'):
        sc.render.filepath=str(OUT/f'{TIER}-{name}.png'); bpy.ops.render.render(write_still=True)
sc.camera=bpy.data.objects['Review overview']; bpy.ops.wm.save_as_mainfile(filepath=str(OUT/f'phnom-kulen-{TIER}.blend'))
bpy.ops.object.select_all(action='DESELECT'); meshes=[o for o in sc.objects if o.type=='MESH']
for o in meshes: o.select_set(True)
bpy.context.view_layer.objects.active=meshes[0]; dest=PUBLIC/f'phnom-kulen-{TIER}.glb'
bpy.ops.export_scene.gltf(filepath=str(dest),export_format='GLB',use_selection=True,export_cameras=False,export_lights=False,export_animations=False,export_yup=True,export_meshopt_compression_enable=True,export_meshopt_extension='EXT_meshopt_compression')
tri=sum(len(p.vertices)-2 for o in meshes for p in o.data.polygons)
report={'tier':TIER,'triangles':tri,'drawCalls':len(meshes),'bytes':dest.stat().st_size,'trees':trees,'lingas':lingas,'curtains':curtains,'rocks':rocks,'stairs':stairs,'originalSha256':original_hash,'sha256':hashlib.sha256(dest.read_bytes()).hexdigest(),'surveyed':False,'photographsEmbedded':False}
assert hashlib.sha256(source.read_bytes()).hexdigest()==original_hash
assert tri<(250000 if ULTRA else 80000)
(OUT/f'{TIER}-report.json').write_text(json.dumps(report,indent=2)); print('PHNOM_KULEN_COMPLETE',TIER,tri,dest.stat().st_size,flush=True)
