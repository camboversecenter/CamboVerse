/**
 * Shared Angkor Wat composition, used by both the glTF and the splat generators
 * so they never diverge. West-facing (front = +z): a long outer galleried
 * enclosure with corner gopuras and a colonnade, a western entrance gopura and
 * a long causeway, and a stepped inner "temple-mountain" carrying the iconic
 * five-tower quincunx. Elongated to match Angkor Wat's real proportions.
 */
import { SAND, DARK_SAND } from "../lib/temple.mjs";

export const ANGKOR_SCALE = 0.42;

export function composeAngkor(b) {
  // --- Outer plinth + terrace (long W–E) ---
  b.box(12.0, 0.5, 7.8, 0, 0.25, 0, DARK_SAND);
  b.box(11.2, 0.4, 7.0, 0, 0.7, 0, SAND);

  // --- Outer gallery walls (enclosure at the edges) with cornice ---
  const gx = 5.2, gz = 3.1, wy = 1.5;
  for (const [x, z, w, d] of [
    [0, gz, 10.6, 0.32], [0, -gz, 10.6, 0.32],
    [gx, 0, 0.32, 6.5], [-gx, 0, 0.32, 6.5],
  ]) {
    b.box(w, 1.1, d, x, wy, z, SAND);
    b.box(w * 1.03, 0.14, d * 1.03, x, wy + 0.62, z, DARK_SAND);
  }

  // Colonnade along the long front and back galleries.
  for (let x = -4.6; x <= 4.6; x += 0.92) {
    b.cyl(0.11, 0.13, 1.0, 8, x, 1.45, gz - 0.3, SAND);
    b.cyl(0.11, 0.13, 1.0, 8, x, 1.45, -gz + 0.3, SAND);
  }

  // Corner gopura towers.
  for (const [x, z] of [[gx, gz], [-gx, gz], [gx, -gz], [-gx, -gz]]) {
    b.tower(x, z, 0.7, 0.9, 1.9, 6);
  }

  // --- Western entrance gopura + long causeway (front, +z) ---
  b.box(3.0, 1.7, 1.1, 0, 1.75, gz, SAND);
  b.tower(0, gz, 1.0, 2.6, 1.7, 5);
  b.box(2.4, 0.32, 6.2, 0, 0.46, gz + 3.6, SAND); // causeway
  b.box(0.18, 0.42, 6.2, 1.15, 0.62, gz + 3.6, DARK_SAND);
  b.box(0.18, 0.42, 6.2, -1.15, 0.62, gz + 3.6, DARK_SAND);

  // --- Inner stepped temple-mountain (centre, slightly back) ---
  const cz = -0.3;
  b.box(6.6, 0.7, 4.8, 0, 1.05, cz, SAND);
  b.box(5.2, 0.7, 3.6, 0, 1.7, cz, SAND);
  b.box(4.0, 0.6, 2.8, 0, 2.25, cz, SAND);
  const top = 2.55;

  // --- Five-tower quincunx (central tallest) ---
  b.tower(0, cz, 1.5, top, 4.6, 8);
  for (const [x, z] of [[1.7, cz + 1.1], [-1.7, cz + 1.1], [1.7, cz - 1.1], [-1.7, cz - 1.1]]) {
    b.tower(x, z, 0.95, top, 2.9, 7);
  }
}
