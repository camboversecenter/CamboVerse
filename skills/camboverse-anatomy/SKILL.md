---
name: camboverse-anatomy
description: Author and verify separable anatomy specimens for the CamboVerse Anatomy room, including named Blender parts, illustrative sections, floating inspection and two-controller manipulation.
---

# CamboVerse anatomy

Start with the organ actually selected in BiologyRoom and check its Normal, Ultra, production fallback and VR representations. The local reviewed organ pack and the standalone specimen detail viewer can use different models. Trace the active path before changing an asset.

Inspect glTF nodes, anatomical IDs, nested transforms and primitives in both tiers. Keep all material primitives of a named structure together. Use mesh positions and authored pivots for highlights and label anchors. An outline or a tissue annotation alone does not establish that the asset contains a detachable mesh.

Separate modeled structures (for example, the authored heart chambers and vessels) using their actual geometry. If an organ has only one continuous mesh, geometric sections can provide an illustrative shape exercise. Label them as sections, never as lobes, chambers or histological structures inferred from shape alone. Preserve the assembled master, normals, materials, coordinates and provenance. New anatomical claims and translations need educator and language review.

An extracted organ floats at a world position within reach. Walking or looking must not drag it along. Regular release preserves its pose; tracking loss must not leave a grip active. Two-hand scale uses the starting hand distance and bounded size. Check either release order and retain one-handed controls. Verify separate/reassemble, return, reset, repeated selection and session exit.

Test a model with named pieces and one with a continuous mesh. Verify finite geometry and unchanged assembled bounds after reassembly. Report desktop, responsive layout, simulated XR and actual hardware observations separately.
