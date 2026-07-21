/**
 * Map verified Grove records → a virtual garden (BRIDGE.md §4).
 *
 *   plot     → one virtual parcel (a garden per plot id)
 *   species  → which plant asset to place
 *   count    → how many
 *   measure  → the tree's size/age growth stage
 *   prev     → a growth-over-time timeline for that plot
 *   co2Kg    → an "≈ estimated CO₂" label (never a token)
 *   trust    → a visual confidence cue
 *
 * Only records that already verified (`verifyObservation(...).ok`) should be
 * passed in — this layer does the physical→virtual shaping, not the trust check.
 */
import type { GardenObservation } from "./grove";
import type { VerifiedRecord } from "./client";

/** One chain of observations of the same plant(s) over time, oldest→newest. */
export type Chain = VerifiedRecord[];

export interface GrovePlot {
  id: string;
  /** Dominant species in the plot (the most-recent record's species). */
  species: string;
  /** Distinct growth chains (a plot may hold several plantings). */
  chains: Chain[];
  /** Every record, sorted by observedAt ascending — the plot's timeline. */
  timeline: VerifiedRecord[];
  /** The most-recent record overall. */
  latest: VerifiedRecord;
  /** Sum, across chains, of the latest estimate per chain — the plot's current total. */
  totalCo2Kg: number;
  /** Total living plants now (sum of latest `count` per chain). */
  count: number;
  /** Confidence for the plot — the latest record's locally-computed trust (0–100). */
  trust: number;
  /** Coarsened location for the public map (feed value if present), else null. */
  gps: { lat: number; lng: number } | null;
  firstAt: number;
  lastAt: number;
}

const ms = (iso: string) => {
  const t = Date.parse(iso);
  return Number.isFinite(t) ? t : 0;
};

/** Split a plot's records into growth chains by following the `prev` hash-links. */
function toChains(records: VerifiedRecord[]): Chain[] {
  const byId = new Map(records.map((r) => [r.observation.id, r]));
  const referenced = new Set<string>();
  for (const r of records) if (r.observation.prev) referenced.add(r.observation.prev);
  // A "tail" is a record no other record points back to — the newest in its chain.
  const tails = records.filter((r) => !referenced.has(r.observation.id));
  const seen = new Set<string>();
  const chains: Chain[] = [];
  for (const tail of tails) {
    const chain: Chain = [];
    let curId: string | null = tail.observation.id;
    while (curId && !seen.has(curId)) {
      const rec = byId.get(curId);
      if (!rec) break;
      seen.add(curId);
      chain.push(rec);
      curId = rec.observation.prev;
    }
    chain.reverse(); // oldest → newest
    chains.push(chain);
  }
  // Any records left (e.g. a broken/cyclic prev link) each become their own chain.
  for (const r of records) {
    if (!seen.has(r.observation.id)) {
      seen.add(r.observation.id);
      chains.push([r]);
    }
  }
  return chains;
}

/**
 * Group verified records into plots. `coarseGps` supplies the privacy-coarsened
 * feed location per plot (BRIDGE.md §5); precise per-observation GPS is not used
 * for public placement.
 */
export function buildPlots(
  records: VerifiedRecord[],
  coarseGps?: Map<string, { lat: number; lng: number }>,
): GrovePlot[] {
  // Records are content-addressed: an identical `id` is the same signed record
  // (e.g. a duplicate in an export). Keep one so it isn't double-counted.
  const uniqueById = new Map<string, VerifiedRecord>();
  for (const r of records) if (!uniqueById.has(r.observation.id)) uniqueById.set(r.observation.id, r);

  const byPlot = new Map<string, VerifiedRecord[]>();
  for (const r of uniqueById.values()) {
    const arr = byPlot.get(r.observation.plot) ?? [];
    arr.push(r);
    byPlot.set(r.observation.plot, arr);
  }

  const plots: GrovePlot[] = [];
  for (const [id, recs] of byPlot) {
    const timeline = [...recs].sort((a, b) => ms(a.observation.observedAt) - ms(b.observation.observedAt));
    const chains = toChains(recs);
    const latestPerChain = chains.map((c) => c[c.length - 1]).filter(Boolean);
    const latest = timeline[timeline.length - 1];
    const totalCo2Kg = round(latestPerChain.reduce((s, r) => s + r.observation.co2Kg, 0), 2);
    const count = latestPerChain.reduce((s, r) => s + r.observation.count, 0);
    plots.push({
      id,
      species: latest.observation.species,
      chains,
      timeline,
      latest,
      totalCo2Kg,
      count,
      trust: latest.trust,
      gps: coarseGps?.get(id) ?? coarsen(latest.observation.gps),
      firstAt: ms(timeline[0].observation.observedAt),
      lastAt: ms(latest.observation.observedAt),
    });
  }
  // Newest activity first.
  return plots.sort((a, b) => b.lastAt - a.lastAt);
}

/**
 * The growth stage (0–1) of a chain at time `t`: uses the most-recent record at
 * or before `t`. Height drives it (falling back to DBH), normalized to a mature
 * reference — so the rendered model grows as the real tree grew.
 */
export function growthAt(chain: Chain, t: number): { record: VerifiedRecord | null; stage: number } {
  let record: VerifiedRecord | null = null;
  for (const r of chain) {
    if (ms(r.observation.observedAt) <= t) record = r;
  }
  if (!record) return { record: null, stage: 0 };
  return { record, stage: sizeStage(record.observation) };
}

/** Normalize a measurement to a 0–1 size stage (height ~15 m or DBH ~40 cm = mature). */
export function sizeStage(obs: GardenObservation): number {
  const h = obs.measure.height_m;
  const d = obs.measure.dbh_cm;
  let s = 0;
  if (h && h > 0) s = h / 15;
  else if (d && d > 0) s = d / 40;
  return Math.max(0.08, Math.min(1, s));
}

/** Opacity/solidity cue from trust: a lone self-claim is translucent, an
 *  attested one is solid (BRIDGE.md §4). */
export function trustOpacity(trust: number): number {
  return 0.4 + 0.6 * Math.max(0, Math.min(100, trust)) / 100;
}

/** Coarsen a precise GPS claim to ~2 dp (~1 km) for public placement. */
function coarsen(gps: { lat: number; lng: number } | null): { lat: number; lng: number } | null {
  if (!gps) return null;
  return { lat: Math.round(gps.lat * 100) / 100, lng: Math.round(gps.lng * 100) / 100 };
}

function round(n: number, dp: number): number {
  const f = 10 ** dp;
  return Math.round(n * f) / f;
}

/** A whole garden's headline totals, derived from verified plots only. */
export function gardenTotals(plots: GrovePlot[]): { plots: number; plants: number; co2Kg: number } {
  return {
    plots: plots.length,
    plants: plots.reduce((s, p) => s + p.count, 0),
    co2Kg: round(plots.reduce((s, p) => s + p.totalCo2Kg, 0), 2),
  };
}
