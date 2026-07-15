# CamboVerse — Architecture (the Rails)

*Companion to [`PLATFORM_CHARTER.md`](./PLATFORM_CHARTER.md). This is the Stage‑1
specification of the open interfaces ("rails") that ecosystem apps build on.*

**Two rules govern everything here:**

1. **Interface, not implementation.** Every rail is an interface with a **Web2
   adapter today** (Cloudflare Workers + D1 + R2) and a **Web3 adapter later**
   (chain indexer + wallet + content-addressed storage). Ecosystem apps call the
   interface — **never** a database or a blockchain directly. Web3 becomes an
   adapter swap, not a rewrite.
2. **Money‑neutral & Digital‑to‑Physical.** The core moves no money and mints no
   tokens. It routes digital actions to **real** providers (D2P); payments and
   tokens live in the ecosystem.

---

## 0. Tech baseline

| Concern | Today (Web2) | Later (Web3, ecosystem) |
|---|---|---|
| API | Cloudflare Workers | same |
| Data | D1 (SQLite) | + chain indexer (read) |
| Media/assets | R2 (content-addressed) | + IPFS / Arweave |
| Identity | CamboVerse ID (OIDC-style) | + wallet / DID binding |
| Client | React + R3F + WebXR, Khmer-first, ~$150 Android | same |

All IDs are opaque strings. All media is addressed by content hash so it is
portable to IPFS unchanged. All timestamps are RFC‑3339 UTC.

---

## 1. Identity & Avatar rail

A portable "you," recognised across every ecosystem app — **"Login with
CamboVerse."**

**Identity object**
```jsonc
{
  "id": "cid_0x8f…",            // stable CamboVerse ID
  "handle": "sengtha",
  "displayName": "Sengtha",
  "khmerName": "សិង្ហថា",
  "avatarAssetId": "ast_…",      // an Asset of type "avatar" (portable)
  "createdAt": "2026-07-15T…",
  "wallet": null                 // Web3 seam: DID/wallet binding, later
}
```

**Endpoints**
- `GET  /id/authorize` · `POST /id/token` — OAuth2/OIDC-style login for apps.
- `GET  /id/me` — the identity for the bearer token (scoped).
- Scopes: `profile`, `avatar`, `credentials:read`, `entitlements:read`.

**Web3 seam:** `wallet` binds a self-custodial address/DID later; `/id/me` is
unchanged. Identity is **free** and never gated (charter §3.1).

---

## 2. Asset rail (registry + schema)

One schema for every "cultural thing," authored **NFT-metadata-compatible from
day one** so a startup can mint it later with no re-modelling.

**Asset object** (superset of ERC-721/1155 metadata)
```jsonc
{
  "id": "ast_…",
  "type": "heritage-site",       // see enum below
  "name": "Angkor Wat",
  "description": "…",
  "image": "r2://<hash>",        // content-addressed; IPFS-ready
  "media": [ { "role": "model", "uri": "r2://<hash>", "format": "glb" },
             { "role": "splat", "uri": "r2://<hash>", "format": "splat" } ],
  "attributes": [ { "trait_type": "Province", "value": "Siem Reap" } ],
  "external_url": "https://camboverse…/site/angkor-wat",
  // CamboVerse extensions (required):
  "license": "CC-BY-4.0",        // SPDX id; core content is CC0/CC-BY
  "provenance": { "contributor": "…", "capturedAt": "…", "method": "3DGS" },
  "consent": { "steward": "APSARA", "consentRef": "…" },
  "tokenBinding": null           // Web3 seam: { chain, contract, tokenId }
}
```

**Asset types (open enum):** `heritage-site`, `poi`, `history-era`,
`khmer-letter`, `instrument`, `music`, `dance`, `craft`, `fashion`,
`architecture`, `tool`, `avatar`, `museum-key`, `villa-key`, `dhamma-lesson`,
`textbook-asset`, `experience`.

**Rules:** `license`, `provenance`, and `consent` are **mandatory** — an asset
without them is rejected (charter §3.5). Sacred content (`dhamma-lesson`, sacred
sites) requires a monastic/steward `consentRef`.

**Endpoints**
- `GET /assets`, `GET /assets/:id` — **open read** (the commons).
- `POST /assets`, `PATCH /assets/:id` — **certified partners only** (write scope).

**Web3 seam:** when a startup mints, it fills `tokenBinding`; ownership for that
asset is then read on-chain via the Entitlement resolver (below) — the asset
record itself does not change.

---

## 3. Entitlement rail

The one question every gate asks: **can `subject` do `action` on `asset`?** This
is how NFT-gating, rentals, and cross-app rights all work with one interface.

**Actions:** `own` · `view` · `use` · `rent` · `transfer`.

**Entitlement record**
```jsonc
{
  "id": "ent_…",
  "assetId": "ast_…",
  "subjectId": "cid_…",
  "right": "rent",              // own | view | use | rent
  "grantedBy": "app_treasurehunt",
  "expiresAt": "2026-08-01T…",  // rentals carry an expiry; owns don't
  "source": "db"               // db (today) | chain (later)
}
```

**Resolver interface** — `can(subject, action, asset) → { granted, until? }`.
The reference resolver reads D1. Crucially, **certified apps can register their
own resolver** (delegated ownership): an app that sells or rents an asset reports
entitlements that the whole ecosystem then honours. Rental (charter: "Module #7")
is simply `right: "rent"` with `expiresAt`.

**Endpoints**
- `GET /entitlements?subject=&asset=&action=` → `{ granted, until }` (open read).
- `POST /entitlements` / `DELETE` — grant/revoke (certified apps, their assets).

**Web3 seam:** an on-chain resolver adapter (read token balance/owner for an
asset's `tokenBinding`) plugs in behind the same `GET` — apps see no difference.

---

## 4. Learning‑credential rail (non‑monetary)

Verifiable proof of learning/achievement — the public-good "currency" that is
**not** money and **not** tradable. Fuels Treasure Hunt, KhmerFi, and the
Personal Museum.

Shaped after **Open Badges / W3C Verifiable Credentials**:
```jsonc
{
  "id": "cred_…",
  "issuer": "camboverse",
  "subjectId": "cid_…",
  "achievement": "history:angkor-wat:golden-age",
  "evidence": "quiz:…",
  "issuedAt": "2026-07-15T…",
  "proof": "…"                 // signed by CamboVerse
}
```

**Endpoints**
- `POST /credentials/claim` — submit evidence (e.g. a completed site-history
  quiz) → issued credential.
- `GET /credentials?subject=` — a person's credentials (their Museum can display
  them; startups may *reference* them to gate a reward, but cannot buy/sell them).

Credentials are bound to identity and **non-transferable** — they represent
learning, not value.

---

## 5. Experience runtime & scene format

The open format that lets apps drop experiences into **one shared CamboVerse
world** (charter §10: shared world + rails).

**Scene descriptor**
```jsonc
{
  "id": "scene_…",
  "anchor": { "kind": "site", "ref": "ast_angkor" },  // or { kind:"geo", lat, lng }
  "capabilities": ["orbit", "walk", "vr"],
  "assets": ["ast_angkor", "ast_…"],
  "pois": [ { "id":"…", "assetId":"ast_…", "target":[…], "camera":[…] } ],
  "entryPoints": [ { "id":"aerial", "camera":[…] } ]
}
```

- The **R3F/WebXR runtime** consumes scene descriptors; asset refs resolve via the
  Asset rail; POIs/entry-points drive teleport, walk, and VR (already built).
- **World graph:** a canonical Cambodia map + sites that scenes anchor into, so a
  startup's treasure hunt overlays the *same* heritage map everyone sees.
- Asset formats: **glTF/GLB** (models), **.splat** (Gaussian splats), audio for
  music/instruments, plus AR marker bindings for the textbook module.

---

## 6. D2P Fulfillment rail

The bridge from a digital action to a **real** provider — the mechanism that
makes CamboVerse push the physical economy.

**FulfillmentRequest → FulfillmentRouting**
```jsonc
// request
{ "type": "delivery",           // delivery | booking | ticket | purchase
  "buyerId": "cid_…",
  "country": "US",              // from Cloudflare cf.country (disclosed)
  "details": { "items": [ … ] } }

// routing (response)
{ "provider": "partner_…",       // a real merchant/guide/operator in-region
  "region": "US",
  "payMethod": "Card · Stripe",  // KHQR · Bakong for KH
  "delivery": "DoorDash / Uber Eats",
  "handoff": "https://…"         // deep-link / booking URL (payment in ecosystem)
}
```

CamboVerse defines the **request/response standard** and a **reference router**
(the geo-aware fulfillment already prototyped). Real **payment and settlement
happen in the ecosystem** (Stripe, Bakong/KHQR) — never in the core. Provider
types cover delivery, **tour/hotel booking**, **event/performance ticketing**,
and artisan **purchase** — one interface, many D2P pathways.

**Endpoints**
- `POST /fulfill` → routing. `GET /providers?type=&region=` (registry).

---

## 7. Data model (D1) — reference

```
identities(id, handle, display_name, khmer_name, avatar_asset_id, wallet, created_at)
assets(id, type, name, description, image, media_json, attributes_json,
       license, provenance_json, consent_json, token_binding_json, created_at)
entitlements(id, asset_id, subject_id, right, granted_by, expires_at, source, created_at)
credentials(id, issuer, subject_id, achievement, evidence, issued_at, proof)
providers(id, type, region, name, pay_methods, handoff)
-- ecosystem apps keep their OWN order/token tables; the core does not.
```

Indexed by the fields each `GET` filters on (subject, asset, region). Media blobs
live in **R2**, keyed by content hash.

---

## 8. API surface (summary)

| Rail | Read (open) | Write (certified) |
|---|---|---|
| Identity | `GET /id/me` | OAuth `authorize`/`token` |
| Asset | `GET /assets`, `/assets/:id` | `POST/PATCH /assets` |
| Entitlement | `GET /entitlements` | `POST/DELETE /entitlements` |
| Credential | `GET /credentials` | `POST /credentials/claim` |
| Experience | `GET /scenes/:id` | `POST /scenes` |
| D2P | `GET /providers` | `POST /fulfill` |

Public **read** is open to all (the commons). **Write** requires a certified
partner key (charter §8 trust mark). Everything is versioned under `/v1/…`.

---

## 9. The three Web3 seams

| Seam | Interface (unchanged) | Web2 adapter | Web3 adapter (ecosystem) |
|---|---|---|---|
| **Identity** | `/id/me` | account/session | bind wallet/DID |
| **Ownership** | `can(subject, action, asset)` | D1 `entitlements` | read token ownership via `tokenBinding` |
| **Value** | *(not in core)* | ecosystem points/fiat | ecosystem tokens/crypto |

Because apps depend only on the interfaces, enabling Web3 = registering the chain
adapters. No module changes. The core stays money- and chain-neutral.

---

## 10. Build order (maps to charter stages)

- **Stage 1 (this doc):** specify the rails — done here.
- **Stage 2:** implement Identity + Asset registry + Credentials on D1/R2; migrate
  the existing heritage content into the Asset registry with provenance.
- **Stage 3:** expose the public **APIs + SDK + sandbox**; generalise the D2P
  `/fulfill` router from the shop reference; ship the certification program and a
  reference partner app.
- **Stage 4+:** ecosystem onboarding; later, the Web3 adapters (§9).

---

*Nothing here is built yet — this is the design contract. Implementation begins
at Stage 2, one rail at a time, each shipped behind its interface with tests and
a reference consumer.*
