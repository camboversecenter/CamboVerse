# Village life milestone plan

1. Guided house visit: yard, veranda and interior viewpoints in one existing house.
   Use accessible buttons first; free walking/stair collision remains a later pass.
2. Five household objects: water jar, basket, cooking pot, winnowing tray and mortar.
   Blender-generated Normal/Ultra assets; inspect in a rotatable close-up.
3. One clearly fictional resident narrative, with no invented historical attribution.
4. A short winnowing concept activity: choose airflow and observe separation.
   Illustrative, not a physical simulation or historical reconstruction.
5. Verify types, asset loads and state logic. Keep all content in Normal mode.

Cultural/architectural and Khmer language review required before educational release.
No period or region is asserted. No deployment or wider village rebuild in this pass.

## Implemented prototype

Added veranda/interior orbit viewpoints and Explore household life panel, five
Blender lathed study props with Normal/Ultra exports, fictional story text, and a
three-airflow winnowing illustration with reset and reduced-motion support.
Basket weave, pestle, historically verified construction, free walking, spoken
resident dialogue and headset-accessible study UI remain unfinished.

TypeScript passes. All ten new GLBs parsed with Three.js; combined sizes are
37,348 bytes Normal and 82,052 bytes Ultra. Browser initially showed a cached old
village; refresh revealed the local server was stopped. A server restart was
requested, but visual verification of the new panel has not yet been completed.

## Follow-up checks — 27 September 2026

- Object preview now renders on demand, recenters per selection, and has loading,
  WebGL-unavailable and asset-error messages. Descriptions remain outside the 3D view.
- Opening the panel focuses its close button; Escape closes it and returns focus.
- Repeated tosses replay the illustration; reduced-motion skips animation.
- Indoor viewpoint labels and the guided-orbit limitation are explicit.
- `node scripts/check-village-household.mjs` passes for all 10 GLBs, including
  finite vertex positions, normals, materials and lower Normal geometry counts.
- The local HTTP endpoint returned 200. Browser automation remains blocked on its
  connection-error page, so the new visuals, mobile layout and indoor camera
  placement are NOT verified. Manual review is still required.
- Current full-project typechecking reports errors in BiologyRoom, EarthSky,
  Physics and faceStudy files outside this change. The test run also reports a
  Grove signed-observation verification failure and two lab-presentation failures
  (material counts and preview manifest coverage): 97 passed, 3 failed overall.
  This is not a clean release gate.

Manual review: open Khmer Village → Explore household life; inspect all five
objects in Normal and Ultra, compare all three airflow outcomes, repeat a toss,
reset, read the story, and close with Escape. Check veranda/interior viewpoints
and phone-width layout before accepting the milestone. No headset or low-end
device performance validation has been performed.
