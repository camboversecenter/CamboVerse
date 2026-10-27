# Virtual Farm — Blender visual upgrade

Local review update, 23 October 2026. Original stylized illustration, not a
photoreal capture or surveyed Cambodian farm. No photographs or external
textures are embedded. This does not expand the heritage archive milestone.

## Changes

- Raised timber house and granary with gabled roofs, veranda, stairs, openings,
  planking, roof ridges, hammock and jar.
- Buffalo with curved horns, ears, muzzle, eyes, split hooves, tail and plough;
  a farmer with separate limbs and a broad woven hat.
- Root-anchored rice clumps with curved leaves and drooping grain heads.
  Nursery, transplantation, growth and harvested stubble follow lesson state.
- Neighboring paddies, fan palms, banana foliage, broadleaf trees, canal,
  footbridge, dirt paths and fence. Dike joins avoid coplanar overlapping tops.
- Warmer lighting, wider overview and quieter patch markers. Simple geometry
  remains available while assets load or if loading fails.

## Modes and budgets

Both assets contain the same landmarks and positions. Normal reduces geometry;
Ultra adds detail. VR uses Ultra. Normal has no renderer shadows or ambient
motion; no post-processing was added. Existing DPR limits remain unchanged.

| Component | Normal triangles | Ultra triangles | Draw calls |
|---|---:|---:|---:|
| Environment | 15,708 | 33,964 | 11 |
| Buffalo | 2,202 | 5,972 | 4 |
| Farmer | 548 | 1,420 | 4 |
| Rice prototype | 114 | 220 | 1 instanced |
| Grain prototype | 96 | 288 | 1 instanced |

Downloads are approximately 0.50 MiB Normal and 0.99 MiB Ultra. There are 484
maximum clumps, not 484 draw calls. Full mature-field geometry is approximately
118k / 281k triangles including environment and farmer. Dynamic dikes, markers,
sheaves and sacks add geometry/draw calls; Ultra shadow passes add rendering
cost. These are budgets, not measured phone frame rates.

## Source and reproducibility

- Generator: `scripts/build-farm-visuals.py` (uses primitive helpers from
  `scripts/refine-oudong.py`). Code follows the repository Apache-2.0 license.
- Shared layout: `src/farmVisualLayout.json`.
- Runtime: `src/components/FarmModels.tsx`, `src/farmAppearance.ts`, `FarmView.tsx`.
- Original generated models and renders: CC-BY-4.0; attribution:
  "CamboVerse — Virtual Farm illustration".
- Local assets: `public/models/local/farm-visuals-v3/farm-{normal,ultra}.glb`.
- Review sources, renders and hash/geometry reports: `output/farm-visuals-v3/`.

Run Blender 5.2 in background with `--python scripts/build-farm-visuals.py --
--normal`, then `--ultra`. Add `--no-render` to export assets/reports without
rendering previews. Assets use glTF 2.0 and bundled Meshopt decoding, with no
additional runtime dependency. Local model paths are ignored by Git; deployment
must explicitly package generated assets. Nothing was published in this update.

## Verification and limitations

Tests decode both actual compressed GLBs using the runtime's bundled decoder;
check hashes, geometry budgets, finite coordinates, index bounds, root anchors,
required components, shared-material vertex colors and no embedded images.
Pure state tests check nursery/patch planting, grain removal and cut stubble.
Final regression: 209 tests passed across 38 files. TypeScript and production
build passed; Vite still reports the existing large application-chunk warning.
Blender renders were inspected; they are asset previews, not browser screenshots.
Browser access was unavailable in this session, so in-app rendering, pointer/XR
interactions and real low-end Android/4G performance still need hands-on review.
The generated illustration and inherited Khmer content need local cultural review.
