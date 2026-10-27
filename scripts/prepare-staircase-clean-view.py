"""Build reversible local staircase derivatives; never modify source captures.

The crop is a presentation boundary, not reconstructed missing geometry.
Normal uses spatial selection from the richer export instead of taking only
the largest Gaussians. It retains the existing 180k record budget.
"""
from pathlib import Path
import hashlib
import json
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
SOURCE = Path.home() / "Downloads/wat-phnom-staircase-ultra (1).splat"
DEST = ROOT / "public/models/local/staircase-clean-v1"
REPORT = ROOT / "output/wat-phnom-walk-review/cleanup-report.json"
DTYPE = np.dtype([("p", "<f4", 3), ("s", "<f4", 3), ("c", "u1", 4), ("q", "u1", 4)])
BUDGET = 180_000


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def world_points(data):
    p = data["p"]
    return np.column_stack([2.5*p[:, 0], 1.2+2.5*p[:, 2], -2.5*p[:, 1]])


def spatial_normal(data):
    """Keep a representative per voxel, then modestly preserve lost coverage.

    Scale compensation is capped at 1.35 to avoid replacing fine detail with
    large blurred blobs. Colour, position and orientation of retained samples
    remain original. The result requires visual comparison, not just a count.
    """
    p = data["p"].astype(np.float64)
    origin = p.min(axis=0)
    lo, hi = 0.0001, 0.05
    for _ in range(15):
        size = (lo+hi)/2
        cells = np.floor((p-origin)/size).astype(np.int32)
        count = len(np.unique(cells, axis=0))
        if count > BUDGET:
            lo = size
        else:
            hi = size
    cells = np.floor((p-origin)/hi).astype(np.int32)
    _, group = np.unique(cells, axis=0, return_inverse=True)
    alpha = data["c"][:, 3].astype(np.float64)/255
    mass = alpha*np.maximum(data["s"].prod(axis=1), 1e-18)
    order = np.lexsort((-mass, group))
    first = np.r_[True, group[order[1:]] != group[order[:-1]]]
    selected = order[first]
    result = data[selected].copy()
    total = np.bincount(group, weights=mass)
    compensation = np.clip(np.cbrt(total[group[selected]]/mass[selected]), 1, 1.35)
    result["s"] *= compensation[:, None]
    importance = result["c"][:, 3]*np.cbrt(result["s"].prod(axis=1))
    result = result[np.argsort(-importance)]
    assert 0 < len(result) <= BUDGET
    return result, {"voxel_size_raw": hi, "scale_compensation_cap": 1.35}


def main():
    DEST.mkdir(parents=True, exist_ok=True)
    data = np.frombuffer(SOURCE.read_bytes(), dtype=DTYPE)
    w = world_points(data)
    finite = np.isfinite(data["p"]).all(axis=1) & np.isfinite(data["s"]).all(axis=1)
    keep = finite & (data["s"].min(axis=1)>0) & (data["s"].max(axis=1)<=0.05)
    keep &= data["c"][:, 3]>=round(0.15*255)
    # World coordinates match the actual drei loader + capture transform.
    keep &= (np.abs(w[:, 0])<=2.15) & (w[:, 1]>=0.76) & (w[:, 1]<=3.4)
    keep &= (w[:, 2]>=-3.6) & (w[:, 2]<=0.65)
    clean = data[keep].copy()
    wc = w[keep]
    fade = np.minimum(np.clip((2.15-np.abs(wc[:, 0]))/0.15, 0, 1),
                      np.minimum(np.clip((wc[:, 2]+3.6)/0.15, 0, 1),
                                 np.clip((0.65-wc[:, 2])/0.10, 0, 1)))
    clean["c"][:, 3] = np.round(clean["c"][:, 3]*fade).astype(np.uint8)
    clean = clean[clean["c"][:, 3]>=8]
    normal, selection = spatial_normal(clean)
    paths = {"normal": DEST/"clean-normal.splat", "ultra": DEST/"clean-ultra.splat"}
    for tier, array in [("normal", normal), ("ultra", clean)]:
        assert np.isfinite(array["p"]).all() and np.isfinite(array["s"]).all()
        paths[tier].write_bytes(array.tobytes())
    report = {
        "source": str(SOURCE), "source_sha256": digest(SOURCE), "source_splats": len(data),
        "world_crop": {"x": [-2.15, 2.15], "y": [0.76, 3.4], "z": [-3.6, 0.65]},
        "max_axis_raw": 0.05, "min_alpha": 0.15, "normal_selection": selection,
        "normal_splats": len(normal), "ultra_splats": len(clean),
        "files": {tier: {"bytes": path.stat().st_size, "sha256": digest(path)} for tier, path in paths.items()},
        "limitation": "Missing rear approach remains missing. Both views allow full 360-degree turning. Cropped regions are empty background; no retraining or invented geometry.",
    }
    REPORT.parent.mkdir(parents=True, exist_ok=True)
    REPORT.write_text(json.dumps(report, indent=2)+"\n")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
