/**
 * CamboVerse rails (Stage 2) — the open interfaces from ARCHITECTURE.md, backed
 * by D1. Identity, Asset registry, Entitlement, and Learning credentials, under
 * a versioned /v1 surface. The heritage content we already have is seeded into
 * the Asset registry (with license/provenance/consent) as the first commons.
 *
 * Money-neutral: no currency here. Public read is open; the public-good "view"
 * right on any commons asset is always granted (we never gate access).
 */
import { SPOTS, type Spot } from "../spots";
import { ERAS } from "../history";
import { ARTIFACTS } from "../artifacts";
import { fulfillmentFor, DEMO_COUNTRIES } from "../lib/economy";

interface RailsEnv {
  DB?: D1Database;
  /**
   * Certified partner keys (charter §8 trust mark) that may perform commons
   * writes. Comma-separated; each entry is `partnerId:secret` (or just `secret`).
   * Unset ⇒ no partner can write (writes are closed, never open by default).
   */
  PARTNER_KEYS?: string;
}

/**
 * Open licences the commons accepts. A Digital Public Good must stay freely
 * reusable, so NonCommercial (NC) and NoDerivatives (ND) licences are refused.
 */
const OPEN_LICENSES = new Set(["CC0-1.0", "CC-BY-4.0", "CC-BY-SA-4.0"]);

const CONTRIBUTOR = "CamboVerse Center / NUM";
const STEWARD = "APSARA / Ministry of Culture and Fine Arts";

// The rails are an OPEN, cross-origin API: ecosystem apps call them from their
// own web origins. CORS `*` is correct here — reads are a public commons, and
// writes authenticate with a bearer token in a header (not cookies), so `*`
// carries no ambient-authority risk.
const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, POST, OPTIONS",
  "access-control-allow-headers": "content-type, authorization",
  "access-control-max-age": "86400",
};
const json = (data: unknown, status = 200) =>
  Response.json(data, { status, headers: { "cache-control": "no-store", ...CORS } });
const now = () => new Date().toISOString();
const rid = (p: string) => `${p}_${crypto.randomUUID().replace(/-/g, "").slice(0, 20)}`;

// ---- Experience / scene format (ARCHITECTURE.md §5) --------------------------
// Scene descriptors are derived from the heritage data (SPOTS), so ecosystem
// apps can drop experiences into ONE shared CamboVerse world. Asset refs use the
// same ids as the Asset registry seed, and resolve via GET /v1/assets/:id.
// Pure-derived — no database needed — so the Experience rail works everywhere.

const siteAssetId = (spotId: string) => `ast_site_${spotId}`;
const poiAssetId = (spotId: string, poiId: string) => `ast_poi_${spotId}_${poiId}`;

interface SceneDescriptor {
  id: string;
  anchor: { kind: "site"; ref: string; geo: { lat: number; lng: number } };
  name: string;
  khmer: string;
  live: boolean;
  capabilities: string[];
  assets: string[];
  pois: { id: string; assetId: string; title: string; target: number[]; camera: number[] }[];
  entryPoints: { id: string; aerial?: boolean; camera?: number[]; target?: number[] }[];
}

function capabilitiesFor(spot: Spot): string[] {
  const caps = ["orbit", "vr"]; // orbit + WebXR are always available
  if (spot.pois?.length) caps.push("walk");
  if (spot.aerial) caps.push("aerial");
  if (spot.splat) caps.push("photoreal"); // Gaussian-splat capture present
  return caps;
}

function buildScene(spot: Spot): SceneDescriptor {
  const pois = spot.pois ?? [];
  const first = pois[0];
  return {
    id: `scene_${spot.id}`,
    anchor: { kind: "site", ref: siteAssetId(spot.id), geo: { lat: spot.lat, lng: spot.lng } },
    name: spot.name,
    khmer: spot.khmer,
    live: spot.live,
    capabilities: capabilitiesFor(spot),
    assets: [siteAssetId(spot.id), ...pois.map((p) => poiAssetId(spot.id, p.id))],
    pois: pois.map((p) => ({
      id: p.id,
      assetId: poiAssetId(spot.id, p.id),
      title: p.title,
      target: p.target,
      camera: p.camera,
    })),
    entryPoints: [
      ...(spot.aerial ? [{ id: "aerial", aerial: true }] : []),
      ...(first ? [{ id: first.id, camera: first.camera, target: first.target }] : []),
    ],
  };
}

/** Look up a scene by "scene_<spotId>" or bare "<spotId>". */
function sceneById(id: string): SceneDescriptor | null {
  const spotId = id.replace(/^scene_/, "");
  const spot = SPOTS.find((s) => s.id === spotId);
  return spot ? buildScene(spot) : null;
}

// ---- Schema + seed (self-healing, once per isolate) --------------------------

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS identities (id TEXT PRIMARY KEY, handle TEXT UNIQUE, display_name TEXT, khmer_name TEXT, avatar_asset_id TEXT, wallet TEXT, created_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, identity_id TEXT NOT NULL, created_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS assets (id TEXT PRIMARY KEY, type TEXT NOT NULL, name TEXT NOT NULL, description TEXT, image TEXT, media TEXT, attributes TEXT, external_url TEXT, license TEXT NOT NULL, provenance TEXT NOT NULL, consent TEXT NOT NULL, token_binding TEXT, created_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS entitlements (id TEXT PRIMARY KEY, asset_id TEXT NOT NULL, subject_id TEXT NOT NULL, right TEXT NOT NULL, granted_by TEXT, expires_at TEXT, source TEXT NOT NULL, created_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS credentials (id TEXT PRIMARY KEY, issuer TEXT NOT NULL, subject_id TEXT NOT NULL, achievement TEXT NOT NULL, evidence TEXT, issued_at TEXT NOT NULL, proof TEXT)`,
  `CREATE TABLE IF NOT EXISTS providers (id TEXT PRIMARY KEY, type TEXT NOT NULL, region TEXT NOT NULL, name TEXT NOT NULL, pay_methods TEXT, handoff TEXT)`,
  // Living Farm (docs/LIVING_FARM.md): a farmer's real plot and their dated,
  // stage-tagged photo check-ins. Photos are consented and CC-BY; each check-in
  // is moderated (pending → approved) before it is shown publicly, and the plot
  // location is stored coarse (village-level), never the exact field.
  `CREATE TABLE IF NOT EXISTS farm_plots (id TEXT PRIMARY KEY, owner_id TEXT NOT NULL, name TEXT NOT NULL, province TEXT NOT NULL, district TEXT, variety TEXT, planting_date TEXT, lat REAL, lng REAL, license TEXT NOT NULL, consent TEXT NOT NULL, created_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS farm_checkins (id TEXT PRIMARY KEY, plot_id TEXT NOT NULL, stage_id TEXT NOT NULL, growth REAL NOT NULL, note TEXT, photo TEXT NOT NULL, taken_on TEXT, status TEXT NOT NULL, created_at TEXT NOT NULL)`,
];

/** Provider types the D2P router understands (ARCHITECTURE.md §6). */
const FULFILL_TYPES = ["delivery", "purchase", "booking", "ticket"] as const;
type FulfillType = (typeof FULFILL_TYPES)[number];

interface ProviderSeed {
  id: string;
  type: FulfillType;
  region: string;
  name: string;
  payMethods: string;
  handoff: string;
}

/**
 * A reference provider registry. CamboVerse defines the routing standard and
 * ships reference partners (clearly placeholder, DPG-safe) so ecosystem apps can
 * plug in real merchants/operators later. delivery + purchase everywhere;
 * Cambodia — the heritage home — also offers tour booking and event ticketing.
 */
function seedProviders(): ProviderSeed[] {
  const out: ProviderSeed[] = [];
  for (const region of DEMO_COUNTRIES) {
    const fx = fulfillmentFor(region);
    const types: FulfillType[] = region === "KH" ? [...FULFILL_TYPES] : ["delivery", "purchase"];
    for (const type of types) {
      out.push({
        id: `prov_${region.toLowerCase()}_${type}`,
        type,
        region,
        name: `${fx.countryName} ${type} partner (reference)`,
        payMethods: fx.payMethod,
        handoff: `https://partners.camboverse.org/${region.toLowerCase()}/${type}`,
      });
    }
  }
  return out;
}

interface AssetSeed {
  id: string;
  type: string;
  name: string;
  description: string;
  media: { role: string; uri: string; format: string }[];
  attributes: { trait_type: string; value: string }[];
  external_url: string;
}

/** The heritage content we already have, as commons Asset records. */
function seedAssets(): AssetSeed[] {
  const out: AssetSeed[] = [];
  for (const s of SPOTS) {
    out.push({
      id: `ast_site_${s.id}`,
      type: "heritage-site",
      name: s.name,
      description: s.blurb,
      media: [{ role: "model", uri: s.model, format: "glb" }],
      attributes: [
        { trait_type: "Province", value: s.province },
        { trait_type: "Khmer", value: s.khmer },
      ],
      external_url: `/site/${s.id}`,
    });
    for (const p of s.pois ?? []) {
      out.push({
        id: `ast_poi_${s.id}_${p.id}`,
        type: "poi",
        name: p.title,
        description: p.info,
        media: [],
        attributes: [{ trait_type: "Site", value: s.name }],
        external_url: `/site/${s.id}#${p.id}`,
      });
    }
  }
  for (const e of ERAS) {
    out.push({
      id: `ast_era_${e.id}`,
      type: "history-era",
      name: e.name,
      description: e.story,
      media: [],
      attributes: [{ trait_type: "Years", value: e.years }],
      external_url: `/history/${e.id}`,
    });
  }
  for (const a of ARTIFACTS) {
    // Asset type mirrors the artifact's category (e.g. traditional-tool,
    // traditional-house), so the registry stays accurate as the collection grows.
    const type = a.category.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    out.push({
      id: `ast_tool_${a.id}`,
      type: type || "artifact",
      name: `${a.name} (${a.khmer})`,
      description: a.story,
      media: [{ role: "model", uri: a.model, format: "glb" }],
      attributes: [
        { trait_type: "Khmer", value: a.khmer },
        { trait_type: "Category", value: a.category },
      ],
      external_url: `/tools/${a.id}`,
    });
  }
  return out;
}

let ready = false;
async function ensureRails(db: D1Database): Promise<void> {
  if (ready) return;
  for (const stmt of SCHEMA) await db.prepare(stmt).run();
  // Seed the commons (idempotent).
  const ts = now();
  const provenance = JSON.stringify({ contributor: CONTRIBUTOR, method: "authored", capturedAt: ts });
  const consent = JSON.stringify({ steward: STEWARD, consentRef: "pending" });
  const stmt = db.prepare(
    `INSERT OR IGNORE INTO assets (id,type,name,description,image,media,attributes,external_url,license,provenance,consent,token_binding,created_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
  );
  const batch = seedAssets().map((a) =>
    stmt.bind(
      a.id, a.type, a.name, a.description, null,
      JSON.stringify(a.media), JSON.stringify(a.attributes), a.external_url,
      "CC-BY-4.0", provenance, consent, null, ts,
    ),
  );
  if (batch.length) await db.batch(batch);

  // Reference provider registry (idempotent).
  const pstmt = db.prepare(
    `INSERT OR IGNORE INTO providers (id,type,region,name,pay_methods,handoff) VALUES (?,?,?,?,?,?)`,
  );
  const pbatch = seedProviders().map((p) => pstmt.bind(p.id, p.type, p.region, p.name, p.payMethods, p.handoff));
  if (pbatch.length) await db.batch(pbatch);

  ready = true;
}

// ---- Helpers -----------------------------------------------------------------

const bearer = (req: Request) => (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "") || null;

/**
 * Resolve a certified partner from the request's bearer key. Returns the
 * partner's id (for attribution) or null if the key is missing/unrecognised.
 * Writes are closed unless PARTNER_KEYS is configured — never open by default.
 */
function certifiedPartner(request: Request, env: RailsEnv): string | null {
  const key = bearer(request);
  if (!key) return null;
  for (const entry of (env.PARTNER_KEYS || "").split(",").map((s) => s.trim()).filter(Boolean)) {
    const idx = entry.indexOf(":");
    const secret = idx >= 0 ? entry.slice(idx + 1) : entry;
    const id = idx >= 0 ? entry.slice(0, idx) : "partner";
    if (secret && secret === key) return id;
  }
  return null;
}

/** Resolve the visitor's identity id from their session bearer token (or null). */
async function identityFromToken(db: D1Database, request: Request): Promise<string | null> {
  const tok = bearer(request);
  if (!tok) return null;
  const s = await db.prepare(`SELECT identity_id FROM sessions WHERE token = ?`).bind(tok).first<{ identity_id: string }>();
  return s?.identity_id ?? null;
}

/** Round a coordinate to ~village level (0.05° ≈ 5 km) — we never store the
 * exact location of someone's field or home. */
const coarse = (n: number) => Math.round(n / 0.05) * 0.05;

interface AssetRow {
  id: string; type: string; name: string; description: string; image: string | null;
  media: string; attributes: string; external_url: string; license: string;
  provenance: string; consent: string; token_binding: string | null; created_at: string;
}
const assetOut = (r: AssetRow) => ({
  id: r.id, type: r.type, name: r.name, description: r.description, image: r.image,
  media: JSON.parse(r.media || "[]"), attributes: JSON.parse(r.attributes || "[]"),
  external_url: r.external_url, license: r.license,
  provenance: JSON.parse(r.provenance), consent: JSON.parse(r.consent),
  tokenBinding: r.token_binding ? JSON.parse(r.token_binding) : null,
});

interface ProviderRow {
  id: string; type: string; region: string; name: string;
  pay_methods: string | null; handoff: string | null;
}
const providerOut = (r: ProviderRow) => ({
  id: r.id, type: r.type, region: r.region, name: r.name,
  payMethods: r.pay_methods, handoff: r.handoff,
});

/** Does a stored right satisfy a requested action (rentals must be unexpired)? */
function satisfies(right: string, action: string, expiresAt: string | null): boolean {
  const live = !expiresAt || expiresAt > now();
  if (right === "rent" && !live) return false;
  switch (action) {
    case "view": return true; // any held right implies view
    case "use": return right === "own" || right === "use" || right === "rent";
    case "own": return right === "own";
    case "rent": return right === "own" || right === "rent";
    default: return false;
  }
}

// ---- Router ------------------------------------------------------------------

export async function handleRails(request: Request, env: RailsEnv, url: URL): Promise<Response> {
  const p = url.pathname;
  const m = request.method;

  // CORS preflight for any /v1 endpoint.
  if (m === "OPTIONS") return new Response(null, { status: 204, headers: CORS });

  // Experience / scene rail (open read, pure-derived — works without a DB) -----
  if (p === "/v1/scenes" && m === "GET") {
    const scenes = SPOTS.map(buildScene).map((s) => ({
      id: s.id, anchor: s.anchor, name: s.name, khmer: s.khmer, live: s.live, capabilities: s.capabilities,
    }));
    return json({ scenes, count: scenes.length });
  }
  if (p.startsWith("/v1/scenes/") && m === "GET") {
    const scene = sceneById(decodeURIComponent(p.slice("/v1/scenes/".length)));
    return scene ? json(scene) : json({ error: "not found" }, 404);
  }

  if (!env.DB) return json({ error: "rails unavailable (no database bound)" }, 503);
  await ensureRails(env.DB);
  const db = env.DB;

  // Identity ------------------------------------------------------------------
  if (p === "/v1/id" && m === "POST") {
    const b = (await request.json().catch(() => ({}))) as Record<string, string>;
    const id = rid("cid");
    const token = crypto.randomUUID();
    try {
      await db.prepare(
        `INSERT INTO identities (id,handle,display_name,khmer_name,avatar_asset_id,wallet,created_at) VALUES (?,?,?,?,?,?,?)`,
      ).bind(id, b.handle ?? null, b.displayName ?? null, b.khmerName ?? null, null, null, now()).run();
    } catch {
      return json({ error: "handle already taken" }, 409);
    }
    await db.prepare(`INSERT INTO sessions (token,identity_id,created_at) VALUES (?,?,?)`).bind(token, id, now()).run();
    return json({ id, token, handle: b.handle ?? null, displayName: b.displayName ?? null }, 201);
  }
  if (p === "/v1/id/me" && m === "GET") {
    const tok = bearer(request);
    if (!tok) return json({ error: "unauthorized" }, 401);
    const s = await db.prepare(`SELECT identity_id FROM sessions WHERE token = ?`).bind(tok).first<{ identity_id: string }>();
    if (!s) return json({ error: "unauthorized" }, 401);
    const idn = await db.prepare(`SELECT * FROM identities WHERE id = ?`).bind(s.identity_id).first<Record<string, unknown>>();
    if (!idn) return json({ error: "not found" }, 404);
    return json({
      id: idn.id, handle: idn.handle, displayName: idn.display_name, khmerName: idn.khmer_name,
      avatarAssetId: idn.avatar_asset_id, wallet: idn.wallet, createdAt: idn.created_at,
    });
  }

  // Assets (open read) --------------------------------------------------------
  if (p === "/v1/assets" && m === "GET") {
    const type = url.searchParams.get("type");
    const q = type
      ? db.prepare(`SELECT * FROM assets WHERE type = ? ORDER BY id`).bind(type)
      : db.prepare(`SELECT * FROM assets ORDER BY id`);
    const { results } = await q.all<AssetRow>();
    return json({ assets: (results ?? []).map(assetOut), count: results?.length ?? 0 });
  }
  if (p.startsWith("/v1/assets/") && m === "GET") {
    const id = decodeURIComponent(p.slice("/v1/assets/".length));
    const r = await db.prepare(`SELECT * FROM assets WHERE id = ?`).bind(id).first<AssetRow>();
    return r ? json(assetOut(r)) : json({ error: "not found" }, 404);
  }
  // Register a commons asset (certified write). Contributions grow the archive;
  // licence/provenance/consent are mandatory, and only OPEN licences are accepted.
  if (p === "/v1/assets" && m === "POST") {
    const partner = certifiedPartner(request, env);
    if (!partner) return json({ error: "certified partner key required" }, 403);
    const b = (await request.json().catch(() => ({}))) as {
      type?: string; name?: string; description?: string; image?: string;
      media?: unknown; attributes?: unknown; externalUrl?: string;
      license?: string; provenance?: { contributor?: string; method?: string };
      consent?: { steward?: string; consentRef?: string };
    };
    if (!b.type || !b.name) return json({ error: "type and name required" }, 400);
    const license = b.license ?? "CC-BY-4.0";
    if (!OPEN_LICENSES.has(license)) {
      return json({ error: `licence must be an open licence (${[...OPEN_LICENSES].join(", ")}); NC/ND are not accepted` }, 400);
    }
    if (!b.provenance?.contributor) return json({ error: "provenance.contributor required" }, 400);
    if (!b.consent?.steward) return json({ error: "consent.steward required" }, 400);
    const id = rid("ast");
    const ts = now();
    const provenance = JSON.stringify({
      contributor: b.provenance.contributor,
      method: b.provenance.method ?? "contributed",
      capturedAt: ts,
      registeredBy: partner,
    });
    const consent = JSON.stringify({ steward: b.consent.steward, consentRef: b.consent.consentRef ?? "pending" });
    await db.prepare(
      `INSERT INTO assets (id,type,name,description,image,media,attributes,external_url,license,provenance,consent,token_binding,created_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    ).bind(
      id, b.type, b.name, b.description ?? "", b.image ?? null,
      JSON.stringify(b.media ?? []), JSON.stringify(b.attributes ?? []), b.externalUrl ?? null,
      license, provenance, consent, null, ts,
    ).run();
    const r = await db.prepare(`SELECT * FROM assets WHERE id = ?`).bind(id).first<AssetRow>();
    return json(assetOut(r as AssetRow), 201);
  }

  // Entitlements --------------------------------------------------------------
  if (p === "/v1/entitlements" && m === "GET") {
    const subject = url.searchParams.get("subject") ?? "";
    const asset = url.searchParams.get("asset") ?? "";
    const action = url.searchParams.get("action") ?? "view";
    if (!asset) return json({ error: "asset required" }, 400);
    const known = await db.prepare(`SELECT id FROM assets WHERE id = ?`).bind(asset).first();
    // Public good: view is always granted on a known commons asset.
    if (action === "view" && known) return json({ granted: true, source: "public" });
    if (!subject) return json({ granted: false });
    const { results } = await db
      .prepare(`SELECT right, expires_at FROM entitlements WHERE subject_id = ? AND asset_id = ?`)
      .bind(subject, asset)
      .all<{ right: string; expires_at: string | null }>();
    for (const row of results ?? []) {
      if (satisfies(row.right, action, row.expires_at)) return json({ granted: true, until: row.expires_at ?? null, source: "db" });
    }
    return json({ granted: false });
  }
  if (p === "/v1/entitlements" && m === "POST") {
    // Granting a right is a certified write — only a certified partner may issue
    // ownership/use/rental rights (the public-good "view" needs no grant).
    const partner = certifiedPartner(request, env);
    if (!partner) return json({ error: "certified partner key required" }, 403);
    const b = (await request.json().catch(() => ({}))) as Record<string, string>;
    if (!b.assetId || !b.subjectId || !b.right) return json({ error: "assetId, subjectId, right required" }, 400);
    if (!["own", "view", "use", "rent"].includes(b.right)) return json({ error: "right must be own | view | use | rent" }, 400);
    const id = rid("ent");
    await db.prepare(
      `INSERT INTO entitlements (id,asset_id,subject_id,right,granted_by,expires_at,source,created_at) VALUES (?,?,?,?,?,?,?,?)`,
    ).bind(id, b.assetId, b.subjectId, b.right, b.grantedBy ?? partner, b.expiresAt ?? null, "db", now()).run();
    return json({ id, assetId: b.assetId, subjectId: b.subjectId, right: b.right, expiresAt: b.expiresAt ?? null }, 201);
  }

  // Learning credentials (non-monetary, non-transferable) ---------------------
  if (p === "/v1/credentials/claim" && m === "POST") {
    const b = (await request.json().catch(() => ({}))) as Record<string, string>;
    let subject = b.subjectId;
    const tok = bearer(request);
    if (!subject && tok) {
      const s = await db.prepare(`SELECT identity_id FROM sessions WHERE token = ?`).bind(tok).first<{ identity_id: string }>();
      subject = s?.identity_id ?? "";
    }
    if (!subject || !b.achievement) return json({ error: "subjectId (or token) and achievement required" }, 400);
    const id = rid("cred");
    const issuedAt = now();
    const proof = [...new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${id}:${subject}:${b.achievement}:${issuedAt}`)))]
      .map((x) => x.toString(16).padStart(2, "0")).join("");
    await db.prepare(
      `INSERT INTO credentials (id,issuer,subject_id,achievement,evidence,issued_at,proof) VALUES (?,?,?,?,?,?,?)`,
    ).bind(id, "camboverse", subject, b.achievement, b.evidence ?? null, issuedAt, proof).run();
    return json({ id, issuer: "camboverse", subjectId: subject, achievement: b.achievement, issuedAt, proof }, 201);
  }
  if (p === "/v1/credentials" && m === "GET") {
    const subject = url.searchParams.get("subject") ?? "";
    if (!subject) return json({ error: "subject required" }, 400);
    const { results } = await db
      .prepare(`SELECT id,issuer,subject_id,achievement,evidence,issued_at,proof FROM credentials WHERE subject_id = ? ORDER BY issued_at DESC`)
      .bind(subject)
      .all<Record<string, unknown>>();
    return json({
      credentials: (results ?? []).map((c) => ({
        id: c.id, issuer: c.issuer, subjectId: c.subject_id, achievement: c.achievement,
        evidence: c.evidence, issuedAt: c.issued_at, proof: c.proof,
      })),
    });
  }

  // D2P fulfillment (ARCHITECTURE.md §6) ------------------------------------
  // The core only ROUTES a digital action to a real, in-region provider. It
  // never takes payment — settlement happens in the ecosystem. Money-neutral.
  if (p === "/v1/providers" && m === "GET") {
    const type = url.searchParams.get("type");
    const region = url.searchParams.get("region")?.toUpperCase();
    const where: string[] = [];
    const binds: string[] = [];
    if (type) { where.push("type = ?"); binds.push(type); }
    if (region) { where.push("region = ?"); binds.push(region); }
    const sql = `SELECT * FROM providers${where.length ? ` WHERE ${where.join(" AND ")}` : ""} ORDER BY region, type`;
    const { results } = await db.prepare(sql).bind(...binds).all<ProviderRow>();
    return json({ providers: (results ?? []).map(providerOut), count: results?.length ?? 0 });
  }
  if (p === "/v1/fulfill" && m === "POST") {
    const b = (await request.json().catch(() => ({}))) as {
      type?: string; buyerId?: string; country?: string; details?: unknown;
    };
    const type = (b.type ?? "delivery") as FulfillType;
    if (!FULFILL_TYPES.includes(type)) {
      return json({ error: `type must be one of ${FULFILL_TYPES.join(", ")}` }, 400);
    }
    // Region from the buyer's disclosed country (client choice, else Cloudflare).
    const cf = (request as { cf?: { country?: string } }).cf?.country;
    const fx = fulfillmentFor(b.country || cf || "");
    // Prefer an exact region+type provider; fall back to region delivery, then a
    // clearly-labelled reference so routing never dead-ends.
    let prov = await db.prepare(`SELECT * FROM providers WHERE type = ? AND region = ? LIMIT 1`)
      .bind(type, fx.country).first<ProviderRow>();
    if (!prov) {
      prov = await db.prepare(`SELECT * FROM providers WHERE region = ? ORDER BY type LIMIT 1`)
        .bind(fx.country).first<ProviderRow>();
    }
    return json({
      type,
      region: fx.country,
      regionName: fx.countryName,
      flag: fx.flag,
      buyerId: b.buyerId ?? null,
      provider: prov?.name ?? `${fx.countryName} ${type} partner (reference)`,
      providerId: prov?.id ?? null,
      payMethod: prov?.pay_methods ?? fx.payMethod,
      delivery: fx.delivery,
      handoff: prov?.handoff ?? `https://partners.camboverse.org/${fx.country.toLowerCase()}/${type}`,
      // The core does not settle. Payment happens in the ecosystem provider.
      settlement: "ecosystem",
    }, 201);
  }

  // Living Farm (docs/LIVING_FARM.md) ----------------------------------------
  // A farmer registers a plot and adds stage-tagged photo check-ins. Photos are
  // consented + CC-BY; each check-in is moderated before it is public; the plot
  // location is stored coarse. A farmer authenticates with their identity token;
  // moderation needs a certified-partner key.

  // List public plots (those with ≥1 approved check-in), optionally by province.
  if (p === "/v1/farm/plots" && m === "GET") {
    const province = url.searchParams.get("province");
    const rows = await db
      .prepare(
        `SELECT pl.id, pl.name, pl.province, pl.district, pl.variety, pl.planting_date, pl.lat, pl.lng, pl.created_at,
                COUNT(ck.id) AS approved,
                MAX(CASE WHEN ck.status='approved' THEN ck.growth END) AS latest_growth
         FROM farm_plots pl
         JOIN farm_checkins ck ON ck.plot_id = pl.id AND ck.status = 'approved'
         ${province ? "WHERE pl.province = ?" : ""}
         GROUP BY pl.id ORDER BY pl.created_at DESC`,
      )
      .bind(...(province ? [province] : []))
      .all<Record<string, unknown>>();
    return json({
      plots: (rows.results ?? []).map((r) => ({
        id: r.id, name: r.name, province: r.province, district: r.district, variety: r.variety,
        plantingDate: r.planting_date, geo: r.lat != null ? { lat: r.lat, lng: r.lng } : null,
        approvedCheckins: r.approved, latestGrowth: r.latest_growth,
      })),
      count: rows.results?.length ?? 0,
    });
  }

  // A plot + its check-ins. Public sees approved only; the owner (by token) sees
  // their own pending ones too.
  if (p.startsWith("/v1/farm/plots/") && !p.endsWith("/checkins") && m === "GET") {
    const id = decodeURIComponent(p.slice("/v1/farm/plots/".length));
    const pl = await db.prepare(`SELECT * FROM farm_plots WHERE id = ?`).bind(id).first<Record<string, unknown>>();
    if (!pl) return json({ error: "not found" }, 404);
    const me = await identityFromToken(db, request);
    const owner = me && me === pl.owner_id;
    const cks = await db
      .prepare(
        `SELECT id, stage_id, growth, note, photo, taken_on, status, created_at FROM farm_checkins
         WHERE plot_id = ? ${owner ? "" : "AND status = 'approved'"} ORDER BY taken_on, created_at`,
      )
      .bind(id)
      .all<Record<string, unknown>>();
    return json({
      id: pl.id, name: pl.name, province: pl.province, district: pl.district, variety: pl.variety,
      plantingDate: pl.planting_date, geo: pl.lat != null ? { lat: pl.lat, lng: pl.lng } : null,
      license: pl.license, consent: JSON.parse((pl.consent as string) || "{}"), owner,
      checkins: (cks.results ?? []).map((c) => ({
        id: c.id, stageId: c.stage_id, growth: c.growth, note: c.note,
        photo: c.photo, takenOn: c.taken_on, status: c.status,
      })),
    });
  }

  // Register a plot (farmer identity token required, plus explicit consent).
  if (p === "/v1/farm/plots" && m === "POST") {
    const owner = await identityFromToken(db, request);
    if (!owner) return json({ error: "identity token required" }, 401);
    const b = (await request.json().catch(() => ({}))) as {
      name?: string; province?: string; district?: string; variety?: string; plantingDate?: string;
      geo?: { lat?: number; lng?: number }; license?: string;
      consent?: { owner?: string; consentRef?: string; agreed?: boolean };
    };
    if (!b.name || !b.province) return json({ error: "name and province required" }, 400);
    if (!b.consent?.agreed) return json({ error: "consent required to share a farm publicly" }, 400);
    const license = b.license ?? "CC-BY-4.0";
    if (!OPEN_LICENSES.has(license)) {
      return json({ error: `licence must be an open licence (${[...OPEN_LICENSES].join(", ")})` }, 400);
    }
    const id = rid("plot");
    const consent = JSON.stringify({ owner: b.consent.owner ?? "farmer", consentRef: b.consent.consentRef ?? "in-app", agreed: true });
    const lat = typeof b.geo?.lat === "number" ? coarse(b.geo.lat) : null;
    const lng = typeof b.geo?.lng === "number" ? coarse(b.geo.lng) : null;
    await db.prepare(
      `INSERT INTO farm_plots (id,owner_id,name,province,district,variety,planting_date,lat,lng,license,consent,created_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
    ).bind(id, owner, b.name, b.province, b.district ?? null, b.variety ?? null, b.plantingDate ?? null, lat, lng, license, consent, now()).run();
    return json({ id, name: b.name, province: b.province, owner: true }, 201);
  }

  // Add a photo check-in to a plot (owner token + per-photo consent). Stored
  // pending until moderated.
  if (p.startsWith("/v1/farm/plots/") && p.endsWith("/checkins") && m === "POST") {
    const owner = await identityFromToken(db, request);
    if (!owner) return json({ error: "identity token required" }, 401);
    const plotId = decodeURIComponent(p.slice("/v1/farm/plots/".length, p.length - "/checkins".length));
    const pl = await db.prepare(`SELECT owner_id FROM farm_plots WHERE id = ?`).bind(plotId).first<{ owner_id: string }>();
    if (!pl) return json({ error: "plot not found" }, 404);
    if (pl.owner_id !== owner) return json({ error: "not your plot" }, 403);
    const b = (await request.json().catch(() => ({}))) as {
      stageId?: string; growth?: number; note?: string; photo?: string; takenOn?: string; consent?: boolean;
    };
    if (!b.stageId || typeof b.growth !== "number" || !b.photo) {
      return json({ error: "stageId, growth and photo required" }, 400);
    }
    if (!b.consent) return json({ error: "consent required to publish this photo" }, 400);
    if (!/^data:image\//.test(b.photo) || b.photo.length > 600_000) {
      return json({ error: "photo must be a small (downscaled) data URL image" }, 400);
    }
    const id = rid("chk");
    await db.prepare(
      `INSERT INTO farm_checkins (id,plot_id,stage_id,growth,note,photo,taken_on,status,created_at)
       VALUES (?,?,?,?,?,?,?,?,?)`,
    ).bind(id, plotId, b.stageId, b.growth, b.note ?? null, b.photo, b.takenOn ?? now().slice(0, 10), "pending", now()).run();
    return json({ id, plotId, status: "pending", note: "awaiting review before it appears publicly" }, 201);
  }

  // Moderate a check-in (certified partner only) — approve or reject before it
  // is shown publicly. This is the guardrail for real photos of real places.
  if (p.startsWith("/v1/farm/checkins/") && p.endsWith("/moderate") && m === "POST") {
    const partner = certifiedPartner(request, env);
    if (!partner) return json({ error: "certified partner key required" }, 403);
    const id = decodeURIComponent(p.slice("/v1/farm/checkins/".length, p.length - "/moderate".length));
    const b = (await request.json().catch(() => ({}))) as { status?: string };
    if (b.status !== "approved" && b.status !== "rejected") {
      return json({ error: "status must be approved | rejected" }, 400);
    }
    const r = await db.prepare(`UPDATE farm_checkins SET status = ? WHERE id = ?`).bind(b.status, id).run();
    if (!r.meta.changes) return json({ error: "not found" }, 404);
    return json({ id, status: b.status, moderatedBy: partner });
  }

  return json({ error: "not found" }, 404);
}
