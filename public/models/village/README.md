# Khmer Village asset kit

Original stylized assets created in Blender for CamboVerse. No third-party
models, photographs or textures. These are concept illustrations, not scans
or verified reconstructions of a named village, house or religious site.

License: [CC-BY-4.0](https://creativecommons.org/licenses/by/4.0/).
Attribution: **CamboVerse contributors**. Retain attribution and indicate changes.

Each asset is exported in `normal` and `ultra` detail with matching dimensions
and a ground-level pivot. GLBs use vertex colors, one material and one mesh.
See `manifest.json` for sizes and triangle counts.

Source libraries: `assets/village/village-normal.blend` and
`assets/village/village-ultra.blend`. Rebuild with Blender in background using
`scripts/build-village.py`; validate with `node scripts/check-village.mjs`.
Generator and application code are Apache-2.0, separate from the asset license.
