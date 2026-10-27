"""Original village kit. Blender --background --python scripts/build-village.py.
Code Apache-2.0; generated assets CC-BY-4.0, CamboVerse contributors.
Metres, Blender Z up, front toward -Y (glTF +Z). No external assets.
"""
import bpy
import math
import json
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'public/models/village'
SOURCE = ROOT / 'assets/village'
OUT.mkdir(parents=True, exist_ok=True)
SOURCE.mkdir(parents=True, exist_ok=True)
WOOD = (.28, .13, .055, 1)
BOARD = (.53, .32, .15, 1)
LIGHT = (.69, .49, .26, 1)
ROOF = (.38, .105, .055, 1)
GREEN = (.13, .30, .075, 1)
LEAF = (.26, .43, .10, 1)
EARTH = (.46, .27, .12, 1)
GOLD = (.64, .40, .10, 1)
WHITE = (.78, .73, .58, 1)


def color(obj, rgba):
    attr = obj.data.color_attributes.new(name='Color', type='FLOAT_COLOR', domain='CORNER')
    for item in attr.data:
        item.color = rgba
    obj.data.materials.append(MAT)
    return obj


def box(name, pos, size, rgba=WOOD):
    bpy.ops.mesh.primitive_cube_add(size=1, location=pos)
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = size
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    return color(obj, rgba)


def rod(name, a, b, radius=.055, rgba=WOOD):
    a, b = Vector(a), Vector(b)
    bpy.ops.mesh.primitive_cylinder_add(vertices=SIDES, radius=radius, depth=(b-a).length, location=(a+b)/2)
    obj = bpy.context.object
    obj.name = name
    obj.rotation_euler = (b-a).to_track_quat('Z', 'Y').to_euler()
    return color(obj, rgba)


def ellipsoid(name, pos, scale, rgba):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=SIDES*2, ring_count=SIDES, radius=1, location=pos)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    return color(obj, rgba)


def mesh(name, vertices, faces, rgba):
    data = bpy.data.meshes.new(name)
    data.from_pydata(vertices, [], faces)
    data.update()
    obj = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(obj)
    return color(obj, rgba)


def roof(cx, cy, base, width, depth, rise):
    # Closed gabled prism, ridge along Y, with separate overhang fascia.
    w, d = width/2, depth/2
    pts = [(cx+x, cy+y, base+z) for y in [-d,d] for x,z in [(-w,0),(0,rise),(w,0)]]
    mesh('gable-roof', pts, [(0,2,1),(3,4,5),(0,1,4,3),(1,2,5,4),(0,3,5,2)], ROOF)
    for y in [-d,d]:
        rod('gable-trim', (cx-w,cy+y,base),(cx,cy+y,base+rise), .065, LIGHT)
        rod('gable-trim', (cx+w,cy+y,base),(cx,cy+y,base+rise), .065, LIGHT)
    rod('ridge-cap',(cx,cy-d-.05,base+rise),(cx,cy+d+.05,base+rise), .08, ROOF)
    if ULTRA:
        for i in range(1,10):
            y=cy-d+i*depth/10
            for sign in [-1,1]:
                rod('roof-seam',(cx, y, base+rise+.015),(cx+sign*w,y,base+.015),.014,ROOF)


def house():
    for x in [-1.4,0,1.4]:
        for y in [-1.8,0,1.45]:
            box('post-foot',(x,y,.08),(.30,.30,.16),WHITE)
            box('timber-post',(x,y,.93),(.16,.16,1.7))
        box('floor-beam',(x,-.18,1.62),(.13,3.55,.20))
    box('raised-floor',(0,-.2,1.76),(3.1,3.6,.13),BOARD)
    # Door opening front wall, sill and lintel (no painted-on door).
    for x in [-1.035,1.035]:
        box('front-wall',(x,-.95,2.64),(.93,.10,1.7),LIGHT)
    box('door-lintel',(0,-.95,3.40),(1.2,.14,.2),WOOD)
    box('rear-wall',(0,1.4,2.64),(3,.12,1.7),BOARD)
    # Side window openings with shutters.
    for x in [-1.48,1.48]:
        for y in [-.70,1.12]:
            box('side-wall',(x,y,2.64),(.1,.53,1.7),BOARD)
        box('window-sill-wall',(x,.2,2.05),(.1,1.3,.53),BOARD)
        box('window-header',(x,.2,3.27),(.1,1.3,.44),BOARD)
        for y in [-.48,.88]:
            box('window-jamb',(x,y,2.64),(.16,.09,.85),WOOD)
        for y in [-.66,1.06]:
            shutter=box('open-shutter',(x+(.23 if x>0 else -.23),y,2.65),(.45,.06,.76),LIGHT)
            shutter.rotation_euler.z=.35 if y<0 else -.35
    roof(0,.16,3.53,3.6,3.2,1.10)
    veranda=box('veranda-canopy',(0,-1.48,3.13),(3.45,1.3,.1),ROOF)
    veranda.rotation_euler.x=.19
    for x in [-1.4,1.4]:
        box('veranda-post',(x,-1.8,2.46),(.1,.1,1.4))
        rod('veranda-side-rail',(x,-1.85,2.5),(x,-.98,2.5))
    for left,right in [(-1.4,-.5),(.5,1.4)]:
        rod('veranda-front-rail',(left,-1.85,2.5),(right,-1.85,2.5))
        for i in range(4):
            x=left+(right-left)*i/3
            rod('baluster',(x,-1.85,1.85),(x,-1.85,2.5),.025)
    for i in range(8):
        box('stair-tread',(0,-3.55+i*.23,.22+i*.21),(1.05,.28,.1),BOARD)
    for x in [-.57,.57]:
        rod('stair-stringer',(x,-3.72,.1),(x,-1.83,1.70),.07)
        rod('stair-handrail',(x,-3.60,.85),(x,-1.83,2.45),.045)
        for y,z in [(-3.6,.3),(-1.85,1.8)]:
            rod('rail-post',(x,y,z),(x,y,z+.72),.045)
    if ULTRA:
        for i in range(19):
            x=-1.4+i*.155
            box('back-board-joint',(x,1.467,2.64),(.012,.008,1.65),WOOD)
        for y in [-1.75,-1.4]:
            box('deck-joint',(0,y,1.83),(3,.013,.009),WOOD)
        for x in [-1.4,1.4]:
            rod('cross-brace',(x,-1.7,.45),(x,-.15,1.55),.045)


def fence():
    for x in [-1,0,1]:
        box('fence-post',(x,0,.5),(.075,.075,1),WOOD)
    for z in [.35,.75]:
        box('fence-rail',(0,0,z),(2.1,.05,.07),BOARD)
    for i in range(7 if ULTRA else 5):
        x=-.9+i*1.8/(6 if ULTRA else 4)
        box('fence-picket',(x,0,.51),(.045,.06,.8),LIGHT)


def jar():
    # Lathed hollow vessel with an open mouth and interior neck.
    profile=[(.19,0),(.32,.08),(.41,.37),(.33,.62),(.22,.73),(.23,.79),(.18,.79),(.17,.71),(.27,.59),(.32,.36),(.22,.10),(0,.10)]
    n=SIDES*2
    verts=[(r*math.cos(i*2*math.pi/n),r*math.sin(i*2*math.pi/n),z) for r,z in profile for i in range(n)]
    faces=[(j*n+i,j*n+(i+1)%n,(j+1)*n+(i+1)%n,(j+1)*n+i) for j in range(len(profile)-1) for i in range(n)]
    mesh('earthen-water-jar',verts,faces,(.43,.22,.105,1))


def bench():
    box('bench-seat',(0,0,.49),(1.3,.48,.1),LIGHT)
    for x in [-.48,.48]:
        for y in [-.16,.16]:
            box('bench-leg',(x,y,.23),(.09,.09,.46))
    box('bench-stretcher',(0,0,.22),(1.05,.07,.08))


def basket():
    bpy.ops.mesh.primitive_cone_add(vertices=SIDES*2,radius1=.22,radius2=.35,depth=.38,location=(0,0,.19))
    color(bpy.context.object,LIGHT)
    if ULTRA:
        for z in [.06,.14,.22,.30,.39]:
            bpy.ops.mesh.primitive_torus_add(major_segments=16,minor_segments=4,location=(0,0,z),major_radius=.22+z*.32,minor_radius=.014)
            color(bpy.context.object,WOOD)


def palm():
    rod('palm-trunk',(0,0,0),(.12,0,4.7),.16,WOOD)
    if ULTRA:
        for i in range(15):
            bpy.ops.mesh.primitive_torus_add(major_segments=12,minor_segments=4,location=(i*.008,0,.3+i*.28),major_radius=.16,minor_radius=.022)
            color(bpy.context.object,BOARD)
    ellipsoid('palm-heart',(.12,0,4.65),(.25,.25,.3),GREEN)
    for k in range(9 if ULTRA else 7):
        angle=k*2*math.pi/(9 if ULTRA else 7)
        def p(r,t,z): return (.12+r*math.cos(t),r*math.sin(t),z)
        end=p(.8,angle,4.8)
        rod('leaf-stalk',(.12,0,4.65),end,.025,GREEN)
        rays=9 if ULTRA else 5
        verts=[end]+[p(1.6,angle-.48+i*.96/rays,4.35+(.13 if i%2 else 0)) for i in range(rays+1)]
        mesh('fan-leaf',verts,[(0,i+1,i+2) for i in range(rays)],LEAF if k%2 else GREEN)


def tree():
    rod('tree-trunk',(0,0,0),(0,0,2.5),.21,WOOD)
    for x,y,z,s in [(-.65,0,2.7,1),(.6,.3,3,1.1),(0,-.55,3.45,1.1),(0,.3,3.85,.85)]:
        rod('tree-branch',(0,0,1.5),(x,y,z),.09,WOOD)
        ellipsoid('leaf-canopy',(x,y,z),(s,s*.85,s*.8),LEAF if z>3 else GREEN)


def hall():
    for z,w,d in [(.12,6.2,7),(.32,5.8,6.6)]:
        box('hall-platform',(0,0,z),(w,d,.24),WHITE)
    box('hall-rear',(0,2.15,1.8),(3.5,.13,2.7),WHITE)
    for x in [-1.75,1.75]:
        box('hall-side',(x,0,1.8),(.13,4.3,2.7),WHITE)
        for y in [-2.1,0,2.1]:
            box('veranda-column',(x*1.35,y,1.9),(.16,.16,2.9),WHITE)
    for x in [-1.27,1.27]:
        box('hall-front',(x,-2.15,1.8),(.97,.13,2.7),WHITE)
    box('hall-lintel',(0,-2.15,3),(1.6,.2,.3),GOLD)
    roof(0,0,3.25,5.6,5.7,1.4)
    roof(0,.2,4.1,3.4,3.8,1.05)
    for i in range(3):
        box('hall-step',(0,-3.6+i*.28,.1+i*.14),(2,.32,.2),WHITE)
    # A restrained concept model: no invented sacred figurative ornament.


def stupa():
    for z,w in [(.12,2),(.34,1.65),(.56,1.3)]:
        box('stupa-base',(0,0,z),(w,w,.24),WHITE)
    ellipsoid('stupa-bell',(0,0,1.02),(.6,.6,.64),WHITE)
    for z,r,h in [(1.6,.4,.32),(1.95,.3,.38),(2.45,.18,.75)]:
        bpy.ops.mesh.primitive_cone_add(vertices=SIDES*2,radius1=r,radius2=r*.45,depth=h,location=(0,0,z))
        color(bpy.context.object,WHITE)
    rod('stupa-finial',(0,0,2.8),(0,0,3.15),.045,GOLD)


def buffalo():
    skin=(.17,.18,.17,1)
    ellipsoid('buffalo-body',(0,0,.92),(.95,.37,.46),skin)
    ellipsoid('buffalo-head',(.9,0,1.03),(.36,.26,.28),skin)
    ellipsoid('buffalo-muzzle',(1.14,0,.88),(.23,.24,.15),skin)
    for x in [-.57,.56]:
        for y in [-.25,.25]:
            rod('buffalo-leg',(x,y,.09),(x,y,.88),.085,skin)
    for sign in [-1,1]:
        rod('horn-root',(.87,sign*.19,1.18),(.75,sign*.45,1.30),.055,WHITE)
        rod('horn-tip',(.75,sign*.45,1.30),(.54,sign*.51,1.55),.025,WHITE)
    rod('tail',(-.8,0,1.1),(-1.1,.05,.48),.035,skin)


def road():
    box('dirt-road',(0,0,.015),(1,3.2,.03),(.48,.30,.16,1))
    for y in [-1.8,1.8]:
        box('road-drain',(0,y,.008),(1,.23,.012),(.23,.22,.12,1))
        box('road-shoulder',(0,y*1.13,.025),(1,.18,.045),EARTH)
    if ULTRA:
        for y in [-.7,.7]:
            box('wheel-wear',(0,y,.033),(1,.16,.006),(.43,.27,.14,1))


def plot():
    box('courtyard',(0,-.65,.022),(7.1,7,.04),(.46,.39,.24,1))
    box('entrance-path',(0,-4.45,.046),(1.5,3,.05),(.53,.43,.27,1))


def pond():
    for r,z,rgba in [(4.6,.035,(.48,.40,.23,1)),(4,.055,(.15,.31,.29,1))]:
        bpy.ops.mesh.primitive_cylinder_add(vertices=40 if ULTRA else 24,radius=r,depth=.025,location=(0,0,z))
        obj=color(bpy.context.object,rgba)
        obj.scale.x=1.35
    box('pond-access-deck',(-5,0,.12),(2,1.2,.14),BOARD)
    for i in range(14 if ULTRA else 8):
        a=i*.37
        x,y=5.6*math.cos(a),4.15*math.sin(a)
        for k in range(3):
            rod('bank-reed',(x+k*.07,y,.08),(x+k*.09,y,.6+k*.12),.018,LEAF)


def paddy():
    box('paddy-soil',(0,0,.035),(8,7,.065),(.27,.33,.15,1))
    for s in [-1,1]:
        box('field-bund',(s*4,0,.14),(.3,7.3,.26),EARTH)
        box('field-bund',(0,s*3.5,.14),(8,.3,.26),EARTH)
    count=20 if ULTRA else 12
    for row in range(count):
        for col in range(count):
            x,y=col/(count-1)*7-3.5,row/(count-1)*6-3
            bpy.ops.mesh.primitive_cone_add(vertices=5 if ULTRA else 3,radius1=.09,radius2=0,depth=.65,location=(x,y,.4))
            color(bpy.context.object,LEAF)


def house_variant(style):
    global BOARD, LIGHT, ROOF
    saved = BOARD, LIGHT, ROOF
    before = set(bpy.context.scene.objects)
    if style == 'blue':
        BOARD, LIGHT, ROOF = (.13,.29,.29,1), (.30,.47,.43,1), (.22,.25,.26,1)
    else:
        BOARD, LIGHT, ROOF = (.39,.22,.09,1), (.57,.38,.16,1), (.56,.40,.17,1)
    house()
    if style == 'blue':
        # A wider home, with exposed veranda braces.
        for x in [-1.4,1.4]:
            rod('porch-bracket',(x,-1.8,2.7),(x*.65,-1.8,3.1),.06,LIGHT)
    else:
        # Compact timber home with an attached open-sided kitchen shelter.
        canopy=box('side-kitchen-roof',(2.0,.3,2.0),(1.5,2.3,.10),ROOF)
        canopy.rotation_euler.y=.16
        for y in [-.7,1.3]:
            box('kitchen-post',(2.6,y,.94),(.10,.10,1.88),WOOD)
        box('kitchen-workbench',(2.05,.75,.8),(1.0,.6,.1),BOARD)
    for obj in set(bpy.context.scene.objects)-before:
        factor = 1.08 if style == 'blue' else .86
        obj.location.x *= factor
        obj.scale.x *= factor
    BOARD, LIGHT, ROOF = saved


BUILDERS={'house':house,'house-blue':lambda:house_variant('blue'),'house-kitchen':lambda:house_variant('kitchen'),'fence':fence,'jar':jar,'bench':bench,'basket':basket,'palm':palm,'tree':tree,'hall':hall,'stupa':stupa,'buffalo':buffalo,'road':road,'plot':plot,'pond':pond,'paddy':paddy}
report=[]
for mode in ['normal','ultra']:
    ULTRA=mode=='ultra'
    SIDES=10 if ULTRA else 6
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.context.preferences.filepaths.save_version=0
    MAT=bpy.data.materials.new('Village vertex colors')
    MAT.use_nodes=True
    bs=MAT.node_tree.nodes.get('Principled BSDF')
    bs.inputs['Roughness'].default_value=.88
    vc=MAT.node_tree.nodes.new('ShaderNodeVertexColor')
    vc.layer_name='Color'
    MAT.node_tree.links.new(vc.outputs['Color'],bs.inputs['Base Color'])
    MAT.diffuse_color=(.6,.4,.2,1)
    MAT.use_backface_culling=False
    for index,(name,build) in enumerate(BUILDERS.items()):
        bpy.ops.object.select_all(action='DESELECT')
        before=set(bpy.context.scene.objects)
        build()
        parts=[o for o in bpy.context.scene.objects if o not in before]
        bpy.ops.object.select_all(action='DESELECT')
        for o in parts: o.select_set(True)
        bpy.context.view_layer.objects.active=parts[0]
        bpy.ops.object.join()
        obj=bpy.context.object
        obj.name=name
        bpy.context.scene.cursor.location=(0,0,0)
        bpy.ops.object.origin_set(type='ORIGIN_CURSOR')
        bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
        # Collapse duplicate material slots from joined source meshes.
        obj.data.materials.clear()
        obj.data.materials.append(MAT)
        for polygon in obj.data.polygons: polygon.material_index=0
        obj.data.calc_loop_triangles()
        path=OUT/f'{name}-{mode}.glb'
        bpy.ops.export_scene.gltf(filepath=str(path),export_format='GLB',use_selection=True,export_animations=False,export_yup=True)
        report.append({'asset':name,'mode':mode,'triangles':len(obj.data.loop_triangles),'bytes':path.stat().st_size})
        # Arrange the editable asset library for Blender inspection AFTER export.
        obj.location=(index%5*8,index//5*10,0)
    bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE/f'village-{mode}.blend'))
(OUT/'manifest.json').write_text(json.dumps({'license':'CC-BY-4.0','attribution':'CamboVerse contributors','assets':report},indent=2))
print('VILLAGE_EXPORT_COMPLETE',json.dumps(report))
