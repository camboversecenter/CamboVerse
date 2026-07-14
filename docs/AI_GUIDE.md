# AI Tour Guide — "Kiri" the monkey

Kiri is CamboVerse's in‑world tour guide: a friendly monkey mascot who narrates
each point of interest, answers questions, and speaks in multiple languages —
by text and (where the device supports it) voice.

## How it works

- **Mascot** — `src/components/GuideMascot.tsx`. Original CC‑BY artwork drawn as
  an inline SVG, animated with CSS (idle bob / talking chatter / pointing). Tiny
  and smooth on low‑end phones; no images to download. He wears a Cambodian
  *krama* scarf.
- **Panel** — `src/components/TourGuide.tsx`. Language picker (English, ខ្មែរ,
  Français, 中文), narration text, on‑device speak/stop, and an "Ask Kiri" box
  with an optional microphone. Steps through a site's POIs with the visitor.
- **Voice** — `src/lib/voice.ts`. Uses the browser's built‑in Web Speech API
  (text‑to‑speech + speech recognition). Free, on‑device, no external service.
  English/French/Chinese voices are widely available on Android; **Khmer TTS is
  patchy**, so the panel degrades to text‑only when no voice is present.
- **Brain** — `POST /api/guide` in `src/worker/index.ts`. Grounds the model in
  our own per‑POI facts (`src/spots.ts`) so answers stay accurate, and replies
  in the chosen language.

## Grounding & safety

The Worker builds the model's context only from the site/POI facts we author, and
instructs Kiri to say when he is unsure rather than invent. This keeps the guide
factual and on‑topic — important for a national heritage Digital Public Good.

## Enabling live answers (API key)

Without a key the endpoint returns the **static POI facts** (`fallback: true`),
so the experience works everywhere out of the box. To enable live, multilingual
AI answers, provide an Anthropic API key as a Worker secret:

```sh
# Production (Cloudflare):
npx wrangler secret put ANTHROPIC_API_KEY

# Local dev — create .dev.vars (git‑ignored):
echo 'ANTHROPIC_API_KEY=sk-ant-...' > .dev.vars
```

The guide uses `claude-haiku-4-5` for fast, low‑cost replies suited to mobile.
No key or PII is ever sent to the browser; the key lives only in the Worker.

## Roadmap (not in this change)

- **Real photo gallery** per POI (visitor‑supplied captures; sample placeholders
  first). Every image tracked with its licence + attribution.
- **Cloudflare D1** to hold the photo catalogue, per‑POI facts + translations,
  and lightweight analytics — so content can change without a redeploy.
- Optional cloud TTS for guaranteed Khmer audio.
