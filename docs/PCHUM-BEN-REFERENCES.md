# Pchum Ben — Blender study and source record

26 October 2026. Requested workflow: research → Blender modelling and render → glTF export → app integration.

## Sources actually consulted

- The Metropolitan Museum of Art, **Enthroned Buddha**, Cambodia (probably Phnom Penh), dated 1923, accession 2013.247a–h. [Collection record](https://www.metmuseum.org/art/collection/search/78429). The catalogue describes the earth-touching right hand and tiered throne. These conventions inform the new original statue; its proportions, gold-toned finish and simplified face are artistic choices. The catalogue text was consulted; the model is not a replica of this silver object.

- John Clifford Holt, **Caring for the Dead Ritually in Cambodia**, *Southeast Asian Studies* 1(1), 2012, DOI 10.20495/seas.1.1_3. [Publisher's full text](https://englishkyoto-seas.org/2015/12/vol-1-no-1-john-clifford-holt/). The web posting is dated 2015; the article is 2012. Consulted sections describe the fifteen-day observance, temple variation and distinctions between rice distribution and merit-making. Photographs 3 and 5 were visually inspected for the paper silhouette and tray/leaf forms. Reference photographs were not copied into textures or redistributed.
- Oum Sonita and Leng Len, **Annual Ceremonies Honor Ancestors and Wandering Spirits**, VOA Khmer, 29 September 2015. [Reporting](https://khmer.voanews.com/a/annual-ceremonies-honor-ancestors-and-wandering-spirits/2984026.html). Consulted reporting on visits and offerings. The AP photograph linked from this page failed to load through the research tool; it is not claimed as visually inspected.
- Holt's related book chapter, *Pchum Ben: Caring for the Dead Ritually in Cambodia*, in *Theravada Traditions*, was located in the publisher catalogue but not read in full. The accessible research article above is the substantive reference.

## Interpretation limits

This is an original composite pagoda study, not a scan, historical reconstruction or replica of a named temple. Building proportions, arrangement, materials, food quantities and seating counts are artistic choices. No fabricated deity, sacred lettering, recitation, participant likeness or throwing game is included. The setting is intentionally quiet and unoccupied. The reference photographs support object forms; they do not authenticate the entire model.

Five learning stages explain preparation, bay ben where observed, food offerings to monks, merit dedication and the concluding day. They are not five obligatory consecutive rites on one morning. Existing `before-dawn`, `offering` and `ben-thom` IDs remain; `bay-ben` and `dedication` are added. The old claim that everything closes was removed. The template remains pending cultural review. Newly written Khmer labels must be reviewed before adding them.

## Deliverables and reproducibility

- Generator: `scripts/build-pchum-ben-blender.py` using Blender 5.2.
- Source: `public/models/local/pchum-ben-v2/pchum-ben-study.blend` (v1 is retained).
- Review render: `public/models/local/pchum-ben-v2/blender-review.png`.
- Close-up renders: `public/models/local/pchum-ben-v2/blender-objects-review.png` and `blender-hall-review.png`.
- Runtime: `pchum-ben-normal.glb` and `pchum-ben-ultra.glb` in the same folder.
- Measured export data: `manifest.json` beside the files.

Objects are authored in Blender, grouped by teaching ID and merged by material. The renderer imports these GLBs, hides inactive teaching groups and toggles the sala roof. It does not silently replace missing assets with the old procedural scene. All textures are original, locally generated and embedded. Mesh references and materials are reused across scene clones; the loader cache owns their disposal.

Normal retains every learning object with lower segment counts and no shadows. Ultra increases roundness and adds bevelled edges. VR raises fidelity to Ultra using the existing room entry; real headset and low-end Android performance remain unverified. File size and triangle counts are measured, not frame-rate guarantees.

The `.blend` opens with a camera and lights for review. Later-stage meshes and the sala roof are hidden in the opening viewport and render; they can be revealed in Blender's Outliner. All teaching groups are present in both GLBs. No `.blend` or PNG download is required to open the web scene.

## Remaining cultural review

Verify paper flag silhouettes and terminology, local ritual order, the depicted offering arrangements and architecture with a Khmer monastic/cultural adviser. Licensed chants, participant animation and a surveyed temple require separate source and consent work.

## Walkable vihear update

The background worship hall now has separate walls, an open doorway, stairs,
an interior floor and a Buddha image on a raised altar. It represents a generic
pagoda vihear, not the archaeological site of Preah Vihear. The sala remains
the foreground gathering space. Sculpture refinement and local review are still
needed before describing this as an authentic reconstruction.

Pchum Ben has Overview and Walk navigation (not extra fidelity tiers). Walk
reuses the lab's first-person controls with WASD/arrows, drag-look and a touch
joystick. Four nearby story stops open with E, a Read button or double-tap.
Movement pauses while notes are open and resumes without resetting position.
Places offers shortcuts to each stop. Objects remain selectable through the
information board; the Buddha image cannot be grabbed or moved. Overview
retains every lesson and object for people who prefer not to walk.

The actual Blender meshes provide floors, stairs and collision surfaces.
Automated tests inspect both exported tiers for an open doorway, solid walls,
the interior floor and altar obstruction, as well as size and geometry budgets.
Normal is about 302 KB / 7,025 triangles; Ultra about 1.09 MB / 32,445 triangles,
with 33 material batches each. No remote asset requests are needed.

Browser checks cover keyboard walking, stop shortcuts, reading/resuming and
Normal/Ultra switching. This does not establish low-end Android frame rate or
headset controller usability; physical-device acceptance testing remains open.
