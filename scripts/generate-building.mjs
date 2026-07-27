/**
 * Build a stylized model of an ordinary Cambodian building from a small JSON
 * spec — the photo-to-virtual-building path.
 *
 *     node scripts/generate-building.mjs scripts/data/buildings/<name>.json
 *
 * CONTRIBUTING A BUILDING: docs/BUILDINGS.md walks through the whole path —
 * what to photograph, every spec field, the size budget, and the rules about
 * not naming or badging a real institution. Read it before writing a spec.
 *
 * WHY A SPEC AND NOT A MESH. The obvious approach to "make a building from a
 * photo" is photogrammetry or single-image reconstruction, and both are wrong
 * for this viewer: one needs a hundred overlapping photos, the other produces a
 * plausible-but-wrong lump, and both land a multi-megabyte textured mesh in a
 * scene whose entire model library is under seven megabytes and has to run on a
 * $150 Android over 4G (AGENTS.md → the three view modes).
 *
 * What a photograph reliably gives is TYPOLOGY: storeys, bays, roof kind,
 * balcony, colour, proportion. Those are the fifteen-odd numbers the hand-
 * authored generators in this folder are already made of. So a reader — a
 * person, or a vision model — writes them down as JSON, and this file turns any
 * such JSON into geometry from the same box/cylinder/cone vocabulary as every
 * temple here.
 *
 * The consequence is worth being blunt about: THE RESULT IS AN INTERPRETATION,
 * NOT A SURVEY. It is the right type of building at roughly the right
 * proportions, in the right architectural language. It is not a measured record
 * of the address it was photographed at, and a spec carries a `confidence`
 * block so the guesses stay visible rather than hardening into fact. Same
 * discipline as Grove's carbon figures being estimates and never credits.
 *
 * A spec is data, never code. A vision model that emitted a build script would
 * be a thing you have to run to find out what it does; a spec with a wrong
 * number is a one-character fix by somebody who can read a building.
 */
import { readFileSync } from "node:fs";
import { resolve, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { createBuilder } from "./lib/temple.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));

const specPath = process.argv[2];
if (!specPath) {
  console.error("usage: node scripts/generate-building.mjs <spec.json> [out.glb]");
  process.exit(1);
}
const spec = JSON.parse(readFileSync(resolve(specPath), "utf8"));
// A building destined for a PLACE must not carry its own ground: the scene
// draws one shared surface, and twenty baked aprons overlapping each other is
// both wrong and expensive. `--bare` is what a composed world consumes; the
// site-bearing build stays for the standalone hero render.
const BARE = process.argv.includes("--bare");
const stem = spec.id ?? basename(specPath, ".json");
const explicit = process.argv[3] && !process.argv[3].startsWith("--") ? process.argv[3] : null;
const OUT = resolve(
  explicit ?? resolve(__dirname, `../public/models/${stem}${BARE ? "-bare" : ""}.glb`),
);

/** #rrggbb → the linear-ish [r,g,b] triple the builder wants. */
function rgb(hex, fallback = [0.8, 0.8, 0.8]) {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex ?? ""));
  if (!m) return fallback;
  const n = parseInt(m[1], 16);
  return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255];
}

const b = createBuilder();

// ---- the spec, with defaults for everything a photo cannot show -------------
const d = spec.dimensions ?? {};
const W = d.widthM ?? 40;          // façade length
const D = d.depthM ?? 12;          // front-to-back; almost always a guess
const SH = d.storeyH ?? 3.5;       // floor-to-floor
const N = spec.storeys ?? 3;
const BAYS = spec.bays ?? Math.max(3, Math.round(W / 4));

const P = spec.palette ?? {};
const WALL = rgb(P.wall, [0.93, 0.91, 0.85]);
const TRIM = rgb(P.trim, [1, 1, 1]);
const ROOFC = rgb(P.roof, [0.62, 0.28, 0.26]);
const GLASS = rgb(P.glass, [0.16, 0.2, 0.24]);
const PLINTH = rgb(P.plinth, [0.78, 0.76, 0.72]);
const ACCENT = rgb(P.accent, TRIM);

const centre = spec.centrepiece ?? null;
const roof = spec.roof ?? { kind: "hipped-tile" };
const H = N * SH;                  // top of the wall
const half = W / 2;
const bayW = W / BAYS;

// Which bays the centre pavilion occupies, so the wings skip them.
const cBays = centre ? Math.min(centre.bays ?? 3, BAYS) : 0;
const cFrom = centre ? Math.floor((BAYS - cBays) / 2) : -1;
const cTo = centre ? cFrom + cBays : -1;
const inCentre = (i) => centre && i >= cFrom && i < cTo;
const cW = cBays * bayW;
const cProject = centre?.projectM ?? 1.2;
const cExtra = centre?.extraH ?? 2.0;

// ---- plinth and main block --------------------------------------------------
b.box(W + 1.2, 0.45, D + 1.2, 0, 0.22, 0, PLINTH);
b.box(W, H, D, 0, 0.45 + H / 2, 0, WALL);

// ---- storey bands: a cornice at every floor line ----------------------------
// Cheap and load-bearing for legibility — without the horizontal lines a
// four-storey block reads as one tall wall from any distance.
for (let s = 1; s <= N; s++) {
  const y = 0.45 + s * SH;
  b.box(W + 0.3, 0.18, D + 0.3, 0, y, 0, TRIM);
}

// ---- bays: pilaster, window, balustrade -------------------------------------
const front = D / 2;
const back = -D / 2;
for (let i = 0; i < BAYS; i++) {
  const x = -half + (i + 0.5) * bayW;

  // Pilasters sit on the bay JOINS, not the middle — a pilaster centred on a
  // window is the tell that a façade was generated rather than looked at.
  if (spec.pilasters !== false && i > 0) {
    const px = -half + i * bayW;
    if (!inCentre(i) && !inCentre(i - 1)) {
      b.box(0.3, H, 0.22, px, 0.45 + H / 2, front + 0.06, TRIM);
    }
  }
  if (inCentre(i)) continue;

  for (let s = 0; s < N; s++) {
    const sy = 0.45 + s * SH;
    if (s === 0 && spec.ground?.arcade) {
      // Ground floor: a recessed glazed arcade behind columns.
      // The glazing is the WIDE element and the column the narrow one. Drawn
      // the other way round — fat columns over a recessed pane — a glazed
      // ground floor reads as blank wall, which is what the first pass did.
      // NOTE the sign. At `front - 0.12` with a 0.2-deep box the pane sits
      // entirely BEHIND the wall face and is invisible — which is exactly what
      // the first two renders showed, and reads as "the generator ignored the
      // ground floor" rather than as a depth bug.
      b.box(bayW - 0.15, SH - 0.7, 0.22, x, sy + (SH - 0.7) / 2 + 0.1, front + 0.02, GLASS);
      b.box(0.26, SH - 0.4, 0.3, -half + i * bayW, sy + (SH - 0.4) / 2, front + 0.05, TRIM);
      continue;
    }
    // Upper floors: a paired window, then the balustrade in front of it.
    const winH = SH - 1.5;
    b.box(bayW - 1.0, winH, 0.12, x, sy + 0.75 + winH / 2, front + 0.03, GLASS);
    b.box(0.12, winH, 0.16, x, sy + 0.75 + winH / 2, front + 0.05, TRIM); // centre mullion
    if (spec.balustrade !== false) {
      b.box(bayW - 0.35, 0.55, 0.18, x, sy + 0.4, front + 0.16, TRIM);
      b.box(bayW - 0.35, 0.1, 0.26, x, sy + 0.72, front + 0.16, TRIM); // hand rail
    }
  }
  // The back is seen from the map and from the air, so it is not left blank —
  // but it is plainer, because a single photograph of the front says nothing
  // about it and inventing detail there would be inventing evidence.
  for (let s = 1; s < N; s++) {
    const sy = 0.45 + s * SH;
    b.box(bayW - 1.2, SH - 1.8, 0.1, x, sy + 0.85 + (SH - 1.8) / 2, back - 0.02, GLASS);
  }
}

// ---- canopy over the ground floor ------------------------------------------
if (spec.canopy) {
  const cy = 0.45 + (spec.canopy.level ?? 1) * SH;
  const dep = spec.canopy.depthM ?? 1.5;
  for (let k = 0; k < 3; k++) {
    b.box(W + 0.6 - k * 0.2, 0.16, D + dep * 2 - k * dep * 0.55, 0, cy + 0.1 + k * 0.14, 0, ROOFC);
  }
}

// ---- the centre pavilion ----------------------------------------------------
if (centre) {
  const cx = -half + (cFrom + cBays / 2) * bayW;
  const cH = H + cExtra;
  const cD = D + cProject * 2;
  b.box(cW, cH, cD, cx, 0.45 + cH / 2, 0, WALL);

  // Giant order: columns running the full height, which is what makes a
  // Cambodian institutional entrance read as one.
  for (let k = 0; k <= cBays; k++) {
    const px = cx - cW / 2 + k * bayW;
    b.box(0.44, cH - 0.6, 0.44, px, 0.45 + (cH - 0.6) / 2, cD / 2 + 0.12, TRIM);
  }
  for (let s = 1; s < N; s++) {
    const sy = 0.45 + s * SH;
    const winH = SH - 1.5;
    b.box(cW - 2.2, winH, 0.12, cx, sy + 0.75 + winH / 2, cD / 2 + 0.03, GLASS);
    b.box(cW - 1.8, 0.55, 0.2, cx, sy + 0.4, cD / 2 + 0.18, TRIM);
  }
  // Ground-floor entrance.
  b.box(cW - 1.6, SH - 0.8, 0.14, cx, 0.45 + (SH - 0.8) / 2, cD / 2 - 0.2, GLASS);

  // Pediment: stacked shrinking courses, because the builder has no box
  // rotation — which also reads as the stepped tile courses of a real gable.
  if (centre.pediment !== false) {
    const pedY = 0.45 + cH;
    const steps = 9;
    for (let k = 0; k < steps; k++) {
      const w = cW * (1 - k / steps) * 0.98;
      b.box(w, 0.3, cD + 0.5 - k * 0.02, cx, pedY + 0.15 + k * 0.3, 0, k === 0 ? TRIM : ROOFC);
    }
    // The name board and seal every one of these buildings carries.
    b.box(cW * 0.62, 0.5, 0.12, cx, pedY + 0.55, cD / 2 + 0.3, TRIM);
    if (centre.emblem !== false) {
      b.cyl(0.52, 0.52, 0.14, 16, cx, pedY + 1.45, cD / 2 + 0.28, ACCENT, [Math.PI / 2, 0, 0]);
      b.cyl(0.4, 0.4, 0.16, 16, cx, pedY + 1.45, cD / 2 + 0.3, TRIM, [Math.PI / 2, 0, 0]);
    }
    if (centre.spire !== false) {
      const ty = pedY + steps * 0.3;
      b.box(1.0, 0.3, 1.0, cx, ty + 0.15, 0, TRIM);
      b.cone(0.42, 1.1, 8, cx, ty + 0.85, 0, ROOFC);
      b.cone(0.14, 0.7, 6, cx, ty + 1.7, 0, ACCENT);
    }
  }
}

// ---- hipped tile roof -------------------------------------------------------
// Stacked, shrinking courses. A hipped roof from boxes is a staircase up close
// and a hipped roof from thirty metres, which is the only distance anything in
// this scene is seen from.
if ((roof.kind ?? "hipped-tile").startsWith("hipped")) {
  const eave = roof.eaveOverhangM ?? 0.9;
  const pitchH = roof.heightM ?? 3.0;
  const courses = roof.courses ?? 10;
  const y0 = 0.45 + H;
  b.box(W + eave * 2, 0.3, D + eave * 2, 0, y0 + 0.15, 0, ROOFC); // fascia
  for (let k = 0; k < courses; k++) {
    const t = k / courses;
    const w = W + eave * 2 - t * (eave * 2 + D * 0.55);
    const dd = D + eave * 2 - t * (D + eave * 2) * 0.72;
    b.box(w, pitchH / courses + 0.06, dd, 0, y0 + 0.3 + (k + 0.5) * (pitchH / courses), 0, ROOFC);
  }
  // Upturned finials at the hip ends — the detail that makes an otherwise
  // ordinary block unmistakably Khmer, and the one thing worth spending
  // triangles on.
  if (roof.finials !== false) {
    const ridgeY = y0 + 0.3 + pitchH;
    const ridgeHalf = (W - D * 0.55) / 2;
    for (const s of [-1, 1]) {
      b.cone(0.3, 2.4, 6, s * ridgeHalf, ridgeY + 0.9, 0, ACCENT, [0, 0, s * -0.5]);
      b.cone(0.14, 1.1, 6, s * (ridgeHalf + 1.0), ridgeY + 1.95, 0, ACCENT, [0, 0, s * -0.95]);
    }
    b.box(W - D * 0.55, 0.24, 0.5, 0, ridgeY + 0.1, 0, ROOFC); // ridge cap
  }
}

// ---- the site: paving, lawn, kerbs, planting --------------------------------
// A building alone floats. What makes the render read as a PLACE is the ground
// it stands on — and in the photograph that ground is very specific: a wide
// pale concrete apron, lawn strips edged with kerbs, and rows of young staked
// trees that have obviously been in about a season.
//
// This is geometry, not scenery dressing: it goes in the same glb, costs a few
// hundred verts per tree, and needs no runtime, no textures and no downloads.
if (spec.site && !BARE) {
  const s = spec.site;
  const SITE = {
    paving: rgb(s.palette?.paving, [0.82, 0.8, 0.75]),
    lawn: rgb(s.palette?.lawn, [0.42, 0.6, 0.2]),
    kerb: rgb(s.palette?.kerb, [0.86, 0.85, 0.81]),
    trunk: rgb(s.palette?.trunk, [0.4, 0.33, 0.25]),
    leaf: rgb(s.palette?.leaf, [0.29, 0.47, 0.19]),
    leafLight: rgb(s.palette?.leafLight, [0.4, 0.58, 0.24]),
    stake: rgb(s.palette?.stake, [0.62, 0.55, 0.4]),
  };

  const apron = s.forecourtM ?? 40;
  const across = s.widthM ?? W + 30;
  // Paving sits a whisker below zero so it never z-fights the plinth.
  b.box(across, 0.12, apron, 0, -0.06, D / 2 + apron / 2, SITE.paving);

  if (s.lawn) {
    const lz = D / 2 + (s.lawn.offsetM ?? 8);
    const ld = s.lawn.depthM ?? 9;
    const lw = s.lawn.widthM ?? across * 0.8;
    b.box(lw, 0.1, ld, 0, 0.02, lz + ld / 2, SITE.lawn);
    if (s.lawn.kerb !== false) {
      // A kerb is two thin strips, and it is what stops a green rectangle
      // reading as a bug in the ground plane.
      b.box(lw + 0.4, 0.16, 0.25, 0, 0.05, lz - 0.1, SITE.kerb);
      b.box(lw + 0.4, 0.16, 0.25, 0, 0.05, lz + ld + 0.1, SITE.kerb);
    }
  }

  /**
   * A young planted tree: slender trunk, a sparse canopy of clumps, and the
   * stake it is still tied to.
   *
   * The stake matters more than it sounds. Every tree in a new Cambodian
   * forecourt is staked, and leaving it off is what makes CGI planting look
   * like it grew there on its own — the giveaway that nobody looked at a photo.
   */
  function tree(x, z, h, seed, kind = "young-broadleaf") {
    // Deterministic jitter: same spec in, same model out, so a rebuild is a
    // no-op in git rather than a diff of random numbers.
    const r = (n) => 0.5 + 0.5 * Math.sin(seed * 12.9898 + n * 78.233);
    const lean = (r(1) - 0.5) * 0.06;

    // Honest limit: this produces a passable palm at distance and a spiky star
    // up close, because a frond is a folded ribbon along a curve and all this
    // vocabulary has is cones. src/components/GrovePlants.tsx already builds
    // real fronds for the Grove Garden at runtime — for anything where a palm
    // is in the foreground, place it from there rather than baking it here.
    if (kind === "palm") {
      const seg = 7;
      for (let k = 0; k < seg; k++) {
        const t = k / seg;
        b.cyl(0.13 - t * 0.03, 0.16 - t * 0.03, h / seg + 0.04, 6,
          x + lean * k, (k + 0.5) * (h / seg), z, SITE.trunk);
      }
      // Fronds DROOP. Radiating them flat off the top gives a pole with a disc
      // on it — which is what a street lamp looks like, and was exactly what
      // the first render produced. The tilt below the horizontal is the whole
      // silhouette of a palm.
      const fronds = 11;
      for (let f = 0; f < fronds; f++) {
        const a = (f / fronds) * Math.PI * 2 + r(f) * 0.3;
        const len = h * 0.5 * (0.82 + r(f + 9) * 0.36);
        const droop = 0.5 + r(f + 4) * 0.35;      // radians below horizontal
        const reach = len * 0.45;
        b.cone(0.34, len, 6,
          x + Math.cos(a) * reach,
          h + 0.2 - Math.sin(droop) * len * 0.34,
          z + Math.sin(a) * reach,
          f % 2 ? SITE.leaf : SITE.leafLight,
          [Math.PI / 2 + droop, -a, 0]);
      }
      b.sphere(0.3, x, h + 0.25, z, SITE.trunk, 0.8, 5); // crown shaft
      return;
    }

    // Young broadleaf — the staked sapling in the photograph.
    b.cyl(0.07, 0.11, h * 0.62, 6, x, h * 0.31, z, SITE.trunk);
    const cy = h * 0.62;
    const clumps = 3;
    for (let k = 0; k < clumps; k++) {
      const a = (k / clumps) * Math.PI * 2 + r(k) * 0.9;
      const rad = h * (0.13 + r(k + 5) * 0.07);
      b.sphere(rad,
        x + Math.cos(a) * h * 0.13, cy + h * (0.1 + r(k + 2) * 0.18), z + Math.sin(a) * h * 0.13,
        k % 2 ? SITE.leaf : SITE.leafLight, 0.78, 5);
    }
    b.sphere(h * 0.16, x, cy + h * 0.24, z, SITE.leaf, 0.8, 6);
    if (kind !== "unstaked") {
      b.cyl(0.035, 0.035, h * 0.5, 5, x + 0.22, h * 0.25, z + 0.05, SITE.stake);
      b.box(0.5, 0.05, 0.05, x + 0.11, h * 0.42, z + 0.03, SITE.stake); // the tie
    }
  }

  for (const row of s.trees ?? []) {
    const n = row.count ?? 8;
    const sp = row.spacingM ?? 5;
    const z = D / 2 + (row.offsetM ?? 10);
    const x0 = (row.centreX ?? 0) - ((n - 1) * sp) / 2;
    for (let i = 0; i < n; i++) {
      const seed = (row.seed ?? 1) * 31 + i;
      const jit = row.jitterM ?? 0;
      const j = jit ? (0.5 + 0.5 * Math.sin(seed * 4.1)) * jit - jit / 2 : 0;
      const h = (row.heightM ?? 4.5) * (0.85 + 0.3 * (0.5 + 0.5 * Math.sin(seed * 7.7)));
      tree(x0 + i * sp + j, z + j * 0.5, h, seed, row.kind);
    }
  }

  // Flagpoles — the other thing every institutional forecourt has.
  for (let k = 0; k < (s.flagpoles ?? 0); k++) {
    const fx = ((k - ((s.flagpoles ?? 1) - 1) / 2) * 3.5);
    const fz = D / 2 + (s.flagpoleOffsetM ?? 16);
    b.box(1.1, 0.35, 1.1, fx, 0.17, fz, SITE.kerb);
    b.cyl(0.06, 0.08, 9, 6, fx, 4.6, fz, SITE.kerb);
  }
}

b.build(OUT, { scale: spec.scale ?? 1, weathering: spec.weathering ?? 0.25 });
console.log(`  ${spec.name ?? spec.id} — ${N} storeys, ${BAYS} bays, ${W} × ${D} m`);
if (spec.confidence) {
  console.log("  guessed, and worth remembering:");
  for (const [k, v] of Object.entries(spec.confidence)) console.log(`    ${k}: ${v}`);
}
