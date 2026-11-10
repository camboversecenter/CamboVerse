# Immersive experience quality plan

Date: 2026-11-06. First pilot: Learning Lab heart study.

## Goal

Create one polished, understandable interactive lesson that works on a low-end
Android phone, PC and Quest 3. Use it to establish reusable interaction and art
standards before applying them to the other learning rooms. Existing guided heart
study, anatomy state and learning content are the starting point; do not duplicate
the lesson or replace the existing mobile experience.

## Baseline before the pilot

- The Anatomy room began with guided steps, organ selection, a study tray,
  annotations, audio and VR actions. The original guided sequence was only
  available outside VR. The VR microscope showed tissue notes.
- Local PC VR simulation changes are in the working tree and have automated
  tests, but visual simulator and physical headset results are not established.
- The user previously reported Anatomy VR entry failing on Quest. A touch-layer
  fix was deployed; the physical-device result still needs confirmation.
- We have no measurements of low-end Android load/frame rate or Quest performance
  for the proposed pilot. Do not claim a performance improvement without them.

## Pilot: explore the heart

1. Start a short guided activity and identify the heart on the body.
2. Move it to a reachable study area. On PC/touch use clear selection and drag
   controls; in VR use either controller grip, with a trigger-based alternative.
3. Rotate and inspect the heart; select a cutaway/layer and identify at least
   two structures. Use visible highlights and existing reviewed descriptions.
4. Provide optional narration, an observation or simple question, feedback,
   reset and an obvious return to the body. Progress and content remain usable
   with Normal, Ultra and VR; VR temporarily uses Ultra.

## Delivery stages

1. **Baseline and interaction map.** Inventory existing heart states, model
   assets, controls, entry paths and known failures. Capture a PC and mobile
   baseline; check Quest entry and simulator status when available.
2. **Interaction prototype.** Reuse the existing lesson state and make the full
   sequence available in each mode. Handle selection, grab/drag, release,
   cancellation, reset, panel-open movement and repeated session entry.
3. **Art and feedback.** Review the current licensed heart asset. Improve or
   author Blender/glTF geometry only where needed, with named parts, sensible
   pivots, texture budgets, provenance and license records. Add restrained
   highlights, motion and audio. Preserve a lightweight Normal representation.
4. **Learning and accessibility.** Reuse and review scientific text, add an
   achievable question and feedback, readable labels and optional narration.
   Khmer content requires native-speaker review; educational/medical content
   should be reviewed by a qualified educator before presenting it as authoritative.
5. **Verify, measure, refine.** Run targeted and regression tests, inspect
   desktop/mobile in the built-in browser, then test simulator and actual Quest.
   Measure load, frame rate and scene costs on representative devices. Address
   problems observed; distinguish simulated results from real hardware results.
6. **Review and reuse.** Let the user review the pilot locally. Only after it is
   accepted, adapt the shared patterns to one Chemistry activity, then Physics
   and Earth & Sky. Track each activity's parity instead of claiming all rooms
   are complete.

## Acceptance checklist

- [ ] Complete the same learning objective in Normal, Ultra and VR without
      requiring VR or a login; controls and results are reachable on mobile.
- [ ] A visitor can select, inspect, return and reset the heart; no stuck input
      after releasing, losing focus or leaving the session.
- [ ] Quest 3 enters, exits and re-enters through both the room and detail path;
      both controllers and movement while information is open are checked.
- [ ] Actual PC/mobile, simulator and Quest outcomes are recorded separately.
- [ ] Models, audio and reference materials have reviewed licenses/provenance;
      raw capture/training files and secrets stay out of Git and deployment.
- [ ] Load time, draw calls, geometry and frame rate are measured with device,
      connection and settings recorded. Performance targets are proposals until
      measured and agreed, not claims of achievement.
- [ ] User reviews the local result before broad rollout.

## Local pilot review, November 6

### Floating inspection revision

The current pilot extracts organs into the air. Desktop and touch users can drag
an organ or an individual piece, resize the specimen and recall it. In VR either
controller can grip, both grips resize, and normal release preserves the pose.
The lesson now uses separation in place of the former tray step.

Both local Blender tiers passed a geometry check covering all 23 organ IDs.
The heart has 17 named parts. Continuous models use three geometric sections
labeled as illustrative. Tests also cover grip handoff in either order, size
limits, tracking-loss rollback and preservation of source geometry. Visual
acceptance of this revision in the built-in browser and physical Quest remains
pending. The observations below describe the earlier tray pilot.

### Earlier tray pilot

Open Learning Lab → Biology & Anatomy → Heart study. In VR, open Activities →
Start guided heart study. Both use the same seven steps, model state and learning
notes. The learner can place the heart, rotate it, open a section, select two
different structures, retry the question and return the organ. The VR board stays
beside the tray and supports trigger controls. During placement, releasing a grip
over the marked tray also places the heart. The board has Listen, Minimize,
Restart and End study.

| Check | Evidence |
| --- | --- |
| Desktop Ultra | Completed the lesson in the built-in browser, including a wrong answer, retry and return. |
| Phone layout, Normal | Completed the lesson at a 390 × 844 desktop browser viewport. The lesson panel sits below the model. Physical Android and 4G measurements remain pending. |
| PC VR simulator | Reproduced the inactive entry button. The desktop browser exposed WebXR without a headset, and IWER skipped runtime installation. The local simulator now explicitly installs its runtime after checking for native immersive support. An automated IWER test starts, ends and re-enters an immersive session with both virtual controllers. Browser access was disabled before the visual retest of the corrected simulator. |
| Quest 3 | Physical entry, seated reach, grip placement, controller aiming, narration and sustained frame rate remain to be checked on hardware. |

The local heart uses the existing Blender model. Labels derive their positions
from the authored chamber and vessel meshes. The local Normal organ pack is
760,812 bytes, with 1,428 triangles across the heart's 17 primitives. The Ultra
pack is 4,271,920 bytes, with 9,008 triangles across 17 heart primitives.
These counts describe the asset. Frame time and total scene draw calls still
need measurements on the target devices. The source and export history are in
[Approved organs import](APPROVED-ORGANS-IMPORT.md). No new capture media or
recordings were added for the lesson.

The next review is a local playthrough with the user and a physical Quest 3.
Chemistry follows the pilot review. Educational content review also remains open.

## Tools and workflow

Continue with Three.js / React Three Fiber, WebXR and Blender. Use existing
`camboverse-webxr` and React performance skills. Consider a physics library only
for a measured need; start with simple placement and collision behavior. Skills
are instructions for the development workflow, not a substitute for an asset,
working interaction, visual review or device measurements. Do not install
unreviewed external skills or introduce a new engine merely for polish.
