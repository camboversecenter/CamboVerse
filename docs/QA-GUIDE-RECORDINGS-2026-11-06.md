# Guide recording and replay QA

Date: 6 November 2026. Scope: existing guides across heritage sites, POIs,
history narration and campus. This is local storage/browser verification, not a
production storage or voice-quality sign-off.

## Changes checked

- Kiri's site and POI guides and Back in Time use the same recording service
  already used by Penh, campus and the VR location guide.
- English Kiri introductions save the authored site/POI/era text directly,
  without asking an AI to paraphrase it. Translated introductions retain the
  existing Anthropic provider and are saved after successful generation.
- Listen is explicit. Browsing to a new stop does not automatically synthesize
  speech. Changing site/POI/language cancels stale requests and playback.
- Fallback English is narrated as English. Mixed-script Khmer is rejected
  before being saved as a successful translated answer.
- JSON answers and WAV recordings use the existing private R2 library and
  version hashes. Arbitrary visitor questions remain outside shared text storage.

## Browser walkthrough

Used Playwright locators in the built-in browser, then a standalone Playwright
Core/Chrome script for assertions and a screenshot. The app and actual Worker
handlers ran locally with Miniflare's persistent R2 implementation.

Provider responses were **fixtures**: location notes for text and a valid silent
WAV for speech. This verifies requests, decoding, playback lifecycle, storage
and reuse. It does not verify generated-answer quality, pronunciation, audible
voice identity or live API credentials. The QA page has an explicit fixture/local
R2 banner, and no QA objects were uploaded to the cloud bucket.

| Journey | Observed result |
| --- | --- |
| Wat Phnom overview | Suggested question produced a text object; Listen produced an audio object. Repeating Listen did not call synthesis again. |
| Great Stupa, Vihara, Naga Staircase, Flower Clock, City Overlook | Selected each stop, opened Penh, requested a suggested answer and completed playback. |
| Bayon | Opened Kiri at the site and Heart of Angkor Thom; text and playback worked at both. |
| Angkor Wat | Opened Kiri at the site and Moat & Western Bridge; text and playback worked at both. |
| Ta Prohm | Opened Kiri at the site and Rajavihara; text and playback worked at both. |
| Bayon history | The Angkor Empire introduction was requested through the saved-answer route and played through the recording service. |
| Campus | Opened the Great Hall guide, requested its introduction and completed playback. |
| Normal | Switched Wat Phnom to Normal and checked the same text/playback controls. This is desktop layout/interaction evidence, not low-end phone performance. |

The initial walkthrough retained **14 JSON answers and 14 WAV recordings**.
Seven text-provider fixture calls were needed; the other seven answers came
directly from authored heritage/era text. There were 14 speech-fixture generations.

After restarting the QA Worker and reloading Wat Phnom, both `/api/guide` and
`/api/guide-voice` returned `x-guide-content-source: r2`, with **zero new text
or speech generations**. All 28 stored objects remained. Fresh Playwright browser
visits to Wat Phnom, Bayon, Angkor Wat and Ta Prohm also reused edge/R2 content
without increasing either generation counter.

Local evidence, intentionally outside Git: `tmp/guide-recording-qa/` contains
the isolated server, Playwright script, before/after restart metrics, browser
assertion result and `wat-phnom-recording.png`. Its R2 state is under ignored
`.wrangler/state/guide-playwright-fixtures/`, separate from normal dev R2 state.

## Automated coverage

- All **15 sites and 59 POIs**: authored English text and matching speech
  requests are saved, then replayed from R2 without another provider request.
- The nested Kulen waterfall study and its two stops use the same checks;
  they are a separate existing study, not a sixteenth map destination.
- All **8 eras at every site**: 120 site/era text contexts remain distinct;
  source lengths fit the narration endpoint. Browser playback checked one era.
  The waterfall study also retains eight distinct era contexts.
- Translated introductions: language separation, reuse without generation keys,
  unknown IDs, length limits and rejected mixed-script Khmer.
- Existing coverage checks notes/voice/model invalidation, conditional writes,
  edge eviction, storage failure, bounded browser memory and controller-guide
  consumers of the same narrator.
- Full suite: **493 tests passed in 102 files**, followed by **35 focused guide
  checks** after the final nested waterfall route audit.
- TypeScript and the production build passed. The existing large-chunk warning
  remains; these checks do not establish device performance.
- Publication scan passed. The two already-included files above 10 MiB still
  need the existing asset-size review; no new capture assets were added.

## Live preview limitation

The supplied live preview, `https://preview.camboverse.world`, was opened in
Playwright. It was running an older app/Worker: `/api/health` did not report
`guideStorage`, Wat Phnom still exposed the older guide UI, and a short public
welcome request to `/api/guide-voice` returned **405**. The staircase capture
also reported a load failure in that deployed version; capture repair was not
part of this recording change.

The dashboard screenshot establishes `GUIDE_STORAGE → camboverse` is bound.
It does not establish that the new recording code is deployed. The local CLI
was signed into a different Cloudflare account from the NUM dashboard, and
there was no local Gemini key. No sign-in was changed, no source was pushed,
and no deployment was performed.

Remaining live check: deploy the reviewed guide source through the existing
Git-based workflow in the correct Cloudflare account, request a standard answer
and Listen on the preview, inspect the R2 objects, then repeat from a new browser
session. Real Khmer pronunciation, headset audio and actual device performance
remain separate checks. Do not upload the local `dist/`, which may include
ignored private capture assets.

## Follow-up: NUM account and real R2 check

Later on November 6, Wrangler login was completed for the NUM Cloudflare
account. Read-only checks confirmed the `camboverse` bucket is accessible and
the deployed Worker has a `GEMINI_API_KEY` secret (its value was not retrieved).

An API-only temporary cloud preview ran the current guide handlers with the
real `GUIDE_STORAGE` bucket and a server-side reference to that existing secret.
No static assets or capture files were uploaded and the live deployment was
not replaced.

The Bayon English introduction was saved successfully. An independent remote
R2 download confirmed the JSON object at
`guide/v1/answers/9a203f3265b9d376f2d7b0a21c75b933a5928753ecc7b65f29bfef699deb85f5.json`.
Its text matches the authored Bayon introduction; a repeated API request reused
cached content. This establishes actual cloud storage, beyond the earlier local
fixture checks.

Real speech generation returned 502 at the guide endpoint. A temporary,
sanitized server-side diagnostic identified the upstream Google response:
HTTP 400, `FAILED_PRECONDITION`, **"User location is not supported for the API
use."** Model listing was rejected with the same HTTP status. The observed
Cloudflare path was HKG. Google's published availability list includes Cambodia;
this test does not establish whether the rejection is due to egress-IP
classification, the preview runtime, or the Google project/account.

A standard Singapore placement hint was tested in the isolated configuration;
the remote preview still reported HKG and the same rejection. No location
spoofing or third-party forwarding proxy was used. The temporary preview was
stopped, and the experimental configuration remains only in ignored local QA
files. This test produced no successful voice recording.

Remaining: resolve Google's supported-region/hosting configuration, then verify
actual generated WAV storage and replay. The newer guide frontend and Worker
still require the normal reviewed deployment before they appear on
`preview.camboverse.world`.
