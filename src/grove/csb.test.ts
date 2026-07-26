/**
 * The CSB client, driven against a stub endpoint that behaves like the real one.
 *
 * Two properties matter more than the rest, and both are about failure:
 *
 *  1. The plot NAME never leaves the browser — only keccak256 of it. A garden's
 *     id is frequently its owner's name.
 *  2. A chain that is down, absent, or lying must degrade to "no extra
 *     provenance", never to a broken garden. The signed records already carry
 *     the whole of what this viewer promises; the chain is additive.
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import {
  CsbClient, provenanceTier, provenanceLabel, paidOut, committed, type CsbPlotStatus,
} from "./csb";
import { plotKey } from "./keccak";

const PLOT = "plot/peam-krasop/mangrove-01";
const KEY = plotKey(PLOT);

function verifiedStatus(over: Partial<CsbPlotStatus> = {}): CsbPlotStatus {
  return {
    available: true,
    plot: KEY,
    anchored: true,
    chain: { contract: "0xanchor", chainId: 8555 },
    steward: "0xfarmer",
    records: 2,
    requiredConfirmations: 1,
    verifiedCount: 430,
    head: {
      observationId: "0xobs2",
      prevId: "0xobs1",
      species: "rhizophora",
      liveCount: 430,
      anchoredBy: "0xfarmer",
      anchoredAt: 1_800_000_000,
      confirms: 1,
      disputes: 0,
      verified: true,
    },
    verifier: {
      address: "0xofficer",
      classes: ["commune"],
      suspended: false,
      label: "Commune agriculture officer",
      licenceRef: "0xlicence0000",
      licensedSince: 1_700_000_000,
      confirmations: 12,
      disputesRaised: 0,
    },
    title: {
      token: "0xtoken", name: "Peam Krasop Mangrove Grove", symbol: "GROVE01",
      location: "Peam Krasop, Koh Kong", registeredAt: 1_790_000_000,
      lastSyncedCount: 430, lastSyncedAt: 1_800_000_100, active: true,
      supply: 430, inSync: true, driftReason: "",
    },
    pledges: [{
      id: 1,
      sponsor: "0xsponsor", grower: "0xfarmer", token: "0xkhr",
      total: "1600000.00", remaining: "950000.00", status: "funded",
      purpose: "500 mangroves, 24-month survival",
      milestones: [
        {
          index: 0, notBefore: 1_799_000_000, deadline: 1_801_000_000, requiredCount: 400,
          growerAmount: "600000.00", verifierAmount: "50000.00",
          status: "paid", provedBy: "0xobs2", paidVerifier: "0xofficer",
        },
        {
          index: 1, notBefore: 1_830_000_000, deadline: 1_832_000_000, requiredCount: 350,
          growerAmount: "900000.00", verifierAmount: "50000.00",
          status: "pending", provedBy: null, paidVerifier: null,
        },
      ],
    }],
    ...over,
  };
}

/** Stub `fetch`, capturing every URL it is asked for. */
function stubFetch(handler: (url: string) => unknown, status = 200) {
  const seen: string[] = [];
  vi.stubGlobal("fetch", async (url: string) => {
    seen.push(String(url));
    return { ok: status >= 200 && status < 300, status, json: async () => handler(String(url)) };
  });
  return seen;
}

afterEach(() => vi.unstubAllGlobals());

describe("CsbClient", () => {
  it("sends only the hash of the plot, never its name", async () => {
    const seen = stubFetch(() => verifiedStatus());
    await new CsbClient("https://csb.example").plotStatus(PLOT);

    expect(seen).toHaveLength(1);
    expect(seen[0]).toBe(`https://csb.example/grove?plot=${KEY}`);
    // The name itself, and every recognisable fragment of it, stays here.
    expect(seen[0]).not.toContain("peam-krasop");
    expect(seen[0]).not.toContain(encodeURIComponent(PLOT));
  });

  it("reads a verified plot", async () => {
    stubFetch(() => verifiedStatus());
    const s = await new CsbClient("https://csb.example").plotStatus(PLOT);
    expect(s.anchored).toBe(true);
    expect(s.verifiedCount).toBe(430);
    expect(s.verifier?.label).toBe("Commune agriculture officer");
    expect(provenanceTier(s)).toBe("verified");
  });

  it("degrades to unavailable when the chain is unreachable", async () => {
    vi.stubGlobal("fetch", async () => { throw new Error("network down"); });
    const s = await new CsbClient("https://csb.example").plotStatus(PLOT);
    expect(s.available).toBe(false);
    expect(s.anchored).toBe(false);
    // The garden still renders; it simply claims less.
    expect(provenanceTier(s)).toBe("unanchored");
    expect(provenanceLabel(s)).toBe("Signed on a device");
  });

  it("degrades on an HTTP error rather than throwing", async () => {
    stubFetch(() => ({ error: "nope" }), 502);
    const s = await new CsbClient("https://csb.example").plotStatus(PLOT);
    expect(s.available).toBe(false);
  });

  it("treats a chain with no Grove contracts as simply unavailable", async () => {
    stubFetch(() => ({ available: false, reason: "GroveAnchor is not deployed on this chain" }));
    const s = await new CsbClient("https://csb.example").plotStatus(PLOT);
    expect(s.available).toBe(false);
    expect(s.reason).toContain("not deployed");
  });

  it("caches, so a room full of phones is not a load test", async () => {
    const seen = stubFetch(() => verifiedStatus());
    const c = new CsbClient("https://csb.example");
    await c.plotStatus(PLOT);
    await c.plotStatus(PLOT);
    expect(seen).toHaveLength(1);
    await c.plotStatus(PLOT, { ttlMs: 0 });
    expect(seen).toHaveLength(2);
  });

  it("resolves many plots at once", async () => {
    stubFetch(() => verifiedStatus());
    const m = await new CsbClient("https://csb.example").plotStatuses([PLOT, "home-garden-01"]);
    expect(m.size).toBe(2);
    expect(m.get(PLOT)?.anchored).toBe(true);
  });
});

describe("provenance", () => {
  it("a record nobody licensed has confirmed is 'anchored', not 'verified'", () => {
    const s = verifiedStatus({
      verifiedCount: 0,
      head: { ...verifiedStatus().head!, confirms: 0, verified: false },
      verifier: null,
    });
    expect(provenanceTier(s)).toBe("anchored");
    expect(provenanceLabel(s)).toContain("awaiting a licensed verifier");
  });

  it("a dispute outranks a confirmation", () => {
    const s = verifiedStatus({
      head: { ...verifiedStatus().head!, confirms: 1, disputes: 1, verified: false },
    });
    expect(provenanceTier(s)).toBe("disputed");
    expect(provenanceLabel(s)).toContain("disputed");
  });

  it("never claims verification from a chain it could not reach", () => {
    expect(provenanceTier(undefined)).toBe("unanchored");
    expect(provenanceTier({ available: false, plot: KEY, anchored: false })).toBe("unanchored");
  });
});

describe("funding totals", () => {
  it("counts only what has actually been released", () => {
    const s = verifiedStatus();
    expect(paidOut(s.pledges)).toBe(650_000); // milestone 0: grower + verifier
    expect(committed(s.pledges)).toBe(950_000); // milestone 1, still pending
  });

  it("counts nothing from a pledge that was never funded", () => {
    const s = verifiedStatus();
    s.pledges![0].status = "created";
    expect(committed(s.pledges)).toBe(0);
  });

  it("is zero for a plot with no pledges", () => {
    expect(paidOut(undefined)).toBe(0);
    expect(committed([])).toBe(0);
  });
});
