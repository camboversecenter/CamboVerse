"""Preserve existing site compositions while refining their meshes in Blender.
Creates editable sources, bevelled Ultra and lower-cost Normal glTFs, plus renders.
Original source files are never overwritten.
"""
import bpy, json
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'public/models/local/heritage-blender-v1'
OUT.mkdir(parents=True,exist_ok=True)
SOURCES={
 'angkor-wat':'local/angkor-wat-v2-ultra.glb',
 # Other sites now use native builders in build-heritage-sites-blender.py;
 # do not overwrite them with legacy meshes.
 'wat-phnom':'local/wat-phnom-v2.glb'
}
report=[]
for site,source in SOURCES.items():
  bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
  src=ROOT/'public/models'/source
  if not src.exists():
    report.append({'site':site,'error':'Source missing: '+str(src)}); continue
  bpy.ops.import_scene.gltf(filepath=str(src))
  meshes=[o for o in bpy.context.scene.objects if o.type=='MESH']
  points=[o.matrix_world@Vector(c) for o in meshes for c in o.bound_box]
  low=Vector(tuple(min(p[i] for p in points) for i in range(3)))
  high=Vector(tuple(max(p[i] for p in points) for i in range(3)))
  span=max(high-low); center=(low+high)*.5
  for o in meshes:
    bpy.context.view_layer.objects.active=o
    # Weld the triangle-soup sources before beveling so seams stay closed.
    bpy.ops.object.select_all(action='DESELECT'); o.select_set(True)
    bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.mesh.remove_doubles(threshold=.00001); bpy.ops.mesh.normals_make_consistent(inside=False)
    bpy.ops.object.mode_set(mode='OBJECT')
    bevel=o.modifiers.new('Subtle worn masonry edges','BEVEL')
    bevel.width=span*.0009; bevel.segments=2; bevel.limit_method='ANGLE'
    bevel.angle_limit=.52
    o['source_model']=source
    o['refinement']='Welded mesh, corrected normals, bevelled stone edges; original vertex colour retained'
  bpy.ops.object.select_all(action='SELECT')
  bpy.ops.wm.save_as_mainfile(filepath=str(OUT/(site+'-ultra.blend')))
  bpy.ops.export_scene.gltf(filepath=str(OUT/(site+'-ultra.glb')),export_format='GLB',use_selection=True,export_apply=True)
  for o in meshes:
    for m in o.modifiers:
      if m.type=='BEVEL': m.show_viewport=False; m.show_render=False
  bpy.ops.wm.save_as_mainfile(filepath=str(OUT/(site+'-normal.blend')))
  bpy.ops.export_scene.gltf(filepath=str(OUT/(site+'-normal.glb')),export_format='GLB',use_selection=True,export_apply=True)
  for o in meshes:
    for m in o.modifiers:
      if m.type=='BEVEL': m.show_viewport=True; m.show_render=True
  bpy.ops.object.light_add(type='AREA',location=center+Vector((span*.4,-span*.5,span)))
  bpy.context.object.data.energy=100*span*span; bpy.context.object.data.size=span*.8
  bpy.ops.object.camera_add(location=center+Vector((span*.9,-span*1.3,span*.8)))
  cam=bpy.context.object; cam.rotation_euler=(center-cam.location).to_track_quat('-Z','Y').to_euler()
  cam.data.type='ORTHO'; cam.data.ortho_scale=span*1.35
  sc=bpy.context.scene; sc.camera=cam; sc.world.color=(.22,.25,.28)
  sc.render.engine='BLENDER_EEVEE'; sc.render.resolution_x=720; sc.render.resolution_y=720; sc.render.resolution_percentage=100
  sc.render.filepath=str(OUT/(site+'-review.png')); bpy.ops.render.render(write_still=True)
  report.append({'site':site,'source':source,'status':'Blender exports generated; visual review pending',
    'normalBytes':(OUT/(site+'-normal.glb')).stat().st_size,'ultraBytes':(OUT/(site+'-ultra.glb')).stat().st_size})
  (OUT/'existing-site-report.json').write_text(json.dumps(report,indent=2))
