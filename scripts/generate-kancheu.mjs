/**
 * public/models/kancheu.glb — កញ្ជើ (Kancheu), a traditional Khmer woven bamboo basket.
 * Used for carrying goods, measuring rice, or washing vegetables, it is an essential
 * everyday tool in rural Cambodian life.
 * 
 * A stylized, licence-clean stand-in (CC-BY) authored by the CamboVerse Center,
 * built from stacked frustums to represent the woven flaring shape and thick rim.
 * Run: node scripts/generate-kancheu.mjs
 */
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createBuilder } from "./lib/temple.mjs";

const OUT = resolve(dirname(fileURLToPath(import.meta.url)), "../public/models/kancheu.glb");
const b = createBuilder();

// Woven bamboo / rattan tones
const BAMBOO_LIGHT = [0.85, 0.70, 0.45];
const BAMBOO_DARK  = [0.75, 0.58, 0.35];
const BAMBOO_RIM   = [0.65, 0.48, 0.28];

// The basket is a wide, shallow, flaring cone (frustum)
// We build it from a few stacked segments to give it a slightly rounded, bulging profile.
const PROFILE = [
  [0.00, 0.30], // Flat base
  [0.10, 0.45], // Quick flare
  [0.25, 0.65], // Bulging side
  [0.45, 0.85], // Upper side
  [0.60, 1.00], // Wide mouth
];

// 1. The main woven body
for (let i = 0; i < PROFILE.length - 1; i++) {
  const [y0, r0] = PROFILE[i];
  const [y1, r1] = PROFILE[i + 1];
  const h = y1 - y0;
  // Alternate colors slightly to suggest horizontal weave rows
  const color = i % 2 === 0 ? BAMBOO_LIGHT : BAMBOO_DARK;
  b.cyl(r1, r0, h, 24, 0, (y0 + y1) / 2, 0, color);
}

// 2. The reinforced rim (the lip) at the very top
// Bamboo strips are bound tightly around the edge to hold the shape
b.cyl(1.05, 1.02, 0.08, 24, 0, 0.64, 0, BAMBOO_RIM);
b.cyl(1.02, 0.99, 0.05, 24, 0, 0.59, 0, BAMBOO_DARK);

// 3. The sturdy base ring (often square, but approximated here)
b.cyl(0.32, 0.32, 0.05, 12, 0, 0.025, 0, BAMBOO_RIM);

b.build(OUT, { scale: 1 });
