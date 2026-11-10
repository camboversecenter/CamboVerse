/**
 * CamboVerse edge Worker.
 *
 * Static assets are served by the edge; the Worker handles a small API surface:
 *   - GET  /api/health  liveness/metadata
 *   - POST /api/guide   the AI tour guide ("Kiri" the monkey)
 *
 * The guide is grounded in our own per-POI facts (see src/spots.ts) so it stays
 * accurate, and it answers in the visitor's language. It is key-gated: set the
 * ANTHROPIC_API_KEY secret to enable live answers. Without a key (or on error)
 * it falls back to the static facts, so the experience never breaks.
 */

import { MARKETS } from "../shops";

import { fulfillmentFor } from "../lib/economy";
import { handleRails } from "./rails";
import { handleLocationGuide } from './locationGuide';
import { handleGuideVoice } from './guideVoice';
import { handleHeritageGuide } from './heritageGuide';

interface Env {
  ASSETS: Fetcher;
  ANTHROPIC_API_KEY?: string;
  GEMINI_API_KEY?: string;
  PENH_VOICE_ID?: string;
  /** Private R2 library of generated public guide content. */
  GUIDE_STORAGE?: R2Bucket;
  /** Optional D1 database for order persistence (see DIGITAL_ECONOMY.md). */
  DB?: D1Database;
}

interface GuideBody {
  experienceId?: unknown;
  locationId?: unknown;
  objectId?: unknown;
  spotId?: string;
  poiId?: string | null;
  eraId?: string;
  question?: string;
  lang?: string;
}

export default {
  async fetch(request, env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/api/health") {
      return Response.json({ status: "ok", service: "camboverse-viewer", version: "0.1.0", guideStorage: env.GUIDE_STORAGE ? 'r2' : 'cache-only' });
    }

    if (url.pathname === "/api/guide" && request.method === "POST") {
      return handleGuide(request, env);
    }
    if (url.pathname === '/api/guide-voice' && request.method === 'POST') {
      return handleGuideVoice(request,env);
    }

    // Digital economy: visitor's country (for geo-aware fulfillment) + orders.
    if (url.pathname === "/api/geo") {
      const country = (request as { cf?: { country?: string } }).cf?.country ?? "";
      return Response.json({ country });
    }
    if (url.pathname === "/api/order" && request.method === "POST") {
      return handleOrder(request, env);
    }

    // Platform rails (Stage 2): identity, assets, entitlements, credentials.
    if (url.pathname.startsWith("/v1/")) {
      return handleRails(request, env, url);
    }

    // Anything else: hand back to the static asset server (SPA fallback).
    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;

async function handleGuide(request: Request, env: Env): Promise<Response> {
  let body: GuideBody;
  try {
    body = (await request.json()) as GuideBody;
  } catch {
    return Response.json({ text: "", fallback: true }, { status: 400 });
  }

  if (!body || typeof body !== 'object') return Response.json({ error: 'Invalid guide request' }, { status: 400 });
  if (body.experienceId !== undefined) return handleLocationGuide(body, env, request.url);

  return handleHeritageGuide(body, env, request.url);
}

interface OrderBody {
  marketId?: string;
  country?: string;
  items?: { productId: string; qty: number }[];
}

// Create the orders table on first use (once per isolate), so persistence works
// on deploy without a manual migration. Mirrors migrations/0001_orders.sql.
let schemaReady = false;
async function ensureSchema(db: D1Database): Promise<void> {
  if (schemaReady) return;
  await db
    .prepare(
      "CREATE TABLE IF NOT EXISTS orders (id TEXT PRIMARY KEY, market_id TEXT NOT NULL, country TEXT NOT NULL, items TEXT NOT NULL, total_cents INTEGER NOT NULL, created_at TEXT NOT NULL)",
    )
    .run();
  schemaReady = true;
}

/**
 * Place a (demo) order. Prices are recomputed server-side from the catalogue,
 * fulfillment is resolved from the visitor's country, and the order is persisted
 * to D1 when the binding is present (otherwise it still confirms the PoC never
 * breaks). No real payment is taken.
 */
async function handleOrder(request: Request, env: Env): Promise<Response> {
  let body: OrderBody;
  try {
    body = (await request.json()) as OrderBody;
  } catch {
    return Response.json({ error: "bad request" }, { status: 400 });
  }

  const market = MARKETS.find((m) => m.id === body.marketId);
  if (!market) return Response.json({ error: "unknown market" }, { status: 404 });

  const prices = new Map<string, number>();
  for (const k of market.kiosks) for (const p of k.products) prices.set(p.id, p.price);
  let total = 0;
  for (const it of body.items ?? []) total += (prices.get(it.productId) ?? 0) * Math.max(0, it.qty | 0);

  // Country: prefer the client's explicit choice (demo switcher), else Cloudflare.
  const country = (body.country || (request as { cf?: { country?: string } }).cf?.country || "").toUpperCase();
  const fx = fulfillmentFor(country);
  const orderId = crypto.randomUUID().slice(0, 8).toUpperCase();

  if (env.DB) {
    try {
      await ensureSchema(env.DB);
      await env.DB.prepare(
        "INSERT INTO orders (id, market_id, country, items, total_cents, created_at) VALUES (?, ?, ?, ?, ?, ?)",
      )
        .bind(orderId, market.id, fx.country, JSON.stringify(body.items ?? []), total, new Date().toISOString())
        .run();
    } catch {
      // D1 unavailable confirm anyway (persistence is optional, never blocks).
    }
  }

  return Response.json({
    orderId,
    country: fx.country,
    countryName: fx.countryName,
    flag: fx.flag,
    payMethod: fx.payMethod,
    delivery: fx.delivery,
    total,
  });
}
