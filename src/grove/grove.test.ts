import { describe, it, expect } from "vitest";
import {
  verifyObservation, verifyAttestation, trustScore, estimateCarbon,
  type GardenObservation, type Attestation,
} from "./grove";
import { buildPlots } from "./garden";
import { GroveClient, type VerifiedRecord } from "./client";
import bundle from "./fixtures/grove-bundle.json";
import observationRes from "./fixtures/observation.json";

/**
 * The verify-before-render contract, exercised against genuinely device-signed
 * fixtures (BRIDGE.md §3, fixtures/README.md). If these pass, CamboVerse is
 * verifying Grove records purely from the embedded public keys + the SPEC §§4–5
 * math — no node, no iany.app, no trust in any server.
 */
describe("Grove verify (against real signed fixtures)", () => {
  const observations = (bundle as { observations: GardenObservation[] }).observations;

  // Deliberately not a fixed count. The bundle is a sample world that grows as
  // contributors add signed records, and a hard-coded 3 turned a perfectly good
  // fourth observation into a red build. What matters is that there are some
  // and that every one of them verifies — which the next test asserts.
  it("has a sample world to verify", () => {
    expect(observations.length).toBeGreaterThan(0);
  });

  it("verifies every observation in the export bundle (path A)", async () => {
    for (const obs of observations) {
      const v = await verifyObservation(obs);
      expect(v.idOk, `content hash for ${obs.id}`).toBe(true);
      expect(v.sigOk, `signature for ${obs.id}`).toBe(true);
      expect(v.ok).toBe(true);
    }
  });

  it("verifies the single observation + its attestation (node record)", async () => {
    const obs = observationRes.observation as GardenObservation;
    const atts = observationRes.attestations as Attestation[];
    expect((await verifyObservation(obs)).ok).toBe(true);
    for (const a of atts) {
      expect((await verifyAttestation(a)).ok).toBe(true);
    }
  });

  it("rejects a tampered observation (flip a measurement) — never trust the node", async () => {
    const forged = JSON.parse(JSON.stringify(observations[0])) as GardenObservation;
    forged.co2Kg = 999999; // inflate the carbon after signing
    const v = await verifyObservation(forged);
    expect(v.idOk).toBe(false); // content hash no longer matches
    expect(v.ok).toBe(false);
  });

  it("rejects a forged signature (swap sig between records)", async () => {
    const forged = JSON.parse(JSON.stringify(observations[0])) as GardenObservation;
    forged.sig = observations[1].sig; // a valid-looking sig from another record
    const v = await verifyObservation(forged);
    expect(v.sigOk).toBe(false);
    expect(v.ok).toBe(false);
  });

  it("computes a transparent trust score from distinct-device attestations", () => {
    const obs = observationRes.observation as GardenObservation;
    const atts = observationRes.attestations as Attestation[];
    const score = trustScore(obs, atts);
    // base(20) + gps(10) + photo(10) + prev(5) + one distinct confirm(18) = 63
    expect(score).toBe(63);
    expect(score).toBe(observationRes.trust);
    // a lone self-claim (no attestations) scores lower — a legible signal
    expect(trustScore(obs, [])).toBeLessThan(score);
  });

  it("can re-derive co2Kg from the measure (estimate is transparent, not trusted)", () => {
    // The first mango: dbh 16 cm, height 6 m, count 1.
    const { co2Kg } = estimateCarbon(observations[0].measure, observations[0].species);
    expect(co2Kg).toBeCloseTo(observations[0].co2Kg, 1);
  });
});

describe("GroveClient reading a node", () => {
  const signed = observationRes.observation as GardenObservation;
  /** A node that behaves like the real one: the feed coarsens GPS (so items do
   *  NOT verify) and `/observation/:id` serves the exact signed bytes. */
  const node = (log: string[] = []) => (url: string) => {
    log.push(url.replace("https://node.test/api/grove", ""));
    const path = url.split("/api/grove")[1] ?? "";
    const json = (body: unknown, status = 200) =>
      Promise.resolve({ ok: status < 400, status, json: async () => body } as Response);
    if (path.startsWith("/feed")) {
      if (Number(new URL(url).searchParams.get("limit")) > 50) return json({ error: "too big" }, 500);
      const coarse = {
        ...signed,
        gps: signed.gps && { ...signed.gps, lat: Math.round(signed.gps.lat * 100) / 100, lng: Math.round(signed.gps.lng * 100) / 100 },
      };
      return json({ items: [coarse], cursor: "c1" });
    }
    if (path.startsWith("/observation/")) {
      return json({ observation: signed, attestations: observationRes.attestations, trust: 63 });
    }
    return json({ error: "no route" }, 404);
  };

  it("verifies feed records via their exact signed bytes, not the coarsened copy", async () => {
    const log: string[] = [];
    const page = await new GroveClient("https://node.test/api/grove", node(log)).feed();
    // The coarsened feed item alone can never verify — the client must go on to
    // /observation/:id. Before this, every node record was silently dropped.
    expect(page.records).toHaveLength(1);
    expect(page.dropped).toBe(0);
    expect(page.records[0].observation.id).toBe(signed.id);
    expect(log.some((u) => u.startsWith("/observation/"))).toBe(true);
    // …and the feed's privacy-coarsened coordinate is what public placement uses.
    expect(page.coarseGps.get(signed.plot)).toEqual({ lat: 11.56, lng: 104.93 });
  });

  it("asks for a page size the node will serve (a too-large limit 500s)", async () => {
    const log: string[] = [];
    await new GroveClient("https://node.test/api/grove", node(log)).feed({ limit: 100 });
    const feed = log.find((u) => u.startsWith("/feed"))!;
    expect(Number(new URL("https://x" + feed).searchParams.get("limit"))).toBeLessThanOrEqual(50);
  });

  it("still drops a record whose signed bytes are forged", async () => {
    const bad = { ...signed, co2Kg: 999999 };
    const fetchImpl = (url: string) => {
      const path = url.split("/api/grove")[1] ?? "";
      const json = (body: unknown) => Promise.resolve({ ok: true, status: 200, json: async () => body } as Response);
      if (path.startsWith("/feed")) return json({ items: [bad], cursor: null });
      return json({ observation: bad, attestations: [], trust: 99 });
    };
    const page = await new GroveClient("https://node.test/api/grove", fetchImpl).feed();
    expect(page.records).toHaveLength(0);
    expect(page.dropped).toBe(1);
  });
});

/** A minimal verified record for exercising the physical→virtual mapping. */
function rec(id: string, species: string, prev: string | null, at: string): VerifiedRecord {
  return {
    observation: {
      v: 1, kind: "observation", device: "dev", plot: "home-garden-01", species, count: 1,
      measure: { method: "dbh_height", dbh_cm: 5, height_m: 3 }, biomassKg: 1, co2Kg: 1,
      gps: null, observedAt: at, photoHash: "", prev, note: "", id, sig: "",
    },
    attestations: [], trust: 20,
  };
}

describe("Grove garden mapping (buildPlots)", () => {
  it("splits a prev-chain that changes species into two plants (guava ≠ jackfruit)", () => {
    // Mirrors a real exported bundle: a jackfruit whose `prev` points at an
    // earlier guava in the same plot. They are different plants, not one growing.
    const guava = rec("g", "guava", null, "2026-07-20T23:20:28.523Z");
    const jack = rec("j", "jackfruit", "g", "2026-07-20T23:22:27.044Z");
    const plots = buildPlots([guava, jack]);
    expect(plots).toHaveLength(1); // same plot id
    expect(plots[0].chains).toHaveLength(2); // two distinct plants
    expect(plots[0].count).toBe(2); // both counted, not collapsed to one
    // labelled honestly as a mix, not just "jackfruit"
    const species = plots[0].speciesCounts.map((s) => s.species).sort();
    expect(species).toEqual(["guava", "jackfruit"]);
  });

  it("keeps a same-species prev-chain as one plant growing over time", () => {
    const y1 = rec("a", "mango", null, "2025-07-15T08:30:00.000Z");
    const y2 = rec("b", "mango", "a", "2026-07-14T08:30:00.000Z");
    const plots = buildPlots([y1, y2]);
    expect(plots[0].chains).toHaveLength(1); // one growth chain
    expect(plots[0].count).toBe(1); // one plant
    expect(plots[0].timeline).toHaveLength(2); // observed twice
  });
});
