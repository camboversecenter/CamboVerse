# CamboVerse Rails SDK

A tiny, **dependency-free** JavaScript client for the open [`/v1` rails](../docs/API.md).
One ES module — no build step, no dependencies, no external assets. Works in the
browser and in modern Node (uses the global `fetch`).

It wraps the same public HTTP contract in `docs/API.md`, so ecosystem apps don't
hand-roll requests or re-implement lazy, anonymous identity.

## Use it

```js
import { createClient } from "./camboverse.js";

const cv = createClient({ baseUrl: "https://your-camboverse-host" }); // "" = same origin

// Experience: read a heritage scene and its points of interest
const scene = await cv.getScene("scene_angkor-wat");

// Asset: resolve a scene's asset ref (name, media, licence, provenance)
const asset = await cv.getAsset(scene.pois[0].assetId);

// Credential: mints an anonymous identity lazily on first claim
await cv.claimCredential("history:angkor-wat:angkor", "quiz");
const earned = await cv.earned();            // Set<string> of achievement ids

// D2P: route a digital action to a real in-region provider (core never settles)
const route = await cv.fulfill({ type: "purchase", country: "KH" });
```

## API

`createClient({ baseUrl?, storage?, fetch? })` returns a client with:

| Rail | Methods |
|---|---|
| Identity | `getIdentity(create?)`, `clearIdentity()`, `me()` |
| Asset | `listAssets(type?)`, `getAsset(id)` |
| Entitlement | `can(subject, action, asset)`, `grant({assetId, subjectId, right, expiresAt?})` |
| Credential | `claimCredential(achievement, evidence?)`, `credentials(subject?)`, `earned(subject?)` |
| Experience | `listScenes()`, `getScene(id)` |
| D2P | `providers({type?, region?})`, `fulfill({type, country, buyerId?, details?})` |

Options:

- **`baseUrl`** — origin of a CamboVerse host. `""` (default) means same origin.
  The rails send permissive CORS, so cross-origin calls work from any web origin.
- **`storage`** — where the identity token is kept. Defaults to `localStorage` in
  the browser, or an in-memory store elsewhere. Pass your own
  `{ getItem, setItem, removeItem }` to control persistence.
- **`fetch`** — a custom `fetch` (defaults to the global one).

### Identity is lazy and anonymous

No account is created until the visitor first *does* something that needs one —
`getIdentity(true)` or the first `claimCredential(...)`. Passive reads
(`getScene`, `listAssets`, …) never mint an identity. The token persists via
`storage`, so the same identity survives reloads and can later bind to a real
login.

### Errors

Failed calls throw a `RailsError` with `.status`, `.path`, and the parsed
`.body`:

```js
import { RailsError } from "./camboverse.js";
try {
  await cv.getScene("does-not-exist");
} catch (e) {
  if (e instanceof RailsError && e.status === 404) { /* … */ }
}
```

## Verified

Every method is exercised end-to-end against the real Workers runtime — lazy
identity, credential claim + `earned`, public-view vs. granted entitlements, D2P
routing, and `RailsError` on a 404. See the repository's verification notes.

> This SDK is a convenience wrapper. The stable contract is the HTTP API in
> [`docs/API.md`](../docs/API.md) — anything the SDK does, you can do with plain
> `fetch`.
