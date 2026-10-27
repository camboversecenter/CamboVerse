import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { MeshoptDecoder } from 'three-stdlib';
import { BufferAttribute, BufferGeometry, Matrix4, Mesh, MeshBasicMaterial, Quaternion, Raycaster, Vector3 } from 'three';
import { SPOTS } from './spots';

const site = SPOTS.find(s => s.id === 'royal-palace')!;
const report = (tier: string) => JSON.parse(readFileSync(`output/royal-palace-review-v2/${tier}-report.json`, 'utf8'));
const hash = (data: Buffer) => createHash('sha256').update(data).digest('hex');

describe('Royal Palace reference-led import', () => {
  it('keeps all five stops, matching content in both tiers, and a usable overview', () => {
    expect(site.pois?.map(p => p.id)).toEqual(['facing-chaktomuk', 'throne-hall', 'golden-spire', 'moonlight-pavilion', 'silver-pagoda']);
    expect(site.aerial).toBe(true); // enables the 55-unit orbit range
    expect(site.overview?.camera).toEqual([25, 25, 34]);
    expect(new Vector3(...site.overview!.camera).distanceTo(new Vector3(...site.overview!.target))).toBeLessThan(55);
    expect(report('normal').landmarks).toEqual(report('ultra').landmarks);
    expect(report('normal').trees).toEqual(report('ultra').trees);
    expect(report('ultra').triangles).toBeGreaterThan(report('normal').triangles);
  });

  for (const tier of ['normal', 'ultra']) it(`${tier}: decodes, fits budget and has a clear ground-level entrance`, async () => {
    const r = report(tier);
    expect(hash(readFileSync(`public/models/local/heritage-blender-v1/royal-palace-${tier}.glb`))).toBe(r.originalSha256);
    const url = tier === 'normal' ? site.model : site.heritageUltraModel!;
    const file = readFileSync(`public${url}`);
    expect(hash(file)).toBe(r.sha256);
    expect(file.readUInt32LE(0)).toBe(0x46546c67);
    expect(file.readUInt32LE(8)).toBe(file.length);
    expect(file.length).toBeLessThan((tier === 'normal' ? 1 : 2) * 1024 * 1024);
    const length = file.readUInt32LE(12);
    const doc = JSON.parse(file.toString('utf8', 20, 20 + length));
    const bin = file.subarray(28 + length);
    expect(doc.extensionsUsed).toContain('EXT_meshopt_compression');
    expect(doc.images ?? []).toHaveLength(0);
    expect(doc.cameras ?? []).toHaveLength(0);
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
      const a = doc.accessors[id], data = decoded.get(a.bufferView)!;
      const view = doc.bufferViews[a.bufferView];
      const dv = new DataView(data.buffer, data.byteOffset, data.byteLength);
      const size = a.type === 'VEC3' ? 3 : 1, bytes = a.componentType === 5123 ? 2 : 4;
      const result: number[] = [];
      for (let i = 0; i < a.count; i++) for (let j = 0; j < size; j++) {
        const offset = (a.byteOffset ?? 0) + i * view.extensions.EXT_meshopt_compression.byteStride + j * bytes;
        result.push(a.componentType === 5126 ? dv.getFloat32(offset, true) : bytes === 2 ? dv.getUint16(offset, true) : dv.getUint32(offset, true));
      }
      expect(result.every(Number.isFinite)).toBe(true);
      return result;
    };
    const material = new MeshBasicMaterial();
    const meshes: Mesh[] = [];
    let triangles = 0;
    for (const node of doc.nodes) {
      if (node.mesh === undefined) continue;
      expect(node.children).toBeUndefined();
      for (const primitive of doc.meshes[node.mesh].primitives) {
        const positions = values(primitive.attributes.POSITION), indices = values(primitive.indices);
        expect(Math.max(...indices)).toBeLessThan(positions.length / 3);
        triangles += indices.length / 3;
        const g = new BufferGeometry();
        g.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3));
        g.setIndex(new BufferAttribute(new Uint32Array(indices), 1));
        g.applyMatrix4(new Matrix4().compose(new Vector3().fromArray(node.translation ?? [0, 0, 0]), new Quaternion().fromArray(node.rotation ?? [0, 0, 0, 1]), new Vector3().fromArray(node.scale ?? [1, 1, 1])));
        const mesh = new Mesh(g, material); mesh.name = node.name;
        meshes.push(mesh);
      }
    }
    expect(meshes).toHaveLength(15);
    expect(triangles).toBe(r.triangles);
    expect(triangles).toBeLessThan(tier === 'normal' ? 80000 : 180000);
    expect(site.sceneryGroundY).toBeLessThan(-.24 - .05);
    const ray = new Raycaster();
    // Walking spawn, open entrance and axis through courtyard stay on Y=0.
    for (const z of [13, 11.3, 9.5, 7, 5, 3, 1]) {
      ray.set(new Vector3(0, 1.5, z), new Vector3(0, -1, 0));
      const ground = ray.intersectObjects(meshes)[0];
      expect(ground, `ground at z=${z}`).toBeDefined();
      expect(ground.point.y).toBeCloseTo(0, 4);
    }
    ray.set(new Vector3(0, .8, 13), new Vector3(0, 0, -1)); ray.far = 5;
    expect(ray.intersectObjects(meshes)).toHaveLength(0);
    // Landmark stops must not put a foreground tree between camera and building.
    for (const poi of site.pois!) {
      const camera = new Vector3(...poi.camera), target = new Vector3(...poi.target);
      ray.set(camera, target.clone().sub(camera).normalize()); ray.far = camera.distanceTo(target);
      const hit = ray.intersectObjects(meshes)[0];
      expect(hit?.object.name ?? '', poi.id).not.toMatch(/Canopy|Tree trunks/);
    }
    meshes.forEach(m => m.geometry.dispose()); material.dispose();
  });
});
