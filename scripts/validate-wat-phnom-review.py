"""Read-only saved-Blender checks for the Wat Phnom v4 review."""
import bpy, hashlib, json, math
from pathlib import Path
from mathutils import Vector

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'output/wat-phnom-review-v4'

def signature(objects):
    h=hashlib.sha256()
    for o in sorted(objects,key=lambda o:o.name):
        h.update(o.name.encode())
        for row in o.matrix_world: h.update(str(tuple(row)).encode())
        for v in o.data.vertices: h.update(str(tuple(v.co)).encode())
        for p in o.data.polygons: h.update(str(tuple(p.vertices)).encode())
    return h.hexdigest()

reports=[]
for tier in ['normal','ultra']:
    report=json.loads((OUT/f'{tier}-report.json').read_text())
    source=ROOT/f'public/models/local/wat-phnom-naga-v3/wat-phnom-{tier}.blend'
    assert hashlib.sha256(source.read_bytes()).hexdigest()==report['sourceSha256']
    bpy.ops.wm.open_mainfile(filepath=str(source))
    retained=[o for o in bpy.context.scene.objects if o.name.startswith('Naga v3 |')]
    old_sig=signature(retained)
    path=OUT/f'wat-phnom-{tier}.blend'
    bpy.ops.wm.open_mainfile(filepath=str(path))
    sc=bpy.context.scene
    retained=[o for o in sc.objects if o.name.startswith('Naga v3 |')]
    assert len(retained)==5
    assert signature(retained)==old_sig==report['stairGeometrySha256']
    assert sc.get('review_only') and sc.get('tier')==tier
    triangles=0; bad=[]
    for o in sc.objects:
        if o.type!='MESH': continue
        for v in o.data.vertices:
            assert all(math.isfinite(c) for c in o.matrix_world@v.co),o.name
        for p in o.data.polygons:
            triangles+=len(p.vertices)-2
            if p.area<1e-12: bad.append((o.name,p.index))
    assert not bad,bad[:10]
    assert triangles==report['triangles']
    def top_levels(name):
        o=bpy.data.objects[name]
        return [(o.matrix_world@p.center).z for p in o.data.polygons if p.normal.z>.99]
    base=top_levels('Stupa stepped square base'); caps=top_levels('Stupa base moulding')
    assert len(base)==len(caps)==4
    assert min(abs(a-b) for a in base for b in caps)>.025, 'Coplanar stupa podium tops'
    # Check entrance physically has a doorway: a ray passes the front plane
    # and reaches the back of the illustrative interior, not a solid facade.
    result=sc.ray_cast(bpy.context.evaluated_depsgraph_get(),Vector((0,-.9,1.35)),Vector((0,1,0)),distance=6)
    assert result[0] and result[4].name=='Sanctuary back',(result[0],result[4].name if result[0] else None)
    assert result[1].y>3.2,tuple(result[1])
    reports.append({'tier':tier,'triangles':triangles,'trees':len(report['trees']),'finiteGeometry':True,'nonzeroFaces':True,'staircaseUnchanged':True,'entranceOpen':True,'sourceUnchanged':True,'stupaCapsSeparated':True,'blendSha256':hashlib.sha256(path.read_bytes()).hexdigest()})
n=json.loads((OUT/'normal-report.json').read_text()); u=json.loads((OUT/'ultra-report.json').read_text())
assert n['trees']==u['trees'],'Tier canopy layout must match'
assert n['triangles']<u['triangles']
assert n['triangles']<100000 and u['triangles']<300000
(OUT/'validation.json').write_text(json.dumps({'passed':True,'tierLayoutParity':True,'reports':reports},indent=2))
print('WAT_PHNOM_REVIEW_VALIDATED',json.dumps(reports))
