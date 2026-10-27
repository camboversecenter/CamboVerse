"""Reference-led illustrative Ta Prohm, not a survey or a restoration proposal.
Blender --background --threads 8 --python scripts/refine-ta-prohm.py -- --normal/--ultra
"""
import ast, bpy, math, random, json, sys, hashlib
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'output/ta-prohm-review-v2'; PUBLIC=ROOT/'public/models/local/ta-prohm-refined-v2'
for folder in (OUT,PUBLIC): folder.mkdir(parents=True,exist_ok=True)
ULTRA='--normal' not in sys.argv; TIER='ultra' if ULTRA else 'normal'
source=ROOT/f'public/models/local/heritage-blender-v1/ta-prohm-{TIER}.glb'
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
STONE=[mat('Weathered sandstone '+str(i),c) for i,c in enumerate([(.23,.25,.20),(.30,.29,.23),(.21,.23,.19),(.35,.32,.26)])]
TRIM=mat('Carved sandstone',(.36,.35,.28)); ROOF=mat('Corbelled stone roofs',(.22,.24,.19))
FLOOR=mat('Courtyard paving',(.34,.31,.24)); EARTH=mat('Forest floor',(.145,.18,.09))
BARK=mat('Forest trunks',(.19,.16,.105)); ROOTS=mat('Pale living roots',(.52,.49,.39))
LEAF=[mat('Forest canopy '+str(i),(.035+i*.022,.13+i*.033,.025+i*.015)) for i in range(3)]
LATERITE=mat('Laterite enclosure',(.28,.22,.15))

def block(p,s,m,seed=0,tilt=0):
    # Small bevels break silhouettes; the shared material batching remains cheap.
    x,y,z=p; w,h,d=s; c=min(w,d)*.09
    outline=[(-w/2+c,-d/2),(w/2-c,-d/2),(w/2,-d/2+c),(w/2,d/2-c),(w/2-c,d/2),(-w/2+c,d/2),(-w/2,d/2-c),(-w/2,-d/2+c)]
    v=[]
    for yy in [-h/2,h/2]:
        for a,b in outline:
            v.append((x+a*math.cos(tilt)-b*math.sin(tilt),y+yy,z+a*math.sin(tilt)+b*math.cos(tilt)))
    add(m,v,[tuple(range(7,-1,-1)),tuple(range(8,16))]+[(i,(i+1)%8,(i+1)%8+8,i+8) for i in range(8)])

def wall(x,z,length,h=2.15,angle=0,ruined=False,seed=0):
    rows=6 if ULTRA else 4; n=max(2,round(length/(.65 if ULTRA else .95)))
    for j in range(rows):
        for i in range(n):
            if ruined and j>rows*.5 and (i+seed*3)%7<2: continue
            a=-length/2+(i+.5)*length/n
            block((x+a*math.cos(angle),.12+(j+.5)*h/rows,z-a*math.sin(angle)),(length/n-.015,h/rows-.012,.48),STONE[(i+j+seed)%4],i+j*100,angle*-1)

def portal(x,z,h=2.1,width=1.5,crown=False):
    for side in [-1,1]:
        for j in range(5): block((x+side*(width/2+.23),.12+(j+.5)*h/5,z),(.46,h/5-.01,1.5),STONE[j%4])
        lathe(x+side*(width/2+.02),z+.78,[(.12,.10),(.30,.13),(.36,.09),(h-.10,.09),(h,.13)],TRIM,n=10 if ULTRA else 6)
    block((x,h+.23,z),(width+1.15,.22,1.6),TRIM)
    roof_segment(x,z,width+1.15,h+.34,0)
    arch(x,z+.83,.12,width,h-.1)
    if crown: lobed_crown(x,z,h+.95,.88,1.5,2,True)

def gallery(x,z,length,angle=0,seed=0,ruined=False):
    wall(x-.46*math.sin(angle),z-.46*math.cos(angle),length,angle=angle,ruined=ruined,seed=seed)
    n=max(2,round(length/.9)); bay=length/n
    for i in range(n):
        a=-length/2+(i+.5)*bay
        px=x+a*math.cos(angle)+.53*math.sin(angle); pz=z-a*math.sin(angle)+.53*math.cos(angle)
        for j in range(3): block((px,.12+(j+.5)*.68,pz),(.24,.67,.24),TRIM)
        if not ruined or (i+seed)%6>1:
            cx=x+a*math.cos(angle); cz=z-a*math.sin(angle)
            box((cx,2.28,cz),(bay,.20,1.65) if angle==0 else (1.65,.20,bay),TRIM)
            roof_segment(cx,cz,bay-.012,2.38,angle)

def enclosure(w,d,z,seed):
    for side in [-1,1]:
        for lr in [-1,1]:
            gallery(lr*(w/4+.7),z+side*d/2,w/2-1.4,seed=seed+lr,ruined=side<0)
            gallery(side*w/2,z+lr*(d/4+.7),d/2-1.4,math.pi/2,seed+side,ruined=True)
        portal(0,z+side*d/2,crown=side>0)

# A flat monastery composition. East approach is +Z; positions are illustrative.
box((0,-.18,-2),(32,.36,36),EARTH)
box((0,.06,-3),(21,.12,23),FLOOR)
box((0,.04,11),(2.8,.08,5),FLOOR)
enclosure(20,20,-3,2); enclosure(12,12,-4,6)
# Low outer laterite walls, with the east entrance left open.
for side in [-1,1]:
    box((side*13,.65,-3),(.5,1.3,26),LATERITE)
    box((side*7.5,.65,10),(11,1.3,.5),LATERITE)
box((0,.65,-16),(26,1.3,.5),LATERITE)
portal(0,10,2.35,2,crown=True)
# Central shrine and two small ancillary shrines. No invented figurative carving.
towers=[]
for x,z,w,h in [(0,-5,2.7,5),(-4,-8,1.6,3.7),(4,-8,1.6,3.5)]:
    towers.append([x,z,w,h]); chamber=2.4 if x==0 else 1.9
    for side in [-1,1]: wall(x+side*w*.43,z,w*1.15,chamber,math.pi/2,seed=3)
    wall(x,z-w*.55,w,chamber,seed=1)
    portal(x,z+w*.58,chamber,1.2 if x==0 else .8)
    box((x,chamber+.40,z),(w+.3,.28,w+.3),TRIM)
    lobed_crown(x,z,chamber+.54,w*.57,h-chamber-.3,1,False)
# Roofless columned hall and a pair of smaller ruined courtyard buildings.
for x in [-3.4,3.4]:
    for z in [3.8,5.5]:
        for j in range(4): block((x,.12+(j+.5)*.5,z),(.38,.49,.38),TRIM)
    box((x,2.2,4.65),(.5,.20,2.2),TRIM)
for x,z in [(-7,4.3),(7,-11.5)]:
    gallery(x,z,3.1,seed=4,ruined=True)

def curve(points,radii,material=ROOTS):
    # Catmull-Rom interpolation gives flowing roots rather than angular pipes.
    p=[Vector(q) for q in points]; v=[]; rr=[]; steps=6 if ULTRA else 3
    for i in range(len(p)-1):
        a,b,c,d=p[max(0,i-1)],p[i],p[i+1],p[min(len(p)-1,i+2)]
        for j in range(steps):
            t=j/steps
            v.append(tuple(.5*((2*b)+(-a+c)*t+(2*a-5*b+4*c-d)*t*t+(-a+3*b-3*c+d)*t*t*t)))
            rr.append(radii[i]*(1-t)+radii[i+1]*t)
    v.append(tuple(p[-1])); rr.append(radii[-1]); tube(v,rr,material,12 if ULTRA else 7)

heroes=[(5.2,2.0,11.6),(-9.8,-3.8,13.0),(-5.8,-7.0,10.2)]
for index,(x,z,h) in enumerate(heroes):
    # Roots diverge across the roof then drape over its facade to the ground.
    for j in range(7):
        dx=(j-3)*.43; phase=j*1.7+index; bend=math.sin(phase)*.48
        length=1.2+abs(j-3)*.24; radius=.17+(j%3)*.045
        curve([(x,.0+h*.63,z),(x+dx*.22,4.4,z+.1),(x+dx,3.12,z+.28),(x+dx*1.30+bend,2.72,z+.94),(x+dx*1.45-bend*.4,1.13,z+1.08),(x+dx*1.65+bend*.5,.24,z+1.5),(x+dx*1.8,.10,z+length+1.0)],[.16,radius,radius*1.2,radius,radius*.85,.12,.025])
        if ULTRA:
            curve([(x+dx,3.15,z+.30),(x+dx*1.3-bend,2.5,z+1.01),(x+dx*1.6+bend,1.3,z+1.14),(x+dx*1.8,.15,z+1.8)],[.06,.07,.045,.012])
    # Diagonal cross-roots and branching tendrils avoid a repeated curtain shape.
    for j in range(5):
        dx=(j-2)*.55
        curve([(x+dx,3.2,z+.5),(x+dx+.65,2.7,z+.94),(x+dx-.15,1.9,z+1.08),(x+dx-.6,.8,z+1.15),(x+dx-.8,.13,z+2.0)],[.09,.08,.06,.035,.01])
    # Strong asymmetrical buttress/trunk and broad elevated branching crown.
    curve([(x,2.9,z),(x+.10,4.6,z),(x-.14,h*.72,z-.15),(x+.30,h,z-.4)],[.64,.55,.38,.14])
    for k in range(5):
        a=index+k*math.tau/5; dx=math.sin(a); dz=math.cos(a)
        tip=(x+dx*3.0,h-.5+(k%2)*.7,z+dz*2.8)
        curve([(x,h*.64,z),(x+dx*.9,h*.83,z+dz*.8),tip],[.28,.20,.045])
        ell((tip[0],tip[1]+.65,tip[2]),(2.0,1.15,1.9),LEAF[k%3])
    ell((x,h+.35,z),(2.1,1.4,2),LEAF[index%3])

# Fallen blocks are deterministic and stay out of the continuous axial route.
rng=random.Random(1186); rubble=[]
for centerx,centerz in [(7.8,5),(-7.8,-10.8),(8.5,-6.5),(-4,0)]:
    for i in range(19):
        x=centerx+rng.uniform(-1.4,1.4); z=centerz+rng.uniform(-1.3,1.3)
        w=rng.uniform(.35,.8); h=rng.uniform(.20,.55); d=rng.uniform(.3,.65); y=.12+h/2+(i%4==0)*.20
        rubble.append([x,y,z,w,h,d]); block((x,y,z),(w,h,d),STONE[i%4],i,rng.uniform(-.65,.65))
trees=[]; rng=random.Random(1986)
for _ in range(4000):
    x=rng.uniform(-15.3,15.3); z=rng.uniform(-18.8,14.5)
    if abs(x)<13.7 and z>-16.8: continue
    if abs(x)<3 or any((x-a)**2+(z-b)**2<2.2**2 for a,b,h in trees): continue
    trees.append((x,z,rng.uniform(5.8,8.8)))
    if len(trees)==44: break
for i,(x,z,h) in enumerate(trees):
    tube([(x,0,z),(x+.20,h*.7,z),(x-.1,h,z)],[.23,.17,.06],BARK)
    for j in range(3):
        a=i+j*math.tau/3; dx=math.sin(a); dz=math.cos(a)
        tube([(x,h*.5,z),(x+dx,h*.85,z+dz)],[.13,.03],BARK)
        ell((x+dx,h*.85,z+dz),(1.35,1.12,1.32),LEAF[(i+j)%3])
    ell((x,h,z),(1.1,1.0,1.1),LEAF[i%3])

for name,(verts,faces) in BATCH.items():
    mesh=bpy.data.meshes.new(name); mesh.from_pydata(verts,[],faces); mesh.update()
    o=bpy.data.objects.new(name,mesh); bpy.context.collection.objects.link(o); material=bpy.data.materials[name]; mesh.materials.append(material)
    bpy.context.view_layer.objects.active=o; o.select_set(True)
    bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT'); bpy.ops.mesh.normals_make_consistent(inside=False); bpy.ops.object.mode_set(mode='OBJECT'); o.select_set(False)
    if name in [ROOTS.name,BARK.name]:
        for polygon in mesh.polygons: polygon.use_smooth=True
    if 'stone' in name.lower() or name==ROOTS.name:
        col=mesh.color_attributes.new(name='Weathering',type='BYTE_COLOR',domain='POINT')
        for i,v in enumerate(mesh.vertices):
            x,y,z=v.co; c=material.diffuse_color; q=.86+.12*math.sin(x*7+z*4)*math.sin(y*5-z*2)
            moss=max(0,math.sin(x*2.7+y*3.1)*math.sin(z*5.3))*.24 if name!=ROOTS.name else 0
            col.data[i].color=(c[0]*q*(1-moss),c[1]*q*(1+moss*.18),c[2]*q*(1-moss),1)
        vc=material.node_tree.nodes.new('ShaderNodeVertexColor'); vc.layer_name=col.name
        material.node_tree.links.new(vc.outputs['Color'],material.node_tree.nodes.get('Principled BSDF').inputs['Base Color'])
sc=bpy.context.scene; sc['provenance']='Illustrative compact Ta Prohm exterior, not a survey. Original geometry, no photograph textures.'
sc.world=bpy.data.worlds.new('Daylight'); sc.world.use_nodes=True
sc.world.node_tree.nodes['Background'].inputs[0].default_value=(.65,.75,.86,1); sc.world.node_tree.nodes['Background'].inputs[1].default_value=.65
bpy.ops.object.light_add(type='SUN'); bpy.context.object.rotation_euler=(.55,-.45,-.6); bpy.context.object.data.energy=2.3; bpy.context.object.data.angle=.15
sc.render.engine='CYCLES'; sc.cycles.samples=12; sc.cycles.use_denoising=True
sc.render.resolution_x=1280; sc.render.resolution_y=960; sc.render.resolution_percentage=100; sc.view_settings.view_transform='AgX'
views=[('overview',(25,25,30),(0,2,-2),35),('roots',(9,4.5,8.5),(5.2,2.8,2.7),32),('courtyard',(-3,3.2,-1),(-5.8,2.4,-6.5),30),('entrance',(3.5,3.4,16),(0,1.6,10),32)]
for name,pos,target,lens in views:
    bpy.ops.object.camera_add(location=xyz(pos)); cam=bpy.context.object; cam.name='Review '+name
    cam.rotation_euler=(Vector(xyz(target))-cam.location).to_track_quat('-Z','Y').to_euler(); cam.data.lens=lens; cam.data.clip_end=200; sc.camera=cam
    if '--no-render' not in sys.argv and (ULTRA or name=='overview'):
        sc.render.filepath=str(OUT/f'{TIER}-{name}.png'); bpy.ops.render.render(write_still=True)
sc.camera=bpy.data.objects['Review overview']; bpy.ops.wm.save_as_mainfile(filepath=str(OUT/f'ta-prohm-{TIER}.blend'))
bpy.ops.object.select_all(action='DESELECT'); meshes=[o for o in sc.objects if o.type=='MESH']
for o in meshes: o.select_set(True)
bpy.context.view_layer.objects.active=meshes[0]; dest=PUBLIC/f'ta-prohm-{TIER}.glb'
bpy.ops.export_scene.gltf(filepath=str(dest),export_format='GLB',use_selection=True,export_cameras=False,export_lights=False,export_animations=False,export_yup=True,export_meshopt_compression_enable=True,export_meshopt_extension='EXT_meshopt_compression')
tri=sum(len(p.vertices)-2 for o in meshes for p in o.data.polygons)
report={'tier':TIER,'triangles':tri,'drawCalls':len(meshes),'bytes':dest.stat().st_size,'trees':trees,'heroTrees':heroes,'towers':towers,'rubble':rubble,'originalSha256':original_hash,'sha256':hashlib.sha256(dest.read_bytes()).hexdigest(),'surveyed':False,'photographsEmbedded':False}
assert hashlib.sha256(source.read_bytes()).hexdigest()==original_hash
assert tri<(350000 if ULTRA else 120000)
(OUT/f'{TIER}-report.json').write_text(json.dumps(report,indent=2)); print('TA_PROHM_COMPLETE',TIER,tri,dest.stat().st_size,flush=True)
