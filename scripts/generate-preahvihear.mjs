/**
 * public/models/preah-vihear.glb — an authored, recognizable Preah Vihear: a
 * linear axial temple (causeway + gopura pavilions rising to a sanctuary tower)
 * perched on a rocky cliff-top plateau, evoking the Dângrêk escarpment. Uses the
 * shared temple builder. Stylized stand-in; photoreal via Gaussian splats later.
 * Run: `node scripts/generate-preahvihear.mjs`
 */
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createBuilder, SAND, DARK_SAND, ROCK } from "./lib/temple.mjs";

const OUT = resolve(dirname(fileURLToPath(import.meta.url)), "../public/models/preah-vihear.glb");
const b = createBuilder();

// --- Rocky cliff-top plateau (the temple stands elevated on a mesa) ---
b.box(9, 2.4, 6, 0, 1.2, 0, ROCK); // main plateau, top at y≈2.4
b.box(11, 1.6, 3, 0, 0.8, -2.6, ROCK); // higher ground behind
// broken boulders around the edges
for (const [x, y, z, s] of [[-4.2, 0.6, 2.6, 1.1], [4.4, 0.7, 2.2, 1.3], [3.8, 0.5, -2.4, 0.9], [-4.6, 0.6, -1.6, 1.0], [0, 0.4, 3.4, 1.2]]) {
  b.box(s, s, s, x, y, z, ROCK);
}

const top = 2.4;

// --- Axial temple on the plateau ---
b.box(1.9, 0.25, 6.6, 0, top + 0.12, 0.2, SAND); // causeway
b.box(0.16, 0.42, 6.6, 0.95, top + 0.33, 0.2, DARK_SAND); // naga balustrades
b.box(0.16, 0.42, 6.6, -0.95, top + 0.33, 0.2, DARK_SAND);

/** A gopura pavilion: walls + a stepped pyramidal roof + finial. */
function gopura(z, w, d, h) {
  b.box(w, h, d, 0, top + h / 2 + 0.25, z, SAND);
  b.box(w * 1.08, 0.14, d * 1.08, 0, top + h + 0.25, z, DARK_SAND); // cornice
  const ry = top + h + 0.32;
  b.cone(Math.max(w, d) * 0.78, h * 0.7, 4, 0, ry + (h * 0.7) / 2, z, DARK_SAND, [0, Math.PI / 4, 0]);
  b.cone(0.12, 0.35, 6, 0, ry + h * 0.7 + 0.15, z, DARK_SAND);
}

gopura(2.7, 2.6, 1.7, 1.3); // front gopura
gopura(0.2, 3.0, 2.0, 1.5); // middle gopura

// Main sanctuary tower at the back.
b.tower(0, -2.7, 1.3, top, 2.9, 6);

b.build(OUT, { scale: 0.55 });
