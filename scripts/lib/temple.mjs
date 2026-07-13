/**
 * Shared helpers for authoring stylized Khmer temple models as binary glTF.
 *
 * Builds meshes from Three.js primitives and serializes POSITION + NORMAL +
 * COLOR_0 by hand (one white PBR material; per-vertex colours carry the stone
 * tone). Vertex colours add cheap realism: height-based weathering (grime low,
 * lighter up), gentle ambient darkening, and slight per-part tone variation —
 * so the models read as aged sandstone rather than flat blocks.
 */
import * as THREE from "three";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

export const SAND = [0.4, 0.32, 0.22];
export const DARK_SAND = [0.3, 0.24, 0.17];
export const MOSS = [0.26, 0.28, 0.19];
export const WOOD = [0.33, 0.27, 0.2];
export const ROCK = [0.34, 0.31, 0.27];
export const CREAM = [0.74, 0.68, 0.52];
export const GOLD = [0.82, 0.6, 0.2];
export const ROOF = [0.66, 0.3, 0.16];
export const PINK_SAND = [0.58, 0.34, 0.27];
export const PINK_DARK = [0.46, 0.26, 0.21];

export function createBuilder() {
  const parts = []; // { geom, color:[r,g,b] }

  const push = (geom, color) => parts.push({ geom, color });

  function box(w, h, d, x, y, z, color = SAND) {
    const g = new THREE.BoxGeometry(w, h, d).toNonIndexed();
    g.translate(x, y, z);
    push(g, color);
  }
  function cyl(rt, rb, h, seg, x, y, z, color = SAND, rot) {
    const g = new THREE.CylinderGeometry(rt, rb, h, seg).toNonIndexed();
    if (rot) g.rotateX(rot[0]), g.rotateZ(rot[2] ?? 0);
    g.translate(x, y, z);
    push(g, color);
  }
  function sphere(r, x, y, z, color = SAND, scaleY = 1) {
    const g = new THREE.SphereGeometry(r, 10, 8).toNonIndexed();
    if (scaleY !== 1) g.scale(1, scaleY, 1);
    g.translate(x, y, z);
    push(g, color);
  }
  function cone(r, h, seg, x, y, z, color = SAND, rot) {
    const g = new THREE.ConeGeometry(r, h, seg).toNonIndexed();
    if (rot) {
      if (rot[0]) g.rotateX(rot[0]);
      if (rot[1]) g.rotateY(rot[1]);
      if (rot[2]) g.rotateZ(rot[2]);
    }
    g.translate(x, y, z);
    push(g, color);
  }

  /** A tapered, tiered prang tower with cornices, base molding and a curved
   *  lotus finial. `faces` adds four outward faces near the top (Bayon). */
  function tower(cx, cz, baseW, y0, totalH, tiers, { faces = false, color = SAND } = {}) {
    const th = totalH / tiers;
    // base molding
    box(baseW * 1.12, th * 0.35, baseW * 1.12, cx, y0 + th * 0.17, cz, DARK_SAND);
    for (let i = 0; i < tiers; i++) {
      const w = baseW * (1 - 0.52 * (i / tiers));
      const y = y0 + (i + 0.5) * th;
      box(w, th, w, cx, y, cz, color);
      // cornice overhang at the top of each tier
      box(w * 1.14, th * 0.16, w * 1.14, cx, y0 + (i + 1) * th - th * 0.08, cz, color);
    }
    if (faces) {
      const fy = y0 + totalH * 0.72;
      const fw = baseW * (1 - 0.52 * 0.72);
      const half = fw / 2;
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const px = cx + dx * (half + 0.03);
        const pz = cz + dz * (half + 0.03);
        if (dx !== 0) box(0.12, 0.4, 0.36, px, fy, pz, color);
        else box(0.36, 0.4, 0.12, px, fy, pz, color);
        const rot = dx === 1 ? [0, 0, -Math.PI / 2] : dx === -1 ? [0, 0, Math.PI / 2] : dz === 1 ? [Math.PI / 2, 0, 0] : [-Math.PI / 2, 0, 0];
        cone(0.07, 0.2, 6, cx + dx * (half + 0.12), fy - 0.03, cz + dz * (half + 0.12), color, rot);
      }
    }
    // curved lotus finial: stacked shrinking discs + bud + tip
    const top = y0 + totalH;
    cyl(baseW * 0.3, baseW * 0.36, 0.14, 10, cx, top + 0.07, cz, color);
    cyl(baseW * 0.2, baseW * 0.28, 0.16, 10, cx, top + 0.22, cz, color);
    cone(baseW * 0.2, 0.5, 10, cx, top + 0.5, cz, color); // bud
    cone(baseW * 0.06, 0.18, 6, cx, top + 0.82, cz, color); // tip
  }

  function build(OUT, { scale = 1 } = {}) {
    const posChunks = parts.map((p) => p.geom.attributes.position.array);
    const normChunks = parts.map((p) => p.geom.attributes.normal.array);
    const vertCount = posChunks.reduce((n, a) => n + a.length / 3, 0);
    const position = new Float32Array(vertCount * 3);
    const normal = new Float32Array(vertCount * 3);
    const color = new Float32Array(vertCount * 3);

    let o = 0;
    for (let pi = 0; pi < parts.length; pi++) {
      const pos = posChunks[pi];
      position.set(pos, o);
      normal.set(normChunks[pi], o);
      // deterministic per-part tone jitter
      const tint = 0.94 + 0.12 * (0.5 + 0.5 * Math.sin(pi * 12.9898));
      const [cr, cg, cb] = parts[pi].color;
      for (let v = 0; v < pos.length; v += 3) {
        const wy = pos[v + 1] * scale;
        // weathering: darker near the ground, lighter higher up
        const shade = Math.max(0.62, Math.min(1.12, 0.74 + 0.05 * wy)) * tint;
        color[o + v] = cr * shade;
        color[o + v + 1] = cg * shade;
        color[o + v + 2] = cb * shade;
      }
      o += pos.length;
    }

    for (let i = 0; i < position.length; i++) position[i] *= scale;

    const min = [Infinity, Infinity, Infinity];
    const max = [-Infinity, -Infinity, -Infinity];
    for (let i = 0; i < position.length; i += 3)
      for (let k = 0; k < 3; k++) {
        min[k] = Math.min(min[k], position[i + k]);
        max[k] = Math.max(max[k], position[i + k]);
      }

    const posB = Buffer.from(position.buffer, position.byteOffset, position.byteLength);
    const normB = Buffer.from(normal.buffer, normal.byteOffset, normal.byteLength);
    const colB = Buffer.from(color.buffer, color.byteOffset, color.byteLength);
    const bin = Buffer.concat([posB, normB, colB]);

    const gltf = {
      asset: { version: "2.0", generator: "CamboVerse temple builder" },
      scene: 0,
      scenes: [{ nodes: [0] }],
      nodes: [{ mesh: 0 }],
      meshes: [{ primitives: [{ attributes: { POSITION: 0, NORMAL: 1, COLOR_0: 2 }, material: 0, mode: 4 }] }],
      materials: [{ pbrMetallicRoughness: { baseColorFactor: [1, 1, 1, 1], metallicFactor: 0, roughnessFactor: 0.95 } }],
      buffers: [{ byteLength: bin.length }],
      bufferViews: [
        { buffer: 0, byteOffset: 0, byteLength: posB.length, target: 34962 },
        { buffer: 0, byteOffset: posB.length, byteLength: normB.length, target: 34962 },
        { buffer: 0, byteOffset: posB.length + normB.length, byteLength: colB.length, target: 34962 },
      ],
      accessors: [
        { bufferView: 0, componentType: 5126, count: vertCount, type: "VEC3", min, max },
        { bufferView: 1, componentType: 5126, count: vertCount, type: "VEC3" },
        { bufferView: 2, componentType: 5126, count: vertCount, type: "VEC3" },
      ],
    };

    const pad = (buf, fill) => {
      const rem = buf.length % 4;
      return rem === 0 ? buf : Buffer.concat([buf, Buffer.alloc(4 - rem, fill)]);
    };
    const jsonChunk = pad(Buffer.from(JSON.stringify(gltf), "utf8"), 0x20);
    const binChunk = pad(bin, 0x00);
    const total = 12 + 8 + jsonChunk.length + 8 + binChunk.length;
    const header = Buffer.alloc(12);
    header.writeUInt32LE(0x46546c67, 0);
    header.writeUInt32LE(2, 4);
    header.writeUInt32LE(total, 8);
    const jh = Buffer.alloc(8);
    jh.writeUInt32LE(jsonChunk.length, 0);
    jh.writeUInt32LE(0x4e4f534a, 4);
    const bh = Buffer.alloc(8);
    bh.writeUInt32LE(binChunk.length, 0);
    bh.writeUInt32LE(0x004e4942, 4);

    mkdirSync(dirname(OUT), { recursive: true });
    writeFileSync(OUT, Buffer.concat([header, jh, jsonChunk, bh, binChunk]));
    console.log(`wrote ${OUT} — ${vertCount} verts, ${(total / 1024).toFixed(1)} KB`);
  }

  return { box, cyl, cone, sphere, tower, build };
}
