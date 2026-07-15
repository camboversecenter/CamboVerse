# Field guide — capturing the Bayon for 3D Gaussian Splatting

A practical, on-the-ground checklist for the team going to the **Bayon**, at the
centre of **Angkor Thom, Siem Reap**, to photograph the temple so we can train a
**3D Gaussian Splatting (3DGS)** model and replace the placeholder with a
photoreal capture.

This is the site-specific companion to [`CAPTURE.md`](./CAPTURE.md) — read that
too for the full pipeline (training, `.ply → .splat`, the coordinate convention,
the mobile budget). Where they differ, **`CAPTURE.md` wins on the technical
pipeline; this file wins on what to shoot at the Bayon.**

---

## 0. Before you go — permission, licensing, etiquette

- **Permission first.** The Bayon is inside the **Angkor Archaeological Park**,
  managed by the **APSARA National Authority**. You need a valid Angkor pass, and
  for a systematic capture (many hours, tripod/monopod, repeated visits) you
  should coordinate with APSARA in advance. Explain it's a non-commercial
  **Digital Public Good**.
- **Licensing (critical for the DPG).** Because *our team* takes the photos, we
  own them and license them openly — agree up front to **CC-BY** (or CC0) for the
  imagery and the resulting splat. Don't mix in any photo you didn't take. Record
  who shot what.
- **Drones: forbidden here.** Drone flight over Angkor is **prohibited** without
  special APSARA/authority permits — do not fly. Ground-level photos are enough
  for 3DGS.
- **Respect the monument and worship.** It's a sacred, fragile 800-year-old
  structure — don't climb on carvings or lean on reliefs. Some shrines hold
  active offerings; be respectful. **Don't photograph identifiable strangers.**

---

## 1. When to go

- **Right at opening (park opens early)** — the Bayon is one of Angkor's busiest
  temples, and **moving people ruin a splat**. First light also gives the face
  towers beautiful modelling.
- **Overcast is ideal** for the deep **bas-relief galleries** — flat, even light
  with no hard moving shadows in the carvings.
- Avoid the **sunrise/sunset crowds** and midday top light. Dry season
  (**Nov–Feb**) for reliable weather.
- Budget **more than one session**: the exterior/upper terrace wants morning
  light; the galleries want overcast or diffuse light. It's a big, complex site.

---

## 2. Gear & camera settings

- A recent **phone** works; a **mirrorless/DSLR** with a 24–35mm-equivalent lens
  is better, plus a slightly **wider lens for the tight galleries**. Bring spare
  batteries and lots of storage.
- **Lock exposure, focus and white balance** between frames on a subject so
  brightness doesn't jump. Shoot **RAW + high-quality JPEG**.
- The galleries are **dark** — raise ISO before dropping shutter below ~1/125s,
  or use a **monopod**; keep frames sharp (blurry frames poison a splat).
- Put a **scale reference** (a 1 m marked pole, or a person standing still with
  consent) in a few frames per subject so we can size the model correctly.

---

## 3. What to shoot (these become the in-app teleport spots / POIs)

The Bayon has no POIs in the app yet — the subjects you capture will **seed
them**. Capture each as its **own orbit set**.

| Subject | Suggested POI | Notes | Target photos |
|---|---|---|---|
| **The face towers** | *The Faces of Bayon* | The hero. The ~200 serene faces on the upper towers — orbit the upper terrace, catching faces from several angles and heights. | 500–900 |
| **Central massif / upper terrace** | *The Central Tower* | The dense cluster of towers around the central sanctuary; shoot the whole massif from the terrace and from below. | 300–600 |
| **Outer gallery bas-reliefs** | *Gallery of Everyday Life* | The long carved walls of daily life, markets, and the **Cham naval battle**. Even light, close and parallel to the wall, full height. | 400–800 |
| **Inner gallery & courtyards** | *Inner Galleries* | Narrow passages, corner towers, and courtyards between the two galleries. | 300–500 |
| **Approach & Angkor Thom context** | *(context)* | A few wide shots of the temple in its clearing; optionally the **South Gate** causeway of gods and demons as arrival context (its own set). | 150–300 |

**Whole-site target: ~2,000–3,000 usable photos** (it's larger and more complex
than Wat Phnom).

---

## 4. How to shoot each subject (the 3DGS method)

- **Orbit, don't pan.** Physically **walk around** each subject in a circle, one
  photo every ~1–2 steps — 3DGS needs parallax from different positions.
- **~70% overlap** between consecutive frames; when in doubt, take more.
- **Three heights per orbit** (low / eye / high). For the tall face towers, add a
  **far orbit** from the terrace edge to get the tops.
- **Galleries:** move slowly along the wall keeping it filling the frame, with
  overlap, then a second pass at a different height and a third at an angle.
- **Consistent light within a set** — shoot each subject in one session; don't
  mix bright sun and deep shade in the same orbit.
- **Avoid** moving people, motion blur, and mixing lit/shadowed frames. Delete
  obvious blur on the spot.

---

## 5. After the shoot — data handling

- **Back up immediately** (two copies) before leaving the park.
- One **folder per subject** (`face-towers/`, `central/`, `outer-gallery/`,
  `inner-gallery/`, `context/`).
- Fill a **provenance sheet** per set: date, shooter, device, licence (CC-BY),
  APSARA permission reference, notes. It travels with the asset.

---

## 6. Processing → the file the app loads

Follow [`CAPTURE.md` §A](./CAPTURE.md) for the full pipeline, and
[`TRAIN_3DGS_KAGGLE.md`](./TRAIN_3DGS_KAGGLE.md) to **train it for free on a
Kaggle GPU**. In short: COLMAP poses → train 3DGS → export `.ply` → convert to
**`.splat`** (SuperSplat) → check the coordinate convention (real captures load
upright as-is; if it's upside-down, rotate the `<Splat>` 180° about X) → **test
on a real ~$150 Android over 4G** and downsample if needed.

### Dropping it into the app

Unlike Wat Phnom, the Bayon is **not yet wired for a splat**. To add it:

1. Put your capture at **`public/models/bayon.splat`**.
2. In **`src/spots.ts`**, on the `bayon` spot, add:
   ```ts
   splat: "/models/bayon.splat",
   ```
   and (optionally, ideally) add a `pois: [...]` array using the subjects above —
   model them on the `angkor-wat` / `wat-phnom` POIs, with `target`/`camera`
   positions in the model's space.
3. That's it — the **◍ Photoreal** toggle appears automatically, and POIs become
   teleport spots. See [`TODO.md`](../TODO.md) for the POI-authoring task.

---

## Field checklist (print this)

- [ ] Angkor pass + APSARA coordination for a systematic capture; licence = CC-BY
- [ ] No drone
- [ ] At opening / overcast for galleries; site quiet
- [ ] Exposure, focus, white balance **locked**; RAW+JPEG; galleries sharp (monopod)
- [ ] Scale reference on each subject
- [ ] Orbits (3 heights, ~70% overlap) for: face towers · central massif ·
      outer gallery · inner gallery · context
- [ ] No moving people in frame
- [ ] Backed up twice on site; folders + provenance sheet filled
