# Five-photo 360 tour test

23 October 2026. Local test with the five user-provided stitched meeting-room,
corridor and walkway photos. Open `/?view=360-test`, or the map's **360° Photo
Test** button. No upload, deployment or content licence assignment was performed.

The photographs display on inward-facing spheres. Drag or arrows look around;
pinch, scroll and buttons change field of view. Click a floor marker, its label,
or a location button to switch viewpoint. A brief fade covers loading and honors
reduced-motion preferences. Scene heading is retained between locations using
initial visual alignment estimates. The five-point panel can be hidden.

Normal uses 2048×1024 photos (~155–232 KiB each); Ultra and VR use 4096×2048
(~465–709 KiB each). All locations are available in each mode. Only the requested
photo loads; replaced textures are disposed. No renderer shadows or lighting
passes are needed. VR is optional WebXR, with clickable scene markers; actual
headset and browser interaction remain unverified in this session.

Source JPGs at `D:/Images/360` remain unchanged. Viewing copies are generated in
`public/models/local/panorama-test` using FFmpeg scale and JPEG encoding. The
camera support, glare, people and existing image artefacts were retained for
this test. Generated copies are local review assets, not a public photo archive.

Connections: outside ↔ corridor ↔ entrance ↔ tables ↔ screen. These are discrete
photo positions, not reconstructed floors or collision geometry. Arrow positions
and relative headings require review in the actual tour; no surveyed position
data was provided. A flat perspective preview of the entrance was inspected to
check photo suitability. Projection tests raycast the real sphere and check that
each marker lands on its configured image pixels; graph tests check both image
sizes exist and all five locations have return connections.

Implementation: `src/components/PanoramaTour.tsx`, `src/panoramaTour.ts`.
