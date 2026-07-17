/**
 * public/models/roteh-koh.glb
 * Run: node scripts/generate-rotehkoh.mjs
 */
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createBuilder } from "./lib/temple.mjs";

const OUT = resolve(dirname(fileURLToPath(import.meta.url)), "../public/models/roteh-koh.glb");
const b = createBuilder();

// Use generic wood colors from the builder (or just hardcode HEX if not exported)
// Actually, I'll just use RGB values.
const WOOD_DARK = [0.35, 0.22, 0.13];
const WOOD_LIGHT = [0.55, 0.40, 0.25];

// Axle
b.box(2.2, 0.15, 0.15, 0, 0.8, 0, WOOD_DARK);

// Wheels (Stylized as tall octagonal boxes or simple boxes since cyl stands on Y)
const w = 1.4;
// A rough wheel shape using intersecting boxes
for(const x of [-1.0, 1.0]) {
  b.box(0.1, w, w, x, 0.8, 0, WOOD_LIGHT);
  b.box(0.15, w*0.8, w*0.8, x, 0.8, 0, WOOD_DARK);
}

// Cart bed
b.box(1.5, 0.1, 2.5, 0, 1.0, 0.5, WOOD_DARK);
// Side rails
b.box(0.1, 0.4, 2.5, -0.7, 1.2, 0.5, WOOD_LIGHT);
b.box(0.1, 0.4, 2.5,  0.7, 1.2, 0.5, WOOD_LIGHT);
// Front/back rails
b.box(1.5, 0.4, 0.1, 0, 1.2, 1.7, WOOD_LIGHT);
b.box(1.5, 0.4, 0.1, 0, 1.2, -0.7, WOOD_LIGHT);

// Drawpole (stretching forward to oxen)
b.box(0.15, 0.15, 3.5, 0, 0.9, -2.0, WOOD_DARK);
// Crossbar for oxen
b.box(1.4, 0.15, 0.15, 0, 0.9, -3.6, WOOD_LIGHT);

b.build(OUT, { scale: 0.6 });
