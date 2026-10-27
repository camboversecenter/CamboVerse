"""Versioned dental/jaw refinement. Original illustrative geometry, not clinical.
Preserves the V6 body and the V5 head coordinate mapping used by fitted organs.
"""
import bpy, math, json
from pathlib import Path
from mathutils import Vector

OUT = Path(__file__).resolve().parents[1] / 'public/models/local'
PREFIX = 'lab-skeleton-v7'

def select(objects):
    bpy.ops.object.select_all(action='DESELECT')
    for o in objects: o.select_set(True)
    bpy.context.view_layer.objects.active = objects[0]

def smooth(a,b,x):
    t = max(0,min(1,(x-a)/(b-a)))
    return t*t*(3-2*t)

def fit(v, center, scale):
    p = (v-center)*scale + Vector((0,1,73))
    x,d,z = p
    vault = smooth(73,80,z)
    chin = (1-smooth(63,68,z))*smooth(60,62,z)
    return Vector((x*(1-.03*vault-.10*chin), d+.65*chin*smooth(0,7,-d), z-2.8*smooth(74,86,z)))

def crown(name, t, upper, kind, material, tier):
    # Rounded rectangular crowns, rather than identical spherical beads.
    width,depth,height = {'incisor':(.68,.44,1.00),'canine':(.70,.62,1.08),
                          'premolar':(.77,.84,.92),'molar':(.86,1.02,.85)}[kind]
    x = 3.8*math.cos(t); front = 1.1+5.4*math.sin(t)
    y = 4.42 if upper else 3.23
    bpy.ops.mesh.primitive_cube_add(size=1, location=(x,-front,y))
    o = bpy.context.object; o.name = name
    o.scale = (width,depth,height)
    # Tangential crown width follows the dental arch.
    o.rotation_euler.z = math.atan2(-5.4*math.cos(t),-3.8*math.sin(t))
    select([o]); bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    mod = o.modifiers.new('Rounded enamel edges','BEVEL');mod.width=.13;mod.segments=2 if tier=='normal' else 4
    bpy.ops.object.modifier_apply(modifier=mod.name)
    for v in o.data.vertices:
        tip = -v.co.z if upper else v.co.z
        if kind=='incisor': v.co.y *= 1-.35*smooth(-height/2,height/2,tip)
        if kind=='canine':
            taper = 1-.50*smooth(0,height/2,tip)
            v.co.x *= taper;v.co.y *= taper
        if kind in ('premolar','molar') and tip>height*.22:
            # Shallow occlusal groove; inexpensive in both tiers.
            groove = .10*math.exp(-((v.co.x/(width*.24))**2))
            v.co.z += groove if upper else -groove
    o.data.materials.append(material)
    for p in o.data.polygons:p.use_smooth=True
    return o

stats={}
for tier in ['normal','ultra']:
    bpy.ops.wm.open_mainfile(filepath=str(OUT/'skull-review-v3.blend'))
    original=[o for o in bpy.context.scene.objects if o.type=='MESH']
    corners=[o.matrix_world@Vector(c) for o in original for c in o.bound_box]
    lo=Vector(tuple(min(p[i] for p in corners) for i in range(3)))
    hi=Vector(tuple(max(p[i] for p in corners) for i in range(3)))
    center=(lo+hi)/2;scale=26/(hi.z-lo.z)
    enamel=next(o.data.materials[0] for o in original if 'tooth' in o.name.lower())
    for o in list(bpy.context.scene.objects):
        if o.type!='MESH' or 'tooth' in o.name.lower():bpy.data.objects.remove(o,do_unlink=True)
    jaw=bpy.data.objects.get('Mandible')
    # Taper the bulky inferior jaw border without moving the condyles/socket.
    for v in jaw.data.vertices:
        p=jaw.matrix_world@v.co
        w=(1-smooth(2.3,5,p.z))*smooth(2,5,-p.y)
        p.x*=1-.10*w
        p.z+=(.18+.42*(abs(p.x)/5)**2)*w
        v.co=jaw.matrix_world.inverted()@p
    # Adult illustrative arch: 2 incisors, canine, 2 premolars, 3 molars per quadrant.
    angles=[.105,.31,.52,.73,.94,1.15,1.34,1.52]
    kinds=['incisor','incisor','canine','premolar','premolar','molar','molar','molar']
    for upper in [True,False]:
        for side in [-1,1]:
            for i,(a,kind) in enumerate(zip(angles,kinds)):
                crown(f'{"Upper" if upper else "Lower"}-{side}-{kind}-{i+1}',math.pi/2+side*a,upper,kind,enamel,tier)
    skull=[o for o in bpy.context.scene.objects if o.type=='MESH']
    for o in skull:
        matrix=o.matrix_world.copy()
        for v in o.data.vertices:v.co=fit(matrix@v.co,center,scale)
        o.matrix_world.identity()
    select(skull);bpy.ops.object.join();skull=bpy.context.object
    skull.name='skeleton-skull-v7';skull['anatomyPart']='skeleton';skull['skeletonRegion']='skull'
    skull['dentition']='32 illustrative permanent crowns; roots not modeled'
    bpy.ops.import_scene.gltf(filepath=str(OUT/f'lab-skeleton-v6-{tier}.glb'))
    for o in list(bpy.context.scene.objects):
        if o!=skull and o.get('skeletonRegion')=='skull':bpy.data.objects.remove(o,do_unlink=True)
    body=[o for o in bpy.context.scene.objects if o.type=='MESH' and o!=skull]
    for o in body:o.data.calc_loop_triangles()
    remaining=(32000 if tier=='normal' else 190000)-sum(len(o.data.loop_triangles) for o in body)
    skull.data.calc_loop_triangles()
    if len(skull.data.loop_triangles)>remaining:
        select([skull]);m=skull.modifiers.new('Tier geometry budget','DECIMATE');m.ratio=remaining/len(skull.data.loop_triangles)
        bpy.ops.object.modifier_apply(modifier=m.name)
    meshes=[o for o in bpy.context.scene.objects if o.type=='MESH']
    for o in meshes:o.data.calc_loop_triangles()
    path=OUT/f'{PREFIX}-{tier}.glb'
    bpy.ops.export_scene.gltf(filepath=str(path),export_format='GLB',export_extras=True,export_animations=False)
    stats[tier]={'triangles':sum(len(o.data.loop_triangles) for o in meshes),'bytes':path.stat().st_size,'crowns':32}

scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=24
scene.render.resolution_x=900;scene.render.resolution_y=900;scene.render.resolution_percentage=100
scene.world=bpy.data.worlds.new('Skull review');scene.world.use_nodes=True
scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.055,.075,.09,1)
scene.world.node_tree.nodes['Background'].inputs[1].default_value=.6
def aim(o,p):o.rotation_euler=(Vector(p)-o.location).to_track_quat('-Z','Y').to_euler()
for loc,power in [((-45,-65,110),38000),((45,-35,75),22000),((0,35,110),30000)]:
    bpy.ops.object.light_add(type='AREA',location=loc);o=bpy.context.object;o.data.energy=power;o.data.size=35;aim(o,(0,0,72))
bpy.ops.object.camera_add(location=(0,-80,74));scene.camera=bpy.context.object;scene.camera.data.type='ORTHO';scene.camera.data.ortho_scale=29
for label,loc in [('front',(0,-80,74)),('quarter',(42,-70,77))]:
    scene.camera.location=loc;aim(scene.camera,(0,0,72));scene.render.filepath=str(OUT/f'{PREFIX}-{label}.png');bpy.ops.render.render(write_still=True)
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/f'{PREFIX}.blend'))
bpy.ops.import_scene.gltf(filepath=str(OUT/'lab-head-fitted-v1-ultra.glb'))
scene.render.filepath=str(OUT/f'{PREFIX}-fitted.png');bpy.ops.render.render(write_still=True)
(OUT/f'{PREFIX}-stats.json').write_text(json.dumps(stats,indent=2))
print(stats)
