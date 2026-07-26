# Grove integration — verified virtual gardens

CamboVerse grows a **virtual twin of a real garden** from [Grove](https://github.com/sengtha/iAny)
records: a user's phone measures a real plant's carbon and **signs** the record
on-device (the source of truth). CamboVerse is a *consumer* — it reads those
signed records, **verifies each one itself**, and renders the twin. No API key,
no central authority, no trust in any server.

Open it in the app: **🌱 Grove Garden** on the map.

## Which verify path we used

CamboVerse is TypeScript, so we took the **direct-import path** from
[`BRIDGE.md §3`](https://github.com/sengtha/iAny/blob/main/grove/BRIDGE.md): the
reference verifier is **vendored** at [`src/grove/grove.ts`](./src/grove/grove.ts)
(copied from `sengtha/iAny → grove/core/grove.ts`, Apache-2.0) so the viewer stays
self-contained — no external runtime dependency. It uses **Web Crypto only** and
runs identically in the browser, in Node (tests), and on Cloudflare Workers.

Verification is exactly `SPEC.md §§4–5`:

1. **canonical JSON** — object keys sorted recursively, carbon numbers rounded to
   2 dp (`canonicalize`).
2. **SHA-256** of that → must equal the record's `id` (`idOk`, tamper-evidence).
3. **ECDSA-P256** signature check of `sig` over `id`, using the public key read
   from the record's own `device` field (`sigOk`, authenticity — no directory).

`verifyObservation(obs).ok === (idOk && sigOk)`. We call it on **every** record
before it reaches the renderer; anything that fails is dropped, never drawn.

The only edits to the vendored file are typing shims (`utf8()` / `unb64url`
return `Uint8Array<ArrayBuffer>`) so the Web Crypto calls satisfy TS 5.7's
stricter `Uint8Array` generics — **behaviour is identical**. Re-sync from upstream
if the spec revises; keep the algorithm in lock-step with `SPEC.md`.

## The pieces

| File | Role |
|---|---|
| [`src/grove/grove.ts`](./src/grove/grove.ts) | Vendored reference verifier (`verifyObservation`, `verifyAttestation`, `trustScore`, `estimateCarbon`, `canonicalize`). |
| [`src/grove/bundle.ts`](./src/grove/bundle.ts) | **Path A** — import an offline `grove-bundle` (phone → Export JSON) and verify each record locally, no network. |
| [`src/grove/client.ts`](./src/grove/client.ts) | **Path B** — `GroveClient`: reads `/stats`, `/feed?since=`, `/plot/:plot`, `/observation/:id`; **re-verifies every record locally**; `pollFeed()` tracks the cursor. |
| [`src/grove/garden.ts`](./src/grove/garden.ts) | Maps verified records → plots, growth chains (`prev`), size stages, trust/opacity cues, coarsened GPS. |
| [`src/components/GroveGardenView.tsx`](./src/components/GroveGardenView.tsx) | The renderer — a growing virtual garden with the honesty labels below. |
| [`src/grove/grove.test.ts`](./src/grove/grove.test.ts) | Unit test against the **real signed fixtures**. |
| [`src/grove/fixtures/`](./src/grove/fixtures) | Vendored `grove-bundle.json` + `observation.json` — genuinely device-signed sample data. |

## Field mapping (BRIDGE.md §4)

`plot` → one virtual parcel · `species` → which plant asset (`mango`, `coconut`,
`banana`, …) · `count` → how many · `measure` (`dbh_cm`/`height_m`) → the tree's
size/age growth stage · `prev` chain → a growth-over-time timeline you can scrub
or play.

## The scene

The garden renders **to scale**: a plant is drawn at its *measured* height
(`measuredHeightM` — the recorded `height_m`, else the same H ≈ 3·√D fallback the
Grove estimator uses), so a 12 m coconut stands 12 m and a newly planted sapling
is a seedling. Plots are laid out as an orchard grid.

Plants are grown procedurally per species in
[`src/components/GrovePlants.tsx`](./src/components/GrovePlants.tsx): a seeded,
recursively branched skeleton merged into one mesh, a canopy of instanced leaf
clumps, and folded-ribbon fronds for palms/bananas/papayas — so a jackfruit
(upright, fruit straight off the trunk), a tamarind (wide umbrella) and a coconut
palm all read differently. Ground, soil and bark textures are drawn on a canvas
at runtime ([`src/lib/groundTexture.ts`](./src/lib/groundTexture.ts)). **Nothing
is downloaded** — no model files, no HDRI, no CDN — which keeps the whole thing
inside the self-contained rule.

It follows CamboVerse's **three view modes** (AGENTS.md → "The three view
modes"), auto-detected and switchable in the header (**✨ Ultra** / **🍃 Normal**):

| | Normal | Ultra | VR |
|---|---|---|---|
| Branch generations | 2 | 3 | 3 |
| Leaf clumps | faceted | rounded | rounded |
| Shadows · grass tufts · wind | no | yes | yes |
| Antialias · pixel ratio | off · up to 1.5× | on · up to 2× | on |

VR always presents the **Ultra** scene — entering a session raises the view mode
for its duration. A whole plant costs about **3–4 draw calls** (branches,
instanced canopy, instanced fruit, merged fronds), so a full garden stays within
a low-end phone's budget.

## Honesty & privacy (BRIDGE.md §4–5)

- **`co2Kg` is rendered as "≈ N kg CO₂ estimated"** — a conservative estimate
  (Chave et al. 2014 allometry), **never** a tradable token or carbon credit.
- **`trust` (0–100)** is a visual confidence cue: a lone self-claim renders more
  **translucent**; a **community-attested** record renders **solid**
  (`trustOpacity`). Trust is recomputed **locally** from attestations that
  themselves verify — a node's claimed trust is never taken on faith.
- **Privacy:** public placement uses **coarsened GPS (~1 km)**, never a precise
  per-observation `gps`; `device` is shown as a truncated **pseudonym**, never a
  name.

## Reading a node: why the feed alone can't be verified

The public `/feed` is a **discovery** surface, not a verifiable one. The node
deliberately **coarsens each item's GPS to ~1 km** for privacy (BRIDGE.md §2) —
which changes the observation's bytes, so a feed item no longer hashes to its
signed `id`. Verifying feed items as-is therefore rejects *every* record.

The contract's answer is `/observation/:id`, which returns the **exact signed
bytes**. So `GroveClient.feed()`:

1. `GET /feed?limit=…` — discovery (ids + the coarsened coordinates).
2. For each item: verify it as-is (free — some nodes don't alter it); otherwise
   `GET /observation/:id` and verify **those** bytes.
3. Render only what verified, and place it on the map using the **feed's**
   coarsened coordinate (BRIDGE.md §5), never the precise `gps` in the record.

Two practical notes: the client asks for a modest page (`limit` ≤ 50 — a larger
page can be rejected by a node), and falls back to the node's own default if an
explicit `limit` is refused.

## Pointing at a different node

The node base URL is configurable — federation is first-class.

- **In the UI:** the Grove Garden screen has a node URL field (defaults to
  `https://iany.app/api/grove`, the reference node). Edit it and press
  **Read node**.
- **In code:**

  ```ts
  import { GroveClient } from "./grove/client";

  const client = new GroveClient("https://my-node.example/api/grove");
  const page = await client.feed();               // each record verified locally
  const stop = client.pollFeed((records) => addToGarden(records), { intervalMs: 30000 });
  ```

Because records are **content-addressed and self-verifying**, any node works and
records can be federated between nodes unchanged. With no node reachable, the
garden falls back to the offline bundle, and a phone export can always be
imported directly.

## Run the test

```
npm test        # vitest — verifies all 3 fixture observations + the attestation
```

The test loads `src/grove/fixtures/grove-bundle.json` and `observation.json`,
confirms every record verifies, and asserts that a **tampered** record (inflated
`co2Kg`) and a **forged** signature are both rejected — i.e. CamboVerse's trust
comes from the math, not from iany.app. It also drives `GroveClient` against a
stub node that behaves like the real one (coarsened feed, exact bytes by id) to
prove node records are verified through `/observation/:id` and not silently
dropped.
