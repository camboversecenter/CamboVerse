# Blender lungs and airways pilot

Original schematic geometry generated locally; no downloaded meshes or textures.
Generator code follows the repository Apache-2.0 licence; generated pilot content
is CC-BY-4.0, attribution: CamboVerse contributors. This is not a medical scan or
an educator-validated anatomy reference.

## Reproduce

```powershell
& 'C:\Program Files\Blender Foundation\Blender 5.2\blender.exe' --background --factory-startup --python-exit-code 1 --python scripts/generate-lab-lungs-pilot.py
node scripts/check-lab-lungs-pilot.mjs
npm run typecheck
```

The generator clears only its fresh Blender process's scene. Outputs are ignored
local files: `lab-lungs-normal.glb`, `lab-lungs-ultra.glb`, `lab-lungs-pilot.blend`
and `lab-lungs-stats.json` under `public/models/local/`.

Both tiers contain the same six lesson IDs, with three right-lung lobes, two left
lobes and a selectable notch surface. Whole, See through and Airways map to the
existing lesson controls. See-through tissue does not intercept airway clicks.
The deforming tissue and bronchial tree share a breathing morph; trachea is fixed.

Normal: 9,600 triangles, ~355 KB, nine mesh draws. Ultra/VR: 44,160 triangles,
~1.55 MB, nine mesh draws. Two materials; color detail is stored in vertices.
Normal uses fewer radial segments and fewer distal branches, no shadows and no
transmission. Both assets are currently uncompressed. Shallow recessed grooves and
surface color mark schematic fissures; they are not complete anatomical fissure walls. Branches
are illustrative, not a reconstruction of all bronchopulmonary segments/alveoli.

The pilot is development-only with procedural loading/error/production fallbacks.

The September 18 refinement uses the user's AI-generated multi-view image as a
visual shape guide, not anatomical evidence: leaning apices, wider basal surfaces,
concave bases, a deeper anterior-medial notch and oblique/horizontal grooves.
No pixels from the reference are embedded. The upper airway tips were refitted
inside the new silhouette. An anatomical reviewer must still validate the model.
Low-end Android/4G, headset, and educator review remain required before adoption.
The smoke test verifies part/lobe parity, bounds, finite geometry/morphs, and
geometry/draw budgets. Do not infer target-device performance from file size alone.
