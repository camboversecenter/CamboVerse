"""Blender-only surface-conforming muscle concept. NO web export or import.
Art study, not validated anatomy. Preserves all existing source models.
"""
import bpy, math
from pathlib import Path
from mathutils import Vector
OUT=Path(__file__).resolve().parents[1]/'public/models/local'
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=str(OUT/'lab-body-makehuman-ultra.glb'))
meshes=[o for o in bpy.context.scene.objects if o.type=='MESH']
body=max(meshes,key=lambda o:len(o.data.vertices))
for o in meshes:
    if o!=body:bpy.data.objects.remove(o,do_unlink=True)
bpy.ops.object.select_all(action='DESELECT');body.select_set(True);bpy.context.view_layer.objects.active=body
bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
if body.data.shape_keys:body.shape_key_clear()

def material(name,color):
    m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True
    p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*color,1);p.inputs['Roughness'].default_value=.57
    return m
base=material('deep-tissue-study',(.19,.045,.033));muscle=material('muscle-bellies',(.39,.10,.065));fiber=material('fine-fibres',(.53,.19,.12))
body.data.materials.clear();body.data.materials.append(base)
for p in body.data.polygons:p.material_index=0
body.name='Proportion-reference-not-validated-muscle-anatomy'

def surface(x,z,side=-1,offset=.12):
    hit,loc,normal,_=body.ray_cast(Vector((x,side*80,z)),Vector((0,-side,0)))
    return loc+normal*offset if hit else None

def patch(name, outline, side=-1):
    # A fan of fine quadrilateral strips conforms to the continuous body.
    cx=sum(p[0] for p in outline)/len(outline);cz=sum(p[1] for p in outline)/len(outline)
    verts=[];faces=[]
    n=len(outline);rings=12
    for r in range(rings+1):
        t=.015+(r/rings)*.985
        for x,z in outline:
            p=surface(cx+(x-cx)*t,cz+(z-cz)*t,side,.16+.28*math.sin(t*math.pi))
            if p is None:return
            verts.append(p)
    for r in range(rings):
        for j in range(n):faces.append((r*n+j,r*n+(j+1)%n,(r+1)*n+(j+1)%n,(r+1)*n+j))
    mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],faces);mesh.materials.append(muscle)
    ob=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(ob)
    for p in mesh.polygons:p.use_smooth=True
    # Fibres across each muscle follow its actual curved surface, not floating tubes.
    low=min(z for x,z in outline);high=max(z for x,z in outline)
    for k in range(1,19):
        z=low+(high-low)*k/19;xs=[]
        for i,(x1,z1) in enumerate(outline):
            x2,z2=outline[(i+1)%n]
            if min(z1,z2)<=z<max(z1,z2):xs.append(x1+(x2-x1)*(z-z1)/(z2-z1))
        if len(xs)<2:continue
        points=[surface(min(xs)+(max(xs)-min(xs))*t/20,z,side,.46) for t in range(21)]
        if any(p is None for p in points):continue
        curve=bpy.data.curves.new(name+'-fibre','CURVE');curve.dimensions='3D';curve.bevel_depth=.035;curve.bevel_resolution=1
        spline=curve.splines.new('POLY');spline.points.add(len(points)-1)
        for p,co in zip(spline.points,points):p.co=(*co,1)
        ob=bpy.data.objects.new(name+'-fibre',curve);bpy.context.collection.objects.link(ob);curve.materials.append(fiber)

for s in [-1,1]:
    def region(name,points,side=-1):patch(name+('-L' if s>0 else '-R'),[(s*x,z) for x,z in points],side)
    region('pectoral',[(.8,44),(8,46),(15,41),(12,34),(1,33)])
    for z in [28,22,16,10]:region('abdominal',[(.7,z+2.4),(5,z+2.2),(5.5,z-2),(.7,z-2.3)])
    region('oblique',[(6.5,28),(12,29),(12,12),(7,5)])
    region('quadriceps',[(4,-15),(11,-16),(12,-31),(9,-44),(6,-37)])
    region('tibialis',[(6.4,-52),(10,-52),(10,-69),(8,-79),(6.5,-70)])
    region('back-latissimus',[(1,40),(12,40),(12,24),(4,9),(1,17)],1)
    region('hamstrings',[(4,-18),(11,-18),(11,-38),(7,-44),(4,-31)],1)

scene=bpy.context.scene;scene.render.engine='BLENDER_EEVEE';scene.world.color=(.17,.17,.17)
for pos,energy in [((90,-170,140),250000),((-100,-30,30),100000)]:
    bpy.ops.object.light_add(type='AREA',location=pos);o=bpy.context.object;o.data.energy=energy;o.data.size=130;o.rotation_euler=(Vector((0,0,5))-o.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add(location=(0,-360,15));cam=bpy.context.object;cam.rotation_euler=(Vector((0,0,5))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=195;scene.camera=cam
scene.render.resolution_x=700;scene.render.resolution_y=950;scene.render.resolution_percentage=100
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'muscles-review-v3.blend'))
scene.render.filepath=str(OUT/'muscles-review-v3-front.png');bpy.ops.render.render(write_still=True)
