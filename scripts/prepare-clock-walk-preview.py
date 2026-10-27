"""Local, reversible clock crop. Original Kaggle exports stay untouched.
Run with Python + numpy from the repository root; no training or image uploads.
"""
from pathlib import Path
import hashlib
import json
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'public/models/local/wat-phnom-clock-preview-v1/wat-phnom-clock-ultra.splat'
OUT = ROOT / 'public/models/local/clock-walk-clean-v1'
DTYPE = np.dtype([('xyz', '<f4', (3,)), ('scale', '<f4', (3,)),
                  ('rgba', 'u1', (4,)), ('rotation', 'u1', (4,))])

def main():
    raw = SOURCE.read_bytes()
    assert hashlib.sha256(raw).hexdigest() == 'e49c19993e99c433aaa62cb69c12f782e60793beed6e5bf149c803efdb24ada3'
    points = np.frombuffer(raw, dtype=DTYPE)
    xyz = points['xyz']
    radius = np.hypot(xyz[:, 0] + .03, xyz[:, 1] - .05)
    # Keep the clock/fence and low surrounding pavement, omit floating park
    # fragments. At this scale the background is not a complete walkable park.
    keep = ((radius < .88) & (xyz[:, 2] > -.23) & (xyz[:, 2] < .22)
            & (points['scale'].max(axis=1) <= .035))
    selected = points[keep].copy()
    fade = np.clip((.88 - radius[keep]) / .09, 0, 1)
    selected['rgba'][:, 3] = np.rint(selected['rgba'][:, 3] * fade).astype('u1')
    selected = selected[selected['rgba'][:, 3] > 8]
    OUT.mkdir(parents=True, exist_ok=True)
    report = {'source': str(SOURCE), 'source_sha256': hashlib.sha256(raw).hexdigest(),
              'crop': {'center_raw_xy': [-.03, .05], 'radius': .88, 'raw_z': [-.23, .22]}, 'files': {}}
    for tier, limit in [('normal', 180_000), ('ultra', 600_000)]:
        # Uniform deterministic sampling preserves coverage rather than ranking
        # only large splats (the original Normal export loses fine clock marks).
        n = min(limit, len(selected))
        chosen = selected[np.linspace(0, len(selected)-1, n).round().astype(int)].copy()
        chosen['scale'] *= min(1.22, (len(selected)/n)**(1/3))
        path = OUT / f'clean-{tier}.splat'
        data = chosen.tobytes(); path.write_bytes(data)
        report['files'][path.name] = {'splats': n, 'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest()}
    (ROOT / 'output/clock-training-review/walk-cleanup.json').write_text(json.dumps(report, indent=2))
    print(json.dumps(report, indent=2))

if __name__ == '__main__':
    main()
