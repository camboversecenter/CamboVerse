/**
 * public/models/neangkoal.glb — នង្គ័ល (neangkoal), the Khmer wooden plough:
 * a wooden sole with an iron share at its nose, a single rear handle, and a
 * long beam sweeping up to the neck-yoke for a pair of oxen or buffalo. Warm
 * wood tones with a dark iron tip, using the shared builder.
 *
 * A stylized, licence-clean stand-in (CC-BY) authored by the CamboVerse Center,
 * pending a real capture from a farming family (with consent).
 * Run: `node scripts/generate-neangkoal.mjs`
 */
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createBuilder, WOOD } from "./lib/temple.mjs";

const OUT = resolve(dirname(fileURLToPath(import.meta.url)), "../public/models/neangkoal.glb");
const b = createBuilder();

const LIGHT = [0.55, 0.44, 0.28];
const IRON = [0.22, 0.22, 0.25];

// ---- Sole — the wooden body that runs in the furrow ------------------------
b.box(1.2, 0.15, 0.13, 0.05, 0.1, 0, WOOD);
// Iron share (ផាល) at the nose, pointing forward (+x).
b.cone(0.1, 0.42, 8, 0.82, 0.11, 0, IRON, [0, 0, -Math.PI / 2]);

// ---- Handle — a single post the ploughman steers one-handed ----------------
// (tilted back from the rear of the sole)
b.cyl(0.045, 0.06, 1.15, 10, -0.62, 0.62, 0, WOOD, [0, 0, 0.38]);
// cross-grip at the top
b.cyl(0.035, 0.035, 0.34, 8, -0.83, 1.15, 0, WOOD, [Math.PI / 2, 0, 0]);

// ---- Beam — the long pole sweeping forward and up to the yoke --------------
const BEAM_TILT = 1.05; // radians from vertical → mostly horizontal, rising
const BEAM_LEN = 1.95;
const BX = 0.72, BY = 0.56;
b.cyl(0.05, 0.07, BEAM_LEN, 10, BX, BY, 0, WOOD, [0, 0, -BEAM_TILT]);
const bx = BX + Math.sin(BEAM_TILT) * (BEAM_LEN / 2);
const by = BY + Math.cos(BEAM_TILT) * (BEAM_LEN / 2);

// ---- Yoke (នឹម) — the neck bar for the pair of oxen ------------------------
b.cyl(0.05, 0.05, 1.15, 10, bx, by + 0.02, 0, LIGHT, [Math.PI / 2, 0, 0]);
for (const z of [-0.42, 0.42]) {
  b.cyl(0.028, 0.028, 0.26, 6, bx, by - 0.12, z, LIGHT); // neck pegs
}
// rattan lashing where beam and yoke meet
b.sphere(0.085, bx, by, 0, IRON, 0.8);

b.build(OUT, { scale: 0.95 });
