# Khmer Games functional refinement

Scope: improve the four existing games rather than expand the catalogue.

## Changes

1. **Collection:** readable festival scene, numbered game choices, short goals,
   Relaxed/Challenge settings, local best scores and longer cultural information
   under a disclosure. The stage and information panel have separate space on
   desktop; they stack on phones.
2. **All games:** ready screen, three-second countdown, touch/click/keyboard
   controls, pause/resume, restart, replay, next game and consistent results.
   Losing focus or hiding the page pauses the round. No old timeout can finish a
   closed or restarted game. Keyboard repeat and duplicate rapid inputs are
   ignored where appropriate.
3. **Hit the Pot:** five swings, three hits to win; visible bounded target zone,
   animated pot/aim board, feedback and a short recovery between swings.
4. **Sack Race:** alternate digital buttons, a visible rival, clear next-side cue
   and a brief stumble after the wrong side. The physical game is described
   separately: both feet are inside the sack, not alternating physical steps.
5. **Tug of War:** coordinated timed pulls instead of unrestricted button mashing;
   shared beat zone, opposing pressure and a bounded round.
6. **Scarf Tossing:** five throws with three catches needed, a catch zone entirely
   inside the track, and recovery after a miss instead of immediate defeat.
7. **Results:** local play/win/best records survive refresh when storage is
   available. Winning also requests the existing Passport credential. Local wins
   and Passport saves are separate; failed Passport saves show a retry action.
   Leaving or switching games invalidates stale save responses.
8. **Modes:** Normal reduces geometry and pixel ratio and disables shadows and
   ambient scene motion. Ultra adds scene detail/shadows/motion; VR implies Ultra.
   World-space controller buttons and a game-board texture use the same state
   engine as touch/desktop, including selection, difficulty, play, pause, restart,
   next game and Passport retry. No additional rendering tier was added.

## Cultural references

Consulted 26 October 2026. These inform the contextual summaries; the minigames
are original solo adaptations, not claims to reproduce complete community rules.

- Cambodia Ministry of Culture and Fine Arts,
  [Tugging rituals and games](https://mcfa.gov.kh/world-heritage/tug-of-war/):
  recreational and ritual contexts, including New Year and community ceremonies.
- [ICHCAP, Significance of Teanh Prot](https://ichcourier.unesco-ichcap.org/board.es?act=view&bid=A102&list_no=402&mid=a10501000000):
  social and seasonal context; practices differ between communities.
- Cambodian National Radio,
  [The summarized story of Traditional Khmer New Year](https://rnk.gov.kh/article/66127):
  traditional games, including Chol Chhoung, in New Year gatherings.
- Tourism Cambodia,
  [Khmer Traditional New Year](https://www.tourismcambodia.com/news/events/8721/khmer-traditional-new-year.htm):
  scarf tossing with group singing; used as a supporting description, not a single
  authoritative rulebook.
- [IntoCambodia, Lout Bav / Jumping Bag Game](https://intocambodia.org/content/lout-bav-or-jumping-bag-game):
  sack racing context and photo credited to UYFC. No reference image is copied
  into the product. The vector-style game boards are original canvas drawings.

Inherited Khmer names remain subject to native-speaker review. The 3D people and
festival props remain stylised illustrations, not Blender scans or photoreal assets.

## Verification and remaining device checks

- `src/khmerGameEngine.test.ts`: lifecycle, all four games' win paths in both
  difficulties, loss paths, pauses, cooldowns, repeat-input protection,
  frame-rate-independent timing and corrupt local records.
- TypeScript passes; 20 engine tests pass. Browser checks cover all four games,
  countdown/pause/resume, replay and next-game navigation, five-miss scarf loss,
  race/tug wins and successful Passport saves. Local records persist after refresh.
- A 390px-wide browser preview confirms the stacked collection, all four game
  choices, Normal/Challenge controls and the playable dialog fit the viewport.
- Real low-end Android/4G performance and actual headset/controller play still
  need physical-device testing; a desktop viewport is not a hardware benchmark.
- The camera try-on and fashion features are outside this change.
