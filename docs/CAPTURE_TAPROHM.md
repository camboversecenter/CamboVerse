# Field guide — capturing Ta Prohm for 3D Gaussian Splatting

A practical, on-the-ground checklist for the team going to **Ta Prohm, Siem
Reap** — the famous "jungle temple" wrapped in tree roots — to photograph it so
we can train a **3D Gaussian Splatting (3DGS)** model and replace the placeholder
with a photoreal capture.

This is the site-specific companion to [`CAPTURE.md`](./CAPTURE.md) — read that
too for the full pipeline. Where they differ, **`CAPTURE.md` wins on the
technical pipeline; this file wins on what to shoot at Ta Prohm.**

---

## 0. Before you go — permission, licensing, etiquette

- **Permission first.** Ta Prohm is in the **Angkor Archaeological Park**
  (**APSARA National Authority**). You need a valid Angkor pass; coordinate with
  APSARA for a systematic capture. It's a non-commercial **Digital Public Good**.
- **Licensing.** *Our* photos, licensed openly — agree **CC-BY** (or CC0) up
  front. Don't mix in images you didn't take. Record who shot what.
- **Drones: forbidden** over Angkor without special permits — do not fly.
- **Safety & conservation.** Ta Prohm is deliberately left "unrestored":
  collapsed galleries, loose stone, and **roped-off / propped areas**. **Never
  cross a barrier** or climb the roots — the trees and stones are fragile and it's
  dangerous. Watch your footing on rubble.
- **Respect worship** and **don't photograph identifiable strangers** (this is
  one of Angkor's most crowded temples — see timing).

---

## 1. When to go

- **Overcast, overcast, overcast.** Ta Prohm sits under heavy tree canopy, so
  sunlight comes through as **dappled, moving spots** — the worst case for 3DGS.
  A **flat grey sky** gives the even light a splat needs. If it's sunny, work the
  shaded interiors and save open areas for cloud.
- **First entry at opening** — it's extremely popular and **people ruin a splat**;
  the iconic "Tomb Raider" tree draws constant crowds later in the day.
- Dry season (**Nov–Feb**). Expect to need **multiple passes** to catch each
  famous root formation crowd-free.

---

## 2. Gear & camera settings

- A recent **phone** works; a **mirrorless/DSLR** with a **wide-ish
  (20–28mm-equiv.)** lens helps in the tight, root-choked spaces. Spare batteries
  and lots of storage.
- **Lock exposure, focus, white balance** per subject. Shoot **RAW + JPEG**.
- Light is **low and contrasty** under the canopy — raise ISO to keep shutter
  ≥~1/125s, or use a **monopod**. Sharp frames only.
- The dynamic range (bright sky through roots vs. dark stone) is brutal — **expose
  for the stone**, avoid blown-out sky in frame where you can.
- Put a **scale reference** in a few frames per subject.

---

## 3. What to shoot (these become the in-app teleport spots / POIs)

Ta Prohm has no POIs in the app yet — the subjects you capture will **seed them**.
The **tree-and-stone entanglements are the hero** of this temple.

| Subject | Suggested POI | Notes | Target photos |
|---|---|---|---|
| **The "Tomb Raider" tree** | *The Strangler Fig* | The most famous root-over-gallery formation. Orbit it fully, low to high, both faces of the wall it grips. | 300–600 |
| **The great silk-cotton roots** | *Roots & Ruins* | The huge Tetrameles roots spilling over the eastern gopura and galleries — several distinct formations, each its own set. | 400–800 |
| **Hall of Dancers** | *Hall of Dancers* | The pillared hall with apsara carvings; even light, cover the reliefs and the space. | 200–400 |
| **Collapsed galleries & courtyards** | *The Fallen Galleries* | The maze of tumbled stone, doorways, and moss — the atmosphere of the place. Stay outside ropes. | 300–500 |
| **Outer approach & gopura** | *(context)* | The forest approach and the face-tower gopura, for arrival context. | 150–300 |

**Whole-site target: ~1,800–2,800 usable photos.**

---

## 4. How to shoot each subject (the 3DGS method)

- **Orbit, don't pan** — walk around each root formation / structure, one photo
  every ~1–2 steps, for parallax. Roots are 3D and tangled: **get every side you
  safely can**, including looking up at overhangs.
- **~70% overlap**; more is better in cluttered geometry.
- **Three heights** per orbit (low / eye / high). Roots reward low angles.
- **One light per set.** Because dappled light shifts minute to minute, shoot each
  formation **quickly in a single window** (ideally under cloud). Don't mix a sunny
  frame into a shaded set.
- **Avoid** moving people, motion blur, and don't cross barriers to get a
  "better" angle — capture what's safely reachable.

---

## 5. After the shoot — data handling

- **Back up immediately** (two copies) before leaving.
- One **folder per subject** (`tombraider-tree/`, `silk-cotton-roots/`,
  `hall-of-dancers/`, `galleries/`, `context/`).
- Fill a **provenance sheet** per set (date, shooter, device, licence CC-BY,
  APSARA permission ref, notes).

---

## 6. Processing → the file the app loads

Follow [`CAPTURE.md` §A](./CAPTURE.md) and
[`TRAIN_3DGS_KAGGLE.md`](./TRAIN_3DGS_KAGGLE.md) (free Kaggle GPU). COLMAP poses →
train 3DGS → export `.ply` → convert to **`.splat`** → check orientation (real
captures load upright; rotate 180° about X if inverted) → **test on a real ~$150
Android over 4G** and downsample if needed. Note: **foliage and thin roots are
hard for COLMAP** — dense overlap and even light make the difference.

### Dropping it into the app

Ta Prohm is **not yet wired for a splat**. To add it:

1. Put the capture at **`public/models/ta-prohm.splat`**.
2. In **`src/spots.ts`**, on the `ta-prohm` spot, add `splat: "/models/ta-prohm.splat",`
   and (ideally) a `pois: [...]` array from the subjects above (model them on the
   `angkor-wat` POIs).
3. The **◍ Photoreal** toggle and POI teleports appear automatically. See
   [`TODO.md`](../TODO.md).

---

## Field checklist (print this)

- [ ] Angkor pass + APSARA coordination; licence = CC-BY
- [ ] No drone
- [ ] **Overcast** if at all possible; at opening; site quiet
- [ ] Exposure/focus/WB **locked**; RAW+JPEG; sharp (monopod in low light)
- [ ] Expose for the stone, not the sky; scale reference per subject
- [ ] Orbits (3 heights, ~70% overlap) for: Tomb Raider tree · silk-cotton roots ·
      Hall of Dancers · galleries · context
- [ ] **No crossing barriers**; no moving people in frame
- [ ] Backed up twice on site; folders + provenance sheet filled
