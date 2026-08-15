/**
 * public/models/kantel.glb — កន្ទេល (Kantel), a traditional Khmer woven sleeping and sitting mat.
 * Made from sedge grass (កក់) or romchek (រំចេក), it is an essential household item
 * rolled out for sleeping, eating, or receiving guests.
 * 
 * A stylized, licence-clean stand-in (CC-BY) authored by the CamboVerse Center,
 * built from colored boxes and cylinders to form a partially rolled, striped mat.
 * Run: node scripts/generate-kantel.mjs
 */
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createBuilder } from "./lib/temple.mjs";

const OUT = resolve(dirname(fileURLToPath(import.meta.url)), "../public/models/kantel.glb");
const b = createBuilder();

// Vibrant dyed sedge grass colors
const NAT = [0.85, 0.78, 0.62]; // Natural dried grass
const RED = [0.65, 0.20, 0.20]; // Deep dyed red
const GRN = [0.25, 0.50, 0.25]; // Deep dyed green

// Mat dimensions
const THICK = 0.02; // very thin
const FLAT_LEN = 1.4; // The length of the unrolled part
const Z_START = -0.5; // Where the roll sits
const ROLL_RAD = 0.12;

// The striped bands (width, color, x_offset)
const BANDS = [
  { w: 0.08, c: RED, x: -0.56 },
  { w: 0.08, c: GRN, x: -0.48 },
  { w: 0.88, c: NAT, x: 0.00 },
  { w: 0.08, c: GRN, x: 0.48 },
  { w: 0.08, c: RED, x: 0.56 },
];

// 1. The flat unrolled section
BANDS.forEach(band => {
  b.box(band.w, THICK, FLAT_LEN, band.x, THICK / 2, Z_START + FLAT_LEN / 2, band.c);
});

// 2. The rolled up section at the top (Z = -0.5)
// Built from stacked cylinders to match the stripe colors
BANDS.forEach(band => {
  // b.cyl(rTop, rBottom, height, segments, x, y, z, color, rotation)
  // We rotate it 90 degrees around Z so it lies flat along the X axis
  b.cyl(ROLL_RAD, ROLL_RAD, band.w, 16, band.x, ROLL_RAD, Z_START, band.c, [0, 0, Math.PI / 2]);
});

b.build(OUT, { scale: 1 });
