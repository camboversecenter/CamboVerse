# Approved organ set local integration

Source: `public/models/local/complete-organs-review-v2-colors.blend`.
Export: `scripts/export-approved-organs.py` produces versioned
`lab-organs-approved-v1-{normal,ultra}.glb`. Previous assets remain intact.

- Normal: 29,368 triangles, 760,812 bytes.
- Ultra: 183,768 triangles, 4,271,920 bytes.
- Both retain all 19 teaching group IDs and finite geometry.
- Room placement now comes from approved GLB bounds rather than resizing each
  organ to the old procedural bounds. Tray extraction still centers/scales parts.
- Room and generic organ detail pages use the shared approved set.
- Dedicated heart/lung exhibits retain their richer existing lesson mappings;
  the dedicated heart's up-axis is corrected. No chamber lesson was removed.
- Review export is static: source lung breathing morphs are not in this set.
- Normal materials disable transmission and organ shadows; VR chooses Ultra.

Verification: skeleton/organ overlay visually checked in the browser, heart
selection/take/detail/return tested in Normal, stomach take/detail tested in Ultra.
Eight biology state tests pass. This is a coarse placement check, not a complete
skin-containment or anatomical collision validation. Low-end-device and headset
performance remain unmeasured. Assets remain local-development-only, not deployed.
