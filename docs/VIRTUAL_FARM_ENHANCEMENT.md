# Virtual Farm — interactive rice journey

Local enhancement, 23 October 2026. Improves the existing Farm feature without
expanding the shared-photo service, adding purchases, or changing the heritage
archive's one-temple milestone.

## Visitor experience

- Four distinct patches for ploughing, nursery sowing, transplanting and harvest.
  Repeated taps on the same patch cannot finish a stage. Field markers and named
  keyboard/touch buttons operate the same state.
- Furrows appear; nursery patches and field patches fill with plants; harvested
  patches become stubble with gathered sheaves beside the field.
- A practice gate slider changes the visible water surface. The 40–60 target
  band is an explicitly illustrative game scale, **not a field-water depth,
  irrigation schedule, or farming recommendation**.
- A grain-versus-chaff sorting exercise and four sacks moved into a raised store.
  These are simplified learning interactions, not physical farming simulations.
- Per-stage partial progress resumes from local storage. Previous/next, stage
  selection and "Continue to unfinished stage" allow non-linear learning.
- A hide/show lesson panel, expandable story, motion pause, native buttons,
  labelled range control, focus indicators, completion text and progress element.
- The completion panel can be dismissed. Passport failures offer a retry instead
  of an endless "Saving" message. A confirmed new season resets the lesson only.

## Persistence and privacy

New key: `camboverse.farm.journey.v2`. Payloads are versioned and filtered to known
stages and valid unique task IDs. Invalid data starts a fresh lesson. Storage
failures show a warning and leave the in-memory lesson playable. No user photos,
locations, plot IDs or identity tokens are stored in this new state.

The existing diary keys, sharing consent, moderation rules and community APIs are
unchanged. No real photographs were uploaded or shared as part of this work.
The existing Passport claim runs only after all stages are completed; this is a
participation credential, not verification of real agricultural work or mastery.

## Three view modes

Normal is selected for small screens and low-resource devices; the visitor can
override it. Normal has no renderer shadows, a maximum 1.25 DPR, no ambient scene
motion, cheaper rice/ground/marker geometry and the same plants, tasks and
landmarks as Ultra. Ultra uses shadows, up to 1.75 DPR and higher geometry detail.
VR forces Ultra for the session and restores the selected screen quality after
exit. WebXR remains optional. Native headset lesson controls are not added by
this update; the existing VR scene view and field pointer targets are retained.

No raster assets, external fonts or extra libraries were added. The subsequent
[3D visual upgrade](./VIRTUAL_FARM_3D.md) uses two instanced rice meshes (leaves
and mature grain), with refreshed bounds when their contents change. No new
fourth quality tier or account requirement was introduced. Actual low-end phone,
4G and headset performance remains to be measured.

## Content accuracy

The prior statement that rice is never sown straight into the field was corrected.
The lesson now explicitly represents a transplanted-rice method rather than all
rice production. Sources checked:

- [IRRI Direct Seeded Rice Consortium — What is DSR?](https://dsrc.irri.org/our-work/what-is-dsr)
- [IRRI Rice Production Manual — Plant Establishment](https://www.knowledgebank.irri.org/images/docs/planting-establishment.pdf)

Other inherited cultural notes and Khmer spellings still need Cambodian farmer,
agronomist and native-language editorial review; the lesson labels this. The
illustration is not a digital measurement of a real farm.

## Validation

Tests cover distinct tasks, stale and invalid events, partial progress on reload,
water-band validation, chaff rejection, all seven stages, unfinished-stage routing,
reset, malformed storage, quadrant-to-plant mapping, quality detection and
server-rendered accessible controls for every activity. TypeScript checks pass.
Final regression: 204 tests passed across 37 files, including 14 new Farm tests.
Interactive browser, device and headset QA was not performed in this session.

Implementation: `src/farmJourney.ts`, `src/components/FarmActivity.tsx`,
`src/components/FarmExperience.css`, and the existing `FarmView.tsx`.
