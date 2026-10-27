import { readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { Box3, BufferAttribute, BufferGeometry, Matrix4, Mesh, MeshBasicMaterial, Quaternion, Raycaster, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { SPOTS } from './spots';

const folder = 'public/models/local/wat-phnom-naga-v3';
const oldFolder = 'public/models/local/heritage-blender-v1';
// Read the self-contained Blender GLB without loading a browser/image decoder.
type Accessor = { getCount(): number; getArray(): number[]; getElement(i: number, into: number[]): number[] };
type Primitive = { getIndices(): Accessor | undefined; getAttribute(name: string): Accessor | undefined };
type Node = { getName(): string; getWorldMatrix(): number[]; getMesh(): { listPrimitives(): Primitive[] } | undefined };
type Document = Node[];
type Gltf = {
  nodes: { name: string; mesh?: number; children?: number[]; matrix?: number[]; translation?: number[]; rotation?: number[]; scale?: number[] }[];
  meshes: { primitives: { indices?: number; attributes: Record<string, number> }[] }[];
  accessors: { count: number; type: string; componentType: number; bufferView: number; byteOffset?: number }[];
  bufferViews: { byteOffset?: number; byteStride?: number }[];
};
const load = async (base: string, tier: string): Promise<Document> => {
  const file = readFileSync(resolve(base, `wat-phnom-${tier}.glb`));
  expect(file.readUInt32LE(0)).toBe(0x46546c67);
  expect(file.readUInt32LE(8)).toBe(file.length);
  const jsonLength = file.readUInt32LE(12);
  const doc: Gltf = JSON.parse(file.subarray(20, 20 + jsonLength).toString());
  const binary = file.subarray(28 + jsonLength);
  const accessor = (id: number): Accessor => {
    const a = doc.accessors[id], v = doc.bufferViews[a.bufferView];
    const components = a.type === 'VEC3' ? 3 : 1;
    const bytes = a.componentType === 5123 ? 2 : 4;
    const values: number[] = [];
    for (let i = 0; i < a.count; i++) for (let j = 0; j < components; j++) {
      const offset = (v.byteOffset ?? 0) + (a.byteOffset ?? 0) + i * (v.byteStride ?? bytes * components) + j * bytes;
      values.push(a.componentType === 5126 ? binary.readFloatLE(offset) : bytes === 2 ? binary.readUInt16LE(offset) : binary.readUInt32LE(offset));
    }
    return { getCount: () => a.count, getArray: () => values,
      getElement: i => values.slice(i * components, (i + 1) * components) };
  };
  const world = (id: number): Matrix4 => {
    const n = doc.nodes[id];
    const local = n.matrix ? new Matrix4().fromArray(n.matrix) : new Matrix4().compose(
      new Vector3().fromArray(n.translation ?? [0, 0, 0]),
      new Quaternion().fromArray(n.rotation ?? [0, 0, 0, 1]),
      new Vector3().fromArray(n.scale ?? [1, 1, 1]));
    const parent = doc.nodes.findIndex(p => p.children?.includes(id));
    return parent < 0 ? local : world(parent).multiply(local);
  };
  return doc.nodes.map((n, id) => {
    const primitives = n.mesh === undefined ? undefined : doc.meshes[n.mesh].primitives.map(p => {
      const positions = accessor(p.attributes.POSITION);
      const indices = p.indices === undefined ? undefined : accessor(p.indices);
      return { getIndices: () => indices, getAttribute: () => positions };
    });
    return { getName: () => n.name, getWorldMatrix: () => world(id).toArray(),
      getMesh: () => primitives ? { listPrimitives: () => primitives } : undefined };
  });
};
const meshNodes = (d: Document) => d.filter(n => n.getMesh());
const oldStair = (n: Node) => /^(Naga stair|Guardians)/.test(n.getName());
const newStair = (n: Node) => n.getName().startsWith('Naga v3 |');

function bounds(n: Node) {
  const box = new Box3();
  const matrix = new Matrix4().fromArray(n.getWorldMatrix());
  for (const p of n.getMesh()!.listPrimitives()) {
    const a = p.getAttribute('POSITION')!;
    for (let i = 0; i < a.getCount(); i++) {
      box.expandByPoint(new Vector3().fromArray(a.getElement(i, [] )).applyMatrix4(matrix));
    }
  }
  return [...box.min.toArray(), ...box.max.toArray()];
}

function triangles(d: Document) {
  return meshNodes(d).reduce((sum, n) => sum + n.getMesh()!.listPrimitives().reduce(
    (total, p) => total + (p.getIndices()?.getCount() ?? p.getAttribute('POSITION')!.getCount()) / 3, 0), 0);
}

describe('Wat Phnom Blender staircase revision', () => {
  it('uses the revised model in both tiers without changing the captured staircase', () => {
    const spot = SPOTS.find(s => s.id === 'wat-phnom')!;
    expect(spot.model).toBe('/models/local/wat-phnom-refined-v4/wat-phnom-normal.glb');
    expect(spot.heritageUltraModel).toBe('/models/local/wat-phnom-refined-v4/wat-phnom-ultra.glb');
    expect(spot.pois!.find(p => p.capture)!.capture!.normal).toBe('/models/wat-phnom-staircase.splat');
  });

  for (const tier of ['normal', 'ultra']) {
    it(`${tier}: preserves every non-staircase part and its placement`, async () => {
      const old = await load(oldFolder, tier);
      const next = await load(folder, tier);
      const original = meshNodes(old).filter(n => !oldStair(n));
      const preserved = meshNodes(next).filter(n => !newStair(n));
      expect(original).toHaveLength(18);
      expect(preserved.map(n => n.getName()).sort()).toEqual(original.map(n => n.getName()).sort());
      for (const n of original) {
        const other = preserved.find(p => p.getName() === n.getName())!;
        const nextBounds = bounds(other);
        bounds(n).forEach((v, i) => expect(nextBounds[i]).toBeCloseTo(v, 4));
      }
      expect(meshNodes(next).some(oldStair)).toBe(false);
      expect(meshNodes(next).filter(newStair)).toHaveLength(5);
    });

    it(`${tier}: exports a continuous upward-facing floor above the existing hill`, async () => {
      const doc = await load(folder, tier);
      const material = new MeshBasicMaterial();
      const meshes: Mesh[] = [];
      for (const n of meshNodes(doc).filter(newStair)) {
        for (const p of n.getMesh()!.listPrimitives()) {
          const g = new BufferGeometry();
          g.setAttribute('position', new BufferAttribute(new Float32Array(p.getAttribute('POSITION')!.getArray()!), 3));
          if (p.getIndices()) g.setIndex(new BufferAttribute(new Uint32Array(p.getIndices()!.getArray()!), 1));
          g.applyMatrix4(new Matrix4().fromArray(n.getWorldMatrix()));
          meshes.push(new Mesh(g, material));
        }
      }
      let previous = -Infinity;
      const ray = new Raycaster();
      for (let i = 0; i <= 80; i++) {
        const z = 11.49 - i * (11.49 - 2.20) / 80;
        for (const x of [-.8, 0, .8]) {
          ray.set(new Vector3(x, 3, z), new Vector3(0, -1, 0));
          const hit = ray.intersectObjects(meshes)[0];
          expect(hit, `floor at x=${x}, z=${z}`).toBeDefined();
          const worldY = hit.point.y + 1.4;
          const r = Math.hypot(x, z);
          const hillY = r <= 3.2 ? 1.4 : 1.4 * (13 - r) / (13 - 3.2);
          expect(worldY).toBeGreaterThan(hillY + .015);
          if (x === 0) {
            expect(hit.point.y).toBeGreaterThanOrEqual(previous - .003);
            previous = hit.point.y;
          }
        }
      }
      meshes.forEach(m => m.geometry.dispose());
      material.dispose();
    });
  }

  it('keeps the Normal asset within the phone geometry and download budgets', async () => {
    const normal = await load(folder, 'normal');
    const ultra = await load(folder, 'ultra');
    expect(triangles(normal)).toBeLessThan(50_000);
    expect(triangles(ultra)).toBeGreaterThan(triangles(normal));
    for (const doc of [normal, ultra]) {
      const draws = meshNodes(doc).reduce((s, n) => s + n.getMesh()!.listPrimitives().length, 0);
      expect(draws).toBeLessThanOrEqual(30);
    }
    expect(statSync(resolve(folder, 'wat-phnom-normal.glb')).size).toBeLessThan(2 * 1024 * 1024);
  });
});
