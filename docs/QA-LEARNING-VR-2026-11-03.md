# Hands-on Learning Lab VR QA

Date: 2026-11-03. Source baseline: `2fb76ec`.

## Delivered scope

| Activity | Implementation | Automated coverage | Browser / simulator / Quest |
| --- | --- | --- | --- |
| Controller tool handling | Target-ray selection, grip-space translation/rotation, either hand, return to slot | Pose bridge, transformed parent, multi-controller ownership, cancel/focus/disconnect/hidden object, reach | Pending |
| Sliders and panel | Trigger rail/knob drag, grip, step buttons; objectives, Results, narration | Quantization/clamping; Results state updates, narration; existing Y/Close/movement tests | Pending |
| Anatomy room and detail | Shared detail/standalone entry; preserve immersive room canvas; tray grab, scale, clipping, structure/tissue/comparison notes | Existing state/navigation/quality tests; shared manipulation and session tests | Pending; exact user-reported entry failure unconfirmed |
| Chemistry | Selected-vial dosing, amount sliders, mix and results, clear/repeat | Reagent-order and sparse-slot matching, dose position/tilt eligibility; existing bench tests | Pending |
| Physics | Projectile controls/launch, pendulum grab/length, circuit presets and bulb | Shared manipulation coverage; build/types. Visual timing and model layout unverified | Pending |
| Earth & Sky | Planet/layer samples, Earth rotation, Moon phases, seasons, tides | Shared manipulation; opposing ideal tidal bulges. Visual lighting/layout unverified | Pending |

Full project suite: **439 tests passed in 89 files**. Production build and
TypeScript passed. Vite still warns about large chunks; a passing build is not a
low-end Android or headset performance measurement.

Publication scan passed, and all eight publication-checker tests passed. The
local preview responds with HTTP 200 at `http://127.0.0.1:5173/`.

Browser inventory was checked again after implementation and reported local
browser use disabled in Work settings. No browser screenshots, simulator session,
physical Quest run or frame-rate measurement are claimed. User trial steps are
in [LEARNING-LAB-VR.md](LEARNING-LAB-VR.md#activity-trials).

## Behavior and remaining acceptance

- Existing PC/mobile controls and calculations remain; no new engine or binary
  asset dependency. VR uses Ultra and restores prior quality through shared entry.
- Detailed specimens retain an interactive procedural fallback if an asset
  fails; this fallback is covered by a render/interaction test. Their section
  planes follow the held exhibit transform and private materials are disposed.
- Dosing is a bounded teaching interaction, not a fluid simulator. Unknown mixes
  explicitly say no modeled reaction. Reversed reagent selection now maps amounts
  to recipe order in both PC and VR.
- Tools return to saved transforms on release/cancel. Grip ownership stays
  latched until release, including after opening the menu, preventing surprise
  sprinting. Trigger drags cancel on focus/session/menu changes.
- Furniture collision/occlusion, hand tracking and two-hand manipulation remain
  pending. Advanced quizzes, microscope visual, history and specialist experiments
  still have PC/mobile interfaces; this is not full room parity.
- Before acceptance, run both controllers, seated/standing, menu-open movement,
  reset during handling, tracking loss and three enter/exit cycles per room;
  include Anatomy Detail/standalone, Normal restoration and mobile Back/layout.
- Review projectile path visibility, pendulum release, beaker target reach,
  clipping while rotating an organ, Moon lighting and season alignment visually.
  Models are illustrative and not medically or astronomically scale-accurate.

Only reviewed source/docs/tests are eligible for Git. Never upload local `dist/`,
which can contain ignored private capture assets. Cloudflare must build from Git.
