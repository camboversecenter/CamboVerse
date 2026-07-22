/**
 * public/models/tbal.glb — ត្បាល់ និង អង្រែ (tbal & angre), the Khmer kitchen
 * mortar and pestle: a heavy footed stone mortar (a body of revolution built
 * from stacked frustums, like the k'am pot) with a hardwood pestle leaning in
 * its bowl. Grey stone tones with the shared builder's weathering; warm wood
 * for the pestle.
 *
 * A stylized, licence-clean stand-in (CC-BY) authored by the CamboVerse Center,
 * pending a real capture from a village kitchen or a Pursat stone-carver.
 * Run: `node scripts/generate-tbal.mjs`
 */
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createBuilder } from "./lib/temple.mjs";

const OUT = resolve(dirname(fileURLToPath(import.meta.url)), "../public/models/tbal.glb");
const b = createBuilder();

const STONE = [0.46, 0.46, 0.48];
const STONE_DARK = [0.34, 0.34, 0.37];
const WOOD = [0.52, 0.4, 0.25];

// Mortar profile: [height, radius] from the base — a footed goblet: a broad
// foot, a pinched waist, then the wide pounding bowl.
const PROFILE = [
  [0.0, 0.52], [0.1, 0.58], [0.2, 0.44], [0.34, 0.37], [0.5, 0.44],
  [0.68, 0.6], [0.88, 0.72], [1.02, 0.74], [1.12, 0.7],
];
for (let i = 0; i < PROFILE.length - 1; i++) {
  const [y0, r0] = PROFILE[i];
  const [y1, r1] = PROFILE[i + 1];
  // the waist band reads darker, like shadowed tool-worn stone
  const color = i === 2 || i === 3 ? STONE_DARK : STONE;
  b.cyl(r1, r0, y1 - y0, 24, 0, (y0 + y1) / 2, 0, color);
}
// The open bowl — a dark recessed disc where the pounding happens.
b.cyl(0.58, 0.58, 0.05, 24, 0, 1.12, 0, STONE_DARK);

// ---- The pestle (អង្រែ) — hardwood, standing in the bowl -------------------
// Near-vertical, its working end sunk in the bowl as if left mid-pounding.
const TILT = 0.18; // radians from vertical
const LEN = 1.3;
const CX = 0.24, CY = 1.83; // shaft centre
b.cyl(0.07, 0.09, LEN, 12, CX, CY, 0, WOOD, [0, 0, -TILT]);
// Rounded ends at the shaft's tips (computed from the same tilt).
const dx = Math.sin(TILT) * (LEN / 2);
const dy = Math.cos(TILT) * (LEN / 2);
b.sphere(0.1, CX - dx, CY - dy, 0, WOOD); // pounding head, down in the bowl
b.sphere(0.085, CX + dx, CY + dy, 0, WOOD); // grip end

b.build(OUT, { scale: 1 });
