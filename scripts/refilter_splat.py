"""
refilter_splat.py — tighten quality filters on existing .splat files
without re-training or re-downloading from Kaggle.

antimatter15 .splat format (32 bytes/splat):
  bytes  0-11: position   f32×3
  bytes 12-23: scale      f32×3   (already decoded, NOT log-scale)
  bytes 24-27: color      u8×4    (RGBA; alpha 0-255)
  bytes 28-31: rotation   u8×4

Usage:
  python scripts/refilter_splat.py
"""

from pathlib import Path
import numpy as np

# ── input files ────────────────────────────────────────────────────────────────
# Always read from the pristine 30k originals in Downloads so this script is
# safely re-runnable without degrading the source data.
DOWNLOADS   = Path.home() / "Downloads"
MODELS      = Path(__file__).parent.parent / "public" / "models"

NORMAL_SRC  = DOWNLOADS / "wat-phnom-staircase (1).splat"
ULTRA_SRC   = DOWNLOADS / "wat-phnom-staircase-ultra (1).splat"

NORMAL_DEST = MODELS / "wat-phnom-staircase.splat"
ULTRA_DEST  = MODELS / "wat-phnom-staircase-ultra.splat"

# ── filter parameters ─────────────────────────────────────────────────────────
MAX_SPLAT_AXIS = 0.05   # removes large sky/background Gaussians
MIN_ALPHA      = 0.15   # removes semi-transparent floaters

# Radial crop: Euclidean distance from scene centroid (median of positions).
# From the stats: 90% of scene splats sit within r≈2, outliers go to r≈8.
# r=4.0 removes ~7% of all splats (mostly peripheral floaters) while keeping
# the full staircase, naga balustrades, trees, and temple structure.
RADIAL_CROP    = 1.5

# Per-axis sky crop: Y outliers reach +8.27 (sky above the staircase).
# The staircase geometry tops out around Y~3.5; cut the rest.
MAX_Y          = 4.0

# ── output budgets (unchanged) ─────────────────────────────────────────────────
NORMAL_SPLATS = 180_000
ULTRA_SPLATS  = 600_000

SPLAT_DTYPE = np.dtype([
    ("position", "<f4", 3),
    ("scale",    "<f4", 3),
    ("color",    "u1",  4),
    ("rotation", "u1",  4),
])

def refilter(src: Path, dest: Path, limit: int, label: str) -> None:
    raw = np.frombuffer(src.read_bytes(), dtype=SPLAT_DTYPE)
    print(f"{label}: loaded {len(raw):,} splats from {src.name}")

    scale_max = raw["scale"].max(axis=1)
    alpha     = raw["color"][:, 3].astype(np.float32) / 255.0

    pos      = raw["position"]
    centroid = np.median(pos, axis=0)
    radius   = np.linalg.norm(pos - centroid, axis=1)  # Euclidean

    keep = (
        (scale_max <= MAX_SPLAT_AXIS)
        & (alpha >= MIN_ALPHA)
        & (radius <= RADIAL_CROP)
        & (pos[:, 1] <= MAX_Y)   # Y-axis sky crop
    )
    survivors = raw[keep]
    print(f"  after filter: {keep.sum():,} / {len(raw):,} splats kept "
          f"({keep.mean()*100:.1f}%)")

    # re-rank by opacity × volume proxy (same ordering as the training notebook)
    volume    = np.cbrt(np.maximum(survivors["scale"].prod(axis=1), 1e-18))
    alpha_s   = survivors["color"][:, 3].astype(np.float32) / 255.0
    importance = alpha_s * volume
    order      = np.argsort(-importance)[:limit]

    out = survivors[order]
    dest.write_bytes(out.tobytes())
    size_mb = dest.stat().st_size / 1e6
    print(f"  wrote {len(out):,} splats → {dest.name} ({size_mb:.1f} MB)")

print("=== refilter_splat.py ===")
print(f"MAX_SPLAT_AXIS={MAX_SPLAT_AXIS}  MIN_ALPHA={MIN_ALPHA}  BBOX=±8 units")
print()
refilter(NORMAL_SRC, NORMAL_DEST, NORMAL_SPLATS, "Normal")
print()
refilter(ULTRA_SRC,  ULTRA_DEST,  ULTRA_SPLATS,  "Ultra")
print()
print("Done. Reload splat-preview.html to verify.")
