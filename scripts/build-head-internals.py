"""Blender authoring/export for schematic anatomy fitted to the reviewed head.

The surface derives from the local reviewed MakeHuman mesh. Internal structures
are authored approximations for teaching, not segmented or validated anatomy.
All lesson structures exist in both fidelity levels; only tessellation changes.
"""
from pathlib import Path
import math
import json
import sys
import bpy
import bmesh
from mathutils import Vector

OUT = Path(__file__).resolve().parent.parent / 'public/models/local'
PI = math.pi


def mat(name, color, roughness=.65):
    m = bpy.data.materials.new(name)
    m.diffuse_color = (*color, 1)
    m.use_nodes = True
    s = m.node_tree.nodes.get('Principled BSDF')
    s.inputs['Base Color'].default_value = (*color, 1)
    s.inputs['Roughness'].default_value = roughness
    return m


def mesh(name, verts, faces, material):
    data = bpy.data.meshes.new(name)
    data.from_pydata(verts, [], faces)
    data.update()
    obj = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(obj)
    data.materials.append(material)
    for p in data.polygons:
        p.use_smooth = True
    return obj


def uv(name, center, scale, material, n):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=n, ring_count=n//2, location=center)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(material)
    for p in obj.data.polygons:
        p.use_smooth = True
    return obj


def cut(obj, axis, level, keep_positive, seal=False):
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    co, normal = [0.,0.,0.], [0.,0.,0.]
    co[axis], normal[axis] = level, 1
    bmesh.ops.bisect_plane(bm, geom=list(bm.verts)+list(bm.edges)+list(bm.faces),
        plane_co=co, plane_no=normal, clear_inner=keep_positive, clear_outer=not keep_positive)
    if seal:
        bmesh.ops.holes_fill(bm, edges=[e for e in bm.edges if e.is_boundary and
            all(abs(v.co[axis]-level)<.001 for v in e.verts)], sides=0)
    bm.to_mesh(obj.data)
    bm.free()


def tube(name, points, radius, material, sides=8):
    curve = bpy.data.curves.new(name, 'CURVE')
    curve.dimensions = '3D'
    curve.bevel_depth = radius
    curve.bevel_resolution = 1 if sides == 8 else 2
    s = curve.splines.new('POLY')
    s.points.add(len(points)-1)
    for p, co in zip(s.points, points):
        p.co = (*co, 1)
    obj = bpy.data.objects.new(name, curve)
    bpy.context.collection.objects.link(obj)
    curve.materials.append(material)
    bpy.ops.object.select_all(action='DESELECT')
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.convert(target='MESH')
    for p in obj.data.polygons:
        p.use_smooth = True
    return obj


def muscles(tier):
    bpy.ops.import_scene.gltf(filepath=str(OUT/f'lab-head-reviewed-{tier}.glb'))
    head = next(o for o in bpy.context.scene.objects if o.name.startswith('part-skin-head'))
    bpy.context.view_layer.update()
    # Ray casting uses the complete face before separating the skin half.
    reference = head.copy()
    reference.data = head.data.copy()
    bpy.context.collection.objects.link(reference)
    fascia = head.copy()
    fascia.data = head.data.copy()
    bpy.context.collection.objects.link(fascia)
    fascia.name = 'part-facial-muscles-fascia'
    fascia.data.materials.clear()
    fascia.data.materials.append(mat('Connective tissue', (.34,.13,.10)))
    for attribute in list(fascia.data.color_attributes):
        fascia.data.color_attributes.remove(attribute)
    cut(fascia, 0, 0, False)
    cut(head, 0, 0, True)
    head.name = 'part-skin-half'
    for obj in list(bpy.context.scene.objects):
        if obj.name.startswith('part-skin-Eyebrow'):
            cut(obj, 0, 0, True)
    red = mat('Muscle belly', (.36,.045,.035))
    fiber = mat('Muscle fibres', (.43,.085,.065))
    n = 26 if tier == 'ultra' else 14

    def project(x, z, height):
        hit, p, normal, _ = reference.ray_cast(Vector((x,-35,z)), Vector((0,1,0)))
        if not hit:
            return (x,-5,z)
        return tuple(p+normal*height)

    def patch(name, center, radii, angle=0, hole=0):
        verts, faces = [], []
        # Elliptical bands conform to the head rather than floating ovals.
        for j in range(n+1):
            r = hole + (1-hole)*j/n
            for i in range(n*2):
                theta = 2*PI*i/(n*2)
                a, b = radii[0]*r*math.cos(theta), radii[1]*r*math.sin(theta)
                x = min(-.035, center[0]+a*math.cos(angle)-b*math.sin(angle))
                z = center[1]+a*math.sin(angle)+b*math.cos(angle)
                ridge = .04 + .09*math.sin(PI*j/n) + .018*math.cos(theta*32)
                verts.append(project(x,z,ridge))
        for j in range(n):
            for i in range(n*2):
                a=j*n*2+i; b=j*n*2+(i+1)%(n*2)
                faces.append((a,b,b+n*2,a+n*2))
        mesh('part-facial-muscles-'+name,verts,faces,red)
        # Fine continuous fibres, never alternating face-material wedges.
        if hole:
            for line in range(4):
                radius=hole+(1-hole)*(line+.5)/4
                points=[]
                for step in range(n*2+1):
                    t=2*PI*step/(n*2)
                    x=min(-.035,center[0]+radii[0]*radius*math.cos(t))
                    z=center[1]+radii[1]*radius*math.sin(t)
                    points.append(project(x,z,.17))
                tube('part-facial-muscles-fibre-'+name,points,.012,fiber)
        else:
            for line in range(9):
                across=(line-4)/5
                extent=math.sqrt(1-across*across)*.87
                points=[]
                for step in range(n+1):
                    a=radii[0]*across; b=radii[1]*extent*(2*step/n-1)
                    x=min(-.035,center[0]+a*math.cos(angle)-b*math.sin(angle))
                    z=center[1]+a*math.sin(angle)+b*math.cos(angle)
                    points.append(project(x,z,.17))
                tube('part-facial-muscles-fibre-'+name,points,.012,fiber)
    patch('frontalis',(-1.8,9.15),(1.55,2.1))
    patch('temporalis',(-4.3,7.45),(.65,2.0),-.12)
    patch('orbicularis-oculi',(-2.08,6.0),(1.55,.99),hole=.70)
    patch('masseter',(-3.5,2.65),(.66,1.65),-.25)
    patch('zygomaticus',(-2.35,3.1),(.30,1.53),-.85)
    patch('buccinator',(-2.2,1.5),(.82,.58),.3)
    patch('orbicularis-oris',(-.1,1.75),(1.6,.73),hole=.65)
    patch('sternocleidomastoid',(-2.4,-4.0),(.48,2.6),-.38)
    bpy.data.objects.remove(reference, do_unlink=True)


def skeleton(tier):
    n=64 if tier=='ultra' else 32
    bone=mat('Ivory bone',(.68,.59,.43))
    enamel=mat('Teeth',(.82,.76,.63),.4)
    tissue=mat('Brain tissue',(.49,.22,.20))
    # Open cranial shell exposes both hemispheres without transparency.
    vault=uv('part-skull-cranial-shell',(0,-2.2,8),(4.65,5.7,5.7),bone,n)
    cut(vault,2,1.2,False) # local Z: upper cranium removed at world Z 9.2
    bpy.context.view_layer.objects.active=vault
    solid=vault.modifiers.new('Bone thickness','SOLIDIFY'); solid.thickness=.25
    bpy.ops.object.modifier_apply(modifier=solid.name)
    plate=uv('part-skull-midface',(0,-7.35,4.8),(3.8,1.15,3.6),bone,n)
    for x in (-2.1,2.1):
        cutter=uv('orbit-cutter',(x,-7.6,6),(1.48,3,1.40),bone,n)
        for target in (plate, vault):
            bpy.context.view_layer.objects.active=target
            mod=target.modifiers.new('Open eye socket','BOOLEAN'); mod.operation='DIFFERENCE'; mod.object=cutter
            bpy.ops.object.modifier_apply(modifier=mod.name)
        bpy.data.objects.remove(cutter,do_unlink=True)
    cutter=uv('nose-cutter',(0,-8,3.7),(.70,3,1.05),bone,n)
    bpy.context.view_layer.objects.active=plate
    mod=plate.modifiers.new('Nasal opening','BOOLEAN'); mod.operation='DIFFERENCE'; mod.object=cutter
    bpy.ops.object.modifier_apply(modifier=mod.name)
    bpy.data.objects.remove(cutter,do_unlink=True)
    for sign in (-1,1):
        tube('part-skull-zygomatic-arch',[(sign*3.1,-7.9,4.7),(sign*4.1,-6,4.5),(sign*4.3,-3.8,5.1)],.36,bone)
    points=[]
    for i in range(n+1):
        t=PI*i/n
        points.append((3.05*math.cos(t),-3.0-5.15*math.sin(t),-.45+.5*abs(math.cos(t))))
    tube('part-skull-mandible',points,.55,bone)
    for sign in (-1,1):
        tube('part-skull-jaw-ramus',[(sign*3.05,-3,.05),(sign*3.65,-3.6,1.3),(sign*3.6,-3.9,3.3)],.5,bone)
    # Distinct upper and lower dental arches, same tooth count in both tiers.
    for row,z in [('upper',1.5),('lower',.45)]:
        for i in range(14):
            t=.16+(PI-.32)*(i+.5)/14
            uv('part-skull-tooth-'+row,(2.5*math.cos(t),-3.7-4.3*math.sin(t),z),(.30,.36,.40),enamel,12 if tier=='normal' else 20)
    # Separated folded cerebral hemispheres. Grooves deform the actual surface.
    for sign in (-1,1):
        brain=uv('part-brain-hemisphere',(sign*2.03,-2.55,9),(2.02,4.45,3.65),tissue,n*2)
        for v in brain.data.vertices:
            p=v.co
            u=math.atan2(p.y/4.45,p.x/2.02)
            w=math.acos(max(-1,min(1,p.z/3.65)))
            fold=math.cos(16*u+2.0*math.sin(7*w)) * math.sin(12*w+1.8*math.sin(5*u))
            p *= 1+.047*fold*math.sin(w)**.7
    for sign in (-1,1):
        cerebellum=uv('part-brain-cerebellum',(sign*1.55,1.0,4.9),(1.65,1.7,1.45),tissue,n)
        for v in cerebellum.data.vertices:
            v.co *= 1+.045*math.cos(v.co.z*21)
    uv('part-brain-stem',(0,-.6,3.6),(.60,.72,1.9),tissue,n//2)


def consolidate():
    # Merge same learning-part/material meshes to keep draw calls modest.
    buckets={}
    for obj in list(bpy.context.scene.objects):
        if obj.type!='MESH' or not obj.data.polygons:
            continue
        key=('skull' if obj.name.startswith('part-skull') else 'brain' if obj.name.startswith('part-brain') else 'facial-muscles' if obj.name.startswith('part-facial-muscles') else obj.name,
             tuple(m.name for m in obj.data.materials))
        buckets.setdefault(key,[]).append(obj)
    for (part,_),objects in buckets.items():
        if len(objects)<2: continue
        bpy.ops.object.select_all(action='DESELECT')
        for obj in objects: obj.select_set(True)
        bpy.context.view_layer.objects.active=objects[0]
        bpy.ops.object.join()
        objects[0].name='part-'+part+'-structures'


def preview(label):
    scene=bpy.context.scene
    scene.render.engine='BLENDER_EEVEE'
    scene.render.resolution_x=650; scene.render.resolution_y=650
    scene.render.resolution_percentage=100
    scene.world.use_nodes=True
    scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.09,.12,.16,1)
    scene.world.node_tree.nodes['Background'].inputs[1].default_value=.4
    def aim(o): o.rotation_euler=(Vector((0,-3,4))-o.location).to_track_quat('-Z','Y').to_euler()
    bpy.ops.object.camera_add(location=(18,-65,15))
    scene.camera=bpy.context.object; scene.camera.data.type='ORTHO'; scene.camera.data.ortho_scale=29
    aim(scene.camera)
    for at,power in [((-18,-26,28),14000),((22,-10,16),8000),((0,18,24),14000)]:
        bpy.ops.object.light_add(type='AREA',location=at)
        light=bpy.context.object; light.data.energy=power; light.data.size=18; aim(light)
    scene.render.filepath=str(OUT/f'lab-head-{label}-v2-preview.png')
    for screen in bpy.data.screens:
        for area in screen.areas:
            if area.type=='VIEW_3D':
                area.spaces.active.region_3d.view_location=(0,-3,4)
                area.spaces.active.region_3d.view_distance=35
                area.spaces.active.region_3d.view_rotation=scene.camera.rotation_euler.to_quaternion()
    bpy.ops.wm.save_as_mainfile(filepath=str(OUT/f'lab-head-{label}-v2.blend'))
    bpy.ops.render.render(write_still=True)


stats={}
for layer,build in [('muscles',muscles),('internal',skeleton)]:
    if '--muscles-only' in sys.argv and layer != 'muscles': continue
    for tier in ('normal','ultra'):
        bpy.ops.wm.read_factory_settings(use_empty=True)
        if bpy.context.scene.world is None: bpy.context.scene.world=bpy.data.worlds.new('Studio')
        build(tier)
        consolidate()
        bpy.ops.object.select_all(action='DESELECT')
        objects=[o for o in bpy.context.scene.objects if o.type=='MESH' and len(o.data.polygons)>0]
        triangles=0
        for obj in objects:
            obj.select_set(True); obj.data.calc_loop_triangles(); triangles+=len(obj.data.loop_triangles)
        path=OUT/f'lab-head-{layer}-v2-{tier}.glb'
        bpy.ops.export_scene.gltf(filepath=str(path),export_format='GLB',use_selection=True,export_animations=False)
        stats[layer+'-'+tier]={'triangles':triangles,'bytes':path.stat().st_size,'meshes':len(objects)}
        if tier=='ultra': preview(layer)
stats_path=OUT/'lab-head-internals-v2-stats.json'
if '--muscles-only' in sys.argv and stats_path.exists():
    stats={**json.loads(stats_path.read_text()),**stats}
stats_path.write_text(json.dumps(stats,indent=2))
print(json.dumps(stats,indent=2))
