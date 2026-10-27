"""Original reference-led Pre Rup study; not a survey or restoration proposal.
Blender -b -t 8 --python scripts/refine-pre-rup.py -- --normal/--ultra
Reference notes and limitations: docs/PRE_RUP_REVIEW.md.
"""
import ast, bpy, math, random, json, sys, hashlib
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'output/pre-rup-review-v2'; PUBLIC=ROOT/'public/models/local/pre-rup-refined-v2'
for folder in (OUT,PUBLIC): folder.mkdir(parents=True,exist_ok=True)
ULTRA='--normal' not in sys.argv; TIER='ultra' if ULTRA else 'normal'
source=ROOT/f'public/models/local/heritage-blender-v1/pre-rup-{TIER}.glb'
original_hash=hashlib.sha256(source.read_bytes()).hexdigest()
bpy.ops.wm.read_factory_settings(use_empty=True); bpy.context.preferences.filepaths.save_version=0
BATCH={}
helper=ROOT/'scripts/refine-oudong.py'
names={'xyz','mat','add','box','tube','ell'}
nodes=[n for n in ast.parse(helper.read_text(encoding='utf-8')).body if isinstance(n,ast.FunctionDef) and n.name in names]
assert {n.name for n in nodes}==names
exec(compile(ast.Module(body=nodes,type_ignores=[]),str(helper),'exec'),globals())
bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2 if ULTRA else 1)
proto=bpy.context.object; SV=[tuple(v.co) for v in proto.data.vertices]; SF=[tuple(p.vertices) for p in proto.data.polygons]; bpy.data.objects.remove(proto,do_unlink=True)
BRICK=[mat('Weathered brick '+str(i),c) for i,c in enumerate([(.49,.235,.105),(.57,.30,.15),(.39,.205,.115)])]
LATERITE=mat('Laterite terraces',(.40,.27,.16)); SAND=mat('Sandstone mouldings',(.49,.43,.31))
PAVING=mat('Paved courtyards',(.43,.33,.22)); SOIL=mat('Dry earth',(.32,.27,.16)); GRASS=mat('Peripheral grass',(.15,.22,.065))
PLASTER=mat('Surviving pale stucco',(.61,.56,.43)); BARK=mat('Tree trunks',(.22,.16,.08))
LEAF=[mat('Broadleaf canopy '+str(i),(.045+i*.025,.14+i*.035,.025+i*.015)) for i in range(3)]

def wall(x,z,length,height,base,material,axis='x',seed=0):
    """Closed masonry blocks with narrow joints; no image textures."""
    rows=max(1,math.ceil(height/(.20 if ULTRA else .42)))
    n=max(1,math.ceil(length/(.48 if ULTRA else .95)))
    for j in range(rows):
        # Staggered bonds, clipped to the ends of the wall.
        edges=[0]+[min(length,max(0,(i+(.5 if j%2 else 1))*length/n)) for i in range(n)]+[length]
        edges=sorted(set(edges))
        for k,(a,b) in enumerate(zip(edges,edges[1:])):
            q=-length/2+(a+b)/2; p=(x+q,base+(j+.5)*height/rows,z) if axis=='x' else (x,base+(j+.5)*height/rows,z+q)
            s=(b-a-.009,height/rows-.009,.32) if axis=='x' else (.32,height/rows-.009,b-a-.009)
            m=BRICK[(j+k+seed)%3] if material=='brick' else material
            box(p,s,m)

def portal(x,z,y,w=1.15,h=1.65):
    for side in [-1,1]:
        box((x+side*(w/2+.12),y+h/2,z),(.24,h,.40),SAND)
        tube([(x+side*(w/2+.30),y,z+.22),(x+side*(w/2+.30),y+h,z+.22)],.09,SAND,8)
    box((x,y+h+.12,z),(w+.65,.24,.47),SAND)
    box((x,y+.045,z),(w+.60,.09,.52),SAND)

def tower(x,z,y,w=2.55,h=5.0,seed=0,broken=False):
    # Four wall masses surround an actual chamber; the eastern doorway is open.
    body=h*.48; opening=min(1.25,w*.46); jamb=(w-opening)/2
    box((x,y+.12,z),(w+.35,.24,w+.35),SAND)
    base=y+.24
    wall(x,z-w/2+.16,w,body,base,'brick',seed=seed)
    for s in [-1,1]:
        wall(x+s*(w/2-.16),z,w-.64,body,base,'brick',axis='z',seed=seed+1)
        wall(x+s*(opening/2+jamb/2),z+w/2-.16,jamb,body,base,'brick',seed=seed+2)
    doorway=min(1.7,body*.77)
    wall(x,z+w/2-.16,opening,body-doorway,base+doorway,'brick',seed=seed+3)
    portal(x,z+w/2+.035,base,opening-.15,doorway-.10)
    # Receding brick courses and corner projections preserve the prasat profile.
    for k in range(5):
        yy=base+body+k*h*.098; ww=w*(1-.14*k); hh=h*.098
        for s in [-1,1]:
            wall(x,z+s*(ww/2-.12),ww,hh,yy,'brick',seed=seed+k)
            wall(x+s*(ww/2-.12),z,ww-.48,hh,yy,'brick',axis='z',seed=seed+k+1)
        box((x,yy+.035,z),(ww+.12,.07,ww+.12),BRICK[k%3])
    # Low uneven terminal rubble, not a restored lotus spire.
    for k in range(4):
        box((x+(k%2-.5)*w*.16,base+body+h*.49+.08*(k%3),z+(k//2-.5)*w*.16),
            (w*.19,.20+.06*((seed+k)%3),w*.18),BRICK[(seed+k)%3])
    if not broken:
        for s in [-1,1]:
            box((x+s*w*.36,base+body*.57,z+w/2+.009),(.23,body*.67,.045),PLASTER)

def rim(size,y,material):
    # Interrupt front and side mouldings at each cardinal stair opening.
    gap=1.55; half=size/2; length=half-gap
    for s in [-1,1]:
        for t in [-1,1]:
            box((t*(gap+length/2),y,s*half),(length,.11,.16),material)
            box((s*half,y,t*(gap+length/2)),(.16,.11,length),material)

box((0,-.23,2),(55,.44,58),GRASS)
box((0,-.025,2),(42,.05,46),SOIL)
box((0,.02,0),(32,.04,32),PAVING)
# Main three-tier platform. Dimensions are scaled and interpretive.
tiers=[(22.5,0,2.7),(18.9,2.7,4.05),(15.75,4.05,5.6)]
for i,(size,bottom,top) in enumerate(tiers):
    m=LATERITE if i<2 else SAND
    box((0,(bottom+top)/2,0),(size,top-bottom,size),m)
    for yy in [bottom+.12,top-.28,top-.08]: rim(size+.12,yy,m)
    # Block joints on retaining faces stop short of the staircase.
    for s in [-1,1]:
        for t in [-1,1]:
            mid=t*(size/4+.8); ln=size/2-1.6
            wall(mid,s*(size/2+.012),ln,top-bottom-.45,bottom+.18,m)
            wall(s*(size/2+.012),mid,ln,top-bottom-.45,bottom+.18,m,axis='z')
stairs=[]
for index,(size,bottom,top) in enumerate(tiers):
    start=13.8 if index==0 else tiers[index-1][0]/2
    end=size/2; count=math.ceil((top-bottom)/.15)
    stairs.append([start,end,bottom,top,count])
    for side in range(4):
        angle=side*math.pi/2
        for k in range(count):
            distance=start-(k+.5)*(start-end)/count; yy=bottom+(k+1)*(top-bottom)/count
            dims=(2.8,yy-bottom+.025,(start-end)/count+.001)
            if side%2: dims=(dims[2],dims[1],dims[0])
            box((math.sin(angle)*distance,(yy+bottom-.025)/2,math.cos(angle)*distance),dims,SAND)
        for s in [-1,1]:
            xx=s*1.72; zz=end+.12
            px=xx*math.cos(angle)+zz*math.sin(angle); pz=zz*math.cos(angle)-xx*math.sin(angle)
            box((px,top+.17,pz),(.65,.34,.65),SAND)
            # Worn guardian-lion massing, not an invented detailed sacred relief.
            ell((px,top+.54,pz),(.23,.28,.33),SAND)
            ell((px,top+.86,pz+.17),(.22,.23,.23),SAND)
            ell((px,top+.82,pz+.34),(.14,.10,.12),SAND)
            for dx in [-.13,.13]:
                ell((px+dx,top+.38,pz+.22),(.075,.18,.11),SAND)
                ell((px+dx,top+1.02,pz+.17),(.07,.08,.07),SAND)

upper=[[-5.1,-5.1],[5.1,-5.1],[-5.1,5.1],[5.1,5.1],[0,0]]
for i,(x,z) in enumerate(upper):
    if i==4:
        box((0,6.5,0),(4.4,1.8,4.4),SAND)
        rim(4.5,7.28,SAND)
        for k in range(12):
            top=5.6+(k+1)*.15
            box((0,(5.6+top)/2,4.15-(k+.5)*1.95/12),(1.9,top-5.6,1.95/12+.001),SAND)
    tower(x,z,7.4 if i==4 else 5.6,3.1 if i==4 else 2.6,6.5 if i==4 else 5.3,i)
# Twelve small shrines around the first tier, leaving all axial stairs open.
small=[]
for side in range(4):
    a=side*math.pi/2
    for t in [-5.6,5.6]:
        x=t*math.cos(a)+10.25*math.sin(a); z=10.25*math.cos(a)-t*math.sin(a)
        tower(x,z,2.7,.92,1.45,side+2,True); small.append([x,z])
for x in [-10.25,10.25]:
    for z in [-10.25,10.25]:
        tower(x,z,2.7,.92,1.45,3,True); small.append([x,z])
# Two enclosure walls, broken halls and gopura fragments; no invented complete roof.
enclosures=[(40,44,2),(32,32,0)]
for width,depth,zc in enclosures:
    for s in [-1,1]:
        for t in [-1,1]:
            wall(t*(width/4+.9),zc+s*depth/2,width/2-1.8,1.0,0,LATERITE)
            wall(s*width/2,zc+t*(depth/4+.9),depth/2-1.8,1.0,0,LATERITE,axis='z')
        portal(0,zc+s*depth/2,.04,2.5,2.2)
    for s in [-1,1]:
        for z in [-11,-6,6,11]:
            wall(s*(width/2-1.7),z,3.3,1.4,.04,LATERITE,axis='z')
            for dz in [-1.3,1.3]: box((s*(width/2-2.5),.82,z+dz),(.24,1.56,.24),SAND)
# Eastern lower towers: five standing masses and the sixth base left empty.
lower=[]
for s in [-1,1]:
    box((s*8,.22,20.3),(11.5,.44,3.4),LATERITE)
    for j in range(3):
        x=s*(4+j*4); absent=s==-1 and j==0
        box((x,.52,20.3),(3.0,.16,3.0),SAND)
        if not absent: tower(x,20.3,.60,2.7,6.2 if j==1 else 4.6,j+6,True)
        lower.append({'position':[x,20.3],'standing':not absent})
libraries=[[-6.5,13.4],[6.5,13.4]]
for i,(x,z) in enumerate(libraries):
    starts={name:len(data[0]) for name,data in BATCH.items()}
    tower(x,z,.04,2.3,3.3,i+9,True)
    # Library doorways face west, unlike the eastern openings of the sanctuaries.
    for name,(verts,faces) in BATCH.items():
        start=starts.get(name,0)
        verts[start:]=[(2*x-vx,-2*z-vy,vz) for vx,vy,vz in verts[start:]]
# Grooved rectangular stone basin; its interpretation remains uncertain.
for x in [-.77,.77]: box((x,.26,14.65),(.16,.44,1.05),SAND)
for z in [14.20,15.10]: box((0,.26,z),(1.38,.44,.15),SAND)
box((0,.06,14.65),(1.38,.04,.75),SAND)
# Low scattered masonry away from the navigable axial path.
rng=random.Random(961); rubble=[]
for i in range(115):
    x=rng.uniform(-18,18); z=rng.uniform(-18,22)
    if abs(x)<2.7 or (abs(x)<13 and abs(z)<12.5): continue
    w=rng.uniform(.25,.70); h=rng.uniform(.12,.35); d=rng.uniform(.25,.6)
    box((x,h/2+.04,z),(w,h,d),LATERITE); rubble.append([x,z,w,h,d])
trees=[]
for i in range(64):
    a=i*math.tau/64; r=25+rng.uniform(0,2)
    x=math.sin(a)*r; z=math.cos(a)*r
    if z>20 and abs(x)<16: continue
    h=rng.uniform(5,8); trees.append([x,z,h])
    tube([(x,0,z),(x+.1,h*.7,z),(x-.2,h,z)],[.22,.13,.03],BARK)
    for k in range(4):
        a=k*math.tau/4
        ell((x+math.sin(a)*1.15,h-.4+k*.15,z+math.cos(a)*1.15),(1.7,1.3,1.7),LEAF[k%3])

for name,(verts,faces) in BATCH.items():
    mesh=bpy.data.meshes.new(name); mesh.from_pydata(verts,[],faces); mesh.update()
    o=bpy.data.objects.new(name,mesh); bpy.context.collection.objects.link(o); m=bpy.data.materials[name]; mesh.materials.append(m)
    bpy.context.view_layer.objects.active=o; o.select_set(True)
    bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT'); bpy.ops.mesh.normals_make_consistent(inside=False); bpy.ops.object.mode_set(mode='OBJECT'); o.select_set(False)
    if name.startswith(('Weathered','Laterite','Sandstone','Surviving')):
        col=mesh.color_attributes.new(name='Weathering',type='BYTE_COLOR',domain='POINT')
        for i,v in enumerate(mesh.vertices):
            x,y,z=v.co; c=m.diffuse_color; q=.80+.18*(.5+.5*math.sin(x*8+z*3)*math.sin(y*6-z*2))
            moss=max(0,math.sin(x*1.6+y*3)*math.sin(z*2))*.20
            col.data[i].color=(c[0]*q*(1-moss),c[1]*q*(1+moss*.15),c[2]*q*(1-moss),1)
        vc=m.node_tree.nodes.new('ShaderNodeVertexColor'); vc.layer_name=col.name
        m.node_tree.links.new(vc.outputs['Color'],m.node_tree.nodes.get('Principled BSDF').inputs['Base Color'])
sc=bpy.context.scene; sc['provenance']='Original illustrative Pre Rup study, not surveyed. No reference photographs embedded.'
sc.world=bpy.data.worlds.new('Daylight'); sc.world.use_nodes=True
sc.world.node_tree.nodes['Background'].inputs[0].default_value=(.65,.75,.86,1); sc.world.node_tree.nodes['Background'].inputs[1].default_value=.65
bpy.ops.object.light_add(type='SUN'); bpy.context.object.rotation_euler=(.55,-.45,-.6); bpy.context.object.data.energy=2.3; bpy.context.object.data.angle=.15
sc.render.engine='CYCLES'; sc.cycles.samples=12; sc.cycles.use_denoising=True
sc.render.resolution_x=1280; sc.render.resolution_y=960; sc.render.resolution_percentage=100; sc.view_settings.view_transform='AgX'
views=[('overview',(27,28,36),(0,3.4,1),30),('ascent',(0,1.6,15.5),(0,6.5,0),24),('summit',(10,10,12),(0,9.5,0),27)]
for name,pos,target,lens in views:
    bpy.ops.object.camera_add(location=xyz(pos)); cam=bpy.context.object; cam.name='Review '+name
    cam.rotation_euler=(Vector(xyz(target))-cam.location).to_track_quat('-Z','Y').to_euler(); cam.data.lens=lens; cam.data.clip_end=250; sc.camera=cam
    if '--no-render' not in sys.argv and (ULTRA or name=='overview'):
        sc.render.filepath=str(OUT/f'{TIER}-{name}.png'); bpy.ops.render.render(write_still=True)
sc.camera=bpy.data.objects['Review overview']; bpy.ops.wm.save_as_mainfile(filepath=str(OUT/f'pre-rup-{TIER}.blend'))
bpy.ops.object.select_all(action='DESELECT'); meshes=[o for o in sc.objects if o.type=='MESH']
for o in meshes: o.select_set(True)
bpy.context.view_layer.objects.active=meshes[0]; dest=PUBLIC/f'pre-rup-{TIER}.glb'
bpy.ops.export_scene.gltf(filepath=str(dest),export_format='GLB',use_selection=True,export_cameras=False,export_lights=False,export_animations=False,export_yup=True,export_meshopt_compression_enable=True,export_meshopt_extension='EXT_meshopt_compression')
tri=sum(len(p.vertices)-2 for o in meshes for p in o.data.polygons)
report={'tier':TIER,'triangles':tri,'drawCalls':len(meshes),'bytes':dest.stat().st_size,'trees':trees,'tiers':tiers,'stairs':stairs,'upperTowers':upper,'lowerTowers':lower,'smallShrines':small,'libraries':libraries,'enclosures':enclosures,'rubble':rubble,'originalSha256':original_hash,'sha256':hashlib.sha256(dest.read_bytes()).hexdigest(),'surveyed':False,'photographsEmbedded':False}
assert hashlib.sha256(source.read_bytes()).hexdigest()==original_hash
assert tri<(300000 if ULTRA else 100000)
(OUT/f'{TIER}-report.json').write_text(json.dumps(report,indent=2)); print('PRE_RUP_COMPLETE',TIER,tri,dest.stat().st_size,flush=True)
