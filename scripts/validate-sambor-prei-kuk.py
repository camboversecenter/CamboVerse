"""Independently reopen both review sources and check geometry, tier parity and entrances."""
import bpy, json, hashlib, math
from pathlib import Path
from mathutils import Vector
root=Path(__file__).resolve().parents[1]
out=root/'output/sambor-prei-kuk-review-v2'
results=[]
reports=[json.loads((out/(t+'-report.json')).read_text()) for t in ['normal','ultra']]
assert reports[0]['towers']==reports[1]['towers']
assert reports[0]['trees']==reports[1]['trees']==190
assert reports[0]['triangles']<reports[1]['triangles']
for tier in ['normal','ultra']:
    path=out/('sambor-prei-kuk-'+tier+'.blend')
    bpy.ops.wm.open_mainfile(filepath=str(path))
    sc=bpy.context.scene; assert sc['review_only']
    meshes=[o for o in sc.objects if o.type=='MESH']
    assert all(math.isfinite(c) for o in meshes for v in o.data.vertices for c in v.co)
    assert all(len(p.vertices)>=3 and p.area>0 for o in meshes for p in o.data.polygons)
    deps=bpy.context.evaluated_depsgraph_get()
    # The main entrance must be a genuine opening, with a back wall behind it.
    hit,p,_,_,obj,_=sc.ray_cast(deps,Vector((0,-9,2.4)),Vector((0,1,0)))
    assert hit and p.y>0, ('Entrance blocked',tuple(p),obj.name if obj else None)
    # The same ray offset into the front wall must hit masonry.
    hit,p,_,_,obj,_=sc.ray_cast(deps,Vector((3,-9,2.4)),Vector((0,1,0)))
    assert hit and p.y<0 and 'brick shell' in obj.name
    assert not any(im.source=='FILE' for im in bpy.data.images), 'No reference-photo textures allowed'
    tri=sum(len(p.vertices)-2 for o in meshes for p in o.data.polygons)
    assert tri==next(r['triangles'] for r in reports if r['tier']==tier)
    results.append({'tier':tier,'triangles':tri,'entranceOpen':True,'finiteGeometry':True,'nonzeroFaces':True,'sha256':hashlib.sha256(path.read_bytes()).hexdigest()})
(out/'validation.json').write_text(json.dumps(results,indent=2))
print('PASS: both tiers, matching landmarks, open entrance, finite geometry, no photo textures')
