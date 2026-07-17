/**
 * public/models/sambor-prei-kuk.glb
 * Run: node scripts/generate-samborpreikuk.mjs
 */
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createBuilder, PINK_SAND, PINK_DARK } from "./lib/temple.mjs";

const OUT = resolve(dirname(fileURLToPath(import.meta.url)), "../public/models/sambor-prei-kuk.glb");
const b = createBuilder();

// Base
b.box(5.0, 0.5, 5.0, 0, 0.25, 0, PINK_DARK);

// Main Octagonal Tower (Prasat Sambor style)
b.cyl(1.2, 1.4, 2.0, 8, 0, 1.5, 0, PINK_SAND); // Main body
b.cyl(1.0, 1.2, 1.0, 8, 0, 3.0, 0, PINK_SAND); // Second tier
b.cyl(0.8, 1.0, 0.8, 8, 0, 3.9, 0, PINK_SAND); // Third tier
b.cone(0.8, 1.0, 8, 0, 4.8, 0, PINK_DARK); // Roof

// Two smaller flanking octagonal towers
for (const [x, z] of [[-1.8, -1.5], [1.8, 1.5]]) {
  b.cyl(0.8, 0.9, 1.2, 8, x, 1.1, z, PINK_SAND);
  b.cyl(0.6, 0.8, 0.8, 8, x, 2.1, z, PINK_SAND);
  b.cone(0.6, 0.8, 8, x, 2.9, z, PINK_DARK);
}

b.build(OUT, { scale: 0.8 });
