"""Export an honest sparse-alignment diagnostic, without inventing room surfaces."""
import json
from pathlib import Path
import sqlite3
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / '.codex-tools/room-recon'))
import numpy as np
from PIL import Image, ImageDraw, ImageFont
import pycolmap as pc

OUT = ROOT / 'output/room-alignment-v1'
FONT = ImageFont.truetype('C:/Windows/Fonts/arial.ttf', 22)
SMALL = ImageFont.truetype('C:/Windows/Fonts/arial.ttf', 15)


def diagnostics():
    results = json.loads((OUT / 'results.json').read_text(encoding='utf-8'))
    with sqlite3.connect(OUT / 'database.db') as db:
        names = dict(db.execute('SELECT image_id,name FROM images'))
        keypoints = dict(db.execute('SELECT image_id,rows FROM keypoints'))
        pairs = []
        for pair_id, count in db.execute('SELECT pair_id,rows FROM two_view_geometries'):
            a, b = pc.pair_id_to_image_pair(pair_id)
            pairs.append({'a': names[a], 'b': names[b], 'inliers': count})
    matched = [p for p in pairs if p['inliers'] >= 30]
    graph = {n: set() for n in names.values()}
    for p in matched:
        graph[p['a']].add(p['b'])
        graph[p['b']].add(p['a'])
    todo = set(graph)
    components = []
    while todo:
        visit = [next(iter(todo))]
        group = set()
        while visit:
            n = visit.pop()
            if n in group:
                continue
            group.add(n)
            visit.extend(graph[n] - group)
        components.append(sorted(group))
        todo -= group
    db_report = {'featureCounts': {names[i]: n for i, n in keypoints.items()},
                 'verifiedPairsAtLeast30Inliers': len(matched),
                 'componentsAt30Inliers': sorted(components, key=len, reverse=True),
                 'pairs': sorted(pairs, key=lambda p: (p['a'], p['b']))}
    (OUT / 'match-diagnostics.json').write_text(json.dumps(db_report, indent=2), encoding='utf-8')

    if not results:
        (OUT / 'REPORT.md').write_text('# Room alignment test\n\nNo sparse model reconstructed. See matching diagnostics. No mesh was generated.\n', encoding='utf-8')
        return
    best = max(results, key=lambda r: r['registeredPanoramas'])
    rec = pc.Reconstruction(OUT / 'sparse' / best['model'])
    pts = np.array([p.xyz for p in rec.points3D.values()])
    colors = np.array([p.color for p in rec.points3D.values()])
    cam = np.array([c['center'] for c in best['cameras']])
    origin = np.median(cam, axis=0)
    _, _, axes = np.linalg.svd(cam - origin)
    points = (pts - origin) @ axes.T
    cameras = (cam - origin) @ axes.T
    camera_diagonal = float(np.linalg.norm(np.ptp(cam, axis=0)))
    distant_count = int(np.sum(np.linalg.norm(pts-origin, axis=1) > 3*camera_diagonal))
    sheet = Image.new('RGB', (1800, 1100), '#131c27')
    d = ImageDraw.Draw(sheet)
    d.text((24, 20), f"ROOM ALIGNMENT | {best['registeredPanoramas']}/27 panorama positions | {len(pts):,} sparse points", font=FONT, fill='white')
    d.text((24, 55), 'Actual reconstructed points and camera path. Not a mesh, measured floor plan, or walkable scene.', font=SMALL, fill='#b7c8db')
    for col, (a, b, label) in enumerate([(0, 1, 'Principal axes 1 / 2'), (0, 2, 'Principal axes 1 / 3'), (1, 2, 'Principal axes 2 / 3')]):
        left = 20 + col*595
        top = 110
        # Focus on the room vicinity, not isolated far-away/background points.
        # The unfiltered raw model is retained and the crop is disclosed.
        margin = .22 * camera_diagonal
        low = cameras[:, [a, b]].min(axis=0) - margin
        high = cameras[:, [a, b]].max(axis=0) + margin
        scale = min(535/max(high[0]-low[0], 1e-6), 800/max(high[1]-low[1], 1e-6))
        offset_x = left+287-(high[0]-low[0])*scale/2
        offset_y = top+460+(high[1]-low[1])*scale/2
        def xy(p):
            return (int(offset_x+(p[a]-low[0])*scale), int(offset_y-(p[b]-low[1])*scale))
        d.rectangle((left, top, left+575, top+875), outline='#415169')
        d.text((left+12, top+10), label, font=FONT, fill='white')
        for p, rgb in zip(points, colors):
            x, y = xy(p)
            if left+4 < x < left+571 and top+45 < y < top+871:
                d.rectangle((x, y, x+1, y+1), fill=tuple(int(c) for c in rgb))
        for i in range(1, len(cameras)):
            d.line((xy(cameras[i-1]), xy(cameras[i])), fill='#61e4bd', width=2)
        for p, c in zip(cameras, best['cameras']):
            x, y = xy(p)
            d.ellipse((x-4, y-4, x+4, y+4), fill='#ffcc62')
            number = Path(c['name']).stem.split('_')[-1]
            d.text((x+5, y-8), number, font=SMALL, fill='#ffdd99')
    d.text((24, 1010), 'Gold: camera positions (photo numbers). Green: capture order. Color dots: sparse scene features.', font=SMALL, fill='#ccd9e8')
    d.text((24, 1040), 'Views focus on the camera-path vicinity; distant points are outside the crop. Raw PLY retains all points. Not to metric scale.', font=SMALL, fill='#ccd9e8')
    sheet.save(OUT / 'alignment-preview.png')
    report = f'''# Room panorama alignment test

## Result

- Registered panoramas: **{best['registeredPanoramas']} / 27** in the largest model.
- Independent sparse models: **{len(results)}**.
- Sparse scene points: **{best['points3D']:,}**.
- Mean reprojection error: **{best['meanReprojectionErrorPx']:.3f} working-image pixels**.
- Median reprojection error: **{best['medianReprojectionErrorPx']:.3f} pixels**.
- Mean observations per point: **{best['meanTrackLength']:.2f}**.
- Photo pairs with at least 30 geometrically verified matches: **{len(matched)} / 351**.
- Unregistered input photos: {', '.join(best['missing']) or 'None'}.
- Points farther than three camera-path bounding diagonals from the median camera: **{distant_count}** (retained in raw model).

## What this proves / does not prove

The registered camera poses and sparse points are an actual photo alignment result. They do not constitute a textured surface, collision geometry, or a walkable room. Successful registration alone does not prove complete coverage or metric accuracy. Residuals measure fit to working photos, not real-world distance error.

The preview uses camera-principal-axis projections focused on the camera-path vicinity, not a surveyed floor plan. Distant points lie outside the preview crop; the raw PLY retains them. Distant points may be exterior features or unstable triangulation, so they need inspection before meshing. Dimensions are arbitrary until a known real-world distance is supplied. Reflective floors/glass, repetitive blinds, people, stitching and unobserved surfaces remain reconstruction risks.

## Inputs and settings

- Source: `D:/Images/360/360 tain.zip`, photos 050–076, all 27 used.
- Original resolution: 11904 × 5952. Working copies: 4096 × 2048.
- Engine: COLMAP / pycolmap {pc.__version__}; native EQUIRECTANGULAR camera; CPU, four threads; seed 0.
- SIFT features, exhaustive pair matching, incremental mapping. Intrinsics fixed.
- Pole/nadir masks plus conservative foreground-person boxes in photos 050–052. Smaller people/reflections are not exhaustively masked.
- Original ZIP and photos untouched; no cloud upload; no archive license assigned to private room photos.

## Outputs and next step

- `alignment-preview.png`: sparse points and camera path diagnostic.
- `sparse/{best['model']}/points.ply`: real sparse point cloud, not a surface mesh.
- `sparse/{best['model']}/`: COLMAP binary model; `text/` contains open text exports.
- `inputs.json`: source SHA-256 and processing manifest.
- `results.json`, `match-diagnostics.json`: detailed alignment and pair results.

Next: inspect dense surface reconstruction feasibility. This installed Windows COLMAP build has no CUDA; its standard dense stereo stage cannot run in this CPU-only setup. A compatible dense reconstruction backend or a GPU environment is needed before a textured mesh and walking can be tested. No model was imported into the website by this alignment step.
'''
    (OUT / 'REPORT.md').write_text(report, encoding='utf-8')
    print(json.dumps({'bestModel': best['model'], 'registered': best['registeredPanoramas'],
                      'points': best['points3D'], 'verifiedPairs': len(matched),
                      'componentsAt30Inliers': [len(c) for c in components]}), flush=True)


if __name__ == '__main__':
    diagnostics()
