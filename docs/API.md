# CamboVerse Rails — `/v1` API reference

The **rails** are the open interfaces ecosystem apps build on (see
[`ARCHITECTURE.md`](../ARCHITECTURE.md) for the design, and
[`PLATFORM_CHARTER.md`](../PLATFORM_CHARTER.md) for what CamboVerse is and isn't).
This is the concrete HTTP contract: a small, versioned, JSON API served by the
edge Worker.

CamboVerse's own app is just the **first consumer** of these rails. Anyone —
a startup, a school, a museum — can call them to build on the same heritage
commons and the same shared world.

> **Stability.** Everything is versioned under `/v1`. Additive changes (new
> fields, new endpoints) can land within `/v1`; breaking changes get a new
> version. Treat unknown fields as forward-compatible and ignore them.

---

## Conventions

- **Base path:** all rails live under `/v1`. Responses are JSON with
  `cache-control: no-store`.
- **Reads are open.** Public read endpoints (assets, scenes, providers,
  a person's public credentials) need no auth — this is a commons.
- **Identity-bound writes** carry a bearer token:
  `Authorization: Bearer <token>` (obtained from `POST /v1/id`).
- **Money-neutral.** No endpoint takes a payment. The D2P rail only *routes* to a
  real provider; settlement happens in the ecosystem, never in the core.
- **Errors** are `{ "error": "<message>" }` with a `4xx`/`5xx` status.
- **Database.** Identity, entitlement, and credential rails require a D1 binding;
  without one they return `503`. The **Asset**, **Scene**, and **Provider**
  rails are pure-derived and work with or without a database.

### Web3 seams (reserved, inert in Web2)

The schema already carries the seams so enabling Web3 later is an adapter swap,
not a redesign: identities have a `wallet` field, assets a `tokenBinding`, and
entitlements a `source` (`db` today, `chain` later). All are `null`/`db` now.

---

## Endpoint summary

| Rail | Method & path | Auth | Purpose |
|---|---|---|---|
| Identity | `POST /v1/id` | — | Create a portable CamboVerse identity + session token |
| Identity | `GET /v1/id/me` | Bearer | The current identity |
| Asset | `GET /v1/assets[?type=]` | — | List commons assets |
| Asset | `GET /v1/assets/:id` | — | One asset (NFT-metadata-compatible) |
| Entitlement | `GET /v1/entitlements?subject=&asset=&action=` | — | `can(subject, action, asset)` |
| Entitlement | `POST /v1/entitlements` | — | Grant a right (`own`/`view`/`use`/`rent`) |
| Credential | `POST /v1/credentials/claim` | Bearer or `subjectId` | Claim a learning credential |
| Credential | `GET /v1/credentials?subject=` | — | A person's credentials |
| Experience | `GET /v1/scenes` | — | List scene descriptors |
| Experience | `GET /v1/scenes/:id` | — | One scene descriptor |
| D2P | `GET /v1/providers?type=&region=` | — | Provider registry |
| D2P | `POST /v1/fulfill` | — | Route a digital action to a real in-region provider |

---

## Quick start

```bash
# 1. Get a free, portable identity (anonymous — no personal data required)
curl -sX POST https://<host>/v1/id -H 'content-type: application/json' -d '{}'
# → { "id": "cid_…", "token": "…", "handle": null, "displayName": null }

# 2. Claim a learning credential with that token
curl -sX POST https://<host>/v1/credentials/claim \
  -H "authorization: Bearer <token>" -H 'content-type: application/json' \
  -d '{ "achievement": "history:angkor-wat:angkor", "evidence": "quiz" }'

# 3. Read a heritage scene and resolve one of its assets
curl -s https://<host>/v1/scenes/scene_angkor-wat
curl -s https://<host>/v1/assets/ast_site_angkor-wat
```

---

## Identity

A visitor gets a free, portable CamboVerse identity. It's created lazily — only
when someone first *does* something that needs one (e.g. earns a credential) —
so passive viewers create no account.

### `POST /v1/id`

Body (all optional): `handle`, `displayName`, `khmerName`.

```jsonc
// → 201
{ "id": "cid_…", "token": "…", "handle": null, "displayName": null }
```

`409` if a requested `handle` is already taken. Keep the `token` — it
authenticates identity-bound writes.

### `GET /v1/id/me`

Header: `Authorization: Bearer <token>`.

```jsonc
// → 200
{ "id": "cid_…", "handle": null, "displayName": null, "khmerName": null,
  "avatarAssetId": null, "wallet": null, "createdAt": "2026-07-15T…" }
```

`401` if the token is missing or unknown.

---

## Assets

The heritage commons as an **NFT-metadata-compatible** registry. Seeded from the
heritage data: **heritage sites**, their **POIs**, and **history eras**, each
with a `license`, `provenance`, and `consent`. `tokenBinding` is reserved for
later minting and is `null` today.

Asset id convention: `ast_site_<site>`, `ast_poi_<site>_<poi>`, `ast_era_<era>`.

### `GET /v1/assets`

Optional `?type=` filter: `heritage-site` | `poi` | `history-era`.

```jsonc
// → 200
{ "assets": [ { /* asset */ } ], "count": 26 }
```

### `GET /v1/assets/:id`

```jsonc
// → 200
{ "id": "ast_site_angkor-wat",
  "type": "heritage-site",
  "name": "Angkor Wat",
  "description": "The largest religious monument on Earth …",
  "image": null,
  "media": [ { "role": "model", "uri": "/models/angkor-wat.glb", "format": "glb" } ],
  "attributes": [ { "trait_type": "Province", "value": "Siem Reap" },
                  { "trait_type": "Khmer", "value": "អង្គរវត្ត" } ],
  "external_url": "/site/angkor-wat",
  "license": "CC-BY-4.0",
  "provenance": { "contributor": "CamboVerse Center / NUM", "method": "authored", "capturedAt": "…" },
  "consent": { "steward": "APSARA / Ministry of Culture and Fine Arts", "consentRef": "pending" },
  "tokenBinding": null }
```

`404` if the id is unknown. The `media`/`attributes` layout is deliberately
OpenSea-style so a startup can mint without re-modelling.

---

## Entitlement

`can(subject, action, asset)` — the permission rail. Rights are
`own` · `view` · `use` · `rent`.

**Public-good rule:** `view` on any known commons asset is *always granted*. We
never gate access to the heritage commons. `own`/`use`/`rent` resolve from the
entitlements table; rentals honour `expires_at`.

### `GET /v1/entitlements`

Query: `asset` (required), `subject` (required unless the action is a public
`view`), `action` (default `view`).

```jsonc
// public view of a commons asset
// → { "granted": true, "source": "public" }

// a held right (e.g. after a grant)
// → { "granted": true, "until": null, "source": "db" }

// not held
// → { "granted": false }
```

`400` if `asset` is missing.

### `POST /v1/entitlements`

Body: `assetId`, `subjectId`, `right` (required); `grantedBy`, `expiresAt`
(optional; `expiresAt` makes it a rental).

```jsonc
// → 201
{ "id": "ent_…", "assetId": "ast_…", "subjectId": "cid_…", "right": "use", "expiresAt": null }
```

> An on-chain resolver plugs in behind the same `GET` later (`source: "chain"`),
> so ownership minted as a token is honoured without changing callers.

---

## Learning credentials

Non-monetary, non-transferable proof of learning (Open Badges / W3C VC shape).
They represent learning, not value — they cannot be bought or sold. A person's
Museum can display them; startups may *reference* them to gate a reward.

### `POST /v1/credentials/claim`

Auth: `Authorization: Bearer <token>` **or** an explicit `subjectId` in the body.
Body: `achievement` (required), `evidence` (optional).

```jsonc
// → 201
{ "id": "cred_…", "issuer": "camboverse", "subjectId": "cid_…",
  "achievement": "history:angkor-wat:angkor", "issuedAt": "…",
  "proof": "<sha-256>" }
```

`proof` is a SHA-256 digest over the issued credential, so it's independently
verifiable.

### `GET /v1/credentials?subject=<id>`

```jsonc
// → 200
{ "credentials": [ { "id": "cred_…", "issuer": "camboverse", "subjectId": "cid_…",
    "achievement": "history:angkor-wat:angkor", "evidence": "quiz",
    "issuedAt": "…", "proof": "…" } ] }
```

`400` if `subject` is missing.

---

## Experience / scenes

Scene descriptors let apps drop experiences into **one shared CamboVerse world**.
Each scene anchors into a canonical heritage site; its asset refs resolve through
the Asset rail. Pure-derived — works with or without a database.

`capabilities` can include: `orbit` and `vr` (always), `walk` (site has POIs),
`aerial` (arrives from above), `photoreal` (a Gaussian-splat capture exists).

### `GET /v1/scenes`

```jsonc
// → 200 (one entry per heritage site)
{ "scenes": [ { "id": "scene_angkor-wat",
    "anchor": { "kind": "site", "ref": "ast_site_angkor-wat", "geo": { "lat": 13.4125, "lng": 103.867 } },
    "name": "Angkor Wat", "khmer": "អង្គរវត្ត", "live": true,
    "capabilities": ["orbit", "vr", "walk", "aerial", "photoreal"] } ],
  "count": 7 }
```

### `GET /v1/scenes/:id`

Accepts `scene_<site>` or a bare `<site>` id.

```jsonc
// → 200
{ "id": "scene_angkor-wat",
  "anchor": { "kind": "site", "ref": "ast_site_angkor-wat", "geo": { "lat": 13.4125, "lng": 103.867 } },
  "name": "Angkor Wat", "khmer": "អង្គរវត្ត", "live": true,
  "capabilities": ["orbit", "vr", "walk", "aerial", "photoreal"],
  "assets": ["ast_site_angkor-wat", "ast_poi_angkor-wat_moat-bridge", "…"],
  "pois": [ { "id": "moat-bridge", "assetId": "ast_poi_angkor-wat_moat-bridge",
              "title": "Moat & Western Bridge", "target": [0, 0.4, 17], "camera": [3.6, 2.8, 21.5] } ],
  "entryPoints": [ { "id": "aerial", "aerial": true },
                   { "id": "moat-bridge", "camera": [3.6, 2.8, 21.5], "target": [0, 0.4, 17] } ] }
```

`404` if the id is unknown. Resolve each `assets[]` / `pois[].assetId` via
`GET /v1/assets/:id` for media and licensing.

---

## D2P fulfillment

The bridge from a digital action to a **real, in-region provider** — how
CamboVerse *pushes* the physical economy instead of competing with it. The core
only routes; **it never takes payment**. Every fulfill response carries
`"settlement": "ecosystem"`.

Provider `type`s: `delivery` · `purchase` · `booking` · `ticket`.

### `GET /v1/providers`

Optional filters `?type=` and `?region=` (ISO-3166 alpha-2, e.g. `KH`, `US`).

```jsonc
// → 200
{ "providers": [ { "id": "prov_kh_delivery", "type": "delivery", "region": "KH",
    "name": "Cambodia delivery partner (reference)", "payMethods": "KHQR · Bakong",
    "handoff": "https://partners.camboverse.org/kh/delivery" } ], "count": 1 }
```

> The seeded registry is **reference** (clearly labelled) so ecosystem apps plug
> in real merchants/operators later.

### `POST /v1/fulfill`

Body: `type` (default `delivery`), `country` (the buyer's disclosed country;
falls back to Cloudflare geo), `buyerId` (optional), `details` (optional,
opaque to the core).

```jsonc
// request
{ "type": "delivery", "country": "US", "buyerId": "cid_…" }

// → 201
{ "type": "delivery", "region": "US", "regionName": "United States", "flag": "🇺🇸",
  "buyerId": "cid_…",
  "provider": "United States delivery partner (reference)", "providerId": "prov_us_delivery",
  "payMethod": "Card · Stripe", "delivery": "DoorDash / Uber Eats",
  "handoff": "https://partners.camboverse.org/us/delivery",
  "settlement": "ecosystem" }
```

`400` if `type` is not one of the four. An unknown country routes to a clearly
labelled reference so a call never dead-ends (`providerId: null`).

---

## App endpoints (not part of the stable rails)

The Worker also serves a few app-specific endpoints used by the CamboVerse
reference client. They are **not** part of the versioned `/v1` contract and may
change: `GET /api/health`, `GET /api/geo`, `POST /api/order` (the shop PoC — see
[`DIGITAL_ECONOMY.md`](../DIGITAL_ECONOMY.md)), and `POST /api/guide` (the Kiri
AI tour guide — see [`AI_GUIDE.md`](./AI_GUIDE.md)).
