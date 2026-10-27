"""Rounded illustrative nasal cutaway; preserves every non-nasal V10 mesh."""
import ast, bpy, math
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parent
src=ROOT/'build-fitted-head-v1.py'; tree=ast.parse(src.read_text())
tree.body=tree.body[:next(i for i,n in enumerate(tree.body) if isinstance(n,ast.For))]
scope={'__file__':str(src)};exec(compile(tree,str(src),'exec'),scope)
h=scope['h'];fitted=scope['fitted'];OUT=h.OUT

def surface(name,fn,n,m,mat):
 verts=[fn(j/n,i/m) for j in range(n+1) for i in range(m+1)]
 faces=[]
 for j in range(n):
  for i in range(m):
   a=j*(m+1)+i;faces.append((a,a+1,a+m+2,a+m+1))
 o=h.mesh(name,verts,faces,mat)
 bpy.context.view_layer.objects.active=o
 mod=o.modifiers.new('Mucosal thickness','SOLIDIFY');mod.thickness=.065
 bpy.ops.object.modifier_apply(modifier=mod.name)
 return o

for tier in ['normal','ultra']:
 bpy.ops.wm.read_factory_settings(use_empty=True)
 bpy.ops.import_scene.gltf(filepath=str(OUT/f'lab-head-fitted-v10-{tier}.glb'))
 remove=[]
 for o in bpy.context.scene.objects:
  p=o
  while not p.get('anatomyPart') and p.parent:p=p.parent
  if o.type=='MESH' and p.get('anatomyPart')=='nose':remove.append(o)
 for o in remove:bpy.data.objects.remove(o,do_unlink=True)
 before=set(bpy.context.scene.objects);h.N=10 if tier=='normal' else 20
 n=12 if tier=='normal' else 28;m=8 if tier=='normal' else 16
 mucosa=h.material('Nasal lining V11',(.48,.20,.18),.72)
 septal=h.material('Septal lining V11',(.62,.34,.30),.72)
 olfactory=h.material('Olfactory region V11',(.66,.48,.22),.75)
 h.ellipsoid('Rounded septum',(0,8.62,5.2),(.115,1.55,1.25),septal)
 for s in [-1,1]:
  # Curved posterior wall: front half intentionally removed for teaching.
  surface('Posterior lateral wall',lambda t,u:(s*(.92+.18*math.sin(math.pi*t)*math.sin(math.pi*u)),7.23+2.88*t,4.05+1.12*u*math.sin(math.pi*t)**.35),n,m,mucosa)
  h.ellipsoid('Nasal floor',(s*.57,7.24,5.25),(.55,.12,1.23),mucosa)
  for k in range(3):
   y=7.82+k*.73;length=2.03-k*.36
   # Tapered, rolled shelves instead of constant-width rectangular plates.
   def shelf(t,u,s=s,y=y,length=length,k=k):
    a=u*math.pi*1.16;bulge=math.sin(math.pi*t)**.55
    return (s*(1.02-(.49-.045*k)*math.sin(a)*bulge),y+(.23-.025*k)*math.cos(a)*bulge,4.17+length*t)
   surface(['Inferior','Middle','Superior'][k]+' curved turbinate',shelf,n,m,mucosa)
  h.ellipsoid('Olfactory roof patch',(s*.40,9.95,4.77),(.27,.12,.52),olfactory)
  h.tube('Rounded vestibule edge',[(s*.24,7.28,6.23),(s*.48,7.11,6.48),(s*.86,7.22,6.38),(s*1.0,7.52,6.1)],.10,mucosa,n)
 new=[o for o in set(bpy.context.scene.objects)-before if o.type=='MESH']
 for o in new:
  matrix=o.matrix_world.copy()
  for v in o.data.vertices:v.co=fitted(matrix@v.co)
  o.matrix_world.identity();o['anatomyPart']='nose'
 batches=[[o for o in new if o.active_material==mat] for mat in [mucosa,septal,olfactory]]
 for batch in batches:
  bpy.ops.object.select_all(action='DESELECT')
  for o in batch:o.select_set(True)
  bpy.context.view_layer.objects.active=batch[0];bpy.ops.object.join()
  bpy.context.object['anatomyPart']='nose'
 bpy.ops.object.select_all(action='SELECT')
 bpy.ops.export_scene.gltf(filepath=str(OUT/f'lab-head-fitted-v11-{tier}.glb'),export_format='GLB',export_extras=True)

for o in bpy.context.scene.objects:
 p=o
 while not p.get('anatomyPart') and p.parent:p=p.parent
 o.hide_render=p.get('anatomyPart')!='nose'
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=24
scene.render.resolution_x=800;scene.render.resolution_y=700;scene.render.resolution_percentage=100
scene.world=bpy.data.worlds.new('Nose studio');scene.world.use_nodes=True
scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.13,.17,.20,1)
target=fitted(h.xyz((0,8.6,5.2)))
for delta in [(6,-12,10),(-8,-4,4)]:
 bpy.ops.object.light_add(type='AREA',location=target+Vector(delta));o=bpy.context.object
 o.data.energy=700;o.data.size=8;o.rotation_euler=(target-o.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add(location=target+Vector((6,-10,3)));scene.camera=bpy.context.object
scene.camera.rotation_euler=(target-scene.camera.location).to_track_quat('-Z','Y').to_euler()
scene.camera.data.type='ORTHO';scene.camera.data.ortho_scale=5.6
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'lab-head-fitted-v11-review.blend'))
scene.render.filepath=str(OUT/'lab-head-fitted-v11-nose.png');bpy.ops.render.render(write_still=True)
for p in [(0,8.6,6.35),(.65,8.55,5.3),(.4,9.95,4.77)]:
 q=fitted(h.xyz(p));print('NOSE_ANCHOR',list((q.x,q.z,-q.y)))
