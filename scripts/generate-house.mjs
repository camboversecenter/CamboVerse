/**
 * public/models/phteah.glb — ផ្ទះខ្មែរ (phteah Khmer), a traditional Khmer
 * wooden stilt house: sturdy posts raising a plank-walled living floor with
 * shuttered windows, an open front veranda reached by a steep staircase, and a
 * steep gabled tiled roof with upturned finials. Weathered wood + red-brown tile.
 *
 * A stylized, licence-clean stand-in (CC-BY) authored by the CamboVerse Center,
 * pending a real capture. Built only from box/cyl/cone (no box rotation is
 * available, so the gable roof is a stack of tile courses — which also reads as
 * rows of roof tiles). Run: `node scripts/generate-house.mjs`
 */
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createBuilder } from "./lib/temple.mjs";

const OUT = resolve(dirname(fileURLToPath(import.meta.url)), "../public/models/phteah.glb");
const b = createBuilder();

const POST = [0.3, 0.24, 0.18]; // dark hardwood posts
const WOOD = [0.37, 0.3, 0.22]; // floor / rails / stairs
const WALL = [0.47, 0.43, 0.37]; // weathered grey-brown planks
const SHUTTER = [0.42, 0.47, 0.52]; // blue-grey shutters
const TILE = [0.5, 0.29, 0.2]; // red-brown roof tile
const DARK = [0.08, 0.07, 0.06]; // openings / interior shadow

const FLOOR_Y = 2.5; // top of the raised floor
const WALL_H = 2.2;
const WALL_TOP = FLOOR_Y + 0.15 + WALL_H; // ≈ 4.85

// ---- Stilts (a grid of posts) + floor ---------------------------------------
for (const x of [-2.6, -0.87, 0.87, 2.6]) {
  for (const z of [-2.2, 0, 2.2]) {
    b.cyl(0.17, 0.19, FLOOR_Y + 0.1, 8, x, (FLOOR_Y + 0.1) / 2, z, POST);
  }
}
b.box(6.5, 0.3, 5.6, 0, FLOOR_Y, 0, WOOD); // floor platform

// ---- Walls: the enclosed room fills the back; the front is an open veranda ---
const WY = FLOOR_Y + 0.15 + WALL_H / 2; // wall centre
b.box(6.0, WALL_H, 0.18, 0, WY, -2.5, WALL); // back wall
b.box(0.18, WALL_H, 3.4, -2.9, WY, -0.8, WALL); // left wall
b.box(0.18, WALL_H, 3.4, 2.9, WY, -0.8, WALL); // right wall
// Front wall of the room (z = 0.9) with a central doorway.
b.box(2.2, WALL_H, 0.18, -1.9, WY, 0.9, WALL);
b.box(2.2, WALL_H, 0.18, 1.9, WY, 0.9, WALL);
b.box(1.2, 2.0, 0.1, 0, FLOOR_Y + 0.15 + 1.0, 0.9, DARK); // dark doorway

/** A shuttered window: a dark opening flanked by two shutter leaves. */
function windowOn(side, along, y) {
  // side: "left" | "right" | "back"
  if (side === "back") {
    b.box(1.1, 1.0, 0.12, along, y, -2.5, DARK);
    b.box(0.5, 1.0, 0.14, along - 0.32, y, -2.52, SHUTTER);
    b.box(0.5, 1.0, 0.14, along + 0.32, y, -2.52, SHUTTER);
  } else {
    const x = side === "left" ? -2.9 : 2.9;
    b.box(0.12, 1.0, 1.1, x, y, along, DARK);
    b.box(0.14, 1.0, 0.5, x, y, along - 0.32, SHUTTER);
    b.box(0.14, 1.0, 0.5, x, y, along + 0.32, SHUTTER);
  }
}
windowOn("left", -1.4, WY + 0.15);
windowOn("right", -1.4, WY + 0.15);
windowOn("back", -1.4, WY + 0.15);
windowOn("back", 1.4, WY + 0.15);

// ---- Veranda railing (front + open sides) -----------------------------------
b.box(6.0, 0.12, 0.12, 0, FLOOR_Y + 0.55, 2.5, WOOD); // front top rail
for (const x of [-2.4, -1.2, 0, 1.2, 2.4]) b.cyl(0.05, 0.05, 0.55, 6, x, FLOOR_Y + 0.3, 2.5, WOOD);

// ---- Staircase up to the veranda --------------------------------------------
const STEPS = 7;
for (let i = 0; i < STEPS; i++) {
  const y = 0.28 + i * ((FLOOR_Y - 0.1) / STEPS);
  const z = 3.6 - i * (1.15 / STEPS);
  b.box(1.5, 0.14, 0.42, 0, y, z, WOOD);
}
b.cyl(0.07, 0.07, 2.7, 6, -0.8, FLOOR_Y / 2 + 0.3, 3.05, WOOD, [0.4, 0, 0]); // stringers
b.cyl(0.07, 0.07, 2.7, 6, 0.8, FLOOR_Y / 2 + 0.3, 3.05, WOOD, [0.4, 0, 0]);

// ---- Steep gabled roof: a stack of tile courses (ridge along z) --------------
const ROOF_BASE = WALL_TOP; // ≈ 4.85
const RIDGE_Y = ROOF_BASE + 2.7;
const N = 16;
const HALF = 3.5; // eave half-width (overhangs the walls)
const DEPTH = 5.9; // front/back overhang
for (let i = 0; i < N; i++) {
  const w = HALF * (1 - i / N) + 0.12;
  const y = ROOF_BASE + (i + 0.5) * (2.7 / N);
  b.box(2 * w, (2.7 / N) * 1.15, DEPTH, 0, y, 0, TILE);
}
b.box(0.18, 0.18, DEPTH + 0.2, 0, RIDGE_Y, 0, WOOD); // ridge beam
// Wide fascia boards under the eaves.
b.box(2 * HALF + 0.2, 0.16, 0.16, 0, ROOF_BASE - 0.02, DEPTH / 2, WOOD);
b.box(2 * HALF + 0.2, 0.16, 0.16, 0, ROOF_BASE - 0.02, -DEPTH / 2, WOOD);
// Upturned finials (kbach) at the two ridge ends.
b.cone(0.12, 0.8, 6, 0, RIDGE_Y + 0.2, DEPTH / 2 + 0.1, TILE, [-0.7, 0, 0]);
b.cone(0.12, 0.8, 6, 0, RIDGE_Y + 0.2, -DEPTH / 2 - 0.1, TILE, [0.7, 0, 0]);

b.build(OUT, { scale: 1 });
