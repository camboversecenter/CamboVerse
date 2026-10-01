# Licence — `public/models/lab/`

**These files are not under the project's code licence.** They are anatomical
meshes adapted from a third-party work and carry that work's licence.

## `heart.glb`

| | |
|---|---|
| **Source** | Z-Anatomy — https://github.com/LluisV/z-anatomy |
| **Source file** | `Resources/Models/FBX/CardioVascular41.fbx` |
| **Source licence** | [Creative Commons Attribution-ShareAlike 4.0 International](https://creativecommons.org/licenses/by-sa/4.0/) (CC BY-SA 4.0), per the repository's `LICENSE` and `README.md`, checked October 2026 |
| **Original author** | Lluís Vinent Juanico, with contributions from Gauthier Kervyn |
| **This file's licence** | **CC BY-SA 4.0** |

### Changes made

`heart.glb` is an adaptation, produced by
[`scripts/lab/build-heart.mjs`](../../../scripts/lab/build-heart.mjs):

- selected the structures of the heart and the roots of its great vessels from
  the cardiovascular system, and discarded the rest;
- clipped vessels that leave the heart to short stubs, keeping the largest
  connected piece of each one that was cut;
- regrouped the structures into the Learning Lab's teaching parts (left
  ventricle, aorta, coronary arteries, …);
- welded vertices, reduced the triangle count to roughly a third, rebuilt
  smooth normals, recentred and rescaled;
- compressed with `EXT_meshopt_compression` and `KHR_mesh_quantization`.

Colours are applied at display time and are not part of this file.

### ShareAlike

Because this is an adaptation of a CC BY-SA work, **anyone who redistributes
`heart.glb` or anything made from it must do so under CC BY-SA 4.0**, with
attribution to Z-Anatomy. This applies to the mesh only: the code that displays
it remains under the project's own licence.

### Attribution in the app

The Learning Lab shows the attribution on the exhibit page whenever this model
is on screen — see `credit` in
[`src/components/LabRealModels.tsx`](../../../src/components/LabRealModels.tsx).
Do not remove it.

### Not yet checked

Z-Anatomy's `LICENSE` points to a separate document on the licensing of its
models:
`https://docs.google.com/document/d/1peWW_7IiVgTTAwcI_auv38YSJ6qGWRuTMxzzhkRpXIk/`
It could not be opened from the environment this was built in. **Someone should
read it before this is distributed further**, in case it carries conditions
beyond the CC BY-SA 4.0 stated in the repository — for example, attribution to
an upstream dataset the models were derived from.
