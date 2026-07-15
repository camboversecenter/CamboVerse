# Reference partner app — Angkor Treasure Hunt

A **worked example** of an independent app built entirely on the CamboVerse
[`/v1` rails](../../docs/API.md). It is **not** part of the CamboVerse product —
it's a starting point for ecosystem builders (startups, schools, museums) that
shows how the open rails compose end-to-end.

One self-contained HTML file, no build step, no dependencies, no external assets.

## What it demonstrates

A tiny "treasure hunt" over Angkor Wat that touches every rail:

| Step | Rail | Call |
|---|---|---|
| Read the heritage scene + its points of interest | **Experience** | `GET /v1/scenes/scene_angkor-wat` |
| Show each POI's authored description | **Asset** | `GET /v1/assets/:id` |
| Get a free, anonymous player (created lazily) | **Identity** | `POST /v1/id` |
| "Visit & learn" a POI → earn a learning credential | **Credential** | `POST /v1/credentials/claim` |
| Show which places are already learned | **Credential** | `GET /v1/credentials?subject=` |
| Learn them all → route a **real local reward** | **D2P** | `POST /v1/fulfill` |

Key ideas it illustrates for partners:

- **Identity is lazy and anonymous** — no account until the player first earns
  something; passive browsing creates nothing.
- **Credentials gate the reward** — the app *references* learning credentials to
  unlock a reward, but never buys or sells them (they're non-monetary).
- **The core never takes payment** — the reward is *routed* to a real in-region
  provider (`settlement: "ecosystem"`); the player pays the local provider, not
  CamboVerse. This is the Digital-to-Physical model in miniature.

## Run it

The rails send permissive CORS headers on `/v1`, so this page works from any
origin — including `file://`.

1. Point it at a host running the rails:
   - **Local:** `npm run dev` in the repo root, then use `http://127.0.0.1:5173`.
   - **Deployed:** your CamboVerse Worker URL.
2. Open `examples/treasure-hunt/index.html` (double-click, or serve it) and put
   the host in the field, then press **Load hunt**.
3. Visit each POI to earn its credential; when all are learned, claim the reward
   and pick a region to see geo-aware D2P routing.

> The credential and reward flows need a D1 binding on the host (identity and
> credentials persist there). The scene/asset reads work with or without one.

## Adapt it

This is deliberately ~250 lines of plain JS. To build your own experience:
swap `SCENE_ID`, change what "visiting" means (arriving in 3D, answering a
quiz, scanning an AR marker), pick a different reward `type`
(`delivery`/`booking`/`ticket`), and read [`docs/API.md`](../../docs/API.md) for
the full contract.
