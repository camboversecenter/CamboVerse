# Field guide — capturing Banteay Srei for 3D Gaussian Splatting

A practical, on-the-ground checklist for the team going to **Banteay Srei**
(~25 km north-east of the main Angkor group, **Siem Reap province**) — the "citadel
of women", famous for exquisitely fine carving in rose-pink sandstone — to
photograph it for a **3D Gaussian Splatting (3DGS)** capture.

This is the site-specific companion to [`CAPTURE.md`](./CAPTURE.md). Where they
differ, **`CAPTURE.md` wins on the technical pipeline; this file wins on what to
shoot at Banteay Srei.**

---

## 0. Before you go — permission, licensing, etiquette

- **Permission first.** Banteay Srei is within the **APSARA National Authority**'s
  remit (a separate ticketed area farther out). Carry a valid pass and coordinate
  with APSARA for a systematic capture. Non-commercial **Digital Public Good**.
- **Licensing.** *Our* photos, openly licensed — agree **CC-BY** (or CC0). No
  third-party images. Record who shot what.
- **Drones: forbidden** without special permits — do not fly.
- **You (mostly) can't go in.** The three central sanctuaries are **roped off** to
  protect the carving; you shoot from the surrounding **paths and perimeter**.
  Plan for that (see gear — a **short telephoto** matters here). Never cross the
  barriers.
- **Respect** the monument and **don't photograph identifiable strangers.**

---

## 1. When to go

- **Early morning**, right at opening — the site is small and gets **packed with
  tour groups** mid-morning, and **people ruin a splat**. Early light also warms
  the pink sandstone beautifully.
- **Soft/overcast light** shows the deep carving best; **hard midday sun** blows
  out the pale stone and casts busy shadows in the reliefs. If sunny, a **light
  overcast or the golden first hour** is the sweet spot.
- Dry season (**Nov–Feb**). It's a ~45-min drive from Siem Reap — go early.

---

## 2. Gear & camera settings

- A recent **phone** works for the overall structure, but because you're often
  **kept back behind ropes**, a **camera with a short telephoto (50–100mm-equiv.)**
  is very useful for the fine pediments and lintels. Bring both a normal and a
  longer lens if you can.
- **Lock exposure, focus, white balance** — and **fix white balance** carefully:
  the **rose-pink colour** is the signature of this temple, so keep it consistent
  across a set (shoot a grey card once). **RAW + JPEG.**
- Fast shutter (≥1/250s) for crisp carving detail; the relief is the whole point.
- Put a **scale reference** in a few frames.

---

## 3. What to shoot (these become the in-app teleport spots / POIs)

Banteay Srei has no POIs in the app yet — your subjects will **seed them**. Here
the **fine carving is the hero**, not sheer size.

| Subject | Suggested POI | Notes | Target photos |
|---|---|---|---|
| **The three central towers** | *The Rose Sanctuaries* | The pink-sandstone prasats. Orbit from the permitted path at several heights; use the telephoto for the upper carving. | 300–600 |
| **Ornate pediments & lintels** | *The Carved Pediments* | The celebrated deep-relief Hindu scenes (e.g. over the doorways and library gables). Shoot each **square-on and slightly raked** to read the depth. | 300–600 |
| **Guardian figures** | *The Temple Guardians* | The kneeling guardian statues at the tower doorways (the ones in place / replicas). | 150–300 |
| **The libraries** | *The Libraries* | The two ornate library buildings with their famous pediments. | 200–400 |
| **Causeway, moat & gopuras** | *(context)* | The processional approach, the moat, and the entry gopuras with their carved gables. | 200–400 |

**Whole-site target: ~1,200–2,000 usable photos** (small site, but capture
**densely** for the fine detail).

---

## 4. How to shoot each subject (the 3DGS method)

- **Orbit, don't pan** — walk the permitted path around each structure, one photo
  every ~1–2 steps, for parallax. Where ropes limit you, orbit a **wider arc** at
  a constant distance and lean on the telephoto for detail.
- **~70% overlap**, and **denser than usual** — fine carving needs many views to
  resolve.
- **Three heights** where the path allows (low / eye / high).
- **Consistent light and white balance within a set** — the pink stone must look
  the same colour across all frames of a subject.
- **Avoid** moving people, motion blur, and mixing sun/shade in one set.

---

## 5. After the shoot — data handling

- **Back up immediately** (two copies).
- One **folder per subject** (`central-towers/`, `pediments/`, `guardians/`,
  `libraries/`, `approach/`).
- Fill a **provenance sheet** per set (date, shooter, device, licence CC-BY,
  APSARA permission ref, notes).

---

## 6. Processing → the file the app loads

Follow [`CAPTURE.md` §A](./CAPTURE.md) and
[`TRAIN_3DGS_KAGGLE.md`](./TRAIN_3DGS_KAGGLE.md) (free Kaggle GPU). COLMAP poses →
train 3DGS → export `.ply` → convert to **`.splat`** → check orientation → **test
on a real ~$150 Android over 4G** and downsample if needed. The reward here is
**carving fidelity**, so favour a slightly higher splat budget on the towers if
the phone can still hold framerate.

### Dropping it into the app

Banteay Srei is **not yet wired for a splat**. To add it:

1. Put the capture at **`public/models/banteay-srei.splat`**.
2. In **`src/spots.ts`**, on the `banteay-srei` spot, add
   `splat: "/models/banteay-srei.splat",` and (ideally) a `pois: [...]` array from
   the subjects above.
3. The **◍ Photoreal** toggle and POI teleports appear automatically. See
   [`TODO.md`](../TODO.md).

---

## Field checklist (print this)

- [ ] Pass + APSARA coordination; licence = CC-BY
- [ ] No drone
- [ ] Early morning / soft light; site quiet
- [ ] Exposure/focus **locked**; **white balance fixed** (grey card) for the pink stone
- [ ] Telephoto for behind-the-rope detail; scale reference per subject
- [ ] **Dense** orbits (3 heights, ~70%+ overlap) for: central towers · pediments ·
      guardians · libraries · approach
- [ ] **No crossing ropes**; no moving people in frame
- [ ] Backed up twice on site; folders + provenance sheet filled
