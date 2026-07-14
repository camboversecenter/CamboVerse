# CamboVerse — Digital Economy

*How the immersive heritage experience becomes a living, global digital economy —
and how that economy funds the preservation of Cambodian heritage.*

> **Status:** vision + architecture + proof-of-concept plan. Nothing in the PoC
> ships a real third-party brand's assets (see [§7 Brand & IP](#7-brand--ip)).

---

## 1. The idea in one line

A visitor teleports to a heritage point of interest, taps a **🛍️ Shop** icon,
and steps into a **virtual shop / market** tied to that place — and whatever they
buy is **fulfilled from a merchant in the visitor's own country**, so virtual
tourism creates real, deliverable commerce.

## 2. Why this fits CamboVerse

- **It funds the public good.** The heritage experience stays a free, open
  **Digital Public Good** (CC-licensed, no lock-in). Commerce is a *separate,
  optional layer on top* whose revenue sustains the DPG and heritage
  conservation. (Same shape as Wikipedia-the-DPG vs. the Foundation's revenue.)
- **It's culturally authentic.** Real Khmer temples have markets and food stalls
  at their gates. A virtual **market plaza** beside a site mirrors reality — it
  belongs there, rather than intruding on it.
- **It grows Cambodia's digital economy.** Local SMEs (cafés, artisans,
  producers) get a storefront in front of a *global* virtual-tourism audience;
  and the same rails let global brands run official Cambodian virtual outlets.

## 3. Guiding principles

1. **Heritage first, commerce second.** The sanctum is never a sales floor.
   Shops live in designated **market zones** near a site, never on sacred ground.
2. **The DPG stays open.** The commerce layer must never make the heritage
   content proprietary or paywalled.
3. **IP-clean.** No unlicensed brand logos, names, or trade dress in the product.
   Real brands arrive only via an official **Partner Program** (§7).
4. **Local-first & inclusive.** Prioritise onboarding Cambodian merchants; make
   global fulfillment lift local economies, not bypass them.
5. **Consent & privacy.** Geolocation is coarse (country-level), disclosed, and
   used only to route fulfillment. No selling of personal data.
6. **Transparent giving-back.** A published share of revenue funds conservation
   (e.g. an APSARA / Ministry of Culture and Fine Arts heritage fund).

## 4. The experience

1. At any POI panel, a **🛍️ Shop** icon appears when that POI has a market.
2. Tapping it **teleports** the visitor (same warp/teleport we already use) to a
   **virtual storefront scene** for that POI — a small market plaza with a few
   kiosks, or a single branded interior.
3. The visitor browses products (3D models and/or cards), adds to a cart, and
   checks out.
4. The order is **routed to a merchant in the visitor's region**, and delivered
   by that region's logistics. A clear line shows **"Fulfilled from: 🇺🇸 United
   States"** (or wherever) so there's no confusion.

## 5. Geo-aware fulfillment (the core mechanic)

```
visitor → detect country (Cloudflare request.cf.country, disclosed)
        → look up (brand/category × region) → local merchant + fulfillment
        → checkout with the region's payment method
        → deliver via the region's logistics
```

| Visitor region | Merchant | Payment | Delivery |
|---|---|---|---|
| 🇰🇭 Cambodia | Local outlet / SME | **Bakong / KHQR**, cards | Grab / Nham24 / in-house |
| 🇺🇸 United States | US outlet / DC | Stripe (cards, wallets) | DoorDash / Uber Eats / brand app |
| 🇪🇺 / other | Regional partner | Stripe + local rails | Regional courier |
| Anywhere (digital goods) | CamboVerse | Stripe / KHQR | Instant (e-voucher, collectible) |

**Digital goods** (souvenirs, e-vouchers, heritage collectibles) ship globally
with no logistics — a good first revenue line while physical fulfillment
partnerships are built.

## 6. Architecture (fits the planned stack)

- **Cloudflare Workers + D1 + R2.**
  - **D1 tables (sketch):**
    - `shops(id, poi_id, name, kind, theme)`
    - `products(id, shop_id, title, price_minor, currency, model_url, img)`
    - `merchants(id, brand_id, country, fulfillment, pay_methods)`
    - `orders(id, product_id, country, merchant_id, status, total_minor)`
  - **Worker endpoints:**
    - `GET /api/shops?poi=<id>&country=<cc>` → shops + products for a POI,
      already resolved to the visitor's region.
    - `POST /api/order` → validates, picks the regional merchant, creates the
      order, returns the region-appropriate checkout (Stripe / KHQR).
    - Country comes from `request.cf.country` (no extra lookup, no PII).
- **3D:** a virtual shop is just another **teleport target** — reuse the existing
  teleport + `CameraRig`. A market scene = a few kiosk models + product cards via
  `<Html>`; heavy product models stream on demand.
- **Payments:** pluggable adapters — **Stripe** (global) and **Bakong/KHQR**
  (Cambodia, already in `STRATEGY.md`), more per region.
- **Fulfillment:** start with **affiliate / deep-link** hand-off to the regional
  merchant's own app (fast MVP), then direct order APIs as partnerships form.

## 7. Brand & IP

**This matters for a national DPG — read before building anything public.**

- **Do NOT ship real brands' logos, names, or trade dress without written
  permission.** Doing so is trademark infringement and reputational risk.
- **The PoC uses original placeholder brands** that *represent* a category, so we
  can prove the mechanic without touching anyone's marks:

  | Category (real-world example) | CamboVerse placeholder | Notes |
  |---|---|---|
  | Global coffee chain *(e.g. Starbucks)* | **"Preah Brew"** ☕ | original name/logo, chain-style kiosk |
  | Khmer coffee *(e.g. Brown Coffee)* | **"Sngkae Coffee"** ☕ | local-café placeholder |
  | Fried chicken *(e.g. KFC)* | **"Krong Chicken"** 🍗 | original bucket-counter |
  | Burgers *(e.g. McDonald's)* | **"Mekong Burger"** 🍔 | original counter |

  These are clearly-fictional stand-ins (own names, own simple logos) — never a
  copy of a real brand's identity.
- **Real brands come via an official Partner Program.** The pitch writes itself:
  *"An official storefront for your brand inside Cambodia's national heritage
  metaverse — global virtual-tourism reach, with real local delivery."* Partners
  provide their own approved assets, fulfillment, and a revenue share. Only
  **licensed** brands and **consenting local merchants** appear in the public app.

## 8. Revenue & sustainability

- **Commission** on fulfilled orders; **sponsored / featured** storefronts;
  **official brand partnerships**; **digital goods** margin.
- Revenue keeps the heritage DPG **free** and funds **conservation** via a
  transparent, published split to a heritage fund (APSARA / MoCFA).

## 9. Proof of Concept (Phase 1 — buildable now)

Scope kept small and IP-safe to prove the loop end-to-end:

1. **One POI wired with a 🛍️ Shop icon** (e.g. Angkor Wat's causeway market, or
   the Wat Phnom base) → teleports to a **market plaza** with 2–4 placeholder
   kiosks (§7).
2. **Mock catalog in D1** (a handful of products with prices).
3. **Geo-routing, mocked:** read `request.cf.country`, show
   **"Fulfilled from: <country>"** and the region-appropriate pay method
   (Stripe vs. KHQR) — **no real charge yet**.
4. **Mock checkout** that writes an `orders` row and shows a confirmation.

This demonstrates: teleport-to-shop, per-POI catalog, and country-aware
fulfillment — with zero brand-IP and zero payment risk.

## 10. Roadmap

- **P1 — PoC (now):** 1 POI, placeholder kiosks, D1 catalog, mock geo-routing +
  mock checkout.
- **P2 — Real payments & merchants:** Stripe + Bakong/KHQR live; a simple
  merchant-onboarding portal; real order pipeline; digital-goods line.
- **P3 — Regional fulfillment & partners:** delivery integrations per region;
  the brand **Partner Program**; analytics; revenue-share to conservation.
- **P4 — Open marketplace:** Cambodian artisans/SMEs self-onboard; heritage
  digital collectibles; multi-site markets.

## 11. Risks & mitigations

| Risk | Mitigation |
|---|---|
| Trademark / brand IP | Placeholders for PoC; real brands only via signed partnership |
| Payments & cross-border regulation (KYC/tax) | Start affiliate/deep-link + licensed PSPs (Stripe, Bakong); add compliance before direct settlement |
| Commercialising sacred space | Zone shops to market areas; never on the sanctum; respectful design review |
| Privacy (geolocation) | Country-level only, disclosed, no PII resale |
| Diluting the DPG | Commerce is a separable layer; heritage content stays open & free |

---

*Companion docs: `STRATEGY.md` (overall plan, Bakong/KHQR), `docs/AI_GUIDE.md`
(the guide that can also recommend nearby shops later).*
