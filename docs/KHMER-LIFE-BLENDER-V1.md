# Khmer Life refinement: first object

The registry has 15 objects. This pass changes only the k'am water pot;
the remaining 14 are unchanged. The original `/models/kaom.glb` is retained.

## Delivered

- Reproducible Blender source: `scripts/build-khmer-pot-v1.py`.
- Editable scene: `public/models/local/khmer-kaom-v1.blend`.
- Normal: 10,656 triangles, 261,212 bytes, two material primitives.
- Ultra: 64,256 triangles, 1,553,408 bytes, two material primitives.
- Separate lid and continuous double-wall vessel; smooth profile, small shape
  irregularities, embedded clay vertex colours and high roughness.
- Same scale and four existing learning points in both tiers.
- New asset uses a simple inspection stage; Normal disables renderer shadows
  and caps DPR at 1. Ultra adds shadows. XR session forces Ultra and restores
  the selected tier on exit. Other Viewer consumers retain their environment.
- Show/hide labels; overview restores the inspection camera.

## Validation and limits

`node scripts/check-khmer-pot.mjs` passes geometry budgets, named parts,
finite bounds and embedded colour checks for both GLBs. Blender render reviewed.
Browser: both detail buttons, show/hide parts and the lid lesson verified.
No physical low-end Android, network-throttling or headset acceptance test yet.
Project typecheck remains blocked by errors in other lab files; no errors were
reported in these changed components.

This is an original illustrative reconstruction, **not a photogrammetric or
historically validated capture**. No external textures were copied. Artisan
review and photographed clay surface references are still needed before calling
it authentic or photoreal. The preserved educational text was not fact-checked
in this mesh pass. Content licence: CC-BY-4.0, CamboVerse Center / NUM.

## Suggested next batches

1. Clay cookstove and mortar/pestle: hollow openings, functional construction.
2. Basket and fish trap: real interlaced strips, simplified Normal weave.
3. Mat/scarf/cake: cloth and leaf folds, baked textures.
4. Instruments, farm tools, cart and house: reference-led joints and materials.

Review each pilot in Blender and browser before applying its approach to a batch.
