<div align="center">

# CamboVerse

**An open-source Digital Public Good for immersive Khmer heritage and Cambodia's digital economy.**

*Explore Cambodia's cultural heritage from any phone — no app, no headset, just a link.*

Stewarded by the **CamboVerse Center** (មជ្ឈមណ្ឌលខេមបូវើស) at the
**National University of Management (NUM)**, established by MoEYS Prakas, 11 July 2024.

</div>

---

## What is CamboVerse?

CamboVerse is **not** a VR metaverse. It is a **mobile-first, web-first,
low-bandwidth platform** that renders an **open 3D archive of Khmer heritage**
as explorable, educational environments — designed to run in the browser of an
ordinary Android phone over a 4G connection, opened from a shared link.

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
- 🕳️ **No VR headset required**, ever, for the core experience.
- 🧩 **Open standards only** — glTF, WebGL/WebGPU/WebXR. No vendor lock-in.
- 🌐 **Public good first** — everything ships in the open under clear licenses.
- 🎓 **Education is the engine** — building CamboVerse *is* the curriculum.
- 🙏 **Cultural respect** — heritage captured with consent, in partnership with
  APSARA and the Ministry of Culture and Fine Arts.

## Project status

🌱 **Early / greenfield.** We are in **Phase 0 (Foundation)**. Product code does
not exist yet. The current focus is the founding strategy, governance, and
standing up this repository in the open.

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

## Technology (planned)

- **Rendering:** Three.js / Babylon.js (open, standards-based) + Gaussian
  Splatting viewers; **glTF** for authored geometry.
- **Backend (v1):** static hosting + CDN. No game server.
- **Payments (later):** Bakong / KHQR (National Bank of Cambodia).

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

Established within the National University of Management by Prakas of the
Ministry of Education, Youth and Sport (MoEYS), signed by H.E. Dr. Hang Chuon
Naron on 11 July 2024, with a mandate for teaching, learning, and developing
programs to serve Cambodia's digital economy.

---

<div align="center">
<sub>ដើម្បីជាតិ • For the Nation — a public good for Cambodia and Khmer heritage worldwide.</sub>
</div>
