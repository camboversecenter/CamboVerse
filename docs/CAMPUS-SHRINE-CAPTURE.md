# Campus Shrine — conference-hall capture import

The user selected **Buildings → NUM International Campus → Campus Shrine** as
the review location for the Kaggle conference-hall-front output. Opening that
building now displays the photo capture. **Illustrative model** preserves the
existing authored shrine; its **Real 3D capture** button returns to the scan.
The wider campus scene keeps its lightweight authored geometry and does not
load the splat until the building page is entered.

## Source and reproducibility

- Notebook: `camboversecenter/conference-hall-step2b-train-splat`.
- Saved script version: 355602825, checkpoint step-000006999 (7,000 steps).
- Downloaded via Output actions → Download output to
  `C:/Users/PC/Downloads/results (1).zip` (566,737,955 bytes).
- Gaussian export: `export/splat.ply`, 82,122,081 bytes, 331,131 vertices.
- Source SHA-256: `a070a11ea392f8629fa29d9fb28bb2c1ee98d94b63a0f1adf448a6d1c463ba10`.

`scripts/prepare-campus-shrine-capture.py` checks the source hash and binary PLY
layout, converts log scales/SH DC colour/opacity/quaternions to the open 32-byte
antimatter15 splat format, and writes a manifest. All assets live in ignored
`public/models/local/campus-shrine-capture-v1/`. The untouched PLY and source
checkpoint archive remain available. No model training, upload or deployment
was performed for this import.

The original export has substantial cloudy floating points and incomplete roof
detail. Clean view selects a focused cylinder around the visible shrine, caps
large splat axes, and discards low-opacity background fragments. It retains
130,969 points (4.19 MB). Both quality tiers use this same retained set because
it is already below the Normal point budget; Ultra does not invent detail.
Full scan uses 180,000 points in Normal (5.76 MB) or all 331,131 in Ultra
(10.60 MB). The full original is considerably more obstructed by background
floaters. Cleanup cannot restore missing roof geometry or unphotographed views.

Capture creator, capture date, site permissions and content licence are
unconfirmed. Local conversion and placement do not establish a CC-BY licence,
verified architectural identity, surveyed dimensions or publication permission.

## Viewer

The page supports rotation, panning, zooming, Normal/Ultra override, Clean/Full
scan comparison, source information, and returning to the authored model/site.
Camera framing uses X rotation +π/2 and scale 20 with the existing drei renderer;
it is a visual review transform, not a metric measurement. **Walk around** enters
grounded first-person exploration, with **Inspect capture** returning to orbit.
It reuses the clock's WASD/joystick, drag look, Space jump, double-Space flight,
and touch Jump/Fly/Land controls. Walking has a full 360° heading range.
An authored navigation apron protects the pedestal (inner radius 1.85) and
limits travel to the captured vicinity (outer radius 4.6), in relative scene
units. Its ground height −0.78 and slopes 0.006/0.002 approximate the visible
pavement; eye height is 1.25 and speed 1.25. This is a visual fit, not a surveyed
floor or a collision mesh reconstructed from splats. A cheap 192-triangle ground
surface fills missing pavement along the band. Flight and landing reuse the
same bounds/ground as the clock. Blurry and missing source detail remains.
VR uses Ultra and the
selected Clean/Full asset; headset validation remains outstanding.

`src/buildingCapture.test.ts` verifies the building attachment, actual asset
hashes, record sizes, finite data and tier budgets. Browser review checks both
quality tiers, orbit/pan/zoom, Clean/Full scan and capture/model transitions.
Physical low-end Android and 4G performance remain unverified.
