"""Wat Phnom reference-led REVIEW ONLY. Never modifies live models or captures.
Run Blender --background --python scripts/refine-wat-phnom.py -- --normal/--ultra.
Coordinates below are viewer units: Y up, +Z toward the retained east stair.
Dimensions/composition are illustrative; photos inform silhouette, not a survey.
"""
import bpy, math, random, json, hashlib, sys
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'output/wat-phnom-review-v4'
OUT.mkdir(parents=True, exist_ok=True)
ULTRA = '--normal' not in sys.argv
TIER = 'ultra' if ULTRA else 'normal'
SOURCE = ROOT / f'public/models/local/wat-phnom-naga-v3/wat-phnom-{TIER}.blend'
SOURCE_HASH = hashlib.sha256(SOURCE.read_bytes()).hexdigest()
bpy.ops.wm.open_mainfile(filepath=str(SOURCE))
bpy.context.preferences.filepaths.save_version = 0

def signature(objects):
    h=hashlib.sha256()
    for o in sorted(objects,key=lambda o:o.name):
        h.update(o.name.encode())
        for row in o.matrix_world: h.update(str(tuple(row)).encode())
        for v in o.data.vertices: h.update(str(tuple(v.co)).encode())
        for p in o.data.polygons: h.update(str(tuple(p.vertices)).encode())
    return h.hexdigest()

retained=[o for o in bpy.context.scene.objects if o.name.startswith('Naga v3 |')]
assert len(retained)==5, 'Unexpected source; do not partially replace it'
STAIR_HASH=signature(retained)
for o in list(bpy.context.scene.objects):
    if o not in retained: bpy.data.objects.remove(o,do_unlink=True)

BATCH={}
def xyz(p): return (p[0],-p[2],p[1])
def mat(name,base,variation=.08):
    m=bpy.data.materials.new('V4 | '+name); m.use_nodes=True; m.diffuse_color=(*base,1)
    n=m.node_tree.nodes; l=m.node_tree.links; p=n.get('Principled BSDF')
    p.inputs['Base Color'].default_value=(*base,1); p.inputs['Roughness'].default_value=.86
    if variation:
        t=n.new('ShaderNodeTexNoise'); t.inputs['Scale'].default_value=19
        r=n.new('ShaderNodeValToRGB')
        r.color_ramp.elements[0].color=(*(max(0,c-variation) for c in base),1)
        r.color_ramp.elements[1].color=(*(min(1,c+variation) for c in base),1)
        l.new(t.outputs['Fac'],r.inputs[0]); l.new(r.outputs[0],p.inputs['Base Color'])
    return m

IVORY=mat('warm buff plaster',(.66,.52,.37),.035)
GOLD=mat('weathered ochre ornament',(.52,.31,.105),.045)
PALE=mat('pale carved stucco',(.78,.70,.54),.035)
RED=mat('oxblood platform',(.23,.049,.032),.025)
DARK=mat('dark carved timber',(.065,.035,.024),.012)
ROOF=mat('aged brown orange roof',(.24,.105,.055),.055)
TILE=mat('tile ribs',(.30,.15,.075),.035)
WHITE=mat('stupa lime plaster',(.79,.77,.67),.04)
STONE=mat('worn warm paving',(.40,.35,.27),.05)
SOIL=mat('green hill ground',(.16,.23,.067),.05)
BARK=mat('tree bark',(.15,.12,.065),.025)
LEAF=[mat('canopy '+str(i),(.055+i*.014,.13+i*.020,.023+i*.007),.02) for i in range(3)]

def add(name,m,v,f):
    vv,ff=BATCH.setdefault((name,m.name),([],[])); off=len(vv)
    vv.extend(xyz(p) for p in v); ff.extend(tuple(off+i for i in p) for p in f)
CUBE=[(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)]
def box(name,p,s,m):
    add(name,m,[(p[0]+a*s[0]/2,p[1]+b*s[1]/2,p[2]+c*s[2]/2) for a,b,c in [(-1,-1,-1),(1,-1,-1),(1,-1,1),(-1,-1,1),(-1,1,-1),(1,1,-1),(1,1,1),(-1,1,1)]],CUBE)
def tube(name,pts,r,m,sides=None):
    sides=sides or (8 if ULTRA else 5); vv=[]
    radii=[r]*len(pts) if isinstance(r,(int,float)) else r
    for i,(p,rad) in enumerate(zip(pts,radii)):
        d=Vector(pts[min(i+1,len(pts)-1)])-Vector(pts[max(0,i-1)])
        q=d.to_track_quat('Z','Y')
        vv.extend(tuple(Vector(p)+q@Vector((math.cos(j*math.tau/sides)*rad,math.sin(j*math.tau/sides)*rad,0))) for j in range(sides))
    ff=[tuple(range(sides-1,-1,-1)),tuple(range((len(pts)-1)*sides,len(pts)*sides))]
    for i in range(len(pts)-1):
        for j in range(sides):
            a=i*sides+j; b=i*sides+(j+1)%sides; ff.append((a,b,b+sides,a+sides))
    add(name,m,vv,ff)
def ring(name,x,z,y,r,thick,m):
    n=48 if ULTRA else 24
    tube(name,[(x+r*math.cos(i*math.tau/n),y,z+r*math.sin(i*math.tau/n)) for i in range(n+1)],thick,m,6 if ULTRA else 4)
def lathe(name,x,z,profile,m):
    n=64 if ULTRA else 32; vv=[]
    for y,r in profile: vv.extend((x+r*math.cos(i*math.tau/n),y,z+r*math.sin(i*math.tau/n)) for i in range(n))
    ff=[]
    for k in range(len(profile)-1):
        for i in range(n): ff.append((k*n+i,k*n+(i+1)%n,(k+1)*n+(i+1)%n,(k+1)*n+i))
    ff.extend([tuple(range(n-1,-1,-1)),tuple(range((len(profile)-1)*n,len(profile)*n))])
    add(name,m,vv,ff)
bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2 if ULTRA else 1)
proto=bpy.context.object; SV=[tuple(v.co) for v in proto.data.vertices]; SF=[tuple(p.vertices) for p in proto.data.polygons]
bpy.data.objects.remove(proto,do_unlink=True)
def ell(name,p,s,m): add(name,m,[(p[0]+v[0]*s[0],p[1]+v[1]*s[1],p[2]+v[2]*s[2]) for v in SV],SF)

# Larger veranda, masonry base and actual openings (no solid box sanctuary).
box('Terrace',(0,.115,-1.9),(7.3,.23,8.05),STONE)
box('Hall red plinth',(0,.42,-1.10),(5.45,.31,5.6),RED)
box('Hall moulded plinth',(0,.60,-1.10),(5.60,.08,5.72),RED)
box('Veranda floor',(0,.665,-1.1),(5.3,.05,5.48),STONE)
for i in range(6): box('Front hall steps',(0,.265+(i+1)*.065/2,2.10-i*.095),(1.65,(i+1)*.065,.10),STONE)
# Hall rear and sides; front split around a dark open entrance.
for x in [-1.62,1.62]: box('Sanctuary side wall',(x,1.53,-1.47),(.12,1.68,3.8),IVORY)
box('Sanctuary back',(0,1.53,-3.35),(3.35,1.68,.12),IVORY)
for x in [-1.17,1.17]: box('Sanctuary front',(x,1.53,.43),(.91,1.68,.13),IVORY)
box('Entrance lintel',(0,2.24,.43),(1.45,.27,.18),DARK)
box('Unmodeled interior shaded floor',(0,.71,-1.4),(3.1,.04,3.6),DARK)
for x in [-.74,.74]: box('Door frame',(x,1.46,.52),(.10,1.50,.12),GOLD)
for side in [-1,1]:
    for z in [-2.8,-1.7,-.6]:
        box('Timber window panels',(side*1.69,1.60,z),(.035,.88,.52),DARK)
        for yy in [1.10,2.10]: box('Window moulding',(side*1.72,yy,z),(.08,.06,.66),GOLD)
for x in [-2.42,-1.45,1.45,2.42]:
    for z in [1.35,-3.5]:
        box('Veranda column foot',(x,.79,z),(.28,.20,.28),RED)
        box('Veranda columns',(x,1.55,z),(.17,1.43,.17),IVORY)
        box('Veranda capitals',(x,2.29,z),(.26,.13,.26),GOLD)
for side in [-1,1]:
    for z in [-2.55,-1.55,-.55,.40]:
        x=side*2.42
        box('Veranda column foot',(x,.79,z),(.28,.20,.28),RED)
        box('Veranda columns',(x,1.55,z),(.17,1.43,.17),IVORY)
        box('Veranda capitals',(x,2.29,z),(.26,.13,.26),GOLD)
        tube('Curved roof brackets',[(x,1.98,z),(x+side*.12,2.10,z),(x+side*.28,2.22,z),(x+side*.31,2.43,z)],.055,GOLD)
    # Low open balustrade on the side veranda, not a solid wall.
    for yy in [.74,1.13]: box('Veranda railing',(side*2.44,yy,-1.05),(.14,.07,4.9),PALE)
    for j in range(30):
        z=-3.43+j*.16
        tube('Veranda balusters',[(side*2.44,.78,z),(side*2.44,.94,z),(side*2.44,1.10,z)],[.035,.05,.035],PALE,6)
    for x in [side*1.45,side*2.42]:
        tube('Front curved brackets',[(x,2.02,1.35),(x,2.17,1.48),(x,2.43,1.67)],.055,GOLD)

def slab(name,corners,m):
    vv=corners+[(x,y-.045,z) for x,y,z in corners]
    add(name,m,vv,[(0,1,2,3),(7,6,5,4),(0,4,5,1),(1,5,6,2),(2,6,7,3),(3,7,4,0)])

# Broad low veranda skirts surrounding two steep overlapping main roof ranges.
for side in [-1,1]:
    slab('Low veranda roof',[(side*2.88,2.40,1.8),(side*1.75,2.96,1.22),(side*1.75,2.96,-3.55),(side*2.88,2.40,-4.05)],ROOF)
for front,z0,z1 in [(True,1.8,1.22),(False,-4.05,-3.55)]:
    slab('Low end roof',[(-2.88,2.40,z0),(2.88,2.40,z0),(1.75,2.96,z1),(-1.75,2.96,z1)],ROOF)
    tube('Long front fascia',[(-2.91,2.40,z0),(2.91,2.40,z0)],.055,GOLD)
for side in [-1,1]: tube('Long side fascia',[(side*2.9,2.40,1.8),(side*2.9,2.40,-4.05)],.055,GOLD)

def gable(z,w,eave,ridge,sign):
    add('Dark inset gable',DARK,[(-w,eave,z),(w,eave,z),(0,ridge,z)],[(0,1,2)])
    # Original architectural foliate approximation, not copied sacred iconography.
    for side in [-1,1]:
        tube('Gable carved border',[(side*w,eave,z+.025*sign),(side*w*.52,(eave+ridge)/2,z+.025*sign),(0,ridge,z+.025*sign)],.065,GOLD)
        tube('Upturned roof finials',[(side*w,eave,z),(side*(w+.13),eave+.10,z+.06*sign),(side*(w+.23),eave+.34,z+.10*sign),(side*(w+.20),eave+.53,z+.12*sign)],[.065,.055,.033,.006],GOLD)
    tube('Tall ridge finial',[(0,ridge,z),(0,ridge+.21,z+.03*sign),(0,ridge+.47,z+.15*sign),(0,ridge+.72,z+.17*sign)],[.075,.06,.025,.003],GOLD)
    rows=6 if ULTRA else 4
    for j in range(rows):
        yy=eave+.16+j*(ridge-eave-.35)/rows; ww=w*(1-(yy-eave)/(ridge-eave))*.78
        for s in [-1,1]:
            pts=[(s*ww*k/16,yy+.08*math.sin(k*math.pi/8),z+.06*sign) for k in range(17)]
            tube('Foliate gable relief',pts,.018,PALE)
            for k in ([3,7,11] if ULTRA else [4,10]):
                x=s*ww*k/16; rad=min(.085,ww*.18)
                pts=[]
                for t in range(17):
                    a=t*math.pi*2/16; r=rad*(1-t/20)
                    pts.append((x+s*r*math.sin(a),yy+.12+r*math.cos(a),z+.07*sign))
                tube('Foliate relief scrolls',pts,.014,PALE,5)
    tube('Gable central relief',[(0,eave+.12,z+.07*sign),(0,ridge-.22,z+.07*sign)],.035,PALE)

for w,eave,ridge,z0,z1 in [(1.96,2.92,4.48,1.26,-3.60),(1.60,3.47,4.92,.15,-2.8)]:
    for s in [-1,1]:
        slab('Steep layered roof',[(s*w,eave,z0),(0,ridge,z0),(0,ridge,z1),(s*w,eave,z1)],ROOF)
        tube('Sloped gilded eave',[(s*w,eave,z0),(s*w,eave,z1)],.055,GOLD)
        # Batched rows/columns give the surface actual roof-scale detail.
        rows=26 if ULTRA else 13
        for j in range(1,rows):
            t=j/rows; x=s*w*t; yy=ridge+(eave-ridge)*t+.017
            tube('Roof tile courses',[(x,yy,z0),(x,yy,z1)],.012,TILE,4)
        for j in range(46 if ULTRA else 23):
            zz=z0+(z1-z0)*j/(46 if ULTRA else 23)
            tube('Roof tile seams',[(s*w,eave+.008,zz),(0,ridge+.008,zz)],.003,TILE,4)
    tube('Roof ridge',[(0,ridge,z0),(0,ridge,z1)],.06,GOLD)
    gable(z0+.012,w,eave,ridge,1); gable(z1-.012,w,eave,ridge,-1)

def lion(x,z,base,scale=1):
    def p(a,b,c): return (x+a*scale,base+b*scale,z+c*scale)
    def e(n,a,b,c,s): ell(n,p(a,b,c),tuple(v*scale for v in s),PALE)
    box('Hall guardian plinth',p(0,.09,0),(.56*scale,.18*scale,.67*scale),RED)
    e('Hall guardian torso',0,.52,-.04,(.21,.35,.25)); e('Hall guardian chest',0,.66,.09,(.21,.30,.19))
    e('Hall guardian head',0,.94,.15,(.23,.22,.21)); e('Hall guardian muzzle',0,.87,.33,(.17,.09,.09))
    box('Hall guardian mouth',p(0,.86,.405),(.22*scale,.045*scale,.012*scale),DARK)
    for s in [-1,1]:
        e('Hall guardian haunch',s*.18,.38,-.08,(.15,.20,.18)); e('Hall guardian leg',s*.13,.40,.20,(.065,.22,.075))
        e('Hall guardian paw',s*.13,.20,.27,(.10,.055,.13)); e('Hall guardian ear',s*.17,1.07,.10,(.05,.08,.05))
        ell('Hall guardian eyes',p(s*.085,.97,.335),(.018*scale,.015*scale,.012*scale),DARK)
    for j in range(6):
        yy=.62+j*.063
        tube('Hall guardian mane', [p(-.19,yy,.10),p(0,yy-.04,.28),p(.19,yy,.10)],.018*scale,GOLD,5)
for x in [-1.06,1.06]: lion(x,1.56,.65,.9)

# Bell-shaped limewashed stupa with square terraces and annular spire.
SZ=-5.65
for i,(w,h) in enumerate([(3.7,.20),(3.42,.18),(3.05,.17),(2.78,.15)]):
    bottom=.23+sum([.20,.18,.17,.15][:i])
    box('Stupa stepped square base',(0,bottom+h/2,SZ),(w,h,w),WHITE)
    box('Stupa base moulding',(0,bottom+h+.015,SZ),(w+.06,.05,w+.06),WHITE)
profile=[(.93,1.24),(1.04,1.30),(1.14,1.23),(1.25,1.18),(1.42,1.06),(1.65,.93),(1.95,.85),(2.25,.81),(2.55,.79),(2.80,.73),(3.03,.61),(3.13,.60)]
lathe('Stupa bell',0,SZ,profile,WHITE)
for y,r in [(1.04,1.30),(1.19,1.21),(1.31,1.15),(2.98,.65)]: ring('Stupa moulded rings',0,SZ,y,r,.045,WHITE)
for j in range(12):
    y=3.12+j*.22; r=.61*(1-j/13)**1.12
    nxt=.61*(1-(j+1)/13)**1.12
    lathe('Stupa annular spire',0,SZ,[(y,r),(y+.025,r+.02),(y+.065,r+.025),(y+.105,r+.01),(y+.16,r-.018),(y+.22,nxt)],WHITE)
lathe('Stupa pointed crown',0,SZ,[(5.73,.075),(5.95,.045),(6.22,.012)],GOLD)
for j in range(20 if ULTRA else 12):
    a=j*math.tau/(20 if ULTRA else 12); x=.79*math.cos(a); z=SZ+.79*math.sin(a)
    tube('Bell lotus relief',[(x*.91,2.86,SZ+(z-SZ)*.91),(x,2.63,z),(x*.95,2.43,SZ+(z-SZ)*.95)],[.035,.065,.01],WHITE)
for x in [-1.50,1.50]:
    for z in [SZ-1.5,SZ+1.5]: lion(x,z,.42,.38)

# Potted flowering shrubs, visible in the facade reference.
for x in [-2.55,-2.02,2.02,2.55]:
    lathe('Terracotta flower pots',x,2.0,[(.265,.12),(.42,.18),(.47,.19)],RED)
    ell('Flowering shrubs',(x,.57,2.0),(.24,.19,.20),LEAF[1])
    for i in range(7):
        a=i*2.4; ell('Small pale flowers',(x+.16*math.cos(a),.65+.025*(i%3),2+.14*math.sin(a)),(.028,.025,.025),PALE)

# Green earthen hill. The approach corridor is kept below retained stair treads.
def ground(x,z):
    r=math.hypot(x,z*.87)
    h=0 if r<4.3 else -1.4*min(1,(r-4.3)/9)
    if abs(x)<2.2 and z>2.15: h=min(h,.265-(z-2.25)*1.365/9-.29)
    return max(-1.42,h)
n=100 if ULTRA else 60; vv=[]
for i in range(n+1):
    for j in range(n+1):
        x=-17+i*34/n; z=-17+j*34/n; vv.append((x,ground(x,z)-.025,z))
ff=[]
for i in range(n):
    for j in range(n):
        a=i*(n+1)+j; ff.append((a,a+1,a+n+2,a+n+1))
add('Green wooded hill',SOIL,vv,ff)
# Thin solid support below the summit terrace, avoids a floating rear podium.
box('Summit masonry foundation',(0,-.20,-1.9),(7.28,.58,8.03),RED)
box('Stupa earth support',(0,-.08,SZ),(3.8,.62,3.8),SOIL)
trees=[]; rr=random.Random(1372)
for _ in range(5000):
    x=rr.uniform(-15,15); z=rr.uniform(-14,14)
    if math.hypot(x,z)>16 or (abs(x)<5.2 and -9.5<z<4): continue
    if abs(x)<4.5 and z>0: continue
    if any((x-a)**2+(z-b)**2<2.3**2 for a,b,h in trees): continue
    trees.append((x,z,rr.uniform(2.8,4.4)))
    if len(trees)==90: break
for i,(x,z,h) in enumerate(trees):
    y=ground(x,z)-.03
    tube('Park tree trunks',[(x,y,z),(x+.10,y+h*.55,z),(x-.10,y+h*.82,z+.10)],[.16,.10,.035],BARK)
    for k in range(4):
        a=k*math.pi/2+i; px=x+math.cos(a)*.8; pz=z+math.sin(a)*.8
        tube('Park branches',[(x,y+h*.48,z),(px,y+h*.83,pz)],[.065,.015],BARK,5)
        ell('Park canopy',(px,y+h*.84,pz),(1.03,.66,1.0),LEAF[(i+k)%3])
        ell('Park canopy',(px*.98,y+h,pz*.98),(.83,.53,.80),LEAF[(i+k+1)%3])

bpy.ops.object.select_all(action='DESELECT')
for (name,material),(vv,ff) in BATCH.items():
    mesh=bpy.data.meshes.new(name); mesh.from_pydata(vv,[],ff); mesh.update()
    # Recalculate winding consistently before review/export.
    o=bpy.data.objects.new(name,mesh); bpy.context.collection.objects.link(o); mesh.materials.append(bpy.data.materials[material])
    o['review_component']=name
    bpy.context.view_layer.objects.active=o; o.select_set(True)
    bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT'); bpy.ops.mesh.normals_make_consistent(inside=False); bpy.ops.object.mode_set(mode='OBJECT'); o.select_set(False)
    if name in ['Park canopy','Stupa bell','Stupa annular spire','Stupa moulded rings','Park tree trunks','Park branches']:
        for p in mesh.polygons: p.use_smooth=True
assert signature(retained)==STAIR_HASH, 'Retained staircase changed'
sc=bpy.context.scene; sc['site']='Wat Phnom'; sc['tier']=TIER; sc['review_only']=True
sc['stupa_cap_separation_fixed']=True
sc['provenance']='Reference-led illustrative exterior. Not a survey. No copied photo textures or sacred narrative relief.'
sc.world=bpy.data.worlds.new('Wat Phnom daylight'); sc.world.use_nodes=True
sc.world.node_tree.nodes['Background'].inputs[0].default_value=(.63,.73,.84,1)
sc.world.node_tree.nodes['Background'].inputs[1].default_value=.55
bpy.ops.object.light_add(type='SUN'); bpy.context.object.rotation_euler=(.45,-.45,-.3); bpy.context.object.data.energy=2.5; bpy.context.object.data.angle=.16
sc.render.engine='CYCLES'; sc.cycles.samples=24; sc.cycles.use_denoising=True
sc.render.resolution_x=1440; sc.render.resolution_y=1080; sc.render.resolution_percentage=100
sc.view_settings.view_transform='AgX'
views=[('01-hall',(3,4.0,10),(0,2.3,-.8),32),('02-hill',(12,19,26),(0,1,0),43),('03-stupa',(2,3.8,-9),(0,3.2,SZ),14),('04-stair',(2.4,2.8,14),(0,.75,5.3),37)]
for name,pos,target,lens in views:
    bpy.ops.object.camera_add(location=xyz(pos)); cam=bpy.context.object; cam.name='Review '+name
    cam.rotation_euler=(Vector(xyz(target))-cam.location).to_track_quat('-Z','Y').to_euler(); cam.data.lens=lens; cam.data.clip_end=150
    sc.camera=cam
    if not ULTRA and name!='01-hall': continue
    sc.render.filepath=str(OUT/(TIER+'-'+name+'.png')); bpy.ops.render.render(write_still=True)
sc.camera=bpy.data.objects['Review 01-hall']
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/f'wat-phnom-{TIER}.blend'))
tri=sum(len(p.vertices)-2 for o in sc.objects if o.type=='MESH' for p in o.data.polygons)
report={'tier':TIER,'triangles':tri,'meshObjects':sum(o.type=='MESH' for o in sc.objects),'trees':trees,'sourceSha256':SOURCE_HASH,'stairGeometrySha256':STAIR_HASH,'retainedStairObjects':5,'reviewOnly':True,'liveFilesChanged':False,'surveyed':False,'photographsEmbedded':False}
(OUT/(TIER+'-report.json')).write_text(json.dumps(report,indent=2))
assert hashlib.sha256(SOURCE.read_bytes()).hexdigest()==SOURCE_HASH
print('WAT_PHNOM_REVIEW_COMPLETE',TIER,tri,flush=True)
