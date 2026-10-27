import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('Blender fashion display assets', () => {
  for (const tier of ['normal', 'ultra']) {
    it(`${tier}: ships a complete, self-contained mannequin within budget`, () => {
      const file = readFileSync(`public/models/fashion/fashion-day-v2-${tier}.glb`);
      expect(file.readUInt32LE(0)).toBe(0x46546c67);
      expect(file.readUInt32LE(8)).toBe(file.length);
      const length = file.readUInt32LE(12);
      const doc = JSON.parse(file.toString('utf8', 20, 20 + length));
      expect(file.length).toBeLessThan(tier === 'normal' ? 600_000 : 1_800_000);
      expect(doc.buffers.every((b: { uri?: string }) => !b.uri)).toBe(true);
      expect(doc.images ?? []).toHaveLength(0);
      expect(doc.meshes).toHaveLength(3);
      const names = doc.materials.map((m: { name: string }) => m.name.replace(/\.\d+$/, '')).sort();
      expect(names).toEqual(['antique-gold', 'day-fabric', 'mannequin-ivory']);
      let triangles = 0;
      for (const mesh of doc.meshes) {
        expect(mesh.primitives).toHaveLength(1);
        for (const primitive of mesh.primitives) {
          expect(primitive.mode ?? 4).toBe(4);
          triangles += doc.accessors[primitive.indices].count / 3;
          const positions = doc.accessors[primitive.attributes.POSITION];
          expect(positions.min.every(Number.isFinite)).toBe(true);
          expect(positions.max.every(Number.isFinite)).toBe(true);
        }
      }
      expect(triangles).toBeLessThan(tier === 'normal' ? 25_000 : 80_000);
      const fabric = doc.materials.find((m: { name: string }) => m.name.startsWith('day-fabric'));
      expect(fabric.extensions?.KHR_materials_transmission).toBeUndefined();
      expect(fabric.alphaMode ?? 'OPAQUE').toBe('OPAQUE');
    });
  }
});
