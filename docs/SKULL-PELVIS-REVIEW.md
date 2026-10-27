# Skull and pelvis shape review (V3)

This is the first review gate in the agreed anatomy refinement plan, not a new
production model release. No room component or existing GLB was changed.

Run Blender with `--background --python scripts/build-skull-pelvis-review.py`.
The helper module `build-anatomy-room-v2.py` is now import-safe; executing that
script directly still runs the original export pipeline.

Outputs under ignored `public/models/local`:

- `skull-review-v3.blend` and `pelvis-review-v3.blend`
- `skull-review-v3-{front,side,back}.png`
- `pelvis-review-v3-{front,side,back}.png`
- `skull-pelvis-review.html`: local multi-angle review gallery

Skull geometry is newly constructed rather than covering the old cutaway shell
with a cap. Separate jaw and teeth are retained. Pelvic wings have curved,
thickened surfaces fused to ischiopubic arches, with hip sockets subtracted.
Sacrum is separate with paired foramina. Materials are deliberately plain so
shape issues remain visible rather than masked by textures.

General structural references, not copied meshes or images:
[OpenStax skull](https://openstax.org/books/anatomy-and-physiology/pages/7-2-the-skull),
[OpenStax pelvis](https://openstax.org/books/anatomy-and-physiology-2e/pages/8-3-the-pelvic-girdle-and-pelvis).
Original procedural geometry, still schematic and not medically validated.

Review silhouette, jaw/cheek relationships, socket depth, hip curvature and
posterior views. Sutures, fine foramina, precise articulations and anatomically
validated proportions are not complete. Do not call this photorealistic.

After user shape approval: refine the remaining skeleton/viscera, add region IDs,
export matched Normal/Ultra levels, integrate consistent detail views, then test.
Existing unrelated chemistry build errors are a later separate plan item.
