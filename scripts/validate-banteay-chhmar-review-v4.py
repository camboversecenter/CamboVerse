"""Validate the saved review file independently; do not change source/model files."""
import bpy, bmesh, hashlib, json
from pathlib import Path

root=Path(__file__).resolve().parents[1]
folder=root/'output/banteay-chhmar-review-v4'
report=json.loads((folder/'review-validation.json').read_text())
source=root/'public/models/local/banteay-chhmar-review-v3/banteay-chhmar-review-v3.blend'
assert hashlib.sha256(source.read_bytes()).hexdigest()==report['source_sha256']
bpy.ops.wm.open_mainfile(filepath=str(folder/'banteay-chhmar-review-v4.blend'))
faces=[o for o in bpy.context.scene.objects if o.type=='MESH' and 'continuous relief' in o.name]
assert len(faces)==16
for obj in faces:
    bm=bmesh.new();bm.from_mesh(obj.data)
    assert all(e.is_manifold for e in bm.edges),obj.name
    assert bm.calc_volume(signed=True)>0,obj.name
    bm.free()
deps=bpy.context.evaluated_depsgraph_get();triangles=0
for obj in bpy.context.scene.objects:
    if obj.type!='MESH':continue
    evaluated=obj.evaluated_get(deps);mesh=evaluated.to_mesh()
    mesh.calc_loop_triangles();triangles+=len(mesh.loop_triangles);evaluated.to_mesh_clear()
assert triangles<report['triangles_before']
report.update(triangles_after=triangles,independent_saved_file_validation=True)
(folder/'review-validation.json').write_text(json.dumps(report,indent=2))
print('PASS: original preserved; 16 closed reliefs; evaluated triangles:',triangles,flush=True)
