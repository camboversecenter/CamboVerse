# Phnom Kulen regional review — v3

The previous small waterfall composition must not stand for the entire mountain.
This revision replaces the destination's arrival view with a regional orientation
study and makes the waterfall a separate child scene. This is a local prototype,
not an expansion of the founding one-photoreal-temple milestone, and not a
published heritage survey.

## Experience

Siem Reap → Phnom Kulen opens a broad, forested plateau with five selectable
locations: Kulen Waterfalls, Preah Ang Thom, River of a Thousand Lingas (Anlong
Pong Phkay), Prasat Rong Chen and Srah Damrei. These are selected landmarks,
not an exhaustive inventory of Kulen's sites.

The Places menu is initially open; numbered markers have matching menu entries.
Selecting the waterfall offers **Enter waterfall study**. **← Kulen mountain**
returns to the overview, and **← Map** leaves the region. The keyed scene views
reset camera, walking and tour state between the miniature and child scene.
Normal/Ultra are available in both; entering VR still implies Ultra.

Walking is intentionally unavailable on the regional miniature: scene units are
not human-scale terrain. It remains available on the detailed waterfall bank
route. The child model reuses the prior waterfall geometry but removes the linga
patch and its tour stop, so it no longer places that sacred site beside the falls.
Preah Ang Thom, Rong Chen and Srah Damrei currently have **locator symbols and
information**, not detailed reconstructions. The reclining Buddha and sandstone
animal sculptures are not represented. They require separate reference-led work
and cultural review.

## Geography and provenance

- [Archaeology and Development Foundation: Phnom Kulen](https://www.adfkulen.org/phnom-kulen/)
  describes a large plateau containing forests, rivers and numerous sacred and
  archaeological sites. This informed the regional framing rather than treating
  one waterfall as the mountain.
- [Cambodia's UNESCO tentative-list submission](https://whc.unesco.org/en/tentativelists/6460/)
  provides archaeological and river-system context. Tentative-list inclusion is
  not World Heritage inscription.
- [Hello Angkor's Kulen guide](https://helloangkor.com/phnom-kulen-guide/), with
  the five individual pages linked in `src/kulenLandmarks.json`, supplies the
  approximate published map pins. The public page `poi` coordinates were read
  on 23 October 2026; these are not survey control points.

Pins use a common equirectangular projection, centered at 13.55 N, 104.12 E,
400 model units per degree with longitude corrected by cos(13.55°). East is +X,
north is -Z. The same source JSON drives Blender placement and the UI. Pin
positions are not deliberately rearranged to separate labels. Height is
illustrative and locator symbols are enlarged. Relief, vegetation, local stream
symbol and the rectangular study perimeter are procedural: **no DEM, mapped
park boundary, surveyed landform or on-site route is implied**. No roads or
cross-country routes are invented between remote sites. Kbal Spean is not
conflated with Anlong Pong Phkay.

Two ADF photographs were inspected from the linked page (Remarkable-v2-01 and
Remarkable-v2-02). Private review copies remain in
`output/phnom-kulen-region-v3/references/`; they are not distributed, used as
textures or relicensed. No third-party raster image appears in the GLBs.
Original authored geometry follows the project's CC-BY-4.0 content convention,
attribution CamboVerse Center / NUM; generator and viewer code are Apache-2.0.
No capture permission, institutional endorsement or custodial consent is claimed.
Existing Khmer naming is retained, pending native editorial review.

## Assets and reproducibility

- `scripts/build-kulen-region.py -- --normal` / `--ultra`: regional pair at
  `public/models/local/phnom-kulen-region-v3/`, sources and reports at
  `output/phnom-kulen-region-v3/`.
- `scripts/refine-phnom-kulen.py -- --normal --waterfall-only` / `--ultra --waterfall-only`:
  child pair at `public/models/local/phnom-kulen-waterfall-v3/`, sources/reports at
  `output/phnom-kulen-waterfall-v3/`. Without the flag, the original v2 generation
  path remains available. Existing v1/v2 GLBs were not overwritten.
- Both region tiers retain 520 trees, five locator symbols and 14 material
  batches. The Normal model uses lower terrain/canopy detail. Meshopt is decoded
  with the viewer's bundled decoder; no external textures are required.
- Tests: `src/kulenRegion.test.ts`, `src/kulenUi.test.ts`, and
  `src/phnomKulenImport.test.ts`. They cover projected placements, actual GLB
  decode/budgets, original hashes, upward terrain faces, camera sightlines,
  entry/back UI markup and bidirectional waterfall stair traversal.

Blender renders are visual review aids, not browser screenshots. Interactive
browser testing is unavailable in this session. Low-end Android performance,
portrait layout interactions and headset behavior remain manual acceptance
checks. A passing geometry test does not certify real-device frame rate.

Generated model/review directories use the existing local-review ignore rules.
Nothing has been deployed, committed or pushed.

Validation on 23 October 2026: 187 tests in 33 files passed; the production build
passed with the existing large-JavaScript-chunk warning. All four built GLBs
match the source asset hashes. Region Normal: 55,456 triangles / 1,204,364 bytes;
Ultra: 182,380 / 3,967,400. Waterfall Normal: 34,560 / 562,088; Ultra:
108,650 / 1,750,208. Each scene uses 14 material batches. Phone portrait overview
framing is computed separately from the human-scale child-scene camera; this is
covered by a numeric test, not a claim of real-device visual acceptance.
