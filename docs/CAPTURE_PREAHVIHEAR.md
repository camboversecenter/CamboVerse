# Field guide — capturing Preah Vihear for 3D Gaussian Splatting

A practical, on-the-ground checklist for the team going to **Preah Vihear** — the
dramatic cliff-top Shaivite temple on the **Dângrêk escarpment, Preah Vihear
province** (a UNESCO World Heritage Site) — to photograph it for a **3D Gaussian
Splatting (3DGS)** capture.

This is the site-specific companion to [`CAPTURE.md`](./CAPTURE.md). Where they
differ, **`CAPTURE.md` wins on the technical pipeline; this file wins on what to
shoot at Preah Vihear.**

> ⚠️ **Read §0 carefully.** Preah Vihear is remote, mountainous, and sits on a
> **sensitive international border**. Logistics, permissions and safety matter
> more here than at any other site — plan a proper expedition, not a casual visit.

---

## 0. Before you go — permission, safety, licensing

- **Permission & coordination first.** The temple is administered by the
  **National Authority for Preah Vihear (ANPV)** with the **APSARA/Ministry of
  Culture**. Because of the location, coordinate in advance with the site
  authority **and** heed local **military/police** guidance — there is an army
  presence and some zones are restricted. Explain it's a non-commercial
  **Digital Public Good**.
- **Border sensitivity.** This has been a disputed border area. **Do not enter
  restricted zones, do not photograph military positions**, and follow every
  instruction from authorities on the ground. If told not to shoot somewhere,
  don't.
- **Stay on marked paths.** The surrounding hillsides have a history of landmines
  — **never leave cleared, marked areas.**
- **Licensing.** *Our* photos, openly licensed — agree **CC-BY** (or CC0) up
  front. No third-party images. Record who shot what.
- **Drones: do not fly** — border-sensitive airspace and heritage restrictions.
- **Terrain & heat.** Access involves steep sections and a long, exposed ridge
  with little shade. Bring water, sun protection, sturdy footwear, and go with a
  local guide.

---

## 1. When to go

- **Dry season (Nov–Feb)** is essentially mandatory — the mountain access is
  difficult and views vanish in wet-season cloud. Check current access status
  before travelling.
- **Early morning** for softer light on the long axis and **fewer visitors**
  (people ruin a splat), and to beat the ridge-top heat.
- Preah Vihear is a **linear, processional** monument ~800 m long climbing the
  ridge — plan a **full day** and work it **gopura by gopura** from the base up.

---

## 2. Gear & camera settings

- A recent **phone** works; a **mirrorless/DSLR** with a 24–35mm lens (plus a
  short telephoto for the carved lintels) is better. **Bring spare batteries and
  storage** — there's no charging up there — and a **monopod**.
- **Lock exposure, focus, white balance** per subject; the ridge light is
  **harsh** — shoot the golden hour and expose to keep detail in the pale stone.
  **RAW + JPEG.**
- Wind is common on the ridge; use a fast shutter (≥1/500s) to stay sharp.
- Put a **scale reference** in a few frames per subject.

---

## 3. What to shoot (these become the in-app teleport spots / POIs)

Preah Vihear has no POIs in the app yet — your subjects will **seed them**. The
**processional ascent and the cliff view are the hero** here.

| Subject | Suggested POI | Notes | Target photos |
|---|---|---|---|
| **The monumental stairway & naga causeway** | *The Grand Stairway* | The long ascending approach with naga balustrades — shoot up and down the axis and from the sides. | 300–500 |
| **The five gopuras (I–V)** | *The Five Gateways* | Capture **each gateway as its own set** in sequence up the ridge; they're the spine of the monument. | 500–1000 |
| **Carved lintels & pediments** | *The Carved Lintels* | The famous narrative lintels (e.g. the Churning of the Sea of Milk). Square-on + raked, telephoto. | 200–400 |
| **The central sanctuary** | *The Sanctuary* | The uppermost shrine complex at the summit. | 300–500 |
| **The cliff & the view (Pey Tadi)** | *The Cliff's Edge* | The dramatic escarpment and the plains far below — wide context sets (mind the edge!). | 150–300 |

**Whole-site target: ~2,000–3,000 usable photos** across the ascent.

---

## 4. How to shoot each subject (the 3DGS method)

- **Orbit each structure** (each gopura, the sanctuary) — walk around it, one
  photo every ~1–2 steps, for parallax.
- **Linear sections** (stairway, causeway): shoot a **dense forward-and-back
  sweep** with strong overlap, plus obliques from both sides, so poses solve.
- **~70% overlap** minimum; **three heights** where footing is safe.
- **One light window per set** — the light on an exposed ridge changes fast; do
  each gopura in a single pass and keep exposure consistent.
- **Avoid** moving people, motion blur, and shooting into the sun on the ridge.
- **Safety trumps coverage** — never step past barriers or near the unguarded
  cliff edge for a shot.

---

## 5. After the shoot — data handling

- **Back up immediately** (two copies) — you don't want a return trip.
- One **folder per subject** (`stairway/`, `gopura-1/` … `gopura-5/`,
  `lintels/`, `sanctuary/`, `cliff/`).
- Fill a **provenance sheet** per set (date, shooter, device, licence CC-BY,
  authority permission ref, notes).

---

## 6. Processing → the file the app loads

Follow [`CAPTURE.md` §A](./CAPTURE.md) and
[`TRAIN_3DGS_KAGGLE.md`](./TRAIN_3DGS_KAGGLE.md) (free Kaggle GPU). COLMAP poses →
train 3DGS → export `.ply` → convert to **`.splat`** → check orientation → **test
on a real ~$150 Android over 4G** and downsample. Given the site's length, you may
train **per-gopura splats** and/or a decimated whole-ridge splat; keep the
mobile budget in mind.

### Dropping it into the app

Preah Vihear is **not yet wired for a splat**. To add it:

1. Put the capture at **`public/models/preah-vihear.splat`**.
2. In **`src/spots.ts`**, on the `preah-vihear` spot, add
   `splat: "/models/preah-vihear.splat",` and (ideally) a `pois: [...]` array from
   the subjects above.
3. The **◍ Photoreal** toggle and POI teleports appear automatically. See
   [`TODO.md`](../TODO.md).

---

## Field checklist (print this)

- [ ] Site authority + **military/police** coordination done; restricted zones understood
- [ ] Local guide; **stay on marked paths** (mine awareness); water, sun, footwear
- [ ] Dry season; access confirmed; early start; licence = CC-BY
- [ ] No drone
- [ ] Spare batteries/storage; monopod; exposure/focus/WB **locked**; RAW+JPEG
- [ ] Scale reference per subject
- [ ] Sets for: stairway · gopuras I–V · lintels · sanctuary · cliff view
- [ ] **Safety over coverage**; no moving people in frame
- [ ] Backed up twice on site; folders + provenance sheet filled
