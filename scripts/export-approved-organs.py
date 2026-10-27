"""Export approved review with identical part placement in both tiers."""
import bpy,json
from pathlib import Path
OUT=Path(__file__).resolve().parents[1]/'public/models/local'
stats={}
for tier in ['ultra','normal']:
    bpy.ops.wm.open_mainfile(filepath=str(OUT/'complete-organs-review-v2-colors.blend'))
    for o in list(bpy.context.scene.objects):
        if o.type!='MESH':bpy.data.objects.remove(o,do_unlink=True)
    for o in bpy.context.scene.objects:
        if tier=='normal':
            bpy.context.view_layer.objects.active=o
            mod=o.modifiers.new('Mobile detail reduction','DECIMATE');mod.ratio=.16
            bpy.ops.object.modifier_apply(modifier=mod.name)
        o.data.calc_loop_triangles()
    path=OUT/f'lab-organs-approved-v1-{tier}.glb'
    bpy.ops.export_scene.gltf(filepath=str(path),export_format='GLB',export_extras=True,export_animations=False)
    stats[tier]={'triangles':sum(len(o.data.loop_triangles) for o in bpy.context.scene.objects),'bytes':path.stat().st_size}
(OUT/'lab-organs-approved-v1-stats.json').write_text(json.dumps(stats,indent=2))
print(stats)
