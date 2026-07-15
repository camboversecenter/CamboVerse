# CamboVerse — Platform Charter & Building Plan

*Cambodia's Cultural Digital Public Infrastructure (DPI).*

This document captures what CamboVerse **is**, the principles that bound it, the
architecture that keeps it open and future-proof, and the stages by which we
build it. It is the reference every contributor, partner startup, and funder
should read first.

---

## 1. What CamboVerse is — and is not

**CamboVerse is a Digital Public Good (DPG): open, university- and
government-stewarded public infrastructure for Khmer heritage and culture.** It
provides three public things and nothing more:

1. an open, licensed **cultural commons** (heritage as 3D/AR/VR, with provenance),
2. a small set of open **rails** (identity, assets, experiences, learning), and
3. a **trust & governance** layer (licensing, cultural consent, certification).

**CamboVerse is NOT a business.** It does not sell products, run games, mint
tokens, take a cut of trade, or compete with anyone — physical *or* digital. The
businesses are built by **independent startups around CamboVerse**, on its open
rails. CamboVerse stays neutral, trusted, and free.

> Model analogy: **Digital Public Infrastructure** like India's "Stack" — public
> identity and payment rails on which thousands of private companies built. Here
> the rails are *cultural*: identity, a heritage commons, and experiences.

---

## 2. The core principle: Digital-to-Physical (D2P)

**CamboVerse does not replace the physical economy — it pushes it.** Every
digital experience is a doorway to real-world economic activity for Cambodians.
Success is measured by **physical uplift**, not screen time or token speculation.

| Digital action on CamboVerse | Physical economy it pushes |
|---|---|
| Explore a heritage site virtually | Real trips, bookings, local guides, hotels, transport |
| Buy in a virtual market | Real food/goods **delivered by a local merchant** in the visitor's country |
| Learn/own a cultural asset (instrument, craft, fashion) | Real purchases from Khmer artisans and crafters |
| Earn a learning credential | Real skills, school engagement, employability |
| Treasure hunt / quest at a site | Real footfall and spending at that site and town |
| Enjoy virtual dance / music | Real performance tickets, lessons, artist commissions |
| Digital-twin farm | Real farm funding, inputs, and produce sales |
| Personal museum of achievements | Real job-market signalling and recruitment |

The **geo-aware fulfillment** already prototyped (order virtually → delivered
from a merchant in the buyer's own country) is the first working D2P bridge.

---

## 3. Guiding principles (the constitution)

1. **Public good first.** Core content is CC0/CC-BY; essential access is free
   forever. We never gate identity, learning, or basic participation behind a
   purchase. (Monetise the collector/creator/premium layer — in the ecosystem,
   not the core.)
2. **Money-neutral core.** CamboVerse holds no currency and no tokens. At most it
   issues **non-monetary** learning/achievement credentials. All value, payments,
   and tokens live in the ecosystem.
3. **Digital-to-Physical.** Every feature should have a real-world economic
   pathway. If it only creates screen time, it is out of scope.
4. **Chain-neutral & Web3-ready.** Web2 now. Asset and identity metadata are
   authored to be tokenization-ready, so startups can mint on any chain later.
   CamboVerse itself never mints or transacts crypto. Web3 is optional and lives
   in the ecosystem.
5. **Cultural integrity & consent.** Every cultural asset records provenance and
   the consent of its stewards (APSARA / Ministry of Culture, artists, monastic
   communities for sacred content). Sacred material is handled with special care.
6. **Inclusive & low-end-first.** Must run on a ~$150 Android over 4G. Khmer
   language is first-class.
7. **Interoperable.** One portable identity and one shared commons, recognised
   across every ecosystem app — that shared world is the network effect.

---

## 4. Architecture: public core vs. ecosystem

```
┌──────────────── ECOSYSTEM (independent startups; commerce, GameFi, NFTs, crypto) ─────────────┐
│  Treasure Hunt · AR Textbook · Instruments · Dance · Museum · Villa · Farm · KhmerFi · …       │
│  bring: their products, payments, tokens, and the businesses                                   │
├──────────────────────────── OPEN RAILS (CamboVerse public core) ──────────────────────────────┤
│  Identity/Avatar  │  Asset + Entitlement  │  Experience runtime / SDK  │  Learning credentials  │
│  (portable "you") │  (schema + provenance)│  (WebXR/3D + scene format) │  (non-monetary)        │
│  D2P Fulfillment interface (bookings · delivery · ticketing → real providers)                   │
├──────────────────────────────── CULTURAL COMMONS (open, licensed) ────────────────────────────┤
│  Heritage sites · history · dance · music · Khmer letters · architecture · tools · …            │
├──────────────────────────────── TRUST & GOVERNANCE ───────────────────────────────────────────┤
│  Licensing · cultural consent/provenance · "Verified Khmer Heritage" certification              │
├──────────────────────────────── DATA / ADAPTERS ──────────────────────────────────────────────┤
│  Cloudflare D1 + R2 today    ⇄    (future) chain indexer + wallet + IPFS/Arweave (ecosystem)    │
└───────────────────────────────────────────────────────────────────────────────────────────────┘
```

### The five primitives as open interfaces

| Primitive | CamboVerse (public core) | Startups (ecosystem) |
|---|---|---|
| **Identity / Avatar** | open, portable ID + avatar standard ("Login with CamboVerse") | authenticate against it |
| **Asset** | the commons + open schema + provenance/consent | register, extend, and **tokenize** their own |
| **Entitlement** | the interface (own / view / use / **rent**) + reference | implement ownership (DB now, chain later) |
| **Value** | **none** — at most a non-monetary learning credential | currencies, points, tokens, marketplaces |
| **Experience** | engine + scene/asset format | build the games, museums, villas, farms |
| **D2P Fulfillment** | the standard (booking/delivery/ticketing request) | connect to real merchants, guides, logistics |

**The golden rule:** ecosystem apps talk only to these interfaces — never
directly to a database or a blockchain. When Web3 arrives, we implement chain
adapters *behind* the same interfaces; apps do not change.

---

## 5. The ecosystem: startups build the businesses

The originally-imagined modules become **startup opportunities on the rails**,
each with a clear D2P pathway. CamboVerse provides commons + rails + certification;
the startup provides the product, payments, and (later) tokens.

| Module (startup) | Rails it uses | Physical economy it pushes |
|---|---|---|
| Treasure-Hunt GameFi | Assets, Entitlement, Quest, Learning | Tourism footfall & spend at real sites |
| Immersive AR Textbook | Assets, Entitlement, Experience, Learning | School engagement, edtech, jobs |
| Tokenized Khmer Instruments | Assets, Entitlement, Experience | Instrument & music sales, artist income |
| KhmerFi (letters, language) | Assets, Learning, Quest | Literacy, edtech, teacher income |
| Kun Khmer GameFi | Experience, Quest, Value | Gyms, events, athlete/brand sponsorship |
| Virtual Personal Museum | Identity, Assets, Entitlement | Recruitment, credentials, job market |
| 3D Avatar / Identity apps | Identity | Fashion, cosmetics, creator economy |
| Renting marketplace | Entitlement (rent), Value | Creator/asset-owner income |
| Digital-Twin Farm | Identity, Value, D2P (sibling vertical) | Farm funding, inputs, produce sales |
| Meditation Villa | Experience, Assets, AI | Wellness tourism, teachers, retreats |
| Dance / Cake / Fashion / House / Tools | Assets, Experience | Performances, artisans, tourism, crafts |

---

## 6. What exists today (the foundation)

We have already built the seed of the core:

- **Flagship DPG experience** — Cambodia map with real province boundaries;
  Angkor Wat and Wat Phnom as walkable/aerial destinations with second-level
  teleport, guided tour, first-person and **VR** modes. → *Cultural Commons +
  Experience runtime.*
- **Kiri, the AI guide** — multilingual narration, grounded in our facts. → *AI
  service atop the commons.*
- **"Back in Time"** — the history of Cambodia by era, tied to each site. →
  *Learning content; fuel for Treasure-Hunt quests.*
- **Digital-economy reference app** — a virtual market with **geo-aware
  fulfillment** (order virtually → delivered locally). → *Reference
  implementation of the D2P Fulfillment rail (an example for startups, not a
  CamboVerse business).*
- **Capture → 3DGS → CC pipeline + provenance docs** — how the commons grows.

Re-labelled under this charter: the heritage experience is **CamboVerse's own
flagship public showcase**; the shop is a **reference implementation** of a rail,
demonstrating to startups how to build D2P commerce.

---

## 7. Building stages

> Sequencing rule: **standards and rails before features.** The value of a
> platform is stable, open interfaces — not more demos.

- **Stage 0 — Foundation (current).** Flagship heritage experience, Kiri,
  history, VR, the D2P commerce reference, the content pipeline. *We are here.*
- **Stage 1 — Charter & standards.** Publish this charter + `ARCHITECTURE.md`.
  Specify the open standards: Identity/Avatar, Asset+Entitlement schema (NFT-ready
  metadata), Experience/scene format, Learning-credential, and the **D2P
  Fulfillment** request format. Define provenance/consent and the certification
  model.
- **Stage 2 — Identity & Commons v1.** A free, portable CamboVerse ID + basic
  avatar. An asset registry with provenance for the existing heritage commons.
  The first non-monetary learning credentials ("I learned this site's history").
- **Stage 3 — Open the rails (developer platform).** Public APIs/SDK, a sandbox,
  and docs. Generalise the **D2P Fulfillment** API (bookings / delivery /
  ticketing) from the shop reference. Ship a reference "startup app." Launch the
  **Verified Khmer Heritage** certification program.
- **Stage 4 — Seed the ecosystem.** Onboard the first 1–3 partner startups on
  modules with the strongest D2P: e.g. **Treasure Hunt** (real tourism),
  **Instruments/Crafts** (artisan sales), **AR Textbook** (schools). CamboVerse
  provides rails + commons + certification; startups run the businesses.
- **Stage 5 — Scale & govern.** More sites and commons; more startups; a formal
  governance body; a non-commercial sustainability model (grants, government
  line-item, certification fees). Report **D2P impact** (physical uplift KPIs).
- **Stage 6 — Web3 enablement (future, ecosystem-led).** Flip the three seams;
  startups tokenize assets from existing metadata; wallet/crypto/Bakong
  integration happens in the ecosystem. The CamboVerse core stays money- and
  chain-neutral.

---

## 8. Governance & sustainability

- **Stewardship:** university- and government-anchored, with APSARA / Ministry of
  Culture and Fine Arts and community/artist/monastic partners for cultural
  authority and consent.
- **Licensing:** core content CC0/CC-BY; contributor and provenance records
  travel with every asset.
- **Certification:** a **Verified Khmer Heritage** trust mark for ecosystem apps —
  the lever that keeps commercial apps culturally faithful and consent-respecting
  without CamboVerse owning them.
- **Sustainability (non-commercial by design):** DPG/DPI grants (DPG Alliance,
  UNESCO, multilateral DPI programs), government funding, and — at most —
  certification/ecosystem service fees. The core never competes with its
  ecosystem for revenue.

---

## 9. Success metrics (Digital-to-Physical)

We measure real-world uplift, not vanity metrics:

- Trips, bookings, and spend driven to real heritage sites and towns.
- Sales and income for Khmer artisans, crafters, musicians, and SMEs.
- Students reached and learning credentials earned.
- Jobs, recruitment, and skills signalled.
- Farm funding raised and produce sold (Digital-Twin Farm).

---

## 10. Open decisions

Adopted here as working principles (revisit as needed):

- **Money-neutral core** — *adopted.* Value lives in the ecosystem.
- **Shared world + rails** — *recommended.* Ecosystem experiences plug into one
  canonical CamboVerse world (e.g. a treasure hunt overlaid on the same heritage
  map everyone sees), maximising the network effect and D2P pull — rather than
  each app running an isolated world.

Still to decide with stakeholders: the certification body's composition, the
initial funding mix, and the first partner startups for Stage 4.

---

*Companion documents: `STRATEGY.md` (delivery strategy, Bakong/KHQR),
`DIGITAL_ECONOMY.md` (the D2P commerce reference), `docs/AI_GUIDE.md`,
`docs/CAPTURE.md` (growing the commons). An `ARCHITECTURE.md` detailing the rail
interfaces will follow in Stage 1.*
