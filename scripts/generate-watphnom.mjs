/**
 * public/models/wat-phnom.glb (+ .splat) — the authored Wat Phnom model from
 * the shared composition (scripts/models/watphnom.mjs): the hilltop terrace,
 * orange-roofed vihara, great white stupa and naga staircase.
 * Run: node scripts/generate-watphnom.mjs
 */
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createBuilder } from "./lib/temple.mjs";
import { composeWatPhnom, WATPHNOM_SCALE } from "./models/watphnom.mjs";

const dir = resolve(dirname(fileURLToPath(import.meta.url)), "../public/models");
const b = createBuilder();
composeWatPhnom(b);
b.build(resolve(dir, "wat-phnom.glb"), { scale: WATPHNOM_SCALE });
b.buildSplat(resolve(dir, "wat-phnom.splat"), { modelScale: WATPHNOM_SCALE, splatScale: 0.05, count: 42000 });
