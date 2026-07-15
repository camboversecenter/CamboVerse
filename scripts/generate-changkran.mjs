/**
 * public/models/changkran.glb — ចង្ក្រាន (changkran), a traditional Khmer clay
 * cookstove: a bucket-shaped fired-clay body with an arched fuel mouth at the
 * front, a sunken fire chamber, three pot supports on the rim, and a lidded clay
 * cookpot resting on top. Warm terracotta with sooty darkening around the fire.
 *
 * A stylized, licence-clean stand-in (CC-BY) authored by the CamboVerse Center,
 * pending a real 3DGS capture from a village potter.
 * Run: `node scripts/generate-changkran.mjs`
 */
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createBuilder } from "./lib/temple.mjs";

const OUT = resolve(dirname(fileURLToPath(import.meta.url)), "../public/models/changkran.glb");
const b = createBuilder();

const TERRA = [0.74, 0.42, 0.28];
const TERRA_DARK = [0.55, 0.34, 0.26];
const SOOT = [0.16, 0.13, 0.12]; // charred interior / fire mouth
const CHAR = [0.1, 0.09, 0.08];

// ---- Stove body (a slightly barrelled bucket, body of revolution) -----------
const BODY = [
  [0.06, 1.04], [0.30, 1.07], [0.70, 1.03], [1.05, 1.02], [1.32, 1.06], [1.48, 1.12],
];
for (let i = 0; i < BODY.length - 1; i++) {
  const [y0, r0] = BODY[i];
  const [y1, r1] = BODY[i + 1];
  // Soot-darken the upper band near the fire.
  const color = i >= BODY.length - 3 ? TERRA_DARK : TERRA;
  b.cyl(r1, r0, y1 - y0, 30, 0, (y0 + y1) / 2, 0, color);
}
b.cyl(1.06, 1.09, 0.12, 30, 0, 0.06, 0, TERRA_DARK); // foot ring

// Sunken fire chamber: a dark recessed bowl at the top (reads as the opening).
b.cyl(0.86, 0.9, 0.3, 28, 0, 1.36, 0, SOOT);
b.cyl(0.7, 0.78, 0.24, 24, 0, 1.2, 0, CHAR); // deeper char

// Three pot supports on the rim (the pot cradle).
for (let k = 0; k < 3; k++) {
  const a = (k / 3) * Math.PI * 2 + 0.4;
  b.box(0.22, 0.16, 0.3, Math.cos(a) * 0.82, 1.55, Math.sin(a) * 0.82, TERRA, [0, a, 0]);
}

// ---- Fuel mouth (arched opening at the front, +z) ---------------------------
b.box(0.62, 0.55, 0.34, 0, 0.5, 0.92, SOOT); // dark opening
b.box(0.34, 0.3, 0.2, 0, 0.42, 1.06, CHAR); // deeper, ash-dark throat
// Terracotta arch/lintel and jambs framing the mouth.
b.box(0.8, 0.16, 0.16, 0, 0.86, 1.0, TERRA);
b.box(0.14, 0.62, 0.16, -0.4, 0.5, 1.0, TERRA);
b.box(0.14, 0.62, 0.16, 0.4, 0.5, 1.0, TERRA);

// ---- Clay cookpot resting on the stove (ឆ្នាំង) ------------------------------
const POT = [
  [1.5, 0.5], [1.62, 0.66], [1.82, 0.76], [2.02, 0.72], [2.2, 0.56], [2.3, 0.42],
];
for (let i = 0; i < POT.length - 1; i++) {
  const [y0, r0] = POT[i];
  const [y1, r1] = POT[i + 1];
  b.cyl(r1, r0, y1 - y0, 26, 0, (y0 + y1) / 2, 0, i < 2 ? TERRA_DARK : TERRA); // sooty base
}
// Pot lid: shallow dome + knob.
b.cyl(0.46, 0.48, 0.05, 26, 0, 2.31, 0, TERRA);
b.sphere(0.44, 0, 2.4, 0, TERRA, 0.55);
b.cyl(0.05, 0.07, 0.12, 12, 0, 2.62, 0, TERRA);
b.sphere(0.08, 0, 2.7, 0, TERRA);

b.build(OUT, { scale: 1 });
