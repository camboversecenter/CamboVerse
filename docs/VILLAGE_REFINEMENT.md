# Khmer Village refinement plan

## Scope and sequence

Refine the existing educational village prototype without expanding the founding
one-temple milestone. This is an original stylized illustration, not a surveyed
village or an authenticated architectural reconstruction. Khmer terminology and
architectural details require Cambodian reviewer approval before educational claims.

1. Author a reusable Blender kit: raised house with veranda, open doorway,
   shutters, stairs, structural beams, and usable under-house space.
2. Connect plots: dirt road, household paths, courtyards, fences and gates,
   drainage edges, pond banks and rice-field bunds.
3. Refine supporting assets: fan palms, broadleaf trees, water jars, bench,
   baskets, buffalo; preserve all categories in both rendering modes.
4. Refine the existing wat hall and stupa as clearly labeled concept models.
5. Export separate Normal and Ultra GLBs, integrate through a shared instance
   renderer, and preserve editable Blender libraries plus generation sources.
6. Review the browser at narrow and wide sizes, compare modes, verify exports
   and targeted TypeScript diagnostics. Physical low-end Android/4G and headset
   checks remain release requirements, not claims based on desktop testing.

## Asset contract

- Blender source: `assets/village/village-normal.blend`, `village-ultra.blend`.
- Rebuild: Blender in background with `scripts/build-village.py`.
- Runtime: `public/models/village/<asset>-<mode>.glb`, open glTF format.
- Units: metres; Blender Z-up converted to glTF Y-up. Ground-level pivots.
- One vertex-color material per asset; repeated objects rendered with instancing.
- Normal: reduced geometry, no shadows, capped pixel ratio; same content/layout.
- Ultra: more construction and surface detail, shadows; VR forces Ultra.
- Layout and asset placements live separately from rendering/UI code.
- Initial targets: all Normal assets under 1 MB combined; fewer than 80 main-pass
  draw calls. Measure actual figures and record them after export.

## Review gates

- Stairs meet the veranda; house has visible door/window openings.
- Paths reach gates; vegetation stays out of roads, houses, wat and pond.
- Normal/Ultra preserve silhouettes, species, dimensions and learning access.
- Browser loading/failure states remain usable; return to map always available.
- Save the original reference implementation in Git history; no unrelated fixes.
- Before a realism pass: select a documented region/period and licensed reference
  photographs, then request local architectural and cultural review.

## Licensing

Original generated asset content: CC-BY-4.0, attribution “CamboVerse contributors”.
Generator and viewer code: Apache-2.0. No third-party textures or scans used.

## Implemented first pass — 26 September 2026

- Blender-authored kit: house, fence, jar, bench, basket, fan palm, broadleaf tree,
  hall, stupa, buffalo, road with drainage edges, courtyard/path, pond and paddy.
- 28 validated GLBs: 14 asset categories in each of Normal and Ultra.
- Combined model bytes: Normal 516,972; Ultra 1,590,736. These figures exclude
  application JavaScript/fonts and are not a measured 4G loading time.
- Single primitive per GLB; instanced placement uses 14 asset batches plus the
  ground, structurally 15 main-pass draw calls before shadows or loading UI.
- Editable Blender libraries are arranged as an asset grid. The generation
  script retains individually named construction parts before export merging.
- Browser verified: models load, quality switch retains selected viewpoint,
  house/wat/field shortcuts work, return-to-map works. Narrow-screen screenshots
  reviewed; desktop layout exercised, though browser capture scaling limited
  reliable full-size desktop visual inspection.
- Export validation: `node scripts/check-village.mjs` passes. Full TypeScript
  check remains blocked by existing errors in unrelated learning-room files.
- Remaining release gates: physical Android/4G measurements, headset validation,
  architectural references and Cambodian cultural review. Ground-level free
  walking and enterable interiors are not part of this first asset pass.

## Village life and variety pass

- Three Blender house designs distributed across the nine plots: timber,
  wider painted blue-green, and compact timber with side kitchen shelter.
- Both editable libraries and all 32 GLBs regenerated; the validation script
  also checks that each quality tier contains three distinct house exports.
- Additional planting: one broadleaf tree and one palm in every household
  plot, plus twelve roadside palms in the gaps between entrances.
- Seven ambient villagers, two buffalo and four chickens follow bounded loops:
  people on the roads, buffalo beside the fields, chickens in household yards.
  Articulated limbs animate in three instanced primitive batches. These are
  stylized local scene characters, not networked avatars. This is ambient
  movement, not a crowd simulation with collision avoidance between people.
- Day/Night is independent of Normal/Ultra. Night includes moonlight, stars,
  porch lanterns and three local lights with no additional shadow maps.
- Pause/resume affects all scene characters; reduced-motion preference starts
  with movement paused. Both fidelity tiers contain the same residents/animals.
- Model kit totals: Normal 733,960 bytes; Ultra 2,029,252 bytes (includes the
  archived static buffalo asset; runtime uses the articulated herd instead).
