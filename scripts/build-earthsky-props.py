"""Original Blender tabletop teaching props. Diagram scales, not planetary maps."""
import bpy,math,json,random,sys
from pathlib import Path
from mathutils import Vector
OUT=Path(__file__).resolve().parents[1]/'public/models/local'
random.seed(42)
def mat(name,rgb,metal=0):
 m=bpy.data.materials.new(name);m.diffuse_color=(*rgb,1);m.use_nodes=True
 p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*rgb,1);p.inputs['Metallic'].default_value=metal;p.inputs['Roughness'].default_value=.4 if metal else .65
 return m
def finish(o,name,m):
 o.name=name;o.data.materials.append(m)
 for p in o.data.polygons:p.use_smooth=True
 return o
def ball(name,r,at,m):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=N*2,ring_count=N,radius=r,location=at)
 return finish(bpy.context.object,name,m)
def cyl(name,r,d,z,m):
 bpy.ops.mesh.primitive_cylinder_add(vertices=N*2,radius=r,depth=d,location=(0,0,z));return finish(bpy.context.object,name,m)
def ring(name,r,z,m,minor=.006):
 bpy.ops.mesh.primitive_torus_add(major_radius=r,minor_radius=minor,major_segments=N*3,minor_segments=6,location=(0,0,z));return finish(bpy.context.object,name,m)
def stand():
 cyl('weighted-base',.22,.055,-.37,steel);cyl('brass-trim',.225,.009,-.338,brass)
 cyl('pedestal',.035,.28,-.19,steel)
def globe(r=.19):
 ball('earth-ocean',r,(0,0,0),ocean)
 # Coordinate grid intentionally avoids fictitious continent outlines.
 for lat in [-60,-30,0,30,60]:
  a=math.radians(lat);ring('latitude',r*math.cos(a),r*math.sin(a),grid,.0018)
 for lon in range(0,180,30):
  o=ring('longitude',r,0,grid,.0018);o.rotation_euler=(math.pi/2,0,math.radians(lon))
def moon(at=(.36,0,0),r=.07):
 o=ball('moon',r,at,stone)
 # Deterministic shallow depressions in the mesh, not geographically mapped.
 craters=[Vector((math.cos(i*2.4)*math.sin(i*1.7),math.sin(i*2.4)*math.sin(i*1.7),math.cos(i*1.7))) for i in range(1,18)]
 for v in o.data.vertices:
  direction=v.co.normalized();depth=sum(.025*math.exp(-((direction-c).length/.16)**2) for c in craters)
  v.co*=1-depth
def build(kind):
 stand()
 if kind in ['globe','moon','tides']:globe(.16 if kind!='globe' else .20)
 if kind=='globe':
  o=ring('meridian-frame',.245,0,brass,.009);o.rotation_euler.x=math.pi/2
 if kind in ['moon','tides']:moon()
 if kind=='tides':
  o=ring('exaggerated-tide-outline',.20,0,water,.007);o.scale.x=1.3
 if kind=='seasons':
  globe(.10)
  pivot=bpy.data.objects.new('tilted-earth',None);bpy.context.collection.objects.link(pivot)
  for o in list(bpy.context.scene.objects):
   if o.name=='earth-ocean' or o.name.startswith(('latitude','longitude')):o.parent=pivot
  pivot.location.x=.38;pivot.rotation_euler.y=math.radians(23.4)
  ball('sun',.12,(0,0,0),sun);ring('orbit-diagram',.38,0,brass,.003)
 if kind=='orrery':
  ball('sun',.13,(0,0,0),sun)
  for i,(r,m) in enumerate(zip([.27,.40,.54,.68],[stone,ochre,ocean,rust])):
   ring('orbit',r,0,brass,.0025)
   pivot=bpy.data.objects.new('orbit-pivot-'+str(i),None);bpy.context.collection.objects.link(pivot)
   o=ball('planet-'+str(i),.03+i*.009,(r,0,0),m);o.parent=pivot
 if kind=='layers':
  # Nested hemisphere shells with visible cross-section disks; illustrative radii.
  for i,(r,m) in enumerate(zip([.24,.225,.17,.09],[stone,rust,ochre,sun])):
   verts=[];faces=[]
   for j in range(N+1):
    p=math.pi*j/N
    for k in range(N*2+1):
     t=math.pi*k/(N*2);verts.append((r*math.sin(p)*math.cos(t),r*math.sin(p)*math.sin(t),r*math.cos(p)))
   row=N*2+1
   for j in range(N):
    for k in range(N*2):a=j*row+k;faces.append((a,a+1,a+row+1,a+row))
   mesh=bpy.data.meshes.new('layer');mesh.from_pydata(verts,[],faces);o=bpy.data.objects.new('layer-'+str(i),mesh);bpy.context.collection.objects.link(o);finish(o,o.name,m)
   bpy.ops.mesh.primitive_circle_add(vertices=N*3,radius=r,fill_type='NGON',location=(0,-.001*i,0),rotation=(math.pi/2,0,0));finish(bpy.context.object,'cut-face-'+str(i),m)

stats_path=OUT/'earthsky-props-v1-stats.json'
stats=json.loads(stats_path.read_text()) if stats_path.exists() else {}
selected=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
for tier in ['normal','ultra']:
 N=12 if tier=='normal' else 32
 for kind in ['orrery','layers','globe','moon','seasons','tides']:
  if selected and kind not in selected:continue
  bpy.ops.wm.read_factory_settings(use_empty=True)
  steel=mat('Satin steel',(.12,.17,.22),.7);brass=mat('Brushed brass',(.48,.30,.09),.65)
  ocean=mat('Ocean blue',(.025,.16,.34));grid=mat('Globe coordinate grid',(.32,.61,.65));water=mat('Tide outline',(.08,.50,.8))
  stone=mat('Rock grey',(.31,.30,.28));ochre=mat('Golden layer',(.7,.4,.10));rust=mat('Rust red',(.39,.10,.045));sun=mat('Sun gold',(.95,.53,.08))
  build(kind)
  meshes=[o for o in bpy.context.scene.objects if o.type=='MESH']
  for o in meshes:o.data.calc_loop_triangles()
  path=OUT/f'earthsky-{kind}-v1-{tier}.glb'
  bpy.ops.export_scene.gltf(filepath=str(path),export_format='GLB',export_extras=True,export_animations=False)
  stats[kind+'-'+tier]={'triangles':sum(len(o.data.loop_triangles) for o in meshes),'bytes':path.stat().st_size}
  if tier=='ultra':
   bpy.ops.wm.save_as_mainfile(filepath=str(OUT/f'earthsky-{kind}-v1.blend'))
   scene=bpy.context.scene;scene.render.engine='BLENDER_EEVEE';scene.render.resolution_x=640;scene.render.resolution_y=640;scene.render.resolution_percentage=100
   scene.world=bpy.data.worlds.new('Studio');scene.world.use_nodes=True;scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.045,.06,.08,1)
   target=Vector((0,0,-.08));bpy.ops.object.camera_add(location=(1,-2,1));cam=bpy.context.object;cam.rotation_euler=(target-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=1.7 if kind=='orrery' else 1.2;scene.camera=cam
   for at,power in [((-2,-3,4),350),((3,-1,2),220)]:
    bpy.ops.object.light_add(type='AREA',location=at);o=bpy.context.object;o.data.energy=power;o.data.size=3;o.rotation_euler=(target-o.location).to_track_quat('-Z','Y').to_euler()
   scene.render.filepath=str(OUT/f'earthsky-{kind}-v1-preview.png')
   bpy.ops.wm.save_as_mainfile(filepath=str(OUT/f'earthsky-{kind}-v1.blend'))
   bpy.ops.render.render(write_still=True)
print(stats);(OUT/'earthsky-props-v1-stats.json').write_text(json.dumps(stats,indent=2))
