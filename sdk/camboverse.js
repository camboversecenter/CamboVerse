/**
 * CamboVerse Rails SDK — a tiny, dependency-free client for the open `/v1` rails.
 *
 * One ES module. No build step, no dependencies, no external assets. Works in the
 * browser and in modern Node (uses the global `fetch`). It wraps the same public
 * HTTP contract documented in `docs/API.md`, so ecosystem apps don't hand-roll
 * requests or re-implement lazy identity.
 *
 *   import { createClient } from "./camboverse.js";
 *   const cv = createClient({ baseUrl: "https://your-camboverse-host" });
 *   const scene = await cv.getScene("scene_angkor-wat");
 *   await cv.claimCredential("history:angkor-wat:angkor", "quiz");   // mints an ID lazily
 *   const route = await cv.fulfill({ type: "purchase", country: "KH" });
 *
 * Design notes:
 *  - Identity is created LAZILY and anonymously — only the first time you claim a
 *    credential (or call getIdentity(true)). Passive reads never make an account.
 *  - The token persists via a pluggable `storage` (localStorage in the browser by
 *    default; an in-memory store elsewhere), so the same identity survives reloads.
 *  - Reads are open (a public commons); identity-bound writes send the token as a
 *    bearer header. No cookies, no ambient authority.
 */

/**
 * @typedef {Object} Identity
 * @property {string} id
 * @property {string} token
 */

/**
 * @typedef {Object} ClientOptions
 * @property {string} [baseUrl]  Origin of a CamboVerse host. "" = same origin.
 * @property {{getItem(k:string):string|null, setItem(k:string,v:string):void, removeItem(k:string):void}} [storage]
 *   Token store. Defaults to localStorage in the browser, else in-memory.
 * @property {typeof fetch} [fetch]  Custom fetch (defaults to the global).
 * @property {string} [partnerKey]  A certified partner key, required only for
 *   commons writes (registerAsset, grant). Read-only apps never need one.
 */

const KEY = "camboverse.identity.v1";

function memoryStorage() {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => void m.set(k, v),
    removeItem: (k) => void m.delete(k),
  };
}

function defaultStorage() {
  try {
    if (typeof localStorage !== "undefined") return localStorage;
  } catch {
    /* access can throw in sandboxed contexts */
  }
  return memoryStorage();
}

/** An error carrying the HTTP status and parsed body of a failed rails call. */
export class RailsError extends Error {
  constructor(status, path, body) {
    super(`${path} → ${status} ${typeof body === "string" ? body : JSON.stringify(body)}`);
    this.name = "RailsError";
    this.status = status;
    this.path = path;
    this.body = body;
  }
}

/**
 * Create a rails client.
 * @param {ClientOptions} [options]
 */
export function createClient(options = {}) {
  const baseUrl = (options.baseUrl ?? "").replace(/\/$/, "");
  const storage = options.storage ?? defaultStorage();
  const doFetch = options.fetch ?? (typeof fetch !== "undefined" ? fetch : null);
  const partnerKey = options.partnerKey ?? null;
  if (!doFetch) throw new Error("No fetch available — pass options.fetch");

  let cached = /** @type {Identity|null} */ (null);

  async function call(path, { method = "GET", token, body } = {}) {
    const headers = {};
    if (body !== undefined) headers["content-type"] = "application/json";
    if (token) headers["authorization"] = `Bearer ${token}`;
    const res = await doFetch(baseUrl + path, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new RailsError(res.status, path, data);
    return data;
  }

  function readStored() {
    if (cached) return cached;
    try {
      const raw = storage.getItem(KEY);
      if (raw) return (cached = JSON.parse(raw));
    } catch {
      /* ignore */
    }
    return null;
  }

  // ---- Identity -------------------------------------------------------------

  /**
   * Get the visitor's identity. `create=false` (default) never mints an account
   * — it only returns an existing one. `create=true` creates one on demand.
   * @param {boolean} [create]
   * @returns {Promise<Identity|null>}
   */
  async function getIdentity(create = false) {
    const existing = readStored();
    if (existing || !create) return existing;
    const d = await call("/v1/id", { method: "POST", body: {} });
    cached = { id: d.id, token: d.token };
    try {
      storage.setItem(KEY, JSON.stringify(cached));
    } catch {
      /* ignore */
    }
    return cached;
  }

  /** Forget the stored identity (e.g. "sign out" / new player). */
  function clearIdentity() {
    cached = null;
    try {
      storage.removeItem(KEY);
    } catch {
      /* ignore */
    }
  }

  /** The current identity's profile (requires an existing identity). */
  async function me() {
    const id = await getIdentity(false);
    if (!id) return null;
    return call("/v1/id/me", { token: id.token });
  }

  // ---- Assets ---------------------------------------------------------------

  /** List commons assets, optionally by type (heritage-site | poi | history-era). */
  function listAssets(type) {
    return call(`/v1/assets${type ? `?type=${encodeURIComponent(type)}` : ""}`);
  }
  /** One asset by id. */
  function getAsset(id) {
    return call(`/v1/assets/${encodeURIComponent(id)}`);
  }
  /**
   * Register a commons asset (certified write — needs `partnerKey`). Licence must
   * be an open licence (CC0 / CC-BY / CC-BY-SA); `provenance.contributor` and
   * `consent.steward` are required.
   * @param {{type:string, name:string, description?:string, media?:any[], attributes?:any[], externalUrl?:string, license?:string, provenance:{contributor:string, method?:string}, consent:{steward:string, consentRef?:string}}} asset
   */
  function registerAsset(asset) {
    return call("/v1/assets", { method: "POST", token: partnerKey, body: asset });
  }

  // ---- Entitlements ---------------------------------------------------------

  /** can(subject, action, asset) → { granted, source?, until? }. */
  function can(subject, action, asset) {
    const q = new URLSearchParams({ asset, action });
    if (subject) q.set("subject", subject);
    return call(`/v1/entitlements?${q.toString()}`);
  }
  /** Grant a right (own | view | use | rent) — certified write, needs `partnerKey`. `expiresAt` makes it a rental. */
  function grant({ assetId, subjectId, right, grantedBy, expiresAt }) {
    return call("/v1/entitlements", { method: "POST", token: partnerKey, body: { assetId, subjectId, right, grantedBy, expiresAt } });
  }

  // ---- Learning credentials -------------------------------------------------

  /**
   * Claim a learning credential. Mints an anonymous identity lazily if needed.
   * @param {string} achievement
   * @param {string} [evidence]
   */
  async function claimCredential(achievement, evidence) {
    const id = await getIdentity(true);
    return call("/v1/credentials/claim", { method: "POST", token: id.token, body: { achievement, evidence } });
  }
  /** A subject's credentials (defaults to the current identity). */
  async function credentials(subject) {
    const s = subject ?? (await getIdentity(false))?.id;
    if (!s) return { credentials: [] };
    return call(`/v1/credentials?subject=${encodeURIComponent(s)}`);
  }
  /** A Set of achievement ids the subject holds (for "earned" UI state). */
  async function earned(subject) {
    const d = await credentials(subject);
    return new Set((d.credentials ?? []).map((c) => c.achievement));
  }

  // ---- Experience / scenes --------------------------------------------------

  /** List scene descriptors (one per heritage site). */
  function listScenes() {
    return call("/v1/scenes");
  }
  /** One scene by `scene_<site>` or bare `<site>`. */
  function getScene(id) {
    return call(`/v1/scenes/${encodeURIComponent(id)}`);
  }

  // ---- D2P fulfillment ------------------------------------------------------

  /** The provider registry, optionally filtered by type/region. */
  function providers({ type, region } = {}) {
    const q = new URLSearchParams();
    if (type) q.set("type", type);
    if (region) q.set("region", region);
    const qs = q.toString();
    return call(`/v1/providers${qs ? `?${qs}` : ""}`);
  }
  /**
   * Route a digital action to a real in-region provider. The core only routes —
   * settlement happens in the ecosystem (the response carries settlement:"ecosystem").
   * @param {{type?:string, country?:string, buyerId?:string, details?:any}} req
   */
  function fulfill(req) {
    return call("/v1/fulfill", { method: "POST", body: req });
  }

  return {
    getIdentity, clearIdentity, me,
    listAssets, getAsset, registerAsset,
    can, grant,
    claimCredential, credentials, earned,
    listScenes, getScene,
    providers, fulfill,
  };
}

export default { createClient, RailsError };
