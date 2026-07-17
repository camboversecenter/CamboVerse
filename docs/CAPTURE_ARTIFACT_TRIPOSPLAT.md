# One-photo artifact capture with TripoSplat

A fast way to turn **a single photo of an object** into a 3D asset for the
**🏺 Khmer Life** gallery — a pot, a basket, an instrument, a cake, a carving.
It uses **TripoSplat** (VAST-AI-Research), which reconstructs a 3D Gaussian
Splatting model from one image.

> **This is for objects, not sites.** A single photo can't reconstruct a whole
> temple — for Angkor-scale places use the multi-view flow in
> [`TRAIN_3DGS_KAGGLE.md`](./TRAIN_3DGS_KAGGLE.md). And read the honesty note
> below: a one-photo model is a *plausible reconstruction*, not a measured
> record.

## Why we can use it

- **Licence: MIT** — code *and* weights (`VAST-AI/TripoSplat` on HuggingFace).
  MIT is an open, DPG-compatible licence (commercial OK, no NC/ND). You must
  **retain the notice and credit VAST-AI-Research**.
- **Output is `.ply` / `.splat`** — the format CamboVerse already renders.
- **Open weights + ComfyUI** — runs on a free GPU (Kaggle/Colab), offline once
  the weights are downloaded.

## Steps

1. **Pick — and consent to — the photo.** One clear, well-lit shot of the object
   on a plain background works best. If it belongs to an artisan, a museum, or a
   person, **get their permission** and note it. Only use a photo you have the
   right to share (your own, or an open-licensed one).
2. **Run TripoSplat on a free GPU.** Follow the repo's README
   (<https://github.com/VAST-AI-Research/TripoSplat>) — the HuggingFace model or
   the ComfyUI node. Input the photo; export the `.ply` / `.splat`.
3. **Make it light for a $150 phone over 4G.** Splats can be huge. Decimate the
   Gaussian count, compress, and target the mobile budget in
   [`CAPTURE.md`](./CAPTURE.md). (A `.glb` mesh export, if you make one, is often
   smaller — either works; CamboVerse renders both.)
4. **Add the artifact** in `src/artifacts.ts` (Khmer + romanised + English name,
   story, utilities, origin, `pois`) — the same as any artifact — and set its
   `model` (and/or `splat`).
5. **Label it honestly** with a `provenance` block:

   ```ts
   provenance: {
     method: "ai-image",
     tool: "TripoSplat (VAST-AI-Research, MIT)",
     by: "Your Name",
     license: "CC-BY-4.0",           // the licence of *your* asset + source photo
     sourcePhoto: "© You, CC-BY-4.0", // credit + consent for the source photo
   },
   ```

   The gallery then shows a **🤖 AI-reconstructed from a photo** badge and a
   plain note that it's a reconstruction, not a measured record.

## The honesty rule (important)

CamboVerse is a heritage Digital Public Good. A single-image model **invents the
sides it can't see** — it's great for approachable, engaging object models, but
it is **not evidence** of what the real object looks like. So:

- Always mark these `method: "ai-image"`. Never present one as a faithful capture.
- For anything that needs to be authoritative (a museum piece, a specific
  artifact of record), prefer a **real capture** — photogrammetry or multi-view
  3DGS with the object's custodian's consent.
- Keep source-photo **consent and credit** with the asset.

## Credit

TripoSplat © VAST-AI-Research, MIT Licence
(<https://github.com/VAST-AI-Research/TripoSplat>). Credit it in your PR and it
carries into the artifact's provenance line in the app.
