# Buildings movement controls

The campus, individual building models and Campus Shrine capture support:

| Device | Walk | Run | Jump |
| --- | --- | --- | --- |
| PC | WASD / arrows | Hold either Shift key | Press Space, or Jump |
| Mobile | Left joystick; drag to look | Toggle Run; select again to stop running | Tap Jump |
| Quest controllers | Left thumbstick; right stick snap-turns | Hold left grip while moving | Press right A |

Choose **Walk** on the campus or **Walk around** on an individual building or
capture. Model pages retain Overview/orbit mode. Running is 2.5 times walking
speed. Normal and Ultra have the same controls; headset mode uses Ultra.

Buildings opt into the controller run/jump path in `VRRig`. Movement ignores head
pitch, normalizes diagonals, caps stalled frames and reads current controllers
each frame. A jumps once per press and lands at the authored floor. Captures
retain their ground/boundary calibration and scale tracked head/controller
positions together. This does not add architectural wall collision to VR.

Model walking uses the existing floor/wall raycasts. Touch Jump and Space share
one consumed request; holding Space does not repeatedly bounce. Touch actions
do not steal the active joystick pointer. Run/Jump requests clear on blur,
control unmount or VR entry; typing in a field does not move the camera.

The building capture retains double-Space flight. While grounded, Shift runs;
while flying, Shift descends and Space rises. The Run/Jump controls are replaced
by the existing flight controls while airborne in flight mode.

Automated checks cover keyboard/joystick speed, one-shot jumps, landing,
controller grip/A mapping, disconnect/focus handling and capture boundaries.
Appearance, touch ergonomics and headset comfort still need device review.
