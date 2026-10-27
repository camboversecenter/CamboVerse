# Colour by day — Blender fashion display v2

## Scope

Replaces the primitive figure only in **Khmer Fashion → Colour by day** with an
original museum-style mannequin, wrapped sampot, fitted under-wrap, shoulder sbai
and restrained gold edging. V2 revises the pose after user review: elbows bent,
hands raised at the chest, fingers upright and palms together, using the Royal
Palace display photograph below as the posture reference. Arm lengths are
preserved with two-bone positioning; fingers are articulated before reduction.
Varieties, historical outfits and camera try-on keep
their existing figures. This is an interpretive display, not a scan or an exact
reconstruction of a named royal, period or ceremonial costume. Native review of
the inherited Khmer labels and specialist review of the clothing are still needed.

## References consulted (26 October 2026)

- Centre for Textile Research, University of Copenhagen, [The Art of Ikat:
  A Cambodian Renaissance exhibition gallery](https://www.traditionaltextilecraft.dk/gallery),
  22 February–31 May 2024. Captions identify a mannequin dressed in sampot and
  sbai. Used to guide the display format and garment selection.
- [Traditional clothes, Cambodian queen, Phnom Penh](https://commons.wikimedia.org/wiki/File:Traditional_clothes_Cambodian_queen_Phnom_Penh.jpg):
  visual comparison of drape, belt, day-colour coordination and human-shaped
  mannequins. The pictured blouse and chang kben are **not** the outfit reproduced
  by this model. No photograph is bundled, traced or used as a texture.
- Historical Society of Long Beach, Cambodian-American Collection,
  [Seven Colors of the Week](https://hslb.org/wp-content/uploads/Cambodian-American-Collection/History-and-Culture/Arts/Clothing/7-Colors-of-the-Week.pdf):
  palette reference. Thursday can be yellowish green; Saturday can be dark red or
  plum. Screen colours are illustrative, not textile colour standards.
- Vathanak Sok, *Intermediate Khmer* (2024), Michigan State University,
  [7.1 Do You Know?](https://openbooks.lib.msu.edu/intkhmer/chapter/7-2-do-you-know/):
  context for the traditional seven-day colour association. No textbook images
  or passages are included in the assets.

## Asset provenance and licensing

- Body: existing MakeHuman hm08 base mesh, CC0-1.0. The local pinned input is
  `public/models/local/makehuman-source/base.obj`, SHA-256
  `8e761e6624b8f54536409135d1636da63b32486a90d4897f84e121d144f6fb4c`.
  Its accompanying `LICENSE.ASSETS.md` contains the CC0 dedication. No MakeHuman
  executable code or third-party community clothing is used.
- Body pose adaptation, garment meshes, fold shapes, diamond border and material
  arrangement: original CamboVerse work, CC-BY-4.0. The border is a simple original
  geometric design, not a claim to reproduce a named traditional weaving pattern.
- Source-generation code: Apache-2.0, following the repository code license.
- No external photographic textures, remote runtime assets or proprietary formats
  are required by the viewer. Blender is an authoring dependency only.

## Build and review

Run Blender 5.2 in background mode with
`--python scripts/build-fashion-day-blender.py` from the repository root. The
script verifies the existing CC0 input checksum, builds both tiers, writes GLBs
and statistics into `public/models/fashion/`, and saves a review `.blend` and
front/side studio renders under `public/models/local/fashion-day-v2/` (git-ignored).

The input is deliberately local. A fresh checkout needs the same pinned CC0
MakeHuman input and its license before regeneration; the exported GLBs work
without Blender or that source file. Keep the original base license alongside
any distributed authoring archive.

## Runtime behaviour

- Versioned asset paths; switching days recolours the already loaded cloth.
- Normal and Ultra contain the same garment pieces. Both have three material
  batches; exact bytes/triangles are in `fashion-day-v2.stats.json`.
- Normal uses reduced geometry/DPR with shadows disabled. Ultra uses more
  geometry and shadows. No transmission, postprocessing or texture download.
- VR uses Ultra for the session; desktop/mobile quality selection is restored
  after exit. A real headset and low-end Android performance check remain manual.
- Rotation is opt-in; front/side/back buttons frame the mannequin. Loading or
  failure is visible, with retry instead of silently displaying the old figure.

## Verification

TypeScript check; binary asset checks for topology bounds, material names,
budgets, and equivalent garment groups; Blender render review; local browser
inspection of day selection, quality switching, views and other fashion tabs.
