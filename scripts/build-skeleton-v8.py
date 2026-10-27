"""V8: tapered malar surfaces and surface-following cranial suture landmarks.
Original educational geometry; not a clinical model or separated cranial bones.
Uses immutable V7 exports and the original head fit, retaining the rest of the body.
"""
import bpy, math, json, ast
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree

OUT=Path(__file__).resolve().parents[1]/'public/models/local'
PREFIX='lab-skeleton-v8'
# Reuse only pure helpers; never execute the V7 generation pipeline on import.
tree=ast.parse((Path(__file__).parent/'build-skeleton-v7.py').read_text())
exec(compile(ast.Module(body=[n for n in tree.body if isinstance(n,ast.FunctionDef) and n.name in ('select','smooth','fit')],type_ignores=[]),'<v7 helpers>','exec'))
bpy.ops.wm.open_mainfile(filepath=str(OUT/'skull-review-v3.blend'))
corners=[o.matrix_world@Vector(c) for o in bpy.context.scene.objects if o.type=='MESH' for c in o.bound_box]
lo=Vector(tuple(min(p[i] for p in corners) for i in range(3)))
hi=Vector(tuple(max(p[i] for p in corners) for i in range(3)))
center=(lo+hi)/2;scale=26/(hi.z-lo.z)
def mapped(p):return fit(Vector(p),center,scale)

def region(o):
    while o:
        if o.get('skeletonRegion'):return o['skeletonRegion']
        o=o.parent

def sutures(skull,tier):
    # Project every edge onto the exported mesh, so reduced Normal geometry does
    # not swallow or detach the landmarks. These are narrow surface inlays, not
    # cut-through cracks. Coronal, sagittal and lambdoid meet at shared endpoints.
    deps=bpy.context.evaluated_depsgraph_get();bvh=BVHTree.FromObject(skull,deps)
    origin=mapped((0,1.5,15))
    def project(direction):
        d=Vector(direction).normalized();start=origin+d*35
        hit,normal,_,_=bvh.ray_cast(start,-d,50)
        if hit is None:raise RuntimeError('Suture projection missed the cranial surface')
        return hit+normal*.012,normal
    # Directions in Blender coordinates: anterior is negative Y.
    bregma=Vector((0,-.30,1)).normalized()
    lam=Vector((0,.85,.65)).normalized()
    def coronal(t):
        a=-math.pi*.49+math.pi*.98*t
        return Vector((math.sin(a),-.30*math.cos(a),math.cos(a)))
    def sagittal(t):return bregma.lerp(lam,t).normalized()
    def lambdoid(t):
        a=(t-.5)*2
        return Vector((a*.88,.85,.65*(1-abs(a))+.02))
    vertices=[];faces=[]
    samples=64 if tier=='normal' else 180
    for name,path in [('coronal',coronal),('sagittal',sagittal),('lambdoid',lambdoid)]:
        points=[]
        for i in range(samples+1):
            t=i/samples;d=path(t)
            tangent=(path(min(1,t+.001))-path(max(0,t-.001))).normalized()
            lateral=d.cross(tangent).normalized()
            # Small irregular interdigitation, tapering to zero at junctions.
            wiggle=(math.sin(t*math.pi*54)+.32*math.sin(t*math.pi*106))*.006*math.sin(math.pi*t)
            d+=lateral*wiggle
            points.append((d,tangent,lateral))
        start=len(vertices)
        for d,tangent,lateral in points:
            for sign in [-1,1]:
                p,n=project(d+lateral*(sign*.0018))
                vertices.append(p)
        for i in range(samples):
            a=start+i*2;faces.append((a,a+1,a+3,a+2))
    mesh=bpy.data.meshes.new('Three cranial suture surface landmarks');mesh.from_pydata(vertices,[],faces);mesh.update()
    o=bpy.data.objects.new('Coronal sagittal lambdoid sutures',mesh);bpy.context.collection.objects.link(o)
    mat=bpy.data.materials.new('Subtle suture recess');mat.diffuse_color=(.29,.245,.19,1);mat.use_nodes=True
    shader=mat.node_tree.nodes.get('Principled BSDF');shader.inputs['Base Color'].default_value=mat.diffuse_color;shader.inputs['Roughness'].default_value=.85
    mesh.materials.append(mat)
    for p in mesh.polygons:p.use_smooth=True
    return o

stats={}
for tier in ['normal','ultra']:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(OUT/f'lab-skeleton-v7-{tier}.glb'))
    skulls=[o for o in bpy.context.scene.objects if o.type=='MESH' and region(o)=='skull']
    select(skulls)
    if len(skulls)>1:bpy.ops.object.join()
    skull=bpy.context.object
    bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
    for v in skull.data.vertices:
        p=v.co.copy()
        for side in [-1,1]:
            c=mapped((side*5,-4.9,9.1));q=(p-c)/scale
            w=math.exp(-((q.x/1.65)**2+(q.y/1.6)**2+(q.z/1.4)**2)*1.8)
            # Flatten the bead-like cheek prominence into an oblique malar face.
            v.co.x-=side*.30*scale*w
            v.co.y+=.25*scale*w
            v.co.z+=.20*scale*w
            arch=mapped((side*6.55,-1.6,9.4));r=(p-arch)/scale
            a=math.exp(-((r.x/1.1)**2+(r.y/2.3)**2+(r.z/.95)**2)*1.8)
            v.co.z-=r.z*.22*scale*a
    skull.data.update();bpy.context.view_layer.update()
    lines=sutures(skull,tier)
    select([skull,lines]);bpy.ops.object.join();skull=bpy.context.object
    skull.name='skeleton-skull-v8';skull['skeletonRegion']='skull';skull['anatomyPart']='skeleton'
    skull['sutures']='coronal, sagittal, lambdoid: surface landmarks, not separate bones'
    meshes=[o for o in bpy.context.scene.objects if o.type=='MESH']
    for o in meshes:o.data.calc_loop_triangles()
    path=OUT/f'{PREFIX}-{tier}.glb'
    bpy.ops.export_scene.gltf(filepath=str(path),export_format='GLB',export_extras=True,export_animations=False)
    stats[tier]={'triangles':sum(len(o.data.loop_triangles) for o in meshes),'bytes':path.stat().st_size}

scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=24
scene.render.resolution_x=900;scene.render.resolution_y=900;scene.render.resolution_percentage=100
scene.world=bpy.data.worlds.new('Skull review');scene.world.use_nodes=True
scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.055,.075,.09,1)
scene.world.node_tree.nodes['Background'].inputs[1].default_value=.6
def aim(o,p):o.rotation_euler=(Vector(p)-o.location).to_track_quat('-Z','Y').to_euler()
for loc,power in [((-45,-65,110),38000),((45,-35,75),22000),((0,35,110),30000)]:
    bpy.ops.object.light_add(type='AREA',location=loc);o=bpy.context.object;o.data.energy=power;o.data.size=35;aim(o,(0,0,72))
bpy.ops.object.camera_add(location=(0,-80,74));scene.camera=bpy.context.object;scene.camera.data.type='ORTHO';scene.camera.data.ortho_scale=29
for label,loc in [('front',(0,-80,74)),('quarter',(42,-70,85)),('back',(25,80,90)),('top',(0,-10,150))]:
    scene.camera.location=loc;aim(scene.camera,(0,0,73));scene.render.filepath=str(OUT/f'{PREFIX}-{label}.png');bpy.ops.render.render(write_still=True)
scene.camera.location=(42,-70,85);aim(scene.camera,(0,0,73))
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/f'{PREFIX}.blend'))
bpy.ops.import_scene.gltf(filepath=str(OUT/'lab-head-fitted-v1-ultra.glb'))
scene.render.filepath=str(OUT/f'{PREFIX}-fitted.png');bpy.ops.render.render(write_still=True)
(OUT/f'{PREFIX}-stats.json').write_text(json.dumps(stats,indent=2));print(stats)
