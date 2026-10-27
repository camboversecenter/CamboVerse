"""Standalone, reference-guided Preah Vihear review. Never changes live assets.

Blender --background --python scripts/build-preah-vihear-review.py
References/assumptions are recorded in output/preah-vihear-review-v2/README.md.
Model axes: Y up, +Z north/arrival. Scene units are illustrative, not a survey.
"""
import bpy
import math
import random
import json
from pathlib import Path
from mathutils import Vector

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'output/preah-vihear-review-v2'
OUT.mkdir(parents=True,exist_ok=True)
GATES=[('V',30,2.5),('IV',5.6,4.4),('III',-9.4,6),('II',-20,7),('I',-27.5,7.5)]

def xyz(p): return (p[0],-p[2],p[1])

def mesh(name,verts,faces,mat):
    data=bpy.data.meshes.new(name)
    data.from_pydata([xyz(p) for p in verts],[],faces)
    data.update()
    obj=bpy.data.objects.new(name,data)
    bpy.context.collection.objects.link(obj)
    data.materials.append(mat)
    return obj

def material(name,color,texture=False):
    mat=bpy.data.materials.new(name)
    mat.diffuse_color=(*color,1)
    mat.use_nodes=True
    shader=mat.node_tree.nodes.get('Principled BSDF')
    shader.inputs['Base Color'].default_value=(*color,1)
    shader.inputs['Roughness'].default_value=.94
    if texture:
        image=bpy.data.images.new(name+' | original mineral grain',width=256,height=256)
        pixels=[]
        rng=random.Random(900)
        for y in range(256):
            for x in range(256):
                coarse=math.sin(x*.067+math.sin(y*.05)*2)*math.cos(y*.08)
                speck=rng.uniform(-.035,.035)
                lichen=max(0,coarse-.35)*.10
                pixels.extend((*[max(.02,c+speck+lichen) for c in color],1))
        image.pixels[:]=pixels
        image.pack()
        tex=mat.node_tree.nodes.new('ShaderNodeTexImage')
        tex.image=image
        mat.node_tree.links.new(tex.outputs['Color'],shader.inputs['Base Color'])
    return mat

# Batched boxes: thousands of masonry units without thousands of scene objects.
def box(name,p,size,mat,angle=0):
    key=(PART,mat.name)
    vertices,faces=BATCH.setdefault(key,([],[]))
    x,y,z=p; w,h,d=[v/2 for v in size]
    base=len(vertices)
    for a,b,c in [(-w,-h,-d),(w,-h,-d),(w,-h,d),(-w,-h,d),
                   (-w,h,-d),(w,h,-d),(w,h,d),(-w,h,d)]:
        vertices.append((x+a*math.cos(angle)+c*math.sin(angle),y+b,
                         z-a*math.sin(angle)+c*math.cos(angle)))
    faces.extend(tuple(base+i for i in f) for f in
        [(0,1,2,3),(7,6,5,4),(4,5,1,0),(6,7,3,2),(4,0,3,7),(1,5,6,2)])

def stone(): return STONE[RNG.randrange(len(STONE))]

def course_wall(x,z,y,length,height,depth=.24,turn=False,opening=0,broken=False):
    rows=max(1,round(height/(.22 if ULTRA else .44)))
    rowheight=height/rows
    cols=max(2,round(length/(.44 if ULTRA else .88)))
    width=length/cols
    for r in range(rows):
        # Half-width terminal stones keep the ends within their footprint.
        cuts=[-length/2]+[-length/2+(i+.5 if r%2 else i)*width for i in range(1,cols)]+[length/2]
        for j,(a,b) in enumerate(zip(cuts,cuts[1:])):
            mid=(a+b)/2
            if opening and a<opening/2 and b>-opening/2 and r*rowheight<height*.80: continue
            if broken and r==rows-1 and (r+j)%4==1: continue
            box('sandstone block',(x+(0 if turn else mid),y+(r+.5)*rowheight,z+(mid if turn else 0)),
                (depth if turn else b-a-.008,rowheight-.008,b-a-.008 if turn else depth),stone())

def tube(name,points,r,mat,segments=None):
    seg=segments or (8 if ULTRA else 5)
    verts=[]
    for i,p in enumerate(points):
        direction=Vector(points[min(i+1,len(points)-1)])-Vector(points[max(i-1,0)])
        direction.normalize()
        helper=Vector((0,1,0)) if abs(direction.y)<.95 else Vector((1,0,0))
        right=direction.cross(helper).normalized(); up=right.cross(direction).normalized()
        for j in range(seg):
            off=right*math.cos(j*2*math.pi/seg)*r+up*math.sin(j*2*math.pi/seg)*r
            verts.append(tuple(Vector(p)+off))
    fs=[]
    for i in range(len(points)-1):
        for j in range(seg): fs.append((i*seg+j,i*seg+(j+1)%seg,(i+1)*seg+(j+1)%seg,(i+1)*seg+j))
    fs.extend([tuple(reversed(range(seg))),tuple((len(points)-1)*seg+j for j in range(seg))])
    # Curve-like details share their architectural component's material batch.
    # Keeping each tiny scroll as a Blender object makes rebuilds unnecessarily slow.
    target_vertices,target_faces=BATCH.setdefault((PART,mat.name),([],[]))
    base=len(target_vertices)
    target_vertices.extend(verts)
    target_faces.extend(tuple(base+i for i in face) for face in fs)

def plinth(x,z,y,w,d):
    foundation(x,z,y,w,d)
    for dy,ww,dd,hh in [(0,w,d,.12),(.12,w-.12,d-.12,.09),(.21,w-.22,d-.22,.09),(.30,w-.06,d-.06,.07)]:
        box('molded plinth',(x,y+dy+hh/2,z),(ww,hh,dd),STONE[1])
    return y+.37

def foundation(x,z,y,w,d):
    bottom=min(terrain_height(z-d/2),terrain_height(z+d/2))-.20
    height=y-bottom+.025
    if height>0:
        box('buried stone foundation',(x,bottom+height/2,z),(w,height,d),STONE[0])

def steps(x,z0,z1,y0,y1,width,count):
    depth=(z0-z1)/count
    for i in range(count):
        top=y0+(y1-y0)*(i+1)/count
        box('ascent tread',(x,top-.09,z0-(i+.5)*depth),(width,.18,depth+.005),stone())

def pillar(x,z,y,h=.95,w=.16):
    box('square shaft',(x,y+h/2,z),(w,h,w),STONE[1])
    moldings=[(0,w*1.6,.07),(.07,w*1.25,.045),(h-.04,w*1.25,.06),(h+.02,w*1.7,.06)]
    for dy,width,hh in (moldings if ULTRA else [moldings[0],moldings[-1]]):
        box('pillar molding',(x,y+dy+hh/2,z),(width,hh,width),STONE[2])

def pediment(x,z,y,w,h,turn=False):
    # Solid carved gable, not an invented pitched roof behind it.
    def pt(a,b,c): return (x+(c if turn else a),y+b,z+(a if turn else c))
    outline=[(-w/2,0),(-w*.43,h*.24),(-w*.28,h*.47),(-w*.12,h*.83),
             (0,h),(w*.12,h*.83),(w*.28,h*.47),(w*.43,h*.24),(w/2,0)]
    vs=[pt(a,b,c) for c in (-.085,.085) for a,b in outline]
    n=len(outline)
    fs=[tuple(reversed(range(n))),tuple(range(n,2*n))]
    fs.extend((i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n))
    mesh(PART+' | surviving pediment',vs,fs,STONE[2])['part']=PART
    for c in [-.10,.10]:
        tube('pediment border',[pt(a,b,c) for a,b in outline],.035,STONE[0])
        for side in [-1,1]:
            tube('curling stone finial',[pt(side*w*.45,h*.10,c),pt(side*w*.56,h*.14,c),
                pt(side*w*.60,h*.35,c),pt(side*w*.57,h*.49,c)],.055,STONE[1])
        # Abstract shallow floral relief, deliberately not invented sacred scenes.
        for i in range(9 if ULTRA else 3):
            a=(i/(8 if ULTRA else 2)-.5)*w*.53
            b=h*.22+(1-abs(a)/(w*.29))*h*.10
            tube('floral carved sweep',[pt(a-.06,b,c),pt(a,b+.10,c+.015),pt(a+.06,b,c)],.012,STONE[0])
        if ULTRA:
            for side in [-1,1]:
                for i in range(7):
                    a=side*w*(.07+i*.055)
                    b=h*(.88-i*.104)
                    tube('stone edge crest',[pt(a,b,c),pt(a+side*.035,b+.09,c),pt(a+side*.07,b+.015,c)],.018,STONE[1])

def doorway(x,z,y,h=1.35,w=.76,scale=1,turn=False,gable=True):
    def pt(a,b,c): return (x+(c if turn else a),y+b,z+(a if turn else c))
    def block(a,b,c,ww,hh,dd,mat):
        box('door surround',pt(a,b,c),(dd,hh,ww) if turn else (ww,hh,dd),mat)
    for s in [-1,1]:
        block(s*(w/2+.15),h/2,0,.28,h,.42,STONE[1])
        block(s*(w/2+.02),h/2,.22,.065,h,.09,STONE[2])
        # Turned colonette silhouette with collars, independently of orientation.
        for i in range(5 if ULTRA else 3):
            yy=.10+i*(h-.2)/(4 if ULTRA else 2)
            block(s*(w/2+.095),yy,.27,.08,.045,.08,STONE[0])
        tube('door colonette',[pt(s*(w/2+.095),.05,.27),pt(s*(w/2+.095),h-.05,.27)],.027,STONE[2])
    block(0,h+.09,0,w+.65,.18,.48,STONE[0])
    for j in range(3): block(0,h+.21+j*.055,0,w+.70+j*.08,.055,.53+j*.06,STONE[1])
    if gable: pediment(x,z,y+h+.36,(w+.93)*scale,.72*scale,turn)
    if ULTRA:
        for i in range(7):
            a=(i-3)*(w+.4)/7
            tube('lintel scroll',[pt(a-.06,h+.08,.25),pt(a,h+.13,.27),pt(a+.06,h+.08,.25)],.014,STONE[2])

def gateway(label,z,y,pillared=False):
    global PART
    PART='Gopura '+label
    floor=plinth(0,z,y,3.5,3.4)
    steps(0,z+2.5,z+1.65,y-.04,floor,1.30,6)
    if not pillared:
        # North/south openings, and low surviving lateral wall fragments.
        for dz in [-1.1,1.1]:
            course_wall(0,z+dz,floor,2.7,1.5,opening=.85)
            doorway(0,z+dz+(.03 if dz>0 else -.03),floor)
        for side in [-1,1]:
            course_wall(side*1.3,z,floor,2.1,.85,turn=True,broken=True)
    else:
        for dx in [-.60,.60]:
            for dz in [-.85,.85]: pillar(dx,z+dz,floor,1.55,.24)
        for dz in [-.85,.85]: doorway(0,z+dz,floor,1.55,.82,1.1)
    # Cruciform side porches with standing gables and open sky behind them.
    for side in [-1,1]:
        plinth(side*1.9,z,y,1.55,1.9)
        doorway(side*2.25,z,floor,1.12,.66,.85,turn=True)
        for dz in [-.63,.63]:
            box('surviving side architrave',(side*1.65,floor+1.25,z+dz),(1.3,.16,.22),STONE[1])
    return floor

def gallery(x,z,y,length,turn=False,ruined=False):
    foundation(x,z,y,.95 if turn else length,length if turn else .95)
    def loc(a,b,c): return (x+c,y+b,z+a) if turn else (x+a,y+b,z+c)
    box('gallery foundation',loc(0,.08,0),(.95,.16,length) if turn else (length,.16,.95),STONE[1])
    course_wall(x+(.35 if turn else 0),z+(0 if turn else -.35),y+.16,length,.80,turn=turn,broken=ruined)
    n=max(3,round(length/.55))
    for i in range(n+1):
        a=-length/2+i*length/n
        px,py,pz=loc(a,.16,.34)
        pillar(px,pz,py,.85,.14)
    for row in range(4):
        # A broken roof is represented by gaps, never a complete modern roof.
        for i in range(n):
            if ruined and (i%6 in [1,2] or (row>1 and i%5==0)): continue
            a=-length/2+(i+.5)*length/n
            p=loc(a,1.13+row*.10,0)
            size=(.95-row*.18,.105,length/n-.005) if turn else (length/n-.005,.105,.95-row*.18)
            box('corbelled roof course',p,size,stone())

def palace(x,z,y):
    gallery(x,z-2.6,y,4.4,True,True)
    gallery(x-1.6,z-2.6,y,4.4,True,True)
    gallery(x-.8,z-.4,y,2.5,False,True)
    gallery(x-.8,z-4.8,y,2.5,False,True)

def terrain_height(z):
    points=[(44,-.4),(40,0),(32,2.5),(28,2.5),(7.5,4.4),(3.7,4.4),
            (-7.5,6),(-15,6),(-18,7),(-25,7),(-26,7.5),(-40,7.5)]
    for (a,ya),(b,yb) in zip(points,points[1:]):
        if b<=z<=a: return ya+(yb-ya)*(a-z)/(a-b)
    return points[0][1] if z>44 else points[-1][1]

def terrain():
    rows=[(44,3),(40,3.8),(35,4.4),(30,5.7),(25,6.2),(18,6.5),(10,7),
          (5,7.5),(0,8),(-5,9.7),(-10,10.2),(-16,10),(-22,9.2),(-28,8.5),(-34,8.4),(-40,7.4)]
    verts=[]
    for z,w in rows:
        for x in [-w,-w*.75,0,w*.75,w]:
            verts.append((x,terrain_height(z)-.11-(.20 if abs(x)==w else 0),z))
    fs=[]
    for i in range(len(rows)-1):
        for j in range(4):
            a=i*5+j
            fs.append((a,a+1,a+6,a+5))
    mesh('Ridge | dry plateau',verts,fs,EARTH)
    # Layered irregular cliff, with a steep southern termination.
    outline=[(-w,terrain_height(z)-.31,z) for z,w in rows]
    outline += [(w,terrain_height(z)-.31,z) for z,w in reversed(rows)]
    n=len(outline)
    for band in range(6):
        vs=[]
        for level in [band/6,(band+1)/6]:
            for i,(x,y,z) in enumerate(outline):
                jiggle=math.sin(i*2.7+level*6)*.18
                vs.append((x*(1+level*.08)+jiggle,y*(1-level)+(-3.8)*level,z+jiggle))
        fs=[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
        mesh('Ridge | cliff stratum %d'%band,vs,fs,ROCK[band%len(ROCK)])

def approach():
    global PART
    PART='Northern stair and processional causeways'
    steps(0,40,33,0,2.5,1.15,64)
    box('naga pavement',(0,2.44,31.8),(2.1,.12,2.4),STONE[1])
    for s in [-1,1]:
        tube('naga rail',[(s*.98,2.75,33),(s*.98,2.80,31),(s*.98,2.77,30.8)],.075,STONE[0])
        for i in range(-3,4):
            tube('naga fan',[(s*.98,2.72,32.9),(s*.98+i*.065,3.05,32.95),
                 (s*.98+i*.105,3.17-abs(i)*.055,32.97)],.035,STONE[1])
    for near,far,width in [(28.3,7.35,1.7),(3.8,-7.5,1.7),(-11.2,-18,1.9),(-22,-25.8,2.3)]:
        n=round((near-far)/.38)
        for i in range(n):
            zz=near-(i+.5)*(near-far)/n
            yy=terrain_height(zz)+.025
            box('paved causeway',(0,yy-.06,zz),(width,.12,(near-far)/n-.008),stone())
        for i in range(round((near-far)/.75)+1):
            zz=near-i*.75
            if zz<far: continue
            for side in [-1,1]: pillar(side*(width/2+.10),zz,terrain_height(zz),.34,.115)
    # Modest water basin: form is evidenced; exact placement remains schematic.
    PART='Reservoir'
    yy=terrain_height(24)
    box('basin dark water',(5,yy-.09,24),(3.6,.025,1.8),WATER)
    for side in [-1,1]:
        box('basin bank',(5+side*1.85,yy,24),(.14,.24,2),STONE[1])
        box('basin bank',(5,yy,24+side*.95),(3.8,.24,.14),STONE[1])

def upper_complex():
    global PART
    # Gopura III's long side ranges are not copies of the lower gateway.
    PART='Gopura III palace ranges'
    for side in [-1,1]:
        x=side*2.75
        floor=6.37
        plinth(x,-9.4,6.0,2.7,1.15)
        course_wall(x,-9.4,floor,2.65,1.12,opening=.65)
        doorway(x,-9.26,floor,1.05,.55,.75)
        gallery(side*4.6,-9.5,6.1,2.3)
    palace(-4.8,-10,6.05)
    palace(6.4,-10,6.05)
    PART='Gopura II court and libraries'
    for side in [-1,1]:
        gallery(side*4.4,-22,7.0,5.5,True,True)
        gallery(side*2.5,-24.6,7.0,3.8,False,True)
        x=side*2.9; zz=-22
        floor=plinth(x,zz,7.03,1.8,2.5)
        for dx in [-.67,.67]: course_wall(x+dx,zz,floor,2,.92,turn=True,broken=True)
        doorway(x,zz+.95,floor,.85,.46,.7)
        for r in range(3): box('library surviving corbel',(x,floor+1.02+r*.1,zz),
            (1.5-r*.30,.11,1.8),stone())
    PART='Gopura I sanctuary enclosure'
    for side in [-1,1]: gallery(side*5,-32.6,7.5,9.5,True,True)
    gallery(0,-37.2,7.5,10.4,False,True)
    for side in [-1,1]: gallery(side*3.25,-28,7.5,3.5)
    # The central tower is a roofless ruin in the reference, not a new spire.
    floor=plinth(0,-33,7.52,3.7,4.5)
    for side in [-1,1]: course_wall(side*1.35,-33.4,floor,3.1,1.35,turn=True,broken=True)
    course_wall(0,-34.9,floor,2.9,1.35,broken=True)
    doorway(0,-31.9,floor,1.2,.66,.85)
    for side in [-1,1]: course_wall(side*.85,-30.7,floor,1.7,.65,turn=True,broken=True)
    for i in range(ULTRA and 60 or 32):
        a=RNG.random()*2*math.pi; r=.4+RNG.random()*1.0
        box('collapsed central stone',(math.cos(a)*r,floor+.15+RNG.random()*.18,-33.4+math.sin(a)*r),
            (.28,.20,.34),stone(),RNG.random()*2)

def vegetation():
    global PART
    PART='Context trees'
    for x,z,s in [(-4,30,1.1),(-4.6,6,1.2),(6,2,.8),(-8,-9,1),
                   (8,-18,.9),(-7,-35,.65),(6.7,-37,.7)]:
        y=terrain_height(z)
        tube('tree trunk',[(x,y-.35,z),(x-.1,y+1.3*s,z),(x+.25,y+2.8*s,z)],.10*s,BARK)
        for i in range(5):
            a=i*2.4
            bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2 if ULTRA else 1,
                radius=1,location=xyz((x+math.sin(a)*.65*s,y+(2.6+math.cos(a)*.28)*s,z+math.cos(a)*.5*s)))
            o=bpy.context.object
            o.name='Context | canopy'
            o.scale=(.85*s,.7*s,.58*s)
            o.data.materials.append(LEAF)

def flush():
    for (part,material_name),(verts,faces) in BATCH.items():
        o=mesh(part+' | '+material_name,verts,faces,bpy.data.materials[material_name])
        o['part']=part
    for o in bpy.context.scene.objects:
        if o.type!='MESH': continue
        uv=o.data.uv_layers.new(name='stone planar UV')
        for poly in o.data.polygons:
            normal=poly.normal
            for li in poly.loop_indices:
                v=o.data.vertices[o.data.loops[li].vertex_index].co
                uv.data[li].uv=(v.x*.9,v.y*.9) if abs(normal.z)>.7 else (v.x*.9,v.z*.9) if abs(normal.y)>.7 else (v.y*.9,v.z*.9)
        bpy.ops.object.select_all(action='DESELECT')
        o.select_set(True); bpy.context.view_layer.objects.active=o
        bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT')
        bpy.ops.mesh.normals_make_consistent(inside=False); bpy.ops.object.mode_set(mode='OBJECT')

def camera(name,p,target,ortho=None,lens=45):
    bpy.ops.object.camera_add(location=xyz(p))
    o=bpy.context.object; o.name=name
    o.rotation_euler=(Vector(xyz(target))-o.location).to_track_quat('-Z','Y').to_euler()
    if ortho: o.data.type='ORTHO'; o.data.ortho_scale=ortho
    else: o.data.lens=lens
    o.data.clip_end=500
    return o

def stage(tier):
    sc=bpy.context.scene
    sc.world=bpy.data.worlds.new('Soft overcast review light')
    sc.world.use_nodes=True
    sc.world.node_tree.nodes['Background'].inputs['Color'].default_value=(.34,.40,.47,1)
    sc.world.node_tree.nodes['Background'].inputs['Strength'].default_value=.55
    bpy.ops.object.light_add(type='SUN',location=xyz((30,50,15)))
    sun=bpy.context.object; sun.name='Review sun'
    sun.rotation_euler=(.5,-.4,-.7); sun.data.energy=2.0; sun.data.angle=.14
    cameras=[('overview',camera('Review 1 - full ridge',(49,57,63),(0,3,0),95)),
             ('gateway-iii',camera('Review 2 - Gopura III facade',(6.7,9.4,1.4),(0,7.3,-9.4),lens=48)),
             ('sanctuary',camera('Review 3 - upper enclosure',(17,22,-44),(0,7,-31),27)),
             ('plan',camera('Review 4 - north-south plan',(0,100,2),(0,0,2),128))]
    cameras[-1][1].rotation_euler.z+=math.pi  # North (+model Z) at the top.
    sc.render.engine='CYCLES'; sc.cycles.device='CPU'
    sc.cycles.samples=24; sc.cycles.use_denoising=True
    sc.render.resolution_x=1500; sc.render.resolution_y=1050; sc.render.resolution_percentage=100
    sc.view_settings.view_transform='AgX'; sc.view_settings.look='AgX - Medium High Contrast'
    sc.view_settings.exposure=.85
    for name,cam in cameras:
        if not ULTRA and name!='overview': continue
        sc.camera=cam; sc.render.filepath=str(OUT/(tier+'-'+name+'.png'))
        bpy.ops.render.render(write_still=True)
    sc.camera=cameras[1][1]
    bpy.context.preferences.filepaths.save_version=0
    bpy.ops.wm.save_as_mainfile(filepath=str(OUT/('preah-vihear-'+tier+'.blend')))

reports=[]
for ULTRA in [False,True]:
    tier='ultra' if ULTRA else 'normal'
    bpy.ops.wm.read_factory_settings(use_empty=True)
    RNG=random.Random(2008); BATCH={}; PART='Ridge'
    STONE=[material('Sandstone '+str(i),c,True) for i,c in enumerate(
        [(.30,.285,.25),(.37,.34,.28),(.43,.40,.34),(.33,.315,.28)])]
    EARTH=material('Dry plateau',(.33,.31,.22))
    ROCK=[material('Cliff stratum '+str(i),c) for i,c in enumerate([(.25,.255,.23),(.31,.30,.265),(.35,.34,.30)])]
    WATER=material('Basin',(.16,.24,.22))
    LEAF=material('Canopy',(.16,.24,.105)); BARK=material('Bark',(.20,.16,.11))
    terrain(); approach()
    for label,z,y in GATES: gateway(label,z,y,label=='V')
    upper_complex(); vegetation(); flush()
    # Editable component groups are retained in native source. Export-only join
    # batches by material so the mobile version does not inherit object overhead.
    bpy.context.preferences.filepaths.save_version=0
    source=OUT/('preah-vihear-'+tier+'.blend')
    bpy.ops.wm.save_as_mainfile(filepath=str(source))
    groups={}
    for o in list(bpy.context.scene.objects):
        if o.type=='MESH': groups.setdefault(o.data.materials[0].name,[]).append(o)
    for name,objects in groups.items():
        bpy.ops.object.select_all(action='DESELECT')
        for o in objects: o.select_set(True)
        bpy.context.view_layer.objects.active=objects[0]
        if len(objects)>1: bpy.ops.object.join()
        objects[0].name='Batched | '+name
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.export_scene.gltf(filepath=str(OUT/('preah-vihear-'+tier+'.glb')),
        export_format='GLB',use_selection=True,export_apply=True,export_yup=True)
    triangles=0
    for o in bpy.context.scene.objects:
        if o.type=='MESH':
            o.data.calc_loop_triangles(); triangles+=len(o.data.loop_triangles)
    reports.append({'tier':tier,'triangles':triangles,'draws':len(groups),
                    'bytes':(OUT/('preah-vihear-'+tier+'.glb')).stat().st_size,
                    'gateOrderNorthToSouth':[g[0] for g in GATES],
                    'status':'Review only; not integrated; archival reference-guided illustration'})
    bpy.ops.wm.open_mainfile(filepath=str(source))
    stage(tier)
(OUT/'build-report.json').write_text(json.dumps(reports,indent=2))
print('PREAH_VIHEAR_REVIEW_COMPLETE',json.dumps(reports))
