/**
 * public/models/ta-prohm.glb — an authored, recognizable Ta Prohm: a low,
 * sprawling galleried temple with a couple of modest towers, overtaken by giant
 * silk-cotton trees whose roots drape over the walls (its signature). Uses the
 * shared temple builder with weathered vertex colours; trees use wood/moss
 * tones. Stylized stand-in; photoreal comes later. Run: node scripts/generate-taprohm.mjs
 */
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createBuilder, SAND, DARK_SAND, WOOD, MOSS } from "./lib/temple.mjs";

const OUT = resolve(dirname(fileURLToPath(import.meta.url)), "../public/models/ta-prohm.glb");
const b = createBuilder();

// Low, wide base.
b.box(7.0, 0.4, 5.6, 0, 0.2, 0, DARK_SAND);
b.box(6.0, 0.4, 4.8, 0, 0.55, 0, SAND);

// Gallery walls (a rectangular enclosure) with cornices; one section lower
// (weathered/collapsed) for character.
const walls = [
  [0, 2.2, 5.4, 0.24, 1.0],
  [0, -2.2, 5.4, 0.24, 0.7], // lower / partly collapsed
  [2.8, 0, 0.24, 4.6, 1.0],
  [-2.8, 0, 0.24, 4.6, 0.85],
];
for (const [x, z, w, d, h] of walls) {
  b.box(w, h, d, x, 0.75 + h / 2, z, SAND);
  b.box(w * 1.04, 0.12, d * 1.04, x, 0.75 + h + 0.02, z, DARK_SAND);
}

// A few tumbled stone blocks (ruin scatter).
for (const [x, z, r] of [[1.6, 1.9, 0.3], [-1.9, -1.7, 0.25], [2.2, -1.2, 0.2]]) {
  b.box(r, r, r, x, 0.75 + r / 2, z, SAND);
}

// Two modest towers.
b.tower(0.5, 0, 1.05, 0.95, 2.4, 6);
b.tower(-1.7, 1.3, 0.75, 0.95, 1.7, 5);

/** A giant tree: buttressed trunk, leafy canopy, and roots draping down a wall. */
function tree(x, z, height, canopyR) {
  // trunk
  b.cyl(0.3, 0.55, height, 8, x, 0.75 + height / 2, z, WOOD);
  // buttress flares at the base
  for (const a of [0, 1.6, 3.1, 4.7]) {
    b.cyl(0.06, 0.28, 1.1, 6, x + Math.cos(a) * 0.4, 0.75 + 0.55, z + Math.sin(a) * 0.4, WOOD, [0.4 * Math.cos(a), 0, 0.4 * Math.sin(a)]);
  }
  // canopy
  const cy = 0.75 + height;
  b.sphere(canopyR, x, cy + 0.3, z, MOSS, 0.7);
  b.sphere(canopyR * 0.7, x + canopyR * 0.5, cy, z - canopyR * 0.3, MOSS, 0.7);
  b.sphere(canopyR * 0.7, x - canopyR * 0.4, cy + 0.2, z + canopyR * 0.4, MOSS, 0.7);
}

// Roots that drape from a tree over the wall at z = 2.2.
function drapeRoots(x0, z0, wallZ, wallTopY) {
  for (let i = -2; i <= 2; i++) {
    const x = x0 + i * 0.35;
    // upper root reaching from tree base to wall top
    b.cyl(0.05, 0.12, 1.3, 5, x, wallTopY + 0.3, (z0 + wallZ) / 2, WOOD, [0.6, 0, 0]);
    // lower root spilling down the wall face
    b.cyl(0.04, 0.09, 1.3, 5, x + 0.05 * i, wallTopY - 0.4, wallZ + 0.16, WOOD, [0.15, 0, 0]);
  }
}

tree(1.2, 2.2, 3.4, 1.5); // sitting on the front-right wall
drapeRoots(1.2, 1.4, 2.34, 1.75);
tree(-1.9, -1.6, 2.9, 1.2);

b.build(OUT, { scale: 0.6 });
