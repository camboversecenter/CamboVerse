import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { SPOTS } from './spots';

describe('Preah Vihear reference-guided import', () => {
  const site = SPOTS.find(s => s.id === 'preah-vihear')!;
  it('uses the new pair and a whole-ridge overview', () => {
    expect(site.model).toBe('/models/local/preah-vihear-green-v4/preah-vihear-normal.glb');
    expect(site.heritageUltraModel).toBe('/models/local/preah-vihear-green-v4/preah-vihear-ultra.glb');
    expect(site.overview?.camera).toEqual([14, 17, 20]);
    expect(site.aerial).toBe(true);
    expect(site.pois?.find(p => p.id === 'long-ascent')?.target[2]).toBe(4.5);
    expect(site.pois?.find(p => p.id === 'lord-of-the-peak')?.target[2]).toBe(-4.95);
    for (const poi of site.pois!) {
      expect(poi.camera[1]).toBeGreaterThan(poi.target[1]);
    }
  });
  for (const tier of ['normal', 'ultra']) {
    it(`${tier}: preserves source geometry and grounds the viewer-scaled ridge`, () => {
      const source = readFileSync(resolve(`output/preah-vihear-green-v4/preah-vihear-${tier}.glb`));
      const file = readFileSync(resolve(`public/models/local/preah-vihear-green-v4/preah-vihear-${tier}.glb`));
      expect(file.readUInt32LE(0)).toBe(0x46546c67);
      expect(file.readUInt32LE(8)).toBe(file.length);
      const length = file.readUInt32LE(12);
      const doc = JSON.parse(file.toString('utf8', 20, 20 + length));
      expect(doc.materials.some((m: { name: string }) => m.name.startsWith('Cliff stratum'))).toBe(false);
      const grass = doc.materials.find((m: { name: string }) => m.name === 'Dry plateau').pbrMetallicRoughness.baseColorFactor;
      expect(grass[1]).toBeGreaterThan(grass[0]);
      expect(grass[1]).toBeGreaterThan(grass[2]);
      const placement = doc.nodes[doc.scenes[doc.scene ?? 0].nodes[0]];
      expect(placement.scale).toEqual([.15, .15, .15]);
      expect(placement.translation).toEqual([0, 3, 0]);
      expect(-20 * placement.scale[1] + placement.translation[1]).toBeCloseTo(0);
      expect(file.subarray(20 + length).equals(source.subarray(20 + source.readUInt32LE(12)))).toBe(true);
      expect(doc.images.every((image: { uri?: string; bufferView?: number }) => !image.uri && image.bufferView !== undefined)).toBe(true);
    });
  }
  it('keeps the same forest in both tiers with lower Normal geometry cost', () => {
    const report = JSON.parse(readFileSync(resolve('output/preah-vihear-green-v4/build-report.json'), 'utf8'));
    expect(report[0].treePositions).toEqual(report[1].treePositions);
    expect(report[0].newTrees).toBeGreaterThanOrEqual(400);
    expect(report[0].triangles).toBeLessThan(65000);
    expect(report[0].bytes).toBeLessThan(5 * 1024 * 1024);
    expect(report[0].triangles).toBeLessThan(report[1].triangles);
    expect(report.every((r: { draws: number }) => r.draws <= 12)).toBe(true);
  });
});
