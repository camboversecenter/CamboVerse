# The Learning Lab

**Anything easier to understand in your hands than on a page.** Turn it around,
take it apart layer by layer, test yourself.

The Lab is a **container, not a subject**. Human anatomy is only what it opened
with, because organs are the clearest case of "a thing a classroom cannot put on
a bench". A rice mill, a water pump, a lever, a benzene ring, the monsoon, the
solar system — all of it belongs here, each under its own subject.

Built for Cambodian students first, and open to everyone.

---

## The shape

Three levels, so that adding a **subject** is data, and adding an **exhibit** is
data plus one model function.

```
SUBJECT              Biology · Physics · Chemistry · Earth and sky · Agriculture
  └── topic          "Circulatory system", "Simple machines", "Rice processing"
        └── EXHIBIT  the heart · a lever · a treadle pump
```

Everything lives in [`src/lab.ts`](../src/lab.ts). Subjects with nothing in them
yet are **still listed on the hub**, greyed out. An empty shelf is the
invitation: a contributor can see exactly where their work would go.

## The three rules

1. **Procedural, always.** Geometry is written in code from description — never
   traced from a scan, a photograph, a CAD file or a copyrighted illustration.
   That is a licensing decision as much as a technical one: a Digital Public
   Good cannot ship an atlas figure it does not own. It also happens to be what
   keeps an exhibit inside the ~$150-Android budget.
2. **Say what it is.** These are **schematic teaching models**. Structure,
   proportion and behaviour follow the standard account; nothing here is a
   measurement, a scan or survey data. Every exhibit page says so.
3. **Never guess a Khmer term.** A wrong technical term in a teaching tool is
   worse than a missing one. Leave `khmer: null` and the interface prints
   "Khmer term needed" — which is honest, and turns the gap into a task.

## Machines: motion and one knob

Organs peel back; machines **move**. A four-stroke engine standing still is a
cross-section in a textbook — almost everything it has to teach is *sequence*:
which valve is open, which way the crank is turning, what the piston is doing
while that happens. Motion is to a machine what the layer buttons are to an
organ, so an exhibit can declare:

```ts
animated: true,        // adds a Run / Stop control; machines run on arrival
knob: { label: "Fulcrum, from the load end",
        min: 10, max: 110, step: 5, value: 30, unit: " cm" },
```

`knob` is **one** adjustable number with a slider. Machines usually have exactly
one parameter worth playing with — where the fulcrum sits, how fast it runs —
and letting a student move it is the difference between being told about
mechanical advantage and finding it.

The model draws its **own readout in the scene**, beside the thing that changes,
rather than in the panel where it would be a number in a table. Readouts use
drei's `Html` **without** `distanceFactor`, so they stay at a fixed screen size:
a number is there to be read, and a wide exhibit shrank them to nothing.

## Taking things apart

Selecting a part **lifts it and steps everything else back** — the chosen organ
gains an emissive glow and the rest drop to about a third opacity. A tinted
emissive alone was almost invisible against a dark red organ under a bright
environment; on a phone in daylight it has to be unmistakable.

An exhibit can declare `extractable: true`, and then tapping a part pulls it
clear of the model: it eases out, enlarges, turns slowly so every side is
visible, and **leaves its space empty behind it**. The rest of the exhibit fades
to a quarter opacity so the extracted piece is unambiguous.

The empty socket is half the teaching. Knowing where the liver lives — under the
ribs, on the body's right — is as useful as knowing its shape, and a part that
simply vanished and reappeared enlarged would teach only the second thing.

Implementing it is one wrapper. `LabBody`'s `Extractable` lerps position and
scale toward a target every frame, frame-rate independent, so it survives being
interrupted halfway by a different part being picked.

## Teleporting between exhibits

A part can name the exhibit it opens:

```ts
{ id: "pancreas", name: "Pancreas", khmer: null, layer: "cutaway",
  at: [10, 6, -10], detail: "organ-pancreas", blurb: "…" }
```

Tap it inside the body, then **Open pancreas →**, and you land on its own
screen. Back returns to the body, not the hub — the Lab keeps a stack, so the
route in is the route out.

An exhibit reached that way declares `parentOf`, which keeps it off the hub. All
eighteen organ screens listed beside the three starting points would bury them.

Most organ screens set `organOf` rather than shipping a model of their own:

```ts
organOf: "pancreas",     // draw this organ from LabBody's organ set
parentOf: "human-body",
centreU: 0,              // SingleOrgan centres on its own bounding box
```

That is the **same geometry the body uses**, drawn alone. An organ that looked
different depending on which screen you reached it from would quietly teach that
there are two of them. The heart and lungs are the exceptions: they have richer
bespoke models because they have internal structure worth its own exhibit.

> **Three traps worth knowing**, all found by trying to tap an organ rather than
> by reading the code:
>
> - react-three-fiber reads the `camera` prop *once, at canvas creation*.
>   Teleporting re-renders the same `SpecimenView` rather than remounting it, so
>   the camera kept the body's distance and a 15 cm pancreas rendered three times
>   too far away. `FrameCamera` sets it on every change of framing.
> - **Anything drawn in front of a target must stop being a target.** The ribcage
>   is drawn over the liver, stomach and heart on the organs layer, and it caught
>   almost every tap meant for them. Bones now take `raycast={() => null}` unless
>   the skeleton layer is showing, where they are the subject.
> - **Merged geometries must agree about indices.** `CylinderGeometry` is
>   indexed and `ExtrudeGeometry` is not, and `mergeGeometries` refuses a mix —
>   the gear silently failed to build. `toNonIndexed()` on the hub is the fix.
> - **Lift the exhibit by a fraction of the frame, not of the object.** Shifting
>   up by 35% of the *exhibit's* height cleared the sheet for a 13 cm heart and
>   pushed a 175 cm figure's head clean off the top — which then made every tap
>   land somewhere unexpected. The shift is now a fraction of the visible frame,
>   clamped to whatever slack is left around the object.

## How realistic can this get?

Worth being straight about the ceiling, because it is set by two constraints we
are not going to drop.

**What raises realism, and is in use:**

- **A procedural studio environment** ([`src/lib/studioEnv.ts`](../src/lib/studioEnv.ts)).
  This is the biggest single lever. A wet organ reads as wet almost entirely
  through the *shape* of its specular highlight; a directional light gives one
  hard dot, an environment map gives the whole surface something to reflect.
  Generated in-browser through `PMREMGenerator` rather than downloaded, so there
  is no HDRI file and nothing crosses the network.
- **`MeshPhysicalMaterial`** with clearcoat for the wet sheen and sheen for the
  soft fall-off at grazing angles that makes skin look like skin.
- **Continuous surfaces.** The first figure stacked separate blobs for chest,
  belly and hips and read as a wooden artist's mannequin — every join was a
  visible seam. Lofting one surface through a stack of elliptical
  cross-sections removed the seams by removing the joins.
- **Higher tessellation in Ultra**, roughly double Normal's.

**What we will not do, and what that costs:**

- **No scanned meshes.** Photoreal anatomy essentially means a licensed scan or
  a commercial atlas asset. Neither can ship in a Digital Public Good, and a
  reconstruction traced from one is a derivative of it.
- **No large texture sets.** Skin pores, vessel tracery and subsurface maps are
  where the last of the realism lives, and they are megabytes. The
  ~$150-Android-over-4G constraint is a hard requirement, not a goal.

So the honest description is **a good stylised anatomical model, not a medical
atlas**. Recognisable, correctly arranged, right proportions — and no muscle
layer, no fascia, no facial features, and surfaces smooth where real tissue is
not. Say that on the page rather than letting a student assume otherwise.

## Adding an exhibit

### 1. The data

Add a `Specimen` to `SPECIMENS` in [`src/lab.ts`](../src/lab.ts):

```ts
{
  id: "treadle-pump",
  name: "Treadle pump",
  khmer: null,                       // null until a Khmer speaker confirms it
  english: "A foot-powered irrigation pump",
  subject: "agri",                   // must match a Subject id
  topic: "Irrigation",
  layers: [                          // YOUR words, not "Whole/Inside/Tubes"
    { id: "whole",   label: "Assembled", hint: "The pump as it stands in a field" },
    { id: "cutaway", label: "Cylinders", hint: "See-through, showing the pistons" },
    { id: "frame",   label: "Water path", hint: "Just the pipes and valves" },
  ],
  about: ["…", "…"],
  parts: [
    { id: "piston", name: "Piston", khmer: null,
      blurb: "…", layer: "cutaway", at: [0, 1.2, 0] },
  ],
  quiz: [
    { q: "…", options: ["…", "…"], answer: 0, why: "…" },
  ],
  sizeU: 140,                        // full bounding HEIGHT, 1 unit ≈ 1 cm
  spanU: 90,                         // full bounding WIDTH
  reallife: "About waist height, and light enough for one person to carry.",
}
```

Fields worth getting right:

- **`layers`** are three slots with fixed ids (`whole` / `cutaway` / `frame`) and
  labels you choose. Hard-coding "Tubes only" is what made the first version an
  anatomy viewer; an engine peels back to moving parts, a molecule switches
  representation.
- **`sizeU` and `spanU`** both matter. On a portrait phone the horizontal field
  of view is barely 29° against the 45° vertical, so **width is almost always
  the binding constraint** — sizing off height alone hangs the exhibit off the
  sides of the screen.
- **`part.layer`** is the layer that part is visible in. Tapping its name in the
  list switches to that layer, so a student never taps a label for something
  hidden.
- **`quiz[].why`** is shown whether the answer was right or wrong. Getting it
  right by luck should still teach you why.

### 2. The model

Add a function in `src/components/` — one file per subject once there is more
than one — and a `case` to `TheSpecimen` in
[`SpecimenView.tsx`](../src/components/SpecimenView.tsx), which is the single
place a new exhibit is plugged in. It takes `layer`, `detail`, `onPick`,
`selected` and (if extractable) `extracted`, and returns a group.

The procedural vocabulary already there:

| Helper | For |
|---|---|
| `organBlob({ r, taper, lean, lumps, notch, flatten, seg })` | a soft continuous mass — a sphere displaced until it stops looking like one |
| `vessel(points, radius)` | a tube swept along a smooth curve — a vessel, an airway, a pipe, a cable |
| `branchTree({ from, dir, length, radius, levels })` | anything that divides and divides again — a bronchial tree, a vascular bed, a river delta |
| `loft(rings, seg, cap)` *(LabBody)* | one continuous surface through a stack of elliptical cross-sections — a torso, a limb, a chimney, a hull |
| `longBone(length, shaft, head)` *(LabBody)* | a shaft that swells at both ends — a bone, a dumbbell, a turned baluster |
| `gearGeometry(teeth, radius, thick)` *(LabMachines)* | a spur gear — a hub with teeth standing off its rim |
| `labNoise(seed, a, b, c)` | deterministic wobble, so a render is reproducible |

**Honour `detail`.** `normal` is the low-end-phone baseline and must stay
usable: fewer segments, fewer recursion levels, no shadows. Degrade the detail,
never the content — a student in Normal mode sees the same parts, the same
labels and the same quiz.

### 3. Check it

```bash
npm run typecheck
npm run build
npm run dev            # then 🔬 Learning Lab
```

Look at it in **Normal** as well as Ultra, and on a narrow window. Normal is what
most students will actually see.

## Adding a subject

An entry in `SUBJECTS`, and nothing else:

```ts
{ id: "civics", name: "Civics and government", khmer: null,
  blurb: "How a commune council works, and where the money goes.", icon: "🏛" }
```

It appears immediately under "Shelves waiting to be filled" until its first
exhibit lands.

---

## Khmer terms waiting on a reviewer

These are `null` in the data, so the interface currently shows **"Khmer term
needed"** next to them. Filling them in is a real contribution and needs a Khmer
speaker who knows the subject — **not a machine translation**, and ideally
matching the terms used in MoEYS textbooks so a student meets the same word in
class and here.

**Biology — the heart:** heart muscle / myocardium · left ventricle · right
ventricle · left atrium · right atrium · aorta · pulmonary trunk · venae cavae ·
coronary arteries

**Biology — the lungs:** main bronchi · bronchial tree · cardiac notch

**Biology — the whole body:** spinal cord · thyroid · aorta and vena cava ·
diaphragm · oesophagus · gallbladder · pancreas · spleen · ureters · bladder

**Deliberately not modelled:** the reproductive organs. Whether and how they
appear in a school tool is a decision for Cambodian educators and the Ministry,
not for whoever happens to be writing the geometry.

**Subjects:** Earth and sky · Agriculture and engineering

Already confirmed: រាងកាយមនុស្ស (human body) · បេះដូង (heart) · សួត (lung) ·
សួតខាងស្តាំ (right lung) · សួតខាងឆ្វេង (left lung) · បំពង់ខ្យល់ (windpipe) ·
ស្បែក (skin) · ខួរក្បាល (brain) · ថ្លើម (liver) · ក្រពះ (stomach) ·
ពោះវៀន (intestines) · តម្រងនោម (kidneys) · គ្រោងឆ្អឹង (skeleton) ·
ជីវវិទ្យា (biology) · រូបវិទ្យា (physics) · គីមីវិទ្យា (chemistry)

If you know a term is wrong, that is worth an issue on its own.

---

## The AI tutor

Not built. The seam is [`LabTutor`](../src/lab.ts) — one method, given the
exhibit, the selected part, the question and the language.

Two rules for whoever wires one in:

- **The Lab must keep working without it.** A student on a slow connection with
  no credit is the normal case, not the edge case. Every lesson — model, labels,
  layers, quiz — already works offline and must continue to.
- **Tell the model what these are.** Schematic teaching models, not clinical or
  engineering references. Otherwise it will confidently invent detail the
  geometry never claimed.

## View modes

The Lab follows CamboVerse's three modes ([`AGENTS.md`](../AGENTS.md)):
**Normal** for a low-end phone, **Ultra** for a capable device, and **VR**, which
always presents Ultra. Auto-detected, overridable from the button top-right.

## Where this fits

- [`src/lab.ts`](../src/lab.ts) — subjects, exhibits, parts, quizzes, the tutor seam
- [`src/components/LabView.tsx`](../src/components/LabView.tsx) — the hub
- [`src/components/SpecimenView.tsx`](../src/components/SpecimenView.tsx) — an exhibit's page
- [`src/components/LabOrgans.tsx`](../src/components/LabOrgans.tsx) — the procedural vocabulary
- [`src/components/LabBody.tsx`](../src/components/LabBody.tsx) — the whole figure, the skeleton, and the extraction wrapper
- [`src/components/LabMachines.tsx`](../src/components/LabMachines.tsx) — the lever, the gear train and the engine, and how a machine animates itself
- [`src/lib/studioEnv.ts`](../src/lib/studioEnv.ts) — the in-browser studio environment
- [`docs/BUILDINGS.md`](./BUILDINGS.md) — the same discipline, applied to architecture
- [`TODO.md`](../TODO.md) — the contributor task board
