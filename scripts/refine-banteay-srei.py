"""Reference-led illustrative Banteay Srei, not a scan or measured reconstruction.
Blender --background --threads 8 --python scripts/refine-banteay-srei.py -- --normal/--ultra
"""
import ast, bpy, math, random, json, sys, hashlib
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'output/banteay-srei-review-v2'; PUBLIC=ROOT/'public/models/local/banteay-srei-refined-v2'
for folder in (OUT,PUBLIC): folder.mkdir(parents=True,exist_ok=True)
ULTRA='--normal' not in sys.argv; TIER='ultra' if ULTRA else 'normal'
source=ROOT/f'public/models/local/heritage-blender-v1/banteay-srei-{TIER}.glb'
original_hash=hashlib.sha256(source.read_bytes()).hexdigest()
bpy.ops.wm.read_factory_settings(use_empty=True); bpy.context.preferences.filepaths.save_version=0
BATCH={}
def helpers(path,names):
    nodes=[n for n in ast.parse(path.read_text(encoding='utf-8')).body if isinstance(n,ast.FunctionDef) and n.name in names]
    assert {n.name for n in nodes}==names
    exec(compile(ast.Module(body=nodes,type_ignores=[]),str(path),'exec'),globals())
helpers(ROOT/'scripts/refine-oudong.py',{'xyz','mat','add','box','tube','lathe','ell'})
helpers(ROOT/'scripts/refine-ta-prohm.py',{'block'})
helpers(ROOT/'scripts/refine-angkor-wat.py',{'steps'})
bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2 if ULTRA else 1)
proto=bpy.context.object; SV=[tuple(v.co) for v in proto.data.vertices]; SF=[tuple(p.vertices) for p in proto.data.polygons]; bpy.data.objects.remove(proto,do_unlink=True)
STONE=[mat('Rose sandstone '+str(i),c) for i,c in enumerate([(.42,.225,.17),(.51,.29,.22),(.36,.21,.17),(.47,.265,.20)])]
TRIM=mat('Carved pink sandstone',(.56,.32,.24)); DARK=mat('Recessed sandstone',(.235,.135,.105))
LATERITE=mat('Laterite walls',(.27,.20,.14)); FLOOR=mat('Sandstone paving',(.43,.32,.25))
EARTH=mat('Ground',(.19,.23,.11)); BANK=mat('Moat banks',(.31,.27,.18)); WATER=mat('Moat water',(.11,.18,.15))
BARK=mat('Tree trunks',(.20,.15,.095)); LEAF=[mat('Forest canopy '+str(i),(.035+i*.025,.14+i*.03,.025+i*.015)) for i in range(3)]
WATER.node_tree.nodes.get('Principled BSDF').inputs['Roughness'].default_value=.30 if ULTRA else .65

def rosette(x,y,z,r,angle=0):
    # Abstract botanical relief; never a fabricated depiction of a deity.
    n=16 if ULTRA else 8; vv=[(x,y,z+.025)]
    for j in range(n):
        a=j*math.tau/n; rr=r*(1 if j%2==0 else .60)
        vv.append((x+rr*math.cos(a),y+rr*math.sin(a),z))
    add(TRIM,vv,[(0,j+1,(j+1)%n+1) for j in range(n)])

def curl(x,y,z,r,side=1):
    n=18 if ULTRA else 9
    tube([(x+side*r*(1-i/(n+1)*.72)*math.cos(i*math.tau*1.15/n),y+r*(1-i/(n+1)*.72)*math.sin(i*math.tau*1.15/n),z) for i in range(n+1)],r*.13,TRIM,5)

def pediment(x,z,y,w,h):
    # Sweeping tympanum with layered borders and curled ends, not a plain triangle.
    outline=[(-.60,0),(-.59,.18),(-.46,.30),(-.33,.57),(-.20,.70),(0,1),(.20,.70),(.33,.57),(.46,.30),(.59,.18),(.60,0)]
    vv=[(x+a*w,y+b*h,z+dz) for dz in [-.12,.12] for a,b in outline]; n=len(outline)
    add(STONE[1],vv,[tuple(range(n-1,-1,-1)),tuple(range(n,2*n))]+[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)])
    for inset in [0,.09]:
        tube([(x+a*w*(1-inset),y+b*h*(1-inset)+inset*.18,z+.15+inset*.2) for a,b in outline],.045,TRIM,6 if ULTRA else 4)
    for j,(a,b) in enumerate(outline):
        if j%2==0:
            lathe(x+a*w,z,[(y+b*h,.065*w),(y+b*h+.11*w,.07*w),(y+b*h+.26*w,.008)],TRIM,n=8 if ULTRA else 5)
    for side in [-1,1]:
        curl(x+side*w*.49,y+h*.18,z+.19,w*.13,side)
        curl(x+side*w*.20,y+h*.35,z+.16,w*.09,side)
    # Keep the central narrative field plain; ornamental rosettes only at its edges.
    for side in [-1,1]:
        for j in range(4 if ULTRA else 2):
            rosette(x+side*w*(.12+j*.07),y+h*(.68-j*.12),z+.135,w*.04)

def moulded_base(x,z,y,w,d,h):
    box((x,y+h/2,z),(w,h,d),FLOOR)
    for yy,extra,hh in [(y+.055,.14,.11),(y+h-.08,.18,.10)]:
        for s in [-1,1]:
            box((x+s*(w/2+extra/2),yy,z),(extra,hh,d+extra*2),TRIM)
            box((x,yy,z+s*(d/2+extra/2)),(w,hh,extra),TRIM)

def doorway(x,z,y,w,h,decor=True):
    for side in [-1,1]:
        block((x+side*(w*.5+.17),y+h/2,z),(.34,h,.30),STONE[1])
        profile=[(y,.10),(y+.14,.14),(y+.24,.09),(y+h-.25,.09),(y+h-.14,.14),(y+h,.10)]
        lathe(x+side*(w*.5+.045),z+.21,profile,TRIM,n=12 if ULTRA else 8)
        for j in range(6 if ULTRA else 3):
            yy=y+.28+j*(h-.56)/(5 if ULTRA else 2)
            rosette(x+side*(w*.5+.18),yy,z+.165,.10)
    box((x,y+h+.10,z),(w+.80,.20,.42),TRIM)
    for j in range(11 if ULTRA else 6):
        rosette(x+(j/(10 if ULTRA else 5)-.5)*(w+.55),y+h+.10,z+.225,.07)
    if decor: pediment(x,z+.04,y+h+.20,w+.62,(w+.62)*.64)

def roof(x,z,y,w,d):
    # Corbelled roof along the east-west axis; course edges are separated.
    for i in range(7 if ULTRA else 4):
        n=7 if ULTRA else 4; t=i/n
        box((x,y+t*.90,z),(w*(1-t*.78),.90/n,d),STONE[i%4])
    box((x,y+.94,z),(w*.20,.12,d+.08),TRIM)

def chamber(x,z,y,w,d,h,back=True):
    for side in [-1,1]:
        for j in range(5 if ULTRA else 3):
            n=5 if ULTRA else 3
            block((x+side*(w/2-.14),y+(j+.5)*h/n,z),(.28,h/n-.008,d),STONE[j%4])
        for dz in [-d*.38,d*.38]:
            box((x+side*w*.51,y+h*.5,z+dz),(.12,h,.20),TRIM)
        box((x+side*w*.51,y+h*.46,z),(.035,h*.60,d*.43),DARK)
    if back: box((x,y+h/2,z-d/2+.1),(w-.28,h,.20),STONE[2])
    box((x,y+h+.10,z),(w+.18,.20,d+.18),TRIM)
    doorway(x,z+d/2+.025,y,min(1.25,w*.55),h)
    # False doors on the back are decorative, not portals through solid walls.
    if back:
        box((x,y+h*.47,z-d/2-.022),(w*.49,h*.80,.04),DARK)

def tower(x,z,y,w,h):
    chamber(x,z,y,w,w,2.15)
    yy=y+2.40; rem=h-2.40-.45
    for i in range(4):
        ww=w*(.95-i*.18); hh=rem/4
        block((x,yy+hh*.50,z),(ww,hh,ww),STONE[i%4])
        for offset,scale,thick in [(0,1.05,.12),(hh*.78,1.12,.13)]:
            box((x,yy+offset,z),(ww*scale,thick,ww*scale),TRIM)
        for sx in [-1,1]:
            for sz in [-1,1]:
                lathe(x+sx*ww*.43,z+sz*ww*.43,[(yy+hh*.75,.12),(yy+hh*.95,.14),(yy+hh*1.28,.015)],TRIM,n=8 if ULTRA else 5)
        doorway(x,z+ww*.51,yy+.10,ww*.33,max(.30,hh*.40),decor=False)
        yy+=hh
    lathe(x,z,[(yy,.22),(yy+.15,.30),(yy+.30,.20),(yy+.45,.02)],TRIM,n=16 if ULTRA else 8)

def wall(x,z,length,h=1.1,angle=0):
    n=max(2,round(length/(.65 if ULTRA else 1.1))); rows=4 if ULTRA else 3
    for row in range(rows):
        for j in range(n):
            a=-length/2+(j+.5)*length/n
            block((x+a*math.cos(angle),.12+(row+.5)*h/rows,z-a*math.sin(angle)),(length/n-.012,h/rows-.01,.40),LATERITE,tilt=-angle)
    # Front/rear caps butt against side caps, never overlap on the same plane.
    capx=x-math.copysign(.16,x) if angle==0 else x
    box((capx,h+.18,z),(length-.20,.12,.52) if angle==0 else (.52,.12,length+.12),STONE[2])

def gate(z,width=3.0,h=2.15):
    for side in [-1,1]:
        block((side*(width*.5-.34),.12+h/2,z),(.68,h,1.30),STONE[1])
        box((side*(width*.5-.34),.18,z),(.83,.12,1.48),TRIM)
    doorway(0,z+.68,.12,width-.68*2,h)
    roof(0,z,h+.30,width,1.35)
    pediment(0,z-.72,h+.32,width*.85,1.60)

def enclosure(w,d,z,h):
    for side in [-1,1]:
        wall(side*w/2,z,d,h,math.pi/2)
        for lr in [-1,1]: wall(lr*(w/4+.80),z+side*d/2,w/2-1.60,h)
        gate(z+side*d/2,3.0 if w<18 else 3.2,2.05 if w<18 else 2.20)

# Compact landscape and three enclosing walls. +Z is the east approach.
box((0,-.16,-1),(26,.32,30),EARTH)
for x,z,w,d in [(0,15.2,30.8,2.4),(0,-17.2,30.8,2.4),(-14.2,-1,2.4,30),(14.2,-1,2.4,30)]:
    box((x,-.19,z),(w,.04,d),WATER)
for x,z,w,d in [(0,16.6,31.4,.35),(0,-18.6,31.4,.35),(-15.6,-1,.35,35.5),(15.6,-1,.35,35.5)]:
    box((x,-.16,z),(w,.18,d),BANK)
box((0,.06,-1),(20.5,.12,22.5),FLOOR)
# Butt-joint at courtyard edge z=10.25; overlapping coplanar decks flicker.
box((0,.06,14.125),(2.2,.12,7.75),FLOOR)
enclosure(20,22,-1,.85); enclosure(16,17,-2,1.05); enclosure(12,12,-3,1.15)
moulded_base(0,-4.6,.12,10,6.6,.40)
steps(-.2,-1.3,.12,.52,2.0)
towers=[(-3.2,-5.3,.52,2.0,5.6),(0,-5.3,.52,2.35,6.5),(3.2,-5.3,.52,2.0,5.6)]
for params in towers: tower(*params)
# Central antechamber extends toward the eastern approach.
chamber(0,-2.6,.52,2.1,2.7,2.05,back=False); roof(0,-2.6,2.80,2.3,2.85)
libraries=[(-3.7,.7),(3.7,.7)]
for x,z in libraries:
    moulded_base(x,z,.12,2.5,3.2,.24)
    chamber(x,z,.36,2.1,2.85,1.8); roof(x,z,2.36,2.3,3.0)
    pediment(x,z-1.53,2.40,2.0,1.45)
# Decorative processional posts stop before the walking corridor.
for s in [-1,1]:
    for j in range(8):
        z=10.7+j*.82; box((s*1.42,.33,z),(.25,.66,.25),STONE[1])
        lathe(s*1.42,z,[(.66,.18),(.80,.13),(.91,.02)],TRIM,n=8)
# Neutral empty plinths: guardian figures are intentionally not reconstructed.
for x in [-4.25,-2.15,2.15,4.25]: moulded_base(x,-3.6,.52,.55,.55,.24)
trees=[]; rng=random.Random(967)
for _ in range(4000):
    x=rng.uniform(-12.4,12.4); z=rng.uniform(-15.2,13.5)
    if abs(x)<11.2 and z>-13.6: continue
    if abs(x)<3 or any((x-a)**2+(z-b)**2<2.5**2 for a,b,h in trees): continue
    trees.append((x,z,rng.uniform(3.5,5.5)))
    if len(trees)==24: break
for i,(x,z,h) in enumerate(trees):
    tube([(x,0,z),(x+.12,h*.7,z),(x-.1,h,z)],[.19,.13,.04],BARK)
    for j in range(3):
        a=i+j*math.tau/3; dx=math.sin(a); dz=math.cos(a)
        tube([(x,h*.5,z),(x+dx*.7,h*.8,z+dz*.7)],[.09,.025],BARK)
        ell((x+dx*.65,h*.83,z+dz*.65),(1.05,.90,1.0),LEAF[(i+j)%3])
    ell((x,h,z),(.85,.90,.85),LEAF[i%3])

for name,(verts,faces) in BATCH.items():
    mesh=bpy.data.meshes.new(name); mesh.from_pydata(verts,[],faces); mesh.update()
    o=bpy.data.objects.new(name,mesh); bpy.context.collection.objects.link(o); material=bpy.data.materials[name]; mesh.materials.append(material)
    bpy.context.view_layer.objects.active=o; o.select_set(True)
    bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT'); bpy.ops.mesh.normals_make_consistent(inside=False); bpy.ops.object.mode_set(mode='OBJECT'); o.select_set(False)
    if 'sandstone' in name.lower():
        col=mesh.color_attributes.new(name='Stone weathering',type='BYTE_COLOR',domain='POINT')
        for i,v in enumerate(mesh.vertices):
            x,y,z=v.co; c=material.diffuse_color; q=.87+.12*math.sin(x*7+z*3)*math.sin(y*5-z*2)
            col.data[i].color=(c[0]*q,c[1]*q,c[2]*q,1)
        vc=material.node_tree.nodes.new('ShaderNodeVertexColor'); vc.layer_name=col.name
        material.node_tree.links.new(vc.outputs['Color'],material.node_tree.nodes.get('Principled BSDF').inputs['Base Color'])
sc=bpy.context.scene; sc['provenance']='Illustrative compact Banteay Srei, not a survey. Original abstract ornament, no sacred figures or photo textures.'
sc.world=bpy.data.worlds.new('Daylight'); sc.world.use_nodes=True
sc.world.node_tree.nodes['Background'].inputs[0].default_value=(.65,.75,.86,1); sc.world.node_tree.nodes['Background'].inputs[1].default_value=.65
bpy.ops.object.light_add(type='SUN'); bpy.context.object.rotation_euler=(.55,-.45,-.6); bpy.context.object.data.energy=2.3; bpy.context.object.data.angle=.15
sc.render.engine='CYCLES'; sc.cycles.samples=12; sc.cycles.use_denoising=True
sc.render.resolution_x=1280; sc.render.resolution_y=960; sc.render.resolution_percentage=100; sc.view_settings.view_transform='AgX'
views=[('overview',(23,24,28),(0,1,-1),35),('towers',(-7.7,4.5,1.3),(-3.2,3,-5),28),('library',(6.8,3.4,4.5),(3.7,2.2,.4),30),('gateway',(3.2,3.4,16),(0,2.2,10),32)]
for name,pos,target,lens in views:
    bpy.ops.object.camera_add(location=xyz(pos)); cam=bpy.context.object; cam.name='Review '+name
    cam.rotation_euler=(Vector(xyz(target))-cam.location).to_track_quat('-Z','Y').to_euler(); cam.data.lens=lens; cam.data.clip_end=200; sc.camera=cam
    if '--no-render' not in sys.argv and (ULTRA or name=='overview'):
        sc.render.filepath=str(OUT/f'{TIER}-{name}.png'); bpy.ops.render.render(write_still=True)
sc.camera=bpy.data.objects['Review overview']; bpy.ops.wm.save_as_mainfile(filepath=str(OUT/f'banteay-srei-{TIER}.blend'))
bpy.ops.object.select_all(action='DESELECT'); meshes=[o for o in sc.objects if o.type=='MESH']
for o in meshes: o.select_set(True)
bpy.context.view_layer.objects.active=meshes[0]; dest=PUBLIC/f'banteay-srei-{TIER}.glb'
bpy.ops.export_scene.gltf(filepath=str(dest),export_format='GLB',use_selection=True,export_cameras=False,export_lights=False,export_animations=False,export_yup=True,export_meshopt_compression_enable=True,export_meshopt_extension='EXT_meshopt_compression')
tri=sum(len(p.vertices)-2 for o in meshes for p in o.data.polygons)
report={'tier':TIER,'triangles':tri,'drawCalls':len(meshes),'bytes':dest.stat().st_size,'trees':trees,'towers':towers,'libraries':libraries,'originalSha256':original_hash,'sha256':hashlib.sha256(dest.read_bytes()).hexdigest(),'surveyed':False,'photographsEmbedded':False}
assert hashlib.sha256(source.read_bytes()).hexdigest()==original_hash
assert tri<(350000 if ULTRA else 120000)
(OUT/f'{TIER}-report.json').write_text(json.dumps(report,indent=2)); print('BANTEAY_SREI_COMPLETE',TIER,tri,dest.stat().st_size,flush=True)
