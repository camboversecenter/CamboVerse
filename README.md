<div align="center">

<img src="public/logo.svg" alt="CamboVerse" width="420" />

# CamboVerse

**An open-source Digital Public Good for immersive Khmer heritage and Cambodia's digital economy.**

*Explore Cambodia's cultural heritage from any phone or VR headset — no install, just a link.*

Stewarded by the **CamboVerse Center** (មជ្ឈមណ្ឌលខេមបូវើស) at the
**National University of Management (NUM)**, established by MoEYS Prakas, 11 July 2024.

**Want to help build it?** → [**See the contributor task board (`TODO.md`)**](./TODO.md) — capture a temple, train a 3D model on a free GPU, write history, translate, or build on the rails. Every contribution is CC‑BY and **credited in the app**.

</div>

---

## What is CamboVerse?

CamboVerse is a **mobile-first, web-first, low-bandwidth platform** that renders
an **open 3D archive of Khmer heritage** as explorable, educational
environments — designed to run in the browser of an ordinary Android phone over
a 4G connection, opened from a shared link. It **supports both VR and non-VR**:
immersive on a headset through open **WebXR**, and fully usable without one. A
headset is never *required* — we embrace open-standard VR as an enhancement, not
the discredited walled "VR metaverse" of 2021.

It is built as a **Digital Public Good**: open source, open data, open
standards — and built by NUM students as part of their curriculum, so that
creating CamboVerse also trains Cambodia's next generation of immersive-tech
talent.

## Two public goods

| Public good | What it is | License |
|---|---|---|
| **Open Khmer Heritage Archive** | Openly-licensed 3D capture data (Gaussian splats, glTF meshes, textures, provenance metadata) that anyone can build on | `CC-BY-4.0` |
| **CamboVerse Viewer / Platform** | The open-source experience layer that renders the archive | `Apache-2.0` |

## Design principles

- 📱 **Runs on a ~$150 Android phone over 4G** — a hard requirement, not a goal.
- 🔗 **Zero install** — opens from a web link (Facebook / Telegram / anywhere).
- 🥽 **Both VR and non-VR** — immersive on a WebXR headset, fully usable on an
  ordinary phone; a headset is never *required* to access content.
- 🧩 **Open standards only** — glTF, WebGL/WebGPU/WebXR. No vendor lock-in.
- 🌐 **Public good first** — everything ships in the open under clear licenses.
- 🎓 **Education is the engine** — building CamboVerse *is* the curriculum.
- 🙏 **Cultural respect** — heritage captured with consent, in partnership with
  APSARA and the Ministry of Culture and Fine Arts.

## Project status

🌱 **Phase 0 (Foundation).** The founding strategy and governance are in place,
and the repository now hosts the **first product code**: a deployable
rendering-stack prototype (see [Getting started](#getting-started)). It is a
mobile-first Vite + React + Three.js viewer on Cloudflare Workers, currently
rendering a placeholder model — the next step is loading a real glTF /
Gaussian-splat capture and validating performance on low-end Android.

**First milestone (north star):** one Khmer temple or courtyard, photoreal, that
opens in a mobile browser from a link, runs smoothly on low-end Android, with an
"explore + information hotspots" experience — and whose capture data becomes the
first entry in the Open Khmer Heritage Archive.

## Roadmap at a glance

| Phase | Focus |
|---|---|
| **0 — Foundation** *(now)* | Strategy, governance, licenses, public repo, stack prototype, APSARA/Culture outreach |
| **1 — First Temple** | Capture + optimize one site; ship the mobile-web viewer; publish first open dataset |
| **2 — Archive & Education** | More sites; curriculum integration; DPG registration; first grant |
| **3 — Platform Features** | Optional lightweight presence; guided tours; Khmer/English; Bakong donations |
| **4 — National Platform** | Broader digital-economy use cases; replication to other universities |

See [`STRATEGY.md`](./STRATEGY.md) for the full technical & strategic framework.

## Documentation

**Vision & platform**
- [`STRATEGY.md`](./STRATEGY.md) — the delivery strategy, governance, and technical framework.
- [`PLATFORM_CHARTER.md`](./PLATFORM_CHARTER.md) — what CamboVerse **is and isn't**: Cambodia's cultural **Digital Public Infrastructure**, the **Digital‑to‑Physical (D2P)** model, and the staged building plan.
- [`ARCHITECTURE.md`](./ARCHITECTURE.md) — the open **rails** (identity, assets, entitlements, learning credentials, experiences, D2P fulfillment) that ecosystem apps build on; Web2 now, Web3‑ready.
- [`docs/API.md`](./docs/API.md) — the **`/v1` API reference**: the concrete HTTP contract for the rails that startups, schools, and museums build against.
- [`DIGITAL_ECONOMY.md`](./DIGITAL_ECONOMY.md) — the geo‑aware **Digital‑to‑Physical commerce** reference (order virtually → delivered locally).

**Growing the heritage commons** *(capture pipeline)*
- [`docs/CAPTURE.md`](./docs/CAPTURE.md) — turning a real site into an asset (photogrammetry / 3DGS → glTF / `.splat`), with the licensing and mobile‑budget rules.
- **Site field guides** — on‑the‑ground, per‑temple capture guides (what to shoot, when to go, access & consent, hazards): [Wat Phnom](./docs/CAPTURE_WATPHNOM.md) · [Bayon](./docs/CAPTURE_BAYON.md) · [Ta Prohm](./docs/CAPTURE_TAPROHM.md) · [Banteay Srei](./docs/CAPTURE_BANTEAYSREI.md) · [Preah Vihear](./docs/CAPTURE_PREAHVIHEAR.md) · [Royal Palace](./docs/CAPTURE_ROYALPALACE.md).
- [`docs/TRAIN_3DGS_KAGGLE.md`](./docs/TRAIN_3DGS_KAGGLE.md) — training a 3D Gaussian Splatting model **for free on Kaggle**.

**Build on CamboVerse** *(for ecosystem apps)*
- [`docs/API.md`](./docs/API.md) — the `/v1` rails contract (also linked above).
- [`sdk/`](./sdk/) — a tiny **dependency‑free JS SDK** wrapping the rails (browser + Node), so partners don't hand‑roll `fetch`.
- [`examples/treasure-hunt/`](./examples/treasure-hunt/) — a **reference partner app**: one self‑contained HTML file that composes every rail end‑to‑end (scene → learning credentials → a real local reward).

**Features**
- [`docs/AI_GUIDE.md`](./docs/AI_GUIDE.md) — **Kiri**, the multilingual AI tour guide (setup, grounding, roadmap).
- **Khmer Alphabet Classroom** — every Khmer letter as a 3D tile in both the **Normal** and **Moul** shapes (embedded Google Khmer fonts), viewable in 3D and VR. Help grow it via the [task board](./TODO.md#grow-the-khmer-alphabet-classroom).

**Contributing & agents**
- [**`TODO.md`**](./TODO.md) — **the contributor task board**: capture a temple, train 3DGS, author POIs & history, translate, or build on the rails. Every contribution is CC‑BY and credited in the app. **Start here to help.**
- [`CONTRIBUTING.md`](./CONTRIBUTING.md) · [`CODE_OF_CONDUCT.md`](./CODE_OF_CONDUCT.md) · [`AGENTS.md`](./AGENTS.md) (orientation for AI coding agents).

## Technology

The v1 stack, chosen to honor the "low-end Android over 4G" constraint:

| Layer | Choice |
|---|---|
| Client | Mobile **web** (SPA), zero install |
| Build / dev | **Vite** + official `@cloudflare/vite-plugin` (runs against the real Workers runtime locally) |
| UI | **React** 18 |
| 3D | **Three.js** via `@react-three/fiber` + `drei` |
| Hosting | **Cloudflare Workers** + static assets — no game server for v1 |

Planned: **Gaussian Splatting** viewers and **glTF** authored geometry for the
photoreal captures; **Bakong / KHQR** (National Bank of Cambodia) for the later
optional payments layer.

## Getting started

Requires **Node.js 20+** (22 recommended) and npm.

```bash
npm install        # install dependencies
npm run dev        # Vite + workerd dev server at http://localhost:5173
```

Open the URL on your machine — or, to test the hard requirement, on a phone.

### Install as an app (PWA)

CamboVerse is a **Progressive Web App**: it ships a web manifest
(`public/manifest.webmanifest`), a full icon set (`public/icons/`), and a
service worker (`public/sw.js`) for installability and basic offline support.
On a production build, phones and desktops can "Add to Home Screen" / "Install"
and launch it fullscreen like a native app — no app store. (The service worker
is registered only in production builds, so `npm run dev` stays hot-reloadable.)

### Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Local dev server on the Workers runtime |
| `npm run build` | Type-check (`tsc -b`) and build the app + Worker to `dist/` |
| `npm run preview` | Preview the production build locally |
| `npm run deploy` | Build and deploy to Cloudflare Workers |
| `npm run typecheck` | Type-check without building |
| `npm run cf-typegen` | Regenerate Worker binding types from `wrangler.jsonc` |

### Deploying

```bash
npx wrangler login   # one-time
npm run deploy       # builds, then publishes to <name>.workers.dev
```

Worker/asset configuration lives in [`wrangler.jsonc`](./wrangler.jsonc). A
successful deploy prints a live `*.workers.dev` URL — a shareable link is the
Phase 1 success metric.

### Project layout

```
index.html                 # SPA entry
src/
  main.tsx                 # React root
  App.tsx                  # HUD + viewer composition
  index.css                # full-viewport, mobile-first styles
  components/
    Viewer.tsx             # r3f canvas, camera, controls, lighting, hotspot
    HeritagePlaceholder.tsx# primitive stand-in for a real capture
  worker/
    index.ts               # Cloudflare Worker (static assets + /api/health)
vite.config.ts             # Vite + React + Cloudflare plugin
wrangler.jsonc             # Worker / assets configuration
```

## Contributing

CamboVerse is built in the open, largely by NUM students as coursework,
capstones, and theses — and we welcome external contributors too. Start with
[`CONTRIBUTING.md`](./CONTRIBUTING.md) and our
[`CODE_OF_CONDUCT.md`](./CODE_OF_CONDUCT.md). Look for issues labeled
**`good first issue`**.

## For AI agents

If you are an AI coding agent, read [`AGENTS.md`](./AGENTS.md) first for
orientation, then [`STRATEGY.md`](./STRATEGY.md) for full context.

## Licensing

- **Code:** [Apache License 2.0](./LICENSE)
- **Heritage data, content, and documentation:** Creative Commons Attribution
  4.0 (`CC-BY-4.0`) unless noted otherwise.

## About the CamboVerse Center

The CamboVerse Center was **initiated by H.E. Dr. Hor Peng, Rector of the
National University of Management (NUM)**.

Established within the National University of Management by Prakas of the
Ministry of Education, Youth and Sport (MoEYS), signed by H.E. Dr. Hang Chuon
Naron on 11 July 2024, with a mandate for teaching, learning, and developing
programs to serve Cambodia's digital economy.

---

<div align="center">
<sub>ដើម្បីជាតិ • For the Nation — a public good for Cambodia and Khmer heritage worldwide.</sub>
</div>
