# Biology & Anatomy room - local prototype

## Current review status

V4 update: `scripts/build-muscles-v4.py` creates a continuous superficial-muscle
illustration using the existing CC0-derived body proportions, region-directed
baked fibre colours and shallow Ultra surface relief. It is not a dissection mesh:
individual muscles are not separately segmented, and tendons/boundaries are
illustrative. Normal: 29,683 triangles / 719,252 bytes; Ultra: 247,368 triangles /
7,437,908 bytes. Original skin is unchanged. The `.blend`, front/quarter renders
and GLBs are versioned separately under `public/models/local`.

The original `LabBodyPilot` / `lab-body-makehuman` surface has been restored at
the user's request. The relaxed-pose files are retained but are not loaded.
The rough muscle GLBs and procedural muscle fallback have been withdrawn from
the room. The V4 illustration is now loaded locally after front/quarter render
inspection; it improves continuity but is not an individually segmented muscle atlas.
`scripts/build-muscles-review.py` creates `muscles-review-v3.blend` and a front
render only - it does not export a GLB. This is an incomplete surface-conforming
art study, not validated muscle anatomy. Review before any web integration.
The historical implementation notes below describe earlier prototypes.

## Learning loop

Learning Lab → Biology & Anatomy → whole body → Surface / Organs / Skeleton →
select a structure → take to study tray → rotate / read → return to body.

The room now has five layers: Skin (relaxed arms), Skeleton + organs (no skin),
Organs only, Skeleton only (no ghost skin), and Muscles only. Selecting an organ
in the combined view keeps its skeleton context. The separate specimen viewer's
existing layers are unchanged.

`scripts/build-biology-body-layers.py` exports local `lab-body-relaxed` and
`lab-body-muscles` Normal/Ultra GLBs plus editable Blender sources. The muscle
layer is a schematic superficial-muscle study: broad regional volumes with
connecting deep-muscle masses, not an anatomically validated atlas. Previous
body assets are preserved. Eight state tests cover the new combined/muscle views.

Browser verification of the five-view update: relaxed-arm skin and skin-free
combined view were visually checked; Blender muscles loaded in Ultra; selecting
and extracting the heart in Normal retained the combined skeleton context.
Muscle realism and headset validation remain outstanding.
Detailed model opens the existing organ viewer; returning preserves the layer,
selected structure and tray contents. Reset restores the whole body and camera.
Paired organs are moved together, maintaining their relative positions. The tray
normalizes each selection to a 48 cm display envelope: it is explicitly enlarged,
not a representation of relative organ size.

## Research and design choices

- [3D Organon standalone VR manual, pp. 12, 19–24](https://www.3dorganon.com/wp-content/uploads/2021/04/3D-Organon-VR-Anatomy-for-Standalone-VR-User-Manual.pdf): selection opens contextual information; structures can be moved, hidden and restored. Borrow the interaction pattern, not assets or proprietary content.
- [3D Organon Web](https://www.3dorganon.com/3d-organon-web/): controlled progression from superficial to deeper layers. Keep layers explicit rather than removing arbitrary tissue with an unexplained gesture.
- [Medivis AnatomyX](https://www.medivis.com/anatomy-x): whole-body spatial context and targeted prosections. Its collaborative classroom scope is not included in this single-user prototype.

The first version uses **select → take → return**, not unconstrained physics.
This avoids dropped organs, preserves orientation and is usable by touch, mouse,
keyboard buttons and XR controller rays. Physical controller/hand grabbing,
teleportation, regional lesson presets and anatomist review are follow-up work.
No medical/surgical accuracy is claimed.

## Assets and fidelity

- `scripts/build-biology-room.py` creates an original Blender room with floor,
  cabinets, body plinth and study pedestal. Outputs are local-only:
  `public/models/local/biology-room-v1.blend`, `.glb`, and `-preview.png`.
- Room GLB: approximately 391 KiB, six material batches. The same inexpensive
  shell is used in Normal and Ultra. Blender lighting is preview-only.
- Surface body uses the existing MakeHuman-derived Blender pilot and its existing
  Normal/Ultra assets. Heart, lungs, airways and brain reuse the existing Blender
  assets in both body and tray (normalized to the teaching model's bounds).
  The remaining procedural organ geometry and skeleton are reused;
  this does **not** make the internal models photorealistic or medically validated.
- Normal: reduced organ tessellation, DPR 1, no shadows or transmission.
- Ultra: higher tessellation and shadows. VR forces Ultra for the session; the
  prior desktop quality choice is retained on exit.
- In VR, the information board and controls are actual scene meshes rather than
  HTML. Previous/next structure buttons make deeper structures reachable even
  when other tissue occludes them. Physical headset validation is still required.
- Local Blender assets are development-only. Production retains procedural
  fallbacks; promoting licensed assets to tracked production paths is a separate
  reviewed step, in keeping with the user's local-first workflow.

## Checks

1. Open Learning Lab → Biology & Anatomy. Surface is selected; dark board visible.
2. Select Heart, take to tray, rotate, return. Repeat with paired kidneys/lungs.
3. Select Windpipe and bronchi; take and return. Switch layers with a taken organ.
4. Open detailed model and return: prior selection and tray are retained.
5. Reset after orbiting: surface, no selection, empty tray, original camera.
6. Repeat in Normal and Ultra and a narrow phone viewport.
7. On a secure WebXR-supported headset: enter from Normal; verify Ultra, panel
   readability, ray selection, previous/next, take/return, reset and Exit VR.
8. Check real low-end Android performance before production acceptance.

### Verification on 2026-09-19

- Blender background generation and rendered-room visual review completed.
- Six `biologyRoomState` tests passed.
- Browser checked: Surface, Organs, Skeleton; heart extraction/rotation/return;
  paired kidney extraction in Normal; airway extraction; detail viewer round-trip
  retaining selection/tray; reset; desktop and 390 px phone-width layout.
- No new model-load errors observed during these checks. Existing specimen-viewer
  environment warnings and chemistry HMR errors are separate from this room.
- Full-project typecheck remains blocked by errors in the concurrently modified
  `ExperienceRoom.tsx` / `ExperienceRoomScene.tsx` files. No biology-room errors
  were reported. Those unrelated files were not edited by this implementation.
- Actual headset/controller and low-end Android performance checks are pending.
