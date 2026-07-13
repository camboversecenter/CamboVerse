# AGENT.md

Context file for AI agents (Claude Code and others) working in this repository.
Read this first, then read [`STRATEGY.md`](./STRATEGY.md) for full detail.

---

## What this project is

**CamboVerse** is a government-sanctioned, university-stewarded, **open-source
Digital Public Good (DPG)** that makes Cambodia's cultural heritage explorable
from any phone via a web link — and trains NUM students to build immersive
technologies while doing it.

- **Established by:** MoEYS Prakas, signed by H.E. Dr. Hang Chuon Naron, 11 July 2024.
- **Steward:** CamboVerse Center (មជ្ឈមណ្ឌលខេមបូវើស), National University of
  Management (NUM), Cambodia.
- **Mandate:** teaching/learning to serve the digital economy; the Center
  reports to MoEYS quarterly, semi-annually, and annually.
- **Repository status:** early/greenfield. `STRATEGY.md` is the founding
  document; product code does not exist yet.

## The one-sentence mental model

> Not a VR metaverse. A **mobile-first, web-first, low-bandwidth** platform that
> renders an **open 3D archive of Khmer heritage** as explorable environments,
> built as a **public good** by students as curriculum.

## Two public goods (don't conflate them)

1. **Open Khmer Heritage Archive** — openly-licensed 3D capture data (Gaussian
   splats, glTF meshes, textures, provenance metadata). License: **CC-BY**
   (revisit CC-BY-SA).
2. **CamboVerse Viewer / Platform** — the open-source experience layer that
   renders the archive. License: **Apache-2.0**.

---

## Hard constraints (do not violate without explicit approval)

- **Target device:** a ~$150 Android phone on 4G, in a browser. "Runs on
  low-end Android over 4G" is a hard acceptance criterion.
- **Zero install for v1:** opens from a shared web link (Facebook/Telegram).
  No app-store dependency.
- **No VR headset dependency.** Ever, for the core experience.
- **Open standards only:** glTF, WebGL/WebGPU/WebXR, open splat formats. No
  vendor lock-in — this is national infrastructure.
- **Ship in the open from commit #1:** clear licenses, real `CONTRIBUTING`,
  public issues. "Open in name only" is a project-killing failure mode.
- **Respect scope:** the v1 milestone is ONE temple. Resist expanding it.

## Decisions already made (v1)

| Area | Decision |
|---|---|
| Client | Mobile **web**, zero install |
| Rendering engine | **Three.js** or **Babylon.js** (open, standards-based) — confirm via prototype |
| Photoreal capture | **Gaussian Splatting** + photogrammetry; **glTF** for authored geometry |
| Multiplayer (v1) | **None** — single-user exploration |
| Backend (v1) | Static hosting + CDN, **no game server** |
| Payments | **Bakong / KHQR**, later phase only — not in v1 |
| Code license | **Apache-2.0** |
| Data/content license | **CC-BY** |

## Explicitly OUT of scope for v1

Real-time multiplayer, VR support, avatars/social systems, user-generated-content
tooling, in-world economy/payments, native mobile apps. Each is a *later phase*,
not the foundation.

## The first milestone (north star)

One temple/courtyard, photoreal, opens in a mobile browser from a link, runs
smoothly on low-end Android, "explore + information hotspots," no login/multiplayer/
payments. Its capture data becomes the first entry in the Open Khmer Heritage Archive.

---

## How work gets done here

- **Students are the engine.** Contributions are scoped as coursework/capstones/
  theses. Keep issues sized to student skill levels with clear "good first issue"
  paths. Building the platform IS the curriculum (satisfies the MoEYS mandate).
- **Public, PR-based workflow.** Everything reviewable in the open.
- **Every phase yields a demonstrable artifact** (a link, a dataset, a DPG
  registration, a curriculum module, a grant) that feeds MoEYS reports.

## Positioning & language (important for any external-facing text)

- Lead with **"explore Khmer heritage from anywhere"** and **"digital
  preservation,"** NOT "VR metaverse" (a discredited, poorly-fitting framing).
- Frame as a **Digital Public Good** executing national policy, not a startup.
- Be culturally respectful: heritage is captured with consent and in
  partnership with APSARA / Ministry of Culture.

## Things to verify, never invent

- **Exact policy titles, legal citations, and institutional relationships** —
  the Center is the authoritative source. Mark assumptions; don't fabricate.
- **Khmer-language content** — draft, but flag for native review.
- **Heritage site access/permissions** — gated on real APSARA/Ministry of
  Culture cooperation, not assumable.

---

## Repository conventions

- **Working branch:** `claude/camboverse-technical-strategy-6scp4c` (do not push
  elsewhere without explicit permission).
- **Git identity / commit trailers:** follow the existing commits in this repo.
- **Do NOT open a pull request** unless the user explicitly asks.
- Keep strategy/product decisions consistent with `STRATEGY.md`; if a change
  contradicts it, update `STRATEGY.md` in the same change and call it out.

## Key files

| File | Purpose |
|---|---|
| `STRATEGY.md` | Founding technical & strategy framework (full detail, layered for government / contributors / funders) |
| `AGENT.md` | This file — orientation for AI agents |

## Glossary (fast reference)

- **DPG** — Digital Public Good (UN-endorsed registry: Digital Public Goods Alliance).
- **Gaussian Splatting** — efficient photoreal 3D capture/render, mobile-friendly.
- **glTF** — open standard for 3D assets on the web.
- **Bakong / KHQR** — National Bank of Cambodia's interoperable payment system.
- **APSARA National Authority** — manages/protects the Angkor site.
- **MoEYS** — Ministry of Education, Youth and Sport. **NUM** — National University of Management.
