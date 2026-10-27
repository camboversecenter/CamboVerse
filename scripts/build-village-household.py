"""Original household study props. CC-BY-4.0 CamboVerse contributors."""
import bpy, math
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'public/models/village'
for tier in ('normal','ultra'):
 n=20 if tier=='normal' else 48
 for kind,profile in {
  'water-jar':[(0,0),(.27,0),(.36,.12),(.39,.4),(.29,.66),(.18,.73),(.18,.77),(.15,.77),(.15,.72),(.26,.64),(.35,.4),(.32,.12),(0,.05)],
  'basket-study':[(0,0),(.28,0),(.38,.38),(.36,.4),(.34,.37),(.25,.04),(0,.04)],
  'cooking-pot':[(0,0),(.24,0),(.34,.15),(.32,.32),(.23,.38),(.23,.42),(.20,.42),(.20,.37),(.28,.3),(.29,.15),(.20,.04),(0,.04)],
  'winnowing-tray':[(0,0),(.46,0),(.49,.06),(.48,.09),(.45,.04),(0,.025)],
  'mortar-study':[(0,0),(.19,0),(.23,.12),(.25,.36),(.20,.39),(.16,.29),(.10,.13),(0,.12)]
 }.items():
  bpy.ops.wm.read_factory_settings(use_empty=True)
  verts=[(r*math.cos(i*2*math.pi/n),r*math.sin(i*2*math.pi/n),z) for r,z in profile for i in range(n)]
  faces=[(j*n+i,j*n+(i+1)%n,(j+1)*n+(i+1)%n,(j+1)*n+i) for j in range(len(profile)-1) for i in range(n)]
  mesh=bpy.data.meshes.new(kind);mesh.from_pydata(verts,[],faces);mesh.update()
  obj=bpy.data.objects.new(kind,mesh);bpy.context.collection.objects.link(obj)
  mat=bpy.data.materials.new('natural-material');mat.diffuse_color=(*((.34,.16,.07) if kind in ('water-jar','cooking-pot') else (.48,.30,.12)),1);mat.use_nodes=True
  bs=mat.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=mat.diffuse_color;bs.inputs['Roughness'].default_value=.85
  mesh.materials.append(mat)
  for p in mesh.polygons:p.use_smooth=True
  bpy.ops.export_scene.gltf(filepath=str(OUT/f'{kind}-{tier}.glb'),export_format='GLB')
  if tier=='ultra':bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/f'assets/village/{kind}.blend'))
