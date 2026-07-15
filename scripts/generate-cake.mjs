/**
 * public/models/ansom.glb — អន្សម (ansom), the iconic Khmer sticky-rice cake:
 * glutinous rice wrapped around a filling in a banana-leaf roll, tied with
 * strips, and steamed for hours. Modelled as a woven tray holding two whole
 * banana-leaf rolls plus one cut piece that reveals the rice and banana filling.
 *
 * A stylized, licence-clean stand-in (CC-BY) authored by the CamboVerse Center.
 * Run: `node scripts/generate-cake.mjs`
 */
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createBuilder } from "./lib/temple.mjs";

const OUT = resolve(dirname(fileURLToPath(import.meta.url)), "../public/models/ansom.glb");
const b = createBuilder();

const LEAF = [0.3, 0.45, 0.2]; // banana leaf
const LEAF_DARK = [0.2, 0.32, 0.14]; // ties / folds / shadowed leaf
const RICE = [0.9, 0.88, 0.8]; // glutinous rice
const BANANA = [0.86, 0.72, 0.34]; // sweet filling (banana / mung bean)
const WOOD = [0.37, 0.3, 0.22];
const TRAY = [0.72, 0.58, 0.36]; // woven bamboo tray

const H = Math.PI / 2; // lay a cylinder on its side (axis → x)

// ---- Serving stand + woven tray + banana-leaf lining ------------------------
b.cyl(0.55, 0.75, 1.0, 16, 0, 0.5, 0, WOOD); // short pedestal
b.cyl(1.55, 1.42, 0.2, 30, 0, 1.05, 0, TRAY); // shallow tray
b.cyl(1.44, 1.42, 0.06, 30, 0, 1.14, 0, LEAF_DARK); // leaf lining
b.cyl(1.5, 1.46, 0.08, 30, 0, 1.06, 0, LEAF); // tray rim

/** A whole banana-leaf ansom roll lying along x, tied with strips. */
function roll(z) {
  b.cyl(0.42, 0.42, 1.7, 22, 0, 1.6, z, LEAF, [0, 0, H]);
  // folded leaf ends
  b.box(0.14, 0.5, 0.5, -0.9, 1.6, z, LEAF_DARK);
  b.box(0.14, 0.5, 0.5, 0.9, 1.6, z, LEAF_DARK);
  // three ties around the roll
  for (const x of [-0.5, 0, 0.5]) b.cyl(0.45, 0.45, 0.09, 20, x, 1.6, z, LEAF_DARK, [0, 0, H]);
}
roll(-0.45);
roll(0.15);

// ---- One cut piece standing up, revealing the filling -----------------------
b.cyl(0.4, 0.42, 0.8, 22, 0, 1.55, 0.85, LEAF); // leaf-wrapped body
b.cyl(0.33, 0.33, 0.12, 22, 0, 1.92, 0.85, RICE); // glutinous rice, cut face
b.cyl(0.13, 0.13, 0.14, 16, 0, 1.95, 0.85, BANANA); // banana / mung-bean centre

b.build(OUT, { scale: 1 });
