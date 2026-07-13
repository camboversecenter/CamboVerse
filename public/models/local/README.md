# Local test models (not committed)

This folder is for **evaluating external 3D models locally**, without adding them
to the repository. Everything here **except this README is git-ignored**.

Use it to try a downloaded model (e.g. a Sketchfab glTF) in the running app:

1. Download the model as **glTF/GLB** and unzip it.
2. Copy the `.glb` (and any adjacent textures) into this folder, e.g.
   `public/models/local/angkor-test.glb`.
3. Point a site at it **temporarily** — in `src/spots.ts`, set the spot's
   `model` to `"/models/local/angkor-test.glb"`. **Do not commit that change.**
4. `npm run dev`, open the app, teleport to the site, and evaluate.

## ⚠️ Licensing — read before committing anything

CamboVerse is a **Digital Public Good**. Only assets under an **open license**
may enter the repo:

- ✅ **CC0**, **CC-BY**, **CC-BY-SA** — allowed (CC-BY/SA require attribution +
  provenance).
- ❌ **CC-BY-NC** (Non-Commercial), **CC-BY-ND** (No-Derivatives),
  **"All rights reserved"**, or paid/Store models — **must not be committed or
  deployed.** They break the platform's openness and DPG eligibility.

License-restricted models may be reviewed **here, locally, only**. Replace them
with our own capture/model (see `docs/CAPTURE.md`) or a CC-BY/CC0 alternative —
with attribution — before anything ships.
