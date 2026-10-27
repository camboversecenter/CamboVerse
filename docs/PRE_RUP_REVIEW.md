# Pre Rup — local illustrative Blender review

## Scope and reference

Refines the existing Pre Rup destination, not a new archive capture or a change
to the project's one-photoreal-temple milestone. Imported on 23 October 2026.

Architectural reference: [Maurice Glaize's Angkor guide, Pre Rup chapter](https://www.theangkorguide.com/text/part-two/large-circuit/prerup.htm).
Consulted for the three-tier pyramid, five upper sanctuaries, eastern tower
groups (one empty base), libraries, enclosure and material hierarchy. This is
a historical architectural description, not a source for current access rules.

Visual reference inspected: [Pre Rup photographs](https://www.angkor-temples-in-cambodia.com/pre-rup.html),
specifically `pre-rup-06-600_orig.jpg`: eastern stair, warm masonry, weathered
brick towers and stone basin. A local research copy is under
`output/pre-rup-review-v2/references/`; it is not embedded in the model or copied
to public assets. The reference photograph retains its owner's rights.
The previously catalogued APSARA page returned HTTP 403 during this review;
it was not relied upon as newly verified evidence.

## What is modeled

- Three stepped terraces, cardinal stair flights and a raised central plinth.
- Five upper brick sanctuaries, twelve small shrine symbols, five eastern
  tower masses plus the sixth base, two west-facing library symbols.
- Two enclosure rings, open gateways, fragmentary halls, basin, scattered
  masonry, and the same peripheral broadleaf tree positions in both tiers.
- Material-batched brick bonds, sandstone frames and vertex-color weathering.

Dimensions, damage, guardian-lion massing and vegetation are interpretive.
This is neither a measured reconstruction nor a restoration proposal. No
inscriptions or deity figures are reproduced. Tower roofs and libraries are
simplified massing, not evidence of their precise surviving condition. The
basin's funerary interpretation is deliberately not stated as established fact.
Khmer site-name editorial review remains pending.

## Integration and navigation

Open Siem Reap → Pre Rup. Four stops: Terraced Ascent, Five Upper Sanctuaries,
Eastern Tower Ruins, Libraries and Stone Basin. Normal and Ultra select paired
assets; VR inherits the existing Ultra policy. New optional `walkStart` is
applied only to Pre Rup. The old default at z=9.5 would start inside its terrace;
the explicit arrival is now [0, 1.29, 13.95], before the lowest stair. The headset
origin uses this same floor location. This does not add VR collision physics or
claim headset navigation was tested. Routes are virtual, not real access advice.

## Rebuild and artifacts

Run Blender with `--background --threads 8 --python scripts/refine-pre-rup.py -- --normal`
and again with `--ultra`. Optional `--no-render` skips review PNGs. The generator
reuses pure primitive helpers from `scripts/refine-oudong.py`, not its scene.

- Public pair: `public/models/local/pre-rup-refined-v2/pre-rup-{normal,ultra}.glb`
- Editable Blender files, reports and renders: `output/pre-rup-review-v2/`
- Old `heritage-blender-v1/pre-rup-{normal,ultra}.glb` files preserved and hashed.

| Tier | Triangles | Material draws | GLB bytes |
| --- | ---: | ---: | ---: |
| Normal | 77,666 | 13 | 1,846,736 |
| Ultra / VR | 219,248 | 13 | 5,235,876 |

Meshopt compression uses the existing bundled decoder. There are no external
textures, animation or exported cameras. Normal retains the same content with
coarser brick courses and cheaper canopy/guardian geometry, using the existing
no-shadow scene setting. Low-end Android/4G frame rates are not measured here.

## Verification and limitations

Blender renders inspected in both modes. Tests decode the actual exported GLBs,
validate finite vertex/index buffers, budget and source hashes, compare tier
content, check all four main stair ascents and descents against floor/waist rays,
confirm arrival floor and camera clearance, and check BVH against standard
triangle intersections. Quantized positions allow a .01-unit floor tolerance.
These are automated geometry checks, not an interactive browser or headset test.
The browser was not used in this review.

Final regression: 190 tests passed across 34 files. Production build passed;
the existing large JavaScript chunk warning remains. This does not substitute
for low-end phone/4G, interactive browser or headset acceptance testing.

Original authored model: CC-BY-4.0, CamboVerse Center / NUM. Generator code:
Apache-2.0. References retain their own rights. No heritage-authority endorsement,
capture permission, or consent documentation is implied by this local study.
The public asset folder is locally ignored under the existing repository rules;
publication/asset packaging is a separate action, not performed here.
