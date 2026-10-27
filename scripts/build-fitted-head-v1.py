"""Original illustrative head organs registered to the V5 skull, not clinical anatomy."""
import bpy, math, importlib.util
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parent
spec=importlib.util.spec_from_file_location('helpers',ROOT/'build-anatomy-room-v2.py')
h=importlib.util.module_from_spec(spec);spec.loader.exec_module(h)
OUT=h.OUT
def smooth(a,b,x):
 t=max(0,min(1,(x-a)/(b-a)));return t*t*(3-2*t)

# Recover exactly the reference-to-body transform used by export-skeleton-v3.
bpy.ops.wm.open_mainfile(filepath=str(OUT/'skull-review-v3.blend'))
points=[o.matrix_world@Vector(c) for o in bpy.context.scene.objects if o.type=='MESH' for c in o.bound_box]
lo=Vector([min(p[i] for p in points) for i in range(3)])
hi=Vector([max(p[i] for p in points) for i in range(3)])
center=(lo+hi)/2;factor=26/(hi.z-lo.z)
def fitted(p):
 p=(p-center)*factor+h.xyz((0,73,-1))
 x,d,z=p;v=smooth(73,80,z);c=(1-smooth(63,68,z))*smooth(60,62,z)
 return Vector((x*(1-.03*v-.10*c),d+.65*c*smooth(0,7,-d),z-2.8*smooth(74,86,z)))

for tier in ['normal','ultra']:
 bpy.ops.wm.read_factory_settings(use_empty=True);h.N=12 if tier=='normal' else 24
 white=h.material('Sclera',(.78,.76,.68),.42)
 iris=h.material('Iris brown',(.12,.065,.028),.55)
 pupil=h.material('Pupil',(.008,.009,.009),.4)
 tissue=h.material('Oral tissue',(.34,.085,.075),.66)
 cartilage=h.material('Nasal cartilage',(.48,.32,.24),.7)
 nerve=h.material('Nerve and ear structures',(.70,.57,.32),.65)
 def tag(id,fn):
  before=set(bpy.context.scene.objects);fn()
  for o in set(bpy.context.scene.objects)-before:o['anatomyPart']=id
 def eyes():
  for s in [-1,1]:
   h.ellipsoid('Eyeball',(s*3.15,10.8,6.0),(1.3,1.3,1.3),white)
   h.ellipsoid('Iris',(s*3.15,10.8,7.24),(.55,.55,.10),iris)
   h.ellipsoid('Pupil',(s*3.15,10.8,7.33),(.23,.23,.035),pupil)
   h.tube('Optic nerve',[(s*3.15,10.8,5.2),(s*2.6,10.6,3.7),(s*1.3,10.4,2.5)],.22,nerve)
 def nose():
  h.ellipsoid('Septal cartilage',(0,8.6,6.1),(.16,1.5,.85),cartilage)
  for s in [-1,1]:
   h.tube('Nasal passage',[(s*.42,7.3,6.8),(s*.6,8.2,5.8),(s*.55,9.5,5.5)],.2,tissue)
 def ears():
  for s in [-1,1]:
   h.tube('Ear canal',[(s*7.2,9.5,0),(s*6.1,9.5,.1),(s*5.5,9.5,.3)],.28,cartilage)
   pts=[]
   for i in range(55):
    a=i/54*math.pi*3.5;r=.65*(1-i/65)
    pts.append((s*(5.5+r*math.cos(a)),9.1+r*math.sin(a),.5))
   h.tube('Cochlear study spiral',pts,.12,nerve,64)
   for k in range(2):
    h.tube('Semicircular canal',[(s*(5.4+.55*math.cos(a)),10+.65*math.sin(a),-.2+k*.5) for a in [i/24*math.pi*2 for i in range(25)]],.1,nerve,48)
 def mouth():
  h.ellipsoid('Tongue',(0,3.7,3.8),(2.6,.43,1.6),tissue)
  h.ellipsoid('Soft palate',(0,5.7,2.7),(2.1,.28,.8),tissue)
  h.ellipsoid('Uvula',(0,5.15,2.65),(.19,.45,.2),tissue)
 for id,fn in [('eyes',eyes),('nose',nose),('ears',ears),('mouth',mouth)]:tag(id,fn)
 # Bake registration before export: all parts share the skeleton's cm frame.
 for o in list(bpy.context.scene.objects):
  if o.type!='MESH':continue
  matrix=o.matrix_world.copy()
  for v in o.data.vertices:v.co=fitted(matrix@v.co)
  o.matrix_world.identity()
 # Batch by study ID and material, retaining independent selectable groups.
 for id in ['eyes','nose','ears','mouth']:
  meshes=[o for o in bpy.context.scene.objects if o.type=='MESH' and o.get('anatomyPart')==id]
  batches=[[o for o in meshes if o.active_material==mat] for mat in set(o.active_material for o in meshes)]
  for group in batches:
   mat=group[0].active_material
   bpy.ops.object.select_all(action='DESELECT')
   for o in group:o.select_set(True)
   bpy.context.view_layer.objects.active=group[0];bpy.ops.object.join()
   group[0].name=f'{id}-{mat.name}';group[0]['anatomyPart']=id
 bpy.ops.object.select_all(action='SELECT')
 bpy.ops.export_scene.gltf(filepath=str(OUT/f'lab-head-fitted-v1-{tier}.glb'),export_format='GLB',export_extras=True)

# Review organs in the actual skull, not in isolation.
bpy.ops.import_scene.gltf(filepath=str(OUT/'lab-skeleton-head-v5-ultra.glb'))
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=16
scene.render.resolution_x=700;scene.render.resolution_y=800;scene.render.resolution_percentage=100
scene.world=bpy.data.worlds.new('Review');scene.world.use_nodes=True
scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.055,.075,.09,1)
scene.world.node_tree.nodes['Background'].inputs[1].default_value=.6
target=Vector((0,0,72))
def aim(o):o.rotation_euler=(target-o.location).to_track_quat('-Z','Y').to_euler()
for pos,power in [((-30,-40,105),26000),((35,-15,80),13000),((0,30,100),23000)]:
 bpy.ops.object.light_add(type='AREA',location=pos);o=bpy.context.object;o.data.energy=power;o.data.size=25;aim(o)
bpy.ops.object.camera_add(location=(9,-75,76));scene.camera=bpy.context.object;aim(scene.camera)
scene.camera.data.type='ORTHO';scene.camera.data.ortho_scale=31
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'lab-head-fitted-v1-review.blend'))
scene.render.filepath=str(OUT/'lab-head-fitted-v1-preview.png');bpy.ops.render.render(write_still=True)
