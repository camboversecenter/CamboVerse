import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { MeshoptDecoder } from 'three-stdlib';
import { describe, expect, it } from 'vitest';
import { SPOTS } from './spots';

describe('Approved Banteay Chhmar local import', () => {
  const folder = 'output/banteay-chhmar-import-v4';
  const reports = JSON.parse(readFileSync(resolve(`${folder}/build-report.json`), 'utf8'));
  it('preserves the approved source and opens with matching camera stops', () => {
    const hash = createHash('sha256').update(readFileSync(resolve('output/banteay-chhmar-review-v4/banteay-chhmar-review-v4.blend'))).digest('hex');
    expect(reports.every((r: { source_sha256: string }) => r.source_sha256 === hash)).toBe(true);
    const site = SPOTS.find(s => s.id === 'banteay-chhmar')!;
    expect(site.model).toBe('/models/local/banteay-chhmar-refined-v4/banteay-chhmar-normal.glb');
    expect(site.heritageUltraModel).toBe('/models/local/banteay-chhmar-refined-v4/banteay-chhmar-ultra.glb');
    expect(site.overview?.camera).toEqual([1.8, 1.56, 2.76]);
    expect(site.aerial).toBe(true);
    expect(site.sceneryShadowNormalBias).toBe(0.04);
    expect(site.pois?.map(p => p.id)).toContain('site-layout');
    for (const poi of site.pois!) expect(poi.camera[1]).toBeGreaterThan(poi.target[1]);
    expect(reports[0].triangles).toBeLessThan(reports[1].triangles);
    expect(reports[0].components.map((c: { name: string }) => c.name)).toEqual(reports[1].components.map((c: { name: string }) => c.name));
    for (const r of reports) {
      expect(r.components.filter((c: { name: string }) => c.name.includes('continuous relief'))).toHaveLength(16);
      expect(r.components.filter((c: { name: string }) => c.name.includes('internal head masonry')).every((c: { triangles: number }) => c.triangles === 12)).toBe(true);
      expect(r.draws).toBeLessThanOrEqual(10);
    }
  });
  for (const tier of ['normal', 'ultra']) {
    it(`${tier}: loads all compressed buffers with the viewer's bundled decoder`, async () => {
      const file = readFileSync(resolve(`public/models/local/banteay-chhmar-refined-v4/banteay-chhmar-${tier}.glb`));
      expect(file.equals(readFileSync(resolve(`${folder}/banteay-chhmar-${tier}.glb`)))).toBe(true);
      expect(file.readUInt32LE(0)).toBe(0x46546c67);
      expect(file.readUInt32LE(8)).toBe(file.length);
      const length = file.readUInt32LE(12);
      const doc = JSON.parse(file.toString('utf8', 20, 20 + length));
      const bin = file.subarray(28 + length);
      // Keep the background below the entire authored terrain in BOTH tiers,
      // not coplanar with its top at Y=0 (camera-dependent striped flicker).
      const terrain = doc.nodes.find((n: { name?: string }) => n.name?.includes('Dry forest soil'));
      expect(terrain).toBeDefined();
      const positions = doc.accessors[doc.meshes[terrain.mesh].primitives[0].attributes.POSITION];
      const terrainBottom = positions.min[1] * terrain.scale[1] + terrain.translation[1];
      const site = SPOTS.find(s => s.id === 'banteay-chhmar')!;
      expect(site.sceneryGroundY).toBeLessThan(terrainBottom - 0.05);
      expect(SPOTS.filter(s => !['banteay-chhmar', 'sambor-prei-kuk', 'wat-phnom', 'royal-palace', 'oudong', 'bayon', 'angkor-wat', 'ta-prohm', 'banteay-srei', 'preah-khan', 'beng-mealea', 'phnom-kulen', 'pre-rup'].includes(s.id)).every(s => s.sceneryGroundY === undefined)).toBe(true);
      expect(doc.extensionsUsed).toContain('EXT_meshopt_compression');
      expect(doc.images.every((im: { uri?: string; bufferView?: number }) => !im.uri && im.bufferView !== undefined)).toBe(true);
      const decoder = typeof MeshoptDecoder === 'function' ? MeshoptDecoder() : MeshoptDecoder;
      if (!('ready' in decoder)) throw new Error('Bundled meshopt decoder is unavailable');
      await decoder.ready;
      let decoded = 0;
      for (const view of doc.bufferViews) {
        const ext = view.extensions?.EXT_meshopt_compression;
        if (!ext) continue;
        expect(ext.buffer).toBe(0);
        const target = new Uint8Array(ext.count * ext.byteStride);
        decoder.decodeGltfBuffer(target, ext.count, ext.byteStride, bin.subarray(ext.byteOffset ?? 0, (ext.byteOffset ?? 0) + ext.byteLength), ext.mode, ext.filter);
        decoded++;
      }
      expect(decoded).toBeGreaterThan(0);
      expect(file.length).toBeLessThan((tier === 'normal' ? 12 : 15) * 1024 * 1024);
    });
  }
});
