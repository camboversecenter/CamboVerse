"""Local-only room SfM test. Original ZIP/photos are never modified.

Run with the bundled Python; pycolmap 4.2.1 is isolated in .codex-tools.
This exports sparse geometry, NOT a textured mesh or a walkable environment.
"""
import argparse
import hashlib
import io
import json
from pathlib import Path
import re
import sys
import time
import zipfile

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / '.codex-tools/room-recon'))
import numpy as np
from PIL import Image, ImageDraw, ImageFont
import pycolmap as pc

SOURCE = Path('D:/Images/360/360 tain.zip')
OUT = ROOT / 'output/room-alignment-v1'
THREADS = 4


def prepare():
    images = OUT / 'images'
    masks = OUT / 'masks'
    images.mkdir(parents=True, exist_ok=True)
    masks.mkdir(parents=True, exist_ok=True)
    manifest = []
    with zipfile.ZipFile(SOURCE) as archive:
        for entry in sorted(archive.infolist(), key=lambda e: e.filename):
            match = re.search(r'_(\d{3})\.jpg$', entry.filename, re.I)
            if not match or not 50 <= int(match[1]) <= 76:
                continue
            number = int(match[1])
            name = Path(entry.filename).name  # Never extract archive paths.
            data = archive.read(entry)
            with Image.open(io.BytesIO(data)) as source:
                size = source.size
                assert size[0] == size[1] * 2
                source.thumbnail((4096, 2048), Image.Resampling.LANCZOS)
                source.convert('RGB').save(images / name, quality=96)
            mask = Image.new('L', (4096, 2048), 255)
            draw = ImageDraw.Draw(mask)
            # Avoid poles/nadir stitching, monopod and severe pole distortion.
            draw.rectangle((0, 0, 4095, 120), fill=0)
            draw.rectangle((0, 1843, 4095, 2047), fill=0)
            # Conservative manual exclusions of the prominent moving person.
            boxes = {50: [(.90, .33, .97, .64)],
                     51: [(.11, .36, .25, .88)],
                     52: [(.22, .12, .49, .96)]}
            for x0, y0, x1, y1 in boxes.get(number, []):
                draw.rectangle((int(x0*4096), int(y0*2048),
                                int(x1*4096), int(y1*2048)), fill=0)
            mask.save(masks / (name + '.png'))
            manifest.append({'name': name, 'sourceEntry': entry.filename,
                             'sourceSize': size, 'workingSize': [4096, 2048],
                             'sourceSha256': hashlib.sha256(data).hexdigest(),
                             'maskedForegroundBoxes': boxes.get(number, [])})
            print('PREPARED', number, flush=True)
    assert len(manifest) == 27, f'Expected 27 panoramas, got {len(manifest)}'
    (OUT / 'inputs.json').write_text(json.dumps(manifest, indent=2), encoding='utf-8')


def align():
    database = OUT / 'database.db'
    pc.set_random_seed(0)
    print('EXTRACTING FEATURES', flush=True)
    pc.extract_features(database, OUT / 'images', camera_mode=pc.CameraMode.SINGLE,
                        reader_options=pc.ImageReaderOptions(
                            camera_model='EQUIRECTANGULAR', mask_path=OUT / 'masks'),
                        extraction_options=pc.FeatureExtractionOptions(
                            use_gpu=False, num_threads=THREADS, max_image_size=4096))
    print('MATCHING ALL 351 PANORAMA PAIRS', flush=True)
    pc.match_exhaustive(database, matching_options=pc.FeatureMatchingOptions(
        use_gpu=False, num_threads=THREADS))
    sparse = OUT / 'sparse'
    sparse.mkdir(exist_ok=True)
    print('MAPPING', flush=True)
    options = pc.IncrementalPipelineOptions(
        num_threads=THREADS, random_seed=0, min_model_size=3,
        ba_refine_focal_length=False, ba_refine_extra_params=False,
        ba_refine_principal_point=False, ba_refine_sensor_from_rig=False,
        max_runtime_seconds=1200)
    options.mapper.num_threads = THREADS
    models = pc.incremental_mapping(database, OUT / 'images', sparse, options)
    print('MODELS', len(models), flush=True)


def summarize():
    inputs = json.loads((OUT / 'inputs.json').read_text(encoding='utf-8'))
    summaries = []
    for model in sorted((OUT / 'sparse').glob('*')):
        if not model.is_dir() or not (model / 'cameras.bin').exists():
            continue
        rec = pc.Reconstruction(model)
        text_dir = model / 'text'
        text_dir.mkdir(exist_ok=True)
        rec.write_text(text_dir)
        rec.export_PLY(model / 'points.ply')
        cameras = sorted([{'name': im.name, 'center': im.projection_center().tolist(),
                           'points3D': im.num_points3D}
                          for im in rec.images.values() if im.has_pose],
                         key=lambda x: x['name'])
        points = list(rec.points3D.values())
        errors = np.array([p.error for p in points])
        tracks = np.array([len(p.track.elements) for p in points])
        summary = {'model': model.name, 'registeredPanoramas': len(cameras),
                   'inputPanoramas': len(inputs), 'points3D': len(points),
                   'meanReprojectionErrorPx': float(errors.mean()) if len(errors) else None,
                   'medianReprojectionErrorPx': float(np.median(errors)) if len(errors) else None,
                   'meanTrackLength': float(tracks.mean()) if len(tracks) else None,
                   'missing': sorted(set(i['name'] for i in inputs) - set(c['name'] for c in cameras)),
                   'cameras': cameras,
                   'scale': 'Arbitrary SfM units: no measured distance supplied',
                   'geometry': 'Sparse point cloud only; not a mesh'}
        summaries.append(summary)
        print(json.dumps(summary), flush=True)
    (OUT / 'results.json').write_text(json.dumps(summaries, indent=2), encoding='utf-8')


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('stage', choices=['prepare', 'align', 'summarize', 'all'])
    args = parser.parse_args()
    for stage, function in [('prepare', prepare), ('align', align), ('summarize', summarize)]:
        if args.stage in [stage, 'all']:
            start = time.time()
            function()
            print(stage, 'elapsed seconds', round(time.time()-start, 2), flush=True)
