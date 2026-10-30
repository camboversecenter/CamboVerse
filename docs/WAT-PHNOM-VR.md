# Wat Phnom capture VR tour

Wat Phnom has two imported 3DGS captures: **Naga Staircase** and **Flower Clock**.
Campus Shrine remains in Buildings and is outside this tour. The VR tour button
is visible on the Wat Phnom overview and on either capture. On a supported headset,
**Enter VR** requests `immersive-vr` directly from that click. Overview entry opens
the staircase; entry from a capture keeps that capture. Locations can be switched
with the menu inside VR. No session starts automatically. Unsupported browsers
show instructions; cancellation/startup failures remain recoverable in the dialog.

Wat Phnom, the general Viewer (including building captures), individual Buildings
and the University Campus share the same entry control and native-session options.
Emulation, automatic session offers and HTML DOM overlays are disabled. Detection
alone never counts as entry: the returned session must be bound to Three's renderer
as `immersive-vr` before the control reports an active session. Errors are shown
instead of leaving an unhandled request rejection on a flat browser window.

VR uses the selected Clean/Full **Ultra** file, even if the browser was in Normal.
The browser's selected detail remains available after exiting. No extra download
is required just to open the VR instructions. The headset view contains a real
3D menu: switch capture, reset position, exit. Select it with a controller ray
and trigger. Left stick moves; right stick snap-turns by 30°. The headset owns
look direction. Browser orbit/keyboard controls yield during an XR session.
Capture movement reads each stick independently, discards small resting-stick
noise, caps movement after stalled frames, and clears movement when sticks are
released. Snap turning pivots around the tracked head without moving the visitor
around a distant origin.

Staircase arrival uses the existing route's floor at Y=0.85; movement follows
the height profile and bounded strip. The clock starts on the same inclined
annular floor as its browser walk. Constraints include tracked horizontal head
offsets, not just controller origin movement. Both captures keep their fixed
asset transforms. Tracked head/controller offsets scale together using the
authored eye height divided by 1.6 because capture coordinates are relative
units. This is visual calibration, not a real-world survey. Reset restores the
capture's start position and heading. Missing/blurred scan coverage remains.

`SplatModel` updates Gaussian viewport/focal uniforms for each actual eye in
Three's render callback. The existing shared depth sorter is retained; its
eye-independent order is approximate for very close transparent splats.

## Access and validation

The map has a **Wat Phnom VR** shortcut. The direct link is
[`?site=wat-phnom`](https://preview.camboverse.world/?site=wat-phnom).
It opens the scene first; **Enter VR** still requires a separate user click so
the browser can grant the immersive session. There is no auto-entry on navigation.

Entry and help are portaled to `document.body`, above the fixed canvas's stacking
context. Previously the full-screen `.walk-layer` sibling intercepted clicks on
the entry inside `.viewer`, and POI panels could cover it. Entry now sits at the
top right, outside those overlays. Buildings/Campus keep their header placement;
their help dialog also uses the document's modal top layer.

Help distinguishes insecure HTTP, blocked spatial-tracking policy, missing
WebXR, unavailable immersive VR, and failed permission checks. Availability is
checked again when the browser regains focus. Session failures show the browser's
error name/message locally; no device report is uploaded. The expandable check
details identify this revision as **VR entry: 2**.

Use a WebXR headset browser over **HTTPS**, or a connected desktop headset.
The desktop's `127.0.0.1` address cannot be opened from a separate headset as
the desktop server. Plain HTTP over a LAN is not a WebXR secure context.
VR remains optional; Normal/Ultra browser visits still work.

Validation covers actual capture ground/scale/boundary calculations, each-eye
uniform changes, type checking/build, DOM entry/help interactions and the installed
XR store's native request/Three session-start binding (with the hardware boundary
mocked). React Three Fiber enables `gl.xr` and switches to the XR animation loop
on Three's `sessionstart`; `XR` links that same manager to the shared store.
Physical headset stereo appearance, controller interactions, comfort and frame
rate must still be verified on a headset; a desktop browser cannot prove these.

WebXR access requirements: [MDN session permissions and security](https://developer.mozilla.org/en-US/docs/Web/API/WebXR_Device_API/Permissions_and_security).
Implementation references: [Three.js VR](https://threejs.org/manual/pages/how-to-create-vr-content.html)
and [Meta WebXR overview](https://developers.meta.com/vr/documentation/web/webxr-overview/).
