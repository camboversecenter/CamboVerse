/**
 * Generates public/models/angkor-wat.glb — an authored, recognizable Angkor Wat
 * (the five-tower quincunx: a tall central prang + four corner towers with
 * lotus-bud finials, on tiered galleries, with a causeway). Built from Three.js
 * primitives and serialized to binary glTF by hand (POSITION + NORMAL, one PBR
 * material) — no external assets, reproducible.
 *
 * This is a stylized stand-in; the photoreal version will be a Gaussian-splat
 * capture. Run: `node scripts/generate-angkor.mjs`
 */
import * as THREE from "three";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, "../public/models/angkor-wat.glb");

const parts = [];
function box(w, h, d, x, y, z) {
  const g = new THREE.BoxGeometry(w, h, d).toNonIndexed();
  g.translate(x, y, z);
  parts.push(g);
}
function cone(r, h, seg, x, y, z) {
  const g = new THREE.ConeGeometry(r, h, seg).toNonIndexed();
  g.translate(x, y, z);
  parts.push(g);
}

/** A tapered, stepped prang tower with a lotus-bud finial. */
function tower(cx, cz, baseW, y0, totalH, tiers) {
  const th = totalH / tiers;
  for (let i = 0; i < tiers; i++) {
    const frac = i / tiers;
    const w = baseW * (1 - 0.6 * frac);
    box(w, th, w, cx, y0 + (i + 0.5) * th, cz);
  }
  const top = y0 + totalH;
  box(baseW * 0.34, 0.16, baseW * 0.34, cx, top + 0.08, cz); // finial base
  cone(baseW * 0.24, 0.55, 8, cx, top + 0.43, cz); // lotus bud
  cone(baseW * 0.08, 0.22, 6, cx, top + 0.8, cz); // tip
}

// --- Tiered base / galleries ---
box(7.4, 0.5, 6.2, 0, 0.25, 0); // outer platform
box(6.2, 0.5, 5.0, 0, 0.75, 0); // terrace
box(5.0, 0.45, 4.0, 0, 1.18, 0); // tower platform

// Gallery walls (low ring on the terrace)
box(5.6, 0.7, 0.22, 0, 1.35, 2.35);
box(5.6, 0.7, 0.22, 0, 1.35, -2.35);
box(0.22, 0.7, 4.9, 2.7, 1.35, 0);
box(0.22, 0.7, 4.9, -2.7, 1.35, 0);

// Causeway (entrance, front = +z)
box(1.3, 0.3, 2.6, 0, 0.42, 4.1);
box(0.16, 0.5, 2.6, 0.7, 0.55, 4.1);
box(0.16, 0.5, 2.6, -0.7, 0.55, 4.1);

// --- Quincunx of five towers on the tower platform (top ≈ 1.4) ---
const py = 1.4;
tower(0, 0, 1.5, py, 4.0, 8); // central, tallest
const c = 1.5;
const d = 1.15;
tower(c, d, 0.95, py, 2.5, 7);
tower(-c, d, 0.95, py, 2.5, 7);
tower(c, -d, 0.95, py, 2.5, 7);
tower(-c, -d, 0.95, py, 2.5, 7);

// --- Merge POSITION + NORMAL (translation preserves normals) ---
const posChunks = parts.map((g) => g.attributes.position.array);
const normChunks = parts.map((g) => g.attributes.normal.array);
const vertCount = posChunks.reduce((n, a) => n + a.length / 3, 0);
const position = new Float32Array(vertCount * 3);
const normal = new Float32Array(vertCount * 3);
let o = 0;
for (let i = 0; i < posChunks.length; i++) {
  position.set(posChunks[i], o);
  normal.set(normChunks[i], o);
  o += posChunks[i].length;
}

// Scale the whole temple down to frame like the other spots (base stays at y=0).
const MODEL_SCALE = 0.6;
for (let i = 0; i < position.length; i++) position[i] *= MODEL_SCALE;

const min = [Infinity, Infinity, Infinity];
const max = [-Infinity, -Infinity, -Infinity];
for (let i = 0; i < position.length; i += 3) {
  for (let k = 0; k < 3; k++) {
    min[k] = Math.min(min[k], position[i + k]);
    max[k] = Math.max(max[k], position[i + k]);
  }
}

const posBytes = Buffer.from(position.buffer, position.byteOffset, position.byteLength);
const normBytes = Buffer.from(normal.buffer, normal.byteOffset, normal.byteLength);
const bin = Buffer.concat([posBytes, normBytes]);

const gltf = {
  asset: { version: "2.0", generator: "CamboVerse Angkor Wat generator" },
  scene: 0,
  scenes: [{ nodes: [0] }],
  nodes: [{ name: "AngkorWat", mesh: 0 }],
  meshes: [{ name: "AngkorWat", primitives: [{ attributes: { POSITION: 0, NORMAL: 1 }, material: 0, mode: 4 }] }],
  materials: [
    { name: "Sandstone", pbrMetallicRoughness: { baseColorFactor: [0.36, 0.29, 0.21, 1], metallicFactor: 0, roughnessFactor: 0.95 } },
  ],
  buffers: [{ byteLength: bin.length }],
  bufferViews: [
    { buffer: 0, byteOffset: 0, byteLength: posBytes.length, target: 34962 },
    { buffer: 0, byteOffset: posBytes.length, byteLength: normBytes.length, target: 34962 },
  ],
  accessors: [
    { bufferView: 0, componentType: 5126, count: vertCount, type: "VEC3", min, max },
    { bufferView: 1, componentType: 5126, count: vertCount, type: "VEC3" },
  ],
};

function pad(buf, fill) {
  const rem = buf.length % 4;
  return rem === 0 ? buf : Buffer.concat([buf, Buffer.alloc(4 - rem, fill)]);
}
const jsonChunk = pad(Buffer.from(JSON.stringify(gltf), "utf8"), 0x20);
const binChunk = pad(bin, 0x00);
const total = 12 + 8 + jsonChunk.length + 8 + binChunk.length;
const header = Buffer.alloc(12);
header.writeUInt32LE(0x46546c67, 0);
header.writeUInt32LE(2, 4);
header.writeUInt32LE(total, 8);
const jsonHead = Buffer.alloc(8);
jsonHead.writeUInt32LE(jsonChunk.length, 0);
jsonHead.writeUInt32LE(0x4e4f534a, 4);
const binHead = Buffer.alloc(8);
binHead.writeUInt32LE(binChunk.length, 0);
binHead.writeUInt32LE(0x004e4942, 4);

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, Buffer.concat([header, jsonHead, jsonChunk, binHead, binChunk]));
console.log(`wrote ${OUT} — ${vertCount} verts, ${(total / 1024).toFixed(1)} KB`);
