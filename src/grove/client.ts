/**
 * GroveClient — reads a Grove node's public, read-only feeds (BRIDGE.md §2) and
 * **verifies every record itself** before handing it back (BRIDGE.md §3). The node
 * is never trusted: a forged or tampered record is dropped here, not rendered.
 *
 * The base URL is configurable — point at iany.app's reference node or any other
 * Grove node you trust (federation). No API key, no auth.
 */
import {
  verifyObservation, verifyAttestation, trustScore,
  type GardenObservation, type Attestation,
} from "./grove";

/** iany.app's reference node. Any Grove node works — federation is the point. */
export const DEFAULT_NODE = "https://iany.app/api/grove";

/** Page size to request from a node's feed. Kept modest: nodes cap this, and a
 *  smaller page is politer over 4G. */
export const DEFAULT_LIMIT = 50;

export interface GroveStats {
  observations: number;
  devices: number;
  plots: number;
  plants: number;
  co2Kg: number;
}

/** A record after local verification — only these ever reach the renderer. */
export interface VerifiedRecord {
  observation: GardenObservation;
  attestations: Attestation[];
  /** 0–100 confidence, recomputed locally from the (verified) attestations. */
  trust: number;
}

export interface FeedPage {
  records: VerifiedRecord[];
  cursor: string | null;
  /** How many raw items the node returned that we could not verify. */
  dropped: number;
  /**
   * Per-plot privacy-coarsened coordinates taken from the feed — what a public
   * map should place pins with, rather than the precise gps inside a signed
   * record (BRIDGE.md §5).
   */
  coarseGps: Map<string, { lat: number; lng: number }>;
}

/** Collect the feed's coarsened coordinates, one per plot. */
function coarseGpsOf(items: GardenObservation[]): Map<string, { lat: number; lng: number }> {
  const out = new Map<string, { lat: number; lng: number }>();
  for (const o of items) {
    if (o?.gps && o.plot && !out.has(o.plot)) out.set(o.plot, { lat: o.gps.lat, lng: o.gps.lng });
  }
  return out;
}

type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

export class GroveClient {
  readonly baseUrl: string;
  private fetch: FetchLike;

  constructor(baseUrl: string = DEFAULT_NODE, fetchImpl?: FetchLike) {
    this.baseUrl = baseUrl.replace(/\/+$/, "");
    this.fetch = fetchImpl ?? ((u, i) => fetch(u, i));
  }

  private async json<T>(path: string): Promise<T> {
    const res = await this.fetch(this.baseUrl + path, { headers: { accept: "application/json" } });
    if (!res.ok) throw new Error(`Grove ${path} → HTTP ${res.status}`);
    return (await res.json()) as T;
  }

  /** Headline totals for a node. Not security-critical — a convenience readout. */
  stats(): Promise<GroveStats> {
    return this.json<GroveStats>("/stats");
  }

  /**
   * A page of the public feed, newest-first, verified locally.
   *
   * The feed is a **discovery** surface, not a verifiable one: the node
   * deliberately coarsens each item's GPS to ~1 km for privacy (BRIDGE.md §2),
   * which changes the observation's bytes, so a feed item no longer hashes to
   * its signed `id`. Verifying feed items as-is would therefore reject every
   * record. The contract's answer is `/observation/:id`, which returns the
   * **exact signed bytes** — so we take ids from the feed and verify those.
   *
   * We still keep the feed's coarsened coordinates for public placement
   * (BRIDGE.md §5) rather than the precise gps inside the signed record.
   */
  async feed(opts: { since?: string | null; limit?: number } = {}): Promise<FeedPage> {
    const raw = await this.rawFeed(opts);
    const items = raw.items ?? [];
    const records: VerifiedRecord[] = [];
    let dropped = 0;

    // Resolve a handful at a time — polite to the node, quick enough for a page.
    const CONCURRENCY = 6;
    for (let i = 0; i < items.length; i += CONCURRENCY) {
      const batch = items.slice(i, i + CONCURRENCY);
      const settled = await Promise.all(batch.map((item) => this.resolveFeedItem(item)));
      for (const rec of settled) {
        if (rec) records.push(rec);
        else dropped++;
      }
    }
    return { records, cursor: raw.cursor ?? null, dropped, coarseGps: coarseGpsOf(items) };
  }

  /** The feed exactly as the node returns it — unverified, GPS coarsened. */
  async rawFeed(
    opts: { since?: string | null; limit?: number } = {},
  ): Promise<{ items: GardenObservation[]; cursor: string | null }> {
    const q = new URLSearchParams();
    if (opts.since) q.set("since", opts.since);
    // Nodes cap how much they'll serve at once; ask for a modest page.
    q.set("limit", String(Math.min(50, Math.max(1, opts.limit ?? DEFAULT_LIMIT))));
    try {
      return await this.json("/feed?" + q.toString());
    } catch (err) {
      // Some nodes reject an explicit `limit`; fall back to their own default.
      q.delete("limit");
      if (!q.toString()) return await this.json("/feed");
      void err;
      return await this.json("/feed?" + q.toString());
    }
  }

  /**
   * Turn one feed item into a verified record. Fast path: if the node didn't
   * alter it, it verifies as-is and costs no extra request. Otherwise fetch its
   * exact signed bytes by content id and verify those.
   */
  private async resolveFeedItem(item: GardenObservation): Promise<VerifiedRecord | null> {
    if (item?.id && (await verifyObservation(item)).ok) {
      return { observation: item, attestations: [], trust: trustScore(item, []) };
    }
    if (!item?.id) return null;
    try {
      return await this.observation(item.id);
    } catch {
      return null; // unreachable or unknown id — drop rather than trust it
    }
  }

  /**
   * A single plot's full growth chain (oldest→newest), each record verified and
   * its trust recomputed locally from verified attestations only.
   */
  async plot(plot: string): Promise<{ plot: string; records: VerifiedRecord[]; dropped: number }> {
    const raw = await this.json<{
      plot: string;
      totalCo2: number;
      records: { observation: GardenObservation; attestations: Attestation[]; trust: number }[];
    }>("/plot/" + encodeURIComponent(plot));
    const out: VerifiedRecord[] = [];
    let dropped = 0;
    for (const r of raw.records ?? []) {
      const rec = await this.verifyRecord(r.observation, r.attestations);
      if (rec) out.push(rec);
      else dropped++;
    }
    return { plot: raw.plot, records: out, dropped };
  }

  /** A single record with its exact signed bytes, verified locally. Null if invalid. */
  async observation(id: string): Promise<VerifiedRecord | null> {
    const raw = await this.json<{
      observation: GardenObservation;
      attestations: Attestation[];
      trust: number;
    }>("/observation/" + encodeURIComponent(id));
    return this.verifyRecord(raw.observation, raw.attestations);
  }

  /** Verify an observation and keep only the attestations that themselves verify
   *  and actually reference it — then score trust from that trusted subset. */
  private async verifyRecord(
    obs: GardenObservation,
    attestations: Attestation[] = [],
  ): Promise<VerifiedRecord | null> {
    if (!(await verifyObservation(obs)).ok) return null;
    const good: Attestation[] = [];
    for (const a of attestations) {
      if (a.ref === obs.id && (await verifyAttestation(a)).ok) good.push(a);
    }
    return { observation: obs, attestations: good, trust: trustScore(obs, good) };
  }

  /**
   * Poll the feed politely, tracking the cursor. Calls `onRecords` with each new
   * verified batch. Returns a stop function. New nodes/records only — dedup is
   * the caller's job (records are content-addressed by `observation.id`).
   */
  pollFeed(
    onRecords: (records: VerifiedRecord[]) => void,
    opts: { intervalMs?: number; since?: string | null } = {},
  ): () => void {
    const interval = Math.max(5000, opts.intervalMs ?? 30000);
    let cursor: string | null = opts.since ?? null;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const tick = async () => {
      try {
        const page = await this.feed({ since: cursor });
        if (stopped) return;
        if (page.records.length) onRecords(page.records);
        if (page.cursor) cursor = page.cursor;
      } catch {
        /* transient — try again next interval */
      }
      if (!stopped) timer = setTimeout(tick, interval);
    };
    timer = setTimeout(tick, interval);

    return () => {
      stopped = true;
      if (timer) clearTimeout(timer);
    };
  }
}
