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
| 🥊 Teach Kun Khmer | [Grow the Kun Khmer Dojo](#grow-the-kun-khmer-dojo) |
| 🎪 Add a traditional game | [Grow the Khmer Traditional Games](#grow-the-khmer-traditional-games) |
| 🌾 Grow the Virtual Farm | [Grow the Virtual Farm](#grow-the-virtual-farm) |
| 🧘 Add a meditation sanctuary | [Grow the Virtual Meditation](#grow-the-virtual-meditation) |
| 🏡 Build out the Khmer Village | [Grow the Khmer Village](#grow-the-khmer-village) |
| 👗 Add a garment or verify colours | [Grow the Khmer Traditional Fashion](#grow-the-khmer-traditional-fashion) |
| 🪷 Add a yant or a vetted master | [Grow Sak Yant](#grow-sak-yant) |
| 🗺️ Map provinces & districts | [Grow the province maps](#grow-the-province-maps) |
| 🌏 Translate | [Translate & localise](#4-translate--localise) |
| 💻 Write code | [Code & performance](#6-code--performance) |
| 🧩 Build an app on the rails | [Build on the rails](#5-build-on-the-rails-ecosystem-apps) |

---

## Site status — where the commons needs you most

Every site now has authored points of interest, but only two are "full"
(photoreal 3D‑Gaussian‑Splatting capture **and** POIs). What the commons needs
most now is **real captures** — these are the highest‑impact tasks right now.
(More POIs, and native‑speaker review of the existing ones, are always welcome.)

| Site | Province | Photoreal (3DGS) | Points of interest | Needs |
|---|---|:---:|:---:|---|
| Angkor Wat | Siem Reap | ✅ | ✅ (6) | polish, more POIs |
| Wat Phnom | Phnom Penh | ✅ | ✅ (5) | polish · [field guide](./docs/CAPTURE_WATPHNOM.md) |
| **Bayon** | Siem Reap | ❌ | ✅ (5) | **capture** · [field guide](./docs/CAPTURE_BAYON.md) |
| **Ta Prohm** | Siem Reap | ❌ | ✅ (5) | **capture** · [field guide](./docs/CAPTURE_TAPROHM.md) |
| **Banteay Srei** | Siem Reap | ❌ | ✅ (5) | **capture** · [field guide](./docs/CAPTURE_BANTEAYSREI.md) |
| **Preah Vihear** | Preah Vihear | ❌ | ✅ (5) | **capture** · [field guide](./docs/CAPTURE_PREAHVIHEAR.md) |
| **Royal Palace** | Phnom Penh | ❌ | ✅ (5) | **capture** · [field guide](./docs/CAPTURE_ROYALPALACE.md) |
| **Sambor Prei Kuk** | Kampong Thom | ❌ | ✅ (4) | **capture** · [field guide](./docs/CAPTURE_SAMBORPREIKUK.md) |
| **Koh Ker** | Preah Vihear | ❌ | ✅ (3) | **capture**, a field guide, more POIs |
| _New sites_ | — | — | — | **propose one!** (e.g. Silver Pagoda, Phnom Bakheng, Neak Poan) |

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

- **Points of interest (POIs):** every site now has a starter set of POIs in
  `src/spots.ts` — grow them. Add a new one (a title, a couple of true
  sentences, and where the camera should look), deepen an existing one, or —
  especially valued — review the Khmer titles as a native speaker. Model new
  POIs on the Angkor Wat / Wat Phnom entries.
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
   - **One photo → 3D with AI** — the fastest on-ramp: run a single photo of the
     object through **TripoSplat** (MIT, open weights) on a free GPU. See
     [`docs/CAPTURE_ARTIFACT_TRIPOSPLAT.md`](./docs/CAPTURE_ARTIFACT_TRIPOSPLAT.md).
     These are labelled **🤖 AI-reconstructed** in the app — a plausible model,
     not a measured record — so use it for engagement, and prefer a real capture
     for anything authoritative.
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
- **🔤 Verify the "learn to use" readings.** Each letter has a 3D space showing
  how it's used (a consonant with every vowel → syllables, a vowel across both
  series, etc.). The composed Khmer is font‑correct, but the **romanised sounds**
  (consonant `base` and vowel `aRoman`/`oRoman` in `src/khmer.ts`) are
  approximate teaching aids — Khmer speakers, please refine them.
- **✍️ Stroke order** *(needs Khmer educators)*. The classroom animates **true
  stroke order** — numbered strokes drawn in sequence over the letter — wherever
  data exists in `src/strokeOrder.ts`, and falls back to a **write-on** outline
  trace otherwise. The **numerals are seeded as a community draft** (`✎`): the
  shapes are traced, but **the order and direction still need verifying**, and
  the **consonants and vowels aren't authored yet**. To help:
  - Each letter is `{ verified, strokes }`, where each stroke is a median
    polyline `[[x,y], …]` in a 0..100 box (same coordinates as `glyphPaths.ts`) —
    strokes drawn in array order, in the direction of the points.
  - Run `node scripts/author-stroke-order.mjs` to render a preview (outline +
    numbered strokes + grid) you can check while you edit `src/strokeOrder.ts`.
  - Set `verified: true` once a Khmer educator confirms a letter's order.
  This is ideal coursework at NUM — native Khmer writers authoring how the
  script is really written.
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

## Grow the Kun Khmer Dojo

The **🥊 Kun Khmer Dojo** lets a visitor *play and learn* Cambodia's ancient
martial art (កុនខ្មែរ / *Kbach Kun Boran Khmer*). A procedural boxer — built
from primitives, so it costs nothing to download — **demonstrates** each of the
seven core techniques, and a **reaction-training** round earns a *Kun Khmer
training* learning credential in the Heritage Passport. It runs in 3D and VR.

The move set, names, and controls are adapted from CamboVerse's own **"Kun Khmer
Fight 3D"** reference game (Apache‑2.0,
[`camboversecenter/kunkhmer`](https://github.com/camboversecenter/kunkhmer)).
This dojo is the *teaching* companion to that game. Lots of room to grow:

- **🥋 Verify the techniques.** Kun Khmer masters and practitioners: check the
  names, romanisations, and descriptions of the seven moves in `src/kunkhmer.ts`
  (Mat/ដាល់, Mok Keng/ម៉ុកឃីង, Ti/ទាត់, Sok/កែងដៃ, Kumpleang/ភ្លៅ, Rung/រាំង,
  Romiel/រមៀល), and refine the boxer's poses in `src/components/Fighter.tsx` so
  each strike reads true.
- **➕ More techniques & combinations.** Add moves and named combinations
  (e.g. jab–cross–elbow), each as a `KunMove` in `src/kunkhmer.ts` with a pose in
  the fighter. Traditional footwork and stances especially welcome.
- **🕉️ The Kun Kru ritual** *(needs practitioners)*. Author the pre‑fight
  **Kun Kru / Twer Kru** homage dance and the **mongkol**/**prajed** regalia as
  a guided sequence — heritage as important as the strikes themselves.
- **🎵 Sarama music.** A short, **CC‑BY/CC0** loop of the ringside *sarama*
  (sralai oboe, skor drums, cymbals) to play in the dojo. Open licences only.
- **🔊 Pronunciations.** Native‑speaker audio of each technique's Khmer name,
  released CC‑BY/CC0, so the dojo can *say* the moves.
- **📜 History & provenance.** Deepen the cultural briefing in `KUN_ABOUT`
  (`src/kunkhmer.ts`) — the Angkor bas‑reliefs, regional styles, and the art's
  living lineage — with cited, open sources.
- **🌏 Translate** the dojo's briefing and technique descriptions.

Accuracy and respect matter — this is living heritage. See `src/kunkhmer.ts` for
the data and `src/components/KunKhmer.tsx` / `Fighter.tsx` for how it's shown.

## Grow the Khmer Traditional Games

The **🎪 Khmer Traditional Games** hub is a festival ground where visitors learn
and play the games of Cambodian celebrations — above all *Choul Chnam Thmey*
(Khmer New Year). It ships with three: **Vay Kaom** (វាយក្អម, Hit the Pot),
**Loat Bao** (លោតបាវ, Sack Race), and **Teanh Prot** (ទាញព្រ័ត្រ, Tug of War),
each with a 3D scene, its story, and a quick playable version that earns a
Heritage Passport credential. Cambodia has many more — help add them:

- **➕ Add a game.** Add a `KhmerGame` to `src/games.ts` (Khmer + romanised +
  English name, who plays, the occasion, how-to, and a cultural note) and give
  it a scene in `src/components/GamesView.tsx`. Great candidates:
  - **Chol Chhoung** (ចោលឈូង) — teams toss a knotted scarf between boys and girls, with a sung challenge.
  - **Bos Angkunh** (បោះអង្គុញ) — throwing large *angkunh* seeds to knock down the other team's.
  - **Leak Kanseng** (លាក់កន្សែង) — "hide the scarf" behind a seated circle (like duck-duck-goose).
  - **Klah Klok** (ខ្លាឃ្លោក) — a lively dice/betting game with tiger, gourd, prawn, fish, crab and rooster.
  - **Chab Kon Kleng** (ចាប់កូនខ្លែង) — "hawk catches the chicks", a line-and-tag chasing game.
  - **Bay Khom**, ** Leak konseng**, spinning tops (**Kaon Kleng**), and more.
- **🎮 Make a game playable.** Each game maps to a small minigame in
  `src/components/GamePlay.tsx` (currently `aim`, `race`, `tug`). Add new
  mechanics (throw, catch, memory, dice) and wire them to a `play` type.
- **🎨 Richer scenes.** The festival figures and props are simple primitives —
  improve the models, add sarong patterns, music, and a New Year atmosphere.
- **📜 Accuracy & provenance.** Verify names, rules, and regional variations with
  players and cite open sources; some games differ village to village.
- **🌏 Translate** the rules and cultural notes.

Accuracy and respect matter — these are living traditions. See `src/games.ts`,
`src/components/GamesView.tsx`, and `src/components/GamePlay.tsx`.

## Grow the Khmer Village

The **🏡 Khmer Village** (ភូមិខ្មែរ) is a procedural, explorable Cambodian
village — red-dirt roads, stilt houses on their posts, sugar palms, a pond, rice
paddies, and the village **wat** as its landmark — built entirely from
primitives with a deterministic layout (`src/components/VillageView.tsx`). It's a
**reusable kit**; the same pieces can dress the Farm and Meditation scenes. Lots
of ways to enrich it:

- **🧩 More village pieces.** Add a market (ផ្សារ) with stalls, a school, a
  well, fences, ox-carts (រទេះគោ), chickens/ducks/pigs, a spirit house
  (ខ្ទមទេវតា), fruit trees (mango, banana, jackfruit), lotus in the pond.
- **🏠 Better stilt houses & the wat.** Refine the roofs (Khmer hip roofs,
  finials/ចុងស្លា), add windows/shutters, wooden textures, and a richer wat
  (gopura, naga balustrades, boundary stones/សីមា).
- **🗺️ Real layouts (open data).** Feed the generator a real commune's **roads
  and building footprints from OpenStreetMap** (ODbL — attribute it) so a village
  mirrors an actual place. This ties into the commune map tier.
- **🎨 Open-licensed asset kits.** Where hand-building is slow, vendor **CC0**
  low-poly props (Kenney, Quaternius, Poly Pizza) locally and restyle them Khmer.
  Open licences only (CC0 / CC-BY / CC-BY-SA); credit the source; decimate for
  the $150-phone / 4G budget.
- **🌗 Life & seasons.** Day/night, cooking smoke, monks on morning alms round,
  wet/dry-season paddies, sound (a distant temple bell, roosters).
- **🚶 Wander mode.** First-person walking (reuse `WalkControls`) and VR
  teleport locomotion to stroll the roads.
- **♿ Performance.** Instance the houses/props (like the palms + paddy already
  are) so bigger villages stay light on a low-end phone.

Keep it authentically Khmer — the stilts, sugar palms, red dirt, and the wat are
what make it Cambodia. See `src/components/VillageView.tsx`.

## Grow the Khmer Traditional Fashion

The **👗 Khmer Traditional Fashion** (សម្លៀកបំពាក់ប្រពៃណីខ្មែរ) dresses a
procedural figure three ways: the **seven-day colour** custom (ពណ៌ប្រចាំថ្ងៃ),
the **varieties** of garment (sbai, sampot chang kben, phamuong, av pak, krama),
and how dress **changed through the ages** — tied to the "Back in Time" eras. The
figure and every garment are built from primitives (`src/components/FashionView.tsx`),
and the data lives in `src/fashion.ts`. Ways to grow it:

- **🎨 Verify the seven-day colours.** The palette (`DAY_COLORS`) is a common
  version, but sources vary by region and school. Confirm each day's colour with
  **Khmer elders / dance teachers** and cite the source, so this becomes a
  trustworthy reference rather than one of several.
- **👚 Add garments (the "Varieties" TODO).** Grow `VARIETIES` — sampot hol
  ( សំពត់ហូល, ikat), sampot tep apsara, the *av bam pot* wedding blouse, men's
  formal wear, monastic robes (ចីវរ), regional and ethnic-minority dress. Give
  each a Khmer name, a short history, and an accurate `Outfit`.
- **🧵 Truer silhouettes & weave.** Refine the chang-kben wrap and the sbai
  drape, and add **procedural textile patterns** (hol ikat, checks, gold thread)
  as generated textures — no external image assets, keep it self-contained.
- **⏳ Deepen the eras.** Add pre-Angkor (Funan/Chenla) and split the modern era;
  base each on **bas-reliefs, museum pieces, and photographs** (open-licensed or
  described), with citations. Handle the Khmer Rouge years with the same care.
- **💃 Bring it to life.** A gentle idle animation, an apsara hand-pose, or let a
  visitor **mix and match** (pick a sampot + top + colour) and save the look to
  their Passport.
- **🤳 Improve "Try it on".** The AR mirror (`FashionTryOn.tsx`) tracks the head
  on-device with **MediaPipe FaceLandmarker** (Apache-2.0, vendored under
  `public/mediapipe/`) and paints a mkot crown, earrings, collar, and sbai onto
  the live selfie — nothing is uploaded. Grow it: add more headpieces and
  jewellery, use **pose tracking** for a properly-draped sbai over the shoulders,
  offer a men's look, and let visitors pick which garment to wear in the mirror.
  Keep it on-device and consent-first — **no face data ever leaves the phone.**
- **♿ Performance & consent.** Keep the figure light for the $150-phone / 4G
  budget, and treat sacred/royal regalia with cultural consent and provenance.

Keep it respectful and sourced — dress carries identity. See
`src/fashion.ts` and `src/components/FashionView.tsx`.

## Grow Sak Yant

**🪷 Sak Yant** (សាក់យ័ន្ត) is the Khmer sacred tattoo. The hub teaches what it
is and who applies it, shows the best-known yant (each **drawn procedurally** in
`src/sakyant.ts` — Gao Yord, Hah Taew, Paed Tidt, Unalome, tiger, naga), lets a
visitor **preview one on their own skin** with the on-device camera
(`SakYantTryOn.tsx` — touch-place ink, nothing uploaded), and — the whole point
— points them to a **genuine Khmer master** to receive a real, blessed one.
Handle it with care: Sak Yant is sacred, not decoration.

- **🧎 A vetted directory of masters.** This is the priority. The referral now
  links the **Federation of Khmer Sakyantra**; `REFERRAL.studios` is left empty
  on purpose. Work with the Federation and the community to add **real, consenting
  masters and studios** (name, city, link) — never invent shop details. This is
  how the feature supports Cambodia's living practitioners at the source.
- **✍️ More yant, verified.** Add yant (twin tigers, Hanuman, Yant Kroh Petch,
  the sacred script rows) with meanings **confirmed by a master** — lineages vary.
  Improve the procedural drawings (the tiger especially) and the abstract script
  so they evoke the forms respectfully without copying specific sacred inscriptions.
- **🖐️ Better try-on.** Optional on-device **hand/pose tracking** so a yant wraps
  the arm or shoulder naturally; more ink tones; a placement guide. Keep it
  on-device and consent-first — **no image ever leaves the phone.**
- **🌐 Language & respect.** Full Khmer localisation, and a short note on the
  etiquette of receiving a Sak Yant. Confirm all wording with Khmer cultural and
  religious authorities before it ships as guidance.

Sources for the descriptions are open-web references (Wikipedia "Yantra
tattooing", the Federation of Khmer Sakyantra, general Sak Yant guides); treat
them as a starting point to be verified by masters. See `src/sakyant.ts`.

## Grow the Virtual Meditation

The **🧘 Virtual Meditation** lets anyone in the world sit inside a serene Khmer
sanctuary — forest, temple at dawn, mountain mist, riverside — with a generated
ambient soundscape and a gentle breathing guide, in 3D or VR. The **practice is
universal** (breath and presence, for any faith or none); the **setting** honours
Cambodia's sacred landscapes. An optional chant layer offers traditional
Theravada verses, shared as heritage. Ways to grow it (see `src/meditation.ts`,
`src/components/MeditationView.tsx`, `src/lib/meditationSound.ts`):

- **🎧 Real, consented soundscapes** *(highest value)*. The ambience is
  synthesized today. Contribute **CC0 / CC-BY** field recordings — a Cardamom
  dawn chorus, temple bells, monsoon rain, the Mekong at dusk — with provenance
  and, where people are recorded, consent.
- **🔔 Real chant, with consent** *(needs monastic partners)*. The chant tone is
  synthesized on purpose — we don't put a recording of monks where a synth tone
  belongs. Real Khmer Buddhist chanting must come from a **monastery that
  chooses to share it** under an open licence, with clear attribution.
- **📜 Verify the sutras** *(needs monks / Pali scholars)*. Check the verses in
  `SUTRAS` — the Pali, the **Khmer-script rendering**, and the translations — and
  add more widely-recited ones (Mangala Sutta, Karaniya Metta Sutta …). Keep
  everything respectful and non-instructional.
- **🏞️ More sanctuaries.** Add a `Sanctuary` (scene + soundscape + palette):
  a bamboo grove, a lotus pond, a seashore (Kep/Koh Rong), a cave hermitage,
  a rice field at dawn (reuse the Virtual Farm). Real captured **3DGS** heritage
  sites can become meditation spaces too.
- **🧭 Guided sessions.** Optional, open-licensed **written or spoken** guidance
  (body scan, loving-kindness, walking meditation), in **多 languages** — always
  skippable, never required.
- **🌗 Living scenes.** Day/night and weather, birds that match the habitat,
  slow "walk the temple" movement, haptics in VR.
- **♿ Accessibility.** Honour reduced-motion (done), add captions for any audio,
  and colour/contrast options.

Respect first: this touches living religion. Frame as heritage and wellbeing,
never instruction or conversion; keep the core money-neutral.

## Grow the Virtual Farm

The **🌾 Virtual Farm** is a guided walk through the Khmer rice year (វដ្ដដាំស្រូវ):
the paddy in the scene changes with each step — ploughing behind the buffalo,
the seedbed, transplanting, tending the water, harvest, threshing & winnowing,
and the granary — each with its traditional tool and a cultural note, earning a
Heritage Passport credential for the whole cycle. It's a **rice-first MVP** with
lots of room to grow (see `src/farm.ts`, `src/components/FarmView.tsx`):

- **🌱 The Living Farm** *(concept: [`docs/LIVING_FARM.md`](./docs/LIVING_FARM.md))*.
  A farmer photographs their real paddy through the season and tags each photo's
  stage; the virtual field **grows to match**, and anyone can scrub the season.
  Shipped: the **My Farm** on-device diary (Phase 1); sharing to the commons
  (Phase 2) — a registered plot + consented, **CC-BY**, **moderated** (pending →
  approved) photo check-ins on the `/v1/farm/*` rails, with a village-coarse
  location, browsable in the **🌏 Community** tab; and **living-farm 🌾 pins on
  the province map** (tap a province → its real farms → scrub a season).
  **Still to harden:**
  - move shared photos from D1 to **R2** (signed URLs); a **moderation queue**
    tool for the certified stewards;
  - **consent-withdrawal / takedown**; EXIF time/geo trust checks; rate limits;
  - optional **auto growth-detection** from the photo (a later bonus).
- **🎮 Make each step interactive.** Right now each guided stage is completed by
  a simple tap action. Turn them into real mini-games in the 3D scene — steer the
  buffalo down a furrow, plant seedlings into a grid, open/close dikes to hold
  the water level, time the sickle at harvest, winnow with the breeze.
- **🌧️ Seasons & a light simulation.** Layer the wet/dry monsoon cycle and a
  simple plant → grow → harvest loop on top of the same stages, tied to the
  Khmer lunar months — **without any in-game currency** (the core stays
  money-neutral; progress is knowledge, not coins).
- **👑 The Royal Ploughing Ceremony** (ព្រះរាជពិធីច្រត់ព្រះនង្គ័ល). Author the
  royal oxen choosing from the seven trays (rice, corn, beans, sesame, grass,
  water, wine) to augur the year — a vignette that opens the farming season.
- **🌴 Companion crops & livestock** *(next scope)*. Add the sugar palm (ត្នោត)
  and its juice, lotus ponds, paddy fish, and chickens/pigs/ducks around the
  stilt house — a fuller village farm. Each as its own small journey.
- **🐃 Richer models & audio.** Improve the buffalo, farmers, tools, and house;
  add field-work songs and ambient sound (open-licensed / CC0 only).
- **📜 Accuracy & provenance** *(needs farmers & NUM)*. Verify the steps, tool
  names, rice varieties (e.g. Phka Rumduol jasmine rice), and regional practices
  with Cambodian farmers and agronomists; cite open sources. Mark anything
  uncertain as a community draft.
- **🌏 Translate** the stage names, tools, and facts.

Rice is the heart of Cambodian life — accuracy and respect matter.

## Grow the province maps

Tapping a **province** on the national map now teleports to that province's own
map, showing every heritage site inside it and each site's **points of
interest** in detail. This is the second map tier — there's room to make it
much richer:

- **🏙️ District (ADM2) & commune (ADM3) boundaries** *(shipped)*. The province
  map is subdivided into its **197 districts** (`khm_admbnda_adm2`) and, on
  drill-down, each district into its **communes** (`khm_admbnda_adm3`, ~1,600 —
  generated **per province** under `src/communes/` and lazy-loaded a province at
  a time). Tap a district, then a commune, to **filter to what's inside** — its
  heritage sites and living farms. Generators: `scripts/generate-districts.mjs`,
  `scripts/generate-communes.mjs`. Room to grow: **name labels/search**, Khmer
  names per area, and **village (ADM4)** as a fifth tier.
- **📍 Put more sites on the map.** Every province with “No heritage sites here
  yet” needs its first one. Add a `Spot` in `src/spots.ts` with real `lat`/`lng`
  (it appears on both the national and province maps automatically) — pagodas,
  museums, markets, natural sites, and living-heritage places all count.
- **✍️ Author points of interest.** A site with no `pois` shows “not authored
  yet”. Add its points of interest (title, Khmer, a short description) so the
  province map — and the in-site tour — teaches the place.
- **🇰🇭 Province identity.** Give each province a Khmer name, a one-line
  description, and its emblem/known-for (temples, pepper, silk…), shown on the
  province map. (The ADM1 names come from the boundary data; a couple read oddly
  and are prettified in `src/spots.ts` — extend that as needed.)
See `src/components/ProvinceView.tsx`, `src/cambodia-provinces.ts`, and
`src/cambodia-districts.ts`.

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
