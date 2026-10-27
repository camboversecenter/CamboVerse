# Blender → Three.js pilot for the Learning Lab

For the MakeHuman exterior-body pilot, provenance and reproduction steps, see
[LAB_BODY_PILOT.md](LAB_BODY_PILOT.md).
For the original eye model and its three lesson layers, see
[LAB_EYE_PILOT.md](LAB_EYE_PILOT.md).
For the lung surfaces, breathing and airways, see
[LAB_LUNGS_PILOT.md](LAB_LUNGS_PILOT.md).

This is a **local pilot path** for a richer Lab model. Blender is an authoring
tool; the visitor never downloads or runs Blender. The browser continues to use
Three.js, react-three-fiber, and WebXR.

Start with the heart. It is small enough to keep within the mobile budget, has
clear named teaching parts, and can demonstrate a useful animation (a beat)
without becoming a medical reference.

## What to make

Create two source collections in Blender:

- `heart-normal` - low-poly mesh, one 512 px texture atlas at most, one baked
  `idle` heartbeat animation.
- `heart-ultra` - smoother mesh, one 1024 px texture atlas at most, optional
  normal map, and the same `idle` animation.

Both files must contain the same teaching parts and use these exact object
names. The app's labels, layer controls, and quizzes rely on the names rather
than guessing from a mesh.

| Blender object name | Lab part |
|---|---|
| `part-myocardium` | Heart muscle |
| `part-lv` | Left ventricle |
| `part-rv` | Right ventricle |
| `part-la` | Left atrium |
| `part-ra` | Right atrium |
| `part-aorta` | Aorta |
| `part-pulmonary-trunk` | Pulmonary trunk |
| `part-vena-cava` | Venae cavae |
| `part-coronary` | Coronary arteries |

Keep origin at the centre of the heart, use centimetres as the working scale,
and apply transforms before export. This Lab is a schematic teaching tool, not
a clinical model: use only openly licensed reference material and obtain an
educator review before describing anatomical detail.

## Export settings

Export each collection as glTF Binary (`.glb`) with:

- **Selected Objects** enabled
- **Apply Modifiers** enabled
- **Animations** enabled; bake only the intentional clips
- texture images packed into the GLB
- no cameras, lights, or unused objects
- no runtime physics or simulation; bake the motion to keyframes

Save the files locally as:

```text
public/models/local/lab-heart-normal.glb
public/models/local/lab-heart-ultra.glb
```

The `local` folder is git-ignored. It lets us assess an asset's performance and
teaching quality before its licence, provenance, and source `.blend` file are
ready for publication.

## Mobile budgets

| Budget | Normal | Ultra / VR |
|---|---:|---:|
| Triangles | 10,000–20,000 | 30,000–50,000 |
| Materials | 1–2 | 1–4 |
| Texture atlas | 512 px | 1024 px |
| Animation clips | 1 | 1–3 |
| Draw calls | 10 or fewer | 25 or fewer |

Normal and Ultra contain the same named parts and the same educational content.
Ultra is allowed smoother geometry, richer materials, shadows, and secondary
motion; it must never be the only way to see a part or learn the lesson.

## Compression and review

Before a model may leave `public/models/local/`:

1. Verify its licence is CC0, CC-BY, or CC-BY-SA, with creator, source,
   provenance, and any required consent recorded.
2. Run meshopt or Draco compression and KTX2/Basis texture compression where
   compatible with the target browser test.
3. Test the Normal asset on the target low-end Android device over 4G.
4. Confirm that every object named above can be selected and that its label,
   layer, and quiz still work.
5. Commit the source `.blend`, exported GLBs, and provenance metadata together
   only when the asset is ready to become part of the open archive.

## Pilot decision

Keep the present procedural heart as the baseline. Adopt a Blender heart only
if it is clearer to learn from, remains within the Normal budget, and does not
break the existing cutaway, part-selection, or VR experience. Otherwise retain
the procedural geometry and reuse what the pilot teaches us about materials and
animation.
