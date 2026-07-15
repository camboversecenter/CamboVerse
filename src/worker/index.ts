/**
 * CamboVerse edge Worker.
 *
 * Static assets are served by the edge; the Worker handles a small API surface:
 *   - GET  /api/health  — liveness/metadata
 *   - POST /api/guide   — the AI tour guide ("Kiri" the monkey)
 *
 * The guide is grounded in our own per-POI facts (see src/spots.ts) so it stays
 * accurate, and it answers in the visitor's language. It is key-gated: set the
 * ANTHROPIC_API_KEY secret to enable live answers. Without a key (or on error)
 * it falls back to the static facts, so the experience never breaks.
 */
import { SPOTS, type Spot, type Poi } from "../spots";
import { MARKETS } from "../shops";
import { ERAS } from "../history";
import { fulfillmentFor } from "../lib/economy";
import { handleRails } from "./rails";

interface Env {
  ASSETS: Fetcher;
  ANTHROPIC_API_KEY?: string;
  /** Optional D1 database for order persistence (see DIGITAL_ECONOMY.md). */
  DB?: D1Database;
}

const LANG_NAMES: Record<string, string> = {
  en: "English",
  km: "Khmer",
  fr: "French",
  zh: "Chinese (Simplified)",
};

interface GuideBody {
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
      return Response.json({ status: "ok", service: "camboverse-viewer", version: "0.1.0" });
    }

    if (url.pathname === "/api/guide" && request.method === "POST") {
      return handleGuide(request, env);
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

function groundingFor(spot: Spot, poi: Poi | undefined): string {
  const lines = [
    `Site: ${spot.name} (${spot.khmer}), ${spot.province}, Cambodia.`,
    `Overview: ${spot.blurb}`,
  ];
  if (poi) {
    lines.push(`Current spot: ${poi.title}${poi.khmer ? ` (${poi.khmer})` : ""}.`);
    lines.push(`About it: ${poi.info}`);
  } else if (spot.pois?.length) {
    lines.push(`Places here: ${spot.pois.map((p) => p.title).join(", ")}.`);
  }
  return lines.join("\n");
}

async function handleGuide(request: Request, env: Env): Promise<Response> {
  let body: GuideBody;
  try {
    body = (await request.json()) as GuideBody;
  } catch {
    return Response.json({ text: "", fallback: true }, { status: 400 });
  }

  const spot = SPOTS.find((s) => s.id === body.spotId);
  if (!spot) return Response.json({ text: "", fallback: true }, { status: 404 });
  const poi = spot.pois?.find((p) => p.id === body.poiId);
  const era = body.eraId ? ERAS.find((e) => e.id === body.eraId) : undefined;
  const langName = LANG_NAMES[body.lang ?? "en"] ?? "English";

  // Grounding + fallback differ for a POI/site vs. a historical era.
  const siteNote = era?.sites?.[spot.id];
  const grounding = era
    ? `Era: ${era.name} (${era.khmer}), ${era.years} — ${era.age}.\n` +
      `About the era: ${era.story}\n` +
      (siteNote ? `${spot.name} in this era: ${siteNote}\n` : "") +
      `Highlights: ${era.highlights.join("; ")}.`
    : groundingFor(spot, poi);
  const fallbackText = era ? [era.story, siteNote].filter(Boolean).join(" ") : poi?.info ?? spot.blurb;

  // No key configured → static facts (keeps the demo working everywhere).
  if (!env.ANTHROPIC_API_KEY) {
    return Response.json({ text: fallbackText, fallback: true });
  }

  const persona = era
    ? `You are Kiri, a warm, playful young monkey who takes visitors "back in ` +
      `time" through Cambodia's history. Narrate this era vividly and briefly ` +
      `(2–4 sentences), as if the visitor is standing at ${spot.name} watching ` +
      `it unfold. Be respectful — especially about difficult periods. `
    : `You are Kiri, a warm, playful young monkey who guides visitors around ` +
      `Cambodia's Khmer heritage sites. Speak in short, vivid, friendly turns ` +
      `(2–4 sentences). `;
  const system =
    persona +
    `ALWAYS reply in ${langName}. Only state facts supported by the CONTEXT ` +
    `below; if you are unsure, say so cheerfully rather than inventing. Stay in ` +
    `character as Kiri.\n\nCONTEXT:\n${grounding}`;

  const userMessage =
    body.question?.trim() ||
    (era
      ? `Take me back to ${era.name} at ${spot.name}.`
      : poi
        ? `Tell me about ${poi.title}.`
        : `Welcome me to ${spot.name}.`);

  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 320,
        system,
        messages: [{ role: "user", content: userMessage }],
      }),
    });
    if (!r.ok) return Response.json({ text: fallbackText, fallback: true });
    const data = (await r.json()) as { content?: { type: string; text?: string }[] };
    const text = (data.content ?? [])
      .filter((b) => b.type === "text")
      .map((b) => b.text ?? "")
      .join("")
      .trim();
    return Response.json({ text: text || fallbackText, fallback: !text });
  } catch {
    return Response.json({ text: fallbackText, fallback: true });
  }
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
 * to D1 when the binding is present (otherwise it still confirms — the PoC never
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
      // D1 unavailable — confirm anyway (persistence is optional, never blocks).
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
