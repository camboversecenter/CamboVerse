/**
 * Build the Learning Lab's high-quality heart from Z-Anatomy.
 *
 *   node scripts/lab/build-heart.mjs <CardioVascular41.fbx> [--dry]
 *
 * A **contributor-side** tool, like the img2threejs pipeline: it runs once on a
 * contributor's machine and its output is committed. Nothing here ships to the
 * browser, and the runtime gains no dependency — the decoder for the output's
 * compression is already inside the `three` package.
 *
 * ## Source and licence
 *
 * Z-Anatomy, https://github.com/LluisV/z-anatomy — CC BY-SA 4.0 (verified from
 * its LICENSE and README, October 2026). Its LICENSE also points to a separate
 * document on the models' licensing that could not be opened from the build
 * environment; read it before redistributing. ShareAlike applies to everything
 * this script writes: the output mesh is an adaptation and is CC BY-SA 4.0 too.
 * See public/models/lab/LICENSE.md.
 *
 * Get the input file from that repository:
 *   Resources/Models/FBX/CardioVascular41.fbx   (≈65 MB, binary FBX 7400)
 *
 * ## What it does, and the traps it avoids
 *
 * 1. **Own geometry only.** A Z-Anatomy structure's node has its downstream
 *    branches as children: the superior vena cava's subtree runs up the neck and
 *    down the arms, 67 cm tall. Taking a node *with* its children would hand the
 *    heart exhibit a vena cava reaching the pelvis. Every structure here is taken
 *    as its own mesh alone.
 * 2. **Clip to the heart.** Vessels that genuinely leave the heart — the aorta,
 *    the venae cavae — are kept only inside a box around the chambers, so they
 *    end as short stubs the way every teaching model shows them.
 * 3. **Weld, simplify, then rebuild *smooth* normals — by hand.** Positions are
 *    taken without the FBX's split per-face normals, so welding actually merges.
 *    The normals are then computed here, area-weighted, on the indexed mesh.
 *    `gltf-transform`'s own `normals()` was the first choice and is wrong for
 *    this: it generates *flat* normals and un-indexes the mesh to do it, which
 *    tripled the vertex count and gave every triangle a hard facet — the exact
 *    opposite of living tissue.
 * 4. **Group by what a student taps.** Output nodes are the exhibit's own part
 *    ids from src/lab.ts — `lv`, `rv`, `aorta`… — so picking, layers and quiz
 *    work exactly as they do on the procedural model. Structures with no honest
 *    part to belong to (cardiac veins, pulmonary veins) get nodes of their own
 *    that are drawn but never pickable: tapping one must not name it as
 *    something it is not.
 * 5. **Anchors.** Each part node carries `extras.anchor`, a point on its actual
 *    surface, so a label pin sits on the structure rather than in empty space.
 *
 * Coordinates: Z-Anatomy is centimetres, Y up, the body's left on +X and its
 * front on +Z. That is kept, so the default camera in front sees a true anterior
 * view. The result is centred and scaled to the exhibit's own `sizeU`.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { Box3, Vector3 } from "three";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";
import { Document, NodeIO } from "@gltf-transform/core";
import { EXTMeshoptCompression, KHRMeshQuantization } from "@gltf-transform/extensions";
import { weld, simplify, meshopt, prune, dedup } from "@gltf-transform/functions";
import { MeshoptEncoder, MeshoptSimplifier } from "meshoptimizer";

const [, , input, ...flags] = process.argv;
const DRY = flags.includes("--dry");
const OUT = "public/models/lab/heart.glb";

/** The exhibit's framing size (src/lab.ts, heart `sizeU`). */
const SIZE_U = 17;
/** Where the framing expects the mass to sit: `centreU ?? sizeU * 0.15`. */
const CENTRE_Y = SIZE_U * 0.15;
/** Fraction of triangles to keep. The source is dense; the phone is not. */
const KEEP = 0.32;

/**
 * Which Z-Anatomy structures make up each teaching part.
 *
 * Names are matched exactly. Valves and papillary muscles go with the ventricle
 * they sit in or open from, which is how a student meets them: "inside the left
 * ventricle", not as separate exhibits.
 */
const PARTS = {
  lv: [
    "Left_ventricle",
    "Inferior_papillary_muscle_of_left_ventricle",
    "Anterior_papillary_muscle_of_left_ventricle",
    "Anterior_leaflet_of_left_atrioventricular_valve",
    "Posterior_leaflet_of_left_atrioventricular_valve",
  ],
  rv: [
    "Right_ventricle",
    "Inferior_papillary_muscle_of_right_ventricle",
    "Anterior_papillary_muscle_of_right_ventricle",
    "Septal_papillary_muscle_of_right_ventricle",
    "Anterior_leaflet_of_right_atrioventricular_valve",
    "Inferior_leaflet_of_right_atrioventricular_valve",
    "Septal_leaflet_of_right_atrioventricular_valve",
  ],
  la: ["Left_atrium", "Left_auricle"],
  ra: ["Right_atrium", "Right_auricle"],
  aorta: [
    "Ascending_aorta", "Aortic_arch", "Thoracic_aorta",
    "Brachiocephalic_trunk", "Left_common_carotid_artery", "Left_subclavian_artery",
    "Left_coronary_leaflet", "Right_coronary_leaflet", "Non-coronary_leaflet",
  ],
  "pulmonary-trunk": [
    "Pulmonary_trunk", "Bifurcation_of_pulmonary_trunk",
    "Right_pulmonary_artery", "Left_pulmonary_artery",
    "Anterior_semilunar_leaflet_of_pulmonary_valve",
    "Left_semilunar_leaflet_of_pulmonary_valve",
    "Right_semilunar_leaflet_of_pulmonary_valve",
  ],
  "vena-cava": ["Superior_vena_cava", "Inferior_vena_cava_(thoracic_part)"],
  // Everything under the heart's own arteries group, collected below.
  coronary: [],
  // Drawn, never pickable — split in two because the layers treat them
  // differently: cardiac veins lie on the muscle and leave with it in the
  // Vessels layer; pulmonary veins *are* great vessels and stay.
  "cardiac-veins": [
    "Great_cardiac_vein", "Middle_cardiac_vein", "Small_cardiac_vein",
    "Coronary_sinus", "Anterior_cardiac_veins",
  ],
  "pulmonary-veins": [
    "Left_superior_pulmonary_vein", "Left_inferior_pulmonary_vein",
    "Right_superior_pulmonary_vein", "Right_inferior_pulmonary_vein",
  ],
};

/** The four chambers: the box everything else is clipped to is built on them. */
const CHAMBERS = ["lv", "rv", "la", "ra"];

/* ------------------------------------------------------------------ read --- */

const t0 = Date.now();
const buf = readFileSync(input);
const root = new FBXLoader().parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), "");
root.updateMatrixWorld(true);
console.log(`parsed ${input} in ${Date.now() - t0} ms`);

const byName = new Map();
root.traverse((o) => { if (o.isMesh && !byName.has(o.name)) byName.set(o.name, o); });

// The coronary arteries: every mesh beneath the heart's arteries group.
const arteriesGroup = (() => { let g = null; root.traverse((o) => { if (o.name === "Arteries_of_heartg") g = o; }); return g; })();
if (arteriesGroup) arteriesGroup.traverse((o) => { if (o.isMesh) PARTS.coronary.push(o.name); });

/** A structure's own triangles, in world space, as a flat xyz array. */
function ownTriangles(mesh) {
  const g = mesh.geometry;
  const p = g.attributes.position;
  const idx = g.index ? g.index.array : null;
  const n = idx ? idx.length : p.count;
  const out = new Float32Array(n * 3);
  const v = new Vector3();
  for (let i = 0; i < n; i++) {
    v.fromBufferAttribute(p, idx ? idx[i] : i).applyMatrix4(mesh.matrixWorld);
    out[i * 3] = v.x; out[i * 3 + 1] = v.y; out[i * 3 + 2] = v.z;
  }
  return out;
}

const collected = {};
const missing = [];
for (const [part, names] of Object.entries(PARTS)) {
  collected[part] = [];
  for (const name of names) {
    const m = byName.get(name);
    if (!m) { missing.push(`${part}: ${name}`); continue; }
    const tris = ownTriangles(m);
    if (tris.length) collected[part].push({ name, tris });
  }
}

/* ------------------------------------------------------------------ clip --- */

function boxOf(arrays) {
  const b = new Box3();
  const v = new Vector3();
  for (const a of arrays) for (let i = 0; i < a.length; i += 3) b.expandByPoint(v.set(a[i], a[i + 1], a[i + 2]));
  return b;
}

const chamberBox = boxOf(CHAMBERS.flatMap((p) => collected[p].map((s) => s.tris)));
const arch = collected.aorta.find((s) => s.name === "Aortic_arch");
const region = chamberBox.clone().expandByVector(new Vector3(3, 0, 3));
region.min.y -= 1;
// Up to just over the top of the aortic arch, so it reads as an arch and not a stump.
if (arch) region.max.y = Math.max(region.max.y, boxOf([arch.tris]).max.y + 2.5);

/** Keep a triangle when its centroid falls inside the region. */
function clip(tris) {
  const keep = [];
  const c = new Vector3();
  for (let i = 0; i < tris.length; i += 9) {
    c.set(
      (tris[i] + tris[i + 3] + tris[i + 6]) / 3,
      (tris[i + 1] + tris[i + 4] + tris[i + 7]) / 3,
      (tris[i + 2] + tris[i + 5] + tris[i + 8]) / 3,
    );
    if (region.containsPoint(c)) for (let k = 0; k < 9; k++) keep.push(tris[i + k]);
  }
  return new Float32Array(keep);
}

/**
 * The largest connected piece of a triangle soup.
 *
 * Clipping a vessel that leaves the box and curves back into it leaves a
 * fragment floating free in the air — the left subclavian artery did exactly
 * that above the aortic arch. Applied only to structures the clip actually
 * cut: some uncut ones are legitimately several separate vessels (the septal
 * branches of the coronary artery), and keeping one of those would delete
 * real anatomy.
 */
function largestPiece(tris) {
  const nTri = tris.length / 9;
  const key = (i) => `${Math.round(tris[i] * 1e3)},${Math.round(tris[i + 1] * 1e3)},${Math.round(tris[i + 2] * 1e3)}`;
  const parent = Array.from({ length: nTri }, (_, i) => i);
  const find = (x) => { while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x]; } return x; };
  const seen = new Map();
  for (let t = 0; t < nTri; t++) {
    for (let v = 0; v < 3; v++) {
      const k = key(t * 9 + v * 3);
      const other = seen.get(k);
      if (other === undefined) seen.set(k, t);
      else parent[find(t)] = find(other);
    }
  }
  const size = new Map();
  for (let t = 0; t < nTri; t++) { const r = find(t); size.set(r, (size.get(r) ?? 0) + 1); }
  let best = -1; let bestN = 0;
  for (const [r, n] of size) if (n > bestN) { bestN = n; best = r; }
  const out = [];
  for (let t = 0; t < nTri; t++) if (find(t) === best) for (let k = 0; k < 9; k++) out.push(tris[t * 9 + k]);
  return new Float32Array(out);
}

for (const part of Object.keys(collected)) {
  collected[part] = collected[part]
    .map((s) => {
      const before = s.tris.length / 9;
      const clipped = clip(s.tris);
      const cut = clipped.length / 9 < before;
      return { ...s, before, cut, tris: cut ? largestPiece(clipped) : clipped };
    })
    .filter((s) => s.tris.length > 0);
}

/* ---------------------------------------------------------------- report --- */

let total = 0;
for (const [part, structs] of Object.entries(collected)) {
  const n = structs.reduce((s, x) => s + x.tris.length / 9, 0);
  total += n;
  console.log(`\n${part.padEnd(16)} ${String(n).padStart(7)} tris`);
  for (const s of structs) {
    const kept = s.tris.length / 9;
    console.log(`   ${String(kept).padStart(6)} / ${String(s.before).padEnd(6)} ${s.name}${s.cut ? "   (clipped, largest piece kept)" : ""}`);
  }
}
console.log(`\ntotal ${total} tris before simplification; region (cm)`,
  region.min.toArray().map((v) => v.toFixed(1)).join(","), "→", region.max.toArray().map((v) => v.toFixed(1)).join(","));
if (missing.length) console.log(`\nnot found in source (skipped):\n   ${missing.join("\n   ")}`);
if (DRY) process.exit(0);

/* ------------------------------------------------------------- normalise --- */

const all = boxOf(Object.values(collected).flatMap((ss) => ss.map((s) => s.tris)));
const size = all.getSize(new Vector3());
const centre = all.getCenter(new Vector3());
const scale = (SIZE_U * 0.94) / Math.max(size.x, size.y, size.z);
for (const ss of Object.values(collected)) for (const s of ss) {
  for (let i = 0; i < s.tris.length; i += 3) {
    s.tris[i] = (s.tris[i] - centre.x) * scale;
    s.tris[i + 1] = (s.tris[i + 1] - centre.y) * scale + CENTRE_Y;
    s.tris[i + 2] = (s.tris[i + 2] - centre.z) * scale;
  }
}

/* ----------------------------------------------------------------- write --- */

await MeshoptEncoder.ready;
await MeshoptSimplifier.ready;

const doc = new Document();
doc.createBuffer();
const scene = doc.createScene("heart");
const heart = doc.createNode("heart");
scene.addChild(heart);

/** The vertex nearest the part's centre: a label anchor on the actual surface. */
function surfaceAnchor(arrays) {
  const c = boxOf(arrays).getCenter(new Vector3());
  let best = null; let bestD = Infinity;
  for (const a of arrays) for (let i = 0; i < a.length; i += 3) {
    const d = (a[i] - c.x) ** 2 + (a[i + 1] - c.y) ** 2 + (a[i + 2] - c.z) ** 2;
    if (d < bestD) { bestD = d; best = [a[i], a[i + 1], a[i + 2]]; }
  }
  return best.map((v) => Math.round(v * 1000) / 1000);
}

for (const [part, structs] of Object.entries(collected)) {
  if (!structs.length) continue;
  // One primitive per part: a draw call per teaching part, not per structure.
  const count = structs.reduce((s, x) => s + x.tris.length, 0);
  const pos = new Float32Array(count);
  let o = 0;
  for (const s of structs) { pos.set(s.tris, o); o += s.tris.length; }

  const accessor = doc.createAccessor().setType("VEC3").setArray(pos);
  const prim = doc.createPrimitive().setAttribute("POSITION", accessor);
  const mesh = doc.createMesh(part).addPrimitive(prim);
  const node = doc.createNode(part).setMesh(mesh).setExtras({
    anchor: surfaceAnchor(structs.map((s) => s.tris)),
    structures: structs.map((s) => s.name),
  });
  heart.addChild(node);
}

/** Area-weighted smooth normals on an indexed primitive. */
function smoothNormals() {
  return (d) => {
    for (const mesh of d.getRoot().listMeshes()) for (const prim of mesh.listPrimitives()) {
      const idx = prim.getIndices();
      if (!idx) throw new Error(`${mesh.getName()}: not indexed — weld did not run`);
      const pos = prim.getAttribute("POSITION").getArray();
      const ix = idx.getArray();
      const n = new Float32Array(pos.length);
      for (let i = 0; i < ix.length; i += 3) {
        const a = ix[i] * 3, b = ix[i + 1] * 3, c = ix[i + 2] * 3;
        const ux = pos[b] - pos[a], uy = pos[b + 1] - pos[a + 1], uz = pos[b + 2] - pos[a + 2];
        const vx = pos[c] - pos[a], vy = pos[c + 1] - pos[a + 1], vz = pos[c + 2] - pos[a + 2];
        // The cross product's length is twice the triangle's area, so summing
        // it unnormalised weights each face by its size.
        const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
        for (const k of [a, b, c]) { n[k] += nx; n[k + 1] += ny; n[k + 2] += nz; }
      }
      for (let i = 0; i < n.length; i += 3) {
        const l = Math.hypot(n[i], n[i + 1], n[i + 2]) || 1;
        n[i] /= l; n[i + 1] /= l; n[i + 2] /= l;
      }
      prim.setAttribute("NORMAL", d.createAccessor().setType("VEC3").setArray(n));
    }
  };
}

await doc.transform(
  weld(),
  simplify({ simplifier: MeshoptSimplifier, ratio: KEEP, error: 0.0012 }),
  smoothNormals(),
  dedup(),
  prune(),
  meshopt({ encoder: MeshoptEncoder, level: "medium" }),
);

const io = new NodeIO()
  .registerExtensions([EXTMeshoptCompression, KHRMeshQuantization])
  .registerDependencies({ "meshopt.encoder": MeshoptEncoder });
mkdirSync(dirname(OUT), { recursive: true });
const glb = await io.writeBinary(doc);
writeFileSync(OUT, glb);

let outTris = 0;
for (const m of doc.getRoot().listMeshes()) for (const p of m.listPrimitives()) outTris += (p.getIndices()?.getCount() ?? 0) / 3;
console.log(`\nwrote ${OUT}: ${(glb.byteLength / 1024).toFixed(0)} KB, ${outTris} tris, scale ${scale.toFixed(4)} units/cm`);
