# Field guide — capturing Sambor Prei Kuk for 3D Gaussian Splatting

A practical, on-the-ground checklist for the team going to **Sambor Prei Kuk**, the ancient Chenla capital in **Kampong Thom**, to photograph the temple so we can train a **3D Gaussian Splatting (3DGS)** model and replace the placeholder with a photoreal capture.

This is the site-specific companion to [`CAPTURE.md`](./CAPTURE.md) — read that too for the full pipeline. Where they differ, **`CAPTURE.md` wins on the technical pipeline; this file wins on what to shoot at Sambor Prei Kuk.**

---

## 0. Before you go — permission, licensing, etiquette

- **Permission first.** Sambor Prei Kuk is managed by the Ministry of Culture and Fine Arts and local authorities. You must coordinate with the site stewards in advance for a systematic capture. Explain it's a non-commercial **Digital Public Good**.
- **Licensing (critical for the DPG).** Agree up front to **CC-BY** (or CC0) for the imagery and the resulting splat.
- **Respect the monument and forest.** The brick temples are older and more fragile than Angkor. Do not lean on or touch the brickwork.
- **Local community.** The area has strong community-based tourism. Support local guides and respect the active village life around the site.

---

## 1. When to go

- **Early morning or late afternoon.** The forest canopy casts deep dappled shadows during midday, which can confuse 3DGS. Soft, diffused light or overcast days are ideal for the brick structures.
- **Dry season** is generally easier for moving around the forest, but the wet season offers incredibly lush greens if the light is even.

---

## 2. Gear & camera settings

- A **mirrorless/DSLR** with a 24–35mm-equivalent lens is best, as the forest can be dense and spaces tight around the octagonal temples.
- **Lock exposure, focus and white balance**. The dappled forest light makes this absolutely critical.
- Use a **tripod or monopod** if the forest canopy makes the temples too dark for sharp handheld shots.

---

## 3. What to shoot (these become the in-app teleport spots / POIs)

Capture each as its **own orbit set**.

| Subject | Suggested POI | Notes | Target photos |
|---|---|---|---|
| **Prasat Sambor** | *Prasat Sambor* | The North Group. Focus on the main central tower and its intricate brick carvings. | 300–500 |
| **Prasat Tao** | *Prasat Tao (Lion Temple)* | The Central Group. The hero shots are the beautifully preserved stone lions guarding the doors. | 200–400 |
| **Prasat Yeay Poan** | *Prasat Yeay Poan* | The South Group. Capture the dramatic interplay of tree roots and brick gateways. | 400–600 |
| **Octagonal shrines** | *(context)* | Sambor Prei Kuk is famous for unique octagonal brick shrines. Capture at least one fully. | 150–250 |

---

## 4. How to shoot each subject (the 3DGS method)

- **Orbit, don't pan.** Walk around the temple or shrine.
- **~70% overlap** between consecutive frames.
- **Watch out for trees.** The dense forest makes perfect circles difficult. Do your best to maintain distance, or shoot smaller clustered objects if a full orbit is blocked.
- **Consistent light.** Don't mix bright sunbeams and deep forest shade in the same orbit if possible.

---

## 5. Dropping it into the app

1. Put your capture at **`public/models/sambor-prei-kuk.splat`**.
2. In **`src/spots.ts`**, on the `sambor-prei-kuk` spot, add `splat: "/models/sambor-prei-kuk.splat",`.
