/**
 * public/models/angkor-wat.splat — a synthetic Gaussian-splat cloud of Angkor
 * Wat, sampled from the SAME shared composition as the glTF so they match. A
 * license-clean, self-contained stand-in to prototype the photoreal splat path
 * in the mobile web viewer (the real thing will be an actual 3DGS capture —
 * see docs/CAPTURE.md). Run: node scripts/generate-splat.mjs
 */
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createBuilder } from "./lib/temple.mjs";
import { composeAngkor, ANGKOR_SCALE } from "./models/angkor.mjs";

const OUT = resolve(dirname(fileURLToPath(import.meta.url)), "../public/models/angkor-wat.splat");
const b = createBuilder();
composeAngkor(b);
// Denser + smaller splats than the first prototype for a crisper look; still
// modest for low-end mobile. Photoreal sharpness will come from a real capture.
b.buildSplat(OUT, { modelScale: ANGKOR_SCALE, splatScale: 0.04, count: 45000 });
