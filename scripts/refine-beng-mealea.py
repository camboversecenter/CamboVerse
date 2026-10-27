"""Original illustrative Beng Mealea, not a survey or restoration proposal.
Blender -b -t 8 --python scripts/refine-beng-mealea.py -- --normal/--ultra
"""
import ast, bpy, math, random, json, sys, hashlib
from pathlib import Path
from mathutils import Vector, Euler
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'output/beng-mealea-review-v2'; PUBLIC=ROOT/'public/models/local/beng-mealea-refined-v2'
for folder in (OUT,PUBLIC): folder.mkdir(parents=True,exist_ok=True)
ULTRA='--normal' not in sys.argv; TIER='ultra' if ULTRA else 'normal'
source=ROOT/f'public/models/local/heritage-blender-v1/beng-mealea-{TIER}.glb'
original_hash=hashlib.sha256(source.read_bytes()).hexdigest()
bpy.ops.wm.read_factory_settings(use_empty=True); bpy.context.preferences.filepaths.save_version=0
BATCH={}
def helpers(path,names):
    nodes=[n for n in ast.parse(path.read_text(encoding='utf-8')).body if isinstance(n,ast.FunctionDef) and n.name in names]
    assert {n.name for n in nodes}==names
    exec(compile(ast.Module(body=nodes,type_ignores=[]),str(path),'exec'),globals())
helpers(ROOT/'scripts/refine-oudong.py',{'xyz','mat','add','box','tube','lathe','ell'})
helpers(ROOT/'scripts/refine-angkor-wat.py',{'arch','lobed_crown','roof_segment'})
bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2 if ULTRA else 1)
proto=bpy.context.object; SV=[tuple(v.co) for v in proto.data.vertices]; SF=[tuple(p.vertices) for p in proto.data.polygons]; bpy.data.objects.remove(proto,do_unlink=True)
STONE=[mat('Weathered sandstone '+str(i),c) for i,c in enumerate([(.27,.28,.23),(.34,.32,.26),(.23,.255,.21),(.40,.37,.29)])]
TRIM=mat('Carved sandstone',(.40,.38,.30)); ROOF=mat('Corbelled stone roofs',(.25,.265,.22))
FLOOR=mat('Courtyard paving',(.36,.33,.26)); EARTH=mat('Forest floor',(.15,.19,.085))
BARK=mat('Forest trunks',(.20,.17,.11)); ROOTS=mat('Pale living roots',(.50,.47,.37))
LEAF=[mat('Forest canopy '+str(i),(.035+i*.022,.13+i*.033,.025+i*.015)) for i in range(3)]
helpers(ROOT/'scripts/refine-ta-prohm.py',{'block','wall','portal','curve'})

WOOD=mat('Visitor walkway timber',(.27,.16,.075)); WATER=mat('Moat water',(.10,.19,.16))

def ruin_gallery(x,z,length,angle=0,seed=0):
    """Fixed architectural bays keep Normal/Ultra ruin silhouettes equivalent."""
    n=max(2,round(length/1.1)); bay=length/n
    for i in range(n):
        a=-length/2+(i+.5)*bay; state=(i+seed*3)%9
        cx=x+a*math.cos(angle); cz=z-a*math.sin(angle)
        h=[2.1,1.5,.75,1.0,2.1,2.1,.45,1.25,2.1][state]
        rows=math.ceil(h/(.33 if ULTRA else .55))
        for j in range(rows):
            block((cx-.46*math.sin(angle),.12+(j+.5)*h/rows,cz-.46*math.cos(angle)),
                  (bay-.018,h/rows-.012,.42),STONE[(i+j+seed)%4],tilt=-angle)
        ph=2.04 if state in [0,4,5,8] else h*.8
        px=cx+.53*math.sin(angle); pz=cz+.53*math.cos(angle)
        for j in range(3):
            block((px,.12+(j+.5)*ph/3,pz),(.27,ph/3-.012,.27),TRIM)
        if state in [0,4,5,8]:
            box((cx,2.28,cz),(bay-.01,.20,1.65) if angle==0 else (1.65,.20,bay-.01),TRIM)
        if state in [4,5]:
            roof_segment(cx,cz,bay-.025,2.38,angle)

# Three rectangular gallery rings. East is +Z. Compact distances are not surveyed.
box((0,-.18,-2),(36,.36,42),EARTH)
box((0,.06,-2),(28,.12,30),FLOOR)  # front edge z=13
box((0,.06,16),(3,.12,6),FLOOR)  # separate approach, no coplanar overlap
# Shallow peripheral moat fragments: extent and water level are illustrative.
for x,z,w,d in [(0,20,40,2),(0,-24,40,2),(-19,-2,2,42),(19,-2,2,42)]:
    box((x,-.16,z),(w,.10,d),EARTH)
    box((x,-.10,z),(w*.83,.025,d*.70),WATER)
enclosures=[(26,26,-1),(18,18,-3),(10,10,-6)]
for index,(w,d,z) in enumerate(enclosures):
    for side in [-1,1]:
        for lr in [-1,1]:
            ruin_gallery(lr*(w/4+.85),z+side*d/2,w/2-1.7,seed=index*2+lr)
            ruin_gallery(side*w/2,z+lr*(d/4+.4),d/2-2,math.pi/2,index*2+side)
        # Front entrances remain passable; rear is a low broken frame.
        portal(0,z+side*d/2,2.35 if side>0 else 1.65,2.0 if side>0 else 1.5)
# Central sanctuary survives as a collapsed base, not an invented complete tower.
box((0,.22,-7),(4.6,.20,4.8),STONE[2])
for side in [-1,1]: wall(side*1.8,-7,3.5,1.1,math.pi/2,ruined=True,seed=3)
wall(0,-8.8,3.6,1.6,ruined=True,seed=6)
libraries=[(-3.1,-2.7),(3.1,-2.7),(-6.7,8.6),(6.7,8.6)]
for x,z in libraries:
    box((x,.20,z),(2.2,.16,2.6),STONE[2])
    for s in [-1,1]: wall(x+s*.82,z,2.1,1.55,math.pi/2,ruined=True,seed=2)
    wall(x,z-1.05,1.8,1.7,ruined=True,seed=5)
    # Broken front jambs and a surviving lintel; only a short rear roof fragment.
    for s in [-1,1]: block((x+s*.64,1.05,z+1.0),(.3,1.62,.45),TRIM)
    block((x,1.95,z+1),(1.85,.2,.55),TRIM)
    roof_segment(x,z-.6,1.9,1.98,math.pi/2)

# A root-covered surviving window wall: balusters are geometry, no photo texture.
for x in [4.3,6.5,8.7]:
    for j in range(5): block((x,.12+(j+.5)*.57,0),(.42,.56,.60),STONE[j%4])
for x in [5.4,7.6]:
    box((x,.40,0),(1.78,.56,.60),STONE[2])
    box((x,2.45,0),(1.78,.50,.60),STONE[1])
    for yy in [.72,2.18,2.79]:
        box((x,yy,.04),(1.85,.13,.68),TRIM)
    for k in range(5):
        bx=x+(k-2)*.29
        profile=[(.78,.08),(.85,.12),(.94,.09),(1.13,.07),(1.22,.11),
                 (1.35,.08),(1.55,.07),(1.65,.11),(1.77,.08),(2.10,.10)]
        lathe(bx,0,profile,TRIM,n=10 if ULTRA else 6)
# Modern boardwalk is interpretive, not an exact mapping of today's visitor route.
# Continuous deck below narrow board seams prevents collision holes.
boardwalk={'top':.42,'width':1.8,'main':[16,-3.5],'branch':[.9,7.9,3]}
for i in range(4):
    top=.12+(i+1)*.075; z=17-(i+.5)*.25
    box((0,(top+.12)/2,z),(1.8,top-.12,.25),WOOD)
box((0,.33,6.25),(1.8,.18,19.5),WOOD)  # -3.5 .. 16
box((4.4,.33,3),(7,.18,1.8),WOOD)  # .9 .. 7.9, butt joint with main
# Rail runs leave a clear opening at the branch; no railing crosses the deck.
for side in [-1,1]:
    for z in [15.5-i*1.5 for i in range(13)]:
        if side>0 and 1.9<z<4.1: continue
        box((side*.99,.88,z),(.10,1.52,.10),WOOD)
    for a,b in [(16,4.05),(1.95,-3.5)] if side>0 else [(16,-3.5)]:
        box((side*.99,1.52,(a+b)/2),(.09,.09,a-b),WOOD)
        box((side*.99,1.03,(a+b)/2),(.065,.065,a-b),WOOD)
for z in [2.01,3.99]:
    box((4.4,1.52,z),(7,.09,.09),WOOD)
    box((4.4,1.03,z),(7,.065,.065),WOOD)
    for x in [1.4,3.0,4.6,6.2,7.7]: box((x,.88,z),(.10,1.52,.10),WOOD)
for z in [15-i*2 for i in range(10)]:
    for s in [-1,1]: box((s*.62,.18,z),(.12,.36,.16),WOOD)
for x in [1.4,3.0,4.6,6.2,7.7]:
    for z in [2.4,3.6]: box((x,.18,z),(.12,.36,.16),WOOD)
# Subtle plank end marks on the outside edge; they never form floor obstructions.
for i in range(65):
    z=15.85-i*.295
    for s in [-1,1]: box((s*.905,.36,z),(.012,.10,.012),BARK)

# Dense fallen masonry, with yaw, roll and pitch, arranged in supported heaps.
rubble=[]; rng=random.Random(1150)
def fallen(x,z,base,w,h,d,seed):
    m=STONE[seed%4]; start=len(BATCH.get(m.name,([],[]))[0])
    block((0,0,0),(w,h,d),m)
    verts=BATCH[m.name][0]; rot=Euler((rng.uniform(-.34,.34),rng.uniform(-.38,.38),rng.uniform(-1.5,1.5)),'XYZ').to_matrix()
    vv=[rot@Vector(v) for v in verts[start:]]; low=min(v.z for v in vv)
    center=Vector(xyz((x,base-low,z)))
    verts[start:]=[tuple(center+v) for v in vv]
    rubble.append([x,z,base,w,h,d])
def near_route(x,z,margin=0):
    return (abs(x)<1.6+margin and -4.4<z<18) or (-.2<x<8.7 and abs(z-3)<1.6+margin)
for cx,cz,radius,layers in [(0,-7,2.8,4),(-8,4.6,2.3,3),(8,-8,2.0,3),(-6.3,-11.5,2,3),
                           (3.8,11.0,1.6,2),(-3.4,10.7,1.9,2),(-2.7,.2,1.4,2),(7,-3.1,1.4,2)]:
    for level in range(layers):
        rad=radius-level*.48
        for i in range(max(7,round(rad*16))):
            a=rng.uniform(0,math.tau); rr=rad*math.sqrt(rng.random())
            x=cx+math.sin(a)*rr; z=cz+math.cos(a)*rr
            if near_route(x,z,.2): continue
            fallen(x,z,.12+level*.34,rng.uniform(.55,1.1),rng.uniform(.28,.55),rng.uniform(.45,.85),i+level)
# Roots grow over a surviving wall and a western gallery, away from deck surfaces.
heroes=[(6.5,-.35,10.5),(-12.7,-4.5,12.0)]
for index,(x,z,h) in enumerate(heroes):
    for j,dx in enumerate([-1.85,-.72,.62,1.62]):
        bend=[-.25,.35,-.3,.2][j]
        curve([(x+.12,5.3,z),(x+dx*.45,3.2,z+.1),(x+dx,2.75,z+.72),
               (x+dx*.85+bend,1.4,z+.78),(x+dx*1.20,.15,z+1.5)],[.13,.14,.12,.09,.018])
        curve([(x+dx,2.75,z+.72),(x+dx+.5,2.0,z+.8),
               (x+dx-.2,.8,z+.85),(x+dx-.55,.13,z+1.55)],[.06,.05,.035,.01])
    curve([(x-1.7,2.75,z+.72),(x-1.1,2.1,z+.83),(x+.4,1.5,z+.84),
           (x+1.2,.65,z+.9),(x+1.7,.12,z+1.6)],[.075,.07,.055,.03,.01])
    curve([(x,2.5,z),(x+.12,4.8,z),(x-.25,h*.78,z-.2),(x+.2,h,z-.5)],[.61,.48,.32,.10])
    for k in range(5):
        a=k*math.tau/5+index; dx=math.sin(a); dz=math.cos(a)
        tip=(x+dx*2.6,h-.3+(k%2)*.5,z+dz*2.3)
        curve([(x,h*.65,z),(x+dx,h*.85,z+dz),tip],[.23,.16,.04])
        ell((tip[0],tip[1]+.5,tip[2]),(1.8,1.2,1.7),LEAF[k%3])
    ell((x,h+.4,z),(1.8,1.2,1.8),LEAF[index])
trees=[]; rng=random.Random(2005)
for _ in range(8000):
    x=rng.uniform(-16.7,16.7); z=rng.uniform(-21.8,17.0)
    if abs(x)<14.8 and z>-15.5: continue
    if abs(x)<3 or any((x-a)**2+(z-b)**2<2.3**2 for a,b,h in trees): continue
    trees.append((x,z,rng.uniform(6,9)))
    if len(trees)==40: break
for i,(x,z,h) in enumerate(trees):
    tube([(x,0,z),(x+.2,h*.7,z),(x-.1,h,z)],[.23,.16,.06],BARK)
    for j in range(3):
        a=i+j*math.tau/3; dx=math.sin(a); dz=math.cos(a)
        tube([(x,h*.5,z),(x+dx,h*.85,z+dz)],[.13,.03],BARK)
        ell((x+dx,h*.85,z+dz),(1.35,1.12,1.32),LEAF[(i+j)%3])
    ell((x,h,z),(1.1,1,1.1),LEAF[i%3])
# Same undergrowth in both tiers; no new content exclusive to Ultra.
for x,z in [(-9,1),(-7,-7),(10,-5),(11,6),(-10,9),(3,-10),(-3,-12),(-6,12)]:
    ell((x,.38,z),(.8,.55,.7),LEAF[1])

for name,(verts,faces) in BATCH.items():
    mesh=bpy.data.meshes.new(name); mesh.from_pydata(verts,[],faces); mesh.update()
    o=bpy.data.objects.new(name,mesh); bpy.context.collection.objects.link(o); material=bpy.data.materials[name]; mesh.materials.append(material)
    bpy.context.view_layer.objects.active=o; o.select_set(True)
    bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT'); bpy.ops.mesh.normals_make_consistent(inside=False); bpy.ops.object.mode_set(mode='OBJECT'); o.select_set(False)
    if name in [ROOTS.name,BARK.name]:
        for polygon in mesh.polygons: polygon.use_smooth=True
    if 'sandstone' in name.lower() or name==ROOTS.name:
        col=mesh.color_attributes.new(name='Weathering',type='BYTE_COLOR',domain='POINT')
        for i,v in enumerate(mesh.vertices):
            x,y,z=v.co; c=material.diffuse_color; q=.86+.12*math.sin(x*7+z*4)*math.sin(y*5-z*2)
            moss=max(0,math.sin(x*2.7+y*3.1)*math.sin(z*5.3))*.23 if name!=ROOTS.name else 0
            col.data[i].color=(c[0]*q*(1-moss),c[1]*q*(1+moss*.18),c[2]*q*(1-moss),1)
        vc=material.node_tree.nodes.new('ShaderNodeVertexColor'); vc.layer_name=col.name
        material.node_tree.links.new(vc.outputs['Color'],material.node_tree.nodes.get('Principled BSDF').inputs['Base Color'])
sc=bpy.context.scene; sc['provenance']='Illustrative compact Beng Mealea, not surveyed. Original geometry, no sacred figures or photograph textures.'
sc.world=bpy.data.worlds.new('Daylight'); sc.world.use_nodes=True
sc.world.node_tree.nodes['Background'].inputs[0].default_value=(.65,.75,.86,1); sc.world.node_tree.nodes['Background'].inputs[1].default_value=.65
bpy.ops.object.light_add(type='SUN'); bpy.context.object.rotation_euler=(.55,-.45,-.6); bpy.context.object.data.energy=2.3; bpy.context.object.data.angle=.15
sc.render.engine='CYCLES'; sc.cycles.samples=12; sc.cycles.use_denoising=True
sc.render.resolution_x=1280; sc.render.resolution_y=960; sc.render.resolution_percentage=100; sc.view_settings.view_transform='AgX'
views=[('overview',(29,30,35),(0,1.3,-2),32),('ruins',(1.3,3.0,-2.4),(0,1.0,-6.8),28),('roots',(6.6,2.6,4.7),(6.5,1.6,0),28),('walkway',(.15,1.65,15.3),(0,1.2,7),28)]
for name,pos,target,lens in views:
    bpy.ops.object.camera_add(location=xyz(pos)); cam=bpy.context.object; cam.name='Review '+name
    cam.rotation_euler=(Vector(xyz(target))-cam.location).to_track_quat('-Z','Y').to_euler(); cam.data.lens=lens; cam.data.clip_end=200; sc.camera=cam
    if '--no-render' not in sys.argv and (ULTRA or name=='overview'):
        sc.render.filepath=str(OUT/f'{TIER}-{name}.png'); bpy.ops.render.render(write_still=True)
sc.camera=bpy.data.objects['Review overview']; bpy.ops.wm.save_as_mainfile(filepath=str(OUT/f'beng-mealea-{TIER}.blend'))
bpy.ops.object.select_all(action='DESELECT'); meshes=[o for o in sc.objects if o.type=='MESH']
for o in meshes: o.select_set(True)
bpy.context.view_layer.objects.active=meshes[0]; dest=PUBLIC/f'beng-mealea-{TIER}.glb'
bpy.ops.export_scene.gltf(filepath=str(dest),export_format='GLB',use_selection=True,export_cameras=False,export_lights=False,export_animations=False,export_yup=True,export_meshopt_compression_enable=True,export_meshopt_extension='EXT_meshopt_compression')
tri=sum(len(p.vertices)-2 for o in meshes for p in o.data.polygons)
report={'tier':TIER,'triangles':tri,'drawCalls':len(meshes),'bytes':dest.stat().st_size,'trees':trees,'heroTrees':heroes,'enclosures':enclosures,'rubble':rubble,'libraries':libraries,'boardwalk':boardwalk,'originalSha256':original_hash,'sha256':hashlib.sha256(dest.read_bytes()).hexdigest(),'surveyed':False,'photographsEmbedded':False}
assert hashlib.sha256(source.read_bytes()).hexdigest()==original_hash
assert tri<(300000 if ULTRA else 120000)
(OUT/f'{TIER}-report.json').write_text(json.dumps(report,indent=2)); print('BENG_MEALEA_COMPLETE',TIER,tri,dest.stat().st_size,flush=True)
