# Heritage Blender model pass

Local staging directory: `public/models/local/heritage-blender-v1/`.
This directory is ignored by Git: model binaries must be packaged separately
before a deployment. Do not remove or overwrite unrelated local models.

## Scope

All 14 existing destinations plus **Pre Rup** have paired Normal/Ultra GLBs and
editable `.blend` files. `src/spots.ts` selects the paired assets. Hotspot camera
overrides are in `src/heritageHotspots.ts`. Province symbols remain unchanged;
Pre Rup has an additional site-card illustration.

These are original **illustrative teaching models**, not measured archaeological
reconstructions or photogrammetry. Layouts are compressed and ornaments simplified.
No source photographs or third-party model meshes were incorporated. The app
labels these limitations. Khmer editorial review of the new site name remains
advisable before publication.

## Reproduce

Use Blender 5.2 in background mode:

```powershell
& 'C:\Program Files\Blender Foundation\Blender 5.2\blender.exe' --background --python scripts/build-heritage-sites-blender.py
& 'C:\Program Files\Blender Foundation\Blender 5.2\blender.exe' --background --python scripts/refine-existing-heritage-blender.py
```

The first script authors 13 site compositions directly in Blender. To rebuild one,
append `-- bayon` (or another supported site ID). The second preserves and refines
the existing Angkor Wat and Wat Phnom compositions; it deliberately excludes the
native replacements so a rerun cannot restore the old placeholder geometry.
Both save source files, paired exports, and an Ultra review render.

Normal retains landmarks while reducing curve segments, foliage detail and edge
geometry. The application disables shadows/reflections in Normal; entering VR
selects Ultra. Per-model Normal guardrails are 2 MiB, 50,000 triangles and 40
primitives, not a claim of measured low-end Android frame rate.

## Reference basis

- [Angkor Wat — APSARA](https://apsaraauthority.gov.kh/2021/06/14/angkor-wat/)
- [Bayon — APSARA](https://apsaraauthority.gov.kh/2021/08/05/bayon/)
- [Ta Prohm — APSARA](https://apsaraauthority.gov.kh/2021/08/12/ta-prohm/)
- [Banteay Srei — APSARA](https://apsaraauthority.gov.kh/2021/08/04/banteay-srei/)
- [Preah Vihear — UNESCO](https://whc.unesco.org/en/list/1224/)
- [Royal Palace — Ministry of Tourism](https://tourismcambodia.org/provinces/search/detail/127/royal-palace-1548301051)
- Wat Phnom: existing project source and `docs/WAT-PHNOM-BLENDER-V2.md`.
- [Sambor Prei Kuk — UNESCO](https://whc.unesco.org/en/list/1532/)
- [Koh Ker — UNESCO](https://whc.unesco.org/en/list/1667/)
- [Banteay Chhmar — Ministry of Tourism](https://www.tourismcambodia.org/public/index.php/mot/cbet-destination/533/banteay-chhmar-community-based-tourism-site)
- [Preah Khan conservation report — WMF](https://www.wmf.org/sites/default/files/article/pdfs/Preah_Khan_Conservation_Project_Report_II.pdf)
- [Phnom Kulen — Ministry of Tourism](https://tourismcambodia.org/public/provinces/search/detail/388/kulen-mountain-national-park-1550808107)
- [Pre Rup — APSARA](https://apsaraauthority.gov.kh/2026/06/01/pre-rup-temple-2/)
- Pre Rup's approximate map position was cross-checked against the location of
  [this geotagged photograph](https://commons.wikimedia.org/wiki/File:Sunset_Tourism_on_Pre_Rup_Temple_(4302448993).jpg).
  The photograph itself is not redistributed or used as a texture.

## Verification

```text
node scripts/check-heritage-blender.mjs
npx vitest run src/heritageHotspots.test.ts
npx tsc --noEmit
```

The asset check verifies native sources, valid GLBs, finite bounds, detail-tier
geometry differences, Normal budgets and render freshness. The unit tests verify
catalog coverage, paired paths and valid camera-stop IDs. Neither substitutes for
browser rendering, hotspot placement review, or physical Android/VR testing.
Review status is recorded in `scripts/heritage-blender-worklist.json`.

### Local completion audit

- `npm run build` passed (TypeScript project build and Vite client/SSR build).
  Vite still warns about large application chunks; this is not a measured mobile
  performance pass. The three heritage catalog tests passed as well.
- All 30 editable source files opened successfully in Blender 5.2.2 with nonempty
  meshes and materials (`scripts/check-heritage-sources-blender.py`). This uses
  Blender itself so compressed source files are also validated.
- All 30 catalog GLB URLs returned HTTP 200 and valid glTF headers locally.
- All 15 destinations were entered through the map's Places list. Every stop
  card was opened; Normal/Ultra rendering and representative camera framing were
  visually reviewed. Sanctuary views at Banteay Srei, the Sambor relief view and
  the Preah Khan pavilion camera were adjusted to reduce foreground obstructions.
- Existing province symbols were retained. Pre Rup adds one destination, not a
  replacement map navigation design.
- VR asset selection was checked in source (`immersive || detail === "ultra"`).
  Normal disables the shadow pass and reflection material. No physical headset
  or low-end Android performance certification is claimed.
- These are local review artifacts. The ignored Blender/GLB binaries are not
  published by a Git push; deployment packaging remains a separate operation.
