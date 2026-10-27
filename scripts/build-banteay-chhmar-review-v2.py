"""Reference-led Banteay Chhmar review. Blender ONLY: never exports/imports GLB.

Coordinates: metres, X east, Y north, Z up. Main gallery envelope ~250x200m.
Provisional architectural interpretation, NOT a surveyed reconstruction.
References and uncertainty register: docs/BANTEAY-CHHMAR-REVIEW-V2.md.
"""
import bpy, math, random
from pathlib import Path
from mathutils import Vector, Matrix
from mathutils.noise import noise_vector

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'public/models/local/banteay-chhmar-review-v2'
OUT.mkdir(parents=True, exist_ok=True)
rng = random.Random(20261019)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
for m in list(bpy.data.materials):
    bpy.data.materials.remove(m)

def material(name, color, rough=.85):
    m=bpy.data.materials.new(name); m.diffuse_color=(*color,1); m.use_nodes=True
    bs=m.node_tree.nodes.get('Principled BSDF')
    bs.inputs['Base Color'].default_value=(*color,1)
    bs.inputs['Roughness'].default_value=rough
    return m

stone=material('Weathered grey sandstone • procedural, no photo texture',(.30,.31,.245))
n=stone.node_tree.nodes; l=stone.node_tree.links; bs=n.get('Principled BSDF')
coord=n.new('ShaderNodeTexCoord'); tex=n.new('ShaderNodeTexNoise')
tex.inputs['Scale'].default_value=2.8; tex.inputs['Detail'].default_value=5
l.new(coord.outputs['Position'] if 'Position' in coord.outputs else coord.outputs['Generated'],tex.inputs['Vector'])
# Geometry position gives consistent metre-scale surface variation across merged blocks.
geo=n.new('ShaderNodeNewGeometry'); l.new(geo.outputs['Position'],tex.inputs['Vector'])
ramp=n.new('ShaderNodeValToRGB')
ramp.color_ramp.elements.remove(ramp.color_ramp.elements[1])
for i,(p,c) in enumerate([(0.12,(.045,.052,.037,1)),(.35,(.15,.17,.12,1)),(.53,(.31,.30,.235,1)),(.7,(.47,.46,.37,1)),(.86,(.59,.59,.49,1))]):
    e=ramp.color_ramp.elements[0] if i==0 else ramp.color_ramp.elements.new(p)
    e.position=p;e.color=c
l.new(tex.outputs['Fac'],ramp.inputs[0]);l.new(ramp.outputs['Color'],bs.inputs['Base Color'])
fine=n.new('ShaderNodeTexNoise');fine.inputs['Scale'].default_value=48;fine.inputs['Detail'].default_value=3
l.new(geo.outputs['Position'],fine.inputs['Vector'])
bump=n.new('ShaderNodeBump');bump.inputs['Strength'].default_value=.48;bump.inputs['Distance'].default_value=.055
l.new(fine.outputs['Fac'],bump.inputs['Height']);l.new(bump.outputs[0],bs.inputs['Normal'])
earth=material('Dry forest soil',(.17,.145,.10))
soil=earth.node_tree.nodes.new('ShaderNodeTexNoise');soil.inputs['Scale'].default_value=160
sb=earth.node_tree.nodes.new('ShaderNodeBump');sb.inputs['Distance'].default_value=.14
earth.node_tree.links.new(soil.outputs['Fac'],sb.inputs['Height']);earth.node_tree.links.new(sb.outputs[0],earth.node_tree.nodes.get('Principled BSDF').inputs['Normal'])
en=earth.node_tree.nodes;el=earth.node_tree.links
ep=en.new('ShaderNodeNewGeometry');eno=en.new('ShaderNodeTexNoise');eno.inputs['Scale'].default_value=.12;eno.inputs['Detail'].default_value=4
er=en.new('ShaderNodeValToRGB');er.color_ramp.elements[0].position=.28;er.color_ramp.elements[0].color=(.075,.09,.045,1)
er.color_ramp.elements[1].position=.72;er.color_ramp.elements[1].color=(.23,.20,.13,1)
el.new(ep.outputs['Position'],eno.inputs['Vector']);el.new(eno.outputs['Fac'],er.inputs[0]);el.new(er.outputs[0],en.get('Principled BSDF').inputs['Base Color'])
water=material('Moat • muted seasonal water',(.09,.15,.12),.24)
bark=material('Tree bark',(.18,.17,.12))
leafmats=[material('Foliage '+str(i),c) for i,c in enumerate([(.11,.17,.055),(.18,.24,.08),(.25,.30,.10),(.08,.12,.045)])]
grass=material('Low forest groundcover',(.19,.23,.095))

class Batch:
    def __init__(self,name,mat,bevel=0):self.name=name;self.mat=mat;self.v=[];self.f=[];self.bevel=bevel
    def add(self,verts,faces):
        k=len(self.v);self.v.extend(verts);self.f.extend([tuple(k+i for i in f) for f in faces])
    def finish(self):
        if not self.v:return None
        mesh=bpy.data.meshes.new(self.name);mesh.from_pydata(self.v,[],self.f);mesh.update()
        o=bpy.data.objects.new(self.name,mesh);bpy.context.collection.objects.link(o);o.data.materials.append(self.mat)
        if self.bevel:
            mod=o.modifiers.new('Worn stone arrises','BEVEL');mod.width=self.bevel;mod.segments=2
            mod.limit_method='ANGLE';mod.angle_limit=.65
            mod=o.modifiers.new('Weighted corner normals','WEIGHTED_NORMAL');mod.keep_sharp=True;mod.weight=35
        return o

blocks=Batch('Main core • separate weathered masonry blocks',stone,.035)
rubble=Batch('Collapsed stonework • interpretive distribution',stone,.045)
detail=Batch('Carved jambs mouldings and corbels',stone,.018)
trunks=Batch('Forest trunks and branching limbs',bark)
foliage=[Batch('Small individual leaves '+str(i),m) for i,m in enumerate(leafmats)]
groundcover=Batch('Groundcover',grass)
context=Batch('Site terrain',earth)
watermesh=Batch('Moat and six inner pools',water)

cube_faces=[(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)]
def box(batch,pos,size,rot=0,wear=.035,tilt=None):
    x,y,z=pos;w,d,h=size
    verts=[Vector((sx*w/2,sy*d/2,sz*h/2)) for sx,sy,sz in [(-1,-1,-1),(1,-1,-1),(1,1,-1),(-1,1,-1),(-1,-1,1),(1,-1,1),(1,1,1),(-1,1,1)]]
    mat=Matrix.Rotation(rot,3,'Z')
    if tilt:mat=mat @ Matrix.Rotation(tilt[0],3,'X') @ Matrix.Rotation(tilt[1],3,'Y')
    for v in verts:
        for j in range(3):v[j]+=rng.uniform(-wear,wear)
    batch.add([tuple(mat@v+Vector(pos)) for v in verts],cube_faces)

def cyl(batch,a,b,r1,r2=None,sides=10):
    a=Vector(a);b=Vector(b);axis=b-a;r2=r1 if r2 is None else r2
    q=axis.to_track_quat('Z','Y');verts=[]
    for c,r in [(a,r1),(b,r2)]:
        for i in range(sides):verts.append(tuple(c+q@Vector((r*math.cos(i*math.tau/sides),r*math.sin(i*math.tau/sides),0))))
    faces=[tuple(range(sides-1,-1,-1)),tuple(range(sides,2*sides))]
    faces.extend((i,(i+1)%sides,(i+1)%sides+sides,i+sides) for i in range(sides))
    batch.add(verts,faces)

def courses(x,y,length,height,angle=0,thick=.75,broken=False,base=.2):
    rows=round(height/.43); count=max(1,round(length/.95)); step=length/count
    for row in range(rows):
        for i in range(count):
            a=-length/2+(i+.5)*step
            limit=rows
            if broken:limit=max(1,int(rows*(.5+.35*math.sin(i*.75)+.1*math.cos(i*1.9))))
            if row>=limit:continue
            px=x+math.cos(angle)*a;py=y+math.sin(angle)*a
            box(blocks,(px,py,base+(row+.5)*.43),(step-.018,thick,.414),angle)

def gallery(x,y,length,angle=0,keep=.3):
    # Low base and a partially surviving wall, open colonnade, patches of corbelled vault.
    def pt(a,b,z):return(x+math.cos(angle)*a-math.sin(angle)*b,y+math.sin(angle)*a+math.cos(angle)*b,z)
    for a in range(round(-length/2),round(length/2),2):
        box(blocks,pt(a,0,.18),(1.98,3.5,.36),angle)
    courses(*pt(0,-1.25,0)[:2],length,2.7,angle,.65,True,.36)
    for i in range(max(1,round(length/2.2))):
        a=-length/2+1.1+i*2.2
        h=2.65 if rng.random()<keep+.35 else rng.uniform(.45,1.6)
        for k in range(round(h/.43)):
            box(blocks,pt(a,1.2,.55+k*.43),(.43,.43,.42),angle)
        if h>2.4:
            box(detail,pt(a,1.2,2.95),(.7,.68,.23),angle)
        if rng.random()<keep:
            for level in range(5):
                for side in [-1,1]:
                    box(blocks,pt(a,side*(1.32-level*.23),3.12+level*.26),(2.15,.65,.25),angle)
        for k in range(rng.randint(2,5)):
            box(rubble,pt(a+rng.uniform(-1,1),rng.uniform(-2.5,2.5),rng.uniform(.2,.55)),(rng.uniform(.55,1.2),rng.uniform(.35,.8),rng.uniform(.25,.55)),rng.random()*6.28,tilt=(rng.uniform(-.65,.65),rng.uniform(-.5,.5)))

def ruined_ring(cx,cy,w,d,keep=.22):
    gap=3.0
    for side in [-1,1]:
        for s in [-1,1]:
            gallery(cx+s*(w/4+gap/4),cy+side*d/2,(w-gap)/2,0,keep)
            gallery(cx+side*w/2,cy+s*(d/4+gap/4),(d-gap)/2,math.pi/2,keep)

def face_depth(u,v):
    # Continuous low-relief facial surface; tiled into stones, never a floating mask.
    def g(x,y,sx,sy):return math.exp(-((u-x)/sx)**2-((v-y)/sy)**2)
    dep=.06+.17*g(0,0,.9,1.45)
    dep+=.16*(g(-.50,-.05,.33,.42)+g(.50,-.05,.33,.42))
    dep+=.13*g(0,-.92,.52,.25) # broad chin
    dep+=.34*g(0,.10,.16,.58)+.27*g(0,-.18,.25,.17) # bridge and nostril wings
    dep+=.08*(g(-.16,-.2,.13,.10)+g(.16,-.2,.13,.10))
    dep-=.13*(g(-.15,-.27,.055,.04)+g(.15,-.27,.055,.04))
    for s in [-1,1]:
        dep-=.10*g(s*.41,.35,.31,.17)
        dep+=.12*g(s*.39,.54,.33,.08)
        dep+=.065*g(s*.4,.29,.26,.047)
        dep-=.035*g(s*.4,.34,.24,.025)
    mouth=-.58+.10*(abs(u)/.46)**2
    dep+=.11*math.exp(-(u/.43)**6-((v-mouth+.055)/.065)**2)
    dep+=.08*math.exp(-(u/.42)**6-((v-mouth-.06)/.055)**2)
    dep-=.06*math.exp(-(u/.42)**6-((v-mouth)/.023)**2)
    return dep

def face_panel(cx,cy,z0,width,height,angle,damaged=False):
    batch=Batch('Face relief • integrated stone courses',stone,.006)
    rows=10;cols=6
    # Grid boundaries stagger by course; enough subdivisions to sculpt eyelids and lips.
    for row in range(rows):
        for col in range(cols):
            if damaged and row>7 and col>3:continue
            u0=-1.13+col*2.26/cols+.007;u1=-1.13+(col+1)*2.26/cols-.007
            v0=-1.5+row*3/rows+.008;v1=-1.5+(row+1)*3/rows-.008
            seg=9;verts=[]
            for j in range(seg+1):
                for i in range(seg+1):
                    u=u0+(u1-u0)*i/seg;v=v0+(v1-v0)*j/seg
                    dep=face_depth(u,v)+.009*math.sin(u*27+v*9)
                    p=Vector((u*width/2.26,-dep,z0+(v+1.5)*height/3))
                    p=Matrix.Rotation(angle,3,'Z')@p+Vector((cx,cy,0));verts.append(tuple(p))
            faces=[]
            for j in range(seg):
                for i in range(seg):
                    k=j*(seg+1)+i;faces.append((k,k+1,k+seg+2,k+seg+1))
            batch.add(verts,faces)
    o=batch.finish()
    for p in o.data.polygons:p.use_smooth=True

def tower(cx,cy,scale=1,damaged=False,faces=True):
    # Standing tower study in the main core; position/extent remains provisional.
    basez=.4
    for tier,(w,h) in enumerate([(6.2,.35),(5.8,.3),(5.35,.3)]):
        box(detail,(cx,cy,basez),(w*scale,w*scale,h*scale));basez+=h*scale
    # Pier shafts leave four genuinely open doorways.
    for sx in [-1,1]:
        for sy in [-1,1]:
            for row in range(7):
                for k in range(2):
                    box(blocks,(cx+sx*1.55*scale,cy+sy*(1.06+k*.85)*scale,basez+(row+.5)*.43*scale),(1.65*scale,.84*scale,.42*scale))
    for side in range(4):
        angle=side*math.pi/2
        def pt(a,b,z):return(cx+math.cos(angle)*a-math.sin(angle)*b,cy+math.sin(angle)*a+math.cos(angle)*b,z)
        for sx in [-1,1]:
            for k in range(8):
                box(detail,pt(sx*.79*scale,-2.42*scale,basez+(.2+k*.34)*scale),(.22*scale,.26*scale,.33*scale),angle)
            for offset in [-.055,.055]:
                cyl(detail,pt((sx*.79+offset)*scale,-2.57*scale,basez),pt((sx*.79+offset)*scale,-2.57*scale,basez+2.8*scale),.036*scale,sides=8)
        for k in range(3):
            box(detail,pt(0,-2.4*scale,basez+(2.95+k*.18)*scale),((2.18+k*.16)*scale,.46*scale,.17*scale),angle)
        # Corbel over dark portal; broken arched pediment silhouette.
        for k in range(6):
            for sx in [-1,1]:
                box(blocks,pt(sx*(.8-k*.11)*scale,-2.15*scale,basez+(3.35+k*.23)*scale),(.55*scale,.65*scale,.22*scale),angle)
    # Upper shaft: relief face carved in same horizontal stone courses.
    bottom=basez+3.15*scale; facez=bottom+.25*scale
    for row in range(10):
        for side in range(4):
            angle=side*math.pi/2
            for col in range(6):
                a=(-2.30+(col+.5)*4.6/6)*scale
                # Central face panel supplies front surface, stone masses form buttresses.
                if abs(a)<1.65*scale and faces:continue
                p=Matrix.Rotation(angle,3,'Z')@Vector((a,-2.12*scale,bottom+(row+.5)*.36*scale))+Vector((cx,cy,0))
                box(blocks,tuple(p),(.75*scale,.72*scale,.35*scale),angle)
    if faces:
        for side in range(4):
            a=side*math.pi/2
            p=Matrix.Rotation(a,3,'Z')@Vector((0,-2.23*scale,0))+Vector((cx,cy,0))
            face_panel(p.x,p.y,facez,3.15*scale,3.45*scale,a,damaged)
    # Eroded rounded-square crown, staggered courses and missing crest stones.
    for k in range(7 if not damaged else 3):
        r=(2.24-k*.24)*scale;z=bottom+(3.65+k*.27)*scale
        count=max(7,round(r*9));phase=(k%2)*math.pi/count
        for j in range(count):
            if (damaged and rng.random()<.28) or (k>3 and rng.random()<.16):continue
            a=j*math.tau/count+phase
            c=math.cos(a);s=math.sin(a)
            px=math.copysign(abs(c)**.62,c)*r;py=math.copysign(abs(s)**.62,s)*r
            box(blocks,(cx+px,cy+py,z+rng.uniform(-.05,.05)),(.67*scale,.66*scale,.29*scale),a+math.pi/2+rng.uniform(-.07,.07),wear=.07*scale)
    if not damaged:
        for j in range(9):
            a=j*math.tau/9
            box(blocks,(cx+math.cos(a)*.46*scale,cy+math.sin(a)*.46*scale,bottom+5.55*scale),(.55*scale,.55*scale,.3*scale),a,wear=.07)
    for i in range(55):
        a=rng.random()*math.tau;r=rng.uniform(2.8,5.2)*scale
        box(rubble,(cx+math.cos(a)*r,cy+math.sin(a)*r,rng.uniform(.25,.75)),(rng.uniform(.5,1.15),rng.uniform(.4,.9),rng.uniform(.3,.65)),rng.random()*6.28,tilt=(rng.uniform(-.6,.6),rng.uniform(-.6,.6)))

def tree(x,y,h):
    # Fine branching canopy made of small leaves, not faceted canopy balls.
    p=(x,y,0);top=(x+.2,y+.1,h*.62);cyl(trunks,p,top,h*.035,h*.012,12)
    for k in range(7):
        a=k*math.tau/7+rng.uniform(-.3,.3);r=rng.uniform(.18,.30)*h
        tip=(x+math.cos(a)*r,y+math.sin(a)*r,h*rng.uniform(.72,1))
        cyl(trunks,(x,y,h*.42),tip,h*.014,.035,8)
        for j in range(3):
            b=a+j*.8;end=(tip[0]+math.cos(b)*h*.10,tip[1]+math.sin(b)*h*.10,tip[2]+h*.04)
            cyl(trunks,tip,end,.06,.014,6)
            for q in range(170):
                theta=rng.random()*math.tau;rr=math.sqrt(rng.random())*h*.16
                c=Vector((end[0]+rr*math.cos(theta),end[1]+rr*math.sin(theta),end[2]+rng.uniform(-.8,.5)))
                length=rng.uniform(.23,.43);width=length*.46;aa=rng.random()*math.tau
                u=Vector((math.cos(aa)*length,math.sin(aa)*length,rng.uniform(-.1,.1)))
                v=Vector((-math.sin(aa)*width,math.cos(aa)*width,.035))
                foliage[rng.randrange(4)].add([tuple(c-u),tuple(c+v),tuple(c+u),tuple(c-v)],[(0,1,2),(0,2,3)])

# Satellite/LiDAR scale context, independent of detailed central composition.
box(context,(0,-55,-.5),(950,860,1),wear=0)
for side in [-1,1]:
    box(watermesh,(side*353.5,-55,-.03),(63,690,.08),wear=0)
    box(watermesh,(0,-55+side*313.5,-.03),(644,63,.08),wear=0)
    box(context,(side*353.5,0,.12),(68,10,.3),wear=.01)
    box(context,(0,-55+side*313.5,.12),(10,68,.3),wear=.01)
# Core: outline based on plans; condition and individual block placement interpreted.
ruined_ring(0,0,250,200,.14)
ruined_ring(7,0,52,48,.28)
ruined_ring(-49,0,52,48,.09)
ruined_ring(63,0,56,48,.14)
ruined_ring(-95,0,27,27,.20)
ruined_ring(101,0,27,27,.15)
gallery(0,0,236,0,.08)
for x in [-65,0,65]:
    for y in [-57,57]:
        box(watermesh,(x,y,.03),(22,17,.06),wear=0)
        for sy in [-1,1]:courses(x,y+sy*9,25,.85,0,.7,True)
        for sx in [-1,1]:courses(x+sx*12,y,18,.85,math.pi/2,.7,True)
# Distinct surviving core silhouettes (not a repetitive intact tower grid).
tower(8,-10,1.15)
tower(-5,-12,.92,True)
tower(10,12,.85,True)
tower(-94,0,.78,True)
for x,y in [(0,0),(-47,0),(63,0),(104,0),(7,29),(7,-29),(-49,25),(-49,-25)]:
    ruined_ring(x,y,9,8,.04)
for y in [-34,34]:
    gallery(70,y,18,0,.18)
    courses(70,y-2.5,19,2.2,0,.8,True)
# Broken rubble field around the central axis, clustered rather than uniform scatter.
for i in range(2100):
    x=rng.uniform(-110,111);y=rng.gauss(0,14)
    # Keep a narrow eastern approach legible.
    if x>75 and abs(y)<2:continue
    z=max(.15,1.0-abs(y)/22)*rng.uniform(.2,1.1)
    box(rubble,(x,y,z),(rng.uniform(.45,1.35),rng.uniform(.38,.95),rng.uniform(.22,.65)),rng.random()*math.tau,tilt=(rng.uniform(-1.0,1),rng.uniform(-.65,.65)))
for i in range(80):
    x=rng.uniform(-140,140);y=rng.choice([-1,1])*rng.uniform(30,120)
    if any(abs(x-px)<17 and abs(y-py)<14 for px in [-65,0,65] for py in [-57,57]):continue
    tree(x,y,rng.uniform(11,22))
for x,y,h in [(-16,10,15),(29,13,18),(-34,-7,17),(57,9,15),(-84,15,14)]:tree(x,y,h)
for i in range(2500):
    x=rng.uniform(-138,138);y=rng.uniform(-112,112)
    if abs(y)<18:continue
    h=rng.uniform(.10,.45)
    for k in range(3):
        a=k*2.1;dx=math.cos(a)*.09;dy=math.sin(a)*.09
        groundcover.add([(x-dx,y-dy,.03),(x+dx,y+dy,.03),(x+dx*.5,y+dy*.5,h)],[(0,1,2)])
for b in [blocks,rubble,detail,trunks,*foliage,groundcover,context,watermesh]:b.finish()

scene=bpy.context.scene
scene['Review status']='UNAPPROVED • Blender-only; do not import into app'
scene['Reference basis']='Satellite/LiDAR outline + public photographs; see docs/BANTEAY-CHHMAR-REVIEW-V2.md'
scene['Limitations']='Provisional locations, condition and facial sculpt; no photogrammetry, no exact survey, no copied imagery'
scene.unit_settings.system='METRIC'
world=bpy.data.worlds.new('Soft daylight');scene.world=world;world.use_nodes=True
world.node_tree.nodes.get('Background').inputs[0].default_value=(.60,.68,.77,1)
world.node_tree.nodes.get('Background').inputs[1].default_value=.45
bpy.ops.object.light_add(type='SUN',location=(0,0,80));sun=bpy.context.object
sun.rotation_euler=(.52,-.38,-.5);sun.data.energy=2.1;sun.data.angle=.12
scene.render.engine='CYCLES';scene.cycles.samples=24;scene.cycles.use_denoising=True
scene.cycles.max_bounces=5
scene.render.resolution_x=1440;scene.render.resolution_y=1000;scene.render.resolution_percentage=100
scene.view_settings.view_transform='AgX'
views=[
 ('01-core-overview',(182,-220,186),(0,0,2),True,330),
 ('02-face-towers',(25,-36,11),(3,-7,6.0),False,42),
 ('03-satellite-layout',(0,-55,1000),(0,-55,0),True,1020),
]
cams=[]
for name,pos,target,ortho,lens in views:
    bpy.ops.object.camera_add(location=pos);cam=bpy.context.object;cam.name=name
    cam.rotation_euler=(Vector(target)-cam.location).to_track_quat('-Z','Y').to_euler()
    cam.data.clip_end=2500;cam.data.clip_start=.05
    if ortho:cam.data.type='ORTHO';cam.data.ortho_scale=lens
    else:cam.data.lens=lens
    cams.append(cam)
scene.camera=cams[1]
for screen in bpy.data.screens:
    for area in screen.areas:
        if area.type=='VIEW_3D':
            area.spaces.active.region_3d.view_perspective='CAMERA'
            area.spaces.active.clip_end=2500
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'banteay-chhmar-review-v2.blend'))
for cam in cams:
    scene.camera=cam;scene.render.filepath=str(OUT/(cam.name+'.png'))
    print('RENDERING '+cam.name,flush=True);bpy.ops.render.render(write_still=True)
print('REVIEW_READY: no GLB exported and no app source changed',flush=True)
