# MakeHuman exterior-body pilot

Local development only; production retains the procedural model. No MPFB add-on
was installed. We use the MakeHuman hm08 core mesh directly in Blender, the same
asset ecosystem recommended for the MPFB workflow. No upstream code is executed.

## Provenance

- Creator: MakeHuman community; the mesh credits Data Collection AB, Joel Palmius,
  and Jonas Hauquier.
- Repository: https://github.com/makehumancommunity/makehuman
- Pinned revision: `a8bc2d54ff0ac92e78ff71431b1023eda42bf482`
- File: `makehuman/data/3dobjs/base.obj`
- SHA-256: `8e761e6624b8f54536409135d1636da63b32486a90d4897f84e121d144f6fb4c`
- Asset licence: **CC0 1.0 Universal**, explicitly stated in the OBJ header,
  `LICENSE.md` section C, and `LICENSE.ASSETS.md` at that revision.
- Source files and licence copies: `public/models/local/makehuman-source/`.
- No third-party skin packs, hair, clothing, or scans are included.

## Reproduce

Download `base.obj` plus the two licence files from the pinned revision above into
the source directory. The generator refuses a mesh whose SHA-256 differs.

```powershell
& 'C:\Program Files\Blender Foundation\Blender 5.2\blender.exe' --background --factory-startup --python scripts/generate-lab-body-makehuman.py
node scripts/check-lab-body-pilot.mjs
npm run typecheck
```

The generator is intended only for a fresh background Blender process. It clears
that process's scene. It does not alter any open interactive Blender document.
It exports separately named GLBs, a source blend, stats, and a render into the
git-ignored local folder, preserving the previous handcrafted pilot files.

## Adaptations and limits

- Only the body surface is imported. Joint helpers locate the added eyes but
  are not rendered; genital and other helper meshes are excluded.
- Converted to Blender Z-up before glTF Y-up export; height is approximately
  175 cm, with feet aligned to the existing lab bench.
- Neutral skin material, eyes, and a dark shorts material band. This is a
  detailed base mesh, **not photoreal skin** or a clinical anatomical reference.
- One morph animation expands the chest gently, leaving feet planted.
- Normal: about 13,000 triangles / 371 KB; Ultra: about 43,000 / 1.21 MB.
  Both have six mesh primitives/draw calls, four simple materials, no textures,
  and no transmission. These are uncompressed pilot sizes, not download budgets
  proven on the target phone. Normal does not cast or receive shadows.
- Both tiers expose the same skin selection; organ and skeleton teaching views
  continue to use the existing procedural models and lessons.
- The exterior has not been registered precisely to internal organs. Switching
  inside intentionally uses the original schematic outline. Educator review,
  low-end Android/4G and headset testing remain required before publication.

The smoke test parses both GLBs through Three.js, checks bounds, geometry/draw
budgets and part parity, and evaluates the breathing animation. Visual checks
must additionally cover skin selection and switching layers and quality modes.
