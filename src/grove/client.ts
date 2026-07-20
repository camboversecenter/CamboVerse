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

/** iany.app's reference node. Not deployed yet — develop against fixtures. */
export const DEFAULT_NODE = "https://iany.app/api/grove";

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
  /** How many raw items the node returned that failed local verification. */
  dropped: number;
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
   * A page of the public feed, newest-first, each item **verified locally**.
   * GPS is already coarsened to ~1 km by the node (privacy). Poll again with the
   * returned `cursor` as `since`.
   */
  async feed(opts: { since?: string | null; limit?: number } = {}): Promise<FeedPage> {
    const q = new URLSearchParams();
    if (opts.since) q.set("since", opts.since);
    if (opts.limit) q.set("limit", String(opts.limit));
    const raw = await this.json<{ items: GardenObservation[]; cursor: string | null }>(
      "/feed" + (q.toString() ? "?" + q.toString() : ""),
    );
    const records: VerifiedRecord[] = [];
    let dropped = 0;
    for (const obs of raw.items ?? []) {
      if ((await verifyObservation(obs)).ok) {
        records.push({ observation: obs, attestations: [], trust: trustScore(obs, []) });
      } else {
        dropped++;
      }
    }
    return { records, cursor: raw.cursor ?? null, dropped };
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
