# CamboVerse colour-by-day mannequin

Original Blender-authored interpretive sampot/sbai display. Credit: CamboVerse
Center, National University of Management. Original garments and pose adaptation:
CC-BY-4.0. The underlying MakeHuman hm08 body is CC0-1.0 (see `LICENSE-BODY.md`).

These are authored models, not photogrammetric captures or authoritative costume
reconstructions. Source and visual references: `docs/FASHION-DAY-REFERENCES.md`.
Regeneration: `scripts/build-fashion-day-blender.py` with Blender 5.2 and the pinned
MakeHuman source named in that document.

Normal and Ultra have the same pieces and palette support; only geometry density
differs. `fashion-day-v2.stats.json` records the actual exported geometry and file
sizes. The viewer tints the material whose name starts with `day-fabric`.

V2 uses the palms-together pose requested after review of V1. V1 remains available
as the previous authoring revision; the viewer loads only the V2 paths.
