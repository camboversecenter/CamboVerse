"""Original reference-led Angkor Wat exterior; compact proportions, not a survey.
Blender --background --threads 10 --python scripts/refine-angkor-wat.py -- --normal/--ultra
Includes its landscape, replacing (not overlapping) the older procedural scenery.
"""
import ast, bpy, math, random, json, sys, hashlib
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'output/angkor-wat-review-v3'; PUBLIC=ROOT/'public/models/local/angkor-wat-refined-v3'
for folder in (OUT,PUBLIC): folder.mkdir(parents=True,exist_ok=True)
ULTRA='--normal' not in sys.argv; TIER='ultra' if ULTRA else 'normal'
source=ROOT/f'public/models/local/heritage-blender-v1/angkor-wat-{TIER}.glb'
original_hash=hashlib.sha256(source.read_bytes()).hexdigest()
bpy.ops.wm.read_factory_settings(use_empty=True); bpy.context.preferences.filepaths.save_version=0
BATCH={}
# Reuse only pure mesh helpers, never execute another generator's scene actions.
helper=ROOT/'scripts/refine-oudong.py'
names={'xyz','mat','add','box','tube','lathe','ell'}
nodes=[n for n in ast.parse(helper.read_text(encoding='utf-8')).body if isinstance(n,ast.FunctionDef) and n.name in names]
assert {n.name for n in nodes}==names
exec(compile(ast.Module(body=nodes,type_ignores=[]),str(helper),'exec'),globals())
bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2 if ULTRA else 1)
proto=bpy.context.object; SV=[tuple(v.co) for v in proto.data.vertices]; SF=[tuple(p.vertices) for p in proto.data.polygons]; bpy.data.objects.remove(proto,do_unlink=True)
STONE=[mat('Sandstone '+str(i),c) for i,c in enumerate([(.35,.325,.265),(.42,.39,.32),(.30,.30,.25),(.46,.42,.34)])]
TRIM=mat('Carved sandstone',(.44,.41,.33)); DARK=mat('Recessed stone',(.14,.155,.13))
FLOOR=mat('Terraces and causeway',(.43,.40,.32)); ROOF=mat('Corbelled stone roofs',(.295,.285,.24))
EARTH=mat('Island lawn',(.15,.23,.065)); BANK=mat('Moat banks',(.26,.24,.15))
WATER=mat('Moat and pond water',(.10,.22,.23)); wp=WATER.node_tree.nodes.get('Principled BSDF'); wp.inputs['Roughness'].default_value=.26 if ULTRA else .55; wp.inputs['Metallic'].default_value=.35
BARK=mat('Sugar palm trunks',(.24,.19,.12)); PALM=mat('Sugar palm fans',(.12,.25,.065))
LEAF=[mat('Forest canopy '+str(i),(.045+i*.025,.15+i*.035,.035+i*.015)) for i in range(3)]

def podium(x,z,y,w,d,h):
    box((x,y+h/2,z),(w,h,d),FLOOR)
    # Non-overlapping outward moulding bands; tops do not share a plane.
    for yy in [y+.08,y+h-.08]:
        for side in [-1,1]:
            box((x+side*(w/2+.045),yy,z),(.09,.09,d+.18),TRIM)
            box((x,yy,z+side*(d/2+.045)),(w,.09,.09),TRIM)

def steps(z0,z1,y0,y1,w,x=0):
    n=math.ceil((y1-y0)/.10)
    for i in range(n):
        top=y0+(i+1)*(y1-y0)/n
        box((x,(top-.10)/2,z0-(i+.5)*(z0-z1)/n),(w,top+.10,(z0-z1)/n+.001),FLOOR)

def arch(x,z,y,w,h,angle=0):
    def p(a,b,c): return (x+a*math.cos(angle)+c*math.sin(angle),y+b,z-a*math.sin(angle)+c*math.cos(angle))
    for s in [-1,1]:
        tube([p(s*w*.54,0,0),p(s*w*.54,h,0)],.065,TRIM,8 if ULTRA else 5)
    tube([p(-w*.68,h,0),p(w*.68,h,0)],.10,TRIM,6)
    curve=[(-.70,0),(-.58,.24),(-.34,.50),(0,.68),(.34,.50),(.58,.24),(.70,0)]
    tube([p(a*w,h+b*w,.015) for a,b in curve],.075,TRIM,6)
    if ULTRA:
        for a,b in curve: ell(p(a*w,h+b*w+.055,.02),(.07,.12,.055),TRIM)

def lobed_crown(x,z,y,r,h,seed=0,broken=False):
    n=40 if ULTRA else 20; count=10 if ULTRA else 7; vv=[]; prof=[]
    for i in range(count):
        t=i/count; rr=r*(.13+.87*(1-t)**.72)
        # Strong receding courses with a rounded lotus-bud silhouette.
        prof.extend([(y+t*h,rr),(y+(t+.035)*h,rr*1.04),(y+(t+.80/count)*h,rr*.91)])
    prof.extend([(y+h,r*.10),(y+h+.12,r*.025)])
    if broken: prof=prof[:max(6,len(prof)//2)]
    for yy,rr in prof:
        for j in range(n):
            a=j*math.tau/n; rad=rr*(1+.13*math.cos(4*a))
            vv.append((x+rad*math.sin(a),yy,z+rad*math.cos(a)))
    ff=[]
    for k in range(len(prof)-1):
        for j in range(n): ff.append((k*n+j,k*n+(j+1)%n,(k+1)*n+(j+1)%n,(k+1)*n+j))
    ff.extend([tuple(range(n-1,-1,-1)),tuple(range((len(prof)-1)*n,len(prof)*n))]); add(STONE[seed%4],vv,ff)
    # Vertical antefixes/petal points, not a stack of smooth cones.
    levels=4 if broken else 7
    for i in range(levels):
        t=(i+.25)/8; rr=r*(.13+.87*(1-t)**.72)
        for j in range(8):
            a=j*math.tau/8; rad=rr*(1+.13*math.cos(4*a))
            px,pz=x+rad*math.sin(a),z+rad*math.cos(a)
            lathe(px,pz,[(y+t*h,.10*r),(y+t*h+.16*r,.12*r),(y+t*h+.42*r,.008*r)],TRIM,n=8 if ULTRA else 5)

towers=[]
def sanctuary(x,z,base,w,h,main=False,broken=False):
    chamber=h*.30; towers.append([x,z,base,w,h,main,broken])
    podium(x,z,base,w*1.17,w*1.17,.16)
    for s in [-1,1]:
        box((x+s*w*.36,base+.16+chamber/2,z),(w*.28,chamber,w),STONE[0])
    box((x,base+.16+chamber/2,z-w*.43),(w*.44,chamber,w*.14),STONE[2])
    box((x,base+.16+chamber,z),(w,.16,w),TRIM)
    arch(x,z+w*.51,base+.16,w*.46,chamber*.86)
    for s in [-1,1]:
        box((x+s*w*.505,base+.16+chamber*.45,z),(.015,chamber*.72,w*.39),DARK)
        arch(x+s*w*.52,z,base+.16,w*.43,chamber*.84,s*math.pi/2)
    for level in range(5 if ULTRA else 3):
        yy=base+.18+level*chamber/(5 if ULTRA else 3)
        for s in [-1,1]: box((x+s*w*.46,yy,z+w*.52),(.15,.055,.08),TRIM)
    lobed_crown(x,z,base+chamber+.25,w*.64,h*.70,0 if main else 1,broken)

def roof_segment(x,z,length,base,angle):
    # Closed, corbelled barrel section. The supports below carry both eaves.
    profile=[(-.80,0),(-.68,.15),(-.55,.34),(-.35,.51),(-.12,.61),(.12,.61),(.35,.51),(.55,.34),(.68,.15),(.80,0)]
    def p(a,b,c): return (x+a*math.cos(angle)+c*math.sin(angle),base+b,z-a*math.sin(angle)+c*math.cos(angle))
    vv=[p(a,b,c) for a in [-length/2,length/2] for c,b in profile]; n=len(profile)
    ff=[tuple(range(n-1,-1,-1)),tuple(range(n,2*n))]
    ff.extend((i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)); add(ROOF,vv,ff)
    if ULTRA:
        for a in [-length*.36,0,length*.36]: tube([p(a,b+.016,c) for c,b in profile],.014,TRIM,4)

def gallery(x,z,length,base,angle=0,wall=True):
    count=max(2,round(length/.85)); bay=length/count
    def p(a,y,c): return (x+a*math.cos(angle)+c*math.sin(angle),base+y,z-a*math.sin(angle)+c*math.cos(angle))
    def b(a,y,c,w,h,d,m): box(p(a,y,c),(w,h,d) if abs(math.sin(angle))<.5 else (d,h,w),m)
    for i in range(count):
        a=-length/2+(i+.5)*bay
        if wall:
            b(a,.80,-.47,bay-.006,1.60,.20,STONE[i%4])
            # Plain recessed fields deliberately do not invent narrative reliefs.
            b(a,.82,-.36,bay*.80,1.15,.015,STONE[(i+1)%4])
        for s in [-1,1]:
            for c in ([.50] if wall else [-.50,.50]):
                b(a+s*bay*.43,.81,c,.13,1.62,.13,TRIM)
                b(a+s*bay*.43,.13,c,.22,.16,.22,TRIM)
                b(a+s*bay*.43,1.56,c,.23,.14,.23,TRIM)
        b(a,1.70,0,bay,.18,1.60,TRIM)
        pp=p(a,1.79,0); roof_segment(pp[0],pp[2],bay-.006,pp[1],angle)

def enclosure(w,d,z,base):
    for side in [-1,1]:
        for lr in [-1,1]:
            gallery(lr*(w/4+.7),z+side*d/2,w/2-1.4,base)
            gallery(side*w/2,z+lr*(d/4+.7),d/2-1.4,base,math.pi/2)
    # Central entrances stay open to the stair axis.
    for side in [-1,1]:
        for lr in [-1,1]: box((lr*1.12,base+.90,z+side*d/2),(.24,1.80,1.35),STONE[1])
        box((0,base+1.90,z+side*d/2),(2.5,.22,1.5),TRIM)
        roof_segment(0,z+side*d/2,2.5,base+2.01,0)
        arch(0,z+side*d/2+.80,base,1.7,1.70)

# Site plan: +Z is west, X spans north/south. The compact distances are illustrative.
box((0,-.20,-1),(34,.24,34),EARTH)
for x,z,w,d in [(0,18,42,4),(0,-20,42,4),(-19,-1,4,34),(19,-1,4,34)]:
    box((x,-.175,z),(w,.035,d),WATER)
for x,z,w,d in [(0,20.2,42.4,.35),(0,-22.2,42.4,.35),(-21.2,-1,.35,44),(21.2,-1,.35,44)]:
    box((x,-.15,z),(w,.18,d),BANK)
# Causeway and bridge: continuous deck with stair access at its western end.
box((0,.10,10),(2.5,.40,22),FLOOR)
steps(22,21,-.08,.30,2.5)
# Island enclosure walls, with a low western gate, not another five-tower temple.
for side in [-1,1]:
    box((side*16.6,.33,-1),(.22,.82,34),STONE[2])
    box((0,.33,-17.6),(33,.82,.22),STONE[2]) if side==-1 else None
    gallery(side*8.9,14.6,14.5,.30)
for x in [-6,0,6]:
    for s in [-1,1]: box((x+s*.61,1.13,14.6),(.28,1.66,1.45),STONE[1])
    box((x,2.03,14.6),(1.5,.18,1.45),TRIM); arch(x,15.38,.30,.94,1.55)
    lobed_crown(x,14.6,2.12,.72,1.7,2,True)
for side in [-1,1]:
    # Ponds are separated above the lawn, never coplanar with its surface.
    box((side*6.2,-.052,8),(6,.03,5.3),WATER)
    for z in [5.30,10.70]: box((side*6.2,-.01,z),(6.2,.12,.14),BANK)
    for x in [side*6.2-3.08,side*6.2+3.08]: box((x,-.01,8),(.14,.12,5.4),BANK)
    # A pair of courtyard libraries, kept off the central processional route.
    x=side*10.3; z=7.1; podium(x,z,-.08,2.2,3.1,.38)
    for dx in [-.76,.76]: box((x+dx,1.04,z),(.35,1.48,2.7),STONE[1])
    box((x,1.04,z-1.2),(1.2,1.48,.25),STONE[2]); arch(x,z+1.45,.30,1,1.40)
    roof_segment(x,z,3.1,1.85,math.pi/2)

podium(0,-6,0,22,18,.60)
podium(0,-6,.60,16,12,1.10)
podium(0,-6,1.70,10,8,1.50)
steps(4.0,3.0,.30,.60,3.4)
steps(1.6,0.0,.60,1.70,2.4)
steps(-.6,-2,1.70,3.20,2.2)
enclosure(21,17,-6,.60)
enclosure(15,11,-6,1.70)
enclosure(8,6,-6,3.20)
# Five principal sanctuaries in quincunx: central peak + four corners.
sanctuary(0,-6,3.20,2.15,6.8,True)
for x in [-3.5,3.5]:
    for z in [-3.4,-8.6]: sanctuary(x,z,3.20,1.60,4.8)
# Short, worn corner pavilions make the lower silhouette less uniform.
for x in [-10,10]:
    for z in [2,-14]: sanctuary(x,z,.60,1.35,2.0,broken=True)
# Continuous naga balustrades, leaving bridge/entrance openings unobstructed.
for side in [-1,1]:
    for z0,z1 in [(4.2,13.2),(16.1,20.9)]:
        tube([(side*1.42,.82,z0),(side*1.42,.82,z1)],.08,TRIM,7)
        for i in range(math.ceil((z1-z0)/.5)+1):
            z=z0+i*(z1-z0)/math.ceil((z1-z0)/.5)
            box((side*1.42,.53,z),(.13,.46,.13),TRIM)
        x=side*1.42
        tube([(x,.30,z1),(x,.76,z1+.18),(x,1.15,z1+.12)],[.15,.13,.10],TRIM)
        for j in range(-3,4):
            tube([(x,.8,z1+.12),(x+j*.12,1.40-abs(j)*.10,z1+.15)],[.065,.075],TRIM,5)

palms=[(-4,3.6,3.3),(4.3,3.8,3.7),(-8.4,3.4,4),(8,3.1,3.6),(-12,11.6,3.5),(12,11.8,3.7),(-13.8,-9,4.2),(13.8,-10,4)]
for i,(x,z,h) in enumerate(palms):
    tube([(x,-.08,z),(x+.10,h,z)],[.14,.10],BARK,8 if ULTRA else 5)
    for k in range(9):
        a=k*math.tau/9+i; root=(x,h-.14,z); end=(x+1.2*math.sin(a),h-.05,z+1.2*math.cos(a))
        tube([root,(x+.60*math.sin(a),h+.18,z+.60*math.cos(a)),end],.025,PALM,4)
        # Fan palms: pleated semicircular leaf, not generic feather palms.
        n=10 if ULTRA else 5; vv=[end]
        for j in range(n+1):
            aa=a+(j/n-.5)*1.8
            vv.append((end[0]+.70*math.sin(aa),h-.20-(j%2)*.06,end[2]+.70*math.cos(aa)))
        add(PALM,vv,[(0,j+1,j+2) for j in range(n)])
trees=[]; rng=random.Random(1113)
for _ in range(5000):
    x=rng.uniform(-15.6,15.6); z=rng.uniform(-16.4,13)
    if abs(x)<12.8 or z>2: continue
    if any((x-a)**2+(z-b)**2<1.8**2 for a,b,h in trees): continue
    trees.append((x,z,rng.uniform(2.7,4.2)))
    if len(trees)==36: break
for i,(x,z,h) in enumerate(trees):
    tube([(x,-.08,z),(x,h*.8,z)],[.13,.04],BARK)
    for j in range(3):
        a=i+j*math.tau/3
        ell((x+.50*math.sin(a),h*.80,z+.50*math.cos(a)),(.94,.75,.94),LEAF[(i+j)%3])
    ell((x,h,z),(.78,.66,.80),LEAF[i%3])

for name,(verts,faces) in BATCH.items():
    mesh=bpy.data.meshes.new(name); mesh.from_pydata(verts,[],faces); mesh.update()
    o=bpy.data.objects.new(name,mesh); bpy.context.collection.objects.link(o); material=bpy.data.materials[name]; mesh.materials.append(material)
    if name!=PALM.name:
        bpy.context.view_layer.objects.active=o; o.select_set(True)
        bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT'); bpy.ops.mesh.normals_make_consistent(inside=False); bpy.ops.object.mode_set(mode='OBJECT'); o.select_set(False)
    else: material.surface_render_method='DITHERED'; material.use_backface_culling=False
    if 'stone' in name.lower():
        col=mesh.color_attributes.new(name='Stone color',type='BYTE_COLOR',domain='POINT')
        for i,v in enumerate(mesh.vertices):
            x,y,z=v.co; q=.91+.07*math.sin(x*5+z*3)*math.sin(y*6-z*2); c=material.diffuse_color
            col.data[i].color=(c[0]*q,c[1]*q,c[2]*q,1)
        vc=material.node_tree.nodes.new('ShaderNodeVertexColor'); vc.layer_name=col.name
        material.node_tree.links.new(vc.outputs['Color'],material.node_tree.nodes.get('Principled BSDF').inputs['Base Color'])

sc=bpy.context.scene; sc['provenance']='Illustrative Angkor Wat exterior, approximate dimensions and layout. Original geometry, no reference photo textures.'
sc.world=bpy.data.worlds.new('Daylight'); sc.world.use_nodes=True
sc.world.node_tree.nodes['Background'].inputs[0].default_value=(.65,.75,.86,1); sc.world.node_tree.nodes['Background'].inputs[1].default_value=.6
bpy.ops.object.light_add(type='SUN'); bpy.context.object.rotation_euler=(.5,-.45,-.6); bpy.context.object.data.energy=2.5; bpy.context.object.data.angle=.12
sc.render.engine='CYCLES'; sc.cycles.samples=12; sc.cycles.use_denoising=True
sc.render.resolution_x=1280; sc.render.resolution_y=960; sc.render.resolution_percentage=100; sc.view_settings.view_transform='AgX'
views=[('overview',(27,29,34),(0,1,-1),35),('western',(-4.5,3.4,15),(0,4,-6),35),('sanctuary',(1,7.5,5.5),(0,6,-6),28),('gallery',(-6,3.4,8.5),(-5,1.45,2.5),30)]
for name,pos,target,lens in views:
    bpy.ops.object.camera_add(location=xyz(pos)); cam=bpy.context.object; cam.name='Review '+name
    cam.rotation_euler=(Vector(xyz(target))-cam.location).to_track_quat('-Z','Y').to_euler(); cam.data.lens=lens; cam.data.clip_end=200; sc.camera=cam
    if '--no-render' not in sys.argv and (ULTRA or name=='overview'):
        sc.render.filepath=str(OUT/f'{TIER}-{name}.png'); bpy.ops.render.render(write_still=True)
sc.camera=bpy.data.objects['Review overview']; bpy.ops.wm.save_as_mainfile(filepath=str(OUT/f'angkor-wat-{TIER}.blend'))
bpy.ops.object.select_all(action='DESELECT'); meshes=[o for o in sc.objects if o.type=='MESH']
for o in meshes: o.select_set(True)
bpy.context.view_layer.objects.active=meshes[0]; dest=PUBLIC/f'angkor-wat-{TIER}.glb'
bpy.ops.export_scene.gltf(filepath=str(dest),export_format='GLB',use_selection=True,export_cameras=False,export_lights=False,export_animations=False,export_yup=True,export_meshopt_compression_enable=True,export_meshopt_extension='EXT_meshopt_compression')
tri=sum(len(p.vertices)-2 for o in meshes for p in o.data.polygons)
report={'tier':TIER,'triangles':tri,'drawCalls':len(meshes),'bytes':dest.stat().st_size,'trees':trees,'palms':palms,'towers':towers,'originalSha256':original_hash,'sha256':hashlib.sha256(dest.read_bytes()).hexdigest(),'surveyed':False,'photographsEmbedded':False,'landscapeEmbedded':True}
assert hashlib.sha256(source.read_bytes()).hexdigest()==original_hash
assert tri<(250000 if ULTRA else 100000)
(OUT/f'{TIER}-report.json').write_text(json.dumps(report,indent=2)); print('ANGKOR_COMPLETE',TIER,tri,dest.stat().st_size,flush=True)
