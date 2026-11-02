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
and trigger. The menu is collapsed at arrival, fixed in the world to the left of
the initial view. It never follows head movement. Press **Y on the left controller**
to open/hide it; opening with Y places it once in front of the current position.
The world-space Menu button also opens it, and Hide menu collapses it. Capture
changes/reset restore a collapsed menu at the new arrival. Left stick moves; right stick snap-turns by 30°. The headset owns
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

Both Quest controllers have a visible gold ray and cursor; point at a button
and press/release the trigger. Hover highlights the button. The normal XR ray
minimum distance rejected nearby panels at the staircase's small scene scale,
so it is zero here; ray and cursor also render above the transparent scan. A
longer press threshold helps deliberate trigger use. Pointer ordering gives UI
priority over scene interactions; the cursor appears on actual targets.

## Information and ambience

Both Wat Phnom captures expose **Ask Kiri** in the browser and, from the VR Y
menu, as a controller-selectable in-world guide. Browser visitors can type a
question and optionally dictate it if speech recognition is available; VR
visitors can select suggested questions or dictate where the headset browser
supports it. Microphone permission is requested only when voice is selected.
Each answer has a Listen/Stop control; text remains available if the device
does not provide speech synthesis. VR answers are divided into readable pages.
Switching location or closing the guide stops narration and cancels requests.

The same server endpoint resolves location notes for both modes. Its response is
marked **AI answer** only if the model actually returns one; network, provider,
or server configuration failures instead display **Saved notes**. A live preview
request returned saved notes on 2 November 2026; this does not establish whether
the API credential is absent or the upstream service failed. A working server-side
`ANTHROPIC_API_KEY` and provider access are needed for live generated answers.
Do not put credentials in client files, Git, or chat. Device speech recognition
may send audio to a browser-managed speech service; it is an optional user action.

The Naga balustrade and guardian lion use the same reviewed anchors and object
notes in both browser and VR. In VR, actual textured meshes replace the HTML
markers, which are not rendered by an immersive session. The labels remain at
the sculptures, rotate for readability and keep a roughly 15-degree angular
width so the farther lion label does not become too small to read. Controller-ray selection opens a
readable, world-anchored card with source credit, Close and optional Listen.
Narration uses the existing browser speech API; text remains available if the
headset has no usable voice. Closing/leaving a card stops its narration.

VR labels, cards and menu render after the transparent splat pass. This avoids
the captured image painting over the UI, which happened with the old opaque menu.
The panels are deliberately readable over incomplete scan geometry; they are UI,
not an assertion that the scan supplies solid surface depth.

Wat Phnom has **Bird ambience** in the browser and VR menu. It is off initially
in the browser, and starts when the visitor presses Enter VR (if the browser
allows playback), for both Naga and Clock. The visitor can mute it and the choice
is retained while the site remains open. Playback is lazy-loaded, quiet (maximum 18% gain), fades at loop boundaries,
and ducks under browser narration. It pauses while the active page/headset view is hidden
and releases audio on leaving the site. Download/playback failures provide a retry.
The 392 KiB CC0 recording is by L. Shyamal in **Siem Reap**, not Wat Phnom; its
credit and provenance are retained in the interface and
[`public/audio/ambience/README.md`](../public/audio/ambience/README.md).

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
mocked), world-panel placement/text fit, and audio opt-in/pause/mute/ducking/races.
React Three Fiber enables `gl.xr` and switches to the XR animation loop
on Three's `sessionstart`; `XR` links that same manager to the shared store.
Physical headset stereo appearance, controller interactions, comfort and frame
rate must still be verified on a headset; a desktop browser cannot prove these.

WebXR access requirements: [MDN session permissions and security](https://developer.mozilla.org/en-US/docs/Web/API/WebXR_Device_API/Permissions_and_security).
Implementation references: [Three.js VR](https://threejs.org/manual/pages/how-to-create-vr-content.html)
and [Meta WebXR overview](https://developers.meta.com/vr/documentation/web/webxr-overview/).
