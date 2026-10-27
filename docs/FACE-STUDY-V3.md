# Biology facial study pilot

Blender separates six exterior study regions from the existing v2 body: left and
right eye assemblies, left and right outer-ear surface regions, external nose,
and lips/mouth region. The assembled body preserves its silhouette. Straight
region cuts are teaching boundaries, not anatomical or surgical dissection planes.
These thin surface patches do not contain nasal passages, teeth, tongue, ear
canals or inner ears. No clinical accuracy is claimed.

Build: Blender background with `scripts/split-body-face-v3.py`. Source v2 and
previous exports remain untouched. Outputs: `public/models/local/lab-body-face-v3`
with Normal/Ultra GLBs, editable `.blend`, assembled/separated render PNGs and stats.
Existing source provenance remains the local hash-verified CC0 MakeHuman hm08 mesh.

Development Biology room uses BodyFaceStudy; standalone whole-body viewer retains
v2. Head parts are reachable through View > Head parts / Search or the Organs
list. Select a part to see information, Take to tray, rotate/zoom, Return. Changing
the selected part, layer or resetting clears extraction. Existing VR passes Ultra
to this component, but headset controls have not been tested.

New identifiers and lesson text live in faceStudy.ts, used by the room and state
transition logic. Skin itself remains non-extractable. Features are DEV-only and
not published; production retains the prior fallback.

Validation: 9 Biology state tests pass; typecheck passes; both GLBs parse and
contain all six IDs, finite coordinates and animation clips. Both Blender renders
reviewed. Ultra browser nose selection/Take/Return and Normal eye selection tested.
Normal: 24,738 triangles, 955,012 bytes. Ultra: 51,304 triangles, 1,921,804 bytes.
Clean boundary cuts increased geometry versus v2; v3 budgets are 25k/55k triangles.
Physical mobile/VR testing, fully anatomical part boundaries and deeper head
structures remain future work. This is milestone 1, not all six roadmap priorities.
