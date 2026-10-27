"""Check the native source: approved structures unchanged, both tiers share trees."""
import bpy
import json
import hashlib
import struct
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
OLD=ROOT/'output/preah-vihear-review-v2'
NEW=ROOT/'output/preah-vihear-green-v4'

def fingerprints():
    result={}
    for obj in bpy.context.scene.objects:
        if obj.type!='MESH' or obj.name.startswith(('Ridge | cliff stratum','Mountain v4 |')): continue
        digest=hashlib.sha256()
        for vertex in obj.data.vertices: digest.update(struct.pack('<fff',*vertex.co))
        for row in obj.matrix_world: digest.update(struct.pack('<ffff',*row))
        result[obj.name]=(len(obj.data.polygons),digest.hexdigest())
    return result

for tier in ['normal','ultra']:
    bpy.ops.wm.open_mainfile(filepath=str(OLD/('preah-vihear-'+tier+'.blend')))
    old=fingerprints()
    bpy.ops.wm.open_mainfile(filepath=str(NEW/('preah-vihear-'+tier+'.blend')))
    assert old==fingerprints(),tier+': approved structure changed'
    terrain=bpy.data.objects['Mountain v4 | green summit and forest slopes']
    assert all('Cliff' not in m.name for m in terrain.data.materials)
    grass=bpy.data.materials['Dry plateau'].diffuse_color
    assert grass[1]>grass[0] and grass[1]>grass[2]
    assert min(v.co.z for v in terrain.data.vertices)==-20
    assert max(abs(v.co.x) for v in terrain.data.vertices)>25
    print(tier,'preserved components:',len(old))
report=json.loads((NEW/'build-report.json').read_text())
assert report[0]['treePositions']==report[1]['treePositions']
assert report[0]['newTrees']>=400
assert report[0]['triangles']<65000 and report[0]['bytes']<5*1024*1024
assert all(r['draws']<=12 for r in report)
print('MOUNTAIN_CHECKS_PASSED')
