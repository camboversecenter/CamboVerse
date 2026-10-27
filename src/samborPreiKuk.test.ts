import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { MeshoptDecoder } from 'three-stdlib';
import { SPOTS } from './spots';

describe('Approved Sambor Prei Kuk import', () => {
  const folder = 'output/sambor-prei-kuk-import-v2';
  const reports = JSON.parse(readFileSync(`${folder}/build-report.json`, 'utf8'));
  const site = SPOTS.find(s => s.id === 'sambor-prei-kuk')!;
  it('keeps five camera stops and the ground/shadow safeguards', () => {
    expect(site.pois?.map(p => p.id)).toEqual(['prasat-sambor', 'prasat-tao', 'prasat-yeay-poan', 'flying-palaces', 'forest-groups']);
    expect(site.overview?.camera).toEqual([6, 6.5, 14]);
    expect(site.aerial).toBe(true);
    expect(site.sceneryGroundY).toBe(-0.35);
    expect(site.sceneryShadowNormalBias).toBe(0.04);
    for (const poi of site.pois!) expect(poi.camera[1]).toBeGreaterThan(poi.target[1]);
    expect(reports[0].triangles).toBeLessThan(reports[1].triangles);
  });
  for (const tier of ['normal', 'ultra']) {
    it(`${tier}: preserves approved geometry and decodes every compressed buffer`, async () => {
      const report = reports.find((r: { tier: string }) => r.tier === tier);
      const source = readFileSync(`output/sambor-prei-kuk-review-v2/sambor-prei-kuk-${tier}.blend`);
      expect(createHash('sha256').update(source).digest('hex')).toBe(report.source_sha256);
      const review = JSON.parse(readFileSync(`output/sambor-prei-kuk-review-v2/${tier}-report.json`, 'utf8'));
      expect(report.triangles).toBe(review.triangles);
      expect(report.draws).toBeLessThanOrEqual(11);
      const url = tier === 'normal' ? site.model : site.heritageUltraModel!;
      const file = readFileSync(`public${url}`);
      expect(file.equals(readFileSync(`${folder}/sambor-prei-kuk-${tier}.glb`))).toBe(true);
      expect(file.readUInt32LE(0)).toBe(0x46546c67);
      expect(file.readUInt32LE(8)).toBe(file.length);
      expect(file.length).toBeLessThan((tier === 'normal' ? 11 : 27) * 1024 * 1024);
      const length = file.readUInt32LE(12);
      const doc = JSON.parse(file.toString('utf8', 20, 20 + length));
      const bin = file.subarray(28 + length);
      expect(doc.extensionsUsed).toContain('EXT_meshopt_compression');
      expect((doc.images ?? []).length).toBe(0);
      for (const mesh of doc.meshes) for (const p of mesh.primitives) expect(p.attributes.COLOR_0).toBeDefined();
      const terrain = doc.nodes.find((n: { name?: string }) => n.name?.includes('Forest soil and moss'));
      const positions = doc.accessors[doc.meshes[terrain.mesh].primitives[0].attributes.POSITION];
      const bottom = positions.min[1] * (terrain.scale?.[1] ?? 1) + (terrain.translation?.[1] ?? 0);
      expect(site.sceneryGroundY).toBeLessThan(bottom - 0.05);
      const decoder = typeof MeshoptDecoder === 'function' ? MeshoptDecoder() : MeshoptDecoder;
      if (!('ready' in decoder)) throw new Error('Bundled meshopt decoder unavailable');
      await decoder.ready;
      let decoded = 0;
      for (const view of doc.bufferViews) {
        const ext = view.extensions?.EXT_meshopt_compression;
        if (!ext) continue;
        const target = new Uint8Array(ext.count * ext.byteStride);
        decoder.decodeGltfBuffer(target, ext.count, ext.byteStride, bin.subarray(ext.byteOffset ?? 0, (ext.byteOffset ?? 0) + ext.byteLength), ext.mode, ext.filter);
        decoded++;
      }
      expect(decoded).toBeGreaterThan(0);
    });
  }
});
