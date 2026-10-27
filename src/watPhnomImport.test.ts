import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { MeshoptDecoder } from 'three-stdlib';
import { BufferAttribute, BufferGeometry, Matrix4, Mesh, MeshBasicMaterial, Quaternion, Raycaster, Vector3 } from 'three';
import { SPOTS } from './spots';

const site = SPOTS.find(s => s.id === 'wat-phnom')!;
const folder = 'output/wat-phnom-import-v4';
const reports = JSON.parse(readFileSync(`${folder}/build-report.json`, 'utf8'));

describe('Approved Wat Phnom local import', () => {
  it('keeps the clock and capture while reframing the larger temple', () => {
    expect(site.landscape).toBe('wat-phnom');
    expect(site.overview?.camera).toEqual([12, 20.4, 26]);
    expect(site.pois?.map(p => p.id)).toEqual(['central-stupa', 'main-vihara', 'naga-staircase', 'flower-clock', 'city-overlook']);
    expect(site.pois?.find(p => p.id === 'flower-clock')?.target).toEqual([0, .1, 12.6]);
    const capture = site.pois?.find(p => p.id === 'naga-staircase')?.capture;
    expect(capture?.normal).toBe('/models/wat-phnom-staircase.splat');
    expect(capture?.ultra).toBe('/models/wat-phnom-staircase-ultra.splat');
    expect(capture?.position).toEqual([0, 1.2, 0]);
    expect(capture?.rotation).toEqual([Math.PI / 2, 0, 0]);
    expect(capture?.scale).toBe(2.5);
    expect(capture?.walk?.eyeHeight).toBe(.30);
    expect(site.sceneryGroundY).toBe(-.12);
    expect(site.sceneryShadowNormalBias).toBe(.025);
  });

  for (const tier of ['normal', 'ultra']) it(`${tier}: decodes the model, preserves sources and keeps terrain below stairs/clock`, async () => {
    const report = reports.find((r: { tier: string }) => r.tier === tier);
    const source = readFileSync(`output/wat-phnom-review-v4/wat-phnom-${tier}.blend`);
    expect(createHash('sha256').update(source).digest('hex')).toBe(report.source_sha256);
    const review = JSON.parse(readFileSync(`output/wat-phnom-review-v4/${tier}-report.json`, 'utf8'));
    expect(report.triangles).toBe(review.triangles);
    expect(report.draws).toBe(19);
    expect(report.trees).toBe(70);
    expect(report.clockTerrainVerticesLowered).toBeGreaterThan(0);
    const url = tier === 'normal' ? site.model : site.heritageUltraModel!;
    const file = readFileSync(`public${url}`);
    expect(file.equals(readFileSync(`${folder}/wat-phnom-${tier}.glb`))).toBe(true);
    expect(file.readUInt32LE(0)).toBe(0x46546c67);
    expect(file.readUInt32LE(8)).toBe(file.length);
    expect(file.length).toBeLessThan((tier === 'normal' ? 2 : 4) * 1024 * 1024);
    const length = file.readUInt32LE(12);
    const doc = JSON.parse(file.toString('utf8', 20, 20 + length));
    const bin = file.subarray(28 + length);
    expect(doc.extensionsUsed).toContain('EXT_meshopt_compression');
    expect(doc.images.every((im: { uri?: string; bufferView?: number }) => !im.uri && im.bufferView !== undefined)).toBe(true);
    const decoder = typeof MeshoptDecoder === 'function' ? MeshoptDecoder() : MeshoptDecoder;
    if (!('ready' in decoder)) throw new Error('Bundled meshopt unavailable');
    await decoder.ready;
    const decoded = new Map<number, Uint8Array>();
    for (let i = 0; i < doc.bufferViews.length; i++) {
      const view = doc.bufferViews[i], ext = view.extensions?.EXT_meshopt_compression;
      if (!ext) continue;
      const target = new Uint8Array(ext.count * ext.byteStride);
      decoder.decodeGltfBuffer(target, ext.count, ext.byteStride, bin.subarray(ext.byteOffset ?? 0, (ext.byteOffset ?? 0) + ext.byteLength), ext.mode, ext.filter);
      decoded.set(i, target);
    }
    const values = (id: number) => {
      const a = doc.accessors[id], view = doc.bufferViews[a.bufferView], data = decoded.get(a.bufferView)!;
      expect(data).toBeDefined();
      const dv = new DataView(data.buffer, data.byteOffset, data.byteLength);
      const components = a.type === 'VEC3' ? 3 : 1;
      const bytes = a.componentType === 5123 ? 2 : 4;
      const stride = view.extensions.EXT_meshopt_compression.byteStride;
      const result: number[] = [];
      for (let i = 0; i < a.count; i++) for (let j = 0; j < components; j++) {
        const offset = (a.byteOffset ?? 0) + i * stride + j * bytes;
        result.push(a.componentType === 5126 ? dv.getFloat32(offset, true) : bytes === 2 ? dv.getUint16(offset, true) : dv.getUint32(offset, true));
      }
      expect(result.every(Number.isFinite)).toBe(true);
      return result;
    };
    const material = new MeshBasicMaterial();
    const stairs: Mesh[] = [], terrain: Mesh[] = [];
    let triangles = 0;
    for (const node of doc.nodes) {
      if (node.mesh === undefined) continue;
      expect(node.children).toBeUndefined();
      for (const primitive of doc.meshes[node.mesh].primitives) {
        triangles += doc.accessors[primitive.indices].count / 3;
        if (!node.name.startsWith('Batched Naga |') && !node.name.includes('green hill ground')) continue;
        const g = new BufferGeometry();
        g.setAttribute('position', new BufferAttribute(new Float32Array(values(primitive.attributes.POSITION)), 3));
        g.setIndex(new BufferAttribute(new Uint32Array(values(primitive.indices)), 1));
        const matrix = new Matrix4().compose(new Vector3().fromArray(node.translation ?? [0, 0, 0]), new Quaternion().fromArray(node.rotation ?? [0, 0, 0, 1]), new Vector3().fromArray(node.scale ?? [1, 1, 1]));
        g.applyMatrix4(matrix);
        (node.name.startsWith('Batched Naga |') ? stairs : terrain).push(new Mesh(g, material));
      }
    }
    expect(triangles).toBe(report.triangles);
    const ray = new Raycaster();
    for (let i = 0; i <= 50; i++) for (const x of [-.8, 0, .8]) {
      const z = 11.49 - i * (11.49 - 2.2) / 50;
      ray.set(new Vector3(x, 4, z), new Vector3(0, -1, 0));
      const stair = ray.intersectObjects(stairs)[0], hill = ray.intersectObjects(terrain)[0];
      expect(stair, `stair at ${x}, ${z}`).toBeDefined(); expect(hill, `hill at ${x}, ${z}`).toBeDefined();
      expect(stair.point.y).toBeGreaterThan(hill.point.y + .015);
    }
    for (let i = 0; i < 32; i++) for (const radius of [0, 1, 2.25]) {
      const a = i * Math.PI / 16;
      ray.set(new Vector3(Math.cos(a) * radius, 4, 13.2 + Math.sin(a) * radius), new Vector3(0, -1, 0));
      const hill = ray.intersectObjects(terrain)[0];
      expect(hill).toBeDefined();
      expect(hill.point.y + 1.4).toBeLessThan(.045); // clock face is Y=.07
      expect(hill.point.y + 1.4).toBeGreaterThan(site.sceneryGroundY! + .05);
    }
    [...stairs, ...terrain].forEach(m => m.geometry.dispose()); material.dispose();
  });
});
