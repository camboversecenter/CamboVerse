/**
 * public/models/royal-palace.glb — an authored, recognizable Royal Palace
 * (Phnom Penh): the Throne Hall with cream walls, steep tiered Khmer roofs, and
 * a tall gilded central spire (with smaller end spires), on a terrace. Uses the
 * shared temple builder with cream/gold/roof tones. Stylized stand-in.
 * Run: `node scripts/generate-royalpalace.mjs`
 */
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createBuilder, CREAM, GOLD, ROOF, DARK_SAND } from "./lib/temple.mjs";

const OUT = resolve(dirname(fileURLToPath(import.meta.url)), "../public/models/royal-palace.glb");
const b = createBuilder();

// Terrace.
b.box(8.5, 0.5, 6.0, 0, 0.25, 0, CREAM);
b.box(7.2, 0.4, 4.8, 0, 0.7, 0, CREAM);

// Throne Hall body with a suggested colonnade.
b.box(5.2, 2.2, 3.0, 0, 2.0, 0, CREAM);
for (let i = -2; i <= 2; i++) {
  b.cyl(0.16, 0.18, 1.8, 8, i * 1.1, 1.8, 1.55, CREAM); // front columns
}
b.box(5.4, 0.25, 3.2, 0, 3.15, 0, DARK_SAND); // eave band

/** A steep tiered Khmer roof (stacked square pyramids) capped by a spire. */
function tieredRoof(cx, cz, w, y0, tiers, spireH, spireR) {
  let y = y0;
  let rw = w;
  for (let i = 0; i < tiers; i++) {
    b.cone(rw * 0.82, rw * 0.55, 4, cx, y + rw * 0.275, cz, ROOF, [0, Math.PI / 4, 0]);
    y += rw * 0.42;
    rw *= 0.62;
  }
  // gilded spire
  b.cyl(spireR, spireR * 1.3, 0.3, 8, cx, y + 0.15, cz, GOLD);
  b.cyl(spireR * 0.7, spireR, 0.3, 8, cx, y + 0.45, cz, GOLD);
  b.cone(spireR * 0.8, spireH, 8, cx, y + 0.6 + spireH / 2, cz, GOLD);
  b.cone(spireR * 0.28, spireH * 0.4, 6, cx, y + 0.6 + spireH + 0.1, cz, GOLD);
}

// Central grand roof + spire, and two smaller end roofs.
tieredRoof(0, 0, 3.4, 3.3, 3, 1.8, 0.34);
tieredRoof(-2.0, 0, 1.5, 3.3, 2, 1.0, 0.18);
tieredRoof(2.0, 0, 1.5, 3.3, 2, 1.0, 0.18);

// Perimeter wall with a gateway suggestion (front).
b.box(8.5, 0.9, 0.2, 0, 0.95, 3.0, CREAM);
b.box(0.2, 0.9, 6.0, 4.15, 0.95, 0, CREAM);
b.box(0.2, 0.9, 6.0, -4.15, 0.95, 0, CREAM);

b.build(OUT, { scale: 0.6 });
