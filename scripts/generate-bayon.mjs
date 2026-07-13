/**
 * public/models/bayon.glb — an authored, recognizable Bayon: a dense cluster of
 * towers each bearing four serene faces (the hallmark of Angkor Thom), on a
 * tiered base. Uses the shared temple builder (detailed towers + weathered
 * vertex colours). Stylized stand-in; photoreal comes later via Gaussian splats.
 * Run: `node scripts/generate-bayon.mjs`
 */
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createBuilder, SAND, DARK_SAND } from "./lib/temple.mjs";

const OUT = resolve(dirname(fileURLToPath(import.meta.url)), "../public/models/bayon.glb");
const b = createBuilder();

// Tiered base.
b.box(6.0, 0.5, 6.0, 0, 0.25, 0, DARK_SAND);
b.box(5.0, 0.5, 5.0, 0, 0.7, 0, SAND);

// Central tallest tower + a surrounding cluster of face-towers.
const y0 = 0.95;
b.tower(0, 0, 1.3, y0, 3.6, 7, { faces: true });
for (const [x, z, h] of [
  [1.9, 0, 2.6], [-1.9, 0, 2.4], [0, 1.75, 2.5], [0, -1.75, 2.3],
  [1.5, 1.45, 2.2], [-1.5, 1.45, 2.0], [1.5, -1.45, 2.1], [-1.5, -1.45, 2.3],
]) {
  b.tower(x, z, 0.85, y0, h, 6, { faces: true });
}

b.build(OUT, { scale: 0.62 });
