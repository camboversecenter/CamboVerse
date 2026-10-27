"""Original illustrative mouth refinement; keep V7 ears and other parts intact."""
import ast, bpy
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parent
source=ROOT/'build-fitted-head-v1.py'
tree=ast.parse(source.read_text());tree.body=tree.body[:next(i for i,n in enumerate(tree.body) if isinstance(n,ast.For))]
scope={'__file__':str(source)};exec(compile(tree,str(source),'exec'),scope)
h=scope['h'];fitted=scope['fitted'];OUT=h.OUT
original=ast.parse((ROOT/'build-head-refinement-v4.py').read_text())
assignment=next(n for n in original.body if isinstance(n,ast.Assign) and any(isinstance(t,ast.Name) and t.id=='mouth' for t in n.targets))
# Read the literal mouth function passed to ast.parse, without running the builder.
call=next(n for n in ast.walk(assignment) if isinstance(n,ast.Call) and isinstance(n.func,ast.Attribute) and n.func.attr=='parse')
code=call.args[0].value
code=code.replace("(2.25,.19,1.55),palate)","(2.25,.19,1.55),palate, lambda x,y,z:(x,y+1.2*(1-x*x),z))")
code=code.replace("(2.2,.58,1.8)","(2.2,.68,1.8)")
code=code.replace("h.ellipsoid('Uvula'", "h.ellipsoid('Tongue root',(0,3.75,2.5),(1.65,.78,.80),tissue)\n h.ellipsoid('Floor of mouth',(0,3.02,3.8),(2.18,.24,1.6),palate)\n h.ellipsoid('Uvula'")
exec(code,scope)
for tier in ['normal','ultra']:
 bpy.ops.wm.read_factory_settings(use_empty=True)
 bpy.ops.import_scene.gltf(filepath=str(OUT/f'lab-head-fitted-v7-{tier}.glb'))
 for o in list(bpy.context.scene.objects):
  if o.type!='MESH':continue
  p=o
  while not p.get('anatomyPart') and p.parent:p=p.parent
  if p.get('anatomyPart')=='mouth':bpy.data.objects.remove(o,do_unlink=True)
 scope['tier']=tier;h.N=12 if tier=='normal' else 24
 scope['tissue']=h.material('V8 oral tissue',(.42,.13,.12),.63)
 before=set(bpy.context.scene.objects);scope['mouth']()
 new=[o for o in set(bpy.context.scene.objects)-before if o.type=='MESH']
 for o in new:
  matrix=o.matrix_world.copy()
  for v in o.data.vertices:v.co=fitted(matrix@v.co)
  o.matrix_world.identity();o['anatomyPart']='mouth'
 # Batch materials to keep draw cost bounded.
 batches=[[o for o in new if o.active_material==mat] for mat in set(o.active_material for o in new)]
 for batch in batches:
  bpy.ops.object.select_all(action='DESELECT')
  for o in batch:o.select_set(True)
  bpy.context.view_layer.objects.active=batch[0]
  if len(batch)>1:bpy.ops.object.join()
  batch[0]['anatomyPart']='mouth'
 bpy.ops.object.select_all(action='SELECT')
 bpy.ops.export_scene.gltf(filepath=str(OUT/f'lab-head-fitted-v8-{tier}.glb'),export_format='GLB',export_extras=True)
scene=bpy.context.scene
for o in scene.objects:
 if o.type=='MESH':o.hide_render=o.get('anatomyPart')!='mouth'
pts=[o.matrix_world@Vector(c) for o in scene.objects if o.type=='MESH' and not o.hide_render for c in o.bound_box]
lo=Vector([min(p[i] for p in pts) for i in range(3)]);hi=Vector([max(p[i] for p in pts) for i in range(3)]);target=(lo+hi)/2
scene.render.engine='CYCLES';scene.cycles.samples=16;scene.render.resolution_x=800;scene.render.resolution_y=600;scene.render.resolution_percentage=100
scene.world=bpy.data.worlds.new('Mouth studio');scene.world.use_nodes=True;scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.14,.18,.20,1)
for loc in [(0,-20,85),(15,-5,70)]:
 bpy.ops.object.light_add(type='AREA',location=loc);o=bpy.context.object;o.data.energy=1200;o.data.size=12;o.rotation_euler=(target-o.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add(location=target+Vector((8,-22,7)));scene.camera=bpy.context.object;scene.camera.rotation_euler=(target-scene.camera.location).to_track_quat('-Z','Y').to_euler();scene.camera.data.type='ORTHO';scene.camera.data.ortho_scale=max(hi-lo)*1.35
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'lab-head-fitted-v8-review.blend'))
scene.render.filepath=str(OUT/'lab-head-fitted-v8-mouth.png');bpy.ops.render.render(write_still=True)
