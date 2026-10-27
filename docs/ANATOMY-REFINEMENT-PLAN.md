# Anatomy refinement sequence

Work in the local Biology lab, retaining versioned Blender sources and exports.
Review one batch before moving to the next. Normal and Ultra must retain the
same anatomy and learning parts; VR uses Ultra.

## Approved continuation — six remaining areas

The following order supersedes the original sequence below, whose completed
history is retained. Work is local; preserve prior assets and do not publish.

| Order | Area | Planned work | Review gate |
|---|---|---|---|
| 1 | Joints | Shoulder socket/upper humerus and knee first; then elbow, hip and ankle | Close-up Blender views, no obvious gaps/intersections, tier and placement checks |
| 2 | Hands and feet | Distinct wrist/ankle bones, improved phalanges and joint ends | Correct part counts and thumb/big-toe arrangement; close-up silhouettes |
| 3 | Head organs | Ear structures, eye/nasal/oral detail and fitting | Combined skull view plus isolated organ views; take/return behavior |
| 4 | Muscles | Named groups, boundaries and attachments | Surface overlaps checked and individual selection/labels verified |
| 5 | Skull and teeth | Roots, remaining cranial detail and internal brain clearance | Section/inside views; no claim of separate bones until actually modeled |
| 6 | Bone microstructure | Improve current humerus/osteon; add another representative bone study | Explicit magnification, matched macro/micro content in both tiers |

For each: inspect current source → reference anatomy where needed → author a
versioned Blender candidate → inspect renders → export Normal/Ultra → validate
region IDs, finite geometry, materials and budgets → connect local loader and
review in-browser. A Blender export alone is not anatomical validation.

Current stage: **3, head organs — ear first pass (fitted V2)**. Eyes, nose and
mouth still need refinement; muscles, skull/teeth and microstructure are queued.
Clinical review and physical
Quest/low-end Android testing remain separate acceptance requirements.

### Stage 3 partial result — fitted head V2 ears

#### Next Blender refinement plan — source and render audit

Eye V3 candidate has now been generated with `build-fitted-head-v3.py`:
corneal dome, iris aperture, lens, retinal lining and tapered optic nerve.
Non-eye V2 organs retained. `check-head-v2.mjs --v3` validates both tiers
(18,680 Normal / 65,736 Ultra triangles for the complete head pack).
Front/side/isolated/cutaway Blender reviews are in `eyes-v3-review.html`.
The cutaway is a temporary Blender review, not a verified browser feature.
Activated V3 locally at the user's explicit request to test it in the room.
Browser cutaway/material, annotation alignment and take/return checks remain
pending; activation is not a completed QA gate. V2 remains available for rollback.
Lens material is an illustrative
dark surface, not a physically transparent lens; orbit fit is still stylized.
Fixed ReviewedOrgan's peel reset to preserve original material opacity and
transparency instead of forcing transparent surfaces opaque. This source
change still requires browser regression testing before claiming verification.

Scope: the fitted head pack used in the local Biology room, not the separate
eye lesson asset. Planning audit only; existing V2 meshes and loader unchanged.
Reviewed V1/V2 authoring sources, V2 combined render and room annotations;
`node scripts/check-head-v2.mjs` still passes both tiers.

| Order | Source/render finding | Blender candidate work | Acceptance check |
|---|---|---|---|
| 1. Eyes | Sphere, iris/pupil discs and optic nerve only; no modeled cornea, lens or retina despite board labels. Frontal render gives a prominent, simplified eyeball appearance. | Refine corneal silhouette, iris seating and nerve junction; add lens/retinal structures for an explicit study cutaway. Check depth in orbit from side and three-quarter views before changing scale. | Labeled structures actually exist and are visible in the appropriate study view; bilateral placement reviewed against V11 skull. |
| 2. Nose | Thin septal ellipsoid and two tubes; no turbinate or olfactory-region geometry despite labels. | Build shaped septum, cavity walls and simplified turbinate shelves; mark the olfactory region as a schematic study feature. | Side/section view distinguishes passage space from solid tissue; structures fit nasal opening without an artificial external nose on the bare skull. |
| 3. Mouth | Tongue, soft palate and uvula are ellipsoids; salivary-gland label has no corresponding mesh. | Shape tongue body/tip and midline groove, refine palate/uvula, then add simplified salivary-gland study geometry or explicitly defer its label. Keep tooth refinement in stage 5. | Inspect jaw/tooth clearance with side and section views; no duplicate tooth meshes; annotations match modeled parts. |
| 4. Ear follow-up | V2 added internal structures; no pinna although the board says outer ear. | Check three-dimensional canal/ossicle relationships and canal attachment; decide a separate outer-ear study view instead of attaching a skin-like ear arbitrarily to the skeleton. | Clearly distinguish internal-ear view from external-ear view; validate labels and take/return behavior. |

Implementation gates for each candidate:

1. Preserve V2 and author a new versioned Blender candidate. Keep organ study
   IDs `eyes`, `nose`, `mouth`, `ears` and the established body coordinate frame.
2. Save matching front/side/three-quarter and isolated/section review renders.
   Review mesh proportions and intersections, not just smoothing or lighting.
3. Export Normal and Ultra with the same study structures. Reduce segments in
   Normal; no transmission, shadows or post-processing required for learning.
   VR uses Ultra. Record triangle counts, materials and file sizes; investigate
   increases rather than silently raising budgets.
4. Check exports for missing IDs, invalid geometry, materials, unintended
   changes to other organs and placement. Mesh validation is not clinical review.
5. Update information-board anchors/labels to actual structures; verify reveal,
   clipping, selection, take, rotate, return and reset in both desktop tiers.
6. Only then switch the local loader. Retain rollback assets, document remaining
   simplifications, and leave production routing unchanged until release review.

Next implementation batch: eyes first. Head-organ completion requires all four
reviews above, not merely exporting a new file. Muscles, skull/teeth and bone
microstructure follow in the previously agreed order. Expert anatomy review and
physical low-end-phone/Quest checks remain outstanding.

- Three semicircular canal loops in distinct planes, simplified eardrum and
  ossicles, tapered cochlear spiral and auditory tube. No outer pinna added.
- Original V1 registration retained; V11 skull used for combined Blender review.
  Isolated ears and combined skull renders inspected. Loops remain schematic;
  no claim of an anatomically complete labyrinth or verified collision clearance.
- `node scripts/check-head-v2.mjs` passes both tiers: all four study IDs, finite
  vertices and unchanged eyes/nose/mouth counts and bounds. Total fitted asset:
  Normal 17,240 triangles; Ultra 60,488 triangles.
- Local loader now uses `lab-head-fitted-v2`; previous version preserved.
  In-room take/return verification is still pending. No physical device tests.
- Source `scripts/build-fitted-head-v2.py`; review source
  `public/models/local/lab-head-fitted-v2-review.blend`; isolated review
  `lab-head-fitted-v2-ears.png`. This is partial progress, not stage completion.
- Structural reference: [OpenStax hearing and vestibular sensation](https://openstax.org/books/biology-2e/pages/36-4-hearing-and-vestibular-sensation).

### Stage 2 result — V11 hands/feet

- Rebuilt wrist blocks, metacarpal fan and staggered digit chains; rounded
  joint ends with terminal tufts. Thumb has two phalanges, other fingers three.
- Rebuilt heel/midfoot and metatarsal/toe rays with a broader big toe and
  unequal lengths. V10 talus retained. No other body regions changed.
- Normal: 44,667 triangles / 1,069,328 bytes. Ultra: 226,932 triangles /
  5,082,296 bytes. Both retain 13 regions and 17 material primitives.
- `node scripts/check-skeleton-regions-v4.mjs --v11` passes: finite geometry,
  tier budgets, region tags and unchanged bounds/counts outside extremities.
- `scripts/check-extremities-v11.py` reimports both exports in Blender and
  verifies 27 closed connected surfaces per hand and 26 per foot, with no
  repair needed. Does not establish anatomical fit or clinical accuracy.
- Inspected hand/foot renders; local loader uses V11. Editable source:
  `public/models/local/lab-skeleton-v11.blend`; authoring:
  `scripts/build-skeleton-v11.py`; review: `hands-feet-v11-review.html`.
- Still simplified: no accessory sesamoids, tendons, ligaments or cartilage.
  Individual bones are not separately selectable. Physical device testing and
  expert review outstanding; this is a first illustrative pass, not photorealism.
- References: OpenStax A&P 2e sections 8.2 and 8.4 (linked on review page).

### Stage 1b result — V10 elbow/hip/ankle

- Elbow: blended distal humeral ends; rebuilt radius with a flatter head and
  ulna with a simplified trochlear notch/olecranon. Corrected a gap detected
  in the first Blender render before local integration.
- Hip: fused the old femoral head/neck/trochanter joins into a continuous
  surface. Retained the existing pelvis and pose.
- Ankle: added medial/lateral malleolar projections and flattened/reseated
  the talus. Toes and carpal/tarsal detail remain for stage 2.
- Normal: 35,878 triangles / 855,124 bytes; Ultra: 206,380 triangles /
  4,591,904 bytes. Both retain 13 regions and 17 material primitives.
- Region/budget checks: `node scripts/check-skeleton-regions-v4.mjs --v10`.
  Preserved-region bounds and counts match V9. Blender re-import validation
  and `scripts/check-joint-connectivity.py` pass for both tiers: three
  connected arm bones per side, no additional mesh repairs needed.
- Matching-camera before/after renders inspected for elbow, hip and ankle.
  Review page: `public/models/local/joint-refinement-v10-review.html`.
  Authoring source: `scripts/build-skeleton-v10.py`; editable Blender source:
  `public/models/local/lab-skeleton-v10.blend`. Local loader now uses V10.
- Browser check: Normal skeleton view displayed; comparison page and its six
  render images load after restarting the local preview server. The served
  loader references V10. Ultra in-room visual verification remains pending
  after the server interruption (export geometry checks passed both tiers).
- This completes the first bony-shape pass across the five target joint areas,
  not final realism or anatomical validation. Soft-tissue joint structures,
  movement, full landmark detail and hardware performance remain unverified.
- Reference: [OpenStax selected synovial joints](https://openstax.org/books/anatomy-and-physiology-2e/pages/9-6-anatomy-of-selected-synovial-joints).

### Stage 1a result — V9 shoulder/knee candidate

- Added shallow glenoid surfaces and scapular necks; closed/remeshed old tube
  ends and tapered the upper humeral shaft into the head. Broadened/flattened
  proximal tibial surfaces and tapered the inferior patellar outline.
- Blender front/back shoulder, knee and whole-body renders inspected. The
  scapular plate, knee condyles and fibular ends remain schematic; no ligaments,
  menisci, cartilage layer or joint motion is claimed. Further work within
  stage 1 is still needed, followed by elbow, hip and ankle refinement.
- Normal: 34,479 triangles / 836,312 bytes; Ultra: 199,181 triangles /
  4,484,544 bytes. Both retain 13 region IDs and 17 material primitives.
- `node scripts/check-skeleton-regions-v4.mjs --v9` passes, including unchanged
  bounds/counts for regions outside arms, legs and shoulder girdle. Skull V8,
  hands, feet, rib cage, pelvis and spine retained; organ assets untouched.
- Mesh validation repaired a duplicate face before export. Re-importing Ultra
  in Blender reports no further mesh repairs required. This is geometry QA,
  not expert anatomical validation or hardware performance certification.
- Source: `scripts/build-skeleton-v9.py`; editable source:
  `public/models/local/lab-skeleton-v9.blend`. Local loader now uses V9.
- Reference: [OpenStax selected synovial joints](https://openstax.org/books/anatomy-and-physiology/pages/9-6-anatomy-of-selected-synovial-joints).

1. **Hands and feet / skeleton V6** — integrate the V4 wrist, finger, ankle and
   toe meshes while preserving the current V5 skull proportions. Check both
   tiers, whole-body placement and close-up Blender renders. Keep skeleton
   selection compatible with the current room.
2. **Skull and teeth** — improve jaw, dental shapes, cheekbones and sutures;
   check the fitted eyes, nose, ears, mouth and brain against the revised skull.
3. **Joints and regional study** — refine shoulder, elbow, hip, knee and ankle
   surfaces; connect the existing skeleton region tags to selection and lessons.
4. **Head organs** — complete ear structures, improve eye/nasal/oral anatomy,
   then align labels and take/return behavior.
5. **Muscles** — separate named muscle groups and improve their boundaries and
   attachments before exposing individual selection.
6. **Bone microstructure** — extend the existing humerus, cutaway and osteon
   studies to additional bones with accurate scale and magnification labels.

For each batch: inspect existing assets → consult anatomy references where
needed → refine in Blender → render and inspect → export Normal/Ultra → check
geometry, parts, materials and placement → integrate → browser review.

These remain illustrative teaching models. Expert anatomical review and actual
Quest/low-end-phone performance measurements are separate acceptance checks.
Production asset routing must also be reviewed before publishing local pilots.

## Batch 1 result

Blender V6 combines the existing V4 hand/foot meshes and 13 region tags with
the V5 skull deformation. Imported through LabSkeletonPilot for local review.
This integrates the previously generated extremity improvement; it does not
claim newly sculpted individual carpal/tarsal shapes or expert validation.

- Normal: 31,989 triangles, 777,556 bytes.
- Ultra: 189,988 triangles, 4,272,812 bytes.
- Both: 13 regions, 16 material primitives. More draws than the previous
  three-primitive skeleton; mobile and VR timing still needs measurement.
- Blender whole-body, hand and foot renders inspected. Shape remains schematic;
  wrist rows and joint ends should receive a later sculpting pass.
- `node scripts/check-skeleton-regions-v4.mjs --v6` passes IDs, geometry and budgets.
- Skeleton remains one selectable group. Region-level interaction is batch 3.
- Source files: `scripts/build-skeleton-v6.py` and
  `public/models/local/lab-skeleton-v6.blend`; previous generations retained.

Next batch: skull and teeth, with a fitted-head alignment review.

## Batch 2 progress — V7 dental/jaw pass

- Generated in Blender from the retained skull review source; V6 body regions
  remain unchanged. Local LabSkeletonPilot now loads V7.
- Replaced repeated rounded teeth with 32 illustrative adult crowns: distinct
  incisor, canine, premolar and molar shapes. Roots are not modeled.
- Narrowed and curved the inferior jaw border. Preserved the existing V5
  coordinate mapping and orbit locations used by the fitted-head assets.
- Inspected front, three-quarter and fitted-eye/nose/ear/mouth Blender renders.
  Browser smoke-check: Normal and Ultra skeleton views and combined anatomy.
- Normal: 31,999 triangles / 777,736 bytes. Ultra: 190,000 triangles /
  4,277,228 bytes. Both retain 13 regions and 16 material primitives.
- `node scripts/check-skeleton-regions-v4.mjs --v7` passes region, finite geometry
  and budget checks. No physical headset/phone performance validation yet.
- Source: `scripts/build-skeleton-v7.py`; editable source and review PNGs:
  `public/models/local/lab-skeleton-v7.blend`, `lab-skeleton-v7-front.png`,
  `lab-skeleton-v7-quarter.png`, `lab-skeleton-v7-fitted.png`.

Batch 2 is **not complete**: skull remains stylized, with cheekbone detail,
sutures and internal brain clearance still requiring refinement/review. Teeth
are not independently selectable. Existing organ meshes were not rebuilt.
Do not present this pass as a medically validated or photorealistic model.

Reference for dental classes and skull landmarks:
[OpenStax teeth](https://openstax.org/books/anatomy-and-physiology/pages/23-3-the-mouth-pharynx-and-esophagus)
and [skull](https://openstax.org/books/anatomy-and-physiology/pages/7-2-the-skull).
Geometry is original illustrative work, not copied reference mesh data.

## Batch 2 progress — V8 cheekbone and suture pass

- Blender reshaping flattens the rounded malar prominence and tapers the
  zygomatic arch, preserving the V7 dental work and existing head fit.
- Added coronal, sagittal and lambdoid surface landmarks, projected onto each
  tier's mesh. These are thin surface markings, not deep cracks, true
  interlocking bone boundaries or separately selectable cranial bones.
- Normal: 32,383 triangles / 793,548 bytes; Ultra: 191,080 triangles /
  4,319,500 bytes. Both retain 13 regions; 17 material primitives (one extra
  for the suture markings). Normal has the same three landmarks with fewer samples.
- `node scripts/check-skeleton-regions-v4.mjs --v8` passes the geometry and
  region checks plus comparison of all non-skull region bounds/triangle counts
  against V7. Hardware frame-rate validation remains outstanding.
- Front, three-quarter, rear, top and fitted-head Blender renders inspected.
  Existing eyes, nasal structures, ear and mouth assets remain unchanged.
  Internal brain clearance and expert anatomy review are still outstanding;
  this is an incremental illustrative refinement, not a realistic scanned skull.
- Local loader points to V8. Previous generations are retained for comparison.
- Restarted localhost preview (the existing browser had an older loaded page),
  confirmed the served module uses V8 and smoke-checked Normal/Ultra room views.
- Source: `scripts/build-skeleton-v8.py`; editable Blender file:
  `public/models/local/lab-skeleton-v8.blend`. Review renders share that prefix.
- Landmark reference: [OpenStax skull anatomy](https://openstax.org/books/anatomy-and-physiology-2e/pages/7-2-the-skull).

## Head-organ refinement — V4 to V6, October 2026

### V7 ear follow-up

- `scripts/build-ears-v7.py` reshapes the outer pinna in Blender and retains
  V6 inner structures, eyes, nose and mouth. Prior V6 exports remain available.
- Both ears carry side identifiers. The Biology room extracts the right ear
  for study and restores the paired mesh when returned. The initial study
  rotation faces its lateral surface toward the viewer.
- Blender render inspected: `lab-head-fitted-v7-ear.png`. This remains a
  stylized illustration, not photorealistic or medically validated anatomy.
- `scripts/check-ears-v7.mjs` passed both tiers, including unchanged non-ear
  bounds/triangle counts and correct side separation. Fifteen focused tests passed.
- Manifest selects V7 for local testing. Browser navigation timed out during
  this pass: visual take/return, label placement and headset testing remain pending.
- Next: finish room verification, then mouth refinement.

### V7 browser follow-up and V8 mouth candidate

- Local preview recovered. Checked single-right-ear extraction and return in
  Ultra and Normal; inspected the settled restored body view. No physical VR test.
- `scripts/build-mouth-v8.py` exports separate V8 candidates and a Blender
  preview, with a fuller tongue root, oral floor and arched palate.
- V8 is NOT selected in the asset manifest. Render review still shows detached
  gland/duct presentation; further work is needed before replacing V7.
- Candidate source: `lab-head-fitted-v8-review.blend`; preview:
  `lab-head-fitted-v8-mouth.png`. V7 stays active and all previous assets remain.

### V9 mouth: connected cutaway, local activation

- Blender builder `scripts/build-mouth-v9.py` extends V8 with partial cheek
  walls and parotid duct endpoints reaching the oral cavity. Submandibular
  ducts start within the glands. Preserves the V7 eyes, ears and nose.
- Inspected isolated render and skull-fit render generated with
  `scripts/render-mouth-v9-fit.py`. Still schematic, not clinically validated.
- `scripts/check-mouth-v9.mjs` passes finite vertices, part IDs, unchanged
  non-mouth geometry/side tags and geometry budgets. Whole head totals:
  Normal 44,172 triangles; Ultra 164,068 triangles. Not a hardware FPS test.
- Manifest now selects V9. Updated tongue/palate annotation heights and model
  limitations. All 15 focused tests pass.
- Browser smoke checks: Ultra rotation, zoom and labels; take/return in both
  tiers. Label crowding remains visible at the default desktop distance.
- Previous versions retained. Phone/Quest performance and expert anatomy
  review remain outstanding. No production deployment performed.

Sequential Blender passes completed and V6 selected for the local room:

1. V4 nose: septum, curved lateral walls, three shelves per side, olfactory regions and vestibule rims.
2. V5 mouth: shaped tongue, palate, uvula, arches, paired salivary glands and illustrative ducts.
3. V6 ears: concave outer shells, helix/antihelix, tragus and lobules around the retained inner-ear structures.

Eyes remain unchanged from V3. All tiers retain eyes/nose/mouth/ears study groups;
individual new substructures are not independently selectable. Normal uses fewer
geometry samples. V6 totals 37,828 triangles in Normal and 143,564 in Ultra.

Source: `scripts/build-head-refinement-v4.py` (stage argument 4, 5 or 6).
Editable source: `public/models/local/lab-head-fitted-v6-review.blend`.
Combined and isolated Blender renders inspected. `scripts/check-head-v6.mjs`
checks finite geometry, IDs, budgets and unchanged non-target geometry across
each stage. Prior versions are retained. Central asset manifest pins V6.

These are first-pass illustrative teaching meshes, not photorealistic or
medically validated anatomy. Remaining work: expert anatomical review, annotation
anchor review, finer surface sculpting and physical mobile/VR performance tests.
Local development activation does not constitute production deployment.

### Follow-up: presentation and anchor checks

- Recovered V6 head landmarks with Blender using `scripts/inspect-head-anchors.py`
  (read-only; no mesh assets changed). Stored body-frame anchors in
  `src/anatomyPresentation.ts`.
- Fixed annotations using whole-body positions on centered extracted meshes;
  head labels now use authored V6 locations and all pins subtract the part center.
- Marker sizes scale with the part diameter instead of overwhelming small parts.
- Mobile study distance now fits a bounding sphere to the available viewport.
  Body return coordinates and VR tray placement remain unchanged.
- Fourteen focused tests passed; browser checks covered nose labels in Ultra,
  mouth extraction/return and Normal ear extraction. This is not a complete
  clinical alignment audit or physical device validation.
- Remaining: label collision avoidance at different angles, detailed skull-fit
  review (especially hidden internal structures), and actual phone/Quest testing.

### Nose V11 — local import, October 2026

- Blender-authored rounded septum, tapered curved shelves, nasal floor and open
  anterior cutaway; original illustrative geometry, not a clinical model.
- Exported both tiers and pinned the room's head asset to V11. Nose geometry:
  6,024 triangles Normal; 25,656 Ultra. Same teaching structures in both tiers.
- Preserved V10 mouth/teeth, eyes, ears and their study metadata; automated
  comparison checks unchanged triangle counts and bounds for non-nasal parts.
- Reviewed isolated Blender render and skull-fit render. Updated nose anchors
  from the shared registration transform. Kept previous asset files intact.
- All 16 focused tests passed. Browser checked Ultra extraction, rotation/zoom
  controls and switching to Normal, plus Normal return and re-extraction.
- Final Ultra return check was interrupted by browser unavailability. Physical
  phone/VR performance, full clinical validation and production deployment are
  not verified. Remaining presentation issue: labels crowd small viewports.

### Eyes V12 — local surface refinement

- Blender-generated radial iris geometry, colored fibers and darker pupil/limbal
  margins; warmer sclera shading. Existing shells, lens and nerve remain schematic.
- Both tiers exported and head manifest pinned to V12. Eye triangles: 5,992 Normal,
  22,168 Ultra. No optical transmission added. Prior versions retained.
- Non-eye triangle counts, bounds, ear side tags and study-only dentition metadata
  checked against V11. Both exports passed; all 16 focused tests passed.
- Isolated and temporary cutaway Blender renders reviewed. Cutaway render is not
  a new in-room mode. Room checks covered eye extraction/return in both tiers and
  rotation/zoom controls in Ultra. Local preview left on eye study tray.
- Full head alignment/label review, real phone/VR tests and production rollout
  remain pending. These are illustrative models, not medically validated anatomy.

### Combined head and label review — 8 October 2026

- Rendered V12 head with V11 skull from front and side using
  `scripts/review-head-v12-fit.py`. Study-only mouth dentition hidden, matching
  assembled-room behavior. Meshes and registration were not changed. Visual
  review is not clinical validation; simplified bone/tissue shapes remain.
- Non-VR head study now offers accessible, wrapping structure buttons with
  44px minimum height and a single selected 3D label, available at default zoom.
  Full names remain in the information panel; hidden internal landmarks are
  explicitly explained. VR retains existing in-world label behavior.
- Label canvas textures are disposed on replacement/unmount. Other organ label
  visibility retains its previous zoom threshold.
- 17 focused tests passed. Browser checked all four head lists, selection and
  return in Normal and Ultra at a narrow viewport; refreshed/re-entered to verify
  updated UI. Latest V12 assets preserved. Phone/Quest hardware tests pending.

### Stationary study placement — 8 October 2026

- Removed per-frame camera following on small screens. Extraction captures one
  world position in front of the visitor; walking/looking and quality changes do
  not move that anchor. Desktop/VR retain the fixed tray destination.
- Added explicit Place on room tray control. Returning clears placement so a
  later extraction can capture a fresh position. Status distinguishes room study
  from explicit tray placement; Take out replaces the misleading take-to-tray label.
- 18 focused tests passed. Browser verified lateral movement leaves the organ
  behind, Normal tray placement/return/re-extraction, and Ultra tray placement.
- This is fixed placement, not arbitrary drag-and-drop positioning or VR grabbing.
  Headset hardware validation remains pending; no meshes changed.
