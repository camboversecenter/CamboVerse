"""Original stylised rural farm assets. Not a measured dwelling or botanical model.
Blender -b -t 8 --python scripts/build-farm-visuals.py -- --normal/--ultra
Exports reusable named components; review rice instances are not baked into GLB.
"""
import ast, bpy, math, random, json, sys, hashlib
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'output/farm-visuals-v3'; PUBLIC=ROOT/'public/models/local/farm-visuals-v3'
for p in (OUT,PUBLIC): p.mkdir(parents=True,exist_ok=True)
LAYOUT=json.loads((ROOT/'src/farmVisualLayout.json').read_text())
ULTRA='--normal' not in sys.argv; TIER='ultra' if ULTRA else 'normal'
bpy.ops.wm.read_factory_settings(use_empty=True); bpy.context.preferences.filepaths.save_version=0
BATCH={}; COMPONENTS={}
helper=ROOT/'scripts/refine-oudong.py'; names={'xyz','mat','add','box','tube','ell'}
nodes=[n for n in ast.parse(helper.read_text(encoding='utf-8')).body if isinstance(n,ast.FunctionDef) and n.name in names]
exec(compile(ast.Module(body=nodes,type_ignores=[]),str(helper),'exec'),globals())
bpy.ops.mesh.primitive_uv_sphere_add(segments=16 if ULTRA else 10,ring_count=10 if ULTRA else 6)
o=bpy.context.object; SV=[tuple(v.co) for v in o.data.vertices]; SF=[tuple(p.vertices) for p in o.data.polygons]; bpy.data.objects.remove(o,do_unlink=True)
EARTH=mat('Earth',(.25,.29,.095)); PATH=mat('Path',(.49,.37,.21)); MUD=mat('Mud',(.23,.19,.105))
WOOD=mat('Timber',(.26,.14,.065)); PLANK=mat('Planks',(.43,.27,.12)); STRAW=mat('Thatch',(.52,.39,.17)); ROOF=mat('Roof',(.38,.17,.09))
LEAF=mat('Foliage',(.12,.29,.055)); DARKLEAF=mat('Foliage shade',(.065,.19,.045)); WATER=mat('Canal water',(.16,.32,.29))
STONE=mat('Stone',(.35,.34,.25)); SKIN=mat('Buffalo hide',(.14,.16,.17)); HORN=mat('Horn and hooves',(.065,.074,.06)); EYE=mat('Eyes',(.012,.014,.011))
CLOTH=mat('Indigo cloth',(.07,.15,.23)); FLESH=mat('Skin',(.46,.26,.13)); HAT=mat('Woven hat',(.62,.47,.24))
RICE=mat('Rice leaves',(.32,.53,.09)); GRAIN=mat('Rice grain',(.68,.48,.12))

def ribbon(points,widths,m,fold=.2):
    verts=[]; faces=[]
    for i,(p,w) in enumerate(zip(points,widths)):
        tangent=Vector(points[min(i+1,len(points)-1)])-Vector(points[max(0,i-1)])
        side=tangent.cross(Vector((0,1,0))).normalized()
        if side.length<.1: side=Vector((1,0,0))
        verts.extend([tuple(Vector(p)-side*w),(p[0],p[1]+w*fold,p[2]),tuple(Vector(p)+side*w)])
    for i in range(len(points)-1):
        a=3*i; b=a+3; faces.extend([(a,b,a+1),(a+1,b,b+1),(a+1,b+1,a+2),(a+2,b+1,b+2)])
    add(m,verts,faces); m.surface_render_method='DITHERED'; m.use_backface_culling=False

def finish(prefix,smooth=False):
    global BATCH
    objects=[]
    for name,(verts,faces) in BATCH.items():
        mesh=bpy.data.meshes.new(prefix+'_'+name); mesh.from_pydata(verts,[],faces); mesh.update()
        ob=bpy.data.objects.new(prefix+'_'+name,mesh); bpy.context.collection.objects.link(ob); material=bpy.data.materials[name]; mesh.materials.append(material)
        bpy.context.view_layer.objects.active=ob; ob.select_set(True)
        bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT'); bpy.ops.mesh.normals_make_consistent(inside=False); bpy.ops.object.mode_set(mode='OBJECT'); ob.select_set(False)
        if smooth:
            for p in mesh.polygons: p.use_smooth=True
        if prefix=='Env' or any(n.type=='VERTEX_COLOR' for n in material.node_tree.nodes):
            col=mesh.color_attributes.new(name='Surface variation',type='BYTE_COLOR',domain='POINT')
            for i,v in enumerate(mesh.vertices):
                q=.83+.17*(.5+.5*math.sin(v.co.x*6+v.co.y*3)*math.cos(v.co.z*8)); c=material.diffuse_color
                col.data[i].color=(*[c[k]*q for k in range(3)],1)
            vc=next((n for n in material.node_tree.nodes if n.type=='VERTEX_COLOR'),None) or material.node_tree.nodes.new('ShaderNodeVertexColor'); vc.layer_name=col.name
            material.node_tree.links.new(vc.outputs['Color'],material.node_tree.nodes.get('Principled BSDF').inputs['Base Color'])
        objects.append(ob)
    COMPONENTS[prefix]=objects; BATCH={}

def roof(x,z,y,w,d,rise,m):
    # Closed gabled roof, ridge along Z; unlike the old four-sided cone.
    v=[(x-w/2,y,z-d/2),(x,y+rise,z-d/2),(x+w/2,y,z-d/2),
       (x-w/2,y,z+d/2),(x,y+rise,z+d/2),(x+w/2,y,z+d/2)]
    add(m,v,[(0,1,4,3),(1,2,5,4),(0,2,1),(3,4,5),(0,3,5,2)])
    tube([(x,y+rise+.025,z-d/2-.05),(x,y+rise+.025,z+d/2+.05)],.055,WOOD)
    for zz in [z-d/2,z+d/2]:
        tube([(x-w/2-.04,y,zz),(x,y+rise+.05,zz),(x+w/2+.04,y,zz)],.045,WOOD)
    # Individual ridges read as corrugated/thatch bands, reduced in Normal.
    for k in range(23 if ULTRA else 12):
        zz=z-d/2+(k+.5)*d/(23 if ULTRA else 12)
        tube([(x-w/2,y+.02,zz),(x,y+rise+.03,zz),(x+w/2,y+.02,zz)],.018 if ULTRA else .025,m,4)

def house(x,z,small=False):
    w,d,floor=(1.8,1.5,.8) if small else (2.7,2.3,1.05)
    top=floor+(1.05 if small else 1.6)
    for a in [-1,1]:
        for b in [-1,1]:
            box((x+a*(w/2-.15),floor/2,z+b*(d/2-.12)),(.12,floor,.12),WOOD)
    box((x,floor-.06,z),(w,.12,d+.65),PLANK)
    count=10 if small else 15
    for i in range(count):
        xx=x-w/2+(i+.5)*w/count
        box((xx,(floor+top)/2,z-d/2),(w/count-.012,top-floor,.07),PLANK)
        # Front leaves an entry; side windows are actual gaps.
        if abs(xx-x)>(.65 if small else .42): box((xx,(floor+top)/2,z+d/2),(w/count-.012,top-floor,.07),PLANK)
    for side in [-1,1]:
        for i in range(12):
            zz=z-d/2+(i+.5)*d/12
            if abs(zz-z)<.42:
                box((x+side*w/2,floor+.25,zz),(.07,.5,d/12-.01),PLANK)
                box((x+side*w/2,top-.15,zz),(.07,.30,d/12-.01),PLANK)
            else: box((x+side*w/2,(floor+top)/2,zz),(.07,top-floor,d/12-.01),PLANK)
        tube([(x+side*(w/2-.06),floor,z+d/2+.47),(x+side*(w/2-.06),floor+.65,z+d/2+.47)],.04,WOOD)
        box((x+side*(w/4+.2),floor+.6,z+d/2+.47),(w/2-.4,.065,.065),WOOD)
    roof(x,z,top+.10,w+.55,d+.65,.65 if small else .95,STRAW if small else ROOF)
    for i in range(6 if not small else 4):
        n=6 if not small else 4; yy=floor*(i+1)/n
        box((x,yy-.055,z+d/2+.6+(n-i-1)*.18),(.68,.11,.23),PLANK)
    for side in [-1,1]:
        tube([(x+side*.38,.15,z+d/2+1.6),(x+side*.38,floor,z+d/2+.55)],.045,WOOD)
    if small:
        # Sacks are rendered dynamically in the open front bay.
        return
    for xx in [-.9,.9]:
        tube([(x+xx,.12,z),(x-xx,floor-.13,z)],.035,WOOD)
    # A suspended hammock under the veranda, a water jar and timber shutters.
    ribbon([(x-.9,.63,z+.55),(x,.30,z+.55),(x+.9,.63,z+.55)],[.16,.28,.16],CLOTH)
    ell((x-1.1,.34,z+1.85),(.24,.33,.24),STRAW)

# Landscape: open central field, footpath, canals and neighbouring paddies.
box((0,-.14,0),(55,.22,55),EARTH)
box((0,-.01,3.15),(14,.04,.65),PATH)
box((-3.05,-.005,-.1),(.55,.05,7.2),PATH)
for x in [-13,-8,0,8,13]:
    for z in [-13,-8]:
        box((x,-.015,z),(4.6,.035,4.3),MUD if (x+z)%3 else EARTH)
        for s in [-1,1]: box((x+s*2.35,.04,z),(.16,.13,4.6),EARTH)
        for s in [-1,1]: box((x,.04,z+s*2.2),(4.54,.13,.16),EARTH)
box((5.1,-.055,2.3),(1.0,.035,10),WATER)
for x in [4.52,5.68]: box((x,.01,2.3),(.16,.12,10.3),EARTH)
for i in range(11): box((4.4+i*.13,.12,3.2),(.12,.10,.75),PLANK)
house(LAYOUT['house'][0],LAYOUT['house'][2]); house(LAYOUT['granary'][0],LAYOUT['granary'][2],True)
for x in [-7,-6,-5,-4,-3,-2]:
    tube([(x,0,-6),(x,.8,-6)],[.06,.04],WOOD)
for y in [.3,.65]: tube([(-7,y,-6),(-2,y,-6)],.035,WOOD)
# Fan-leaf palms: folded fans and radiating ribs, not rectangular sticks.
for x,z,h in LAYOUT['palms']:
    tube([(x,0,z),(x+.08,h*.4,z),(x+.15,h*.8,z),(x+.12,h,z)],[.16,.12,.10,.12],WOOD)
    for k in range(10):
        a=k*math.tau/10; dx,dz=math.sin(a),math.cos(a)
        tip=(x+dx*1.2,h+.10+(k%3)*.12,z+dz*1.2)
        tube([(x+.12,h,z),tip],[.035,.014],DARKLEAF)
        for ray in range(7 if ULTRA else 4):
            theta=a+(ray/((7 if ULTRA else 4)-1)-.5)*1.6
            end=(tip[0]+math.sin(theta)*.75,tip[1]-.28,tip[2]+math.cos(theta)*.75)
            ribbon([tip,((tip[0]+end[0])/2,tip[1]+.04,(tip[2]+end[2])/2),end],[.01,.12,0],LEAF)
# Banana clump behind the house and tree line beyond the neighbouring fields.
for x,z in [(-6.3,-2.9),(-6.7,-3.6),(-6.3,-4.2)]:
    h=2.2+(z%1)*.4; tube([(x,0,z),(x,h,z)],[.13,.08],LEAF)
    for k in range(7):
        a=k*math.tau/7; dx,dz=math.sin(a),math.cos(a)
        ribbon([(x,h-.4,z),(x+dx*.5,h+.25,z+dz*.5),(x+dx*1.3,h+.1,z+dz*1.3),(x+dx*1.65,h-.65,z+dz*1.65)],[.02,.27,.24,0],LEAF)
rng=random.Random(730); trees=[]
for i in range(28):
    a=math.pi*.42+i*math.pi*1.22/27; r=17+rng.random()*4
    x=math.sin(a)*r; z=math.cos(a)*r-3; h=rng.uniform(3.8,6.4); trees.append([x,z,h])
    tube([(x,0,z),(x,h*.85,z)],[.18,.07],WOOD)
    for k in range(3): ell((x+math.sin(k*2.1)*.65,h-.5+k*.3,z+math.cos(k*2.1)*.65),(1.3,1.25,1.3),DARKLEAF if k%2 else LEAF)
# A few ground tufts, batched with foliage; same positions in both tiers.
for i in range(90):
    x=rng.uniform(-9,9); z=rng.uniform(-6,6)
    if abs(x)<3.4 and abs(z)<3.5: continue
    for k in range(3):
        a=k*2.1; ribbon([(x,0,z),(x+.07*math.sin(a),.20,z+.07*math.cos(a)),(x+.15*math.sin(a),.30,z+.15*math.cos(a))],[.025,.022,0],LEAF)
finish('Env')

# Buffalo anatomy massing with shoulder, lowered muzzle, paired swept horns,
# tapering legs, split hooves, ears, eyes and a curved tail.
ell((0,.72,0),(.70,.37,.30),SKIN); ell((.43,.77,0),(.31,.36,.30),SKIN)
ell((.71,.65,0),(.25,.28,.22),SKIN); ell((.94,.50,0),(.26,.14,.17),SKIN)
for s in [-1,1]:
    ell((.70,.73,s*.25),(.17,.065,.13),SKIN); ell((.84,.67,s*.155),(.035,.035,.022),EYE)
    tube([(.64,.86,s*.13),(.42,1.03,s*.34),(.26,1.12,s*.46),(.17,1.27,s*.47)],[.075,.055,.035,.008],HORN)
    for x in [-.46,.42]:
        tube([(x,.65,s*.21),(x-.03,.32,s*.24),(x+.04,.085,s*.24)],[.10,.065,.055],SKIN)
        for dz in [-.035,.035]: ell((x+.07,.055,s*.24+dz),(.09,.055,.035),HORN)
    ell((1.14,.54,s*.08),(.012,.024,.026),HORN)
tube([(-.63,.77,0),(-.86,.65,.02),(-.90,.26,.08),(-.83,.18,.12)],[.035,.025,.018,.012],SKIN)
ell((-.83,.17,.12),(.05,.09,.04),HORN)
box((.38,.99,0),(.08,.07,.95),WOOD)
for s in [-1,1]: tube([(.35,.91,s*.34),(-.8,.35,s*.35),(-1.40,.17,s*.16)],.026,WOOD)
tube([(-1.45,.09,0),(-1.38,.26,0),(-1.62,.75,0)],.045,WOOD)
finish('Buffalo',True)

# Worker: standing on the dike, separate legs, arms, shirt, trousers and broad hat.
for s in [-1,1]:
    tube([(s*.11,.67,0),(s*.13,.34,0),(s*.14,.075,.035)],[.095,.075,.05],CLOTH)
    ell((s*.14,.045,.09),(.07,.045,.14),WOOD)
ell((0,.88,0),(.23,.32,.14),CLOTH)
for s in [-1,1]:
    tube([(s*.21,1.05,0),(s*.32,.80,.08),(s*.19,.66,.20)],[.075,.055,.04],FLESH)
ell((0,1.32,0),(.13,.17,.12),FLESH)
# Wide woven hat as a low cone with a rim, not a tall party hat.
tube([(0,1.47,0),(0,1.57,0)],[.32,.015],HAT,24 if ULTRA else 12)
finish('Farmer',True)

# Root-anchored rice clump, normalized 0..1 height; leaf ribbons carry light.
for k in range(5 if ULTRA else 3):
    a=k*2.399; dx,dz=math.sin(a),math.cos(a); h=.85+(k%3)*.07
    tube([(0,0,0),(dx*.025,h*.55,dz*.025),(dx*.04,h,dz*.04)],[.009,.006,.002],RICE,4 if ULTRA else 3)
    for side in [-1,1]:
        y=h*(.27 if side<0 else .48); reach=.23+(k%2)*.05
        ribbon([(dx*.02,y,dz*.02),(dx*reach*.5*side,y+.30,dz*reach*.5*side),
                (dx*reach*side,y+.38,dz*reach*side),(dx*reach*1.25*side,y+.27,dz*reach*1.25*side)],
                [.006,.024,.018,0],RICE,.4)
finish('Rice')
# A drooping panicle, instanced only on mature unharvested plants.
for k in range(2 if ULTRA else 1):
    a=k*2.4; dx,dz=math.sin(a),math.cos(a)
    points=[(0,.72,0),(dx*.05,.97,dz*.05),(dx*.12,1.04,dz*.12),(dx*.20,.97,dz*.20),(dx*.25,.84,dz*.25)]
    tube(points,.006,GRAIN,4)
    for j in range(9 if ULTRA else 5):
        t=j/((9 if ULTRA else 5)-1); x=dx*(.07+.17*t); z=dz*(.07+.17*t)
        y=1.02-.16*t*t
        # Small low-poly grains, not a whole UV sphere per seed.
        for s in [-1,1]:
            p=(x+dz*s*.025,y-.02,z-dx*s*.025)
            add(GRAIN,[(p[0]-.012,p[1],p[2]),(p[0]+.012,p[1],p[2]),(p[0],p[1]+.025,p[2]),(p[0],p[1]-.025,p[2]),(p[0],p[1],p[2]+.012)],[(0,2,4),(2,1,4),(1,3,4),(3,0,4),(0,3,1,2)])
finish('Grain')

all_meshes=[o for group in COMPONENTS.values() for o in group]
bpy.ops.object.select_all(action='DESELECT')
for o in all_meshes: o.select_set(True)
bpy.context.view_layer.objects.active=all_meshes[0]
dest=PUBLIC/f'farm-{TIER}.glb'
bpy.ops.export_scene.gltf(filepath=str(dest),export_format='GLB',use_selection=True,export_cameras=False,export_lights=False,export_animations=False,export_yup=True,export_meshopt_compression_enable=True,export_meshopt_extension='EXT_meshopt_compression')
report={'tier':TIER,'bytes':dest.stat().st_size,'sha256':hashlib.sha256(dest.read_bytes()).hexdigest(),
        'parts':{key:{'drawCalls':len(obs),'triangles':sum(len(p.vertices)-2 for o in obs for p in o.data.polygons)} for key,obs in COMPONENTS.items()},'layout':LAYOUT,'trees':trees}
(OUT/f'{TIER}-report.json').write_text(json.dumps(report,indent=2))

# Review scene: same reusable geometry, placed as in the application.
for key in ['Buffalo','Farmer']:
    for o in COMPONENTS[key]: o.location=xyz(LAYOUT[key.lower()])
for key in ['Rice','Grain']:
    for o in COMPONENTS[key]: o.hide_render=True
for row in range(22):
    for col in range(22):
        x=(col/21-.5)*4.4; z=(row/21-.5)*4.4; idx=row*22+col
        h=.95*(.82+((idx*13)%10)/28)
        for key in ['Rice','Grain']:
            for proto in COMPONENTS[key]:
                ob=bpy.data.objects.new('Preview '+key,proto.data); bpy.context.collection.objects.link(ob)
                ob.location=xyz((x,.05,z)); ob.scale=(.8,.8,h); ob.rotation_euler.z=(idx%7)*.4
box((0,.01,0),(5.2,.02,5.2),MUD)
for x,z,w,d in [(0,2.6,4.96,.24),(0,-2.6,4.96,.24),(2.6,0,.24,5.44),(-2.6,0,.24,5.44),(0,0,4.96,.14)]: box((x,.09,z),(w,.18,d),PATH)
finish('PreviewBase')
sc=bpy.context.scene; sc.world=bpy.data.worlds.new('Morning'); sc.world.use_nodes=True
sc.world.node_tree.nodes['Background'].inputs[0].default_value=(.68,.78,.82,1); sc.world.node_tree.nodes['Background'].inputs[1].default_value=.65
bpy.ops.object.light_add(type='SUN'); bpy.context.object.rotation_euler=(.55,-.45,-.6); bpy.context.object.data.energy=2.2; bpy.context.object.data.angle=.13
sc.render.engine='CYCLES'; sc.cycles.samples=16; sc.cycles.use_denoising=True
sc.render.resolution_x=1440; sc.render.resolution_y=1000; sc.render.resolution_percentage=100; sc.view_settings.view_transform='AgX'
views=[('overview',(9,7.5,11),(-.7,1,-.9),38),('buffalo',(2.7,1.55,3.4),(-1.0,.65,.7),48),('house',(-.4,3.5,2.2),(-4.3,1.45,-3.5),42)]
for name,pos,target,lens in views:
    for ob in sc.objects:
        if ob.name.startswith('Preview Rice') or ob.name.startswith('Preview Grain'): ob.hide_render=name=='buffalo'
    for ob in COMPONENTS['Buffalo']: ob.hide_render=name!='buffalo'
    bpy.ops.object.camera_add(location=xyz(pos)); cam=bpy.context.object; cam.name='Review '+name
    cam.rotation_euler=(Vector(xyz(target))-cam.location).to_track_quat('-Z','Y').to_euler(); cam.data.lens=lens; sc.camera=cam
    if '--no-render' not in sys.argv and (ULTRA or name=='overview'):
        sc.render.filepath=str(OUT/f'{TIER}-{name}.png'); bpy.ops.render.render(write_still=True)
sc.camera=bpy.data.objects['Review overview']; bpy.ops.wm.save_as_mainfile(filepath=str(OUT/f'farm-{TIER}.blend'))
print('FARM_VISUALS_COMPLETE',json.dumps(report['parts']),dest.stat().st_size,flush=True)
