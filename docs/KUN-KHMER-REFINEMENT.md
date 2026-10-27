# Kun Khmer training refinement

## Scope

Refines the existing seven-move collection and eight-prompt recognition challenge.
No new combat system, multiplayer, downloaded asset or package dependency.
The procedural fighters are illustrative, not motion-captured or Blender models.

## Experience

- Separate scene and study panel; compact phone training layout keeps the ring,
  called technique and touch buttons visible together.
- All seven demonstrations, next/replay, half-speed playback and freeze/resume.
  Improved limb proportions, feet, face details and training gloves. Corrected
  knee direction and interpolation back to neutral guard after every move.
- Explicit start, three-second countdown, Relaxed (4.5s) / Challenge (2.6s),
  visible response timer, pause/resume, restart, repeat and missed-move review.
- Every round covers all seven techniques plus one extra prompt. Six of eight
  correct completes it. Scores describe recognition, not combat skill or official
  bout scoring. Removed health bars that previously continued a round at zero HP.
- One answer per prompt; repeated keydown events ignored. Original shortcuts
  retained, with B added for Block when Space activates a focused button.
  Escape pauses. Hiding or leaving the window pauses active training.
- Pure round state replaces unmanaged feedback timeouts. Animation reaction
  callbacks are cancelled on pause, mode change, restart and unmount.
- Local explored-technique progress, best score, rounds and completed rounds;
  storage failures remain usable for the current visit. Passport status and retry
  are separate, with stale asynchronous save responses ignored.
- Scoped CSS, visible focus, labelled buttons and timer, restrained live feedback,
  reduced-motion-aware ambient animation. No screen shake.

## Modes

Normal reduces fighter/ring segments and pixel ratio, with no shadows or ambient
bouncing. Explicit technique demonstrations remain available. Ultra adds detail
and shadows. Entering WebXR uses Ultra and fixed world-space controller panels.
VR supports study, speed/freeze/replay, cultural notes, sound, difficulty, start,
answer, pause/resume, restart, Passport retry and exit. Round time is driven by XR
frames during a session; session visibility loss pauses training. Physical VR
interaction has not yet been verified on a headset.

## Cultural review

Consulted 26 October 2026:

- [VisitCambodia: Kun Khmer traditional kick boxing](https://visitcambodia.co/cambodia/things-to-do/cultural-history/phnom-penh-kun-khmer-traditional-kick-boxing)
  supports the four striking families and clinch context. Only a short factual
  summary is used, not marketing claims about origins or superiority.
- [Ministry of Culture and Fine Arts: Kun Lbokator](https://mcfa.gov.kh/world-heritage/bokator/)
  helps distinguish Lbokator's tradition and UNESCO inscription from the ring
  sport demonstrated here. Removed the former unsupported “world's oldest” claim
  and direct equivalence between Kun Khmer and all ancient Khmer martial arts.

No reference photos were copied. Existing Khmer move names and romanisations
are inherited from the prior reference-game adaptation and still require native
practitioner review; the interface does not claim they form a complete glossary.
The sound effects are synthetic, not traditional ensemble recordings. Ceremonial
headbands were removed from the modern training demonstration.

## Validation

- 13 pure-state tests: coverage/order, countdown, both difficulty win paths,
  pause/resume in all timed phases, duplicate/invalid inputs, unattended misses,
  streaks, reset, frame-independent timing and corrupt local records.
- TypeScript check. Browser review includes a 7/8 completed round, saved Passport,
  pause/resume, slow/freeze controls, Normal mode and 390px mobile training layout.
  An unattended Challenge round ends at 0/8 and its review opens the selected
  missed move. Saved progress is retained when the experience is opened again.
- The 20 existing Khmer Games engine tests also pass (33 tests combined).
- Actual low-end Android/4G performance, headset controllers and practitioner
  review of animation accuracy remain physical/human validation tasks.
