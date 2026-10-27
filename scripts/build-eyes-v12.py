"""Refine paired eye surfaces in Blender, preserving V11 non-eye parts."""
import ast,bpy,math,bmesh
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parent
src=ROOT/'build-fitted-head-v1.py';tree=ast.parse(src.read_text())
tree.body=tree.body[:next(i for i,n in enumerate(tree.body) if isinstance(n,ast.For))]
scope={'__file__':str(src)};exec(compile(tree,str(src),'exec'),scope)
h=scope['h'];fitted=scope['fitted'];OUT=h.OUT
source=ast.parse((ROOT/'build-fitted-head-v3.py').read_text())
code=next(n.value.value.value.args[0].value for n in source.body if isinstance(n,ast.Assign) and any(isinstance(t,ast.Name) and t.id=='eyes' for t in n.targets))
start=code.index('  verts=[];faces=[];n=24')
end=code.index('  # Cheap alpha dome',start)
code=code[:start]+'''
  verts=[];faces=[];n=48 if tier=='normal' else 144
  radii=[.23,.27,.38,.53,.635,.67]
  for j,r in enumerate(radii):
   for i in range(n):
    a=2*math.pi*i/n
    relief=.009*math.sin(a*37)+.006*math.sin(a*61)
    z=6.94+.025*math.sin(j/5*math.pi)+relief*math.sin(j/5*math.pi)
    verts.append((s*3.15+r*math.cos(a),10.8+r*math.sin(a),z))
  for j in range(len(radii)-1):
   for i in range(n):
    a=j*n+i;b=j*n+(i+1)%n;faces.append((a,b,b+n,a+n))
  o=h.mesh('Sculpted radial iris',verts,faces,iris)
  for mat in [fiber,dark]:o.data.materials.append(mat)
  for p in o.data.polygons:
   ring=p.index//n;sector=p.index%n
   p.material_index=2 if ring in [0,4] else (1 if (sector*17)%11<4 else 0)
''' +code[end:]
for tier in ['normal','ultra']:
 bpy.ops.wm.read_factory_settings(use_empty=True)
 bpy.ops.import_scene.gltf(filepath=str(OUT/f'lab-head-fitted-v11-{tier}.glb'))
 remove=[]
 for o in bpy.context.scene.objects:
  p=o
  while not p.get('anatomyPart') and p.parent:p=p.parent
  if o.type=='MESH' and p.get('anatomyPart')=='eyes':remove.append(o)
 for o in remove:bpy.data.objects.remove(o,do_unlink=True)
 before=set(bpy.context.scene.objects);h.N=12 if tier=='normal' else 24
 white=h.material('Warm sclera V12',(.80,.77,.69),.38)
 iris=h.material('Brown iris V12',(.19,.095,.035),.54)
 fiber=h.material('Iris radial fibers V12',(.31,.18,.065),.56)
 dark=h.material('Iris pupil and limbal margins V12',(.055,.030,.016),.53)
 nerve=h.material('Optic nerve V12',(.69,.57,.36),.7)
 exec(code,globals());eyes()
 new=[o for o in set(bpy.context.scene.objects)-before if o.type=='MESH']
 for o in new:
  matrix=o.matrix_world.copy()
  for v in o.data.vertices:v.co=fitted(matrix@v.co)
  o.matrix_world.identity();o['anatomyPart']='eyes'
 bpy.ops.object.select_all(action='SELECT')
 bpy.ops.export_scene.gltf(filepath=str(OUT/f'lab-head-fitted-v12-{tier}.glb'),export_format='GLB',export_extras=True)
for o in bpy.context.scene.objects:
 p=o
 while not p.get('anatomyPart') and p.parent:p=p.parent
 o.hide_render=p.get('anatomyPart')!='eyes'
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=24
scene.render.resolution_x=900;scene.render.resolution_y=550;scene.render.resolution_percentage=100
scene.world=bpy.data.worlds.new('Eye studio');scene.world.use_nodes=True
scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.13,.17,.20,1)
target=fitted(h.xyz((0,10.8,5.88)))
for delta in [(5,-14,8),(-8,-6,3)]:
 bpy.ops.object.light_add(type='AREA',location=target+Vector(delta));o=bpy.context.object
 o.data.energy=700;o.data.size=8;o.rotation_euler=(target-o.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add(location=target+Vector((1,-20,2)));scene.camera=bpy.context.object
scene.camera.rotation_euler=(target-scene.camera.location).to_track_quat('-Z','Y').to_euler()
scene.camera.data.type='ORTHO';scene.camera.data.ortho_scale=12
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'lab-head-fitted-v12-review.blend'))
scene.render.filepath=str(OUT/'lab-head-fitted-v12-eyes.png');bpy.ops.render.render(write_still=True)
# Temporary review cutaway only; exported meshes stay intact.
for o in scene.objects:
 if o.type!='MESH' or o.hide_render or 'nerve' in o.name.lower():continue
 bm=bmesh.new();bm.from_mesh(o.data)
 bmesh.ops.bisect_plane(bm,geom=list(bm.verts)+list(bm.edges)+list(bm.faces),dist=.00001,plane_co=target,plane_no=Vector((0,0,1)),clear_outer=True)
 bm.to_mesh(o.data);bm.free()
scene.camera.location=target+Vector((1,-12,15))
scene.camera.rotation_euler=(target-scene.camera.location).to_track_quat('-Z','Y').to_euler()
scene.render.filepath=str(OUT/'lab-head-fitted-v12-cutaway.png');bpy.ops.render.render(write_still=True)
