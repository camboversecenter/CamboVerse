# Skull proportion refinement

Local Blender-authored head proportion pass on the existing V3 skeleton.
Skin remains hidden in the Biology room. Original V3 files are preserved.

Changes: lower exaggerated cranial dome, mildly narrow upper silhouette,
taper lower jaw and reduce its forward shelf. Neck base, eye level, all meshes
below 60 cm, body proportions, materials and lesson selection remain unchanged.
This is a modest silhouette correction, not a new scan or validated anatomy.
Dental forms, cheek bones, sutures, cervical joints and hand/foot detail still
need more substantial modelling. Internal brain fit needs separate review.

Reproduce with Blender background mode and `scripts/refine-skeleton-head-v5.py`.
Outputs: `public/models/local/lab-skeleton-head-v5.blend`, Normal/Ultra GLBs,
and head/body review PNGs. LabSkeletonPilot now loads these GLBs, affecting the
room skeleton views and the standalone skeleton pilot, not the standalone head.

Blender head and body renders inspected. Asset checker passes:
`node scripts/check-anatomy-room-v2.mjs --skeleton-head-v5`.
Normal: 31,996 triangles, 3 draws; Ultra: 189,998 triangles, 3 draws.
All skeleton IDs, finite coordinates and full-body scale checks pass.
In-app visual review and physical mobile/VR performance remain unverified.
