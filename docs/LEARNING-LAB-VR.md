# Learning Lab VR

For the Anatomy entry audit and the planned work to bring experiments into the
headset, see the [interactive VR development plan](LEARNING-LAB-VR-DEVELOPMENT-PLAN.md).
That plan distinguishes current behavior from proposed changes.

All four rooms in Learning Lab use the same native WebXR entry, controller rays,
locomotion and scene-text panels as Buildings and Wat Phnom. No headset is
required for the existing PC/mobile learning experience.

| Room | Immersive learning |
| --- | --- |
| Biology & Anatomy | Extract floating organs, grip to position, use both grips to resize, separate and reassemble pieces, slice, identify structures, return and reset |
| Chemistry | Select shelf bottles, grip selected vials, tilt over the beaker to add bounded doses, adjust amounts, run a mix and read its equation/explanation; move flame-test samples into the flame or select them by trigger |
| Physics & Machines | Drag launch angle/speed and launch a projectile; grip/release the pendulum bob, change length; switch circuit presets; compare simple machines and test friction on a ramp |
| Earth & Sky | Pick up planet/layer samples; rotate Earth; move the Moon for phases/tides; change season and read the corresponding results |

The inactive ChemistryRoom pilot is not mounted by the app; Chemistry uses
ExperienceRoom. Advanced physics/chemistry experiments, quizzes, history browsers
and the anatomy microscope visual remain PC/mobile interfaces. VR tissue notes
are text, not a working microscope. This change does not claim full PC/VR parity.
The detailed/standalone specimen viewer now uses the shared native XR entry and
can be held, rotated, layered and inspected inside the headset.

## Meta Quest controls

Open https://preview.camboverse.world/ in Meta Quest Browser, open Learning Lab,
choose a room, then Enter VR. Accept the headset session prompt.

- Left thumbstick: walk at 1.4 m/s. Hold left grip away from tools to run at 3.5 m/s.
- Right thumbstick: snap-turn 30 degrees around the tracked head.
- A: jump; release and press again for a second jump.
- B: toggle flying / smooth landing. While flying, hold A to rise or X to descend.
- Y: show/hide the learning panel. Close also dismisses it.
- Point either controller and press its trigger to select markers or controls.
- Point at an object, or bring a controller near it, and hold grip to grab it. Move/rotate the
  controller. Anatomy specimens float where released. Other lab tools return to their slots.
- Drag the gold slider knob or its rail with the trigger. Grip also moves knobs;
  plus/minus buttons and Activities provide selectable alternatives.

The welcome panel shows Controls once on entry. Panels stay where opened;
looking or walking does not drag them along. Movement continues while reading.
Closing a panel reveals station markers. Learn has measured text pages,
previous/next station, Visit station and Listen. Activities contains the room's
supported controls. Results displays the current inputs, result and explanation,
with pagination and narration. Controls includes room entrance and Exit VR.
Reopening with Y brings the panel to the visitor's current position.

Opening the panel releases held tools and cancels slider drags; it does not stop
locomotion. A consumed grip cannot become a sprint until released. Tracking/focus
loss and session exit return tools to their saved positions. Manipulation uses
the native target ray for aiming and grip pose for wrist motion. This is
controller ray-grabbing. Anatomy supports two-grip scaling and floating release.

Visit station approaches from the centre aisle, faces the exhibit, clears jump
and flight state and keeps the origin on the floor. Walking/running includes the
tracked head offset in the room bounds; jumping/flying keeps the eyes below the
ceiling. Furniture does not yet have VR collision shapes. These limits are not a
substitute for the headset's real-world boundary. Tool raycasts currently test
registered tools within three metres; furniture occlusion/collision is pending.

## Rendering and speech

VR always raises the room to Ultra and restores the visitor's prior Normal/Ultra
choice on exit. Desktop movement ignores headset input. Non-VR users do not load
or draw the in-world panels and markers. The entry uses a real immersive-vr
session with Three.js tracking and stereo rendering, without a DOM overlay.
Unsupported devices receive connection guidance; denied sessions remain retryable.

Listen reads the existing English station notes or activity results using the shared voice service,
with browser speech as a fallback. It is an explicit action and stops when the
panel closes, the selected text changes, or the session ends. Learning notes do
not use Penh's persona. No new Khmer scientific translations were invented.

## Local testing

For the Anatomy pilot, open **Heart study** on the toolbar or **Activities →
Start guided heart study** in VR. Select the heart to bring it into the air.
On desktop or touch, drag it to move and use Zoom to resize. In VR, grip with
either controller, then hold the other grip and spread or close your hands.
Release to leave the specimen in place. **Bring organ here** recalls it.
**Separate pieces** exposes individually movable model parts. A continuous mesh
opens into three illustrative surface sections. **Reassemble pieces** restores
the assembled specimen. The lesson continues with section inspection, two
observations, a question, optional narration and return.

Run npm run dev, open http://127.0.0.1:5173/?vr-sim=1, then choose a Learning Lab
room. Enter VR uses the existing Meta Quest 3 emulator when no headset is present.
The **PC VR test** panel shows whether the simulator is ready and gives mouse or
keyboard (Space/Enter) controls for both controller triggers, grips, sticks and
buttons. Hold a control to press it; release it to stop. Use the emulator's
headset/controller tools to move your view and aim the ray. The panel is local
development-only and can be collapsed with its title button.
This switch only works on localhost in a development build; it cannot create a
fake headset session on the deployed preview. A simulator cannot validate headset
comfort, physical tracking, hardware permissions or actual Quest frame rate.

For an already configured Quest USB development connection, adb reverse
 tcp:5173 tcp:5173 makes http://localhost:5173/ available in Quest Browser.
Otherwise use the HTTPS preview. A plain HTTP Wi-Fi address cannot start WebXR.

## Validation (2026-11-03)

- TypeScript and production build pass.
- Full suite: 439 tests across 89 files pass. New coverage includes native
  target-ray/grip pose conversion, transformed parents, independent controllers,
  cancellation and sprint ownership, slider bounds, reagent quantity ordering,
  dose eligibility, live result panels and a usable detailed-model failure
  fallback. Existing Buildings checks pass.
- The built-in browser reported disabled during this run; interactive browser
  and physical Quest 3 visual/performance review remain pending.

On hardware, check every room from Normal: enter VR, dismiss the welcome board,
move/turn/jump/fly, select each station, listen, use supported activities, exit
through both the scene menu and Quest system menu, then re-enter. Confirm the
previous desktop quality and controls return. Measure the heaviest anatomy scene
on Quest and preserve the existing low-end Android Normal baseline.

### Activity trials

1. Anatomy: select an organ, take it out, close the panel, grip/rotate/release;
   change study scale and slice, read a structure in Results, return/reset.
   Repeat entry from its Detail view and the standalone specimen route.
2. Chemistry: choose a known pair of shelf reagents, move to the central bench,
   grip a selected vial and tilt its mouth over the green beaker ring. Confirm
   amounts increase only over the target (at most 25 units per grip). Use the
   amount sliders, Run mix, read Results, clear and repeat with reversed inputs.
3. Physics: compare two launcher angles at fixed speed and their ranges; change
   pendulum length, grip/release the bob, compare periods; switch circuit presets.
4. Earth & Sky: select a planet and layer sample, rotate Earth, move the Moon,
   cycle all seasons and compare opposing tidal bulges. Read Results per station.

All quantities/results use the existing PC state and science helpers. Tabletop
dimensions are illustrative. The ideal tide function now has two opposing high
tides, consistent with [NOAA's explanation](https://oceanservice.noaa.gov/education/tutorial_tides/tides03_gravity.html);
it is not a local tide forecast. See the [implementation QA record](QA-LEARNING-VR-2026-11-03.md).
