# Wat Phnom capture VR tour

Wat Phnom has two imported 3DGS captures: **Naga Staircase** and **Flower Clock**.
Campus Shrine remains in Buildings and is outside this tour. The VR tour button
is visible on the Wat Phnom overview and on either capture. Its dialog lets a
visitor select a capture, check headset availability and explicitly enter VR.
No headset session starts automatically. Unsupported browsers show instructions;
cancellation/startup failures remain recoverable in the dialog.

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

Use a WebXR headset browser over **HTTPS**, or a connected desktop headset.
The desktop's `127.0.0.1` address cannot be opened from a separate headset as
the desktop server. Plain HTTP over a LAN is not a WebXR secure context. This
change does not publish the project, expose a development server, or configure
device networking. VR remains optional; Normal/Ultra browser visits still work.

Validation covers actual capture ground/scale/boundary calculations, each-eye
uniform changes, type checking/build, and browser entry/help/capture switching.
Physical headset stereo appearance, controller interactions, comfort and frame
rate must still be verified on a headset; a desktop browser cannot prove these.

WebXR access requirements: [MDN session permissions and security](https://developer.mozilla.org/en-US/docs/Web/API/WebXR_Device_API/Permissions_and_security).
