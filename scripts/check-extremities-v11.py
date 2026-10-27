"""Re-import QA for disconnected hand/foot bone count and closed surfaces."""
import bpy,bmesh
from pathlib import Path
OUT=Path(__file__).resolve().parents[1]/'public/models/local'
for tier in ['normal','ultra']:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(OUT/f'lab-skeleton-v11-{tier}.glb'))
    checked=0
    for o in bpy.context.scene.objects:
        if o.type!='MESH':continue
        assert not o.data.validate(),o.name
        if not o.get('boneCount'):continue
        bm=bmesh.new();bm.from_mesh(o.data)
        bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=.0001)
        assert all(e.is_manifold for e in bm.edges),o.name+' has open/nonmanifold edges'
        unseen=set(bm.verts);count=0
        while unseen:
            count+=1;stack=[unseen.pop()]
            while stack:
                v=stack.pop()
                for e in v.link_edges:
                    n=e.other_vert(v)
                    if n in unseen:unseen.remove(n);stack.append(n)
        assert count==o['boneCount'],(o.name,count,o['boneCount'])
        print(tier,o['skeletonRegion'],count,'closed components');bm.free();checked+=1
    assert checked==4
