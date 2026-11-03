# Learning Lab VR

All four rooms in Learning Lab use the same native WebXR entry, controller rays,
locomotion and scene-text panels as Buildings and Wat Phnom. No headset is
required for the existing PC/mobile learning experience.

| Room | Immersive learning |
| --- | --- |
| Biology & Anatomy | Layer selection, previous/next organ, take/return to tray, rotation, reset, notes and narration |
| Chemistry | Station notes, shelf-bottle selection, experiment presets, pour, clear bench, reaction status and narration |
| Physics & Machines | Walk around animated exhibits, select station markers, read/listen to notes, visit stations |
| Earth & Sky | Walk around models, select station markers, read/listen to notes, visit stations |

The inactive ChemistryRoom pilot is not mounted by the app; Chemistry uses
ExperienceRoom. Detailed physics/astronomy experiment forms, quizzes and anatomy
microscope controls remain PC/mobile interfaces. This change does not claim full
VR parity for those forms or add an unrestricted scientific AI tutor.

## Meta Quest controls

Open https://preview.camboverse.world/ in Meta Quest Browser, open Learning Lab,
choose a room, then Enter VR. Accept the headset session prompt.

- Left thumbstick: walk at 1.4 m/s. Hold left grip to run at 3.5 m/s.
- Right thumbstick: snap-turn 30 degrees around the tracked head.
- A: jump; release and press again for a second jump.
- B: toggle flying / smooth landing. While flying, hold A to rise or X to descend.
- Y: show/hide the learning panel. Close also dismisses it.
- Point either controller and press its trigger to select markers or controls.

The welcome panel shows Controls once on entry. Panels stay where opened;
looking or walking does not drag them along. Movement continues while reading.
Closing a panel reveals station markers. Learn has measured text pages,
previous/next station, Visit station and Listen. Activities contains the room's
supported controls. Controls includes return to the room entrance and Exit VR.
Reopening with Y brings the panel to the visitor's current position.

Visit station approaches from the centre aisle, faces the exhibit, clears jump
and flight state and keeps the origin on the floor. Walking/running includes the
tracked head offset in the room bounds; jumping/flying keeps the eyes below the
ceiling. Furniture does not yet have VR collision shapes. These limits are not a
substitute for the headset's real-world boundary.

## Rendering and speech

VR always raises the room to Ultra and restores the visitor's prior Normal/Ultra
choice on exit. Desktop movement ignores headset input. Non-VR users do not load
or draw the in-world panels and markers. The entry uses a real immersive-vr
session with Three.js tracking and stereo rendering, without a DOM overlay.
Unsupported devices receive connection guidance; denied sessions remain retryable.

Listen reads the existing English station notes using the shared voice service,
with browser speech as a fallback. It is an explicit action and stops when the
panel closes, the selected text changes, or the session ends. Learning notes do
not use Penh's persona. No new Khmer scientific translations were invented.

## Local testing

Run npm run dev, open http://127.0.0.1:5173/?vr-sim=1, then choose a Learning Lab
room. Enter VR uses the existing Meta Quest 3 emulator when no headset is present.
This switch only works on localhost in a development build; it cannot create a
fake headset session on the deployed preview. A simulator cannot validate headset
comfort, physical tracking, hardware permissions or actual Quest frame rate.

For an already configured Quest USB development connection, adb reverse
 tcp:5173 tcp:5173 makes http://localhost:5173/ available in Quest Browser.
Otherwise use the HTTPS preview. A plain HTTP Wi-Fi address cannot start WebXR.

## Validation (2026-11-03)

- TypeScript and production build pass.
- 32 focused tests pass: native session checks, shared ray surfaces, menu Y/Close,
  controller interaction, movement with a panel open, narration cleanup, station
  visits/facing, entrance reset, rerender stability, sprint, double jump, flight,
  tracked room boundaries and ceiling limits. Existing Buildings behavior passes.
- The built-in browser reported disabled during this run; interactive browser
  and physical Quest 3 visual/performance review remain pending.

On hardware, check every room from Normal: enter VR, dismiss the welcome board,
move/turn/jump/fly, select each station, listen, use supported activities, exit
through both the scene menu and Quest system menu, then re-enter. Confirm the
previous desktop quality and controls return. Measure the heaviest anatomy scene
on Quest and preserve the existing low-end Android Normal baseline.
