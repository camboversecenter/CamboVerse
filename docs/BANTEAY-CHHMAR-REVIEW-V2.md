# Banteay Chhmar — reference-led Blender review v2

Status: **UNAPPROVED. Do not import into the application.**
The user rejected the broad illustrative v1 pass and requested a site-by-site
review using real satellite and close-up references. The app catalog and v1
assets are unchanged by this work.

## References inspected visually

- Satellite-backed conservation outline, Global Heritage Fund, reproduced in
  Olivier Cunin's chapter: https://architexturez.net/file/bayon-fig-02-jpg
- Annotated satellite overview: https://photodharma.net/Cambodia/13-Banteay-Chhmar/Banteay-Chhmar-Map.jpg
- LiDAR overview, credited to Damian Evans (2016):
  https://www.angkorphotographytours.com/wp-content/uploads/2018/01/banteay-chhmar-lidar-1024x721.jpg
- Main temple face tower 18, close/approach view:
  https://www.angkorphotographytours.com/wp-content/uploads/2018/01/face-tower-banteay-chhmar.jpg
- Two surviving main-temple towers:
  https://www.angkorphotographytours.com/wp-content/uploads/2018/06/banteay-chhmar-towers.jpg
- Inner enclosure plan, orientation read from its compass (east is left):
  https://angkor.cc/images/Bchhmar/BChhmar_inner.jpg
- Dimensional/condition cross-check, Cambodia's UNESCO Tentative List submission:
  https://whc.unesco.org/en/tentativelists/6456/

These historical references are not a current survey. Do not mistake the small
satellite temple named Ta Prohm for the surviving main-temple towers. Photographs
were viewed as references only; none were copied into materials or redistributed.
The model uses original geometry and procedural stone/foliage materials.

## Interpretation

Metres, X east, Y north, Z up. The primary gallery envelope is approximately
250 × 200 m. The larger moat context uses the published approximately 770 × 690 m
envelope and 63 m channel width; the core is offset north of the moat centre.
The three linked east–west complexes, partial galleries, six pools and surviving
tower silhouettes replace the earlier generic square courtyard.

The review represents a **ruin**, not a fully restored conjectural ancient state.
Individual tower placement/height, missing roof sections, block distribution and
face proportions are approximate and need review. The sculpted faces are original
interpretations, not traced replicas. No claim of archaeological accuracy or
photogrammetric reconstruction is made. Satellite imagery cannot resolve carvings.

## Artifacts and review order

Output: `public/models/local/banteay-chhmar-review-v2/` (ignored local staging).

1. `03-satellite-layout.png`: examine orientation, moat and core proportions.
2. `01-core-overview.png`: examine galleries, axial organization and ruin character.
3. `02-face-towers.png`: examine tower massing, integrated facial relief and stone.
4. `banteay-chhmar-review-v2.blend`: editable source with the three review cameras.

Run with Blender 5.2:

```powershell
& 'C:\Program Files\Blender Foundation\Blender 5.2\blender.exe' --background --python scripts/build-banteay-chhmar-review-v2.py
```

No GLB is exported. Normal/Ultra optimization, UV baking and application integration
must wait for the user's approval of the shape and appearance.

## Review run

Generated and rendered with Blender 5.2.2 LTS. All three renders were inspected.
The first review found overly regular crown courses, sparse tree foliage and
trees intersecting pools. A second generation introduced eroded rounded crowns,
denser individual-leaf canopies, pool exclusion and varied soil shading.
The second run completed successfully. Appearance is still a provisional draft;
it does not yet reproduce the fine carved ornament or exact individual damage
seen in the close-up photographs. No project model was replaced.
