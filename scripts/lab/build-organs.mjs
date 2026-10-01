/**
 * Build every real-anatomy model in the Learning Lab from Z-Anatomy.
 *
 *   npm run gen:lab-anatomy -- <fbx-dir> [model …] [--dry]
 *
 * `<fbx-dir>` holds Z-Anatomy's system files (`Resources/Models/FBX/` in
 * https://github.com/LluisV/z-anatomy). With no model names, everything in
 * `organs.config.mjs` is built; `--dry` reports what would go in without
 * writing anything.
 *
 * A **contributor-side** tool: it runs once, its output is committed, and
 * nothing here reaches the browser. The runtime gains no dependency — the
 * decoder for the output's compression is already inside `three`.
 *
 * Licence: Z-Anatomy is CC BY-SA 4.0, and everything written here is an
 * adaptation of it, so it is CC BY-SA 4.0 too. See public/models/lab/LICENSE.md.
 *
 * ## The traps this handles — each one was hit for real
 *
 * - **A structure's node holds its downstream branches as children.** The
 *   superior vena cava's subtree is 67 cm tall. Every structure is taken as its
 *   own geometry only.
 * - **Label markers.** The source carries a 12-triangle pin for every named
 *   landmark (names ending in `j`). They are not anatomy and are skipped.
 * - **Clipping leaves floating fragments.** Where a model cuts vessels to stubs,
 *   each structure the cut actually touched keeps only its largest connected
 *   piece; untouched ones keep everything, since some are legitimately several
 *   separate vessels.
 * - **Flat normals.** `gltf-transform`'s `normals()` makes flat ones and
 *   un-indexes the mesh. Welding, simplification and smooth normals are done
 *   here instead, per piece, so each piece also gets its own triangle budget.
 * - **Mirrored structures.** A third of the source's meshes are the other
 *   side's mesh under a negative scale. Baked into world space they come out
 *   inside out; their winding is swapped back as they are read.
 * - **Overlays.** The skin's landmark patches lie on top of its regions; they
 *   are found by geometry and dropped (`dropOverlays`).
 * - **Memory.** Each source file is parsed once, every model takes what it
 *   needs from it, and it is released before the next is read.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { Box3, Vector3 } from "three";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";
import { Document, NodeIO } from "@gltf-transform/core";
import { EXTMeshoptCompression, KHRMeshQuantization } from "@gltf-transform/extensions";
import { meshopt, prune, dedup } from "@gltf-transform/functions";
import { MeshoptEncoder, MeshoptSimplifier } from "meshoptimizer";
import { SOURCES, MODELS } from "./organs.config.mjs";

const args = process.argv.slice(2);
const DRY = args.includes("--dry");
const [dir, ...wanted] = args.filter((a) => !a.startsWith("--"));
if (!dir) { console.error("usage: build-organs.mjs <fbx-dir> [model …] [--dry]"); process.exit(1); }
const OUT_DIR = "public/models/lab";
const models = wanted.length ? MODELS.filter((m) => wanted.includes(m.out)) : MODELS;
if (wanted.length && models.length !== wanted.length) {
  console.error("unknown model:", wanted.filter((w) => !MODELS.some((m) => m.out === w)).join(", "));
  process.exit(1);
}

/* ---------------------------------------------------------------- collect --- */

const isMarker = (mesh, tris) => tris <= 12 || /j$/.test(mesh.name);
const triCount = (g) => (g.index ? g.index.count / 3 : g.attributes.position.count / 3);

/** A structure's own triangles in world space, as a flat xyz array. */
function ownTriangles(mesh) {
  const g = mesh.geometry;
  const p = g.attributes.position;
  const idx = g.index ? g.index.array : null;
  const n = idx ? idx.length : p.count;
  const out = new Float32Array(n * 3);
  const v = new Vector3();
  // Z-Anatomy builds most paired structures by mirroring the other side: a
  // third of its meshes carry a negative-scale transform. Baking the transform
  // into the vertices turns those triangles inside out, so swap their winding
  // back — or half the body is lit from inside (the skin showed it as pale,
  // patchy regions down its left side).
  const flip = mesh.matrixWorld.determinant() < 0;
  for (let i = 0; i < n; i++) {
    v.fromBufferAttribute(p, idx ? idx[i] : i).applyMatrix4(mesh.matrixWorld);
    const at = flip ? i - (i % 3) + [0, 2, 1][i % 3] : i;
    out[at * 3] = v.x; out[at * 3 + 1] = v.y; out[at * 3 + 2] = v.z;
  }
  return out;
}

/** Meshes a selector names, from one parsed source. */
function select(root, byName, sel, missing, label) {
  if (sel.names) {
    return sel.names.flatMap((n) => {
      const m = byName.get(n);
      if (!m) { missing.push(`${label}: ${n}`); return []; }
      return [m];
    });
  }
  let top = root;
  if (sel.group !== "*") {
    top = null;
    root.traverse((o) => { if (!top && o.name === sel.group) top = o; });
    if (!top) { missing.push(`${label}: group ${sel.group}`); return []; }
  }
  const skip = new Set(sel.excludeGroups ?? []);
  const out = [];
  const walk = (o) => {
    if (skip.has(o.name)) return;
    if (o.isMesh) {
      const t = triCount(o.geometry);
      if (!isMarker(o, t)
        && (!sel.match || sel.match.test(o.name))
        && (!sel.exclude || !sel.exclude.test(o.name))) out.push(o);
    }
    for (const c of o.children) walk(c);
  };
  walk(top);
  return out;
}

// Every piece starts with an empty list of structures.
for (const m of models) for (const pieces of Object.values(m.parts)) for (const p of pieces) p.structures = [];

const missing = [];
const sourcesNeeded = new Set(models.flatMap((m) => Object.values(m.parts).flat().flatMap((p) => p.from.map((s) => s.src))));
for (const src of Object.keys(SOURCES).filter((s) => sourcesNeeded.has(s))) {
  const file = join(dir, SOURCES[src]);
  const t0 = Date.now();
  const buf = readFileSync(file);
  let root = new FBXLoader().parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), "");
  root.updateMatrixWorld(true);
  const byName = new Map();
  root.traverse((o) => { if (o.isMesh && !byName.has(o.name)) byName.set(o.name, o); });
  for (const m of models) for (const [part, pieces] of Object.entries(m.parts)) for (const p of pieces) {
    for (const sel of p.from.filter((s) => s.src === src)) {
      const seen = new Set(p.structures.map((s) => s.name));
      for (const mesh of select(root, byName, sel, missing, `${m.out}/${part}`)) {
        if (seen.has(mesh.name)) continue;   // the same structure named twice in one piece
        seen.add(mesh.name);
        p.structures.push({ name: mesh.name, tris: ownTriangles(mesh) });
      }
    }
  }
  console.log(`read ${SOURCES[src]} in ${((Date.now() - t0) / 1000).toFixed(1)} s`);
  root = null; // release before the next file
}

/* ------------------------------------------------------------------- clip --- */

function boxOf(arrays) {
  const b = new Box3(); const v = new Vector3();
  for (const a of arrays) for (let i = 0; i < a.length; i += 3) b.expandByPoint(v.set(a[i], a[i + 1], a[i + 2]));
  return b;
}

function clipTo(tris, region) {
  const keep = []; const c = new Vector3();
  for (let i = 0; i < tris.length; i += 9) {
    c.set((tris[i] + tris[i + 3] + tris[i + 6]) / 3, (tris[i + 1] + tris[i + 4] + tris[i + 7]) / 3, (tris[i + 2] + tris[i + 5] + tris[i + 8]) / 3);
    if (region.containsPoint(c)) for (let k = 0; k < 9; k++) keep.push(tris[i + k]);
  }
  return new Float32Array(keep);
}

/** The largest connected piece of a triangle soup (vertices matched by position). */
function largestPiece(tris) {
  const nTri = tris.length / 9;
  const key = (i) => `${Math.round(tris[i] * 1e3)},${Math.round(tris[i + 1] * 1e3)},${Math.round(tris[i + 2] * 1e3)}`;
  const parent = Array.from({ length: nTri }, (_, i) => i);
  const find = (x) => { while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x]; } return x; };
  const seen = new Map();
  for (let t = 0; t < nTri; t++) for (let v = 0; v < 3; v++) {
    const k = key(t * 9 + v * 3); const o = seen.get(k);
    if (o === undefined) seen.set(k, t); else parent[find(t)] = find(o);
  }
  const size = new Map();
  for (let t = 0; t < nTri; t++) { const r = find(t); size.set(r, (size.get(r) ?? 0) + 1); }
  let best = -1, bestN = 0;
  for (const [r, n] of size) if (n > bestN) { bestN = n; best = r; }
  const out = [];
  for (let t = 0; t < nTri; t++) if (find(t) === best) for (let k = 0; k < 9; k++) out.push(tris[t * 9 + k]);
  return new Float32Array(out);
}

function applyClip(m) {
  const c = m.clip;
  const around = c.around.flatMap((part) => m.parts[part].flatMap((p) => p.structures.map((s) => s.tris)));
  const region = boxOf(around).expandByVector(new Vector3(c.expand[0], 0, c.expand[2]));
  region.min.y -= c.expand[1];
  if (c.upTo) {
    const top = Object.values(m.parts).flat().flatMap((p) => p.structures).find((s) => s.name === c.upTo);
    if (top) region.max.y = Math.max(region.max.y, boxOf([top.tris]).max.y + (c.upPad ?? 0));
  }
  for (const p of Object.values(m.parts).flat()) {
    p.structures = p.structures.map((s) => {
      const before = s.tris.length / 9;
      const kept = clipTo(s.tris, region);
      const cut = kept.length / 9 < before;
      return { ...s, cut, tris: cut ? largestPiece(kept) : kept };
    }).filter((s) => s.tris.length);
  }
}

/* ------------------------------------------------------- weld · simplify --- */

/** Merge a triangle soup into indexed geometry, matching vertices by position. */
function weld(tris) {
  const map = new Map(); const pos = []; const idx = new Uint32Array(tris.length / 3);
  for (let i = 0; i < tris.length; i += 3) {
    const k = `${Math.round(tris[i] * 1e4)},${Math.round(tris[i + 1] * 1e4)},${Math.round(tris[i + 2] * 1e4)}`;
    let n = map.get(k);
    if (n === undefined) { n = pos.length / 3; map.set(k, n); pos.push(tris[i], tris[i + 1], tris[i + 2]); }
    idx[i / 3] = n;
  }
  return { positions: new Float32Array(pos), indices: idx };
}

/** Drop vertices no triangle uses, after simplification. */
function compact({ positions, indices }) {
  const remap = new Int32Array(positions.length / 3).fill(-1);
  const pos = []; const out = new Uint32Array(indices.length);
  for (let i = 0; i < indices.length; i++) {
    const v = indices[i];
    if (remap[v] < 0) { remap[v] = pos.length / 3; pos.push(positions[v * 3], positions[v * 3 + 1], positions[v * 3 + 2]); }
    out[i] = remap[v];
  }
  return { positions: new Float32Array(pos), indices: out };
}

/** Area-weighted smooth normals. */
function smoothNormals({ positions: p, indices: ix }) {
  const n = new Float32Array(p.length);
  for (let i = 0; i < ix.length; i += 3) {
    const a = ix[i] * 3, b = ix[i + 1] * 3, c = ix[i + 2] * 3;
    const ux = p[b] - p[a], uy = p[b + 1] - p[a + 1], uz = p[b + 2] - p[a + 2];
    const vx = p[c] - p[a], vy = p[c + 1] - p[a + 1], vz = p[c + 2] - p[a + 2];
    // Unnormalised, the cross product's length is twice the face's area.
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    for (const k of [a, b, c]) { n[k] += nx; n[k + 1] += ny; n[k + 2] += nz; }
  }
  for (let i = 0; i < n.length; i += 3) {
    const l = Math.hypot(n[i], n[i + 1], n[i + 2]) || 1;
    n[i] /= l; n[i + 1] /= l; n[i + 2] /= l;
  }
  return n;
}

/** Expand indexed geometry back into a triangle soup. */
function toSoup({ positions, indices }) {
  const out = new Float32Array(indices.length * 3);
  for (let i = 0; i < indices.length; i++) {
    const v = indices[i] * 3;
    out[i * 3] = positions[v]; out[i * 3 + 1] = positions[v + 1]; out[i * 3 + 2] = positions[v + 2];
  }
  return out;
}

/** Remove triangles that appear twice — coincident overlay geometry. */
function dropDuplicates({ positions, indices }) {
  const seen = new Set(); const out = [];
  for (let t = 0; t < indices.length; t += 3) {
    const a = indices[t], b = indices[t + 1], c = indices[t + 2];
    if (a === b || b === c || a === c) continue; // collapsed to a line or a point
    const k = [a, b, c].sort((x, y) => x - y).join("_");
    if (seen.has(k)) continue;
    seen.add(k); out.push(a, b, c);
  }
  return compact({ positions, indices: new Uint32Array(out) });
}

/**
 * Simplify a piece **as one mesh**: weld everything, drop duplicated
 * triangles, simplify. Right for a single structure and for a clean tiling —
 * the brain's 220 gyri share their edges with very few tangles (0.3% of edges)
 * — and it reaches its budget, which a locked-border pass on 220 patches
 * cannot: that kept the body's brain at 46k triangles against a 7k budget.
 */
function finishWhole(p, maxError) {
  const count = p.structures.reduce((n, s) => n + s.tris.length, 0);
  const soup = new Float32Array(count);
  let o = 0; for (const s of p.structures) { soup.set(s.tris, o); o += s.tris.length; }
  let mesh = dropDuplicates(weld(soup));
  const have = mesh.indices.length / 3;
  const target = Math.min(have, p.tris ?? Infinity, Math.ceil(have * (p.keep ?? 1)));
  if (target < have) {
    const [indices] = MeshoptSimplifier.simplify(mesh.indices, mesh.positions, 3, target * 3, maxError, []);
    mesh = compact({ positions: mesh.positions, indices });
  }
  return { ...mesh, normals: smoothNormals(mesh), from: have };
}

/**
 * Simplify a piece **one structure at a time**, then join (`simplify: "each"`).
 *
 * The first version welded a whole piece and simplified it as one mesh. That
 * tore the skin into dark specks: the skin is 256 region patches, and the
 * landmark patches (umbilicus, eyebrow, the folds and fossae) sit on top of
 * the larger regions sharing their vertices — 711 duplicated triangles and
 * 4,420 edges shared by three or more faces. Simplification cannot keep a
 * tangle like that intact. Each structure on its own is clean, so each is
 * simplified alone with its **border locked** — neighbouring structures still
 * meet exactly — and the budget is shared out in proportion to size.
 */
/** Distance from a point to a triangle (Ericson, Real-Time Collision Detection §5.1.5). */
function pointTriDist(px, py, pz, t, o) {
  const ax = t[o], ay = t[o + 1], az = t[o + 2], bx = t[o + 3], by = t[o + 4], bz = t[o + 5];
  const cx = t[o + 6], cy = t[o + 7], cz = t[o + 8];
  const abx = bx - ax, aby = by - ay, abz = bz - az, acx = cx - ax, acy = cy - ay, acz = cz - az;
  const apx = px - ax, apy = py - ay, apz = pz - az;
  const d1 = abx * apx + aby * apy + abz * apz, d2 = acx * apx + acy * apy + acz * apz;
  let qx, qy, qz;
  if (d1 <= 0 && d2 <= 0) { qx = ax; qy = ay; qz = az; } else {
    const bpx = px - bx, bpy = py - by, bpz = pz - bz;
    const d3 = abx * bpx + aby * bpy + abz * bpz, d4 = acx * bpx + acy * bpy + acz * bpz;
    if (d3 >= 0 && d4 <= d3) { qx = bx; qy = by; qz = bz; } else {
      const vc = d1 * d4 - d3 * d2;
      if (vc <= 0 && d1 >= 0 && d3 <= 0) { const v = d1 / (d1 - d3); qx = ax + v * abx; qy = ay + v * aby; qz = az + v * abz; } else {
        const cpx = px - cx, cpy = py - cy, cpz = pz - cz;
        const d5 = abx * cpx + aby * cpy + abz * cpz, d6 = acx * cpx + acy * cpy + acz * cpz;
        if (d6 >= 0 && d5 <= d6) { qx = cx; qy = cy; qz = cz; } else {
          const vb = d5 * d2 - d1 * d6;
          if (vb <= 0 && d2 >= 0 && d6 <= 0) { const w = d2 / (d2 - d6); qx = ax + w * acx; qy = ay + w * acy; qz = az + w * acz; } else {
            const va = d3 * d6 - d5 * d4;
            if (va <= 0 && d4 - d3 >= 0 && d5 - d6 >= 0) {
              const w = (d4 - d3) / ((d4 - d3) + (d5 - d6));
              qx = bx + w * (cx - bx); qy = by + w * (cy - by); qz = bz + w * (cz - bz);
            } else {
              const den = 1 / (va + vb + vc); const v = vb * den, w = vc * den;
              qx = ax + abx * v + acx * w; qy = ay + aby * v + acy * w; qz = az + abz * v + acz * w;
            }
          }
        }
      }
    }
  }
  return Math.hypot(px - qx, py - qy, pz - qz);
}

/**
 * Drop structures that lie **on top of** other structures (`dropOverlays`).
 *
 * The skin's landmark patches — umbilicus, eyebrow, the folds and fossae — are
 * drawn over the larger body regions rather than tiling with them. Left in,
 * two coincident surfaces with different triangulations fight for depth and
 * the skin shows faceted patches in the wrong shade. Names do not separate them
 * (scored by tangled edges, the worst offenders were real scalp regions), but
 * geometry does: a true tile meets its neighbours only along its edges, while
 * an overlay lies within a millimetre or two of another structure across its
 * whole interior. Anything with most of its surface that close to some other
 * structure is dropped, and reported.
 */
function dropOverlays(structures, within = 0.15, share = 0.5) {
  const CELL = 2; // cm
  const grid = new Map();
  const key = (x, y, z) => `${Math.floor(x / CELL)},${Math.floor(y / CELL)},${Math.floor(z / CELL)}`;
  structures.forEach((s, si) => {
    for (let o = 0; o < s.tris.length; o += 9) {
      // Register the triangle in every cell its bounding box touches.
      const xs = [s.tris[o], s.tris[o + 3], s.tris[o + 6]], ys = [s.tris[o + 1], s.tris[o + 4], s.tris[o + 7]], zs = [s.tris[o + 2], s.tris[o + 5], s.tris[o + 8]];
      for (let x = Math.floor(Math.min(...xs) / CELL); x <= Math.floor(Math.max(...xs) / CELL); x++)
        for (let y = Math.floor(Math.min(...ys) / CELL); y <= Math.floor(Math.max(...ys) / CELL); y++)
          for (let z = Math.floor(Math.min(...zs) / CELL); z <= Math.floor(Math.max(...zs) / CELL); z++) {
            const k = `${x},${y},${z}`;
            (grid.get(k) ?? grid.set(k, []).get(k)).push(si, o);
          }
    }
  });
  // Smallest first, and only what is still kept counts as cover: when two
  // patches lie on each other (scalp regions do), the smaller goes and the
  // larger stays, so nothing is left uncovered.
  const gone = new Set();
  const order = structures.map((_, si) => si).sort((a, b) => structures[a].tris.length - structures[b].tris.length);
  for (const si of order) {
    const s = structures[si];
    let close = 0, n = 0;
    for (let o = 0; o < s.tris.length; o += 9) {
      const cx = (s.tris[o] + s.tris[o + 3] + s.tris[o + 6]) / 3, cy = (s.tris[o + 1] + s.tris[o + 4] + s.tris[o + 7]) / 3, cz = (s.tris[o + 2] + s.tris[o + 5] + s.tris[o + 8]) / 3;
      n++;
      const cand = grid.get(key(cx, cy, cz)) ?? [];
      for (let i = 0; i < cand.length; i += 2) {
        if (cand[i] === si || gone.has(cand[i])) continue;
        if (pointTriDist(cx, cy, cz, structures[cand[i]].tris, cand[i + 1]) <= within) { close++; break; }
      }
    }
    if (n > 0 && close / n > share) gone.add(si);
  }
  const dropped = structures.filter((_, si) => gone.has(si)).map((s) => s.name);
  const kept = structures.filter((_, si) => !gone.has(si));
  return { kept, dropped };
}

function finishPiece(p, maxError) {
  if (p.dropOverlays) {
    const { kept, dropped } = dropOverlays(p.structures);
    p.structures = kept;
    p.droppedOverlays = dropped;
  }
  if ((p.simplify ?? "whole") === "whole") return finishWhole(p, maxError);
  const welded = p.structures.map((s) => weld(s.tris));
  const have = welded.reduce((n, m) => n + m.indices.length / 3, 0);
  const target = Math.min(have, p.tris ?? Infinity, Math.ceil(have * (p.keep ?? 1)));
  const ratio = target / have;
  const soups = welded.map((m) => {
    const n = m.indices.length / 3;
    // Never crush a small structure to nothing: a thyroid lobe stays a lobe.
    const t = Math.max(Math.min(n, 12), Math.round(n * ratio));
    if (t >= n) return toSoup(m);
    const flags = p.lockBorder === false ? [] : ["LockBorder"];
    const [indices] = MeshoptSimplifier.simplify(m.indices, m.positions, 3, t * 3, maxError, flags);
    return toSoup(compact({ positions: m.positions, indices }));
  });
  const soup = new Float32Array(soups.reduce((n, s) => n + s.length, 0));
  let o = 0; for (const s of soups) { soup.set(s, o); o += s.length; }
  const mesh = dropDuplicates(weld(soup));
  return { ...mesh, normals: smoothNormals(mesh), from: have };
}

/* ------------------------------------------------------------------ write --- */

/** The vertex nearest a point: a label anchor on the actual surface. */
function nearest(positions, at) {
  let best = 0, bestD = Infinity;
  for (let i = 0; i < positions.length; i += 3) {
    const d = (positions[i] - at.x) ** 2 + (positions[i + 1] - at.y) ** 2 + (positions[i + 2] - at.z) ** 2;
    if (d < bestD) { bestD = d; best = i; }
  }
  return [positions[best], positions[best + 1], positions[best + 2]].map((v) => Math.round(v * 100) / 100);
}

await MeshoptSimplifier.ready;
await MeshoptEncoder.ready;
const io = new NodeIO()
  .registerExtensions([EXTMeshoptCompression, KHRMeshQuantization])
  .registerDependencies({ "meshopt.encoder": MeshoptEncoder });
mkdirSync(OUT_DIR, { recursive: true });
if (missing.length) console.log(`\nnot found in source (skipped):\n   ${[...new Set(missing)].join("\n   ")}`);

let totalKB = 0;
for (const m of models) {
  if (m.clip) applyClip(m);
  const doc = new Document();
  doc.createBuffer();
  const scene = doc.createScene(m.out);
  const top = doc.createNode("model");
  scene.addChild(top);
  const anchors = {};
  const report = [];

  for (const [part, pieces] of Object.entries(m.parts)) {
    const partNode = doc.createNode(part);
    top.addChild(partNode);
    const partPositions = [];
    for (const p of pieces) {
      if (!p.structures.length) { report.push(`   ${part}/${p.name}: EMPTY`); continue; }
      const g = finishPiece(p, p.maxError ?? m.maxError ?? 0.02);
      partPositions.push(g.positions);
      report.push(`   ${String(g.indices.length / 3).padStart(6)} / ${String(g.from).padEnd(7)} ${part}/${p.name}  (${p.role}, ${p.structures.length} structures)`);
      if (p.droppedOverlays?.length) report.push(`          dropped ${p.droppedOverlays.length} overlays: ${p.droppedOverlays.join(", ")}`);
      if (DRY) continue;
      const prim = doc.createPrimitive()
        .setAttribute("POSITION", doc.createAccessor().setType("VEC3").setArray(g.positions))
        .setAttribute("NORMAL", doc.createAccessor().setType("VEC3").setArray(g.normals))
        .setIndices(doc.createAccessor().setType("SCALAR").setArray(g.indices));
      partNode.addChild(doc.createNode(p.name).setMesh(doc.createMesh(p.name).addPrimitive(prim)).setExtras({ role: p.role }));
    }
    if (partPositions.length) {
      const all = new Float32Array(partPositions.reduce((s, a) => s + a.length, 0));
      let o = 0; for (const a of partPositions) { all.set(a, o); o += a.length; }
      anchors[part] = nearest(all, boxOf([all]).getCenter(new Vector3()));
      m._positions ??= {}; m._positions[part] = all;
    }
  }
  for (const [id, a] of Object.entries(m.anchors ?? {})) {
    if (m._positions?.[a.on]) anchors[id] = nearest(m._positions[a.on], new Vector3(...a.near));
  }

  const tris = report.reduce((s, r) => s + (+(r.trim().split(" ")[0]) || 0), 0);
  console.log(`\n${m.out}: ${tris} tris`);
  for (const r of report) console.log(r);
  if (DRY) continue;

  top.setExtras({ anchors, units: "cm", source: "Z-Anatomy, CC BY-SA 4.0" });
  await doc.transform(dedup(), prune({ keepExtras: true }), meshopt({ encoder: MeshoptEncoder, level: "medium" }));
  const glb = await io.writeBinary(doc);
  writeFileSync(join(OUT_DIR, `${m.out}.glb`), glb);
  totalKB += glb.byteLength / 1024;
  console.log(`   → ${OUT_DIR}/${m.out}.glb  ${(glb.byteLength / 1024).toFixed(0)} KB`);
}
if (!DRY) console.log(`\ntotal ${totalKB.toFixed(0)} KB across ${models.length} files`);
