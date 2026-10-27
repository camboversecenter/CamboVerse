# Anatomy room Blender mesh pass

Local development pilot only. Existing skin, muscle V4, heart, lung, airway and
brain assets are unchanged. No production deployment or asset publication.

`scripts/build-anatomy-room-v2.py` generates the skeleton and 15 additional organ
groups in Blender, exports Normal/Ultra GLBs, saves editable Blender scenes and
renders review images under `public/models/local`. These files remain ignored.
Previous model versions are preserved.

- Skeleton: twelve rib pairs, costal cartilage, vertebral processes, shoulder and
  pelvic girdles, paired forearm/lower-leg bones, finger/toe segments. The skull
  reuses the original local authored internal-head asset with an added roof.
- Viscera: curved stomach, asymmetric liver, kidney hila, thyroid lobes, bowel
  loops, haustrated colon, gallbladder/duct, pancreas, spleen, diaphragm sheet,
  bladder/ureters, cord and great vessels.
- GLB `anatomyPart` extras preserve selection IDs, including multi-material
  primitives. In-room models and extracted tray models use the same asset.
- Existing detailed specimen pages are **not** switched wholesale to these
  assets. Skeleton remains one selectable group, not individual bone lessons.
- Normal has fewer triangles, no shadows/transmission; no learning part removed.
- VR selects Ultra through the existing room fidelity path. Headset and physical
  low-end-phone performance have not been validated in this pass.

These are still **schematic authored teaching approximations**, not scan-derived,
photorealistic or medically validated models. Pelvic surfaces, cranial structures,
joint articulations and bowel arrangement need further sculpting and expert review.
Do not describe this as a finished anatomy atlas or a complete 206-bone model.

Original generated geometry is project-authored; no third-party mesh was fetched
in this pass. General structural reference (not copied mesh/image):
[OpenStax, Thoracic Cage](https://openstax.org/books/anatomy-and-physiology/pages/7-4-the-thoracic-cage)
and [Pelvic Girdle](https://openstax.org/books/anatomy-and-physiology-2e/pages/8-3-the-pelvic-girdle-and-pelvis).

Checks: `node scripts/check-anatomy-room-v2.mjs`,
`npm test -- src/biologyRoomState.test.ts`, then browser review of layers and
take/rotate/return in both tiers. Full-project typecheck separately reports
unrelated ExperienceRoom/ExperienceRoomScene errors; do not hide these.

## Review results

- Export checks passed: skeleton 28,241 / 264,050 triangles (Normal / Ultra),
  four draw primitives; viscera 23,576 / 70,616 triangles, 17 draw primitives.
- Eight anatomy state tests passed. Browser checked Normal combined view,
  stomach selection/take/rotate, Ultra switch while taken, return, and skeleton.
- Selected information now takes priority over crosshair hover information.
- Entry camera now faces the body rather than the side wall on narrow displays.
- No new anatomy type errors. Chemistry errors still block the full typecheck.
- Browser recorded an opaque Chromium `UnknownError`; no missing-asset or GLB
  loader warning was observed. Physical VR/mobile performance remains untested.
