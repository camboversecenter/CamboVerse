"""Reference-led, illustrative Bayon exterior. Not a survey or exact tower inventory.
Blender --background --threads 10 --python scripts/refine-bayon.py -- --normal/--ultra
Original model and source photographs are never embedded or modified.
"""
import ast, bpy, math, random, json, sys, hashlib
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'output/bayon-review-v2'; PUBLIC=ROOT/'public/models/local/bayon-refined-v2'
for folder in (OUT,PUBLIC): folder.mkdir(parents=True,exist_ok=True)
ULTRA='--normal' not in sys.argv; TIER='ultra' if ULTRA else 'normal'
source=ROOT/f'public/models/local/heritage-blender-v1/bayon-{TIER}.glb'
source_hash=hashlib.sha256(source.read_bytes()).hexdigest()
bpy.ops.wm.read_factory_settings(use_empty=True); bpy.context.preferences.filepaths.save_version=0
BATCH={}

def reuse_functions(path,names):
    """Reuse reviewed pure mesh helpers, never execute the source's scene mutations."""
    tree=ast.parse(path.read_text(encoding='utf-8'))
    nodes=[n for n in tree.body if isinstance(n,ast.FunctionDef) and n.name in names]
    assert {n.name for n in nodes}==set(names)
    exec(compile(ast.Module(body=nodes,type_ignores=[]),str(path),'exec'),globals())

reuse_functions(ROOT/'scripts/refine-oudong.py',['xyz','mat','add','box','tube','lathe','ell'])
reuse_functions(ROOT/'scripts/refine-banteay-chhmar-faces-v3.py',['gauss','smoothstep','sculpt'])
bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2 if ULTRA else 1)
proto=bpy.context.object; SV=[tuple(v.co) for v in proto.data.vertices]; SF=[tuple(p.vertices) for p in proto.data.polygons]; bpy.data.objects.remove(proto,do_unlink=True)
STONE=[mat('Sandstone course '+str(i),c) for i,c in enumerate([(.33,.32,.265),(.40,.38,.31),(.28,.295,.235),(.46,.425,.34),(.365,.355,.30)])]
FACE=mat('Sculpted sandstone faces',(.44,.42,.34))
TRIM=mat('Carved stone mouldings',(.38,.37,.30)); FLOOR=mat('Walkable terraces and steps',(.40,.37,.29))
DARK=mat('Recessed stone',(.19,.20,.165)); GRASS=mat('Forest clearing',(.12,.20,.055)); PATH=mat('Earth approach',(.34,.24,.13))
BARK=mat('Tree trunks',(.18,.13,.07)); LEAF=[mat('Canopy '+str(i),(.04+i*.022,.14+i*.035,.035+i*.015)) for i in range(3)]
rng=random.Random(1200)

def stonebox(p,s,seed=0):
    box(p,s,STONE[seed%len(STONE)])

def masonry(x,z,y,w,d,h,seed=0):
    """Separate staggered courses: small recessed joints, no coplanar duplicate shells."""
    rows=max(1,round(h/(.24 if ULTRA else .40))); hh=h/rows
    for row in range(rows):
        # Core is recessed behind the four exposed blockwork faces.
        stonebox((x,y+(row+.5)*hh,z),(w-.19,hh-.006,d-.19),seed+row)
        for side in range(4):
            span=w if side%2==0 else d; n=max(2,round(span/(.43 if ULTRA else .65)))
            widths=[span/n]*n
            if row%2: widths=[span/n*.5]+[span/n]*(n-1)+[span/n*.5]
            a=-span/2
            for j,ww in enumerate(widths):
                offset=a+ww/2; a+=ww
                if side%2==0:
                    p=(x+offset,y+(row+.5)*hh,z+(1 if side==0 else -1)*(d/2-.045)); s=(ww-.007,hh-.007,.09)
                else:
                    p=(x+(1 if side==1 else -1)*(w/2-.045),y+(row+.5)*hh,z+offset); s=(.09,hh-.007,ww-.007)
                stonebox(p,s,seed+row*3+j+side)

def crown(x,z,y,w,seed):
    # Receding rounded cruciform mass and lotus-like cap, not a pointed pyramid.
    for i in range(4):
        r=w*(.55-i*.065); yy=y+i*w*.075
        lathe(x,z,[(yy,r*.97),(yy+w*.035,r),(yy+w*.075,r*.85)],STONE[(seed+i)%5],n=12 if ULTRA else 8)
        for a in range(8):
            aa=a*math.tau/8
            ell((x+r*.78*math.sin(aa),yy+w*.05,z+r*.78*math.cos(aa)),(w*.12,w*.075,w*.12),TRIM)
    lathe(x,z,[(y+w*.30,w*.27),(y+w*.38,w*.36),(y+w*.45,w*.31),(y+w*.48,w*.12)],TRIM,n=16)

def face(x,z,y,w,h,angle,seed):
    nx,ny=(48,64) if ULTRA else (24,32)
    vv=[]
    for j in range(ny+1):
        v=-1.5+j*3/ny
        for i in range(nx+1):
            u=-1.13+i*2.26/nx
            dep=sculpt(u,v)*w*.20
            # Carved course incisions live in the relief, not overlay polygons.
            joint=abs(((v+1.5)*8/3)%1-.5)
            dep-=.003*w*math.exp(-(joint/.035)**2)
            xx=u*w/2.26; zz=w*.38+dep
            vv.append((x+xx*math.cos(angle)+zz*math.sin(angle),y+(v+1.5)*h/3,z-xx*math.sin(angle)+zz*math.cos(angle)))
    ff=[]
    for j in range(ny):
        for i in range(nx):
            a=j*(nx+1)+i; ff.append((a,a+1,a+nx+2,a+nx+1))
    # Seal rear perimeter inside the tower; relief cannot be seen through from behind.
    edge=list(range(nx+1))+[j*(nx+1)+nx for j in range(1,ny+1)]+list(range(ny*(nx+1)+nx-1,ny*(nx+1)-1,-1))+[j*(nx+1) for j in range(ny-1,0,-1)]
    center=len(vv); vv.append((x,y+h/2,z))
    ff.extend((edge[(i+1)%len(edge)],edge[i],center) for i in range(len(edge)))
    add(FACE,vv,ff)

def portal(x,z,y,w,h,angle=0):
    def point(xx,yy,zz): return (x+xx*math.cos(angle)+zz*math.sin(angle),y+yy,z-xx*math.sin(angle)+zz*math.cos(angle))
    for s in [-1,1]:
        tube([point(s*w*.54,0,0),point(s*w*.54,h,0)],.105,TRIM,8)
    tube([point(-w*.67,h,0),point(w*.67,h,0)],.14,TRIM,6)
    tube([point(-w*.75,h+.1,0),point(-w*.48,h+.50,0),point(0,h+.82,0),point(w*.48,h+.50,0),point(w*.75,h+.1,0)],.11,TRIM,6)

towers=[]
def tower(x,z,base,w,h,seed,gate=False):
    towers.append([x,z,base,w,h,gate])
    lower=h*.34; fh=h*.43
    # A portal tower has an actual open passage beneath its supported upper mass.
    if gate:
        for s in [-1,1]: masonry(x+s*w*.38,z,base,w*.24,w*.82,lower,seed)
        box((x,base+lower+.09,z),(w,.18,w*.86),TRIM)
    else:
        masonry(x,z,base,w*.86,w*.86,lower,seed)
        box((x,base+lower*.46,z+w*.432),(w*.34,lower*.80,.015),DARK)
    for s in [-1,1]:
        portal(x,z+s*w*.46,base,w*.48,lower*.77,0 if s==1 else math.pi)
    masonry(x,z,base+lower,w*.78,w*.78,fh,seed+1)
    for a in range(4): face(x,z,base+lower,w,fh,a*math.pi/2,seed)
    # Small ledges / projecting pilasters give each corner its broken silhouette.
    for sx in [-1,1]:
        for sz in [-1,1]:
            for i in range(7):
                yy=base+lower+i*fh/7
                stonebox((x+sx*w*.40,yy+fh/14,z+sz*w*.40),(w*.16,fh/7-.01,w*.16),seed+i)
    crown(x,z,base+lower+fh,w,seed)

def stairs(zstart,zend,y0,y1,width):
    n=math.ceil((y1-y0)/.12)
    for i in range(n):
        high=y0+(i+1)*(y1-y0)/n; zz=zstart-(i+.5)*(zstart-zend)/n
        box((0,(high-.08)/2,zz),(width,high+.08,(zstart-zend)/n+.001),FLOOR)

box((0,-.17,-3),(36,.18,38),GRASS)
box((0,-.025,10.5),(4,.05,7),PATH)
box((0,.18,-4),(22,.36,22),FLOOR)
stairs(8.5,7,0,.36,3.6)
# Raised cruciform central platform, built as non-overlapping slabs.
box((0,.88,-4),(10,1.04,10),FLOOR)
box((0,.88,1.7),(3.4,1.04,1.4),FLOOR)
stairs(4,2.4,.36,1.4,3.4)
box((0,1.85,-4),(5.4,.9,5.4),FLOOR)
stairs(.8,-1.3,1.4,2.3,2.6)

def gallery(cx,cz,length,angle,seed):
    # Low corbelled roofs supported by both wall and outer piers. Some bays open to sky.
    n=round(length/1.25); bay=length/n
    def p(a,y,b): return (cx+a*math.cos(angle)+b*math.sin(angle),y,cz-a*math.sin(angle)+b*math.cos(angle))
    def b(a,y,z,w,h,d,m):
        pp=p(a,y,z); box(pp,(w,h,d) if abs(math.sin(angle))<.5 else (d,h,w),m)
    for i in range(n):
        a=-length/2+(i+.5)*bay
        # Blank framed relief fields. Historical narrative carvings are not invented.
        b(a,1.18,-.55,bay-.008,1.64,.23,STONE[(i+seed)%5])
        b(a,1.12,-.421,bay*.84,1.12,.018,STONE[(i+seed+2)%5])
        for j in range(4):
            b(a,.47+j*.46,-.397,bay,.045,.055,TRIM)
        for s in [-1,1]:
            b(a+s*bay*.45,1.2,.5,.18,1.68,.18,TRIM)
            b(a+s*bay*.45,.47,.5,.29,.20,.29,TRIM)
            b(a+s*bay*.45,1.96,.5,.29,.18,.29,TRIM)
        b(a,2.1,.0,bay,.18,1.38,TRIM)
        if (i+seed)%7!=2:
            for k in range(5): b(a,2.22+k*.13,0,bay-.006,.13,1.38-k*.21,STONE[(i+k+seed)%5])

# Four enclosure sides, clear central entrances and open courts between rings.
for side in [-1,1]:
    gallery(side*6.35,6.1,8.7,0,2)
    gallery(side*6.35,-14.1,8.7,0,4)
    gallery(side*10.1,-4,18.6,math.pi/2,1)
    gallery(side*4.1,.65,3.5,0,3)
    gallery(side*4.1,-9.1,3.5,0,2)
    gallery(side*5.7,-4,8.2,math.pi/2,4)

tower(0,-4,2.3,2.35,7.8,0)
for i in range(8):
    a=(i+.5)*math.tau/8
    tower(3.8*math.sin(a),-4+3.8*math.cos(a),1.4,1.38,4.5+(i%3)*.25,i)
for i,(x,z) in enumerate([(-7,3.5),(7,3.5),(-7,-11.5),(7,-11.5),(-8,-4),(8,-4),(-3.5,4),(3.5,4),(-3.5,-12),(3.5,-12)]):
    tower(x,z,.36,1.35,3.7+(i%3)*.35,i+3)
tower(0,6.1,.36,2.0,4.8,8,gate=True)
tower(0,-14.1,.36,1.8,4.5,9,gate=True)
# Small east courtyard library pavilions, explicitly approximate positions.
for x in [-6.6,6.6]:
    masonry(x,1,.36,1.45,2.1,1.6,4)
    box((x,1.08,2.06),(.60,1.3,.02),DARK); portal(x,2.09,.36,.65,1.25)
    for k in range(6): box((x,2.03+k*.15,1),(1.65-k*.20,.15,2.4-k*.07),STONE[k%5])
# Restrained fallen blocks at perimeter, never in the main walking route.
for i in range(65):
    x=rng.choice([-1,1])*rng.uniform(9,11); z=rng.uniform(-14,6)
    stonebox((x,.48,z),(rng.uniform(.25,.6),.24,rng.uniform(.25,.65)),i)
trees=[]
for _ in range(3000):
    x=rng.uniform(-17,17); z=rng.uniform(-21,14)
    if abs(x)<12.7 and -16.4<z<9: continue
    if abs(x)<6 and z>5: continue
    if any((x-a)**2+(z-b)**2<2.1**2 for a,b,h in trees): continue
    trees.append((x,z,rng.uniform(3.2,5.5)))
    if len(trees)==65: break
for i,(x,z,h) in enumerate(trees):
    tube([(x,-.08,z),(x+.08,h*.72,z)],[.15,.06],BARK)
    for j in range(3):
        a=i+j*math.tau/3
        ell((x+math.cos(a)*.64,h*.78,z+math.sin(a)*.64),(1.15,.85,1.15),LEAF[(i+j)%3])
    ell((x,h,z),(1,.85,1),LEAF[i%3])

for name,(verts,faces) in BATCH.items():
    mesh=bpy.data.meshes.new(name); mesh.from_pydata(verts,[],faces); mesh.update()
    o=bpy.data.objects.new(name,mesh); bpy.context.collection.objects.link(o); material=bpy.data.materials[name]; mesh.materials.append(material)
    bpy.context.view_layer.objects.active=o; o.select_set(True)
    bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT'); bpy.ops.mesh.normals_make_consistent(inside=False); bpy.ops.object.mode_set(mode='OBJECT'); o.select_set(False)
    if name==FACE.name:
        for poly in mesh.polygons: poly.use_smooth=len(poly.vertices)==4
    # Vertex-color weathering survives glTF export and needs no photo textures.
    if 'stone' in name.lower():
        col=mesh.color_attributes.new(name='Stone patina',type='BYTE_COLOR',domain='POINT')
        for i,v in enumerate(mesh.vertices):
            x,y,z=v.co
            q=.91+.09*math.sin(5*x+math.sin(7*z))*math.sin(5*y+3*z)
            c=material.diffuse_color
            col.data[i].color=(c[0]*q,c[1]*q,c[2]*q*.96,1)
        nodes=material.node_tree.nodes; links=material.node_tree.links
        vc=nodes.new('ShaderNodeVertexColor'); vc.layer_name=col.name
        links.new(vc.outputs['Color'],nodes.get('Principled BSDF').inputs['Base Color'])
        # Exporter uses white baseColorFactor and baked COLOR_0; no unsupported mix node.

sc=bpy.context.scene; sc['provenance']='Illustrative Bayon exterior, approximate layout and tower count, not a survey. No photo textures or invented narrative reliefs.'
sc.world=bpy.data.worlds.new('Daylight'); sc.world.use_nodes=True
sc.world.node_tree.nodes['Background'].inputs[0].default_value=(.64,.75,.85,1); sc.world.node_tree.nodes['Background'].inputs[1].default_value=.55
bpy.ops.object.light_add(type='SUN'); bpy.context.object.rotation_euler=(.5,-.5,-.4); bpy.context.object.data.energy=2.7; bpy.context.object.data.angle=.12
sc.render.engine='CYCLES'; sc.cycles.samples=12; sc.cycles.use_denoising=True
sc.render.resolution_x=1200; sc.render.resolution_y=900; sc.render.resolution_percentage=100; sc.view_settings.view_transform='AgX'
views=[('overview',(25,23,30),(0,2.5,-4),43),('approach',(-2,3.4,14),(0,4.3,-3),28),('faces',(0,2.8,3.6),(3.5,2.5,4),40),('central',(.1,7.5,4.5),(0,5.8,-4),28)]
for name,pos,target,lens in views:
    bpy.ops.object.camera_add(location=xyz(pos)); cam=bpy.context.object; cam.name='Review '+name
    cam.rotation_euler=(Vector(xyz(target))-cam.location).to_track_quat('-Z','Y').to_euler(); cam.data.lens=lens; cam.data.clip_end=200; sc.camera=cam
    if '--no-render' not in sys.argv and (ULTRA or name=='overview'):
        sc.render.filepath=str(OUT/f'{TIER}-{name}.png'); bpy.ops.render.render(write_still=True)
sc.camera=bpy.data.objects['Review overview']; bpy.ops.wm.save_as_mainfile(filepath=str(OUT/f'bayon-{TIER}.blend'))
bpy.ops.object.select_all(action='DESELECT'); meshes=[o for o in sc.objects if o.type=='MESH']
for o in meshes: o.select_set(True)
bpy.context.view_layer.objects.active=meshes[0]; dest=PUBLIC/f'bayon-{TIER}.glb'
bpy.ops.export_scene.gltf(filepath=str(dest),export_format='GLB',use_selection=True,export_cameras=False,export_lights=False,export_animations=False,export_yup=True,export_meshopt_compression_enable=True,export_meshopt_extension='EXT_meshopt_compression')
tri=sum(len(p.vertices)-2 for o in meshes for p in o.data.polygons)
report={'tier':TIER,'triangles':tri,'drawCalls':len(meshes),'bytes':dest.stat().st_size,'trees':trees,'towers':towers,'originalSha256':source_hash,'sha256':hashlib.sha256(dest.read_bytes()).hexdigest(),'surveyed':False,'photographsEmbedded':False,'historicalTowerCount':False}
assert hashlib.sha256(source.read_bytes()).hexdigest()==source_hash
assert tri<(750000 if ULTRA else 250000)
(OUT/f'{TIER}-report.json').write_text(json.dumps(report,indent=2)); print('BAYON_COMPLETE',TIER,tri,dest.stat().st_size,flush=True)
