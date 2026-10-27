import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { SPOTS } from './spots';

describe('Koh Ker reference-guided refinement', () => {
  const site = SPOTS.find(s => s.id === 'koh-ker')!;
  const reports = JSON.parse(readFileSync(resolve('output/koh-ker-refined-v2/build-report.json'), 'utf8'));
  it('opens the refined pair with cameras above the monument', () => {
    expect(site.model).toBe('/models/local/koh-ker-refined-v2/koh-ker-normal.glb');
    expect(site.heritageUltraModel).toBe('/models/local/koh-ker-refined-v2/koh-ker-ultra.glb');
    expect(site.overview?.camera).toEqual([9, 8, 12]);
    expect(site.aerial).toBe(true);
    for (const poi of site.pois!) expect(poi.camera[1]).toBeGreaterThan(poi.target[1]);
  });
  it('preserves seven ascending terraces and the same forest in both modes', () => {
    expect(reports[0].levels).toEqual(reports[1].levels);
    expect(reports[0].trees).toEqual(reports[1].trees);
    expect(reports[0].trees).toHaveLength(145);
    for (const report of reports) {
      expect(report.levels).toHaveLength(7);
      report.levels.forEach((level: { width: number; bottom: number; top: number }, i: number) => {
        expect(level.top).toBeGreaterThan(level.bottom);
        if (i) {
          expect(level.bottom).toBeCloseTo(report.levels[i - 1].top);
          expect(level.width).toBeLessThan(report.levels[i - 1].width);
        }
      });
      expect(report.draws).toBeLessThanOrEqual(10);
    }
    expect(reports[0].triangles).toBeLessThan(30000);
    expect(reports[0].bytes).toBeLessThan(2 * 1024 * 1024);
    expect(reports[1].triangles).toBeLessThan(80000);
    expect(reports[0].triangles).toBeLessThan(reports[1].triangles);
  });
  for (const tier of ['normal', 'ultra']) {
    it(`${tier}: imports the exact reviewed GLB with self-contained textures`, () => {
      const source = readFileSync(resolve(`output/koh-ker-refined-v2/koh-ker-${tier}.glb`));
      const file = readFileSync(resolve(`public/models/local/koh-ker-refined-v2/koh-ker-${tier}.glb`));
      expect(file.equals(source)).toBe(true);
      expect(file.readUInt32LE(0)).toBe(0x46546c67);
      expect(file.readUInt32LE(8)).toBe(file.length);
      const doc = JSON.parse(file.toString('utf8', 20, 20 + file.readUInt32LE(12)));
      expect(doc.images).toHaveLength(4);
      expect(doc.images.every((im: { uri?: string; bufferView?: number }) => !im.uri && im.bufferView !== undefined)).toBe(true);
      expect(doc.buffers.every((buffer: { uri?: string }) => !buffer.uri)).toBe(true);
      expect(doc.meshes.reduce((n: number, mesh: { primitives: unknown[] }) => n + mesh.primitives.length, 0)).toBe(10);
      const triangles = doc.meshes.reduce((n: number, mesh: { primitives: { indices: number }[] }) =>
        n + mesh.primitives.reduce((sum, primitive) => sum + doc.accessors[primitive.indices].count / 3, 0), 0);
      expect(triangles).toBe(reports.find((r: { tier: string }) => r.tier === tier).triangles);
    });
  }
});
