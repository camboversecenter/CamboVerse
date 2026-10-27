# Fitted head study pack

Generated with `scripts/build-fitted-head-v1.py` in Blender. Four selectable IDs:
eyes, ears, nose, mouth. The pack uses the exact skull-review-to-body transform
and V5 skull deformation. Original skull and body files are preserved.

Eyes include sclera, iris, pupil and optic-nerve stubs. Nose includes illustrative
septal cartilage and nasal passages. Ears include canal and simplified inner-ear
spirals/loops, not outer pinnae or a complete middle ear. Mouth includes tongue,
soft palate and uvula; the skull supplies teeth. These are illustrative forms,
not clinically validated anatomy or a photoreal reconstruction.

Normal and Ultra retain the same parts (14,640 / 40,848 triangles; 306,104 /
857,948 bytes). Both exports parsed with Three.js; four IDs and finite vertices
checked. Five head visibility tests pass. Blender assembled render inspected.
Live browser assembly, selection, tray return and label placement still require
verification. Existing annotation positions have not been realigned in this pass.

ReviewedOrgan routes these IDs to lab-head-fitted-v1 instead of the unrelated
viscera asset. Old procedural facial fallbacks are suppressed to prevent the
misaligned shapes returning during load or failure. Local development only;
publication and fallback coverage remain separate work.
