# Ceremonies

**A family records their own wedding, and the app explains what is happening.**

Cambodia's calendar events — Pchum Ben, Bon Om Touk, Khmer New Year — are famous
and few. Its **life events** are the opposite: a wedding, a housewarming, an
ordination, a funeral, happening thousands of times a day, all over the country,
and almost never recorded as anything but a phone album.

This is the format for both, plus the screens that walk you through one. The
format is [`src/ceremony.ts`](../src/ceremony.ts) and it was written first,
deliberately: it is the part that is hard to change afterwards, and the part
that carries the consequences.

---

## Template and instance

The split that makes the rest work.

| | **Template** | **Instance** |
|---|---|---|
| What it is | the canonical sequence for a kind of ceremony | one family's actual event |
| Who writes it | people who know the tradition | the family |
| How many | one per kind | thousands |
| Contains | names, meanings, staging, order | photographs, dates, a venue |

A `CeremonyTemplate` says *what the blessing candles mean and which way they
pass*. A `Ceremony` references it and adds *our photographs of it*.

Ten thousand families get the explanation without one of them having to write
it, and when the explanation is wrong it is corrected in one place rather than
ten thousand.

```ts
const c = newCeremony("wedding", "neak-srae", {
  theme: "home-yard", timeOfDay: "morning", pavilion: true,
});
c.moments.push({
  id: "candles",                      // matches the template's moment
  name: t("Passing the blessing candles"),
  meaning: t("Married elders pass lit candles around the couple…"),
  media: [{ kind: "local", sha256, mime: "image/jpeg", bytes: 240_000 }],
});
```

## A ceremony is usually not in a building

This is the first thing that would have been got wrong by building on top of the
Buildings registry. A Khmer wedding is under a **marquee in the yard in front of
the house**. An ordination is on pagoda ground. A boat blessing is at the water.
The hired function hall is one option among many, and a recent one.

So the required field is a **scene theme** — a named outdoor setting the renderer
builds procedurally — and a building is an optional addition:

```ts
interface Venue {
  theme: SceneTheme;      // required, always
  timeOfDay: TimeOfDay;   // required — dawn light is half of Pchum Ben
  season?: "dry" | "wet";
  pavilion?: boolean;
  buildingId?: string;    // optional: a real place from src/buildings.ts
  siteName?: string;
}
```

`home-yard` · `pagoda-ground` · `garden` · `riverside` · `paddy` · `street` ·
`hall` · `temple-interior`

The theme stays set even when a building is named, so a client that does not
have that building's model can still stage the ceremony. Nothing degrades to a
blank grey plane.

## Moments, not albums

A Khmer wedding is not one event. It is a sequence of distinct rituals over one
to three days, each with its own name and meaning. Modelling the **sequence**
rather than the day is what turns an album into an explanation — and it is what
lets a template supply the meanings while a family supplies the pictures.

The wedding template currently carries seven: procession of gifts, honouring the
ancestors, blessing by monks, symbolic hair cutting, passing the blessing
candles, tying the wrists, the reception. Moments marked `optional` are regional
or family variation, so an instance that skips one is not treated as incomplete.

## Props are shared, not per-ceremony

`PropKind` is a small kit the app supplies procedurally — offering trays, banana
stems, garlands, candles, incense, monk seating, floor mats, low tables,
parasols, drums, gift boxes, water vessels. The same trays appear at a wedding, a
housewarming and a robe-offering, so they are modelled once.

A family should have to bring photographs and nothing else.

## Third-party video and photo albums

Families already keep their wedding videos on YouTube and their albums on
Facebook or Google Photos. Telling them to re-upload is unrealistic, so
`MediaRef` has three kinds:

- **`local`** — inside the bundle, addressed by SHA-256. Works offline. The default.
- **`url`** — a plain image or video on a URL the family controls.
- **`embed`** — a third-party service, named by a free-form `provider` string.

**An embed means the viewer's device contacts that company**, handing over the
viewer's IP address and whatever else they collect, and it breaks CamboVerse's
no-external-runtime-assets rule. So an embed never loads by itself:

```ts
type EmbedPolicy = "facade" | "never" | "auto";
const DEFAULT_EMBED_POLICY = "facade";
```

- `facade` — show the locally stored poster frame, name the provider, contact it
  only when the viewer taps. The default.
- `never` — do not phone out at all. The right setting for a school deployment.
- `auto` — only where a deployment has decided that is acceptable.

An embed carries a **local poster** so the ceremony can be read end to end
without ever reaching the provider. That is a warning in `validateCeremony` and a
hard refusal in `canPublish`.

Adding a provider is a string, not a release. The player for each is a client
concern and is not built yet.

## Consent is a required field, not a setting

Every other thing CamboVerse models — organs, buildings, molecules, rice plants —
contains no people. A wedding is full of identifiable people, including children.

```ts
interface Consent {
  recordedBy: string;          // a pseudonym or handle, never a legal name
  recordedAt: string;
  visibility: "private" | "link" | "public";
  peopleDepicted:
    | "none" | "adults-consented" | "includes-minors-guardian-consented";
  locationPrecision: "none" | "country" | "province" | "commune";
  note?: string;
}
```

Four rules hold it up:

1. **Private by default.** `newCeremony` sets `visibility: "private"`. A family
   recording a funeral must never find it public because a default said so.
2. **`canPublish` is stricter than `validateCeremony`.** Publishing is the
   irreversible step, so an unanswered question is a refusal there and a warning
   in ordinary validation.
3. **Never finer than a commune.** No coordinates, ever — a precise location for
   a home ceremony is somebody's home address. The validator rejects a `lat` key
   outright. Same coarsening rule Grove applies to garden coordinates, for the
   same reason.
4. **Pseudonyms.** `recordedBy` exists so there is a stable owner for a takedown
   request, not so anyone can be identified.

No validator can tell whether the consent answers are *true*. That is what the
takedown route is for, and why `recordedBy` has to be stable.

## A ceremony is a file

Same two-path pattern as Grove:

```
camboverse.ceremony v1
├── manifest JSON   the Ceremony, canonically ordered
└── media/          the photographs, named by SHA-256
```

`canonicalize()` produces recursively key-sorted JSON with `undefined` keys
dropped, so a ceremony hashes identically before and after a round trip through
a file. `ceremonyHash()` is the SHA-256 of that, ignoring any hash already
stamped on it.

Publishing to the `/v1` rails is an optional second path for later. A family in
a village with no reliable connection can record a grandparent's ordination
today, and they own the result outright.

## Validation at a glance

```ts
validateCeremony(c, template?)   // structural: is it well formed?
canPublish(c)                    // may it leave the device?
mediaHashes(c)                   // every local file it refers to
```

`validateCeremony` takes an optional template and, when given one, warns about
required moments with nothing recorded and about a template that has not been
reviewed. It never fails a ceremony for a missing photograph — an unfinished
record is a normal state.

---

## The screens

Three files, matching the Buildings and Lab pattern — a plain-DOM directory, a
3D stage, and the geometry behind it.

| | |
|---|---|
| [`CeremonyHome.tsx`](../src/components/CeremonyHome.tsx) | The directory. Life events first, then the calendar. No WebGL — this is the screen someone on a slow connection reaches first. |
| [`CeremonyView.tsx`](../src/components/CeremonyView.tsx) | One ceremony, staged: the moment stepper, the venue picker, the media rail. |
| [`CeremonyProps.tsx`](../src/components/CeremonyProps.tsx) | The prop kit — all thirteen `PropKind`s, built at real size with their base on the ground. |
| [`CeremonyScene.tsx`](../src/components/CeremonyScene.tsx) | The eight settings, and the light for each hour of the day. |

**The stepper is the primary control**, because the sequence is the thing being
taught. Stepping from one moment to the next re-dresses the yard: the trays come
out, then the monks are seated, then the mat is cleared for the candles. The
camera re-frames per moment, off the staging's own extent — seven 22 cm candles
and an 8 m marquee cannot share one distance.

Normal / Ultra / VR throughout. Normal drops segment counts, shadows and scatter
density; VR puts you at the edge of the mat as a guest, not in the middle of it
as the couple.

## What is not built yet

In rough order of usefulness:

1. **Create from photos** — the flow a family actually uses, including the
   consent questions asked plainly and one at a time.
2. **People.** There are none. It is the largest single gap, and the reason a
   few placements need the renderer to invent a table under them (see the traps
   below). Figures are a much harder problem than props and are best attempted
   after a family's own photographs are carrying the human content.
3. **Season and time as controls** — both are in the format and rendered; only
   the moment's own `timeOfDay` currently drives them.
4. **Calendar ceremonies on the map** — Pchum Ben at a specific pagoda.
5. **Game mode** — attending, taking part, doing the rituals. The user's own
   framing was "later", and it needs everything above it first.

## What needs a person, not a commit

**Every template ships with `needsReview: true`, and that is not modesty.**

Khmer ceremonies vary by region and by family. The sequences in
`src/ceremony.ts` are the commonly described ones, the English names are
descriptive rather than canonical, and a template that is wrong is worse than no
template — it teaches ten thousand families a version of their own tradition
that nobody performs. Clients show a plain "under review" note while the flag is
set. A test asserts the flag is still true, so signing one off is a deliberate
change with a reviewer's name attached in `source`.

**Every ritual name's Khmer is `null`.** Same rule as the Learning Lab: the
interface says "Khmer term needed" rather than showing a guess. Guessing at the
name of somebody's own ritual is worse than leaving a gap. Awaiting a Khmer
speaker who knows the tradition:

| Template | Moments awaiting a Khmer name |
|---|---|
| Wedding | all seven |
| Housewarming | all three |
| Pchum Ben | all three (the ceremony's own name is confirmed: បុណ្យភ្ជុំបិណ្ឌ) |

Also awaiting review: whether the wedding sequence's order is the right one to
present as canonical, and whether "blessing by monks" belongs where it sits.

## Adding a template

1. Write it in `TEMPLATES` in [`src/ceremony.ts`](../src/ceremony.ts), with
   `needsReview: true` and every `km` set to `null`.
2. Give each moment a stable `id` — instances reference it, so renaming one
   orphans every ceremony already recorded against it.
3. Mark regional or family variation `optional`.
4. Choose `venues` honestly. If it is normally in a yard, the first entry is
   `home-yard`, not `hall`.
5. `npx vitest run src/ceremony.test.ts` — the structural checks run over every
   shipped template.

## Traps worth knowing

- **The venue is copied, not referenced.** A picker naturally hands the same
  preset object to every ceremony it creates; aliasing it means editing one
  edits all of them. `newCeremony` spreads it. This was caught by a test that
  mutated a shared fixture and broke four unrelated assertions.
- **`canonicalize` drops `undefined` keys.** `JSON.stringify(undefined)` returns
  `undefined`, not a string, so without the filter a cleared optional field
  produced literally invalid JSON — and a different hash from the same ceremony
  read back out of a file.
- **`locationPrecision: "none"` with a `place` set is an error**, not a warning.
  Two fields disagreeing about how much to reveal must be resolved by a person.
- **Moment ids are the join.** They match the template's ids; duplicates inside
  one ceremony are an error.
- **A marquee goes up at a *house*.** The first version of the stage raised one
  over anything that was not indoors, which stood a pink wedding marquee over
  Pchum Ben on pagoda ground. Getting this wrong is worse than a bare yard: it
  says the wrong thing about the ceremony.
- **The camera has to sit under the marquee's eave.** The canopy is opaque, so
  any shot from above it frames a nice pink roof and none of the ceremony.
- **A staged height implies a surface.** The templates place trays at 0.8 m and
  blessing candles at 0.5 m, because in life a person is holding them or a table
  is under them. With no people modelled, `Staging` supplies the table the data
  implies — otherwise it is a row of candles hanging in mid-air.
- **Dawn and dusk carry more ambient light than physics would give them.** Pchum
  Ben happens before dawn and a reception runs past dusk; a correctly black yard
  is a blank screen on a phone held outdoors, which loses the ceremony entirely.
