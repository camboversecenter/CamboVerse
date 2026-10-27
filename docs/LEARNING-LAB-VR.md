# Learning Lab VR

All four rooms reachable from the lab hub use WebXR:

| Room | Entry | Immersive controls |
| --- | --- | --- |
| Biology & Anatomy | Enter VR | Existing layer, organ selection, take/return, rotation and reset cards; shared controller movement and exit |
| Chemistry Experience Room | Enter VR | Station guide, paginated reading, visit station, controller movement, exit; existing mesh selection |
| Physics & Machines | Enter VR | Station guide, paginated reading, visit station, controller movement and exit |
| Earth & Sky | Enter VR | Station guide, paginated reading, visit station, controller movement and exit |

The old `ChemistryRoom.tsx` pilot is not mounted by the app. The active chemistry
room is `ExperienceRoom.tsx`. There is no separate Mathematics room yet.

## Try on Meta Quest 3

Open the project in Meta Quest Browser over trusted HTTPS. Go to Learning Lab,
open any room, choose Enter VR and accept the headset's session prompt. A desktop
browser without an attached WebXR headset instead shows connection guidance.

For a local USB development session, with the Quest already in developer mode,
ADB installed, and USB debugging authorized on the headset, run:

```powershell
adb reverse tcp:5173 tcp:5173
```

Then open `http://localhost:5173/` **inside Quest Browser**. Keep the local Vite
server running. PC localhost alone is not reachable from the headset. A plain
HTTP LAN address is not a secure context. No tunnel, deployment, firewall changes,
or headset developer settings were configured by this change.

References: [Meta secure-context requirements](https://developers.meta.com/horizon/documentation/web/port-vr-xr/),
[XR origin](https://pmndrs.github.io/xr/docs/tutorials/origin),
[controller locomotion](https://pmndrs.github.io/xr/docs/api/controller-locomotion.usexrcontrollerlocomotion).

## Behavior

Entering a real session raises scene detail to Ultra. The visitor's Normal/Ultra
preference is restored when the session ends. A declined or failed session leaves
desktop mode usable and displays a retry message. Leaving a room ends its session.
Desktop camera updates and head bob stop during immersive tracking.

Left stick moves at 1.4 metres/second, right stick snap-turns 30 degrees. Controller
rays select mesh buttons; the room guide sits to the right of the player origin.
Visit station moves to an inward offset from the selected exhibit. Movement is
bounded by room extents; continuous movement does not yet collide with furniture.
VR reading uses scene textures, with no dependency on DOM overlays or remote fonts.

Advanced chemistry/physics/astronomy forms and quizzes remain desktop interfaces;
this change enables immersive room exploration and station reading, not complete
VR parity for every experiment form. Biology's existing scene cards remain usable.

## Validation

- Desktop browser opened all four active rooms and found Enter VR.
- Unsupported-headset guidance checked through the shared entry control.
- TypeScript reports no new LabVR errors; project-wide typecheck still fails on
  existing room geometry/type errors, unused declarations and faceStudy metadata.
- Physical headset session entry/exit, cancelled permissions, stick movement,
  station visits, readable cards, controller selection and Quest frame rate still
  require hardware validation. No physical headset was available in this session.

Before release, test each room from Normal: enter VR, inspect Ultra geometry,
move/turn, select station cards, visit each station, exit through both the scene
button and Quest system menu, and confirm Normal and desktop movement return.
Repeat entry and exit, decline a permission prompt, and test the heaviest anatomy
view. Measure performance on Quest and the existing low-end mobile baseline.
