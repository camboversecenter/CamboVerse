import { describe, it, expect } from "vitest";
import {
  verifyObservation, verifyAttestation, trustScore, estimateCarbon,
  type GardenObservation, type Attestation,
} from "./grove";
import { buildPlots } from "./garden";
import type { VerifiedRecord } from "./client";
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

  it("has the expected sample world (3 observations)", () => {
    expect(observations).toHaveLength(3);
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
