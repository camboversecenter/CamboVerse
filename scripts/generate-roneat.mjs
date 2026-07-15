/**
 * public/models/roneat.glb — រនាតឯក (Roneat Ek), the lead xylophone of the
 * Khmer Pinpeat ensemble: 21 tuned bars suspended by cord over a carved,
 * boat-shaped wooden resonator with gilded, up-sweeping naga-tail ends, on a
 * stand, with two mallets resting on the bars.
 *
 * A stylized, licence-clean stand-in (CC-BY) authored by the CamboVerse Center.
 * Run: `node scripts/generate-roneat.mjs`
 */
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createBuilder } from "./lib/temple.mjs";

const OUT = resolve(dirname(fileURLToPath(import.meta.url)), "../public/models/roneat.glb");
const b = createBuilder();

const WOOD = [0.3, 0.22, 0.15]; // dark carved hardwood
const GOLD = [0.82, 0.6, 0.2]; // gilding
const BAMBOO = [0.8, 0.68, 0.42]; // tuned bars
const CORD = [0.12, 0.1, 0.08];
const H = Math.PI / 2;

// ---- Stand ------------------------------------------------------------------
b.box(2.5, 0.16, 0.6, 0, 0.08, 0, WOOD); // foot
b.box(0.22, 1.0, 0.55, -1.05, 0.6, 0, WOOD); // end legs
b.box(0.22, 1.0, 0.55, 1.05, 0.6, 0, WOOD);
b.box(0.26, 0.14, 0.6, -1.05, 1.12, 0, GOLD); // gilded leg caps
b.box(0.26, 0.14, 0.6, 1.05, 1.12, 0, GOLD);

// ---- Boat-shaped resonator body ---------------------------------------------
b.cyl(0.34, 0.34, 2.15, 22, 0, 1.2, 0, WOOD, [0, 0, H]); // rounded trough (axis → x)
b.box(2.15, 0.06, 0.52, 0, 1.52, 0, GOLD); // gilded top rail beneath the bars
// Naga-tail ends sweeping up and out.
b.cone(0.13, 0.85, 6, -1.28, 1.72, 0, GOLD, [0, 0, 0.7]);
b.cone(0.13, 0.85, 6, 1.28, 1.72, 0, GOLD, [0, 0, -0.7]);

// ---- 21 tuned bars across the top -------------------------------------------
const N = 21;
for (let i = 0; i < N; i++) {
  const t = i / (N - 1);
  const x = -0.95 + t * 1.9;
  const len = 0.5 - 0.17 * t; // longer bars (lower notes) at one end
  b.box(0.07, 0.05, len, x, 1.57, 0, BAMBOO);
}
// Suspending cords running the length of the row.
b.box(1.95, 0.02, 0.02, 0, 1.55, 0.18, CORD);
b.box(1.95, 0.02, 0.02, 0, 1.55, -0.18, CORD);

// ---- Two mallets resting on the bars ----------------------------------------
b.cyl(0.02, 0.02, 0.5, 6, 0.05, 1.63, 0.3, BAMBOO, [H, 0, 0]); // shafts (axis → z)
b.sphere(0.05, 0.05, 1.63, 0.02, WOOD);
b.cyl(0.02, 0.02, 0.5, 6, 0.28, 1.63, 0.3, BAMBOO, [H, 0, 0]);
b.sphere(0.05, 0.28, 1.63, 0.02, WOOD);

b.build(OUT, { scale: 1 });
