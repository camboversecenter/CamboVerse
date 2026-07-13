/**
 * Generates public/models/bayon.glb — an authored, recognizable Bayon: a dense
 * cluster of towers each bearing four serene faces (the hallmark of the Bayon
 * at Angkor Thom), on a tiered base. Built from Three.js primitives and
 * serialized to binary glTF by hand (POSITION + NORMAL, one PBR material) — no
 * external assets. Stylized stand-in; photoreal comes later via Gaussian splats.
 *
 * Run: `node scripts/generate-bayon.mjs`
 */
import * as THREE from "three";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, "../public/models/bayon.glb");

const parts = [];
function box(w, h, d, x, y, z) {
  const g = new THREE.BoxGeometry(w, h, d).toNonIndexed();
  g.translate(x, y, z);
  parts.push(g);
}
function nose(x, y, z, dir) {
  const g = new THREE.ConeGeometry(0.07, 0.2, 6).toNonIndexed();
  if (dir[0] === 1) g.rotateZ(-Math.PI / 2);
  else if (dir[0] === -1) g.rotateZ(Math.PI / 2);
  else if (dir[1] === 1) g.rotateX(Math.PI / 2);
  else g.rotateX(-Math.PI / 2);
  g.translate(x, y, z);
  parts.push(g);
}
function coneAt(r, h, x, y, z) {
  const g = new THREE.ConeGeometry(r, h, 8).toNonIndexed();
  g.translate(x, y, z);
  parts.push(g);
}

/** A face-tower: a tapered stack, four faces near the top, and a lotus cap. */
function faceTower(cx, cz, baseW, y0, totalH, tiers) {
  const th = totalH / tiers;
  for (let i = 0; i < tiers; i++) {
    const w = baseW * (1 - 0.5 * (i / tiers));
    box(w, th, w, cx, y0 + (i + 0.5) * th, cz);
  }
  // Four faces near the upper third.
  const fy = y0 + totalH * 0.72;
  const fw = baseW * (1 - 0.5 * 0.72);
  const half = fw / 2;
  const dirs = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];
  for (const [dx, dz] of dirs) {
    const px = cx + dx * (half + 0.03);
    const pz = cz + dz * (half + 0.03);
    if (dx !== 0) box(0.12, 0.36, 0.34, px, fy, pz); // brow/face block (thin in x)
    else box(0.34, 0.36, 0.12, px, fy, pz); // thin in z
    nose(cx + dx * (half + 0.11), fy - 0.02, cz + dz * (half + 0.11), [dx, dz]);
  }
  // Lotus cap.
  const top = y0 + totalH;
  box(baseW * 0.28, 0.14, baseW * 0.28, cx, top + 0.07, cz);
  coneAt(baseW * 0.2, 0.42, cx, top + 0.35, cz);
}

// Tiered base.
box(6.0, 0.5, 6.0, 0, 0.25, 0);
box(5.0, 0.5, 5.0, 0, 0.7, 0);

// Central tallest tower + a surrounding cluster (dense, Bayon-like).
const y0 = 0.95;
faceTower(0, 0, 1.3, y0, 3.6, 7);
const ring = [
  [1.9, 0, 2.6],
  [-1.9, 0, 2.4],
  [0, 1.75, 2.5],
  [0, -1.75, 2.3],
  [1.5, 1.45, 2.2],
  [-1.5, 1.45, 2.0],
  [1.5, -1.45, 2.1],
  [-1.5, -1.45, 2.3],
];
for (const [x, z, h] of ring) faceTower(x, z, 0.85, y0, h, 6);

// --- Merge POSITION + NORMAL ---
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

// Scale to frame like the other spots (base stays at y=0).
const MODEL_SCALE = 0.62;
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
  asset: { version: "2.0", generator: "CamboVerse Bayon generator" },
  scene: 0,
  scenes: [{ nodes: [0] }],
  nodes: [{ name: "Bayon", mesh: 0 }],
  meshes: [{ name: "Bayon", primitives: [{ attributes: { POSITION: 0, NORMAL: 1 }, material: 0, mode: 4 }] }],
  materials: [
    { name: "Sandstone", pbrMetallicRoughness: { baseColorFactor: [0.35, 0.28, 0.2, 1], metallicFactor: 0, roughnessFactor: 0.95 } },
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
