# Field guide — capturing Wat Phnom for 3D Gaussian Splatting

A practical, on-the-ground checklist for the team going to **Wat Phnom, Phnom
Penh** to photograph the site so we can train a **3D Gaussian Splatting (3DGS)**
model and replace the placeholder with a photoreal capture.

This is the site-specific companion to [`CAPTURE.md`](./CAPTURE.md) — read that
too for the full pipeline (training, `.ply → .splat`, the coordinate convention,
the mobile budget). Where they differ, **`CAPTURE.md` wins on the technical
pipeline; this file wins on what to shoot at Wat Phnom.**

---

## 0. Before you go — permission, licensing, etiquette

- **Permission first.** Wat Phnom is an active temple and a national historic
  site. Coordinate in advance with the temple committee / Ministry of Culture
  and Fine Arts. Explain it's a non-commercial **Digital Public Good**.
- **Licensing (critical for the DPG).** Because *our team* takes the photos, we
  own them and can license them openly. Agree up front to release the imagery
  and the resulting splat under **CC-BY** (or CC0). Do **not** mix in any photo
  you didn't take. Record who shot what.
- **Drones: check first.** Wat Phnom is in central Phnom Penh near government
  buildings — drone flight is likely **restricted and needs written permission**.
  Do not fly without it. Ground-level phone/camera photos are enough for 3DGS;
  treat drone shots as a bonus only if cleared.
- **Respect worship.** Dress modestly (shoulders/knees covered), remove shoes
  where required, don't photograph people at prayer or monks without asking,
  and pause capture during ceremonies. **Don't photograph identifiable
  strangers** — for both etiquette and to keep the dataset clean.

---

## 1. When to go

- **Early morning, right at opening** — soft light, long-but-gentle shadows,
  and, crucially, **few people** (moving people ruin a splat).
- **Overcast is ideal**: flat, even light with no hard moving shadows.
- **Dry season (Nov–Feb)** for reliable weather; avoid festival days
  (Khmer New Year, Pchum Ben) when the site is packed.
- Avoid **midday** (harsh top light) and **anything with people milling around**
  the flower clock — that plaza is busiest.

---

## 2. Gear & camera settings

- A recent **phone** is fine; a **mirrorless/DSLR** with a 24–35mm-equivalent
  lens is better. Bring spare batteries and storage (you'll shoot a lot).
- **Lock exposure and focus** between frames on a subject (manual or AE/AF lock)
  so brightness doesn't jump. **White balance fixed**, not auto.
- Shoot **RAW + high-quality JPEG**. Fast shutter (≥1/250s) to stay sharp.
- Keep the **whole subject in frame** and stay sharp corner-to-corner.
- Put a **scale reference** in a few frames (a 1 m marked pole or a person
  standing still, with consent) so we can size the model correctly.

---

## 3. What to shoot (maps to the in-app teleport spots)

Capture each of these as its **own orbit set**. Aim for the counts below;
more is better if light and crowds allow.

| Subject | In-app POI | Notes | Target photos |
|---|---|---|---|
| **The great white stupa** | *The Great Stupa* | Orbit all 4 sides + the spire from low and mid angles. The tall white cone is the hero — get it clean. | 300–600 |
| **The vihara (main hall)** | *The Vihara* | Exterior all around; the tiered orange roof + gold finials; **interior if permitted** (the Buddha, painted walls). | 300–600 |
| **Naga staircase** | *Naga Staircase* | The full flight, both **naga balustrades**, the seven-headed naga heads and guardian lions at the foot. Shoot from the base looking up and from the sides. | 200–400 |
| **The flower clock** | *The Flower Clock* | The circular garden from several heights and angles; get the clock face and curb. | 150–300 |
| **Smaller shrines & satellite stupas** | (context) | The gold-roofed shrines and white stupas around the terrace. | 150–300 |
| **Approach & hill context** | *City Overlook* | The wooded slope, paths, and a few wide shots showing the hill in its park setting. | 150–300 |

**Whole-site target: ~1,500–2,500 usable photos.**

---

## 4. How to shoot each subject (the 3DGS method)

- **Orbit, don't pan.** Physically **walk around** the subject in a circle,
  taking a photo every ~1–2 steps. Panning from one spot is not enough — 3DGS
  needs parallax from different positions.
- **~70% overlap** between consecutive frames. When in doubt, take more.
- **Three heights per orbit:** low (waist), eye level, and high (arms up / a
  monopod). For tall things like the stupa, add a far orbit to get the top.
- **Cover every face**, including awkward backs and undersides of eaves.
- **Consistent light within a set** — shoot each subject in one session; don't
  mix bright sun and shade in the same orbit.
- **Avoid**: reflections, glass, water, anything moving (people, flags, dogs),
  and motion blur. Delete obviously blurry frames on the spot.

---

## 5. After the shoot — data handling

- **Back up immediately** (two copies) before leaving the site.
- One **folder per subject**, named clearly (`stupa/`, `vihara/`,
  `naga-stairs/`, `flower-clock/`, …).
- Fill a **provenance sheet** per set: date, shooter, device, licence (CC-BY),
  permission reference, and any notes. This travels with the asset into the
  Open Khmer Heritage Archive.

---

## 6. Processing → the file the app loads

Follow [`CAPTURE.md` §A](./CAPTURE.md) for the full pipeline. In short:

1. **Camera poses** via COLMAP (most tools wrap this).
2. **Train 3DGS** (Nerfstudio `splatfacto`, INRIA `gaussian-splatting`, or a
   turnkey app like Postshot / KIRI / Luma / Polycam). Export **`.ply`**.
3. **Convert `.ply → .splat`** (SuperSplat, or antimatter15's converter).
4. **Coordinate convention:** real 3DGS captures are already Y-down/Z-flipped and
   load **upright as-is** — do **not** apply the Y/Z pre-flip our *synthetic*
   generator uses. If it loads upside-down/underground, rotate the `<Splat>`
   180° about X (see `CAPTURE.md` §A.4).
5. **Mobile budget:** keep the splat count modest and **test on a real ~$150
   Android over 4G**. Downsample if load/framerate is poor.

### Dropping it into the app

The Wat Phnom spot is **already wired** for a splat:

```
// src/spots.ts → wat-phnom
splat: "/models/wat-phnom.splat"
```

Replace **`public/models/wat-phnom.splat`** (currently a synthetic placeholder)
with the real capture, keep the same filename, and the in-app **◍ Photoreal**
toggle will show it. No code change needed.

---

## Field checklist (print this)

- [ ] Permission / committee contact confirmed; licence = CC-BY agreed
- [ ] Drone cleared in writing (or ground-only)
- [ ] Early morning / overcast; site quiet
- [ ] Exposure, focus, white balance **locked**; RAW+JPEG
- [ ] Scale reference shot on each subject
- [ ] Orbits (3 heights, ~70% overlap) for: stupa · vihara · naga stairs ·
      flower clock · shrines · hill context
- [ ] No moving people/objects in frame
- [ ] Backed up twice on site; folders + provenance sheet filled
