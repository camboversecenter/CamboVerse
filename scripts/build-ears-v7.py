"""Versioned ear silhouette pass; retains V6 inner structures and other organs.
Original illustrative geometry, not medically validated anatomy.
"""
import ast, bpy, bmesh, math
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parent
source=ROOT/'build-fitted-head-v1.py'
tree=ast.parse(source.read_text())
tree.body=tree.body[:next(i for i,n in enumerate(tree.body) if isinstance(n,ast.For))]
scope={'__file__':str(source)}
exec(compile(tree,str(source),'exec'),scope)
h=scope['h'];fitted=scope['fitted'];OUT=h.OUT

for tier in ['normal','ultra']:
 bpy.ops.wm.read_factory_settings(use_empty=True)
 bpy.ops.import_scene.gltf(filepath=str(OUT/f'lab-head-fitted-v6-{tier}.glb'))
 # The V6 outer pinna is batched separately by its material.
 for o in list(bpy.context.scene.objects):
  if o.type=='MESH' and o.active_material and o.active_material.name.startswith('Auricular cartilage tissue'):
   bpy.data.objects.remove(o,do_unlink=True)
 h.N=12 if tier=='normal' else 24
 outer=h.material('V7 auricular tissue',(.54,.31,.24),.62)
 before=set(bpy.context.scene.objects)
 for s in [-1,1]:
  # Asymmetric outline: broader superior helix, tapered lower lobe.
  def outline(a,r=1):
   y=math.cos(a);z=math.sin(a)
   width=.78+.20*y
   return (s*(7.34+.50*r*r),9.45+1.72*r*y,.15+width*r*z-.18*r*y)
  verts=[(s*7.34,9.45,.15)];faces=[]
  rings=10 if tier=='normal' else 20;segments=32 if tier=='normal' else 64
  for j in range(1,rings+1):
   r=j/rings
   for i in range(segments):
    a=2*math.pi*i/segments
    x,y,z=outline(a,r)
    # Raised scapha around a depressed central concha.
    x+=s*(.15*math.exp(-((r-.76)/.13)**2)-.10*math.exp(-((r-.35)/.22)**2))
    verts.append((x,y,z))
  for i in range(segments):faces.append((0,1+i,1+(i+1)%segments))
  for j in range(rings-1):
   for i in range(segments):
    a=1+j*segments+i;b=1+j*segments+(i+1)%segments
    faces.append((a,a+segments,b+segments,b))
  o=h.mesh('Shaped pinna',verts,faces,outer)
  bpy.context.view_layer.objects.active=o
  mod=o.modifiers.new('Pinna thickness','SOLIDIFY');mod.thickness=.10
  bpy.ops.object.modifier_apply(modifier=mod.name)
  h.tube('Rolled helix',[outline(i/48*math.pi*2) for i in range(49)],lambda t:.12+.025*math.sin(t*math.pi),outer,48 if tier=='normal' else 96)
  h.tube('Antihelix stem',[(s*7.62,8.45,.05),(s*7.67,9.0,-.24),(s*7.70,9.65,-.3),(s*7.72,10.25,-.15)],.105,outer,24)
  h.tube('Superior crus',[(s*7.70,9.65,-.3),(s*7.73,10.15,.1),(s*7.76,10.65,.22)],.09,outer,20)
  h.tube('Inferior crus',[(s*7.70,9.65,-.3),(s*7.70,9.95,.16),(s*7.70,10.1,.48)],.085,outer,16)
  h.ellipsoid('Tragus',(s*7.50,9.25,.68),(.21,.30,.23),outer)
  h.ellipsoid('Antitragus',(s*7.60,8.70,.25),(.18,.22,.20),outer)
  h.ellipsoid('Soft lobule',(s*7.57,7.95,.18),(.28,.43,.38),outer)
 for o in set(bpy.context.scene.objects)-before:
  if o.type!='MESH':continue
  matrix=o.matrix_world.copy()
  for v in o.data.vertices:v.co=fitted(matrix@v.co)
  o.matrix_world.identity();o['anatomyPart']='ears'
 # Split paired batches by side for a genuine single-ear study view.
 ear_meshes=[]
 for o in list(bpy.context.scene.objects):
  if o.type!='MESH':continue
  p=o
  while not p.get('anatomyPart') and p.parent:p=p.parent
  if p.get('anatomyPart')=='ears':ear_meshes.append(o)
 for o in ear_meshes:
  world=o.matrix_world.copy()
  for sign,side in [(-1,'right'),(1,'left')]:
   copy=o.copy();copy.data=o.data.copy();bpy.context.collection.objects.link(copy)
   copy.parent=None;copy.matrix_world=world
   bm=bmesh.new();bm.from_mesh(copy.data)
   bmesh.ops.delete(bm,geom=[v for v in bm.verts if (world@v.co).x*sign<0],context='VERTS')
   bm.to_mesh(copy.data);bm.free()
   if not copy.data.vertices:bpy.data.objects.remove(copy,do_unlink=True);continue
   copy['anatomyPart']='ears';copy['anatomySide']=side;copy.name=f'ear-{side}-{o.name}'
  bpy.data.objects.remove(o,do_unlink=True)
 bpy.ops.object.select_all(action='SELECT')
 bpy.ops.export_scene.gltf(filepath=str(OUT/f'lab-head-fitted-v7-{tier}.glb'),export_format='GLB',export_extras=True)

# Review single right ear from its lateral surface, with inner components retained.
scene=bpy.context.scene
for o in scene.objects:
 if o.type=='MESH':o.hide_render=o.get('anatomySide')!='right'
points=[o.matrix_world@Vector(c) for o in scene.objects if o.type=='MESH' and not o.hide_render for c in o.bound_box]
lo=Vector([min(p[i] for p in points) for i in range(3)]);hi=Vector([max(p[i] for p in points) for i in range(3)])
target=(lo+hi)/2
scene.render.engine='CYCLES';scene.cycles.samples=16
scene.render.resolution_x=700;scene.render.resolution_y=700;scene.render.resolution_percentage=100
scene.world=bpy.data.worlds.new('Ear studio');scene.world.use_nodes=True
scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.10,.14,.17,1)
for pos,power in [((-25,-15,95),1100),((-15,15,75),850)]:
 bpy.ops.object.light_add(type='AREA',location=pos);o=bpy.context.object;o.data.energy=power;o.data.size=12
 o.rotation_euler=(target-o.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add(location=target+Vector((-16,-7,4)))
scene.camera=bpy.context.object;scene.camera.rotation_euler=(target-scene.camera.location).to_track_quat('-Z','Y').to_euler()
scene.camera.data.type='ORTHO';scene.camera.data.ortho_scale=max(hi-lo)*1.35
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'lab-head-fitted-v7-review.blend'))
scene.render.filepath=str(OUT/'lab-head-fitted-v7-ear.png');bpy.ops.render.render(write_still=True)
