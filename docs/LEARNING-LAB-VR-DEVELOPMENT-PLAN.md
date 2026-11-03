# Interactive Learning Lab VR development plan

Date: 2026-11-03. Source baseline: `2fb76ec`.

Status: first hands-on implementation completed in source after user approval;
hardware acceptance remains open. The audit below records the original baseline.
The user reports Anatomy entry failure and fewer headset activities than PC.
The precise headset failure has not yet been reproduced.

Implemented: shared XR entry for detail/standalone specimens; stable active room
renderer; native controller grip/rotation with cancellation and sprint ownership;
trigger/grip sliders; per-station objectives and live Results; anatomy tray/slice
inspection; chemistry dosing/mix results; projectile/pendulum/circuit activities;
all six Earth & Sky station controls. See [current behavior](LEARNING-LAB-VR.md).

Still pending: hardware/browser acceptance, full specialist experiment/quiz
parity, chemistry history in VR, anatomy microscope visual, physical furniture
collision/occlusion, Blender polish, measured Quest/Android performance and richer
entry diagnostics. Do not mark the whole plan complete from automated tests.

## Baseline findings (before this implementation)

There are two separate problems: inconsistent VR entry across nested viewers,
and activities whose controls/results still live outside the headset scene.
New Blender models can improve the environment, but do not resolve either
problem without changes to session handling and interaction code.

| Area | Verified in the current source | Consequence / next action |
| --- | --- | --- |
| Anatomy room | `BiologyRoom.tsx` uses shared `useLabVR` and `LabVRButton`. Opening Detail unmounts the room Canvas and hides its header. `InRoomDetail.tsx` creates a separate Canvas without XR entry. | A confirmed gap in the Detail route, but not yet a confirmed explanation of the user's main-room failure. Test both routes and preserve the immersive renderer when showing details. |
| Standalone specimens | `SpecimenView.tsx` has a separate store, hides its VR button when its capability flag is false, and calls `enterVR()` without handling its promise. | Migrate to the shared visible entry, error/retry handling and temporary Ultra quality behavior. Audit navigation from the hub and related specimens. |
| Chemistry | The active room is `ExperienceRoom.tsx`. VR exposes presets, pouring selected reagents, clearing and reaction status. Bottle clicks select reagents, but quantities and many results/tools are HTML controls. Opening Detail hides and stops the room renderer. | Preserve the renderer; make a complete mix-and-review activity usable inside VR. The inactive `ChemistryRoom` pilot is not the target. |
| Anatomy activities | VR can change layers/organs, take/return to the tray, rotate and reset. Microscope, comparison, quizzes and several inspection controls are outside VR. | Connect the existing learning state to in-world controls and direct organ manipulation. |
| Physics / Earth & Sky | Both use shared station panels, but provide no room actions to `LabVRRig`. Their detailed experiments remain PC/mobile interfaces. | Share experiment state with the 3D scene; notes and animated exhibits are not equivalent to an experiment. |
| Controller manipulation | `immersiveVR.ts` disables grab pointers. Left grip already controls running in the shared rig. | Resolve grab/run input ownership before adding physical handling; retain a trigger-based alternative. |

Relevant sources: [BiologyRoom](../src/components/BiologyRoom.tsx),
[InRoomDetail](../src/components/InRoomDetail.tsx),
[SpecimenView](../src/components/SpecimenView.tsx),
[ExperienceRoom](../src/components/ExperienceRoom.tsx),
[LabVR](../src/components/LabVR.tsx),
[PhysicsRoom](../src/components/PhysicsRoom.tsx),
[EarthSkyRoom](../src/components/EarthSkyRoom.tsx),
[immersiveVR](../src/immersiveVR.ts).

## Development order and completion criteria

Each stage produces a small reviewable change and a demonstrable activity. Keep
the existing PC/mobile interfaces and shared learning progress working throughout.

### 1. Anatomy entry and nested-view lifecycle — first priority

- Reproduce cold entry from the hub, entry after selecting an organ, Detail,
  standalone specimens, Back, denied entry, and entry after a previous session.
  Record the exact view and visible error; the reported room name alone does not
  identify a single cause.
- Add concise diagnostics for build version, secure context, support check,
  session state, renderer readiness and asset failure. Provide visible retry and
  loading states. Do not collect camera feeds or headset movement telemetry.
- Reuse `ImmersiveVREntry` / shared XR options for standalone specimens. Request
  the native session from the button action and handle rejected promises.
- Keep one stable XR canvas/store during immersive detail inspection. Render
  details inside it instead of unmounting or stopping the active room renderer.
  Keep an obvious entry path in non-immersive detail views as well.
- Retain temporary Ultra during VR and restore the previous quality on exit.
  Clear stale camera overrides, input state, narration and pending interactions.

Done when: all affected entry paths render an immersive scene on Quest, errors
remain retryable, and three enter/exit/re-enter cycles work through both the app
and Quest system exit. No unexplained black or flat view; PC/mobile Back and
detail inspection still work. A simulator alone cannot close this stage.

### 2. Shared activity state and reusable VR controls

- Inventory each activity's inputs, units, commands, result, explanation, reset
  and progress. Move logic out of DOM-only panels into shared activity state.
  PC, touch and XR dispatch the same commands and receive the same results.
- Extend the existing scene UI with selectors, steppers, sliders, status,
  readable result pages and reset controls. Do not duplicate scientific logic.
- Keep panels world-anchored with Y/Close, readable from seated and standing
  positions. Opening a panel must not disable walking or turning. Prevent hidden
  controls and objects behind an active control from receiving accidental clicks.
- Support either controller, clear hover/pressed feedback and a one-handed
  point-and-trigger path. Cancel drags cleanly on tracking loss or session end.
- Define grip ownership: hovering/holding a grabbable consumes that grip action;
  it must not also start running. Preserve existing movement bindings elsewhere.

Done when: changing an input in either interface changes the same visible
simulation and result; no duplicate action, stuck drag or stuck movement occurs
after closing a panel, losing focus or leaving VR.

### 3. Chemistry — first complete interactive pilot

Deliver the simple selectable-control version before adding grab-and-pour.

1. Select reagents from shelves or an accessible picker.
2. Set their amounts with the existing units and limits; show the current mix.
3. Run the experiment and see its reaction, equation, quantities and explanation
   inside VR. Use `findRecipe` and `computeMix` from `src/chemistry.ts` so the
   result matches PC. Unknown combinations need an explicit supported response.
4. Read/listen to the explanation, inspect history, clear and repeat. Keep
   discoveries and progress consistent across interfaces.
5. Add grip-held bottles, a visible pour target and snap-back slots. Tilt over the
   beaker to transfer a bounded amount; stop when upright, released or outside
   the target. Never transfer twice from one update or leave invisible fluid
   accumulating after reset. Keep the picker/amount controls as an alternative.

Done when: a visitor completes and repeats the entire activity without removing
the headset, including an unsupported mix and reset, with results matching PC.
The pilot is not yet full Chemistry parity. Track remaining titration,
electrolysis, calorimetry, flame, distillation, chromatography, mystery/guided
activities, analysis tools and quizzes individually against the current PC list.

### 4. Anatomy — inspection and learning in the headset

- Pick a body layer and organ; highlight it, take it to a tray, rotate/inspect,
  return and reset. Support both grip manipulation and button/ray controls.
- Put the existing exploded view, clipping/inspection controls and organ notes
  in the scene. Keep labels near their objects without covering the model.
- Bring microscope controls/results, healthy/disease comparison and label quizzes
  into VR using the existing content and scoring. Do not invent medical claims
  or substitute generated explanations for the approved learning material.

Done when: the visitor completes an organ inspection and a learning activity,
then returns to the body, with no switch to a flat HTML-only screen. Track every
remaining PC anatomy activity before claiming full parity.

### 5. Physics and Earth & Sky — complete the activity catalog

| Room | First interactive slice | Follow-through before parity sign-off |
| --- | --- | --- |
| Physics | Projectile controls and launch; circuit choices and output; pendulum parameters and observation | Simple machines, Newton's laws, energy, collisions, waves, friction, units/formulas and existing quizzes/results |
| Earth & Sky | Day/night rotation; Moon phase control; seasons/date or tilt controls supported by existing activity logic | Solar System, Earth layers, tides and existing quizzes/results |

Bind the tabletop models to shared state so operating a VR control changes the
exhibit being observed. Each activity must include its inputs, explanation,
result and reset; an Activities button opening notes is not completion.

### 6. Blender environment and interface refinement

Prototype the layout with simple geometry first, then refine the successful
interaction layout in Blender. Workbench in front, result board to one side,
tools in reachable slots and a clear aisle are the proposed layout. Allow panel
repositioning for seated use; keep menus out of the central experiment view.

Asset deliverables: chemistry bench/bottles/beaker, anatomy inspection pedestal
and tray, microscope surrounds, and a consistent panel frame. Export glTF with
named nodes, pivots, placement anchors and simple collision proxies. Retain
source/provenance. Keep labels and changing values as runtime text, not baked
artwork. Blender supplies geometry; code supplies controller actions and state.

Polish is incremental alongside stages 3–5 after their interactions work. Do not
replace all existing room assets or add a new engine solely for visual styling.

## Performance and testing gates

- Preserve Normal on low-end Android/4G, Ultra on capable devices, and Ultra
  during VR. No fourth tier and no learning activity available only in VR.
- Establish baseline loading, draw calls, triangles, texture memory, CPU/GPU
  frame time and sustained frame rate before choosing asset budgets. Optimize
  Ultra with reuse/instancing, fewer materials and appropriate textures.
- Load heavy room content on demand. Use refs for per-frame poses and motion;
  avoid whole-room state updates every frame. Reuse input listeners and dispose
  unused resources on actual scene exit.
- Proposed targets, not measured results: sustained 72 fps at a 72 Hz Quest
  session (about 13.9 ms/frame), and 30 fps for the Android Normal baseline
  (about 33.3 ms/frame). Record device, resolution, scene and refresh rate; use
  the corresponding budget if the headset runs at another rate.
- Unit tests: shared scientific results, amount limits, reset/progress,
  controller ownership and cancellation. Integration tests: actual UI command
  wiring, renderer/session continuity, disabled/hidden controls and cleanup.
- Built-in browser: desktop and phone layouts, full PC/mobile learning loops,
  then local `?vr-sim=1` for controller and panel layout checks.
- Quest 3: each room and nested entry path, either controller, seated/standing,
  five-minute activity use, movement with panels open, narration, denied entry,
  system exit and three re-entry cycles. Check for growing memory/resources.
- Low-end Android: initial load over representative 4G, Normal activity
  completion, touch controls and returning to the hub. Report device/network
  conditions instead of inferring success from a desktop build.

Use an acceptance table per activity with separate columns for implementation,
automated tests, desktop/mobile browser, simulator and Quest hardware. Complete
all listed activities before describing a room as having PC/VR parity.

## Development skills prepared

- Installed `vercel-react-best-practices` from
  [Vercel's official agent-skills repository](https://github.com/vercel-labs/agent-skills/tree/1a2c79d4e6c4a2283dc2c614b6538cbe1ed5ca62/skills/react-best-practices),
  revision `1a2c79d4e6c4a2283dc2c614b6538cbe1ed5ca62`. Apply conditional
  loading, transient refs and listener lifecycle guidance to the existing Vite/
  React stack. Do not apply Next.js-only or newer-React-only APIs blindly.
- Created the local `camboverse-webxr` skill for this repository's entry paths,
  experiment parity, controller ownership, Blender assets and verification.
  Both skills passed the skill validator. They are developer guidance, not app
  dependencies, and installing them alone does not improve measured frame rate.
- Skill discovery considered dedicated XR packages; the existing Three.js/R3F/XR
  stack can support the proposed work. Check installed versions before adding
  a manipulation helper. No additional rendering framework is proposed.

The XR library supports scene pointer interactions and provides optional object
manipulation helpers. Use its [interaction documentation](https://pmndrs.github.io/xr/docs/tutorials/interactions)
and [handle documentation](https://pmndrs.github.io/xr/docs/handles/introduction)
as references, checking compatibility with the project's installed version.

## Evidence limits at handoff

The baseline source findings above were verified; the exact headset failure is
not. The built-in browser still reports disabled. Implementation test/build
results and the remaining hardware checks are recorded in
[QA-LEARNING-VR-2026-11-03](QA-LEARNING-VR-2026-11-03.md). Automated results do not
establish visual quality, activity parity or hardware performance.
