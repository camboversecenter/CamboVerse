# Wat Phnom Flower Clock — local walking preview

Open the local app → Wat Phnom → The Flower Clock → **Walk around the real
clock**. This imports the completed 7,000-step Kaggle preview into the existing
site's capture flow. It does not deploy or publish the capture.

## Assets and provenance

Downloaded archive: `C:/Users/PC/Downloads/wat-phnom-clock-deliverables.zip`.
Original files are preserved in ignored `public/models/local/wat-phnom-clock-preview-v1/`.
Both splats were checked against the archive manifest's byte counts and SHA-256
hashes. Training used 326 registered views from 354 photographs.

`scripts/prepare-clock-walk-preview.py` creates reversible Clean derivatives
from the original Ultra export. It retains the clock, fence and nearby low
pavement, fades the outside edge, and removes floating park fragments. Normal
uses 180,000 points sampled for coverage; Ultra uses 246,833 retained points.
Clean exports are 5.76 MB / 7.90 MB. **Full scan** keeps the original exports
available (180,000 / 589,042 points). The original Normal export is visibly
sparser than the coverage-sampled derivative.

The original archive's creator, capture date, permissions and content-license
fields remain UNCONFIRMED. These local-only assets have not been declared CC-BY.
Held-out comparisons and metrics remain beside the original files. Training
completion is not evidence of complete coverage or visual acceptance.

## Grounded walking outside the clock

The splats render with scale 12 and X rotation +π/2. With drei's coordinate
convention, raw `[x,y,z]` maps to world `[12*x,12*z,-12*y]`.

The clock is approximately centred at raw XY `[-.03,.05]`, with a radius near
.55. Its protected walking exclusion has world radius 7.45; the outside
navigation limit is 9.1. This is a band with sideways movement, not automatic
travel along a rail. Radial collision lets movement slide around the clock,
keeps jumps outside the exclusion, and prevents entering uncaptured space.
Horizontal looking is unrestricted.

Floor height follows an estimated plane fitted to nearby low ground points:
world height at centre -.63, X slope .046, Z slope .072. Flat-screen camera eye
height is 1.2 scene units. Looking up never changes travel height. WASD/arrows
and the existing joystick move relative to the current heading; drag looks,
Space/Jump makes a short jump. Input clears on blur or hidden tabs.

Clock walking also offers explicit flight: one Space press jumps immediately;
two distinct presses within 350 ms toggle flight. Held-key repeat does not
count as a double tap. While flying, WASD/joystick moves horizontally, holding
Space rises and holding Shift descends. Fly/Land and Up/Down touch controls
offer the same actions. Flight may cross above the clock but stays inside the
capture's outside radius and 12 scene units above the local eye-height plane.
Turning flight off eases down onto the nearest valid outside walking position;
it never lands on the clock face. Blur clears held/tap input and leaves flight
hovering. Returning to inspection or another scene resets flight. This flight
preview is for the flat-screen clock controls; headset locomotion is unchanged.

A simple authored annulus fills missing ground under the walking band. It has
192 triangles, one basic material and no shadows or textures in either tier.
It is an approximate visual support surface, not scanned/surveyed pavement.
It does not replace or cover the clock face. The rest of the park is not
reconstructed. Some close fence/grass areas remain blurry.

Normal and Ultra offer the same walk area and content. VR uses Ultra and the
same ground surface/boundary for controller locomotion. Headset room-scale
tracking and physical-device performance have not been verified in this local
review; flat-screen tests do not establish the low-end Android/4G baseline.

**Inspect capture** returns to orbit/pan/zoom; **Walk around the clock** returns
to the grounded starting point; **Temple model** restores the authored site.
The staircase retains its own existing walking route and object markers.

## Validation

`src/captureAreaWalk.test.ts` checks exclusion/outer boundaries, tangent sliding,
full circuits, fixed eye height, diagonal speed, stalled-frame limits and ground
geometry. Existing staircase, panorama, guide and scene-transform checks also
run. Browser review covers entry, movement, 360° look, detail/scan switches,
inspection and returning to the temple. Capture route estimates do not imply
heritage access permission or physical dimensions of the real site.
