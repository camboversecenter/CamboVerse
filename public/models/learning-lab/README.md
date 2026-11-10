# CamboVerse Learning Lab web models

This directory contains reviewed **runtime exports** for the Learning Lab. They
are teaching illustrations, not medical scans or validated anatomical atlases.
Normal uses reduced geometry; Ultra and VR use the detailed pair. The source
`.blend` files, MakeHuman input, reference images and capture data remain local.

The Blender geometry was authored by CamboVerse contributors and is shared as
**CC-BY-4.0, CamboVerse Center / National University of Management**. Body and
muscle surfaces include an adapted MakeHuman core base mesh, distributed under
**CC0 1.0**. The pinned source and checksum are documented in
`docs/LAB_BODY_PILOT.md`. No separately downloaded MakeHuman asset packs are used.
The [MakeHuman license](https://www.makehumancommunity.org/about/license.html)
confirms that its core graphical assets are CC0.

The exported models were produced by the project scripts under `scripts/` and
their generation and review notes under `docs/`. `manifest.json` records each
published file's exact hash and size. The runtime files can be restaged from the
reviewed local exports with `node scripts/publish-learning-lab-assets.mjs --copy`.
This command intentionally copies only the named GLBs and five catalog renders.
