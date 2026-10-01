# Licence — `public/models/lab/`

**These files are not under the project's code licence.** They are anatomical
meshes adapted from a third-party work and carry that work's licence.

## Every `.glb` file in this folder

`body.glb`, `heart.glb`, `lungs.glb` and the eighteen `organ-*.glb` files
(`organ-brain`, `organ-spinal-cord`, `organ-thyroid`, `organ-great-vessels`,
`organ-airways`, `organ-diaphragm`, `organ-oesophagus`, `organ-liver`,
`organ-gallbladder`, `organ-stomach`, `organ-pancreas`, `organ-spleen`,
`organ-small-intestine`, `organ-large-intestine`, `organ-kidneys`,
`organ-ureters`, `organ-bladder`, `organ-skeleton`).

| | |
|---|---|
| **Source** | Z-Anatomy — https://github.com/LluisV/z-anatomy |
| **Source files** | `Resources/Models/FBX/`: `CardioVascular41.fbx`, `VisceralSystem100.fbx`, `NervousSystem100.fbx`, `SkeletalSystem100.fbx`, `MuscularSystem100.fbx` (the diaphragm), `LymphoidOrgans100.fbx` (the spleen), `Regions of human body100.fbx` (the skin) |
| **Source licence** | [Creative Commons Attribution-ShareAlike 4.0 International](https://creativecommons.org/licenses/by-sa/4.0/) (CC BY-SA 4.0), per the repository's `LICENSE` and `README.md`, checked October 2026 |
| **Original author** | Lluís Vinent Juanico, with contributions from Gauthier Kervyn |
| **These files' licence** | **CC BY-SA 4.0** |

### Changes made

Each file is an adaptation, produced by
[`scripts/lab/build-organs.mjs`](../../../scripts/lab/build-organs.mjs) from
the selections in
[`scripts/lab/organs.config.mjs`](../../../scripts/lab/organs.config.mjs):

- selected the structures of each exhibit from the system files, and
  discarded the rest;
- for the heart, clipped vessels that leave it to short stubs, keeping the
  largest connected piece of each one that was cut;
- swapped back the triangle winding of mirrored structures, which the source
  stores as the other side's mesh under a negative scale;
- for the skin, dropped landmark patches that lie on top of the body regions
  rather than tiling with them (folds, fossae, nails, the parts of the ear and
  similar — the build reports each one it drops);
- regrouped the structures into the Learning Lab's teaching parts (left
  ventricle, aorta, liver, skeleton, …);
- welded vertices, reduced the triangle count (to between about 1% and 100%
  of the source, depending on the structure and the file), rebuilt smooth normals;
- compressed with `EXT_meshopt_compression` and `KHR_mesh_quantization`.

Colours are applied at display time and are not part of these files.

### ShareAlike

Because these are adaptations of a CC BY-SA work, **anyone who redistributes
any of these files or anything made from them must do so under CC BY-SA 4.0**, with
attribution to Z-Anatomy. This applies to the meshes only: the code that displays
them remains under the project's own licence.

### Attribution in the app

The Learning Lab shows the attribution on the exhibit page whenever one of these
models is on screen — see `credit` in
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
