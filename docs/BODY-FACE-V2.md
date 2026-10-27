# Whole-body facial detail, local v2

The Biology room Skin view and standalone whole-body surface share LabBodyPilot.
They now load `lab-body-face-v2-{normal,ultra}.glb` instead of the old MakeHuman
exports. Old assets are preserved. Other anatomy layers and standalone head are unchanged.

Generated in Blender using the existing hash-verified local CC0 MakeHuman hm08
source, with `scripts/generate-lab-body-makehuman.py --facial-v2` (arguments after
Blender's `--`). The optional flag leaves the original generation path available.
The editable source and full-body/face render PNGs are in `public/models/local`.

Changes: subdivision before reduction in both tiers, weighted face preservation,
lip vertex colour, pupils, and projected eyebrow strands. Nose, lips, eyelids and
ears are retained from the source mesh rather than bolted-on primitive shapes.
These are visible exterior features, not individually removable anatomy lessons.
No teeth, tongue, ear canal or internal nasal structures were added.

Checks: Blender render reviewed; Three.js load, matching parts, height, feet,
breathing animation and geometry budgets pass in `check-lab-body-pilot.mjs --facial-v2`.
Normal: 17,252 triangles / 625,536 bytes. Ultra: 39,766 triangles / 1,411,716 bytes.
Both have 10 draw meshes, opaque materials, and identical content. TypeScript passes.
The imported surface was visible in the Biology room. Chromium reported generic
UnknownError messages during the room check; rendering continued. No physical
phone or VR benchmark was performed. This is a schematic teaching model, not a
scan or clinically validated anatomy. Local assets remain unpublished/git-ignored.
