# The Living Farm — a photo-driven digital twin of real Cambodian farms

> **Status:** Phase 1 (offline prototype) shipped in the Virtual Farm.
> **Concept owner:** community idea, stewarded by CamboVerse Center / NUM.

## The idea

A farmer photographs their **real paddy** through the season — a few taps, from
the phone they already own — and tags each photo with the growing stage it shows.
The **virtual farm then grows to match**: the 3D paddy rises from bare mud to
green to gold to stubble as the real field does, and anyone can **scrub the
timeline** to watch a whole season play back beside the farmer's own photos.

It turns the Virtual Farm from a nice demonstration into a **living digital
twin** — and, over time, into a genuine Digital Public Good: an open,
citizen-built record of how rice is really grown across Cambodia, province by
province, year by year.

Why it fits CamboVerse:

- **Easy for the contributor.** Taking a photo is something everyone already
  does. No special skill, no special hardware.
- **Real living heritage.** The content is real farms and real practice, not a
  studio reconstruction.
- **On-charter.** It runs the same provenance / consent / open-licence
  discipline the platform already commits to.
- **Low-end friendly.** Photos are downscaled on the device; the 3D stays
  procedural and cheap.
- **Money-neutral.** Farmers earn recognition — a credential, their name in
  credits, their village on the map — never cash.

## How the "growth reflects" magic actually works

The reliable mechanism is **not** AI photo-analysis (that is the fragile part).
It is:

> Each photo check-in carries a **growth value** on a 0 → 1 curve, and the
> virtual paddy renders that value (interpolating smoothly between check-ins).

Where the growth value comes from, cheapest and most accurate first:

1. **Farmer taps the stage** on upload (what Phase 1 does). Simple and accurate.
2. **Days-since-planting** — derive growth from the plot's planting date.
3. **Auto-suggest from the photo** — a greenness/season heuristic, later an ML
   classifier. A *bonus*, never a dependency.

The renderer already supports any point on the curve: `riceLook(growth)` in
`src/components/FarmView.tsx` maps a growth value to rice height and colour
(bare → green → gold → stubble), and the stalks are drawn as a single
`InstancedMesh`. `FARM_STAGES[i].growth` in `src/farm.ts` places each of the
seven stages on the same curve.

## Phase 1 — offline prototype (shipped)

In the Virtual Farm, the **My Farm** tab is a photo diary kept **on the device**
(`localStorage`, key `camboverse.farm.diary.v1`):

- Add a photo (uses the device camera on mobile); it is downscaled to ~1024 px
  JPEG before storage.
- Tag it with a stage (and an optional note); the check-in is dated.
- The 3D paddy reflects the latest check-in's growth; a slider scrubs the season.

No backend, no account, nothing leaves the phone. This proves the whole loop and
is genuinely usable by a single farmer today.

## Phase 2 — a shared, consented photo commons

Promote the diary onto the platform rails (this is where the responsibility, and
the value, grows):

- **Plot** — a registered field: name, **province / district**, planting date,
  rice variety. Living-farm pins appear on the province map (see the province
  teleport feature).
- **Asset rail + R2 + D1** — each photo becomes an asset with **provenance**
  (contributor, plot, timestamp, coarse geo) and a **CC-BY** licence, exactly
  as the existing `Credits` panel expects. Store the image in R2, metadata in
  D1, behind the certified-partner / farmer write auth (`env.PARTNER_KEYS`).
- **Consent & privacy — required.** Photos may show people and homes. Get
  explicit consent; **never publish exact home coordinates** (snap to
  commune/village); **moderate before public display**. This is the biggest new
  duty and must be designed in from the first shared upload.
- **Trust.** Use photo timestamp + geotag to bind a check-in to its plot and
  time; a light review deters spam.

## Phase 3 — richer experience

- Auto growth-suggestion from the photo (greenness/season heuristic → ML).
- Time-lapse playback of a season; a billboard of the real photo standing in the
  3D paddy.
- Weather / monsoon overlay tied to the check-in dates.

## Phase 4 — an open agricultural-heritage dataset

With consent, aggregate check-ins into an open **planting-calendar dataset per
province** — when fields are ploughed, transplanted, and harvested across
Cambodia — that schools, agronomists, and researchers can reuse. A real DPG
output, released under an open licence with full provenance.

## Guardrails (do not drift)

- **Money-neutral core.** No in-game currency, no "buy seeds/upgrades". Progress
  is knowledge and recognition.
- **Open licences only** for any shared media (CC-BY / CC0 / CC-BY-SA).
- **Consent and coarse geo** for every real-world photo of a place or person.
- **Low-end first.** Downscale on device; one photo per check-in; thumbnails.

## Where the code is

- `src/components/FarmView.tsx` — the Virtual Farm, the **My Farm** diary, and
  the growth-driven paddy (`riceLook`, `RicePaddy`).
- `src/farm.ts` — the rice stages and their positions on the growth curve.
- `TODO.md` → *Grow the Virtual Farm* — contributor tasks.
