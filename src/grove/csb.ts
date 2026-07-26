/**
 * The chain's half of a verified twin — CamboVerse reading CSB.
 *
 * Grove already gives this viewer everything it needs to DRAW a garden: a
 * device-signed record it verifies for itself, with no server in the trust path
 * (see GROVE_INTEGRATION.md). What a signature cannot give it is the two things
 * a visitor actually wants to know before believing a virtual grove:
 *
 *   WHEN did this record exist?   `observedAt` is the phone's own clock, set by
 *                                 the person making the claim. CSB stamps the
 *                                 record's hash with a block timestamp agreed by
 *                                 a validator set that has never met them.
 *   WHO says it is true?          Grove's attestations come from device keys
 *                                 anybody can generate by the thousand. CSB
 *                                 counts only LICENSED field verifiers — a
 *                                 commune agriculture officer with a licence
 *                                 they can lose.
 *
 * This module is strictly additive and strictly optional. If no CSB node is
 * configured, or it is unreachable, or the grove was never anchored, the garden
 * renders exactly as it does today from the signed records alone. Nothing here
 * can make a plant appear — only add provenance to one Grove already verified.
 *
 * Honest scope, unchanged: nothing on either side is a carbon credit. The chain
 * records TREES, which somebody can walk out and count.
 */
import { plotKey } from "./keccak";

export interface CsbVerifier {
  address: string;
  /** Licence classes held — "commune", "agronomist", "ngo", … */
  classes: string[];
  suspended: boolean;
  /** The licence's public label, e.g. "Commune agriculture officer". Never a name. */
  label: string;
  licenceRef: string;
  licensedSince: number;
  /** How many records this verifier has confirmed, across the chain. */
  confirmations: number;
  disputesRaised: number;
}

export interface CsbHead {
  observationId: string;
  prevId: string | null;
  species: string;
  liveCount: number;
  anchoredBy: string;
  /** Block time (seconds) — consensus, not the device's clock. */
  anchoredAt: number;
  confirms: number;
  disputes: number;
  verified: boolean;
}

export interface CsbTitle {
  token: string;
  name: string;
  symbol: string;
  location: string;
  registeredAt: number;
  lastSyncedCount: number;
  lastSyncedAt: number;
  active: boolean;
  /** Shares in issue — one per verified living tree, when in sync. */
  supply: number;
  inSync: boolean;
  driftReason: string;
}

export interface CsbMilestone {
  index: number;
  notBefore: number;
  deadline: number;
  requiredCount: number;
  /** Riel, as a decimal string. */
  growerAmount: string;
  verifierAmount: string;
  status: "pending" | "paid" | "reclaimed" | "unknown";
  provedBy: string | null;
  paidVerifier: string | null;
}

export interface CsbPledge {
  id: number;
  sponsor: string;
  grower: string;
  token: string;
  total: string;
  remaining: string;
  status: "none" | "created" | "funded" | "closed" | "unknown";
  purpose: string;
  milestones: CsbMilestone[];
}

export interface CsbPlotStatus {
  available: boolean;
  plot: string;
  anchored: boolean;
  reason?: string;
  chain?: { contract: string; chainId: number | null };
  steward?: string;
  /** How many records of this plot are anchored. */
  records?: number;
  requiredConfirmations?: number;
  /** Living trees at the latest record, IF a licensed verifier confirmed it.
   *  0 means "nobody has confirmed the latest record" — never "no trees". */
  verifiedCount?: number;
  head?: CsbHead;
  verifier?: CsbVerifier | null;
  title?: CsbTitle | null;
  pledges?: CsbPledge[];
  disclaimer?: string;
}

/** The reference CSB read endpoint. Any CSB app server exposes the same shape. */
export const DEFAULT_CSB_BASE = "https://csb.iany.app";

export class CsbClient {
  readonly base: string;
  private cache = new Map<string, { at: number; value: CsbPlotStatus }>();

  constructor(base: string = DEFAULT_CSB_BASE) {
    this.base = base.replace(/\/+$/, "");
  }

  /**
   * Chain status for a Grove plot, by its plot id string.
   *
   * The plot string is hashed locally and only the hash is sent: the chain files
   * groves under `keccak256(plot)` and never sees the name, so neither does this
   * request. Returns `{ available: false }` rather than throwing when CSB is not
   * configured or not reachable — an unanchored garden is a normal garden, and a
   * viewer that broke when the chain was down would be a worse viewer.
   */
  async plotStatus(plot: string, { ttlMs = 30_000 }: { ttlMs?: number } = {}): Promise<CsbPlotStatus> {
    const key = plotKey(plot);
    const hit = this.cache.get(key);
    if (hit && Date.now() - hit.at < ttlMs) return hit.value;

    let value: CsbPlotStatus;
    try {
      const res = await fetch(`${this.base}/grove?plot=${key}`, { headers: { accept: "application/json" } });
      if (!res.ok) throw new Error(`CSB responded ${res.status}`);
      const body = (await res.json()) as CsbPlotStatus;
      value = body?.available ? body : { available: false, plot: key, anchored: false, reason: body?.reason };
    } catch (e) {
      value = { available: false, plot: key, anchored: false, reason: (e as Error).message };
    }
    this.cache.set(key, { at: Date.now(), value });
    return value;
  }

  /** Statuses for many plots at once, failures included as unavailable. */
  async plotStatuses(plots: string[]): Promise<Map<string, CsbPlotStatus>> {
    const entries = await Promise.all(plots.map(async (p) => [p, await this.plotStatus(p)] as const));
    return new Map(entries);
  }
}

/** What a visitor should be told, in one line, ordered strongest claim first. */
export function provenanceLabel(s: CsbPlotStatus | undefined): string {
  if (!s?.available) return "Signed on a device";
  if (!s.anchored) return "Signed on a device · not anchored on CSB";
  if (s.head?.disputes) return "Anchored on CSB · disputed by a licensed verifier";
  if (!s.head?.verified) return "Anchored on CSB · awaiting a licensed verifier";
  return "Verified by a licensed field verifier";
}

/**
 * A confidence tier for the renderer, so a visitor can see the difference
 * without reading anything.
 *
 * Deliberately NOT a score out of 100. A number implies a measurement, and what
 * separates these is categorical: nobody has been, somebody accountable has
 * been, or somebody accountable says it is wrong.
 */
export type ProvenanceTier = "unanchored" | "anchored" | "verified" | "disputed";

export function provenanceTier(s: CsbPlotStatus | undefined): ProvenanceTier {
  if (!s?.available || !s.anchored) return "unanchored";
  if (s.head?.disputes) return "disputed";
  if (s.head?.verified) return "verified";
  return "anchored";
}

/** Colour cue per tier — green for checked, amber for waiting, red for contested. */
export const TIER_COLOR: Record<ProvenanceTier, string> = {
  unanchored: "#8b9aa7",
  anchored: "#d9a326",
  verified: "#2fa84f",
  disputed: "#d2453d",
};

export const TIER_ICON: Record<ProvenanceTier, string> = {
  unanchored: "○",
  anchored: "⛓",
  verified: "✓",
  disputed: "!",
};

/** Riel, formatted for display. */
export function riel(amount: string): string {
  const n = Number(amount);
  if (!Number.isFinite(n)) return amount;
  return `៛${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

/**
 * Total riel already released to growers and verifiers on a plot — the number
 * that answers "did sponsoring this actually reach anyone?".
 */
export function paidOut(pledges: CsbPledge[] | undefined): number {
  if (!pledges) return 0;
  let total = 0;
  for (const p of pledges) {
    for (const m of p.milestones) {
      if (m.status === "paid") total += Number(m.growerAmount) + Number(m.verifierAmount);
    }
  }
  return total;
}

/** Riel still held in escrow against future survival checks. */
export function committed(pledges: CsbPledge[] | undefined): number {
  if (!pledges) return 0;
  let total = 0;
  for (const p of pledges) {
    if (p.status !== "funded") continue;
    for (const m of p.milestones) {
      if (m.status === "pending") total += Number(m.growerAmount) + Number(m.verifierAmount);
    }
  }
  return total;
}
