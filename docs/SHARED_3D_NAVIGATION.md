# Shared 3D exploration controls

Local update, 23 October 2026. No model, quality-tier, archive, backend or payment
changes. This replaces fixed-pivot inspection restrictions, not walking physics.

## Visitor controls

- Drag / one finger: rotate around the current focus point.
- Right-drag, or two-finger drag: pan (move camera and focus together).
- Wheel / pinch: zoom.
- Collapsible **Camera** menu: Rotate or Move drag mode, directional buttons,
  zoom buttons, Reset view. Move makes a left-drag/one-finger drag pan.
- Keyboard while the canvas is focused: arrows operate the selected mode,
  plus/minus zoom, R resets. No global key listeners or form-input shortcuts.
- Manual input stops automatic spinning. Existing spin toggles can resume it.
- Reset returns to the view saved before the first interaction at the current
  destination/preset. A new POI or inspection preset starts a new reset anchor.

Screen-space panning is intentionally free: it is camera inspection, not grounded
walking or collision simulation. Existing walking modes remain unchanged. Scene
zoom and vertical-angle limits remain; horizontal rotation is unrestricted.
The existing Normal/Ultra/VR content and fidelity policy is unchanged.

## Coverage

All 21 orbit-based view components use `ExploreControls`: shared heritage/artifact
Viewer (all sites, including the Kulen regional view and capture orbit mode),
country/province maps, campus/building views, farm, grove, village, household
previews, classroom, ceremonies, fashion/try-on, games, Kun Khmer, letters,
meditation, market, chemistry, specimen and in-room detail views.
The standalone developer splat preview uses the same controls too.

First-person biology, physics, earth/sky and experience rooms already use walking
and look controls; those remain intact. The new controller hides its screen UI
and disables orbit input during XR. It does not add a second camera controller
to an active walking or headset mode.

## Camera transition fix

The heritage viewer formerly disabled controls until the camera reached its POI.
Some saved viewpoints exceeded the generic maximum orbit distance; controls
clamped the camera before it could reach the destination, so the transition could
leave navigation locked. Zoom limits now accommodate each destination, including
portrait-fitted regional views. Travel is bounded to 1.5 seconds, independent of
frame rate, and manual input cancels it. Building transitions also yield to input
and no longer drive the camera during XR.

## Validation

- 220 tests passed in 39 files; TypeScript and production build passed.
- Eleven navigation tests use the actual bundled OrbitControls with synthetic
  mouse/touch events and real Three.js cameras: rotation, two-finger pan/pinch,
  Move drag mode, button movement, zoom/angle limits, reset, disabled controls,
  orthographic support, all site viewpoints and bounded travel.
- An inventory assertion guards all 21 orbit views against losing the shared
  controls or reinstating `enablePan={false}`.
- Existing Vite large-chunk warning remains. No dependencies, image assets,
  scene meshes or draw calls were added by these controls.
- Live browser access is unavailable in this session. Real browser layout,
  touch-device, low-end Android and headset checks are still required; automated
  pointer events are not claimed as interactive browser or hardware testing.

Implementation: `src/cameraNavigation.ts`,
`src/components/ExploreControls.tsx`, `src/components/ExploreControls.css`.
