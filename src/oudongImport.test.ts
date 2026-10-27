import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { MeshoptDecoder } from 'three-stdlib';
import { BufferAttribute, BufferGeometry, Matrix4, Mesh, MeshBasicMaterial, Quaternion, Raycaster, Vector3 } from 'three';
import { SPOTS } from './spots';
import { isTerrainFloor } from './terrainWalk';

const site = SPOTS.find(s => s.id === 'oudong')!;
const report = (tier: string) => JSON.parse(readFileSync(`output/oudong-review-v2/${tier}-report.json`, 'utf8'));
const hash = (data: Buffer) => createHash('sha256').update(data).digest('hex');

describe('Oudong hill import and terrain walking', () => {
  it('preserves existing stops, shares landmarks/trees across tiers and limits terrain opt-in', () => {
    expect(site.pois?.map(p => p.id)).toEqual(['oudong-mountain', 'royal-stupas']);
    expect(SPOTS.filter(s => s.terrainWalking).map(s => s.id)).toEqual(['angkor-wat', 'bayon', 'ta-prohm', 'banteay-srei', 'preah-khan', 'beng-mealea', 'pre-rup', 'oudong']);
    expect(site.aerial).toBe(true);
    expect(new Vector3(...site.overview!.camera).distanceTo(new Vector3(...site.overview!.target))).toBeLessThan(55);
    expect(report('normal').landmarks).toEqual(report('ultra').landmarks);
    expect(report('normal').trees).toEqual(report('ultra').trees);
    expect(report('normal').trees).toHaveLength(112);
    expect(report('ultra').triangles).toBeGreaterThan(report('normal').triangles);
  });
  it('accepts elevated steps and descending ground, not walls, roofs or ceilings', () => {
    expect(isTerrainFloor(4.12, 4, 1)).toBe(true);
    expect(isTerrainFloor(3.9, 4, 1)).toBe(true);
    expect(isTerrainFloor(-.15, 0, .9)).toBe(true);
    expect(isTerrainFloor(8, 4, 1)).toBe(false);
    expect(isTerrainFloor(4, 4, 0)).toBe(false);
    expect(isTerrainFloor(4, 4, -1)).toBe(false);
    expect(isTerrainFloor(NaN, 4, 1)).toBe(false);
  });
  for (const tier of ['normal', 'ultra']) it(`${tier}: decodes the real file and supports ascent/descent without terrain poking through`, async () => {
    const r = report(tier), file = readFileSync(`public${tier === 'normal' ? site.model : site.heritageUltraModel}`);
    expect(hash(readFileSync(`public/models/local/heritage-blender-v1/oudong-${tier}.glb`))).toBe(r.originalSha256);
    expect(hash(file)).toBe(r.sha256);
    expect(file.readUInt32LE(0)).toBe(0x46546c67); expect(file.readUInt32LE(8)).toBe(file.length);
    expect(file.length).toBeLessThan((tier === 'normal' ? 1 : 3) * 1024 * 1024);
    const length = file.readUInt32LE(12), doc = JSON.parse(file.toString('utf8', 20, 20 + length)), bin = file.subarray(28 + length);
    expect(doc.extensionsUsed).toContain('EXT_meshopt_compression'); expect(doc.images ?? []).toHaveLength(0);
    const decoder = typeof MeshoptDecoder === 'function' ? MeshoptDecoder() : MeshoptDecoder;
    if (!('ready' in decoder)) throw new Error('Bundled meshopt unavailable');
    await decoder.ready;
    const decoded = new Map<number, Uint8Array>();
    for (let i = 0; i < doc.bufferViews.length; i++) {
      const ext = doc.bufferViews[i].extensions?.EXT_meshopt_compression;
      if (!ext) continue;
      const data = new Uint8Array(ext.count * ext.byteStride);
      decoder.decodeGltfBuffer(data, ext.count, ext.byteStride, bin.subarray(ext.byteOffset ?? 0, (ext.byteOffset ?? 0) + ext.byteLength), ext.mode, ext.filter);
      decoded.set(i, data);
    }
    const values = (id: number) => {
      const a = doc.accessors[id], data = decoded.get(a.bufferView)!, view = doc.bufferViews[a.bufferView];
      const dv = new DataView(data.buffer, data.byteOffset, data.byteLength), size = a.type === 'VEC3' ? 3 : 1, bytes = a.componentType === 5123 ? 2 : 4;
      const result: number[] = [];
      for (let i = 0; i < a.count; i++) for (let j = 0; j < size; j++) {
        const offset = (a.byteOffset ?? 0) + i * view.extensions.EXT_meshopt_compression.byteStride + j * bytes;
        result.push(a.componentType === 5126 ? dv.getFloat32(offset, true) : bytes === 2 ? dv.getUint16(offset, true) : dv.getUint32(offset, true));
      }
      expect(result.every(Number.isFinite)).toBe(true); return result;
    };
    const material = new MeshBasicMaterial(), meshes: Mesh[] = [];
    let triangles = 0;
    for (const node of doc.nodes) {
      if (node.mesh === undefined) continue;
      expect(node.children).toBeUndefined();
      for (const primitive of doc.meshes[node.mesh].primitives) {
        const positions = values(primitive.attributes.POSITION), indices = values(primitive.indices);
        expect(indices.every(i => i >= 0 && i < positions.length / 3)).toBe(true); triangles += indices.length / 3;
        const g = new BufferGeometry(); g.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3)); g.setIndex(new BufferAttribute(new Uint32Array(indices), 1));
        g.applyMatrix4(new Matrix4().compose(new Vector3().fromArray(node.translation ?? [0, 0, 0]), new Quaternion().fromArray(node.rotation ?? [0, 0, 0, 1]), new Vector3().fromArray(node.scale ?? [1, 1, 1])));
        const mesh = new Mesh(g, material); mesh.name = node.name; meshes.push(mesh);
      }
    }
    expect(meshes).toHaveLength(14); expect(triangles).toBe(r.triangles);
    expect(triangles).toBeLessThan(tier === 'normal' ? 120000 : 300000);
    const stairs = meshes.filter(m => m.name === 'Terraces and stairs'), terrain = meshes.filter(m => m.name === 'Green hill surface');
    const ray = new Raycaster(), normal = new Vector3();
    for (const x of [-1, 0, 1]) {
      const route = Array.from({ length: 155 }, (_, i) => 9.5 - i * .05);
      let feet = 0;
      for (const z of [...route, ...route.toReversed()]) {
        ray.set(new Vector3(x, feet + 3.25, z), new Vector3(0, -1, 0)); ray.far = Infinity;
        const hit = ray.intersectObjects(meshes).find(h => h.face && isTerrainFloor(h.point.y, feet, normal.copy(h.face.normal).transformDirection(h.object.matrixWorld).y));
        expect(hit, `${tier} floor ${x},${z}`).toBeDefined();
        const expected = z >= 9 ? 0 : z <= 2 ? 4.12 : Math.ceil((9 - z) * 48 / 7 - 1e-6) * 4 / 48;
        expect(Math.abs(hit!.point.y - expected)).toBeLessThan(.09);
        expect(Math.abs(hit!.point.y - feet)).toBeLessThan(.20);
        feet = hit!.point.y;
        if (z < 8.9 && z > 2.1) {
          const stair = ray.intersectObjects(stairs)[0], hill = ray.intersectObjects(terrain)[0];
          expect(stair.point.y).toBeGreaterThan(hill.point.y + .02);
        }
      }
      expect(feet).toBeCloseTo(0, 4);
    }
    for (const poi of site.pois!) {
      const camera = new Vector3(...poi.camera), target = new Vector3(...poi.target);
      ray.set(camera, target.clone().sub(camera).normalize()); ray.far = camera.distanceTo(target);
      const hit = ray.intersectObjects(meshes)[0];
      expect(hit?.object.name ?? '', poi.id).not.toMatch(/canopy|Tree bark/);
      if (hit) expect(hit.distance).toBeGreaterThan(.5);
    }
    meshes.forEach(m => m.geometry.dispose()); material.dispose();
  });
});
