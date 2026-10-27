# Approved skull/pelvis integration

The user approved the V3 Blender shape review. `export-skeleton-v3.py` appends
the actual meshes from those saved review scenes, preserving their proportions
with uniform scaling, and replaces the corresponding old skeleton geometry.
The approved review sources and V2 GLBs are not overwritten.

Additional refinements: fuller vertebral bodies, intervertebral discs, sloping
rib sweeps, proximal femoral necks/trochanters and distal femoral/humeral contours.
These remain schematic; hands, feet and detailed joint anatomy need further work.

Local outputs: `lab-skeleton-v3.blend`, `lab-skeleton-v3-{normal,ultra}.glb`,
`lab-skeleton-v3-preview.png`, `lab-skeleton-v3-stats.json`, all in
`public/models/local`. LabSkeletonPilot now requests the versioned V3 GLBs.
This affects skeleton-only and skeleton+organs in the Biology room; skin,
organs, muscles and separate head-specimen views are unchanged.

## Checks

- Normal: 31,996 triangles, 769,944 bytes, three material draw primitives.
- Ultra: 189,998 triangles, 5,252,764 bytes, three material draw primitives.
- `node scripts/check-anatomy-room-v2.mjs --skeleton-v3` passes part-ID, geometry,
  coordinate-scale and budget checks for both skeleton tiers and existing viscera.
- Eight biology interaction state tests pass.
- Blender assembled render reviewed. Browser skeleton visually checked in both
  Normal and Ultra. No physical headset/low-end-phone performance measurement.
- Skeleton remains one selectable learning group; no claim of individual bone
  lessons or validated 206-bone coverage.
- Full-project typecheck still reports existing chemistry ExperienceRoom errors;
  this integration does not modify those components.
