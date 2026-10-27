"""Blender re-import QA: three connected forearm/upper-arm bones per side.
Weld duplicated export seam vertices only in this in-memory validation scene.
"""
import bpy,bmesh
from pathlib import Path
OUT=Path(__file__).resolve().parents[1]/'public/models/local'
for tier in ['normal','ultra']:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(OUT/f'lab-skeleton-v10-{tier}.glb'))
    for o in bpy.context.scene.objects:
        if o.type!='MESH':continue
        assert not o.data.validate(),o.name
        rid=o.get('skeletonRegion')
        if rid not in ['left-arm','right-arm']:continue
        bm=bmesh.new();bm.from_mesh(o.data);bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=.0001)
        unseen=set(bm.verts);sizes=[]
        while unseen:
            stack=[unseen.pop()];count=0
            while stack:
                v=stack.pop();count+=1
                for e in v.link_edges:
                    neighbor=e.other_vert(v)
                    if neighbor in unseen:unseen.remove(neighbor);stack.append(neighbor)
            sizes.append(count)
        bm.free();print(tier,rid,'connected components:',sizes)
        assert len(sizes)==3,f'{tier} {rid}: expected humerus, radius, ulna; found {len(sizes)} pieces'
