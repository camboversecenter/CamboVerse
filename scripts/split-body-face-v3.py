"""Separate exterior teaching regions in Blender; not surgical boundaries."""
import bpy, bmesh, json
from mathutils import Vector
from pathlib import Path
OUT=Path(__file__).resolve().parents[1]/'public/models/local'
stats={}
for tier in ('normal','ultra'):
 bpy.ops.wm.read_factory_settings(use_empty=True)
 bpy.ops.import_scene.gltf(filepath=str(OUT/f'lab-body-face-v2-{tier}.glb'))
 skin=next(o for o in bpy.context.scene.objects if o.type=='MESH' and any(m and m.name.startswith('skin') for m in o.data.materials))
 # Cut exact boundaries before separation so web decimation triangles do not
 # leave saw-tooth region edges. Edit-mode bisect preserves shape-key layers.
 bpy.context.view_layer.objects.active=skin;bpy.ops.object.select_all(action='DESELECT');skin.select_set(True)
 inv=skin.matrix_world.inverted()
 for axis,values in [(0,[-6.8,6.8,-2.8,2.8,-1.8,1.8]),(1,[-6.3,-5.5]),(2,[66.8,69,70.1,70.3,76,79])]:
  for value in values:
   point=Vector((0,0,0));point[axis]=value
   normal=Vector((0,0,0));normal[axis]=1
   local_normal=skin.matrix_world.to_3x3().transposed()@normal
   bpy.context.tool_settings.mesh_select_mode=(False,False,True)
   bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='DESELECT');bpy.ops.object.mode_set(mode='OBJECT')
   for p in skin.data.polygons:
    x,y,z=skin.matrix_world@p.center
    p.select=z>64 and abs(x)<10 and y<3
   bpy.ops.object.mode_set(mode='EDIT')
   bpy.ops.mesh.bisect(plane_co=inv@point,plane_no=local_normal,use_fill=False,clear_inner=False,clear_outer=False)
   bpy.ops.object.mode_set(mode='OBJECT')
 # Mesh regions follow existing surface topology; eyes remain whole assemblies.
 for region in ('ear-left','ear-right','nose','mouth'):
  bpy.ops.object.select_all(action='DESELECT');skin.select_set(True);bpy.context.view_layer.objects.active=skin
  bpy.context.tool_settings.mesh_select_mode=(False,False,True)
  bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='DESELECT');bpy.ops.object.mode_set(mode='OBJECT')
  count=0
  for p in skin.data.polygons:
   x,y,z=skin.matrix_world@p.center
   chosen=(x>6.8 and 69<z<79) if region=='ear-left' else (x< -6.8 and 69<z<79) if region=='ear-right' else (abs(x)<1.8 and y< -6.3 and 70.3<z<76) if region=='nose' else (abs(x)<2.8 and y< -5.5 and 66.8<z<70.1)
   p.select=chosen;count+=chosen
  assert count>0,region
  bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.separate(type='SELECTED');bpy.ops.object.mode_set(mode='OBJECT')
  part=next(o for o in bpy.context.selected_objects if o!=skin)
  part.name='face-'+region;part['faceId']=region
 for o in bpy.context.scene.objects:
  if o.type=='MESH' and any(s in o.name for s in ('-eye-','-iris-','-pupil-')):
   o['faceId']='eye-left' if o.name.endswith('-l') else 'eye-right'
 meshes=[o for o in bpy.context.scene.objects if o.type=='MESH']
 for o in meshes:o.data.calc_loop_triangles()
 path=OUT/f'lab-body-face-v3-{tier}.glb'
 bpy.ops.export_scene.gltf(filepath=str(path),export_format='GLB',export_extras=True,export_animations=True)
 stats[tier]={'bytes':path.stat().st_size,'triangles':sum(len(o.data.loop_triangles) for o in meshes)}
 if tier=='ultra':
  scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=12
  scene.render.resolution_x=800;scene.render.resolution_y=700;scene.render.resolution_percentage=100
  scene.world=bpy.data.worlds.new('Review');scene.world.use_nodes=True;scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.16,.18,.22,1)
  def aim(o,p):o.rotation_euler=(Vector(p)-o.location).to_track_quat('-Z','Y').to_euler()
  bpy.ops.object.camera_add(location=(25,-110,78));scene.camera=bpy.context.object;scene.camera.data.type='ORTHO';scene.camera.data.ortho_scale=48;aim(scene.camera,(0,0,74))
  for at in [(-30,-40,100),(30,-30,80)]:
   bpy.ops.object.light_add(type='AREA',location=at);o=bpy.context.object;o.data.energy=26000;o.data.size=30;aim(o,(0,0,74))
  bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'lab-body-face-v3.blend'))
  scene.render.filepath=str(OUT/'lab-body-face-v3-assembled.png');bpy.ops.render.render(write_still=True)
  for o in meshes:
   region=o.get('faceId')
   if region:
    offset={'ear-left':(8,0,0),'ear-right':(-8,0,0),'nose':(0,-8,1),'mouth':(0,-7,-4),'eye-left':(3,-5,0),'eye-right':(-3,-5,0)}[region]
    o.location+=Vector(offset)
  scene.render.filepath=str(OUT/'lab-body-face-v3-separated.png');bpy.ops.render.render(write_still=True)
(OUT/'lab-body-face-v3-stats.json').write_text(json.dumps(stats,indent=2))
print(stats)
