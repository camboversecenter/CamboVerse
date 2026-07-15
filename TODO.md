# Help build CamboVerse 🇰🇭 — Contributor TO-DO

CamboVerse is a **Digital Public Good** for Khmer heritage: a mobile-first, open
world of Cambodia's temples and history that runs on a ~$150 Android over 4G.
It's built in the open, and **you can help build it** — whether you can hold a
phone steady around a temple, train a model on a free GPU, write a paragraph of
history, translate a sentence, or ship code.

Every contribution to the heritage commons is licensed **CC‑BY‑4.0** and is
**credited in the app** — your name (or your team's) shows up in each site's
*ⓘ Credits & licence* panel. You're not filing tickets; you're putting a piece of
Cambodia online for the world, with your name on it.

> New here? Read [`CONTRIBUTING.md`](./CONTRIBUTING.md) for the workflow and the
> hard rules, and [`PLATFORM_CHARTER.md`](./PLATFORM_CHARTER.md) for what
> CamboVerse is (and isn't). This page is the **task board**.

---

## Pick something to do

| I can… | Start here |
|---|---|
| 📸 Photograph a temple | [Capture a site](#1-capture-a-heritage-site-photos--3dgs) |
| 🖥️ Train a 3D model on a free GPU | [Train 3DGS on Kaggle](./docs/TRAIN_3DGS_KAGGLE.md) |
| 📝 Write facts / history / quizzes | [Author POIs & history](#3-author-points-of-interest--history) |
| 🏺 Add a Khmer tool / object in 3D | [Add a traditional tool](#add-a-khmer-traditional-tool-3d-artifact) |
| 🔤 Teach the Khmer script | [Grow the Alphabet Classroom](#grow-the-khmer-alphabet-classroom) |
| 🌏 Translate | [Translate & localise](#4-translate--localise) |
| 💻 Write code | [Code & performance](#6-code--performance) |
| 🧩 Build an app on the rails | [Build on the rails](#5-build-on-the-rails-ecosystem-apps) |

---

## Site status — where the commons needs you most

Two sites are "full" (photoreal 3D‑Gaussian‑Splatting capture **and** authored
points of interest). The rest have a base model but **need a real capture and
POIs** — these are the highest‑impact tasks right now.

| Site | Province | Photoreal (3DGS) | Points of interest | Needs |
|---|---|:---:|:---:|---|
| Angkor Wat | Siem Reap | ✅ | ✅ (6) | polish, more POIs |
| Wat Phnom | Phnom Penh | ✅ | ✅ (5) | polish · [field guide](./docs/CAPTURE_WATPHNOM.md) |
| **Bayon** | Siem Reap | ❌ | ❌ | **capture + POIs** · [field guide](./docs/CAPTURE_BAYON.md) |
| **Ta Prohm** | Siem Reap | ❌ | ❌ | **capture + POIs** · [field guide](./docs/CAPTURE_TAPROHM.md) |
| **Banteay Srei** | Siem Reap | ❌ | ❌ | **capture + POIs** · [field guide](./docs/CAPTURE_BANTEAYSREI.md) |
| **Preah Vihear** | Preah Vihear | ❌ | ❌ | **capture + POIs** · [field guide](./docs/CAPTURE_PREAHVIHEAR.md) |
| **Royal Palace** | Phnom Penh | ❌ | ❌ | **capture + POIs** · [field guide](./docs/CAPTURE_ROYALPALACE.md) |
| _New sites_ | — | — | — | **propose one!** (e.g. Sambor Prei Kuk, Koh Ker, Silver Pagoda, Phnom Bakheng) |

Each site above has a **site-specific field guide** (linked in the table) with
what to shoot, when to go, access/consent notes, and hazards. Wat Phnom is in
Phnom Penh and easy to reach — a great first capture.

---

## 1. Capture a heritage site (photos → 3DGS)

Turn a real place into an explorable asset. You photograph the site, train a
3D‑Gaussian‑Splatting (or photogrammetry) model, and it becomes a `.splat` /
`.glb` that CamboVerse streams.

1. **Get consent first.** Heritage capture happens with the site steward's
   permission (APSARA / the Ministry of Culture, or the temple authority). Don't
   photograph restricted areas. When in doubt, ask — and note it in your PR.
2. **Shoot the site.** Follow [`docs/CAPTURE.md`](./docs/CAPTURE.md) for coverage,
   overlap, lighting, and the mobile asset budget. There's a site‑specific field
   guide for Wat Phnom in [`docs/CAPTURE_WATPHNOM.md`](./docs/CAPTURE_WATPHNOM.md)
   you can adapt.
3. **Train the model — for free.** [`docs/TRAIN_3DGS_KAGGLE.md`](./docs/TRAIN_3DGS_KAGGLE.md)
   walks through training a 3DGS model on Kaggle's free GPUs, then exporting a
   web‑ready `.splat`.
4. **Keep it light.** It has to load on a low‑end phone over 4G — decimate,
   compress, and LOD. Coverage and budget rules are in `docs/CAPTURE.md`.
5. **Open a PR** with the asset, plus its **licence, contributor, and consent
   reference** (these become the site's Credits panel — see below).

**Good first capture:** Wat Phnom detail passes, or Bayon's famous faces.

## 2. Register the asset (licence · provenance · consent)

Every asset in the commons carries three mandatory fields, surfaced to every
visitor in the app's *ⓘ Credits & licence* panel and served from the Asset rail:

- **Licence** — `CC‑BY‑4.0` (default), `CC‑BY‑SA‑4.0`, or `CC0‑1.0`. **No
  NonCommercial (NC) or NoDerivatives (ND)** licences — a Digital Public Good
  must be freely reusable.
- **Provenance** — who captured it and how (`contributor`, `method`, date).
- **Consent** — the cultural steward and a consent reference.

See [`ARCHITECTURE.md`](./ARCHITECTURE.md) §3 for the asset schema and
[`docs/API.md`](./docs/API.md) for how assets are read.

## 3. Author points of interest & history

You don't need a camera to make a huge difference here.

- **Points of interest (POIs):** the sites marked "needs POIs" above have no
  places to walk to yet. Add a few — a title, a couple of true sentences, and
  where the camera should look. Model them on the Angkor Wat / Wat Phnom POIs in
  `src/spots.ts`.
- **History & "Back in Time":** deepen the era stories, add per‑site notes, or
  write **quiz questions** for an era in `src/history.ts`. Passing a quiz earns a
  learning credential that shows up in the visitor's Heritage Passport.
- **Accuracy over flourish.** Cite where you can; don't invent dates,
  attributions, or institutional relationships. Flag assumptions in the PR.

## Add a Khmer traditional tool (3D artifact)

The **🏺 Khmer Tools** gallery lets visitors inspect everyday Khmer objects in
3D and VR, learn their parts, and see how they're used. The two objects there
now — **ក្អម** (water pot) and **ចង្ក្រាន** (clay stove) — are just **sample
builds** to show the pattern. **Help fill the gallery** with the rich world of
Khmer tools, instruments, and household objects.

Each artifact is a small, self-contained contribution — no server work, and it
appears in the gallery **and** the Asset registry automatically.

**How to add one**

1. **Make the 3D model** (`public/models/<id>.glb`). Two paths:
   - **Author it procedurally** — the easiest start. Copy a sample generator
     (`scripts/generate-kaom.mjs` or `scripts/generate-changkran.mjs`) and reshape
     it with the shared builder (`scripts/lib/temple.mjs`: `box`, `cyl`, `cone`,
     `sphere`). A pot or stove is a *body of revolution* — a profile of
     `[height, radius]` samples emitted as stacked frustums. Add a
     `gen:<id>` script to `package.json`.
   - **Capture a real one** — photograph an actual object and train a model
     (photogrammetry / 3DGS). See [`docs/CAPTURE.md`](./docs/CAPTURE.md) and
     [`docs/TRAIN_3DGS_KAGGLE.md`](./docs/TRAIN_3DGS_KAGGLE.md). Best of all — a
     real artifact, captured with a museum or artisan's consent.
2. **Add an entry to `src/artifacts.ts`** — Khmer + romanized names, an English
   gloss, a short **educational story** (what it is and *how it works*), its
   **utilities** (bullet list), its **origin**, the `model` path, and a few
   **inspect POIs** that teach the object's parts (`target` = look-at point,
   `camera` = where the camera sits, in the model's space). Model it on the two
   samples.
3. **That's it.** The gallery lists it, it's viewable in 3D and VR, and it's
   seeded into the Asset registry as a `traditional-tool` (CC‑BY, provenance,
   consent) — no other code changes.

**Keep the rules:** a light model (it must load on a low‑end phone), an **open
licence** (CC0 / CC‑BY / CC‑BY‑SA), **consent** for any real capture, and
**accuracy** — describe the object and its use truthfully.

**Ideas to claim** (from daily life, crafts, music, and the kitchen):

- **Kitchen & home:** ពាង (large water jar), ឆ្នាំង (clay cooking pot), ខ្ទះ
  (wok / frying pan), ត្បាល់ & អង្រែ (mortar & pestle), កញ្ជើ / ល្អី (baskets),
  ស្លាបព្រា (spoon), កន្ទេល (woven mat).
- **Farm & craft:** នង្គ័ល (plough), កណ្ដៀវ (sickle), កីតម្បាញ (weaving loom),
  សំណាញ់ (fishing net), and woven bamboo fish traps.
- **Music (Pinpeat / Mahori):** រនាត (roneat xylophone), គង (gong circle),
  ស្គរ (drums), ទ្រ (tro fiddle), ខ្លុយ (flute), ចាប៉ី (chapei lute).
- **Everyday:** ក្រមា (the iconic checkered krama scarf), សំពត់ (traditional
  cloth), ចង្កឹះ, កាំបិត.

Propose your own, too — anything that carries a piece of Khmer daily life.

## Grow the Khmer Alphabet Classroom

The **🔤 Khmer Alphabet Classroom** teaches the Khmer script: every consonant,
vowel, and numeral as a 3D tile, shown in both the **Normal** and **Moul**
(ceremonial) shapes using embedded Google Khmer fonts, viewable in 3D and VR.
It's a foundation with lots of room to grow — much of it needs no 3D at all.

Highest-value help:

- **🔊 Record pronunciations.** The biggest win: a short audio clip of each
  letter's sound (and letter name), recorded by a native speaker, released
  **CC‑BY / CC0**. This turns the classroom from *see* into *hear-and-repeat*.
- **📝 Example words.** For each letter, a common word that starts with it — the
  Khmer word, romanisation, and English meaning (optionally a small CC‑BY image).
  Add them to `src/khmer.ts`.
- **✍️ Stroke order.** The classroom already animates a **write-on** of each
  letter (a pen tracing the font outline — `src/glyphPaths.ts`, generated by
  `npm run gen:glyphs`). Next: **true stroke order** — author the real strokes in
  the correct sequence and direction, so learners practise writing properly.
- **➕ Subscripts & diacritics.** Add the subscript (coeng ◌្) consonant forms and
  the diacritics (និគ្គហិត, បន្តក់, …) that Khmer reading needs.
- **🧩 A letter quiz.** A match-the-sound or find-the-letter game that earns a
  **learning credential** (see the Credential rail) — pairs perfectly with the
  Heritage Passport.
- **🔤 More letter shapes.** Add other open-licensed Khmer styles (e.g. slanted
  *Aksar Chrieng*), selectable like Normal/Moul. Open licences only (OFL).
- **🧊 True 3D glyphs.** Sculpt/extrude the letter outlines from the OFL fonts into
  real 3D geometry, for a more tactile feel than the textured tiles.
- **🌏 Translate** the classroom's notes and letter descriptions.

Accuracy matters — romanisations and series (a/o) should be checked by Khmer
speakers. See `src/khmer.ts` for the data and `src/components/ClassroomView.tsx`
for how it's shown.

## 4. Translate & localise

CamboVerse speaks Khmer, English, French, and Chinese today. Help by improving
translations, adding a language, or translating POI/era text. Khmer‑language
review from native speakers is especially valued.

## 5. Build on the rails (ecosystem apps)

CamboVerse is a platform: build your **own** app on the open `/v1` rails —
a learning game, a museum, a class project — without touching the core.

- [`docs/API.md`](./docs/API.md) — the `/v1` rails contract.
- [`sdk/`](./sdk/) — a tiny dependency‑free JS client.
- [`examples/treasure-hunt/`](./examples/treasure-hunt/) — a self‑contained
  reference app that composes every rail (scene → learning credentials → a real
  local reward). Copy it and start.

## 6. Code & performance

- **Mobile budget is a hard rule.** Improvements to load time, bundle size, LOD,
  and low‑end GPU behaviour are gold. Test against the "$150 Android over 4G"
  bar.
- **Accessibility & WebXR.** The non‑VR mobile‑web experience is the baseline;
  VR is additive via open WebXR. Never require a headset to reach content.
- **Good first issues:** small UI polish, a new POI, a translation string, a
  capture. Grep for `TODO` in the source, too.

---

## How to submit

1. Read [`CONTRIBUTING.md`](./CONTRIBUTING.md) (setup, workflow, the checks a PR
   must pass) and the [`CODE_OF_CONDUCT.md`](./CODE_OF_CONDUCT.md).
2. Open an issue describing what you'll do (capture which site? add which POIs?)
   so we can avoid duplicate work and confirm steward consent where needed.
3. Send a pull request. Before you do: `npm run typecheck` and `npm run build`
   must pass, and any asset must carry its licence / provenance / consent.

## The non‑negotiables (quick recap)

- **Open licences only** — CC0 / CC‑BY / CC‑BY‑SA. No NC, no ND.
- **Consent & respect** — heritage is represented with the stewards' permission;
  don't fabricate policies, titles, or citations.
- **Mobile‑first, low‑bandwidth** — it must run on a cheap phone over 4G.
- **Open standards** — glTF, WebGL/WebXR, open splat formats. No lock‑in.
- **Money‑neutral core** — the commons is free to access; commerce lives in the
  ecosystem, never gated onto the heritage itself.

**អរគុណ — thank you.** Every stone you add helps carry Khmer heritage to the world.
