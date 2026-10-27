# Banteay Chhmar — carved-face review v3

Status: **UNAPPROVED. Blender review only; do not import into the app.**

The user identified the four-directional tower faces as too flat and unrealistic.
This pass replaces the facial relief meshes and fills their backing/support gaps
above the doorways in the v2 scene. Site layout,
galleries, foliage, moat, tower placement and underlying tower masonry remain
the previous provisional interpretation. The v2 source is preserved.

## Reference basis and limits

Visually compared against Laurent Dambies' photographs, via
[Angkor Photography Tours](https://www.angkorphotographytours.com/blog/banteay-chhmar-temple/):

- [Main-temple face tower 18](https://www.angkorphotographytours.com/wp-content/uploads/2018/02/face-tower-banteay-chhmar.jpg).
- [Two surviving central face towers](https://www.angkorphotographytours.com/wp-content/uploads/2018/06/banteay-chhmar-towers.jpg).

Images were viewed as references, not copied into textures or packaged with the
model. This is original procedural geometry, **not photogrammetry or a measured
reconstruction**. The shared carving design is an interpretation: it does not
reproduce each surviving face's unique proportions, missing stones or damage.
All four orientations still need human/heritage review. Increasing mesh density
does not establish historical accuracy or photorealism.

## Changes

- Continuous facial volume, with deeper cheek/jaw planes, brow-to-nose transition,
  nose wings and nostril recesses.
- Narrower carved eyelids, fuller lips and restrained mouth curvature. An initial
  render had exaggerated brows and smile; these were reduced in the second pass.
- Elongated ear relief integrated at the sides, not separate floating geometry.
- Staggered, shallow masonry joints instead of disconnected square surface tiles.
- Internal head masonry and a base support close the see-through gaps below the
  reliefs, without closing the lower doorways.
- All 16 reliefs replaced (four directions on each of the four provisional towers).
  The main tower uses a 256 × 288 front quad grid per face; secondary towers use
  192 × 216. Each relief has side walls and a closed planar back.
- Restrained procedural stone grain and separate neutral review lighting.
- Four directional close-up cameras, a three-quarter camera and a clay render
  that shows geometry without relying on texture.

## Files

Folder: `public/models/local/banteay-chhmar-review-v3/`

- `banteay-chhmar-review-v3.blend` — entire site, editable meshes, review cameras.
- `01-south-face.png` / `03-east-face.png` / `04-north-face.png` /
  `05-west-face.png` — main-tower directional close-ups.
- `02-three-quarter.png` — face integration with the tower.
- `06-clay-geometry.png` — neutral material override, geometry inspection.
- `mesh-validation.json` — generated mesh checks and counts.

Open the `.blend` in Blender with File → Open. It opens at the three-quarter
review camera. Numpad 0 toggles camera view. Choose one of the `V3` camera objects
and use Ctrl+Numpad 0 to review that side; Middle Mouse orbits outside camera view.
The four main-tower reliefs are initially selected. They are in the collection
`V3 • carved faces • editable closed meshes`. Overlays are hidden for a clean
initial view; use Blender's Show Overlays control to inspect selection/mesh overlays.

## Rebuild and quality gates

```powershell
& 'C:\Program Files\Blender Foundation\Blender 5.2\blender.exe' --background --python scripts/refine-banteay-chhmar-faces-v3.py
```

The builder asserts that all replacement reliefs have manifold edges, positive
signed volume and no zero-area polygons, recalculates normals, and writes a new file. These are mesh
checks, not a certification of the entire inherited scene or of authenticity.

No GLB, app catalog or runtime source is modified. After approval, optimize and
bake separate Normal/Ultra assets before considering integration. Normal must
retain the same content; VR uses Ultra. This dense authoring file is not a
mobile-ready asset and must not be loaded directly into the viewer.

## Verification — 19 October 2026

- Blender 5.2.2 LTS completed the build and six final renders successfully.
- The saved file was reopened in a separate background Blender process: 35 mesh
  objects, 16 replacement facial reliefs, 813,824 vertices across those reliefs.
  No old `Face relief` tile objects remain. The default camera is the three-quarter
  view and no clay override is stored in the source file.
- Directional close-ups, the three-quarter view and the clay view were visually
  inspected. The main-tower faces are legible from all four review cameras.
- The west camera was moved clear of the neighbouring ruin. Support/backing gaps
  found in the first side-view render were closed around the new reliefs.
- Appearance is cleaner and deeper than v2, but still stylized/interpretive.
  Exact historical proportions, differentiated damage and fine ornament remain
  unverified; user approval is required before integration.
