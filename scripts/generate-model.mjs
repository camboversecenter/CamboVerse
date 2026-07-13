/**
 * Generates the sample heritage model (public/models/heritage-sample.glb).
 *
 * Builds a low-poly Khmer prasat from Three.js primitives and serializes it to
 * a self-contained binary glTF by hand (POSITION + NORMAL, one PBR material) —
 * no exporter, no external assets. This gives the viewer a real glTF to load
 * until an actual capture is available. Run: `node scripts/generate-model.mjs`.
 */
import * as THREE from "three";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, "../public/models/heritage-sample.glb");

// Prasat tiers (w, h, d, centerY) + a finial cone — matches the viewer scale.
const parts = [];
function box(w, h, d, y) {
  const g = new THREE.BoxGeometry(w, h, d).toNonIndexed();
  g.translate(0, y, 0);
  parts.push(g);
}
box(3.0, 1.0, 3.0, 0.5);
box(2.2, 1.0, 2.2, 1.5);
box(1.5, 0.8, 1.5, 2.4);
box(0.8, 0.6, 0.8, 3.05);
const cone = new THREE.ConeGeometry(0.35, 0.7, 6).toNonIndexed();
cone.translate(0, 3.75, 0);
parts.push(cone);

// Concatenate POSITION + NORMAL from every part (translation preserves normals).
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

// Accessor bounds for POSITION.
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
const bin = Buffer.concat([posBytes, normBytes]); // both are 4-byte aligned

const gltf = {
  asset: { version: "2.0", generator: "CamboVerse model generator" },
  scene: 0,
  scenes: [{ nodes: [0] }],
  nodes: [{ name: "Prasat", mesh: 0 }],
  meshes: [{ name: "Prasat", primitives: [{ attributes: { POSITION: 0, NORMAL: 1 }, material: 0, mode: 4 }] }],
  materials: [
    {
      name: "Sandstone",
      pbrMetallicRoughness: { baseColorFactor: [0.34, 0.27, 0.19, 1], metallicFactor: 0, roughnessFactor: 0.95 },
    },
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

// Assemble the .glb container (header + JSON chunk + BIN chunk, each 4-byte padded).
function pad(buf, fill) {
  const rem = buf.length % 4;
  return rem === 0 ? buf : Buffer.concat([buf, Buffer.alloc(4 - rem, fill)]);
}
const jsonChunk = pad(Buffer.from(JSON.stringify(gltf), "utf8"), 0x20);
const binChunk = pad(bin, 0x00);
const total = 12 + 8 + jsonChunk.length + 8 + binChunk.length;

const header = Buffer.alloc(12);
header.writeUInt32LE(0x46546c67, 0); // "glTF"
header.writeUInt32LE(2, 4);
header.writeUInt32LE(total, 8);
const jsonHead = Buffer.alloc(8);
jsonHead.writeUInt32LE(jsonChunk.length, 0);
jsonHead.writeUInt32LE(0x4e4f534a, 4); // "JSON"
const binHead = Buffer.alloc(8);
binHead.writeUInt32LE(binChunk.length, 0);
binHead.writeUInt32LE(0x004e4942, 4); // "BIN\0"

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, Buffer.concat([header, jsonHead, jsonChunk, binHead, binChunk]));
console.log(`wrote ${OUT} — ${vertCount} verts, ${(total / 1024).toFixed(1)} KB`);
