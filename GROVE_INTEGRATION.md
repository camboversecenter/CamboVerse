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

## Pointing at a different node

The node base URL is configurable — federation is first-class.

- **In the UI:** the Grove Garden screen has a node URL field (defaults to
  `https://iany.app/api/grove`, the reference node — not deployed yet). Edit it
  and press **Read node**.
- **In code:**

  ```ts
  import { GroveClient } from "./grove/client";

  const client = new GroveClient("https://my-node.example/api/grove");
  const page = await client.feed({ limit: 100 }); // each item verified locally
  const stop = client.pollFeed((records) => addToGarden(records), { intervalMs: 30000 });
  ```

Because records are **content-addressed and self-verifying**, any node works and
records can be federated between nodes unchanged. Until a node is live, develop
against the offline bundle (the default demo data) or import a phone export.

## Run the test

```
npm test        # vitest — verifies all 3 fixture observations + the attestation
```

The test loads `src/grove/fixtures/grove-bundle.json` and `observation.json`,
confirms every record verifies, and asserts that a **tampered** record (inflated
`co2Kg`) and a **forged** signature are both rejected — i.e. CamboVerse's trust
comes from the math, not from iany.app.
