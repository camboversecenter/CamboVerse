import { describe, expect, it } from "vitest";
import { buildPlots, chainGpsPositions, gardenTotals, parseRowIdentity } from "./garden";
import { importBundle } from "./bundle";
import { buildObservation, generateDeviceKey, signObservation } from "./grove";

async function rowBundle() {
  const key = await generateDeviceKey();
  const observations = [];
  for (let n = 2; n <= 8; n++) {
    const observation = await signObservation(buildObservation({
      device: key.device, plot: "ABC", species: "mango", count: 1,
      measure: { method: "height", height_m: 3 },
      gps: { lat: 11.5 + n * .00004, lng: 104.9 + n * .00001, acc: 3 },
      observedAt: `2026-11-11T06:02:0${n}Z`, photoHash: "",
      prev: observations.at(-1)?.id ?? null,
      note: `row 2026-11-11T06:02 · tree ${n} · 4 m spacing · position computed from ordered row GPS points`,
    }), key.keyPair);
    observations.push(observation);
  }
  return { v: 1, kind: "grove-bundle", observations };
}

describe("row-recorded garden trees", () => {
  it("keeps 7/7 signed records verified, displays seven identities, and preserves their GPS", async () => {
    const bundle = await rowBundle();
    const before = JSON.stringify(bundle);
    const imported = await importBundle(bundle);
    expect(imported.total).toBe(7);
    expect(imported.records).toHaveLength(7);
    expect(imported.dropped).toBe(0);
    const plots = buildPlots(imported.records);
    expect(plots).toHaveLength(1);
    expect(plots[0].chains).toHaveLength(7);
    expect(gardenTotals(plots).plants).toBe(7);
    expect(plots[0].chains.map(c => c[0].treeNumber)).toEqual([2, 3, 4, 5, 6, 7, 8]);
    expect(plots[0].chains.every(c => c[0].rowId === "2026-11-11T06:02")).toBe(true);
    const positions = chainGpsPositions(plots[0].chains);
    bundle.observations.forEach((obs, i) => {
      expect(positions.get(i)).toEqual({ lat: obs.gps!.lat, lng: obs.gps!.lng });
    });
    expect(new Set([...positions.values()].map(g => JSON.stringify(g))).size).toBe(7);
    expect(JSON.stringify(bundle)).toBe(before);
  });

  it("keeps ordinary same-species growth records as one plant", async () => {
    const bundle = await rowBundle();
    const records = bundle.observations.map(observation => ({
      observation: { ...observation, note: "ordinary growth observation" }, attestations: [], trust: 20,
    }));
    const [plot] = buildPlots(records);
    expect(plot.chains).toHaveLength(1);
    expect(plot.count).toBe(1);
    expect(plot.chains[0]).toHaveLength(7);
  });

  it("does not invent tree 1 or accept incomplete row metadata", () => {
    expect(parseRowIdentity("row abc · tree 2 · 4 m spacing")).toEqual({ rowId: "abc", treeNumber: 2 });
    for (const note of ["row abc", "row abc · tree 0", "row abc · tree 2oops", "ordinary note"]) {
      expect(parseRowIdentity(note)).toBeNull();
    }
  });

  it("groups updates by row and tree rather than recording links or species", async () => {
    const imported = await importBundle(await rowBundle());
    const first = imported.records[0];
    const update = { ...first, observation: { ...first.observation, id: "update", species: "guava", prev: null, observedAt: "2026-11-12T00:00:00Z" } };
    const [plot] = buildPlots([...imported.records, update]);
    expect(plot.count).toBe(7);
    expect(plot.chains[0]).toHaveLength(2);
    expect(plot.chains[0][1].observation.id).toBe("update");
  });
});
