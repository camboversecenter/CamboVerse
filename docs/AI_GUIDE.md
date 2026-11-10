# AI Tour Guide "Kiri" the monkey

Kiri is CamboVerse's in‑world tour guide: a friendly monkey mascot who narrates
each point of interest, answers questions, and speaks in multiple languages  
by text and (where the device supports it) voice.

## How it works

- **Mascot** `src/components/GuideMascot.tsx`. Original CC‑BY artwork drawn as
  an inline SVG, animated with CSS (idle bob / talking chatter / pointing). Tiny
  and smooth on low‑end phones; no images to download. He wears a Cambodian
  *krama* scarf.
- **Panel** `src/components/TourGuide.tsx`. Language picker (English, ខ្មែរ,
  Français, 中文), narration text, explicit Listen/Stop, and an "Ask Kiri" box
  with an optional microphone. Steps through a site's POIs with the visitor.
- **Voice** `src/lib/guideNarrator.ts`. Kiri, Penh, campus guides and history
  narration use the shared saved-recording service. Speech is requested on
  Listen, not automatically while browsing. `src/lib/voice.ts` supplies browser
  TTS fallback and optional speech recognition; availability depends on the
  device, and Khmer fallback voices are not reliable on every device.
- **Brain** `POST /api/guide` in `src/worker/index.ts`. Grounds the model in
  our own per‑POI facts (`src/spots.ts`) so answers stay accurate, and replies
  in the chosen language.

## Grounding & safety

The Worker builds the model's context only from the site/POI facts we author, and
instructs Kiri to say when he is unsure rather than invent. This keeps the guide
factual and on‑topic important for a national heritage Digital Public Good.

## Enabling live answers (API key)

English site/POI/era introductions use the exact authored facts and are saved
in the shared R2 text library without an AI paraphrasing call. Existing recorded
text/audio can also be served without generation keys. New translated Kiri
introductions and free-form Kiri answers use the existing Anthropic provider;
without its key they fall back to English notes with the correct narration
language. To enable those live answers, provide an Anthropic Worker secret:

```sh
# Production (Cloudflare):
npx wrangler secret put ANTHROPIC_API_KEY

# Local dev create .dev.vars (git‑ignored):
echo 'ANTHROPIC_API_KEY=sk-ant-...' > .dev.vars
```

Kiri uses `claude-haiku-4-5-20251001`. Keys remain in the Worker. Visitor
questions go to the relevant AI provider when generation is requested; they
are not stored as shared question records. Requested audio may be retained for
reuse in the private recording bucket.

## Wat Phnom: reuse answers and recordings

Wat Phnom's **Penh** guide uses `LocationGuide` on phones/desktop and
`VRCaptureGuide` in VR. These use Gemini, separately from the older Kiri route:

- Text: `gemini-3.5-flash-lite`, configured with `GEMINI_API_KEY` on the Worker.
- Speech: `gemini-3.8-flash-lite-tts` through `POST /api/guide-voice`. Speech is
  generated only when the visitor requests Listen; browser TTS remains a fallback.
- The Suno song is separate media. The speaking voice is an approximation, with
  an optional server-configured `PENH_VOICE_ID`.

This storage path is also used by the campus guide, other heritage sites'
Kiri guides, their POIs and Back in Time narration. The province song/profile
collection remains a media preview, not a new live chatbot for all 25 avatars.

Repeated Listen replays a completed recording in the current guide without an
API request. This local memory cache holds at most eight recordings / 8 MiB,
evicts the least recently used recording and clears when the guide is disposed.
Encoded bytes are retained rather than multiple decoded audio buffers.

The Worker saves generated speech in the private R2 bucket bound as
`GUIDE_STORAGE`. Recordings have no application expiry and are retained until
deleted or removed by an account-level bucket lifecycle rule. The edge cache
can expire without losing the recording: a cache miss checks R2 before Gemini.
The key hashes the exact trimmed text, language, persona, resolved voice, model
and synthesis settings. Changing any of these creates a new recording. Keys
contain no readable text or API credentials. An API key is needed to generate
new content; existing R2 recordings can be served without a generation key.

Answers to the authored suggested questions (and location introductions) are
also kept in R2 as small JSON objects. Their keys include the actual model request:
location/object notes, sources, question, language and prompt/settings. Updating
the notes or prompt automatically selects a fresh answer. Free-form visitor
questions are not stored in this shared answer library; their returned speech can
still reuse an identical recording. Errors, invalid audio, rejected Khmer and
saved-note fallback answers are not cached as successful generated content.
Kiri's English authored introductions are deliberately saved as authored text;
these are not error fallbacks.

Requests arriving together in the same Worker isolate share a generation while
it is pending. Conditional R2 writes preserve the first saved version when
concurrent isolates generate different wording. This does not guarantee a
single generation globally during simultaneous first requests.

Cloudflare's edge cache is a speed layer (speech up to 30 days, answers up to
seven days); its expiry does not expire R2 objects or force new generation.
An edge-only recording can be promoted into R2 without regeneration. If R2
temporarily fails, the Worker logs a generic warning, serves available content,
and uses the temporary cache; later requests retry the save. Without an R2
binding, the earlier temporary-cache behavior remains available. See
[Cloudflare Cache API](https://developers.cloudflare.com/workers/runtime-apis/cache/).

Maintenance: bump the `revision` in the relevant Worker cache identity to force
regeneration when behavior changes outside the hashed payload. Reopen the guide
or reload the page to clear active-guide recordings after a voice change.
These changes apply on the next normal application deployment; they do not
upload existing local capture assets or publish a release themselves.

### Connect the existing R2 bucket

The root `wrangler.jsonc` declares:

```json
"r2_buckets": [
  { "binding": "GUIDE_STORAGE", "bucket_name": "camboverse" }
]
```

Deploy the reviewed source through the normal Git-based Cloudflare workflow.
Wrangler connects that binding to the existing bucket in the deployment
account. For a dashboard-managed Worker, the equivalent binding is:
Workers & Pages → CamboVerse Worker → Bindings → Add binding → R2 bucket;
variable name **GUIDE_STORAGE**, bucket **camboverse**. The deployed code must
also include the new storage implementation; a binding alone does not save audio.

- Keep the bucket private. Native Worker bindings do not require an R2 API
  access key, a public `r2.dev` URL, a custom domain or browser CORS settings.
- Keep `GEMINI_API_KEY` as a Worker secret for new answers and recordings.
- Do not apply an object-expiration rule to `guide/v1/` if recordings should be
  retained. The application does not create lifecycle rules or auto-delete old
  versions. Old versions may be manually reviewed and deleted later.
- Objects appear after successful generation: `guide/v1/answers/<hash>.json`
  and `guide/v1/speech/<hash>.wav`. The same bucket holds the small answer
  records, so this feature needs no D1 migration or additional database.
- `/api/health` reports `guideStorage: "r2"` when the binding is present. This
  checks configuration only; an actual generation/replay verifies storage access.
  POST responses expose `x-guide-content-source`: `generated`, `edge` or `r2`.
- `npm run dev` uses a local, persistent R2 simulation under ignored
  `.wrangler/` state. It does **not** write to the bucket shown in the Cloudflare
  dashboard. No `remote: true` binding is enabled by this change.
- Do not upload local `dist/`: it can contain private captures. Use the existing
  [publishing workflow](LOCAL-PUBLISHING.md).

See the official [R2 Workers setup](https://developers.cloudflare.com/r2/get-started/workers-api/)
and [binding/API reference](https://developers.cloudflare.com/r2/api/workers/workers-api-reference/).

## Roadmap (not in this change)

- **Real photo gallery** per POI (visitor‑supplied captures; sample placeholders
  first). Every image tracked with its licence + attribution.
- **Cloudflare D1** to hold the photo catalogue, per‑POI facts + translations,
  and lightweight analytics so content can change without a redeploy.
- Review Khmer pronunciation and the speaking voice on actual devices; cloud
  TTS is already implemented for the location guide above.
