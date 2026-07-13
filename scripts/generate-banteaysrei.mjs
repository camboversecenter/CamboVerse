/**
 * public/models/banteay-srei.glb — an authored, recognizable Banteay Srei: a
 * small, intimate temple of three central sanctuary towers plus flanking
 * libraries on a low platform, in its distinctive rose-pink sandstone. Uses the
 * shared temple builder with pink tones. Stylized stand-in.
 * Run: `node scripts/generate-banteaysrei.mjs`
 */
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createBuilder, PINK_SAND, PINK_DARK } from "./lib/temple.mjs";

const OUT = resolve(dirname(fileURLToPath(import.meta.url)), "../public/models/banteay-srei.glb");
const b = createBuilder();

// Low platform + enclosure (small, intimate scale).
b.box(6.0, 0.4, 5.0, 0, 0.2, 0, PINK_DARK);
b.box(5.0, 0.4, 4.0, 0, 0.55, 0, PINK_SAND);
for (const [x, z, w, d] of [[0, 2.0, 5.0, 0.2], [0, -2.0, 5.0, 0.2], [2.4, 0, 0.2, 4.0], [-2.4, 0, 0.2, 4.0]]) {
  b.box(w, 0.5, d, x, 1.0, z, PINK_SAND); // enclosure wall
}

const y0 = 0.75;
// Three central sanctuary towers in a row (central tallest).
b.tower(0, -0.3, 1.0, y0, 2.4, 6, { color: PINK_SAND });
b.tower(1.45, -0.3, 0.8, y0, 1.9, 6, { color: PINK_SAND });
b.tower(-1.45, -0.3, 0.8, y0, 1.9, 6, { color: PINK_SAND });

// Two small libraries near the front.
for (const x of [1.3, -1.3]) {
  b.box(0.9, 0.9, 1.3, x, 1.2, 1.4, PINK_SAND);
  b.box(0.98, 0.14, 1.38, x, 1.68, 1.4, PINK_DARK); // cornice
  b.cone(0.7, 0.6, 4, x, 2.0, 1.4, PINK_DARK, [0, Math.PI / 4, 0]); // little roof
}

b.build(OUT, { scale: 0.62 });
