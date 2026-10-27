"""Check actual editable geometry, including the previously buried stairs."""
import bpy
from pathlib import Path
from mathutils import Vector

root = Path(__file__).resolve().parents[1]
for tier in ['normal', 'ultra']:
    bpy.ops.wm.open_mainfile(filepath=str(root / 'output/koh-ker-refined-v2' / f'koh-ker-{tier}.blend'))
    scene = bpy.context.scene
    components = {obj.get('component') for obj in scene.objects if obj.type == 'MESH'}
    assert all(f'Tier {i}' in components for i in range(1, 8))
    deps = bpy.context.evaluated_depsgraph_get()
    hit, position, _, _, obj, _ = scene.ray_cast(deps, Vector((0, 0, 6)), Vector((0, 0, -1)))
    assert hit and position.z < 3.5, 'Summit opening must not be capped'
    # Blender is Z-up; the authored front direction maps to negative Blender Y.
    previous = 0
    for i in range(64):
        top = .08 + 4.03 * (i + 1) / 64
        front = 3.98 - (top - .08) * 2.71 / 4.03
        hit, position, _, _, obj, _ = scene.ray_cast(deps, Vector((0, -front, 6)), Vector((0, 0, -1)))
        assert hit and obj.get('component') == 'Ancient axial stair', (i, obj.name)
        assert abs(position.z - top) < .08, (i, position.z, top)
        assert position.z > previous
        previous = position.z
    print(f'PASS {tier}: seven tiers, open summit, 64 exposed ascending treads')
