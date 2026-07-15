/**
 * public/models/kaom.glb — ក្អម (k'am), a traditional Khmer earthenware water
 * pot: a round-bellied terracotta jar with a narrow neck, a small flared lip,
 * and a domed lid with a knob finial. A body of revolution built from stacked
 * frustums, in warm fired-clay tones with the shared builder's weathering.
 *
 * A stylized, licence-clean stand-in (CC-BY) authored by the CamboVerse Center,
 * pending a real 3DGS capture from a village potter (e.g. Kampong Chhnang).
 * Run: `node scripts/generate-kaom.mjs`
 */
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createBuilder } from "./lib/temple.mjs";

const OUT = resolve(dirname(fileURLToPath(import.meta.url)), "../public/models/kaom.glb");
const b = createBuilder();

// Fired terracotta clay tones (reddish-brown), with a darker fire-cloud smudge.
const TERRA = [0.74, 0.42, 0.28];
const TERRA_DARK = [0.55, 0.34, 0.26];

// Pot profile: [height, radius] samples from base (0) to the mouth. Rotated into
// a rounded belly, a narrowing shoulder, a short neck, and a small flared lip.
const PROFILE = [
  [0.00, 0.34], [0.12, 0.54], [0.30, 0.74], [0.50, 0.92], [0.72, 1.02],
  [0.92, 1.03], [1.10, 0.98], [1.28, 0.86], [1.45, 0.68], [1.58, 0.50],
  [1.70, 0.35], [1.80, 0.41],
];

// Emit a frustum between each pair of profile samples (a body of revolution).
for (let i = 0; i < PROFILE.length - 1; i++) {
  const [y0, r0] = PROFILE[i];
  const [y1, r1] = PROFILE[i + 1];
  const h = y1 - y0;
  // A couple of belly bands get the darker "fire cloud" tone for realism.
  const color = i === 3 || i === 6 ? TERRA_DARK : TERRA;
  b.cyl(r1, r0, h, 28, 0, (y0 + y1) / 2, 0, color); // cyl(rTop, rBottom, h, seg, x, y, z)
}

// ---- The lid (គំរប) — a shallow terracotta dome with a knob finial ----------
b.cyl(0.44, 0.46, 0.06, 28, 0, 1.82, 0, TERRA); // flange resting on the lip
b.sphere(0.42, 0, 1.9, 0, TERRA, 0.62);          // squashed dome
b.cyl(0.05, 0.07, 0.13, 12, 0, 2.17, 0, TERRA);  // knob stem
b.sphere(0.09, 0, 2.26, 0, TERRA);               // knob top

b.build(OUT, { scale: 1 });
