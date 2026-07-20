/**
 * public/models/chapei.glb — ចាប៉ីដងវែង (chapei dong veng), the Khmer
 * long-necked lute: a round, flat soundbox, a very long fretted neck with a
 * back-curving head and tuning pegs, and two strings. Displayed leaning as if
 * set down between songs. Warm wood tones with the shared builder.
 *
 * A stylized, licence-clean stand-in (CC-BY) authored by the CamboVerse Center,
 * pending a real capture from an instrument-maker (with consent).
 * Run: `node scripts/generate-chapei.mjs`
 */
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createBuilder, WOOD } from "./lib/temple.mjs";

const OUT = resolve(dirname(fileURLToPath(import.meta.url)), "../public/models/chapei.glb");
const b = createBuilder();

const LIGHT = [0.62, 0.5, 0.32]; // soundboard
const DARK = [0.24, 0.19, 0.14]; // frets, bridge, pegs
const STRING = [0.85, 0.82, 0.72];

// ---- Soundbox — a round, flat body facing the viewer (+z) ------------------
b.cyl(0.55, 0.55, 0.16, 24, 0, 0.55, 0, WOOD, [Math.PI / 2, 0, 0]);
b.cyl(0.48, 0.48, 0.03, 24, 0, 0.55, 0.09, LIGHT, [Math.PI / 2, 0, 0]); // soundboard
b.box(0.14, 0.045, 0.05, 0, 0.34, 0.12, DARK); // bridge

// ---- Neck — "dong veng" means long neck ------------------------------------
const TILT = 0.42; // lean from vertical, up and to the left
const NLEN = 1.9;
const NX = -0.55, NY = 1.45; // neck centre
b.cyl(0.035, 0.05, NLEN, 10, NX, NY, 0, WOOD, [0, 0, TILT]);
const ndx = -Math.sin(TILT) * (NLEN / 2);
const ndy = Math.cos(TILT) * (NLEN / 2);
const nutX = NX + ndx, nutY = NY + ndy; // top of the neck
const heelX = NX - ndx, heelY = NY - ndy; // where it meets the body

// Raised frets — tall wooden frets sit along the neck (stylized count).
for (let i = 0; i < 7; i++) {
  const t = 0.12 + i * 0.09; // fraction of the way up the neck from the heel
  const fx = heelX + (nutX - heelX) * t;
  const fy = heelY + (nutY - heelY) * t;
  b.cyl(0.014, 0.014, 0.11, 6, fx, fy, 0.045, DARK, [0, 0, TILT - Math.PI / 2]);
}

// ---- Head — curving back, with two tuning pegs (two strings) ---------------
b.cone(0.05, 0.36, 8, nutX - 0.12, nutY + 0.14, 0, WOOD, [0, 0, 1.15]);
for (const dz of [-0.09, 0.09]) {
  b.cyl(0.02, 0.02, 0.24, 6, nutX - 0.05, nutY + 0.02, dz, DARK, [Math.PI / 2, 0, 0]);
}

// ---- Two strings — bridge to nut, offset across the fingerboard ------------
const SLEN = Math.hypot(nutX - 0, nutY - 0.36);
const midX = (0 + nutX) / 2, midY = (0.36 + nutY) / 2;
const sTilt = Math.atan2(-(nutX - 0), nutY - 0.36); // lean of the string run
for (const off of [-0.022, 0.022]) {
  const px = Math.cos(sTilt) * off, py = Math.sin(sTilt) * off;
  b.cyl(0.008, 0.008, SLEN, 4, midX + px, midY + py, 0.1, STRING, [0, 0, sTilt]);
}

b.build(OUT, { scale: 0.95 });
