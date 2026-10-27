"""Read-only validation of editable sources, including compressed .blend files."""
import bpy
from pathlib import Path

root = Path(__file__).resolve().parents[1]
import json
sites = json.loads((root / 'scripts/heritage-blender-worklist.json').read_text())['sites']
for site in sites:
    for tier in ('normal', 'ultra'):
        path = root / 'public/models/local/heritage-blender-v1' / f'{site}-{tier}.blend'
        bpy.ops.wm.open_mainfile(filepath=str(path))
        meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH']
        assert meshes and all(len(o.data.vertices) for o in meshes), path
        assert any(o.data.materials for o in meshes), path
        print(f'SOURCE_OK {site} {tier} {len(meshes)} mesh objects', flush=True)
print('ALL_30_BLENDER_SOURCES_OPENED', flush=True)
