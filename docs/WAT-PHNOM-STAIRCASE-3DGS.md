# Wat Phnom — Naga Staircase capture integration

The existing trained staircase exports are connected to the Naga Staircase point
of interest in the Wat Phnom scene. Open Wat Phnom → Places to explore → Naga
Staircase → **Walk the real staircase**. This opens at the estimated stair surface
in walking mode, without an outside scan overview. **Temple model** restores the
site model and its staircase camera. Choosing a different stop also exits the
capture view.

The capture represents this photographed approach. The other temple stops keep
their existing authored model and navigation coordinates.

## Local assets

| Mode | File in `public/models/` | Splats | Bytes |
|---|---|---:|---:|
| Normal | `wat-phnom-staircase.splat` | 180,000 | 5,760,000 |
| Ultra / VR | `wat-phnom-staircase-ultra.splat` | 600,000 | 19,200,000 |

Both original files contain complete 32-byte records and finite positions. The earlier
synthetic `wat-phnom.splat` is not used for this staircase. The source files are
preserved unchanged; **Full scan** selects these original exports.

### Optional cleaned walking presentation (local review)

**Clean view** is the default for this capture. It is a presentation option
within Normal/Ultra, not a fourth fidelity tier. The original uncropped download
also has a fragmented rear landing; restoring it did not recover a usable rear
view. No training checkpoint or full Gaussian PLY is available locally for a
further reconstruction audit.

`scripts/prepare-staircase-clean-view.py` makes reversible derivatives under
`public/models/local/staircase-clean-v1/`, an ignored private-review directory.
Source exports in Downloads and the original public files are unchanged.
`output/wat-phnom-walk-review/cleanup-report.json` records source/output hashes,
bounds and selection settings. Current derivatives:

| Tier | Records | Bytes |
|---|---:|---:|
| Normal | 179,975 | 5,759,200 |
| Ultra | 460,538 | 14,737,216 |

The crop removes rear/peripheral fragments, fades crop edges and preserves the
route's estimated floor. Normal selects spatially distributed representatives
from the richer export, with capped scale compensation (1.35), instead of only
keeping the largest splats. This retains the existing 180k budget and visibly
reduces the large stair gaps in the original Normal export; it does not restore
original photo sharpness.

Both Clean view and Full scan allow unrestricted 360-degree horizontal turning,
including repeated turns. Clean walking retains pitch -0.60..0.22 radians to
avoid flipping. The crop removes peripheral fragments; it does not block looking
toward missing areas. **Full scan** restores the original files at the same
walking position and heading. Changing the cleanup option never recentres the
camera. The separate **Inspect capture**
option still offers outside inspection. Headsets retain the original unrestricted
Ultra capture; the focused flat-screen presentation is not a VR reconstruction.

The capture's entrance transform stays fixed. The walking near plane is 0.01
scene units so nearby steps are not clipped; it and the FOV restore on exit.
Floor heights remain estimates, not a surveyed collision mesh. Missing rear and
side coverage still requires alignment review and/or additional capture.

## Display

The configuration lives on the `naga-staircase` POI in `src/spots.ts`. A +90° X
rotation displays the capture upright with the existing drei renderer. A 2.5
display scale, raised origin and separate camera frame it for inspection. This
is display alignment, not surveyed registration to the whole-site model.

The capture uses its recorded colours on a plain background. The synthetic hill,
ground, lighting, shadows and markers are excluded from this view. Normal and
Ultra choose their matching capture file; entering WebXR VR selects Ultra through
the existing viewer's immersive-mode rule. Both tiers depict the same staircase.
The capture loads only after the visitor opens it. Load errors show a message
and the return button remains available.

### Flat-screen movement

The capture offers **Inspect capture** (orbit) and **Walk staircase** controls. A joystick
or held WASD/arrow keys moves continuously relative to the camera's facing
direction; drag looks around with damped rotation. Double-tap jumps and
Previous/Next controls have been removed. The instruction banner remains hidden.

Seven authored floor samples define a continuous height profile. The camera
rests 0.30 scene units above this profile, with no vertical bob or pitch-driven
flight. Space or the touch Jump button launches a short ballistic jump (about
0.19 scene units above the resting height on flat ground), then lands on the
profile at the current horizontal position. Mid-air jump requests are ignored.
Sideways travel is limited to 0.45 units either side of the calibrated centre
line, 2.5 times the earlier width. Scan-support regression checks cover both
edges and the centre in Normal and Ultra; this is not a physical collision mesh.
Movement eases on press/release and resets when focus is lost.
These floor estimates are a navigation aid, not collision geometry or surveyed
dimensions; the local export does not include its training-camera path.

Coordinate correction: the installed drei loader flips raw Y and Z before the
configured group rotation. Raw `(x,y,z)` therefore displays at
`(2.5*x, 1.2+2.5*z, -2.5*y)`. Earlier floor estimates omitted those flips and
placed several viewpoints outside the scan. The corrected route runs from
world Z=0.50 to Z=-1.75 and stops before the noisier upper region. Point density
supports these surface estimates, but it does not prove which points are floor;
visual calibration is still required.

## Verification

The in-app browser was used to verify direct walking entry, forward/backward and
sideways movement, turning, jump, detail switching, outside inspection and return
to the upright temple. The rear defect was reproduced in Ultra and in the
uncropped download. Automated floor-support checks cover both sides of the walk
strip in all four original/clean exports; angle tests cover Clean and Full scan.
These checks do not establish surveyed floor accuracy. Low-end Android over 4G
and physical VR testing remain required.
This is a local integration; no deployment was performed.

The saved data includes peripheral floaters, incomplete coverage and bright sky
artefacts. These are visible in the standalone raw preview as well as in the app;
they are not caused by the temple mesh. Dataset metadata and training history
remain in `notebooks/train_wat_phnom_staircase_3dgs_30k.ipynb` and
`docs/TRAIN_3DGS_KAGGLE.md`; no capture date, photographer, permission or licence
detail has been inferred by this integration.
