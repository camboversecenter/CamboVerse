/**
 * Shared Wat Phnom composition, used by both the glTF and splat generators.
 *
 * Wat Phnom is a hilltop temple in Phnom Penh (front = +z, where the grand
 * naga staircase descends): a raised terrace carrying an orange-roofed vihara,
 * crowned behind by the great white conical stupa (chedi), with small gold
 * shrines, a descending naga stairway, and guardian lions. The wooded hill,
 * flower clock and surrounding city are drawn separately (WatPhnomLandscape).
 */
import { CREAM, GOLD } from "../lib/temple.mjs";

export const WATPHNOM_SCALE = 0.5;

const WHITE = [0.85, 0.84, 0.78]; // whitewashed stupa
const ORANGE = [0.8, 0.42, 0.13]; // tiled roof
const RED = [0.48, 0.2, 0.16]; // laterite steps
const STONE = [0.66, 0.62, 0.52];

export function composeWatPhnom(b) {
  // --- Hilltop terrace ---
  b.box(10.6, 0.3, 9.1, 0, 0.15, 0, STONE);
  b.box(10.0, 0.5, 8.5, 0, 0.55, 0, CREAM);

  // --- Main vihara (temple hall), slightly back of centre ---
  const vz = -0.5;
  b.box(5.6, 0.3, 4.2, 0, 0.95, vz, STONE); // base molding
  b.box(5.2, 2.1, 3.8, 0, 2.05, vz, CREAM); // walls
  // Columns along the front porch
  for (let x = -2.2; x <= 2.2; x += 0.88) {
    b.cyl(0.16, 0.18, 1.9, 8, x, 2.0, vz + 2.0, CREAM);
  }
  // Dark doorway recess
  b.box(1.0, 1.5, 0.3, 0, 1.85, vz + 1.92, [0.2, 0.16, 0.12]);
  // Tiered orange hip roof (stepped, Khmer style)
  const roof = [
    [5.9, 0.4, 4.5, 3.35],
    [4.7, 0.4, 3.5, 3.75],
    [3.5, 0.4, 2.5, 4.15],
    [2.3, 0.35, 1.5, 4.5],
  ];
  for (const [w, h, d, y] of roof) {
    b.box(w, h, d, 0, y, vz, ORANGE);
    b.box(w * 1.04, 0.1, d * 1.04, 0, y + h / 2, vz, [0.4, 0.2, 0.09]); // ridge trim
  }
  // Gold finial spire + ridge horns (chofah)
  b.cone(0.34, 1.3, 8, 0, 5.35, vz, GOLD);
  b.cone(0.08, 0.4, 6, 0, 6.1, vz, GOLD);
  for (const dz of [-1, 1]) {
    b.cone(0.12, 0.7, 6, 0, 4.75, vz + dz * 1.9, GOLD, [dz * 0.5, 0, 0]);
  }

  // --- Great white stupa (chedi) behind the vihara — the tallest element ---
  const sz = -4.4;
  b.box(3.4, 1.0, 3.4, 0, 1.1, sz, WHITE); // square base
  b.box(2.7, 0.5, 2.7, 0, 1.85, sz, WHITE);
  b.box(2.1, 0.45, 2.1, 0, 2.32, sz, WHITE);
  b.cyl(1.5, 1.7, 0.7, 20, 0, 2.9, sz, WHITE); // drum
  // Tall ridged white spire (banding rings + smooth cone)
  for (const [r, y] of [[1.35, 3.5], [1.12, 4.0], [0.9, 4.5], [0.68, 5.0]]) {
    b.cyl(r, r + 0.12, 0.2, 20, 0, y, sz, WHITE);
  }
  b.cone(0.62, 4.2, 20, 0, 7.3, sz, WHITE); // upper spire
  b.cone(0.1, 0.6, 8, 0, 9.6, sz, GOLD); // gilded tip

  // --- Small gold-roofed shrines at the back terrace corners ---
  for (const dx of [-1, 1]) {
    const x = dx * 3.7;
    b.box(1.3, 1.4, 1.3, x, 1.5, -3.4, CREAM);
    b.cone(1.1, 1.2, 4, x, 2.85, -3.4, GOLD, [0, Math.PI / 4, 0]);
    b.cone(0.08, 0.4, 6, x, 3.7, -3.4, GOLD);
  }
  // --- Small white satellite stupas at the front terrace corners ---
  for (const dx of [-1, 1]) {
    const x = dx * 3.6;
    b.box(0.9, 0.7, 0.9, x, 0.95, 2.9, WHITE);
    b.cone(0.5, 1.6, 12, x, 2.1, 2.9, WHITE);
    b.cone(0.06, 0.3, 6, x, 3.05, 2.9, GOLD);
  }

  // --- Grand naga staircase descending the front (+z) slope ---
  let z = 4.7;
  let y = 0.45;
  for (let i = 0; i < 9; i++) {
    b.box(3.2, 0.34, 0.56, 0, y, z, RED);
    for (const dx of [-1, 1]) {
      b.box(0.34, 0.6, 0.56, dx * 1.72, y + 0.2, z, CREAM); // balustrade
    }
    z += 0.55;
    y -= 0.42;
  }
  // Naga heads rearing at the foot of the stairs
  for (const dx of [-1, 1]) {
    const x = dx * 1.72;
    b.box(0.5, 1.5, 0.4, x, -2.4, z + 0.1, CREAM); // rearing body
    b.cone(0.55, 0.7, 7, x, -1.5, z + 0.1, CREAM); // fanned hood
  }
  // Guardian lions at the very base
  for (const dx of [-1, 1]) {
    b.box(0.5, 0.8, 0.6, dx * 2.5, -2.7, z + 0.2, STONE);
  }
}
