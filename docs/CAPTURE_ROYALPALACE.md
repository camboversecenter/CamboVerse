# Field guide — capturing the Royal Palace for 3D Gaussian Splatting

A practical, on-the-ground checklist for the team going to the **Royal Palace &
Silver Pagoda, Phnom Penh** to photograph it for a **3D Gaussian Splatting
(3DGS)** capture.

This is the site-specific companion to [`CAPTURE.md`](./CAPTURE.md). Where they
differ, **`CAPTURE.md` wins on the technical pipeline; this file wins on what to
shoot at the Royal Palace.**

> ⚠️ The Royal Palace is a **working royal residence** with the **strictest
> access and photography rules** of any site here. Much of it is off-limits, and
> **photography is forbidden inside several buildings**. Respect every sign and
> guard — this capture is exteriors and permitted areas only.

---

## 0. Before you go — permission, rules, licensing

- **Permission first.** The complex is administered by the **Ministry of the
  Royal Palace**; a systematic capture needs their coordination (and the
  **Ministry of Culture and Fine Arts**). Explain it's a non-commercial **Digital
  Public Good**. Do not assume a normal visitor ticket covers a tripod/monopod
  shoot — ask.
- **Photography rules are strict.** Interiors of the **Throne Hall** and the
  **Silver Pagoda** are generally **no-photography** — do not shoot where it's
  prohibited. The **King's residence (Khemarin) and private zones are closed**.
  Capture only the **exteriors and public grounds** you're permitted to.
- **Dress code enforced:** shoulders and knees covered; you may be turned away
  otherwise.
- **Licensing.** *Our* photos, openly licensed — agree **CC-BY** (or CC0). No
  third-party images. Record who shot what.
- **Drones: forbidden** over the palace (central Phnom Penh, government airspace).
- **Respect worship and privacy** — the Silver Pagoda is an active temple; **don't
  photograph identifiable visitors** or officials.

---

## 1. When to go

- **At opening**, morning session — the palace **closes over midday** and reopens
  in the afternoon, so plan around the hours, and mornings are **less crowded**
  (people ruin a splat).
- **Bright overcast** is ideal for the ornate roofs and the long mural gallery;
  hard midday sun blows out the gilded surfaces and white walls.
- Dry season (**Nov–Feb**). Avoid ceremony days when areas close to the public.

---

## 2. Gear & camera settings

- A recent **phone** works; a **mirrorless/DSLR** with 24–35mm (plus a short
  telephoto for roof finials and mural detail) is better. Check whether a
  **monopod/tripod** is allowed before relying on one.
- **Lock exposure, focus, white balance** per subject. **Gilded/reflective**
  roofs are tricky — expose to hold highlight detail; avoid direct glare.
  **RAW + JPEG.**
- Fast shutter (≥1/250s), sharp frames only.
- Put a **scale reference** in a few frames where appropriate and permitted.

---

## 3. What to shoot (these become the in-app teleport spots / POIs)

The Royal Palace has no POIs in the app yet — your **permitted** subjects will
**seed them**. Focus on **exteriors and the mural gallery**.

| Subject | Suggested POI | Notes | Target photos |
|---|---|---|---|
| **The Throne Hall (Preah Tineang Tevea Vinnichay)** | *The Throne Hall* | The hero exterior — the spired central roof and façades. Orbit the exterior fully at several heights. **Interior: no photos.** | 400–800 |
| **The Silver Pagoda (Wat Preah Keo) exterior** | *The Silver Pagoda* | The temple exterior and its terrace. **Interior photography is prohibited** — exteriors only. | 300–600 |
| **The Reamker mural gallery** | *The Reamker Murals* | The long painted cloister wall (the Khmer Ramayana) — **where photography is permitted**, shoot it parallel and evenly lit along its length. | 300–600 |
| **Stupas, mondap & garden monuments** | *The Royal Gardens* | The royal stupas, the bell tower/mondap, and garden pavilions. | 250–500 |
| **Napoleon III Pavilion & gates** | *(context)* | The iron pavilion and the ornate perimeter/gates for arrival context. | 150–300 |

**Whole-site target: ~1,500–2,500 usable photos** (permitted areas only).

---

## 4. How to shoot each subject (the 3DGS method)

- **Orbit, don't pan** — walk around each building, one photo every ~1–2 steps,
  for parallax. For the **mural gallery**, do a **dense parallel sweep** along the
  wall plus a second pass at a different height.
- **~70% overlap**; three heights where space and rules allow.
- **Consistent light per set** — do each building in one session under steady
  light; gilded roofs especially must not mix sun and cloud within a set.
- **Stay in permitted areas.** If an interior or zone is off-limits, it simply
  isn't part of this capture — don't improvise.
- **Avoid** moving people, motion blur, glare off gold/glass.

---

## 5. After the shoot — data handling

- **Back up immediately** (two copies) before leaving.
- One **folder per subject** (`throne-hall/`, `silver-pagoda/`, `reamker-gallery/`,
  `stupas/`, `context/`).
- Fill a **provenance sheet** per set (date, shooter, device, licence CC-BY,
  Ministry permission ref, notes) — provenance and consent are especially
  important for the royal complex.

---

## 6. Processing → the file the app loads

Follow [`CAPTURE.md` §A](./CAPTURE.md) and
[`TRAIN_3DGS_KAGGLE.md`](./TRAIN_3DGS_KAGGLE.md) (free Kaggle GPU). COLMAP poses →
train 3DGS → export `.ply` → convert to **`.splat`** → check orientation → **test
on a real ~$150 Android over 4G** and downsample. Gilded and reflective surfaces
are hard for 3DGS — dense, even-light coverage helps most.

### Dropping it into the app

The Royal Palace is **not yet wired for a splat**. To add it:

1. Put the capture at **`public/models/royal-palace.splat`**.
2. In **`src/spots.ts`**, on the `royal-palace` spot, add
   `splat: "/models/royal-palace.splat",` and (ideally) a `pois: [...]` array from
   the permitted subjects above.
3. The **◍ Photoreal** toggle and POI teleports appear automatically. See
   [`TODO.md`](../TODO.md).

---

## Field checklist (print this)

- [ ] Ministry of the Royal Palace coordination done; monopod/tripod cleared
- [ ] Dress code met; **no-photo zones understood** (Throne Hall & Silver Pagoda interiors)
- [ ] Opening session (mind the midday closure); licence = CC-BY
- [ ] No drone
- [ ] Exposure/focus/WB **locked**; expose for gilded highlights; RAW+JPEG
- [ ] Scale reference where permitted
- [ ] Sets for: Throne Hall exterior · Silver Pagoda exterior · Reamker gallery ·
      stupas/garden · context
- [ ] **Permitted areas only**; no moving people in frame
- [ ] Backed up twice on site; folders + provenance sheet filled
