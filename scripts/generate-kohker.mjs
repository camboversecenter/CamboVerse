/**
 * public/models/koh-ker.glb
 * Run: node scripts/generate-kohker.mjs
 */
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createBuilder, DARK_SAND, SAND } from "./lib/temple.mjs";

const OUT = resolve(dirname(fileURLToPath(import.meta.url)), "../public/models/koh-ker.glb");
const b = createBuilder();

// 7-tiered pyramid
const tiers = 7;
const baseW = 10.0;
const tierH = 0.8;

for (let i = 0; i < tiers; i++) {
  const w = baseW - (i * 1.1);
  const y = (i * tierH) + (tierH / 2);
  b.box(w, tierH, w, 0, y, 0, (i % 2 === 0) ? DARK_SAND : SAND);
}

// Small shrine on top
const topY = tiers * tierH;
b.box(1.5, 0.8, 1.5, 0, topY + 0.4, 0, DARK_SAND);
b.cone(1.5, 1.0, 4, 0, topY + 1.3, 0, SAND);

b.build(OUT, { scale: 0.6 });
