"""Original illustrative Preah Khan (Angkor), not a survey or restoration proposal.
Blender -b -t 8 --python scripts/refine-preah-khan.py -- --normal/--ultra
"""
import ast, bpy, math, random, json, sys, hashlib
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'output/preah-khan-review-v2'; PUBLIC=ROOT/'public/models/local/preah-khan-refined-v2'
for folder in (OUT,PUBLIC): folder.mkdir(parents=True,exist_ok=True)
ULTRA='--normal' not in sys.argv; TIER='ultra' if ULTRA else 'normal'
source=ROOT/f'public/models/local/heritage-blender-v1/preah-khan-{TIER}.glb'
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
LATERITE=mat('Laterite enclosure',(.29,.235,.16))
helpers(ROOT/'scripts/refine-ta-prohm.py',{'block','wall','portal','gallery','curve'})

def enclosure(w,d,z,seed):
    # Four axial openings; shorten the side runs before the front/rear roof joints.
    for side in [-1,1]:
        for lr in [-1,1]:
            gallery(lr*(w/4+.7),z+side*d/2,w/2-1.4,seed=seed+lr,ruined=side<0)
            gallery(side*w/2,z+lr*(d/4+.4),d/2-2,math.pi/2,seed+side,ruined=True)
        portal(0,z+side*d/2,crown=side>0)

# Compact east (+Z) approach; north is +X. Distances are illustrative.
box((0,-.18,-2),(34,.36,40),EARTH)
box((0,.06,-2),(25,.12,29),FLOOR)  # front edge 12.5
box((0,.06,15.75),(3.0,.12,6.5),FLOOR)  # butt joint at 12.5
enclosure(22,22,-2,2); enclosure(12,12,-5,6)
for s in [-1,1]:
    box((s*14,.70,-2),(.45,1.4,29),LATERITE)
    box((s*7.7375,.70,12.5),(12.075,1.4,.45),LATERITE)
box((0,.70,-16.5),(27.55,1.4,.45),LATERITE)
portal(0,12.5,2.35,2,crown=True)
# Connecting corridors and repeated doorframes create the long axial perspective.
for side in [-1,1]: gallery(side*1.3,-1.5,3.1,math.pi/2,seed=5,ruined=True)
for z in [-3.0,-.15]: portal(0,z,2.05,1.5)
towers=[]
for x,z,w,h in [(0,-6,2.7,4.7),(-4.0,-8.5,1.6,3.5),(4.0,-8.5,1.6,3.5)]:
    towers.append([x,z,w,h]); chamber=2.35 if x==0 else 1.9
    for side in [-1,1]: wall(x+side*w*.43,z,w*1.15,chamber,math.pi/2,seed=3)
    wall(x,z-w*.55,w,chamber,seed=1)
    portal(x,z+w*.58,chamber,1.2 if x==0 else .8)
    box((x,chamber+.40,z),(w+.3,.28,w+.3),TRIM)
    lobed_crown(x,z,chamber+.54,w*.57,h-chamber-.3,1,True)

# Hall of Dancers: roofless rectangular column grid, clear central aisle.
# Abstract mouldings only: no invented apsara or Buddha figures.
hall_columns=[]
for x in [-3.2,-1.7,1.7,3.2]:
    for z in [3.0,4.6,6.2,7.8]:
        hall_columns.append([x,z])
        for j in range(5): block((x,.12+(j+.5)*.45,z),(.38,.44,.38),STONE[j%4])
        box((x,.22,z),(.55,.20,.55),TRIM)
        box((x,2.27,z),(.55,.20,.55),TRIM)
    box((x,2.50,5.4),(.49,.26,5.28),TRIM)
for z in [3.0,7.8]:
    # Butt-jointed beam bays, never coplanar crossing boxes.
    for a,b in [(-2.955,-1.945),(-1.455,1.455),(1.945,2.955)]:
        box(((a+b)/2,2.50,z),(b-a,.26,.49),TRIM)
    for x in [-2.4,-.8,.8,2.4]:
        block((x,2.93,z),(.90,.55,.36),STONE[1])
        arch(x,z+.20,2.66,.55,.30)
        if ULTRA:
            for k in range(3): ell((x+(k-1)*.23,2.57,z+.26),(.055,.055,.025),TRIM)

# Distinctive pavilion: round lower columns, moulded floor bands, rectangular
# upper window openings, open end bays and roofless, broken end pediments.
pavilion={'center':[7.4,5.4],'columnRows':2,'columnsPerRow':7,'upperFloor':2.68}
px,pz=pavilion['center']; col_positions=[]
box((px,.21,pz),(3.2,.18,6.8),FLOOR)
for side in [-1,1]:
    for k in range(7):
        x=px+side*1.10; z=pz-2.85+k*.95; col_positions.append([x,z])
        lathe(x,z,[(.30,.26),(.40,.29),(.48,.25),(.55,.22),(2.18,.21),(2.26,.27),(2.37,.30),(2.45,.28)],TRIM,n=16 if ULTRA else 10)
        if ULTRA:
            for yy in [.85,1.20,1.55,1.90]: lathe(x,z,[(yy,.218),(yy+.025,.218)],STONE[2],n=16)
    # Floor beam at each long facade, separate from the inset slab.
    box((px+side*1.10,2.55,pz),(.48,.20,6.25),TRIM)
box((px,2.56,pz),(1.72,.24,6.25),STONE[1])
for side in [-1,1]:
    x=px+side*1.10
    box((x,2.73,pz),(.45,.16,6.25),TRIM)
    for k in range(7):
        z=pz-2.85+k*.95
        for j in range(3): block((x,2.81+(j+.5)*.47,z),(.30,.46,.30),STONE[(j+k)%4])
        box((x,4.25,z),(.45,.15,.43),TRIM)
    box((x,4.42,pz),(.45,.19,6.25),TRIM)
    # Low sills only in the five central bays; end bays stay open to the floor.
    for k in range(1,5):
        z=pz-2.85+(k+.5)*.95
        box((x,2.98,z),(.31,.34,.65),STONE[1])
    if ULTRA:
        for k in range(24):
            z=pz-2.85+k*.25
            ell((x+side*.23,4.42,z),(.035,.055,.055),TRIM)
for side in [-1,1]:
    z=pz+side*2.85
    box((px,4.42,z),(1.75,.19,.45),TRIM)
    # Fragmentary triangular stone end, no speculative full roof.
    add(STONE[2],[(px-1.22,4.52,z-.17),(px+.40,4.52,z-.17),(px-.55,5.30,z-.17),
                  (px-1.22,4.52,z+.17),(px+.40,4.52,z+.17),(px-.55,5.30,z+.17)],
                  [(0,2,1),(3,4,5),(0,1,4,3),(1,2,5,4),(2,0,3,5)])
pavilion['columns']=col_positions

# Low ruined courtyard buildings, staying away from the main walking axis.
for x,z in [(-7.7,4.8),(7.8,-10.8),(-7.5,-10.5)]: gallery(x,z,3.0,seed=4,ruined=True)
heroes=[(-10.5,-7.0,11.7)]
for x,z,h in heroes:
    for j in range(7):
        dx=(j-3)*.40; bend=math.sin(j*1.7)*.35
        curve([(x,6.7,z),(x+dx*.25,4.4,z),(x+dx,3.1,z+.3),(x+dx*1.3+bend,2.7,z+.9),(x+dx*1.4,1.1,z+1.1),(x+dx*1.7,.13,z+2.0)], [.15,.20,.23,.20,.13,.025])
    curve([(x,2.8,z),(x+.12,4.8,z),(x-.14,h*.75,z-.15),(x+.3,h,z-.4)],[.65,.53,.35,.12])
    for k in range(5):
        a=k*math.tau/5; dx=math.sin(a); dz=math.cos(a)
        tip=(x+dx*2.7,h-.4+(k%2)*.6,z+dz*2.6)
        curve([(x,h*.62,z),(x+dx,h*.85,z+dz),tip],[.28,.18,.045])
        ell((tip[0],tip[1]+.6,tip[2]),(1.9,1.2,1.8),LEAF[k%3])
    ell((x,h+.3,z),(2.0,1.3,1.9),LEAF[1])
rng=random.Random(1191); rubble=[]
for cx,cz in [(-7.2,1.5),(8,-3.5),(-7,-12.8),(7,10.8)]:
    for i in range(16):
        x=cx+rng.uniform(-1.3,1.3); z=cz+rng.uniform(-.9,.9)
        w=rng.uniform(.35,.75); h=rng.uniform(.22,.48); d=rng.uniform(.3,.6)
        rubble.append([x,.12+h/2,z,w,h,d]); block((x,.12+h/2,z),(w,h,d),STONE[i%4],tilt=rng.uniform(-.6,.6))
trees=[]; rng=random.Random(1991)
for _ in range(8000):
    x=rng.uniform(-16,16); z=rng.uniform(-21,16.5)
    if abs(x)<14.8 and z>-17.5: continue
    if abs(x)<3 or any((x-a)**2+(z-b)**2<2.4**2 for a,b,h in trees): continue
    trees.append((x,z,rng.uniform(5.8,8.5)))
    if len(trees)==32: break
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
    if 'sandstone' in name.lower() or name==ROOTS.name:
        col=mesh.color_attributes.new(name='Weathering',type='BYTE_COLOR',domain='POINT')
        for i,v in enumerate(mesh.vertices):
            x,y,z=v.co; c=material.diffuse_color; q=.86+.12*math.sin(x*7+z*4)*math.sin(y*5-z*2)
            moss=max(0,math.sin(x*2.7+y*3.1)*math.sin(z*5.3))*.23 if name!=ROOTS.name else 0
            col.data[i].color=(c[0]*q*(1-moss),c[1]*q*(1+moss*.18),c[2]*q*(1-moss),1)
        vc=material.node_tree.nodes.new('ShaderNodeVertexColor'); vc.layer_name=col.name
        material.node_tree.links.new(vc.outputs['Color'],material.node_tree.nodes.get('Principled BSDF').inputs['Base Color'])
sc=bpy.context.scene; sc['provenance']='Illustrative compact Preah Khan at Angkor, not surveyed. Original geometry, no sacred figures or photograph textures.'
sc.world=bpy.data.worlds.new('Daylight'); sc.world.use_nodes=True
sc.world.node_tree.nodes['Background'].inputs[0].default_value=(.65,.75,.86,1); sc.world.node_tree.nodes['Background'].inputs[1].default_value=.65
bpy.ops.object.light_add(type='SUN'); bpy.context.object.rotation_euler=(.55,-.45,-.6); bpy.context.object.data.energy=2.3; bpy.context.object.data.angle=.15
sc.render.engine='CYCLES'; sc.cycles.samples=12; sc.cycles.use_denoising=True
sc.render.resolution_x=1280; sc.render.resolution_y=960; sc.render.resolution_percentage=100; sc.view_settings.view_transform='AgX'
views=[('overview',(27,27,33),(0,1.7,-2),35),('pavilion',(3.2,3.2,7.8),(7.4,2.6,5.4),24),('galleries',(.35,1.55,8.6),(0,1.6,-3),28),('hall',(-6.5,4.6,7.5),(0,1.7,5.4),27)]
for name,pos,target,lens in views:
    bpy.ops.object.camera_add(location=xyz(pos)); cam=bpy.context.object; cam.name='Review '+name
    cam.rotation_euler=(Vector(xyz(target))-cam.location).to_track_quat('-Z','Y').to_euler(); cam.data.lens=lens; cam.data.clip_end=200; sc.camera=cam
    if '--no-render' not in sys.argv and (ULTRA or name=='overview'):
        sc.render.filepath=str(OUT/f'{TIER}-{name}.png'); bpy.ops.render.render(write_still=True)
sc.camera=bpy.data.objects['Review overview']; bpy.ops.wm.save_as_mainfile(filepath=str(OUT/f'preah-khan-{TIER}.blend'))
bpy.ops.object.select_all(action='DESELECT'); meshes=[o for o in sc.objects if o.type=='MESH']
for o in meshes: o.select_set(True)
bpy.context.view_layer.objects.active=meshes[0]; dest=PUBLIC/f'preah-khan-{TIER}.glb'
bpy.ops.export_scene.gltf(filepath=str(dest),export_format='GLB',use_selection=True,export_cameras=False,export_lights=False,export_animations=False,export_yup=True,export_meshopt_compression_enable=True,export_meshopt_extension='EXT_meshopt_compression')
tri=sum(len(p.vertices)-2 for o in meshes for p in o.data.polygons)
report={'tier':TIER,'triangles':tri,'drawCalls':len(meshes),'bytes':dest.stat().st_size,'trees':trees,'heroTrees':heroes,'towers':towers,'rubble':rubble,'pavilion':pavilion,'hallColumns':hall_columns,'originalSha256':original_hash,'sha256':hashlib.sha256(dest.read_bytes()).hexdigest(),'surveyed':False,'photographsEmbedded':False}
assert hashlib.sha256(source.read_bytes()).hexdigest()==original_hash
assert tri<(300000 if ULTRA else 120000)
(OUT/f'{TIER}-report.json').write_text(json.dumps(report,indent=2)); print('PREAH_KHAN_COMPLETE',TIER,tri,dest.stat().st_size,flush=True)
