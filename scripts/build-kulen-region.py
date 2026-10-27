"""Phnom Kulen regional overview, NOT surveyed terrain or a park boundary.
Published approximate POIs retain relative positions. All symbols are enlarged.
Blender -b -t 6 --python scripts/build-kulen-region.py -- --normal/--ultra
"""
import ast, bpy, math, random, json, sys, hashlib
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'output/phnom-kulen-region-v3'; PUBLIC=ROOT/'public/models/local/phnom-kulen-region-v3'
for folder in (OUT,PUBLIC): folder.mkdir(parents=True,exist_ok=True)
ULTRA='--normal' not in sys.argv; TIER='ultra' if ULTRA else 'normal'
original=ROOT/f'public/models/local/phnom-kulen-refined-v2/phnom-kulen-{TIER}.glb'
original_hash=hashlib.sha256(original.read_bytes()).hexdigest()
bpy.ops.wm.read_factory_settings(use_empty=True); bpy.context.preferences.filepaths.save_version=0
BATCH={}
def helpers(path,names):
    nodes=[n for n in ast.parse(path.read_text(encoding='utf-8')).body if isinstance(n,ast.FunctionDef) and n.name in names]
    assert {n.name for n in nodes}==names
    exec(compile(ast.Module(body=nodes,type_ignores=[]),str(path),'exec'),globals())
helpers(ROOT/'scripts/refine-oudong.py',{'xyz','mat','add','box','tube','lathe','ell'})
bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2 if ULTRA else 1)
proto=bpy.context.object; SV=[tuple(v.co) for v in proto.data.vertices]; SF=[tuple(p.vertices) for p in proto.data.polygons]; bpy.data.objects.remove(proto,do_unlink=True)
EARTH=mat('Forested plateau',(.16,.25,.075)); EDGE=mat('Earth section',(.25,.24,.14))
STONE=mat('Sandstone location symbols',(.38,.37,.25)); WOOD=mat('Pavilion posts',(.29,.20,.10)); ROOF=mat('Shrine roof symbol',(.53,.20,.055))
TRIM=mat('Pavilion trim',(.71,.56,.25)); WATER=mat('Stream symbol',(.12,.33,.31)); FOAM=mat('Waterfall symbol',(.68,.80,.77))
BARK=mat('Forest trunks',(.18,.15,.08)); LEAF=[mat('Forest canopy '+str(i),(.025+i*.017,.125+i*.026,.021+i*.011)) for i in range(4)]
LATERITE=mat('Terrace location symbol',(.36,.23,.14))
landmarks=json.loads((ROOT/'src/kulenLandmarks.json').read_text(encoding='utf-8'))
for p in landmarks:
    p['position']=[(p['lng']-104.12)*400*math.cos(math.radians(13.55)),7,(13.55-p['lat'])*400]
def smooth(t):
    t=max(0,min(1,t)); return t*t*(3-2*t)
def ground(x,z):
    # Asymmetric green mesa and foothills; no DEM, no implied legal boundary.
    u=x+.15*z; q=math.sqrt((u/23)**2+(z/30)**2)
    edge=.05*math.sin(x*.4)+.035*math.cos(z*.7)
    h=7*(1-smooth((q-.67+edge)/.33))
    h+=.65*math.sin(x*.22)*math.sin(z*.19)*smooth((q-.72)/.1)*(1-smooth((q-.95)/.1))
    for p in landmarks:
        a,y,b=p['position']; d=math.hypot(x-a,z-b)
        if d<3.0: h=h*smooth((d-1.8)/1.2)+7*(1-smooth((d-1.8)/1.2))
    return max(0,h)
nx,nz=(144,168) if ULTRA else (80,96)
vv=[(-27+i*54/nx,ground(-27+i*54/nx,-33+j*66/nz),-33+j*66/nz) for i in range(nx+1) for j in range(nz+1)]
ff=[]
for i in range(nx):
    for j in range(nz):
        a=i*(nz+1)+j; ff.append((a,a+1,a+nz+2,a+nz+1))
add(EARTH,vv,ff)
box((0,-.23,0),(54,.45,66),EDGE)
# Water system is a short local symbol only; no invented route connecting distant sites.
river=next(p['position'] for p in landmarks if p['id']=='river-of-lingas')
falls=next(p['position'] for p in landmarks if p['id']=='waterfalls')
tube([(river[0]-1,7.05,river[2]+.5),(river[0],7.05,river[2]),(falls[0]-.5,7.05,falls[2]),(falls[0]+.5,7.05,falls[2]-.3)],.14,WATER,n=6)
for p in landmarks:
    x,y,z=p['position']
    if p['id']=='waterfalls':
        # Miniature raised diorama makes the waterfall visible at regional scale.
        box((x,7.28,z),(.85,.56,.6),STONE)
        box((x,7.30,z+.32),(.75,.54,.04),FOAM)
        ell((x,7.04,z+.6),(.75,.025,.45),WATER)
    elif p['id']=='preah-ang-thom':
        ell((x,7.35,z),(.68,.55,.72),STONE)
        box((x,7.77,z),(1.08,.12,1.22),TRIM)
        for a in [-.44,.44]:
            for b in [-.5,.5]: box((x+a,8.18,z+b),(.065,.76,.065),WOOD)
        for j in range(2):
            yy=8.56+j*.20; w=1.35-j*.22; d=1.45-j*.22
            add(ROOF,[(x-w/2,yy,z-d/2),(x+w/2,yy,z-d/2),(x+w/2,yy,z+d/2),(x-w/2,yy,z+d/2),(x,yy+.48,z-d/2),(x,yy+.48,z+d/2)],[(0,3,5,4),(1,4,5,2),(0,4,1),(3,2,5)])
        # Intentionally no invented sacred figure; pavilion is a locator symbol.
    elif p['id']=='river-of-lingas':
        box((x,7.02,z),(1.1,.04,.62),STONE)
        for j in [-1,0,1]:
            for k in [-1,0,1]: lathe(x+j*.26,z+k*.18,[(7.04,.06),(7.08,.05)],STONE,n=8)
    elif p['id']=='rong-chen':
        # Five broad low levels, no speculative intact sanctuary tower.
        for j in range(5):
            w=2.8-j*.43; box((x,7+.07+j*.14,z),(w,.14,w),EARTH if j<2 else LATERITE)
    elif p['id']=='srah-damrei':
        # Forest boulders locate the site; no claim to reproduce animal carvings.
        for dx,dz,s in [(-.55,0,.6),(.45,.3,.45),(.15,-.6,.5)]: ell((x+dx,7+s*.45,z+dz),(s,s*.65,s*.7),STONE)

trees=[]; rng=random.Random(130550)
for _ in range(40000):
    x=rng.uniform(-24,24); z=rng.uniform(-30,30); h=ground(x,z)
    if h<.3: continue
    if any(math.hypot(x-p['position'][0],z-p['position'][2])<2.0 for p in landmarks): continue
    # Keep the approach from each inspection camera free of foreground crowns.
    if any(0<x-p['position'][0]<5.5 and 0<z-p['position'][2]<7.5 for p in landmarks): continue
    if -9<x<-3 and -9<z<-3: continue
    if any((x-a)**2+(z-b)**2<1.3**2 for a,b,hh in trees): continue
    trees.append([x,z,rng.uniform(.65,1.30)])
    if len(trees)==520: break
for i,(x,z,h) in enumerate(trees):
    y=ground(x,z); tube([(x,y,z),(x,y+h*.9,z)],[.045,.025],BARK,n=5)
    for dx,dz,dy in [(-.16,0,.7),(.18,.1,.8),(0,-.12,1.05)]:
        ell((x+dx,y+h*dy,z+dz),(.62,h*.48,.60),LEAF[i%4])
for name,(verts,faces) in BATCH.items():
    mesh=bpy.data.meshes.new(name); mesh.from_pydata(verts,[],faces); mesh.update()
    o=bpy.data.objects.new(name,mesh); bpy.context.collection.objects.link(o); m=bpy.data.materials[name]; mesh.materials.append(m)
    bpy.context.view_layer.objects.active=o; o.select_set(True)
    bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT'); bpy.ops.mesh.normals_make_consistent(inside=False); bpy.ops.object.mode_set(mode='OBJECT'); o.select_set(False)
    if name==EARTH.name:
        # Blender's volume heuristic can invert an open heightfield. Its first
        # nx*nz faces are terrain, whose outward normal must always point up.
        for poly in list(mesh.polygons)[:nx*nz]:
            if poly.normal.z<0: poly.flip()
        mesh.update()
        assert all(poly.normal.z>0 for poly in list(mesh.polygons)[:nx*nz])
        for poly in mesh.polygons: poly.use_smooth=True
        col=mesh.color_attributes.new(name='Vegetation tones',type='BYTE_COLOR',domain='POINT')
        for i,v in enumerate(mesh.vertices):
            x,y,z=v.co; q=.83+.17*math.sin(x*.55)*math.sin(y*.45)
            col.data[i].color=(.16*q,.25*q,.075*q,1)
        vc=m.node_tree.nodes.new('ShaderNodeVertexColor'); vc.layer_name=col.name
        m.node_tree.links.new(vc.outputs['Color'],m.node_tree.nodes.get('Principled BSDF').inputs['Base Color'])
sc=bpy.context.scene; sc['provenance']='Regional orientation study. Approximate published POIs; illustrative relief, boundary and enlarged locator symbols. Not a survey or navigation map.'
sc.world=bpy.data.worlds.new('Daylight'); sc.world.use_nodes=True
sc.world.node_tree.nodes['Background'].inputs[0].default_value=(.65,.75,.86,1); sc.world.node_tree.nodes['Background'].inputs[1].default_value=.7
bpy.ops.object.light_add(type='SUN'); bpy.context.object.rotation_euler=(.5,-.4,-.6); bpy.context.object.data.energy=2.2; bpy.context.object.data.angle=.2
sc.render.engine='CYCLES'; sc.cycles.samples=16; sc.cycles.use_denoising=True
sc.render.resolution_x=1440; sc.render.resolution_y=1100; sc.render.resolution_percentage=100; sc.view_settings.view_transform='AgX'
views=[('overview',(43,49,58),(0,3,0),32),('north-cluster',(-1,18,5),(-5,7,-6),35)]
for name,pos,target,lens in views:
    bpy.ops.object.camera_add(location=xyz(pos)); cam=bpy.context.object; cam.name='Review '+name
    cam.rotation_euler=(Vector(xyz(target))-cam.location).to_track_quat('-Z','Y').to_euler(); cam.data.lens=lens; cam.data.clip_end=250; sc.camera=cam
    if '--no-render' not in sys.argv and (ULTRA or name=='overview'):
        sc.render.filepath=str(OUT/f'{TIER}-{name}.png'); bpy.ops.render.render(write_still=True)
sc.camera=bpy.data.objects['Review overview']; bpy.ops.wm.save_as_mainfile(filepath=str(OUT/f'phnom-kulen-region-{TIER}.blend'))
bpy.ops.object.select_all(action='DESELECT'); meshes=[o for o in sc.objects if o.type=='MESH']
for o in meshes: o.select_set(True)
bpy.context.view_layer.objects.active=meshes[0]; dest=PUBLIC/f'phnom-kulen-{TIER}.glb'
bpy.ops.export_scene.gltf(filepath=str(dest),export_format='GLB',use_selection=True,export_cameras=False,export_lights=False,export_animations=False,export_yup=True,export_meshopt_compression_enable=True,export_meshopt_extension='EXT_meshopt_compression')
tri=sum(len(p.vertices)-2 for o in meshes for p in o.data.polygons)
report={'tier':TIER,'triangles':tri,'drawCalls':len(meshes),'bytes':dest.stat().st_size,'trees':trees,'landmarks':landmarks,'sourceSha256':original_hash,'sha256':hashlib.sha256(dest.read_bytes()).hexdigest(),'surveyed':False,'photographsEmbedded':False}
assert hashlib.sha256(original.read_bytes()).hexdigest()==original_hash
assert tri<(600000 if ULTRA else 180000)
(OUT/f'{TIER}-report.json').write_text(json.dumps(report,indent=2)); print('KULEN_REGION_COMPLETE',TIER,tri,dest.stat().st_size,flush=True)
