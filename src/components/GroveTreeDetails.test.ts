import { expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { GroveTreeDetails } from "./GroveTreeDetails";
import { buildPlots } from "../grove/garden";
import type { VerifiedRecord } from "../grove/client";

it("shows only the selected tree's measurements, GPS, trust and history", () => {
  const records: VerifiedRecord[] = [2, 3].map(n => ({
    observation: {
      v: 1, kind: "observation", id: `tree-${n}`, sig: "", device: "device-abc", plot: "ABC",
      species: "mango", count: 1, prev: n === 3 ? "tree-2" : null,
      note: `row test-row · tree ${n}`, observedAt: `2026-11-11T06:02:0${n}Z`, photoHash: "",
      gps: { lat: 11 + n / 100, lng: 104 + n / 100, acc: 3 },
      measure: { method: "dbh_height", height_m: n, dbh_cm: n * 10 }, biomassKg: n, co2Kg: n * 7,
    }, trust: n * 10, attestations: [],
  }));
  const plot = buildPlots(records)[0];
  const chain = plot.chains[0];
  const html = renderToStaticMarkup(createElement(GroveTreeDetails, { record: chain[0], chain }));
  expect(html).toContain('Tree number</span><b>2');
  expect(html).toContain('2 m');
  expect(html).toContain('20 cm');
  expect(html).toContain('14 kg');
  expect(html).toContain('20/100');
  expect(html).toContain('11.02, 104.02');
  expect(html).toContain('Observation history (1)');
  expect(html).not.toContain('11.03');
  expect(html).not.toContain('21 kg');
});
