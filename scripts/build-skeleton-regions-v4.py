"""Region-tagged Blender review; preserve approved skull/pelvis, refine extremities.
Uses V3 function definitions without running its export pipeline.
"""
import ast, bpy, math, json
from pathlib import Path
from mathutils import Vector
source=Path(__file__).with_name('export-skeleton-v3.py')
tree=ast.parse(source.read_text())
# Import declarations and definitions only, stopping before V3's main pipeline.
nodes=[]
for node in tree.body:
    if isinstance(node,ast.Expr) and isinstance(node.value,ast.Call) and ast.unparse(node.value.func)=='bpy.ops.wm.read_factory_settings':break
    nodes.append(node)
scope={'__file__':str(source)}
exec(compile(ast.Module(body=nodes,type_ignores=[]),str(source),'exec'),scope)
h=scope['h'];OUT=h.OUT
bpy.ops.wm.read_factory_settings(use_empty=True)
h.consolidate=lambda:None
scope['build']()
bone=bpy.data.materials['Skeleton ivory']
for o in list(bpy.context.scene.objects):
    if o.type=='MESH' and o.name.startswith(('skeleton-carpals','skeleton-finger','skeleton-metacarpal','skeleton-tarsals','skeleton-metatarsal','skeleton-toe')):
        bpy.data.objects.remove(o,do_unlink=True)

# Separate wrist clusters, metacarpal rays and joint-separated phalanges.
# Simplified teaching shapes, not an individually validated bone atlas.
for s in [-1,1]:
    for row in range(2):
        for col in range(4):
            h.ellipsoid('skeleton-carpals',(s*(23.6+col*.85),-7-row*.85,1.5),(.5,.55,.7),bone)
    for f in range(5):
        x=s*(27- f*.95);length=[4.5,6.2,7,6.5,5][f]
        start=(x,-8.5,1.5)
        end=(x+s*(2 if f==0 else .1),-11.7+(1 if f==0 else 0),1.9)
        h.tube('skeleton-metacarpal',[start,end],lambda t:.30+.13*abs(2*t-1)**6,bone,14)
        count=2 if f==0 else 3
        for j in range(count):
            a=(end[0]+s*(.5*j if f==0 else .08*j),end[1]-j*length/count,1.9)
            b=(a[0]+s*(.45 if f==0 else .08),a[1]-length/count+.18,2)
            h.tube('skeleton-finger',[a,b],lambda t:.23+.09*abs(2*t-1)**6,bone,12)
    # Heel and ankle distinguish the hindfoot from the forward metatarsal fan.
    h.ellipsoid('skeleton-tarsals',(s*8,-83,-.5),(1.8,1.5,2.5),bone)
    h.ellipsoid('skeleton-tarsals',(s*8,-81.5,1),(1.6,1.4,1.8),bone)
    for col in range(5):
        h.ellipsoid('skeleton-tarsals',(s*(6+col),-82.5,3+(.6 if col<3 else 0)),(.65,.8,1),bone)
    for f in range(5):
        x=s*(5.8+f*1.05);end=8.2-f*.35
        h.tube('skeleton-metatarsal',[(x,-82.5,4),(x,-83,end)],lambda t:.32+.15*abs(2*t-1)**6,bone,16)
        count=2 if f==0 else 3;length=2.7-f*.26
        for j in range(count):
            h.tube('skeleton-toe',[(x,-83,end+j*length/count+.12),(x,-83,end+(j+1)*length/count)],.30 if f==0 else .22,bone,10)

def region(o):
    n=o.name
    if 'approved-skull' in n:return 'skull'
    if 'approved-pelvis' in n:return 'pelvis'
    if any(k in n for k in ['vertebr','disc','neural','spinous','transverse']):return 'spine'
    if any(k in n for k in ['rib','sternum','costal']):return 'rib-cage'
    if any(k in n for k in ['clavicle','scapula']):return 'shoulder-girdle'
    points=[o.matrix_world@Vector(v) for v in o.bound_box]
    side='right' if sum(v.x for v in points)<0 else 'left'
    if any(k in n for k in ['carpal','finger']):return side+'-hand'
    if any(k in n for k in ['tarsal','toe']):return side+'-foot'
    if any(k in n for k in ['humer','radius','ulna']):return side+'-arm'
    if any(k in n for k in ['fem','trochanter','tibia','fibula','patella']):return side+'-leg'
    raise ValueError('Unclassified mesh '+n)

buckets={}
for o in bpy.context.scene.objects:
    if o.type!='MESH':continue
    key=region(o);o['skeletonRegion']=key;o['anatomyPart']='skeleton'
    buckets.setdefault(key,[]).append(o)
for key,objects in buckets.items():
    bpy.ops.object.select_all(action='DESELECT')
    for o in objects:o.select_set(True)
    bpy.context.view_layer.objects.active=objects[0];bpy.ops.object.join()
    objects[0].name='skeleton-region-'+key
scope['budget'](190000)
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'lab-skeleton-regions-v4.blend'))
stats={}
for tier,target in [('ultra',190000),('normal',32000)]:
    triangles=scope['budget'](target)
    bpy.ops.object.select_all(action='SELECT')
    path=OUT/f'lab-skeleton-regions-v4-{tier}.glb'
    bpy.ops.export_scene.gltf(filepath=str(path),export_format='GLB',export_extras=True,export_animations=False)
    stats[tier]={'triangles':triangles,'bytes':path.stat().st_size,'regions':sorted(buckets)}
bpy.ops.wm.open_mainfile(filepath=str(OUT/'lab-skeleton-regions-v4.blend'))
scene=bpy.context.scene;scene.render.engine='BLENDER_EEVEE'
scene.render.resolution_x=700;scene.render.resolution_y=1000;scene.render.resolution_percentage=100
scene.world=bpy.data.worlds.new('Review studio');scene.world.use_nodes=True
scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.045,.065,.085,1)
scene.world.node_tree.nodes['Background'].inputs[1].default_value=.5
target=Vector((0,0,0))
bpy.ops.object.camera_add(location=(15,-360,12));cam=bpy.context.object
cam.rotation_euler=(target-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=188;scene.camera=cam
for at,power in [((-80,-110,140),180000),((80,-50,30),100000),((0,80,100),180000)]:
    bpy.ops.object.light_add(type='AREA',location=at);o=bpy.context.object;o.data.energy=power;o.data.size=90;o.rotation_euler=(target-o.location).to_track_quat('-Z','Y').to_euler()
scene.render.filepath=str(OUT/'lab-skeleton-regions-v4-preview.png');bpy.ops.render.render(write_still=True)
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'lab-skeleton-regions-v4.blend'))
(OUT/'lab-skeleton-regions-v4-stats.json').write_text(json.dumps(stats,indent=2));print(stats)
