# CamboVerse — Technical & Strategic Framework

**A National Digital Public Good for Immersive Khmer Heritage and the Digital Economy**

| | |
|---|---|
| **Status** | Founding strategy — draft v0.1 (for review) |
| **Established by** | Prakas of the Ministry of Education, Youth and Sport (MoEYS), signed by H.E. Dr. Hang Chuon Naron, 11 July 2024 |
| **Steward** | CamboVerse Center (មជ្ឈមណ្ឌលខេមបូវើស), National University of Management (NUM) |
| **Mandate (Article 1)** | Teaching, learning, and developing programs to serve the digital economy |
| **License intent** | Platform code: Apache-2.0 · Heritage data & content: CC-BY / CC-BY-SA |
| **Positioning** | Open-source **Digital Public Good (DPG)**, built mobile-first and web-first for Cambodian conditions |

> **How to read this document.** It is deliberately layered for three audiences.
> Part 1 speaks to **government and policy** (MoEYS and partner ministries).
> Parts 3–5 are the **technical and operational blueprint** for NUM, students, and open-source contributors.
> Part 6 addresses **funders and institutional partners**.
> The Executive Summary and Roadmap are for everyone.

---

## 0. Executive Summary

CamboVerse is a government-sanctioned, university-stewarded, open-source platform that makes Cambodia's cultural heritage explorable by anyone with a phone and a web link — and, in doing so, trains a generation of Cambodian students to build the immersive, spatial technologies of the digital economy.

The first product is deliberately narrow: **one photoreal Khmer heritage site that opens in a mobile web browser, with no app install and no login — playable on an ordinary phone and enhanced on a VR headset through open WebXR.** From that wedge, CamboVerse grows into two connected public goods:

1. **An open 3D archive of Khmer heritage** — openly-licensed scans (Gaussian splats and glTF meshes) that anyone can build on: schools, researchers, game developers, the diaspora, and other ministries.
2. **The CamboVerse viewer/platform** — the open-source experience layer that renders that archive as immersive, educational, tourism-ready environments.

CamboVerse is **not** a copy of the 2021 "VR metaverse" vision — a walled, headset-only world that failed commercially even for the companies that spent tens of billions on it and that fits Cambodia's device reality poorly. It is a mobile-first, web-first, low-bandwidth *spatial platform built on Cambodia's real digital rails* that **supports both VR and non-VR through open WebXR**: fully usable on an ordinary phone, and immersive on a headset for those who have one — with the non-VR mobile experience always the accessible baseline. Uniquely, it is built as a **Digital Public Good** so that grant capital, international partnerships, and a national student workforce power it rather than venture burn.

**What makes this the right thing at the right time:**
- The collapse of metaverse hype means realistic expectations, cheap tooling, and available talent.
- AI and **Gaussian Splatting** have, since ~2024–2025, crossed the line where a small team can capture and render photoreal environments — work that previously required large studios.
- Cambodia's **Digital Economy and Society Policy Framework 2021–2035**, the **Pentagonal Strategy**, mature payment infrastructure (**Bakong / KHQR**), and now the CamboVerse Center's official mandate provide aligned national tailwinds.

---

## Part 1 — Vision & Mandate (Government & Policy)

### 1.1 The mandate

The MoEYS Prakas of 11 July 2024 establishes the CamboVerse Center within NUM with a mandate for **teaching, learning, and developing programs to serve the digital economy** (Article 1), and requires the Center to define its structure and functions and to report to MoEYS on a **quarterly, semi-annual, and annual** basis (Article 2). This document is designed to help satisfy that mandate and to structure those reports around concrete, demonstrable milestones.

### 1.2 Alignment with national policy

CamboVerse is positioned as an instrument that *executes existing national policy*, not a standalone project. Its work maps directly onto:

- **Cambodia Digital Economy and Society Policy Framework 2021–2035** — building digital human capital, a digital citizenry, and a home-grown digital-technology sector.
- **Pentagonal Strategy** — human-capital development, science/technology/innovation, and digital-economy pillars.
- **Digital Government Policy 2022–2035** — reusable, interoperable digital infrastructure and open standards.
- **Cultural and tourism policy** — digital preservation and promotion of Khmer heritage (natural cooperation with the Ministry of Culture and Fine Arts, the Ministry of Tourism, and the APSARA National Authority).

> *These policy titles should be confirmed and cited exactly by the Center before formal submission; they are referenced here to show alignment, and the Center's government relationships are the authoritative source.*

### 1.3 Why "Digital Public Good," and why it matters to government

A **Digital Public Good (DPG)** is open-source software, open data, open content, or open standards that advances the UN Sustainable Development Goals and does no harm. The **Digital Public Goods Alliance** (UN-endorsed) maintains an international registry of DPGs.

Registering CamboVerse as a DPG delivers concrete national benefits:
- **Unlocks grant capital** from UNDP, UNICEF, the World Bank, foundations, and bilateral donors — funding that does not require selling equity or data.
- **International credibility and soft power** — a home-grown Cambodian DPG on the global registry is a flagship for the country's digital brand and a first-of-its-kind in the region for immersive heritage.
- **Data sovereignty** — as national infrastructure built on open standards and (where feasible) in-country hosting, Cambodia owns and controls its own heritage data rather than renting it from a foreign platform.

### 1.4 Guiding principles

1. **Public good first.** Everything ships in the open under clear licenses; the value is national and shared, not captured.
2. **Cambodian reality, not Silicon Valley fantasy.** Design for a mid-range Android phone on a 4G connection as the baseline; support VR headsets via open WebXR as an enhancement, never a requirement for access.
3. **Education is the engine.** Building CamboVerse *is* the curriculum; the Center's output is both a platform and a trained workforce.
4. **Under-promise, over-deliver.** Ship one excellent site before promising a national platform. Report concrete progress every quarter.
5. **Cultural respect and consent.** Heritage is captured and represented in partnership with the institutions and communities that steward it.

---

## Part 2 — Strategy: The Wedge

### 2.1 Start with heritage, not a platform

CamboVerse's long-term ambition is a national immersive platform. But a platform is a *destination*, not a first product. The chosen wedge — **immersive Khmer heritage** — is the strongest possible starting point for a university-stewarded, open project:

- A heritage site is **interesting even when you are alone in it**, which sidesteps the two hardest problems in the space: real-time multiplayer netcode, and the "empty room" cold-start problem.
- It has **institutional funding paths** (culture, tourism, education, heritage preservation) that do not require a commercial business model.
- It carries **emotional pull** for the Cambodian diaspora and global goodwill for Khmer culture.
- It is **legally and culturally cleanest** to do as a government-sanctioned university center partnering with APSARA and the Ministry of Culture.

### 2.2 Two public goods, one platform

| Public good | What it is | Primary license | Who builds on it |
|---|---|---|---|
| **Open Khmer Heritage Archive** | Openly-licensed 3D capture data (Gaussian splats, glTF meshes, textures, metadata) of temples and cultural sites | CC-BY or CC-BY-SA | Schools, researchers, game/AR devs, diaspora projects, other ministries |
| **CamboVerse Viewer / Platform** | Open-source, mobile-web experience layer that renders the archive as explorable, educational environments | Apache-2.0 | The Center, students, partner institutions, regional adopters |

Releasing the **archive as open data** — not only the viewer — is what turns CamboVerse from an app into an *ecosystem*. It is arguably the larger public good: a single 3D scan of a temple, openly licensed, can power a classroom lesson, a research paper, a video game, an AR tourist app, and a diaspora memorial — none of which the Center has to build itself.

### 2.3 First milestone (the north star for v1)

> **One temple or courtyard, photoreal, that opens in a mobile web browser from a shared link, runs smoothly on a ~$150 Android phone, and offers an "explore + information hotspots" experience — with no login, no multiplayer, and no payments.** Its capture data is published as the first entry in the Open Khmer Heritage Archive.

Shipping this single artifact validates the technology, the content pipeline, the open-data model, *and* the student-contributor workflow at once — and it is exactly the kind of concrete deliverable that opens funding and partnership doors and that reports cleanly to MoEYS.

---

## Part 3 — Technical Architecture (NUM & Contributors)

### 3.1 Design constraints (non-negotiable)

Every technical choice is driven by Cambodian user reality:

| Reality | Consequence for architecture |
|---|---|
| Mid/low-end Android dominates; VR headsets are a minority | Target the phone browser as the baseline; support VR via **WebXR** as a progressive enhancement — the same open stack, never a dependency for access. |
| Mobile data cost and variable bandwidth | Aggressive compression, streamed/level-of-detail assets, "works on 4G" as an acceptance criterion |
| Users live inside Facebook, Messenger, Telegram, TikTok | Zero-install web link that opens from a shared message; no app-store fight for v1 |
| National, long-lived infrastructure | Open standards, no vendor lock-in, in-country hosting where feasible, data sovereignty |
| Bakong / KHQR is world-class and interoperable | The eventual transactional layer (donations, ticketed tours) rides national rails |

### 3.2 The stack

**Rendering / client (web-first):**
- **Three.js** or **Babylon.js** as the platform rendering layer. Rationale for a DPG: both are open-source, standards-based (WebGL/**WebGPU**, **glTF**, **WebXR**), and avoid lock-in to any proprietary editor. This is preferred over closed platforms (e.g. PlayCanvas, Unity WebGL) *at the platform layer*, though such tools remain fine for rapid prototyping and student learning.
- **Gaussian Splatting** viewers (WebGL/WebGPU splat renderers) for photoreal heritage capture at mobile-friendly cost; **glTF** meshes for authored/stylized geometry and interactive objects.
- Progressive loading, Draco/meshopt compression, texture atlasing, and LODs are mandatory, not optimizations.

**Backend (intentionally minimal for v1):**
- Static hosting + CDN for the world and archive (e.g. Cloudflare Pages/R2 or an in-country equivalent). **No game server is required for v1.**
- Lightweight presence/multiplayer (Colyseus, Nakama, or similar open-source servers) is added *only when* users demonstrably want to see each other — a later phase, not the foundation.
- The eventual payments layer integrates **Bakong / KHQR** via a small service; not part of v1.

**Content pipeline (the real heart of the project):**
1. **Capture** — drone and phone photogrammetry, and/or Gaussian Splatting capture, of a scoped site (one temple/courtyard first, not all of Angkor).
2. **Process** — reconstruct, clean, decimate, generate LODs, and bake to open formats (glTF + splat).
3. **Optimize** — compress and package for streaming to low-end mobile.
4. **Author** — add information hotspots, navigation, narration, and educational metadata.
5. **Publish** — deploy the viewer *and* release the raw/processed capture data to the Open Khmer Heritage Archive under CC licensing, with provenance metadata.

### 3.3 Open standards commitment

As national infrastructure, CamboVerse commits to open, interoperable standards to guarantee longevity and prevent lock-in: **glTF** (assets), **WebXR/WebGPU/WebGL** (rendering), open Gaussian-splat formats, standard geospatial/metadata schemas for provenance, and permissive/open content licenses. Interoperability is a policy requirement (Digital Government Policy alignment), not merely an engineering preference.

### 3.4 Explicitly out of scope for v1

To protect focus and deliverability: full real-time multiplayer, user-generated-content tooling, avatars/social systems, in-world economy/payments, and native mobile apps. Each is a *later phase* with its own justification, not part of the founding milestone.

**A note on VR:** VR is a supported target — CamboVerse is built on **WebXR**, so the same open stack drives both the non-VR mobile-web experience and immersive VR on a headset. What is out of scope for the *founding milestone* is deep headset-specific polish (VR-native controls, room-scale locomotion, hand tracking); the non-VR mobile-web path remains the v1 baseline and hard requirement, and VR support deepens as the stack matures.

---

## Part 4 — Open Source & Governance

### 4.1 Licensing decisions

| Asset class | Recommended license | Why |
|---|---|---|
| Platform / viewer source code | **Apache-2.0** | Permissive, patent-protective, business- and adoption-friendly; encourages regional reuse |
| Heritage 3D data & content | **CC-BY-4.0** (or **CC-BY-SA** if the Center wants derivatives to stay open) | Requires attribution to Cambodia/the Center; maximizes reuse as a public good |
| Documentation & curriculum | **CC-BY-4.0** | Reusable by other universities and schools |

*The permissive-vs-share-alike choice for heritage data is a genuine policy decision for the Center's leadership — CC-BY maximizes reach; CC-BY-SA keeps the commons open. This document recommends starting permissive and revisiting.*

### 4.2 Ship in the open from commit #1

Public-goods credibility dies quickly if the repository is empty, the license is unclear, or development happens privately and is "thrown over the wall." CamboVerse should therefore:
- Develop in a **public repository** from the start, with a clear `LICENSE`, `README`, `CONTRIBUTING.md`, and `CODE_OF_CONDUCT.md`.
- Maintain a visible roadmap and a **"good first issue"** pipeline sized to student skill levels.
- Register on the **Digital Public Goods Alliance** registry once the baseline documentation and licensing criteria are met.

### 4.3 Governance

- **Steward:** the CamboVerse Center at NUM holds maintainership and sets technical direction under a published charter.
- **Advisory input:** partner ministries and institutions (Culture, Tourism, APSARA, MoEYS) advise on heritage, policy, and priorities.
- **Contribution model:** open contributions via pull request under a defined review process; students, faculty, and external contributors follow the same public workflow.
- **Sustainability of governance:** roles and responsibilities are institutionalized (not tied to any single individual) so the Center survives staff and cohort turnover — directly addressing the Prakas's reporting and continuity expectations.

---

## Part 5 — The University Engine (Central to the Plan)

The Center's most valuable and most sustainable resource is not a budget line — it is **NUM's teaching mandate and its rotating cohorts of students.** CamboVerse is designed so that *building it is the curriculum.*

### 5.1 Building the platform as coursework

- Student teams contribute **3D capture, modeling, optimization, front-end code, UX, content, and documentation** as structured coursework, capstone projects, and theses.
- This simultaneously satisfies Article 1's teaching mandate, develops a national immersive-tech workforce, and provides a **renewable contributor pipeline** at no marginal labor cost.
- Work is scoped into open issues sized to skill level, so first-year students and advanced students both have a path to contribute.

### 5.2 Curriculum integration

CamboVerse can anchor teaching modules across, for example: web 3D and real-time graphics; photogrammetry and Gaussian Splatting; performance optimization for constrained devices; open-source collaboration and Git workflows; digital heritage and cultural informatics; and product/UX for low-bandwidth contexts. Each module produces *real contributions to a real national platform*, which is a powerful motivator and a differentiator for NUM.

### 5.3 Sustainability and capacity building

- **Faculty stewardship + rotating student cohorts** is the core sustainability model — resilient to turnover and independent of any single person.
- Graduates become Cambodia's immersive-tech talent pool, seeding startups, government digital teams, and the creative industries — a compounding national return that is itself a reportable outcome to MoEYS.
- The model can be **replicated to other universities**, with NUM's Center as the national reference implementation.

### 5.4 Complementary roles

While students are the engine, the plan should also anticipate a small **core stewardship team** (a lead maintainer/coordinator and faculty leads) for continuity and quality, plus **selective partners or contractors** for specialized tasks (e.g., professional drone capture of sensitive sites) where student capacity is not yet sufficient.

---

## Part 6 — Funding & Partnerships (Funders & Partners)

### 6.1 The funding thesis

Because CamboVerse is a DPG rather than a startup, its funding comes primarily from **grants, institutional partnerships, and public budget** — not equity investment. This is a feature: it keeps the platform a public good and aligns incentives with national benefit.

### 6.2 Funding ladder

1. **Proof artifact (cost = mostly time):** ship the first temple; use it to open every subsequent door.
2. **Institutional & public funding:** MoEYS/NUM support; culture and tourism ministries; APSARA. Digital preservation is fundable *without* a commercial model.
3. **DPG / development funding:** UNDP, UNICEF, World Bank, bilateral donors, and foundations — unlocked by DPG registry status and the open-data archive.
4. **Cultural-heritage & tech partnerships:** UNESCO-linked digital-preservation programs and global cultural-tech initiatives.
5. **Modest earned revenue (later, optional):** ticketed premium virtual tours, licensing of high-end assets to commercial users under dual licensing, or Bakong-enabled donations to real restoration — always secondary to the public-good mission.

### 6.3 Partnership map

| Partner | Role |
|---|---|
| **MoEYS** | Mandate, oversight, education-system integration, reporting line |
| **NUM** | Institutional home, faculty, students, governance |
| **Ministry of Culture & Fine Arts / APSARA National Authority** | Heritage access, capture permissions, cultural authority — turns the biggest risk into a moat |
| **Ministry of Tourism** | Virtual-tourism promotion, distribution, diaspora and inbound-visitor reach |
| **National Bank of Cambodia (Bakong)** | Future transactional layer on national payment rails |
| **Digital Public Goods Alliance / UN agencies** | DPG registration, funding, international visibility |
| **Regional universities & open-source community** | Contributors, replication, longevity |

### 6.4 The APSARA point (important)

Capturing and representing Angkor and other listed sites carries legal and cultural sensitivities. As a **government-sanctioned university center**, CamboVerse is positioned to secure early, official cooperation with APSARA and the Ministry of Culture. Doing so early converts the project's single biggest risk into its strongest **moat**: official partner status that outside commercial actors cannot easily replicate.

---

## Part 7 — Roadmap & Milestones

The roadmap is phased to under-promise and over-deliver, and to map cleanly onto the Center's quarterly/semi-annual/annual reporting obligations.

### Phase 0 — Foundation (Now)
- Publish this strategy; agree license and governance charter.
- Stand up the **public repository** with `LICENSE`, `README`, `CONTRIBUTING`, `CODE_OF_CONDUCT`, and an initial roadmap.
- Choose the first site and initiate APSARA/Ministry of Culture conversations.
- Prototype the rendering stack (Three.js/Babylon.js + a Gaussian-splat viewer) on a sample scan to validate mobile performance.

### Phase 1 — First Temple (v1)
- Capture, process, and optimize one scoped site.
- Build the mobile-web viewer with navigation and information hotspots.
- **Publish the viewer and release the first Open Khmer Heritage Archive dataset.**
- Measure: does it load on low-end Android over 4G, and do people explore and share it?

### Phase 2 — Archive & Education
- Add 2–3 more sites; formalize the capture-to-archive pipeline as repeatable student coursework.
- Integrate CamboVerse into NUM curriculum modules.
- Register as a Digital Public Good; pursue first development-funding grant.
- Publish educational content/lesson plans built on the archive.

### Phase 3 — Platform Features
- Add lightweight presence (see others explore) *if* validated by demand.
- Deepen **immersive VR** via WebXR: VR-native controls, comfortable locomotion,
  and headset-tuned performance (the mobile-web baseline continues unchanged).
- Guided/narrated tours; multi-language (Khmer/English) and diaspora features.
- Explore Bakong-enabled donations toward real restoration.

### Phase 4 — National Platform & Replication
- Expand beyond heritage into other digital-economy use cases as the Center's capacity grows.
- Support replication of the model to other universities, with NUM as reference implementation.

> **Reporting hook:** each phase yields concrete, demonstrable artifacts (a shared link, a dataset, a registered DPG, a curriculum module, a grant) that translate directly into MoEYS quarterly/annual reports.

---

## Part 8 — Risks & Mitigations

| Risk | Mitigation |
|---|---|
| **Scope creep** — government backing tempts a "national platform" promise before v1 exists | Enforce the one-temple milestone; treat everything else as a later phase |
| **Sustainability beyond founders** | Institutionalize governance and roles; rely on faculty + rotating student cohorts, not individuals |
| **"Open" in name only** | Develop in public from commit #1; clear licenses; real `CONTRIBUTING` and issue pipeline |
| **Heritage licensing / cultural sensitivity** | Secure APSARA/Ministry of Culture partnership early; capture with consent and provenance |
| **Device/bandwidth performance** | "Runs on a ~$150 Android over 4G" as a hard acceptance criterion; aggressive optimization |
| **Chasing the discredited "VR metaverse" hype** | Lead with "explore Khmer heritage from anywhere" and "digital preservation"; support VR via open WebXR as an enhancement (never a requirement), and avoid the walled, headset-only 2021 framing |
| **Student-workforce variability** (skill, turnover) | Scoped good-first-issues, faculty review, small core stewardship team for continuity/quality |
| **Data sovereignty** | Open standards; in-country hosting where feasible; Cambodia owns its heritage data |

---

## Appendix A — Key Technical Decisions (summary)

| Decision | Recommendation | Status |
|---|---|---|
| Primary client platform | Mobile **web** (zero install) | Decided |
| Rendering engine | **Three.js** or **Babylon.js** (open, standards-based) | To confirm via prototype |
| Photoreal capture | **Gaussian Splatting** + photogrammetry; **glTF** for authored geometry | To validate on mobile |
| Immersive mode | **Both VR and non-VR** via open **WebXR**; non-VR mobile web is the baseline | Decided |
| Multiplayer in v1 | **None** (single-user exploration) | Decided |
| Backend in v1 | Static hosting + CDN, **no game server** | Decided |
| Payments | **Bakong / KHQR**, later phase only | Deferred |
| Code license | **Apache-2.0** | Recommended |
| Data/content license | **CC-BY** (revisit CC-BY-SA) | Recommended |
| DPG registration | Yes, after baseline docs | Planned (Phase 2) |

## Appendix B — Glossary

- **DPG (Digital Public Good):** open-source software / open data / open content / open standards advancing the SDGs, listed by the UN-endorsed Digital Public Goods Alliance.
- **Gaussian Splatting:** a 2023-era technique for capturing and rendering photoreal 3D scenes efficiently enough for mobile — a key enabler for solo/small-team heritage capture.
- **glTF:** the open standard ("JPEG of 3D") for transmitting 3D assets on the web.
- **WebXR / WebGPU / WebGL:** open web standards for immersive rendering in the browser without app installs.
- **Bakong / KHQR:** the National Bank of Cambodia's interoperable national payment system and QR standard.
- **APSARA National Authority:** the body responsible for managing and protecting the Angkor site.

---

*This is a founding strategy draft (v0.1) prepared for review by the CamboVerse Center at NUM. Policy titles, legal citations, and institutional relationships should be verified and finalized by the Center before formal submission to MoEYS or external partners.*
