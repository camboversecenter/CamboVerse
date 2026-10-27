# Wat Phnom naga staircase — Blender revision 3

This replaces the illustrative staircase in the temple overview, not the trained
Gaussian-splat capture. The previous assets remain intact. Rebuild with Blender:

```powershell
& 'C:\Program Files\Blender Foundation\Blender 5.2\blender.exe' --background --python scripts/redesign-wat-phnom-naga.py
```

## References and limits

The supplied local photos in `D:/Images/wat phnom/stair` were visually inspected:

- `IMG_20260717_112058.jpg`: frontal stair flights, landings, red molded walls,
  cream serpent coping and upper guardians.
- `IMG_20260717_111718.jpg`: large connected seven-head fan and pedestal.
- `IMG_20260717_112130.jpg`: weathered brick treads and risers.
- `IMG_20260717_111158.jpg`, `IMG_20260717_111635.jpg`, and
  `IMG_20260717_111840.jpg`: seated lions, warm stucco and red plinths.

These are modeling references only. Photos are not copied into the web assets;
the packed brick color texture is generated deterministically in Blender.
No capture provenance, photography permission, or image license is inferred.

The model remains **illustrative**, not surveyed geometry or an automatic 3DGS
mesh reconstruction. Three 12-step flights and two landings are an authored
approximation. Intricate sculpture relief is simplified. The original overview's
compressed hill height, temple position, and staircase endpoints are retained;
the real staircase proportions cannot be reproduced exactly within that setting.

## Outputs and integration

`public/models/local/wat-phnom-naga-v3/` contains separate Normal and Ultra GLBs,
editable Blender sources, overview/entrance review renders, and a build report.
Only old `Naga stair` and `Guardians` objects are replaced. The sanctuary, stupa,
terrace, roof and shrines come from the existing corresponding-tier GLB.

Both tiers contain the same steps, landings, seven-head fans, serpent walls and
lions. Normal uses cheaper curved surfaces; Ultra adds smoother sculpture,
small eye/throat relief and softened masonry edges. New geometry is joined by
material into five meshes to limit draw calls. VR uses Ultra through the existing
viewer mode selection. No navigation controls or capture alignment are changed.

The raw and trained splats and the older Blender/GLB models are untouched.
Switching the two Wat Phnom model URLs in `src/spots.ts` back to
`/models/local/heritage-blender-v1/` restores the old overview assets.

## Verification limits

Final local exports: Normal is 1,462,628 bytes / 28,130 triangles; Ultra is
4,802,820 bytes / 121,178 triangles. Each has 23 mesh primitives (five for the
new staircase). Normal stays below the local 2 MiB / 50,000-triangle budget.
Both files return HTTP 200 from the development preview. The 135-test suite
passed, and the nine asset/catalog checks were repeated on the final exports.
Checks include 243 downward floor samples per tier, clearance above the existing
hill, an uphill-monotonic central path, and unchanged bounds for the 18 retained
temple meshes. Normal and Ultra entrance/overview renders and the Ultra hill
integration render were visually inspected; the source cap-overlap issue was
corrected during that review.

Blender renders and structural export tests are checked separately from browser
testing. Desktop renders do not establish low-end Android performance, browser
lighting, walking collisions, or headset behavior. Those device checks remain
required before publishing. This revision is local, not deployed.
