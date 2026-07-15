/**
 * public/models/skor.glb — ស្គរ (skor), a Khmer two-headed barrel drum: a
 * hardwood barrel headed at both ends with stretched hide, laced with cord,
 * cradled on a wooden stand. The rhythm of the Pinpeat ensemble and ceremonies.
 *
 * A stylized, licence-clean stand-in (CC-BY) authored by the CamboVerse Center.
 * Run: `node scripts/generate-skor.mjs`
 */
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createBuilder } from "./lib/temple.mjs";

const OUT = resolve(dirname(fileURLToPath(import.meta.url)), "../public/models/skor.glb");
const b = createBuilder();

const WOOD = [0.42, 0.2, 0.14]; // red-brown barrel
const SKIN = [0.86, 0.78, 0.6]; // drumhead hide
const LACE = [0.2, 0.16, 0.1]; // tension cords
const GOLD = [0.82, 0.6, 0.2];
const H = Math.PI / 2;
const CY = 1.25; // barrel centre height

// ---- Stand (base ring + two cradling uprights) ------------------------------
b.cyl(0.72, 0.88, 0.14, 22, 0, 0.07, 0, WOOD);
b.box(0.16, 1.15, 0.6, -0.5, 0.66, 0, WOOD);
b.box(0.16, 1.15, 0.6, 0.5, 0.66, 0, WOOD);

// ---- Barrel body (axis → x), bulging in the middle --------------------------
b.cyl(0.6, 0.6, 0.5, 26, 0, CY, 0, WOOD, [0, 0, H]);
b.cyl(0.56, 0.56, 0.35, 26, 0.42, CY, 0, WOOD, [0, 0, H]);
b.cyl(0.56, 0.56, 0.35, 26, -0.42, CY, 0, WOOD, [0, 0, H]);
b.cyl(0.49, 0.49, 0.2, 26, 0.75, CY, 0, WOOD, [0, 0, H]);
b.cyl(0.49, 0.49, 0.2, 26, -0.75, CY, 0, WOOD, [0, 0, H]);

// ---- Drumheads + gilded rim hoops -------------------------------------------
b.cyl(0.5, 0.5, 0.05, 26, 0.9, CY, 0, SKIN, [0, 0, H]);
b.cyl(0.5, 0.5, 0.05, 26, -0.9, CY, 0, SKIN, [0, 0, H]);
b.cyl(0.53, 0.53, 0.07, 26, 0.85, CY, 0, GOLD, [0, 0, H]);
b.cyl(0.53, 0.53, 0.07, 26, -0.85, CY, 0, GOLD, [0, 0, H]);

// ---- Cord lacing between the two heads ---------------------------------------
for (let k = 0; k < 12; k++) {
  const a = (k / 12) * Math.PI * 2;
  b.box(1.7, 0.025, 0.025, 0, CY + Math.cos(a) * 0.5, Math.sin(a) * 0.5, LACE);
}

b.build(OUT, { scale: 1 });
