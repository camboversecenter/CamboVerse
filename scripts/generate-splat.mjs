/**
 * public/models/angkor-wat.splat — a synthetic Gaussian-splat cloud of Angkor
 * Wat, sampled from the same authored geometry. A license-clean, self-contained
 * stand-in used to prototype the photoreal splat-rendering path in the mobile
 * web viewer (the real thing will be an actual capture). Run: node scripts/generate-splat.mjs
 */
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createBuilder, SAND, DARK_SAND } from "./lib/temple.mjs";

const OUT = resolve(dirname(fileURLToPath(import.meta.url)), "../public/models/angkor-wat.splat");
const b = createBuilder();

// Same Angkor Wat composition as the glTF model.
b.box(7.4, 0.5, 6.2, 0, 0.25, 0, DARK_SAND);
b.box(6.2, 0.5, 5.0, 0, 0.75, 0, SAND);
b.box(5.0, 0.45, 4.0, 0, 1.18, 0, SAND);
for (const [x, z, w, d] of [[0, 2.35, 5.6, 0.22], [0, -2.35, 5.6, 0.22], [2.7, 0, 0.22, 4.9], [-2.7, 0, 0.22, 4.9]]) {
  b.box(w, 0.7, d, x, 1.35, z, SAND);
  b.box(w * 1.03, 0.12, d * 1.03, x, 1.72, z, DARK_SAND);
}
b.box(1.3, 0.3, 2.6, 0, 0.42, 4.1, SAND);
b.box(0.16, 0.5, 2.6, 0.7, 0.55, 4.1, DARK_SAND);
b.box(0.16, 0.5, 2.6, -0.7, 0.55, 4.1, DARK_SAND);
const py = 1.4;
b.tower(0, 0, 1.5, py, 4.0, 8);
for (const [x, z] of [[1.5, 1.15], [-1.5, 1.15], [1.5, -1.15], [-1.5, -1.15]]) {
  b.tower(x, z, 0.95, py, 2.5, 7);
}

b.buildSplat(OUT, { modelScale: 0.6, splatScale: 0.07, count: 24000 });
