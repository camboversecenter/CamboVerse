"""Replace only the illustrative staircase in the existing Wat Phnom assets.

Run with Blender --background --python scripts/redesign-wat-phnom-naga.py.
Source photos: D:/Images/wat phnom/stair (see docs/WAT-PHNOM-NAGA-REDESIGN.md).
No photos are embedded. Original GLBs, blends and trained splats are preserved.
Coordinates below use the viewer's Y-up axes, BEFORE its +1.4 hill offset.
"""
import bpy
import math
import random
import json
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'public/models/local/wat-phnom-naga-v3'
OUT.mkdir(parents=True, exist_ok=True)
SOURCE = ROOT / 'public/models/local/heritage-blender-v1'
NEW = []
ULTRA = False

def xyz(p):
    return (p[0], -p[2], p[1])

def mat(name, rgb):
    m = bpy.data.materials.new(name)
    m.diffuse_color = (*rgb, 1)
    m.use_nodes = True
    p = m.node_tree.nodes.get('Principled BSDF')
    p.inputs['Base Color'].default_value = (*rgb, 1)
    p.inputs['Roughness'].default_value = .88
    return m

def finish(o, name, material):
    o.name = 'Naga v3 | ' + name
    o.data.materials.append(material)
    o['study_part'] = 'Reference-guided Naga Staircase'
    NEW.append(o)
    return o

def box(name, p, size, material, bevel=0):
    bpy.ops.mesh.primitive_cube_add(size=1, location=xyz(p))
    o = bpy.context.object
    o.dimensions = (size[0], size[2], size[1])
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    finish(o, name, material)
    if bevel and ULTRA:
        m = o.modifiers.new('Worn edge', 'BEVEL')
        m.width = bevel
        m.segments = 2
        bpy.ops.object.modifier_apply(modifier=m.name)
    if material == BRICK:
        uv = o.data.uv_layers.active or o.data.uv_layers.new()
        for poly in o.data.polygons:
            for li in poly.loop_indices:
                v = o.matrix_world @ o.data.vertices[o.data.loops[li].vertex_index].co
                if abs(poly.normal.z) > .7:
                    coord = (v.x / .8, -v.y / .44)
                elif abs(poly.normal.y) > .7:
                    coord = (v.x / .8, v.z / .22)
                else:
                    coord = (-v.y / .8, v.z / .22)
                uv.data[li].uv = coord
    return o

def sphere(name, p, size, material):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=16 if ULTRA else 10,
        ring_count=10 if ULTRA else 6, radius=1, location=xyz(p))
    o = bpy.context.object
    o.scale = (size[0], size[2], size[1])
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    for f in o.data.polygons:
        f.use_smooth = True
    return finish(o, name, material)

def tube(name, points, radius, material, smooth=True, radii=None):
    c = bpy.data.curves.new(name, 'CURVE')
    c.dimensions = '3D'
    c.resolution_u = 5 if ULTRA else 3
    c.bevel_depth = radius
    c.bevel_resolution = 2 if ULTRA else 1
    c.use_fill_caps = True
    s = c.splines.new('BEZIER' if smooth else 'POLY')
    if smooth:
        s.bezier_points.add(len(points)-1)
        for i, (b, p) in enumerate(zip(s.bezier_points, points)):
            b.co = xyz(p)
            b.handle_left_type = b.handle_right_type = 'AUTO'
            if radii: b.radius = radii[i]
    else:
        s.points.add(len(points)-1)
        for b, p in zip(s.points, points):
            b.co = (*xyz(p), 1)
    o = bpy.data.objects.new(name, c)
    bpy.context.collection.objects.link(o)
    return finish(o, name, material)

def ribbon(name, points, width, height, material):
    # A solid sloping wall/coping strip, not floating posts or crossed triangles.
    vs = []
    for x, y, z in points:
        vs.extend([xyz((x-width/2,y-height,z)), xyz((x+width/2,y-height,z)),
                   xyz((x+width/2,y,z)), xyz((x-width/2,y,z))])
    fs = [(3,2,1,0)]
    for i in range(len(points)-1):
        for j in range(4):
            a, b = i*4+j, i*4+(j+1)%4
            fs.append((a,b,b+4,a+4))
    n = len(vs)
    fs.append((n-4,n-3,n-2,n-1))
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(vs, [], fs)
    mesh.update()
    o = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(o)
    return finish(o, name, material)

def brick_material():
    # Packed deterministic color texture; no photo copying or runtime shader cost.
    m = mat('Naga | weathered fired brick', (.40,.17,.105))
    image = bpy.data.images.new('Naga | original mottled brick atlas', width=512, height=512)
    rng = random.Random(1272)
    palette = []
    for _ in range(32):
        variation=rng.uniform(-.065,.065)
        palette.append((.49+variation,.255+variation*.65,.185+variation*.4))
    pixels = []
    for y in range(512):
        row = y//128
        for x in range(512):
            xx = (x+(32 if row%2 else 0))%512
            c = palette[row*8+xx//64]
            mortar = xx%64<4 or y%128<5
            grain = rng.uniform(-.035,.035)
            stain = .035*math.sin(x*.13+y*.023)*math.sin(y*.077)
            rgb = (.25,.235,.20) if mortar else tuple(max(.01,v+grain+stain) for v in c)
            pixels.extend((*rgb,1))
    image.pixels[:] = pixels
    image.pack()
    tex = m.node_tree.nodes.new('ShaderNodeTexImage')
    tex.image = image
    m.node_tree.links.new(tex.outputs['Color'],m.node_tree.nodes.get('Principled BSDF').inputs['Base Color'])
    return m

def fan(x, floor, z):
    # Seven radiating cobra necks against a connected, thick fan-shaped hood.
    # Major silhouette follows the supplied frontal photograph, not five beads.
    box('fan red pedestal', (x,floor+.10,z), (.62,.20,.55), RED, .015)
    box('pedestal molded cap', (x,floor+.23,z), (.69,.07,.61), TRIM, .008)
    base = floor+.26
    outline = [(-.105,0),(-.16,.25),(-.37,.47),(-.54,.63),(-.59,.83),
        (-.50,1.02),(-.35,1.20),(-.18,1.36),(0,1.44),(.18,1.36),
        (.35,1.20),(.50,1.02),(.59,.83),(.54,.63),(.37,.47),(.16,.25),(.105,0)]
    verts = [xyz((x+a,base+b,z+d)) for d in (-.045,.045) for a,b in outline]
    n = len(outline)
    faces = [tuple(reversed(range(n))),tuple(range(n,2*n))]
    for i in range(n):
        j=(i+1)%n
        faces.append((i,j,j+n,i+n))
    mesh=bpy.data.meshes.new('Seven-head fan membrane')
    mesh.from_pydata(verts,[],faces)
    mesh.update()
    o=bpy.data.objects.new('Seven-head fan membrane',mesh)
    bpy.context.collection.objects.link(o)
    finish(o,'seven-head fan membrane',CREAM)
    for i in range(-3,4):
        angle=i*.29
        hx=x+math.sin(angle)*.65
        hy=base+.42+math.cos(angle)*.84
        tube('radiating cobra neck',[(x+i*.018,base+.18,z+.045),
             (x+i*.075,base+.65,z+.08),(hx,hy-.12,z+.10)],.045,CREAM)
        hood=sphere('cobra hood', (hx,hy,z+.07), (.105,.19,.065),CREAM)
        hood.rotation_euler[1]=-angle
        tube('cobra hood rim',[(hx-.075,hy+.055,z+.13),(hx,hy+.115,z+.14),
             (hx+.075,hy+.055,z+.13)],.011,RELIEF)
        sphere('cobra muzzle', (hx,hy+.045,z+.14),(.053,.018,.020),CREAM)
        if ULTRA:
            for side in (-1,1):
                sphere('cobra carved eye',(hx+side*.039,hy+.055,z+.154),(.010,.009,.005),RELIEF)
            for j in range(5):
                y=base+.50+j*.09
                xx=x+(hx-x)*(y-base-.18)/(hy-base-.18)
                tube('throat relief',[(xx-.032,y,z+.118),(xx,y-.01,z+.126),(xx+.032,y,z+.118)],.004,RELIEF)
    tube('hood outline',[(x+a,base+b,z+.05) for a,b in outline],.016,RELIEF,False)
    if ULTRA:
        for a,b in outline[2:-2]:
            sphere('scalloped hood edge',(x+a,base+b,z),(.04,.048,.065),CREAM)

def lion(x, floor, z):
    box('lion red plinth',(x,floor+.11,z),(.51,.22,.56),RED,.012)
    box('lion plinth lip',(x,floor+.24,z),(.55,.06,.60),TRIM,.008)
    sphere('seated lion body',(x,floor+.53,z),(.19,.28,.20),CREAM)
    sphere('lion mane',(x,floor+.82,z+.045),(.22,.26,.15),CREAM)
    box('lion squared face',(x,floor+.84,z+.15),(.29,.27,.16),CREAM,.045)
    box('lion open mouth',(x,floor+.77,z+.24),(.21,.065,.025),RELIEF,.012)
    box('lion upper lip',(x,floor+.815,z+.26),(.24,.035,.055),CREAM,.012)
    box('lion lower lip',(x,floor+.727,z+.255),(.24,.027,.05),CREAM,.01)
    sphere('lion nose',(x,floor+.85,z+.26),(.065,.034,.033),CREAM)
    for i in range(5):
        box('lion carved teeth',(x+(i-2)*.033,floor+.788,z+.258),(.022,.025,.014),CREAM)
    for side in (-1,1):
        sphere('lion seated haunch',(x+side*.16,floor+.43,z-.07),(.12,.16,.15),CREAM)
        sphere('lion foreleg',(x+side*.10,floor+.44,z+.14),(.055,.18,.07),CREAM)
        sphere('lion paw',(x+side*.10,floor+.295,z+.18),(.072,.045,.10),CREAM)
        sphere('lion ear',(x+side*.16,floor+.98,z+.04),(.035,.075,.025),CREAM)
        tube('lion heavy brow',[(x+side*.025,floor+.9,z+.245),
            (x+side*.075,floor+.925,z+.245),(x+side*.115,floor+.9,z+.23)],.019,CREAM)
        sphere('lion eye',(x+side*.071,floor+.889,z+.242),(.020,.012,.007),RELIEF)
        if ULTRA:
            for j in range(4):
                yy=floor+.66+j*.08
                tube('lion mane curl',[(x+side*.18,yy,z+.12),
                    (x+side*.23,yy+.035,z+.14),(x+side*.20,yy+.06,z+.16)],.013,CREAM)

def staircase():
    bottom, top = -1.10, .265
    rise=(top-bottom)/36
    run=(9.0-1.1)/36
    z,y=11.25,bottom
    box('lower apron',(0,bottom-.09,11.50),(3.4,.18,.5),BRICK)
    controls=[(z,y)]
    for flight in range(3):
        for i in range(12):
            y+=rise
            width=2.80-(11.25-z)/9*.65
            box('brick tread %02d' % (flight*12+i+1), (0,y-.13,z-run/2),
                (width,.26,run+.001),BRICK,.002)
            z-=run
        controls.append((z,y))
        if flight<2:
            box('rest landing %d'%flight,(0,y-.13,z-.275),(width,.26,.55),BRICK,.002)
            z-=.55
            controls.append((z,y))
    assert abs(z-2.25)<.00001 and abs(y-top)<.00001
    box('terrace connection',(0,top-.08,2.19),(2.16,.16,.12),BRICK)
    for side in (-1,1):
        path=[]
        for zz,yy in controls:
            half=(2.80-(11.25-zz)/9*.65)/2
            path.append((side*(half+.15),yy+.30,zz))
        ribbon('red retaining balustrade',path,.25,.48,RED)
        for offset,width,height in [(-.26,.31,.04),(-.17,.29,.04),(-.02,.34,.06)]:
            ribbon('red stepped molding',[(x,y+offset,z) for x,y,z in path],width,height,TRIM)
        ribbon('cream serpent coping',[(x,y+.075,z) for x,y,z in path],.34,.10,CREAM)
        tube('rounded naga back',[(x,y+.08,z) for x,y,z in path],.095,CREAM,False)
        # One terminal block covers coincident end caps of the molded strips.
        # Without it their coplanar faces create dark overlapping bands.
        fx,fy,fz=path[0]
        box('balustrade terminal block',(fx,fy-.24,fz+.035),(.38,.49,.09),RED,.006)
        box('terminal cream cap',(fx,fy+.075,fz+.035),(.40,.20,.10),CREAM,.008)
        fan(side*1.63,bottom+.14,10.85)
        # Upturned serpent tail at the upper flight, visible in the references.
        tx,ty,tz=path[-1]
        tube('upturned naga tail',[(tx,ty+.09,tz+.6),(tx,ty+.18,tz+.22),
            (tx,ty+.53,tz+.12),(tx,ty+.72,tz+.23)],.07,CREAM,radii=[1,1,.6,.03])
        lion(side*2.05,bottom-.02,11.20)
        lion(side*1.48,controls[3][1],controls[3][0]-.25)

def merge_new():
    for o in list(NEW):
        if o.type=='CURVE':
            bpy.ops.object.select_all(action='DESELECT')
            o.select_set(True)
            bpy.context.view_layer.objects.active=o
            bpy.ops.object.convert(target='MESH')
    groups={}
    for o in NEW:
        groups.setdefault(o.data.materials[0].name,[]).append(o)
    for material,objects in groups.items():
        bpy.ops.object.select_all(action='DESELECT')
        for o in objects: o.select_set(True)
        bpy.context.view_layer.objects.active=objects[0]
        bpy.ops.object.join()
        o=objects[0]
        o.name='Naga v3 | '+material
        bpy.ops.object.mode_set(mode='EDIT')
        bpy.ops.mesh.select_all(action='SELECT')
        bpy.ops.mesh.normals_make_consistent(inside=False)
        bpy.ops.object.mode_set(mode='OBJECT')

def render_review(tier):
    sc=bpy.context.scene
    sc.world.use_nodes=True
    sc.world.node_tree.nodes['Background'].inputs['Color'].default_value=(.24,.28,.31,1)
    sc.world.node_tree.nodes['Background'].inputs['Strength'].default_value=.7
    bpy.ops.object.light_add(type='AREA',location=xyz((3,9,9)))
    bpy.context.object.data.energy=1500
    bpy.context.object.data.size=7
    bpy.ops.object.camera_add(location=xyz((5.6,5.4,14.8)))
    cam=bpy.context.object
    cam.rotation_euler=(Vector(xyz((0,.20,6.9)))-cam.location).to_track_quat('-Z','Y').to_euler()
    cam.data.type='ORTHO'
    cam.data.ortho_scale=11.4
    sc.camera=cam
    sc.render.engine='CYCLES'
    sc.cycles.device='CPU'
    sc.cycles.samples=24
    sc.cycles.use_denoising=True
    sc.render.resolution_x=1100
    sc.render.resolution_y=900
    sc.render.resolution_percentage=100
    sc.view_settings.view_transform='AgX'
    sc.render.filepath=str(OUT/(tier+'-overview.png'))
    bpy.ops.render.render(write_still=True)
    cam.location=xyz((.2,1.1,15.8))
    cam.rotation_euler=(Vector(xyz((0,-.15,9.1)))-cam.location).to_track_quat('-Z','Y').to_euler()
    cam.data.type='PERSP'
    cam.data.lens=42
    sc.render.filepath=str(OUT/(tier+'-entrance.png'))
    bpy.ops.render.render(write_still=True)
    if ULTRA:
        # Review-only hill matches WatPhnomLandscape's dimensions and offset.
        green=mat('Preview hill only',(.16,.23,.075))
        bpy.ops.mesh.primitive_cone_add(vertices=44,radius1=13,radius2=3.2,
            depth=1.4,location=xyz((0,-.7,0)))
        bpy.context.object.data.materials.append(green)
        cam.location=xyz((6,5.4,15))
        cam.rotation_euler=(Vector(xyz((0,.3,6.6)))-cam.location).to_track_quat('-Z','Y').to_euler()
        cam.data.type='ORTHO'
        cam.data.ortho_scale=12
        sc.render.filepath=str(OUT/'ultra-hill-integration.png')
        bpy.ops.render.render(write_still=True)

report=[]
for tier in ('normal','ultra'):
    ULTRA=tier=='ultra'
    NEW=[]
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(SOURCE/('wat-phnom-'+tier+'.glb')))
    old=[o for o in bpy.context.scene.objects if o.name.startswith(('Naga stair','Guardians'))]
    assert len(old)==9, 'Unexpected source layout: refusing partial staircase replacement'
    for o in old:
        bpy.data.objects.remove(o,do_unlink=True)
    RED=mat('Naga | oxblood red masonry',(.24,.055,.035))
    TRIM=mat('Naga | red molded edges',(.31,.083,.055))
    CREAM=mat('Naga | warm sandstone stucco',(.72,.55,.41))
    RELIEF=mat('Naga | carved recess',(.39,.26,.18))
    BRICK=brick_material()
    staircase()
    merge_new()
    sc=bpy.context.scene
    if sc.world is None: sc.world=bpy.data.worlds.new('Review World')
    sc['provenance']='Illustrative model guided by supplied staircase photographs; not survey geometry'
    bpy.context.preferences.filepaths.save_version=0
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.wm.save_as_mainfile(filepath=str(OUT/('wat-phnom-'+tier+'.blend')))
    bpy.ops.export_scene.gltf(filepath=str(OUT/('wat-phnom-'+tier+'.glb')),
        export_format='GLB',use_selection=True,export_apply=True,export_yup=True)
    report.append({'tier':tier,'removedSourceParts':len(old),
        'bytes':(OUT/('wat-phnom-'+tier+'.glb')).stat().st_size,
        'steps':36,'landings':2,'topY':.265,'bottomY':-1.10,
        'note':'Y excludes the viewer +1.4 hill offset; dimensions are illustrative'})
    render_review(tier)
(OUT/'build-report.json').write_text(json.dumps(report,indent=2))
print('NAGA_REDESIGN_COMPLETE',json.dumps(report))
