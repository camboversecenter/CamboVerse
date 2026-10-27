"""Add study-only dentition to V9; original illustrative adult crowns, no roots."""
import ast, bpy, math
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parent
src=ROOT/'build-fitted-head-v1.py';tree=ast.parse(src.read_text());tree.body=tree.body[:next(i for i,n in enumerate(tree.body) if isinstance(n,ast.For))]
scope={'__file__':str(src)};exec(compile(tree,str(src),'exec'),scope)
h=scope['h'];fitted=scope['fitted'];OUT=h.OUT
defs=ast.parse((ROOT/'build-skeleton-v7.py').read_text())
exec(compile(ast.Module(body=[n for n in defs.body if isinstance(n,ast.FunctionDef)],type_ignores=[]),'dental-helpers','exec'),globals())
for tier in ['normal','ultra']:
 bpy.ops.wm.read_factory_settings(use_empty=True)
 bpy.ops.import_scene.gltf(filepath=str(OUT/f'lab-head-fitted-v9-{tier}.glb'))
 h.N=10 if tier=='normal' else 20
 enamel=h.material('Study enamel',(.86,.81,.67),.4);gum=h.material('Study gingiva',(.48,.16,.17),.65)
 before=set(bpy.context.scene.objects)
 for upper in [True,False]:
  for side in [-1,1]:
   for i,(a,kind) in enumerate(zip([.105,.31,.52,.73,.94,1.15,1.34,1.52],['incisor','incisor','canine','premolar','premolar','molar','molar','molar'])):
    crown(f'Study tooth {upper}-{side}-{i}',math.pi/2+side*a,upper,kind,enamel,tier)
  h.tube('Upper gums' if upper else 'Lower gums',[(3.8*math.cos(i/48*math.pi),5.05 if upper else 2.65,1.1+5.4*math.sin(i/48*math.pi)) for i in range(49)],.32,gum,48 if tier=='normal' else 96)
 new=[o for o in set(bpy.context.scene.objects)-before if o.type=='MESH']
 for o in new:
  matrix=o.matrix_world.copy()
  for v in o.data.vertices:v.co=fitted(matrix@v.co)
  o.matrix_world.identity();o['anatomyPart']='mouth';o['studyDentition']=True
 batches=[[o for o in new if o.active_material==mat] for mat in [enamel,gum]]
 for batch in batches:
  select(batch);bpy.ops.object.join();batch[0]['anatomyPart']='mouth';batch[0]['studyDentition']=True
 bpy.ops.object.select_all(action='SELECT')
 bpy.ops.export_scene.gltf(filepath=str(OUT/f'lab-head-fitted-v10-{tier}.glb'),export_format='GLB',export_extras=True)
# Reuse the V9 studio without its meshes.
meshes=[o for o in bpy.context.scene.objects if o.type=='MESH']
for o in meshes:
 p=o
 while not p.get('anatomyPart') and p.parent:p=p.parent
 o.hide_render=p.get('anatomyPart')!='mouth'
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=16
scene.render.resolution_x=800;scene.render.resolution_y=600;scene.render.resolution_percentage=100
scene.world=bpy.data.worlds.new('Dental studio');scene.world.use_nodes=True;scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.16,.20,.23,1)
target=Vector((0,-3,65))
for loc in [(0,-20,85),(15,-5,70)]:
 bpy.ops.object.light_add(type='AREA',location=loc);o=bpy.context.object;o.data.energy=1200;o.data.size=12;o.rotation_euler=(target-o.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add(location=target+Vector((8,-22,7)));scene.camera=bpy.context.object;scene.camera.rotation_euler=(target-scene.camera.location).to_track_quat('-Z','Y').to_euler();scene.camera.data.type='ORTHO';scene.camera.data.ortho_scale=19
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'lab-head-fitted-v10-review.blend'))
scene.render.filepath=str(OUT/'lab-head-fitted-v10-mouth.png');bpy.ops.render.render(write_still=True)
