/**
 * public/models/krama.glb
 * Run: node scripts/generate-krama.mjs
 */
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createBuilder } from "./lib/temple.mjs";

const OUT = resolve(dirname(fileURLToPath(import.meta.url)), "../public/models/krama.glb");
const b = createBuilder();

const RED = [0.75, 0.15, 0.20];
const WHITE = [0.95, 0.95, 0.95];

// Generate a folded stack of checkered fabric
const width = 1.0;
const depth = 1.5;
const thickness = 0.03;
const layers = 8;
const stripes = 6;

// Center the stack
const yOffset = 0.5; 

for (let i = 0; i < layers; i++) {
  const y = yOffset + (i * thickness * 1.1); // Small gap between layers
  // Create a checkered pattern out of stripes for each layer
  for (let s = 0; s < stripes; s++) {
    const sw = width / stripes;
    const sx = -width/2 + (s * sw) + sw/2;
    // Alternate red and white 
    const color = (i + s) % 2 === 0 ? RED : WHITE;
    b.box(sw, thickness, depth, sx, y, 0, color);
  }
}

b.build(OUT, { scale: 0.8 });
