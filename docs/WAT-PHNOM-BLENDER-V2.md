# Wat Phnom Blender study v2

This is an **illustrative, reference-guided model**, not a measured survey or
photogrammetric capture. It replaces the block-and-cone model in the Wat Phnom
viewer while the old `.glb` and synthetic `.splat` remain on disk for rollback.
The old synthetic splat toggle is hidden for Wat Phnom so it cannot show the
obsolete geometry as though it were a newer photoreal capture.

## Visual references

- [Cambodia Ministry of Tourism: Wat Phnom](https://www.tourismcambodia.org/provinces/search/detail/126/wat-phnom-phnom-penh) — identifies the hilltop sanctuary and the stupa behind it.
- [Tourism Cambodia: Wat Phnom Hill](https://www.tourismcambodia.com/attractions/phnompenh/wat-phnom.htm) — describes the eastern staircase, lion guardians and naga balustrades.
- [Wikimedia Commons Wat Phnom entrance photograph](https://commons.wikimedia.org/wiki/File:Phnom_Penh_Wat_Phnom_04.jpg) — front façade, roof silhouette and stair approach reference.

The model uses **original procedural geometry and a generated roof-tile texture**;
none of the reference photographs is embedded in the asset. Exact proportions,
ornament motifs, surface wear, and hill/stair alignment still require an
on-site measured survey and consent-based capture. The small guardians and
naga heads are deliberately stylized rather than claimed as exact copies of
sacred sculpture.

## Files and regeneration

- Editable Blender source: `public/models/local/wat-phnom-v2.blend`
- Optimized web asset: `public/models/local/wat-phnom-v2.glb` (~0.9 MB)
- Studio review image: `public/models/local/wat-phnom-v2-review.png`
- Generator: `scripts/build-wat-phnom-blender-v2.py`

`public/models/local` is intentionally git-ignored for the current review
workflow. The model works in this local checkout and its build output, but the
`.blend` and `.glb` must be explicitly approved and promoted before a shared
deployment can rely on them.

Run with Blender 5.x:

```powershell
& 'C:\Program Files\Blender Foundation\Blender 5.2\blender.exe' --background --factory-startup --python scripts/build-wat-phnom-blender-v2.py
```

The generated GLB has merged mesh groups to limit draw calls. The app loads
the same model in Normal, Ultra, and VR; the asset itself is intentionally
small enough for the mobile baseline. This does **not** replace the planned
real, permission-based 3D capture described in `docs/CAPTURE_WATPHNOM.md`.
