# Location guide preview: staircase and meeting room

Local review only. No deployment, account change, new provider subscription or
photo upload was performed.

The active local review server runs with
`npm exec vite -- --config output/guide-preview/vite.config.ts`. It serves the
frontend and real guide/health Worker handlers without requiring the cloud
runtime's network bootstrap. Other backend features are outside this preview.

## Open the previews

- Staircase: local app → Wat Phnom → Naga Staircase → Walk the real staircase →
  Ask Kiri.
- Meeting room: `http://127.0.0.1:5173/?view=360-test` → Ask Kiri. Change photo
  positions through arrows or the locations list; the open guide follows the
  selected stop and clears the previous stop's conversation.

The compact non-modal panel supports suggested questions, typed questions,
source links, minimizing and reopening. It adds no geometry to either scene.
This first preview uses English text, with no automatic microphone or audio.

## Clickable objects and narration

The staircase has Naga balustrade and Guardian lion markers, using estimated
world positions. The room has individually annotated screen/table markers
across the 27 photos, plus entrance markers where the doorway is identifiable.
Screen markers are omitted from photos 051–055, where the display is unclear.
Room anchors use each panorama's orientation; they appear only after that
photo is loaded. These annotations are not measured geometry.

Tap an object to open its description and source. **Listen** starts English
browser narration; **Stop narration**, closing the card, changing photo or
opening another object cancels it. Availability depends on the device's speech
service; text stays available when speech is unsupported or fails.
**Ask Kiri about this** opens the guide with the selected object's fixed notes.
Object IDs are checked on the server against the current experience/photo.
Questions about an object's date do not inherit the temple's founding date.

These first object cards/markers are flat-screen UI; immersive headset object
selection is not implemented. They add no textures or scene geometry. Existing
Normal/Ultra rendering and tour navigation remain available.

## Grounding and truthful fallback

`src/locationGuide.ts` defines server-owned context for the Naga Staircase and
all 27 existing room photo IDs. The staircase history note cites the National
Museum of Cambodia's Streetscapes page. The traditional founding of Wat Phnom
is distinguished from the construction date of the currently visible stairs.
Capture notes explain incompleteness; religious symbolism and exact sculpture
dates are not invented.

Room notes describe visible features and the photo-tour controls. No verified
room construction date, architect or institutional history has been supplied.
The guide explicitly leaves those questions unanswered. Room context never
inherits temple history.

`POST /api/guide` accepts `experienceId` and `locationId` for this preview; the
Worker resolves these IDs from the fixed registry and rejects unknown locations.
The browser does not submit authoritative context or upload photos to the model.
The existing legacy site/era guide requests continue through their old handler.

With the existing server-side `ANTHROPIC_API_KEY` connection configured, the new
handler uses the project's existing provider/model to answer from the selected
location's notes. Client-side keys are never used. Without that connection, or
when the endpoint/provider fails, the UI uses bounded local FAQ answers and
labels each response **Saved location notes**. A live answer is labeled
**Kiri · AI answer**. An unsupported saved-note question receives an unknown
answer instead of a fabricated model response.

The reviewed local run displayed Saved location notes. Live external generation
was not verified. Provider success/failure branches are covered with mocked
responses in tests; that is not evidence of a live provider connection.

## Validation

- Browser: both panels, suggested and typed questions, sourced Wat Phnom history,
  unknown room history, room entrance → display stop context changes, minimize
  and reopen. Capture walking/looking remains outside the panel.
- Automated: fixed location IDs, separation of room/temple facts, unknown
  questions, no-key fallback, input validation, server-side grounding and
  provider failure fallback; existing panorama and walking checks also run.
- Build and TypeScript checks run locally. Physical low-end Android/4G and
  headset UI testing remain outstanding; flat-screen layout checks do not
  establish those acceptance criteria.
