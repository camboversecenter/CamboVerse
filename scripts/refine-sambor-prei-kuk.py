"""Reference-led Blender review, NOT a survey and NOT a live site import.
Run Blender --background --python scripts/refine-sambor-prei-kuk.py
Coordinates metres, Z up; front of each study tower faces -Y.
The three groups are deliberately compressed for this teaching composition.
"""
import bpy, math, random, json, hashlib, sys
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'output/sambor-prei-kuk-review-v2'
OUT.mkdir(parents=True, exist_ok=True)
R = random.Random(1532)
BATCH = {}
ULTRA = '--normal' not in sys.argv
TIER = 'ultra' if ULTRA else 'normal'
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.context.preferences.filepaths.save_version = 0

def mat(name, low, high, scale=1.0, bump=.04):
    m = bpy.data.materials.new(name); m.use_nodes = True; m.diffuse_color = (*high, 1)
    n=m.node_tree.nodes; l=m.node_tree.links; p=n.get('Principled BSDF')
    p.inputs['Roughness'].default_value=.94
    geo=n.new('ShaderNodeNewGeometry'); noise=n.new('ShaderNodeTexNoise')
    noise.inputs['Scale'].default_value=scale; noise.inputs['Detail'].default_value=4
    ramp=n.new('ShaderNodeValToRGB')
    ramp.color_ramp.elements[0].position=.34; ramp.color_ramp.elements[0].color=(*low,1)
    ramp.color_ramp.elements[1].position=.66; ramp.color_ramp.elements[1].color=(*high,1)
    l.new(geo.outputs['Position'],noise.inputs['Vector']); l.new(noise.outputs['Fac'],ramp.inputs[0])
    l.new(ramp.outputs[0],p.inputs['Base Color'])
    fine=n.new('ShaderNodeTexNoise'); fine.inputs['Scale'].default_value=27
    b=n.new('ShaderNodeBump'); b.inputs['Strength'].default_value=.42; b.inputs['Distance'].default_value=bump
    l.new(geo.outputs['Position'],fine.inputs['Vector']); l.new(fine.outputs['Fac'],b.inputs['Height']); l.new(b.outputs[0],p.inputs['Normal'])
    return m

BRICK=[mat('Fired brick weathering '+str(i),(.048+i*.005,.048+i*.003,.031),(.43+i*.025,.23+i*.012,.12+i*.008),.29) for i in range(3)]
STONE=mat('Weathered sandstone',(.16,.155,.115),(.48,.43,.30),1.7)
SOIL=mat('Forest soil and moss',(.095,.105,.043),(.30,.25,.15),.15,.06)
PATH=mat('Compacted sandy earth',(.24,.19,.12),(.43,.35,.23),.6)
BARK=mat('Tree bark',(.08,.073,.045),(.28,.26,.17),1.4,.08)
LEAF=[mat('Leaf greens '+str(i),(.035,.068,.013),(.12+i*.027,.22+i*.025,.044+i*.009),.9,.005) for i in range(3)]
LITTER=mat('Dry leaves',(.12,.09,.025),(.32,.24,.095),3,.01)

def add(name,m,verts,faces):
    vv,ff=BATCH.setdefault((name,m.name),([],[])); off=len(vv)
    vv.extend(verts); ff.extend(tuple(off+i for i in f) for f in faces)

CUBE=[(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)]
def box(name,p,size,m,angle=0,wear=0):
    verts=[]; c=math.cos(angle); s=math.sin(angle)
    for a,b,d in [(-1,-1,-1),(1,-1,-1),(1,1,-1),(-1,1,-1),(-1,-1,1),(1,-1,1),(1,1,1),(-1,1,1)]:
        x=a*size[0]/2+R.uniform(-wear,wear); y=b*size[1]/2+R.uniform(-wear,wear); z=d*size[2]/2+R.uniform(-wear,wear)
        verts.append((p[0]+c*x-s*y,p[1]+s*x+c*y,p[2]+z))
    add(name,m,verts,CUBE)

def tube(name,points,radii,m,sides=8):
    vv=[]
    for i,(p,r) in enumerate(zip(points,radii)):
        a=Vector(points[max(0,i-1)]); b=Vector(points[min(len(points)-1,i+1)])
        q=(b-a).to_track_quat('Z','Y')
        vv.extend(tuple(Vector(p)+q@Vector((r*math.cos(j*math.tau/sides),r*math.sin(j*math.tau/sides),0))) for j in range(sides))
    ff=[tuple(range(sides-1,-1,-1)),tuple(range((len(points)-1)*sides,len(points)*sides))]
    for i in range(len(points)-1):
        for j in range(sides):
            k=i*sides+j; nxt=i*sides+(j+1)%sides; ff.append((k,nxt,nxt+sides,k+sides))
    add(name,m,vv,ff)

def ell(name,p,scale,m):
    add(name,m,[(p[0]+v[0]*scale[0],p[1]+v[1]*scale[1],p[2]+v[2]*scale[2]) for v in SV],SF)

bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2 if ULTRA else 1)
proto=bpy.context.object; SV=[tuple(v.co) for v in proto.data.vertices]; SF=[tuple(p.vertices) for p in proto.data.polygons]
bpy.data.objects.remove(proto,do_unlink=True)

def facept(cx,cy,a,u,d,z):
    return(cx+math.cos(a)*u+math.sin(a)*d,cy+math.sin(a)*u-math.cos(a)*d,z)

def relief(name,cx,cy,a,r,z,w):
    # Architectural flying-palace panel study, not a replica of its iconography.
    def b(u,zz,ww,hh,depth=.16): box(name,facept(cx,cy,a,u,r+depth/2,zz),(ww,depth,hh),BRICK[1],a,.008)
    for j in range(3): b(0,z+j*.16,w+.14*j,.14)
    for side in [-1,1]:
        b(side*w*.38,z+1.03,.16,1.48,.24)
        for k in range(5): b(side*w*.38,z+.44+k*.27,.23,.08,.29)
    b(0,z+1.83,w*1.02,.24,.23)
    for j in range(6): b(0,z+2.03+j*.14,w*(.91-j*.135),.16,.22)
    # Weathered recessed niche, no invented identifiable deity.
    b(0,z+.62,w*.54,.10,.11)
    for side in [-1,1]: b(side*w*.24,z+1.12,.11,.87,.18)
    for j in range(9):
        u=(j-4)*w/10; ell(name,facept(cx,cy,a,u,r+.16,z-.13),(.10,.10,.10),BRICK[0])

def doorway(name,cx,cy,r,z,width,height,false=False):
    y=cy-r-.35
    if false: box(name+' false door',(cx,y+.16,z+height/2),(width,.25,height),STONE,wear=.012)
    for s in [-1,1]:
        box(name+' sandstone jamb',(cx+s*(width/2+.15),y,z+height/2),(.30,.65,height+.15),STONE,wear=.012)
        tube(name+' colonette',[(cx+s*(width/2+.42),y-.27,z+.1),(cx+s*(width/2+.42),y-.27,z+height-.12)],[.14,.14],STONE,12)
        for j in range(12):
            zz=z+.22+j*(height-.4)/12
            tube(name+' colonette rings',[(cx+s*(width/2+.42),y-.27,zz),(cx+s*(width/2+.42),y-.27,zz+.09)],[.19,.19],STONE,12)
    box(name+' lintel',(cx,y-.08,z+height+.26),(width+1.35,.82,.65),STONE,wear=.025)
    for j in range(13):
        x=cx+(j-6)*(width+1.10)/13
        ell(name+' lintel floral bosses',(x,y-.51,z+height+.22),(.12,.075,.14),STONE)
    box(name+' sill',(cx,y,z+.03),(width+.7,1.25,.18),STONE,wear=.02)

TOWERS=[]
def tower(name,cx,cy,sides,r,h,guardians=False):
    base=.65; shoulder=h*.52; rise=h-shoulder
    # Short moulded base, never a massive Angkor mountain platform.
    for k,(extra,z,hh) in enumerate([(.60,.13,.26),(.39,.33,.14),(.24,.50,.20)]):
        for face in range(sides):
            a=face*math.tau/sides; w=2*(r+extra)*math.tan(math.pi/sides)
            box(name+' plinth',facept(cx,cy,a,0,r+extra-.3,z),(w,.6,hh),BRICK[k%3],a,.012)
    step=.16 if ULTRA else .27; count=math.ceil((h-base)/step); step=(h-base)/count
    opening=2.5 if sides==4 else 1.55; doorh=5.1 if sides==4 else 3.45
    for row in range(count):
        z=base+(row+.5)*step
        t=max(0,(z-shoulder)/rise)
        rad=r*(1-.045*min(z/shoulder,1)) - r*.51*t
        # Incomplete surviving upper stages: broken rather than a new pointed roof.
        if t>0: rad+=.12*math.sin(t*math.pi*6)**2
        for face in range(sides):
            a=face*math.tau/sides; w=2*rad*math.tan(math.pi/sides)
            n=max(3,round(w/(.48 if ULTRA else .78))); bw=w/n
            for j in range(n):
                u=-w/2+(j+.5)*bw
                cap=h-.32*(1+math.sin(face*3.3+j*.7))
                if z>cap: continue
                if face==0 and abs(u)<opening/2+.12 and z<base+doorh: continue
                # Keep courses closed; shallow setbacks supply wear without holes.
                depth=.70 if t==0 else .82
                inset=R.uniform(0,.055) if ULTRA else 0
                box(name+' brick shell',facept(cx,cy,a,u,rad-inset,z),(bw+.012,depth,step-.008),BRICK[(row//8+face+j//5)%3],a,.006 if ULTRA else .002)
    # Cornice lines and vertical pilasters articulate the early brick forms.
    for face in range(sides):
        a=face*math.tau/sides; w=2*r*math.tan(math.pi/sides)
        for z in [base+.12,shoulder-.42,shoulder-.13]:
            box(name+' cornice',facept(cx,cy,a,0,r*.955+.17,z),(w*.97,.26,.16),BRICK[1],a,.014)
        for s in [-1,1]:
            for j in range(int((shoulder-base)/.28)):
                zz=base+(j+.5)*.28
                box(name+' pilasters',facept(cx,cy,a,s*w*.43,r*(1-.045*zz/shoulder)+.12,zz),(.30,.32,.274),BRICK[1],a,.009)
        if face!=0:
            relief(name+' flying palace study',cx,cy,a,r*.973+.35,base+1.45,min(w*.54,3.1))
    doorway(name,cx,cy,r,base,opening,doorh)
    # Short access stairs and side pedestal blocks remain grounded.
    for j in range(6):
        box(name+' entrance steps',(cx,cy-r-2.7+j*.36,(j+1)*.11/2),(opening+.62,.42,(j+1)*.11),STONE,wear=.012)
    if guardians:
        for s in [-1,1]: lion(cx+s*2.0,cy-r-1.60)
    TOWERS.append(dict(name=name,x=cx,y=cy,sides=sides,height=h,apothem=r,openEntrance=True))

def lion(x,y):
    name='Prasat Tao guardian study'
    box(name+' pedestal',(x,y,.56),(1.13,1.8,1.12),STONE,wear=.025)
    # A seated/crouching body, upright forelegs, raised head and open stone mouth.
    ell(name,(x,y+.16,1.69),(.43,.67,.51),STONE)
    ell(name,(x,y+.51,1.48),(.48,.43,.37),STONE)
    for s in [-1,1]:
        tube(name,[(x+s*.25,y-.40,1.16),(x+s*.23,y-.40,1.98)],[.15,.13],STONE,10)
        ell(name,(x+s*.26,y-.50,1.19),(.20,.29,.12),STONE)
        ell(name,(x+s*.36,y+.47,1.36),(.19,.42,.21),STONE)
    ell(name,(x,y-.31,2.05),(.47,.37,.58),STONE)
    ell(name,(x,y-.41,2.53),(.34,.36,.31),STONE)
    ell(name,(x,y-.72,2.57),(.27,.27,.12),STONE)
    ell(name,(x,y-.71,2.32),(.25,.23,.09),STONE)
    for s in [-1,1]:
        ell(name,(x+s*.28,y-.29,2.67),(.11,.10,.13),STONE)
        ell(name,(x+s*.18,y-.67,2.65),(.08,.045,.05),STONE)
    # Coiled mane is a simplified interpretation of the photographed curls.
    for j in range(5):
        for k in range(7):
            a=(k-3)*.40; z=1.65+j*.17
            ell(name,(x+math.sin(a)*.43,y-.33-math.cos(a)*.32,z),(.065,.06,.075),STONE)
    tube(name,[(x,y+.71,1.63),(x,y+.87,1.94),(x,y+.62,2.12)],[.07,.06,.045],STONE)

# Representative group studies, NOT a measured placement of all monuments.
tower('Central group | Prasat Tao study',0,0,4,5.35,20.5,True)
tower('North group | square sanctuary study',-4,35,4,4.3,17)
tower('North group | N7 octagonal study',-19,23,8,3.1,12.9)
tower('South group | square sanctuary study',5,-34,4,4.1,16)
for i,(x,y) in enumerate([(-9,-28),(18,-29),(17,-43)]):
    tower('South group | octagonal study '+str(i+1),x,y,8,2.5,10.9-i*.3)

box('Continuous forest floor',(0,0,-.24),(126,148,.48),SOIL)
# Paths are visually separated above terrain; no coplanar overlay.
for y0,y1,x in [(-13,13,0),(13,27,-4),(-54,-42,5)]:
    box('Earth paths',(x,(y0+y1)/2,.016),(3.3,y1-y0,.026),PATH)
# Low wall fragments suggest enclosures without inventing intact galleries.
for gx,gy in [(0,0),(-4,35),(5,-34)]:
    for side in [-1,1]:
        for j in range(38):
            x=gx-14+j*.75; y=gy+side*11
            if abs(x-gx)<2.2: continue
            rows=2+int((1+math.sin(j*.7))*2)
            for k in range(rows): box('Low enclosure remnants',(x,y,.10+k*.18),(.74,.8,.175),BRICK[0],wear=.009)
    for j in range(65):
        a=R.random()*math.tau; rad=R.uniform(6.8,9.3)
        box('Scattered fallen bricks',(gx+math.cos(a)*rad,gy+math.sin(a)*rad,.10),(.42,.22,.18),BRICK[j%3],R.random()*6,.025)

TREES=[]
rr=random.Random(667)
def near_review_sightline(x,y):
    for a,b in [((19,-34),(0,-5)),((-31,2),(-19,23)),((9,-17),(0,-5))]:
        dx=b[0]-a[0]; dy=b[1]-a[1]
        t=max(0,min(1,((x-a[0])*dx+(y-a[1])*dy)/(dx*dx+dy*dy)))
        if (x-a[0]-t*dx)**2+(y-a[1]-t*dy)**2<3.8**2: return True
    return False
for _ in range(4500):
    x=rr.uniform(-58,58); y=rr.uniform(-67,67)
    if any((x-t['x'])**2+(y-t['y'])**2<(t['apothem']+5.4)**2 for t in TOWERS): continue
    # Open approach for the main facade and render review cameras.
    if abs(x)<7 and -23<y<4: continue
    if near_review_sightline(x,y): continue
    if any((x-a)**2+(y-b)**2<17 for a,b,h in TREES): continue
    h=rr.uniform(14,23); TREES.append((x,y,h))
    if len(TREES)==190: break
for i,(x,y,h) in enumerate(TREES):
    lean=rr.uniform(-1.5,1.5)
    tube('Forest trunks',[(x,y,0),(x+.3,y,h*.42),(x+lean,y+.5,h*.84)],[.34,.24,.10],BARK)
    for k in range(4):
        a=k*math.tau/4+i; end=(x+math.cos(a)*3.4,y+math.sin(a)*3.4,h+rr.uniform(-2,2))
        tube('Forest branches',[(x+lean*.6,y+.3,h*.57),end],[.14,.025],BARK,6)
        # Broad masses retain a legible canopy at distance; leaf cards add edges.
        for clump in range(3):
            ell('Canopy masses',(end[0]+math.cos(clump*2.2+i)*1.2,end[1]+math.sin(clump*2.2+i)*1.2,end[2]),(2.0,1.8,1.05),LEAF[(i+k)%3])
        for j in range(70 if ULTRA else 24):
            px=end[0]+rr.uniform(-2.6,2.6); py=end[1]+rr.uniform(-2.6,2.6); pz=end[2]+rr.uniform(-1.2,1.0)
            size=rr.uniform(.37,.72)*(1 if ULTRA else 1.65)
            add('Leaf canopy',LEAF[(i+k)%3],[(px-size,py,pz),(px,py-size*.42,pz+.12),(px+size,py,pz),(px,py+size*.42,pz-.06)],[(0,1,2),(0,2,3)])
    for k in range(4):
        a=k*math.pi/2+i
        tube('Buttress roots',[(x,y,.85),(x+math.cos(a)*1.5,y+math.sin(a)*1.5,.12),(x+math.cos(a)*2.4,y+math.sin(a)*2.4,.025)],[.22,.12,.015],BARK,6)
for j in range(2800 if ULTRA else 700):
    x=rr.uniform(-55,55); y=rr.uniform(-63,63)
    if any(abs(x-t['x'])<t['apothem'] and abs(y-t['y'])<t['apothem'] for t in TOWERS): continue
    s=rr.uniform(.08,.23)
    add('Forest leaf litter',LITTER,[(x-s,y,.026),(x,y-s*.4,.04),(x+s,y,.026),(x,y+s*.4,.04)],[(0,1,2,3)])

for (name,material),(vv,ff) in BATCH.items():
    mesh=bpy.data.meshes.new(name); mesh.from_pydata(vv,[],ff); mesh.validate(clean_customdata=True); mesh.update()
    obj=bpy.data.objects.new(name,mesh); bpy.context.collection.objects.link(obj)
    mesh.materials.append(bpy.data.materials[material]); obj['interpretation']='Reference-led illustrative review; not surveyed'

sc=bpy.context.scene
sc['site']='Sambor Prei Kuk'; sc['review_only']=True
sc['layout_note']='Compressed representative north/central/south groups; not a site plan'
sc['tier']=TIER
sc.world=bpy.data.worlds.new('Forest daylight'); sc.world.use_nodes=True
sc.world.node_tree.nodes['Background'].inputs[0].default_value=(.55,.66,.79,1)
sc.world.node_tree.nodes['Background'].inputs[1].default_value=.5
bpy.ops.object.light_add(type='SUN'); sun=bpy.context.object; sun.rotation_euler=(.45,-.44,-.5); sun.data.energy=2.4; sun.data.angle=.18
sc.render.engine='CYCLES'; sc.cycles.samples=24; sc.cycles.use_denoising=True
sc.render.resolution_x=1440; sc.render.resolution_y=1080; sc.render.resolution_percentage=100
sc.view_settings.view_transform='AgX'; sc.view_settings.exposure=.45
views=[('01-tao-facade',(12,-20,10),(0,0,10),22),('02-octagonal',(-31,2,8),(-19,23,6.4),36),('03-forest-groups',(93,-118,107),(0,0,2),44),('04-entrance',(9,-17,5),(0,-5,3.5),46)]
for name,pos,target,lens in views:
    bpy.ops.object.camera_add(location=pos); cam=bpy.context.object; cam.name='Review '+name
    cam.rotation_euler=(Vector(target)-cam.location).to_track_quat('-Z','Y').to_euler(); cam.data.lens=lens; cam.data.clip_end=450
    sc.camera=cam
    if not ULTRA and name!='01-tao-facade': continue
    sc.render.filepath=str(OUT/(TIER+'-'+name+'.png'))
    bpy.ops.render.render(write_still=True)
sc.camera=bpy.data.objects['Review 01-tao-facade']
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/('sambor-prei-kuk-'+TIER+'.blend')))
tri=sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in sc.objects if o.type=='MESH')
report={'tier':TIER,'triangles':tri,'meshObjects':sum(o.type=='MESH' for o in sc.objects),'trees':len(TREES),'towers':TOWERS,'reviewOnly':True,'liveFilesChanged':False,'proceduralMaterials':True,'photographsEmbedded':False}
(OUT/(TIER+'-report.json')).write_text(json.dumps(report,indent=2))
print('SAMBOR_REVIEW_COMPLETE',TIER,tri,flush=True)
