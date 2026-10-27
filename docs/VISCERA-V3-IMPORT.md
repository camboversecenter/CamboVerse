# Local organ refinement batch V3

Blender source and exports are in `public/models/local`:
`lab-viscera-v3.blend`, `lab-viscera-v3-{normal,ultra}.glb`,
`lab-viscera-v3-preview.png`, and `lab-viscera-v3-stats.json`.
Regenerate with Blender running `scripts/build-viscera-v3.py`.

## Scope

- Reshaped five groups: small intestine, stomach, liver, kidneys and pancreas.
- Retained the other ten organ groups; they were re-exported, not newly sculpted.
- Added subtle vertex-color variation, preserved all fifteen learning-part IDs.
- Room and individual organ detail views now use the shared ReviewedOrgan loader.
- Skeleton detail and standalone body frame use the approved skeleton V3 export.
- Previous Blender scenes and GLB versions remain available.
- Skin, muscles, separate head anatomy and whole-body cutaway geometry are not
  rebuilt by this batch. These models remain schematic, not photorealistic or
  medically validated; further proportion and anatomical-detail work is needed.
- Local development only: these ignored local assets are not a production release.

## Verification

- Normal: 23,984 triangles, 628,664 bytes; Ultra: 72,872 triangles, 1,868,684 bytes.
- Seventeen material draw primitives and fifteen organ IDs in each tier.
- `node scripts/check-anatomy-room-v2.mjs --skeleton-v3 --viscera-v3` passes.
- Eight biology interaction state tests pass.
- Blender abdominal render inspected; stomach selection and detail rendering
  checked in the browser in Normal and Ultra.
- Physical low-end-phone performance and headset testing remain outstanding.
- Full-project typecheck still reports unrelated chemistry and movement errors;
  a clean full-project build is not claimed.
