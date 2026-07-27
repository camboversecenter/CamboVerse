# Adding a public building

**Digital Twin, honestly: a photograph of an ordinary public building becomes
something you can walk around inside CamboVerse.**

This page is for anyone who wants to contribute one. You do not need to model
anything, and you do not need to be a 3D artist. You need a photograph, fifteen
numbers, and half an hour.

A school, a commune hall, a health centre, a market, a pagoda hall, a district
office, a university block — Cambodia has thousands of them and almost none are
in any virtual world. Each one somebody adds makes the twin a little less of a
demo and a little more of a place.

---

## 1. What we are claiming, and what we are not

Read this part before you write any JSON. It is the whole discipline of the
project in one section, and a contribution that ignores it will be sent back.

**A generated building is an INTERPRETATION, not a survey.** It is the right
*type* of building, at roughly the right proportions, in the right architectural
language. It is not a measured record of the address you photographed.

This is the same honesty rule that runs through the rest of the platform: Grove
records **trees**, never carbon credits, because a tree is a thing you can go and
count and a carbon credit is a claim about the future. A building spec records
**typology**, never an address, for exactly the same reason.

So:

- **Never name the institution.** No "Hun Sen High School", no province, no
  street. `name` describes a *kind* of building: `"Two-storey annex"`,
  `"District health centre"`.
- **Never reproduce an emblem, a logo, a crest or lettering.** The generator
  draws a blank board and a plain disc where a real pediment has an emblem, and
  that is deliberate. Leave them blank.
- **Say what you guessed.** Every spec carries a `confidence` block. A photo
  taken from the front cannot show you the depth of the building or the back
  wall — write that down instead of letting a guess harden into a fact.
- **Photograph public exteriors from public ground.** Do not photograph private
  homes, do not photograph people, and do not enter anywhere to get the shot.
- **Use your own photograph.** Do not work from an image you found online unless
  you are certain of its licence. Your photo is never committed — only the
  numbers you read off it are — but the numbers still have to come from
  something you were allowed to look at.

If a building is culturally or religiously sensitive — an active pagoda, a
memorial, a site under APSARA or Ministry of Culture stewardship — open an issue
first. Those go through the heritage-consent path in
[`STRATEGY.md`](../STRATEGY.md), not through this one.

### Why a spec and not a scan

The obvious way to turn a photo into a building is photogrammetry or single-image
reconstruction. Both are wrong here. One needs a hundred overlapping photos; the
other produces a plausible-but-wrong lump; and both land a multi-megabyte
textured mesh in a viewer whose *entire* model library is about 8 MB and has to
run on a ~$150 Android over 4G.

What a photograph reliably gives you is **typology**: storeys, bays, roof kind,
balcony, colour, proportion. That is fifteen numbers. Fifteen numbers is a
150-line JSON file that anyone can review, and that someone who can read a
building can fix with a one-character edit.

A spec is **data, never code**. That matters if a vision model writes it for you:
a model that emitted a build script would be a thing you have to run to find out
what it does.

---

## 2. Take the photograph

One shot, from the front or front three-quarter, standing far enough back that
the whole façade and the roofline are in frame.

What to look for while you are there — you are collecting the numbers, not the
picture:

| Look at | You are counting |
|---|---|
| Windows across the façade | **bays** — one repeating vertical slice |
| Floor lines / window rows | **storeys** |
| A person or door in frame | scale: a door is ~2.1 m, a storey ~3.5 m |
| The roof | flat, or hipped with tiles? how steep? |
| The middle of the façade | does it step forward and get taller? |
| The ground floor | open arcade/columns, or the same as the floors above? |
| Colours | wall, trim, roof, glass — approximate hex is fine |

Count the bays twice. At an angle the far end foreshortens and it is the number
people get wrong most.

### Read the photo before you write anything

Adopted from [`img2threejs`](https://github.com/img2threejs/img2threejs) after we
evaluated it on the NUM Great Hall (see
[`EVAL_IMG2THREEJS.md`](./EVAL_IMG2THREEJS.md)). We did not adopt its code — only
this discipline, which caught two real errors in a building we thought we already
understood. Work it in order, and write the answers down before you touch JSON.

1. **Observe before you infer.** Say what is in the pixels. Not "it has a nice
   entrance" — "a polished dark red-brown stone frame stands about 0.5 m proud of
   the glass, roughly 9 m wide, running from the plinth to the eave."
2. **Decompose big to small.** Macro (the masses: base, body, roof), then meso
   (the parts: fascia band, portal, canopy), then micro (the details: finial,
   guardian figures, rooftop plant). Do not jump to details.
3. **Name three identity-defining features** — the ones that, if you got them
   wrong, would stop a local recognising the building. For the Great Hall they
   are the ~6 m eave cantilever, the colonnade rhythm with the glass set back
   behind it, and the Khmer gable on the ridge. Everything else is negotiable.
4. **Write down what one photo cannot show.** The back elevation, the soffit, the
   true depth. These become `assumptions`, not silent guesses — and they are what
   a reviewer checks first.
5. **Overlay a coordinate grid on the photo and re-read it.** Cheap, and it is
   where both of our Great Hall errors surfaced: what looked like a flush glazed
   wall turned out to be a colonnade with the glass set back, and the eave was
   half again as deep as the first estimate.

The point of step 4 is honesty. A reconstruction from one photograph is an
informed approximation. Saying so is not a weakness of the model — it is what
makes it usable as public data.

---

## 3. Write the spec

Copy [`scripts/data/buildings/annex-block.json`](../scripts/data/buildings/annex-block.json)
— it is the smaller of the two and easier to read — into
`scripts/data/buildings/<your-id>.json` and change the numbers.

```jsonc
{
  "id": "district-health-centre",          // filename stem; becomes the .glb name
  "name": "District health centre",        // a KIND of building, never an institution
  "kind": "institutional-block",

  "_source": {
    "from": "a single photograph, front three-quarter view from the road",
    "read_by": "written by hand from the photo",
    "what_it_is_not": "A TYPE, not an address. No institution is identified and no name or emblem is reproduced."
  },

  "dimensions": {
    "widthM": 26,        // façade length. default 40
    "depthM": 12,        // front-to-back. ALMOST ALWAYS A GUESS. default 12
    "storeyH": 3.5       // floor to floor. default 3.5
  },
  "storeys": 2,          // default 3
  "bays": 6,             // default: widthM / 4

  "pilasters": true,     // vertical strips on the bay joins. default true
  "balustrade": true,    // railing in front of upper windows
  "ground": { "arcade": true },   // open glazed arcade behind columns at ground level

  "canopy": { "level": 1, "depthM": 1.6 },   // projecting slab over the entrance

  "centrepiece": {       // the middle of the façade, stepped forward and taller
    "bays": 2,
    "projectM": 1.0,     // how far forward
    "extraH": 1.8,       // how much taller
    "pediment": true,
    "emblem": false,     // a BLANK disc — never a reproduced crest
    "spire": false
  },

  "roof": {
    "kind": "hipped-tile",   // "hipped-tile" (default) or anything else for flat
    "heightM": 2.4,
    "eaveOverhangM": 0.9,
    "courses": 9,            // tile ridges; more = finer, and costs vertices
    "finials": true
  },

  "palette": {
    "wall": "#efeadd", "trim": "#ffffff", "roof": "#a8484a",
    "glass": "#2b3a44", "plinth": "#d8d4cb", "accent": "#c9a227"
  },
  "weathering": 0.2,     // 0 = new, 1 = tired. Cambodian concrete is rarely 0

  "confidence": {        // REQUIRED. One line per thing you could not see.
    "depthM": "GUESSED. Only the façade is visible; 12 m is a normal single-corridor block.",
    "bays": "counted at an oblique angle — the far end foreshortens, so ±1",
    "rear": "entirely unseen. Modelled plain on purpose rather than invented."
  }
}
```

Everything has a default. Leave out what you did not see — but if you leave it
out *because you could not see it*, say so in `confidence`.

### The `confidence` block is not optional paperwork

It is shown to the visitor. It is the difference between a virtual world that
claims to be a record and one that is honest about being an interpretation, and
it is the reason this approach is defensible at all. A spec without it will be
sent back.

---

## 4. Build it

```bash
node scripts/generate-building.mjs scripts/data/buildings/<your-id>.json --bare
```

`--bare` builds the building **without** its own ground, apron or planting. That
is what a place consumes: the scene draws one shared ground, and twenty baked
forecourts overlapping each other is both wrong and expensive.

Drop `--bare` to get the standalone version with its own site, for a hero render.

Output lands in `public/models/<your-id>-bare.glb`.

**Check the size.** The whole library is about 8 MB and shares a 4G budget:

- a bare block should be **under ~350 KB**
- with its own site, **under ~800 KB**

If you are over, the usual culprits are `roof.courses` and — if you edited the
site — sphere segment counts. Geometry here is de-indexed, so every sphere costs
three times what you think.

---

## 5. Put it somewhere

Everything lives behind the single **🏛 Buildings** button on the map. That page
([`BuildingsHome`](../src/components/BuildingsHome.tsx)) lists walkable **sites**
and individual **buildings**; the map itself carries no per-building buttons.

Add an entry to [`src/buildings.ts`](../src/buildings.ts):

```ts
{
  id: "district-health-centre",
  name: "District Health Centre",
  khmer: "មណ្ឌលសុខភាពស្រុក",
  english: "A rural referral clinic",
  site: null,                          // null = stands alone, no walkable scene
  about: [
    "Two sentences on what it is and what happens inside.",
    "A sentence on why it looks the way it does — the roof, the arcade, the orientation.",
  ],
  facts: [
    { label: "Storeys", value: "Two" },
    { label: "Roof", value: "Red hipped tile, deep eaves" },
  ],
  view: { at: [0, 1.6, 60], yaw: 0 },  // ignored when site is null
  heightM: 11,                         // the roof ridge, NOT a finial tip
  spanM: 34,                           // widest plan dimension
  model: "district-health-centre",     // the .glb you just generated
}
```

It appears on the Buildings page by itself. Nothing else needs editing.

Fields that are easy to get wrong:

- **`model`** is the file under `public/models/` without `.glb`. Leave it out
  only if you are hand-authoring a component in
  [`CampusBuildings.tsx`](../src/components/CampusBuildings.tsx) instead — that
  is the route for landmarks, and it is more work.
- **`heightM` is the building's *mass*, not its tallest point.** The page aims
  its camera at 0.7 × this, so counting a spire points it at empty sky.
- **`spanM` decides the camera distance**, and on a portrait phone the
  horizontal field of view is only ~29°. Get this wrong and the building hangs
  off the edge of the frame on exactly the devices we care about.
- **`site`** is `null` unless the building belongs to a group you can walk
  between. A new walkable site needs a `Site` entry *and* a scene component; one
  building on its own does not.
- **Say what you assumed.** `about` and `facts` are read as fact by visitors.
  Same rule as `confidence` in the spec: the massing is an informed
  approximation, not survey data, and no real institution is represented unless
  it has agreed to be.

---

## 6. Check it, then open the PR

```bash
npm run typecheck     # must pass
npm run build         # must succeed
npm run dev           # then open it from 🏛 Buildings
```

**Look at it in both view modes.** Normal is the ~$150-Android baseline and is
the mode most people will see; Ultra adds shadows and higher-detail textures.
Toggle with the button top-right. A building that only looks right in Ultra is
not finished.

Things that have actually gone wrong here, so you know what to look for:

- **Ground-floor glazing invisible.** A recessed pane behind the wall face
  renders as blank wall, and reads as "the generator ignored the ground floor".
- **Finials disappearing.** Below about r=0.3 they vanish at viewing distance.
- **A façade that reads as one tall wall.** You are missing the storey bands, or
  `storeys` is wrong.
- **Pilasters centred on windows.** They sit on the bay *joins*. If yours look
  centred, `bays` is off by one.

Then follow the normal workflow in [`CONTRIBUTING.md`](../CONTRIBUTING.md):
branch, small focused PR, say what changed and why.

Include in the PR description:

- what kind of building it is (**not** which one)
- which numbers you measured and which you guessed
- a screenshot in Normal mode
- the `.glb` size

---

## 7. If you want to use a vision model to read the photo

That works, and it is the path this was designed around. Give it the schema in
§3 and the rules in §1, and ask it for **JSON only**.

Two things you still have to do yourself:

1. **Check the count of bays and storeys against the photo.** Models are good at
   typology and unreliable at counting a foreshortened row.
2. **Check that `confidence` is honest.** A model asked to fill in a form will
   fill it in. If it wrote a confident sentence about the rear of a building it
   never saw, that sentence is worse than no sentence.

You are the contributor, not the model. The spec goes in under your name.

---

## Where this fits

- [`scripts/generate-building.mjs`](../scripts/generate-building.mjs) — the
  generator, and a long comment on why it works this way
- [`src/buildings.ts`](../src/buildings.ts) — the registry of sites and buildings
- [`src/components/BuildingsHome.tsx`](../src/components/BuildingsHome.tsx) — the
  🏛 Buildings directory, the only way in
- [`src/components/BuildingView.tsx`](../src/components/BuildingView.tsx) — one
  building's page, which renders your `.glb` or a hand-written component
- [`src/components/BuildingsView.tsx`](../src/components/BuildingsView.tsx) — a
  walkable site, if your building belongs to one
- [`src/lib/groundTexture.ts`](../src/lib/groundTexture.ts) — runtime canvas
  ground, no files, nothing downloaded
- [`AGENTS.md`](../AGENTS.md) — the three view modes and the hard constraints
- [`GROVE_INTEGRATION.md`](../GROVE_INTEGRATION.md) — how the twin connects to
  real-world records on CSB
