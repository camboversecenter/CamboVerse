import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { MeshoptDecoder } from 'three-stdlib';
import { MeshBVH, SAH, acceleratedRaycast } from 'three-mesh-bvh';
import { BufferAttribute, BufferGeometry, Matrix4, Mesh, MeshBasicMaterial, Quaternion, Raycaster, Vector3 } from 'three';
import { SPOTS } from './spots';
import { isTerrainFloor } from './terrainWalk';

const site = SPOTS.find(s => s.id === 'bayon')!;
const report = (tier: string) => JSON.parse(readFileSync(`output/bayon-review-v2/${tier}-report.json`, 'utf8'));
const hash = (data: Buffer) => createHash('sha256').update(data).digest('hex');

describe('Bayon reference-led import', () => {
  it('keeps five stops and the same content in Normal and Ultra', () => {
    expect(site.pois?.map(p => p.id)).toEqual(['heart-of-angkor-thom', 'bas-relief-galleries', 'face-towers', 'smile-of-angkor', 'central-sanctuary']);
    expect(site.aerial).toBe(true); expect(site.terrainWalking).toBe(true);
    expect(new Vector3(...site.overview!.camera).distanceTo(new Vector3(...site.overview!.target))).toBeLessThan(55);
    expect(report('normal').towers).toEqual(report('ultra').towers);
    expect(report('normal').trees).toEqual(report('ultra').trees);
    expect(report('normal').towers).toHaveLength(21);
    expect(report('normal').surveyed).toBe(false);
    expect(report('ultra').triangles).toBeGreaterThan(report('normal').triangles);
  });

  for (const tier of ['normal', 'ultra']) it(`${tier}: decodes real geometry, preserves the original, and supports the entrance steps`, async () => {
    const r = report(tier), file = readFileSync(`public${tier === 'normal' ? site.model : site.heritageUltraModel}`);
    expect(hash(readFileSync(`public/models/local/heritage-blender-v1/bayon-${tier}.glb`))).toBe(r.originalSha256);
    expect(hash(file)).toBe(r.sha256);
    expect(file.readUInt32LE(0)).toBe(0x46546c67); expect(file.readUInt32LE(8)).toBe(file.length);
    expect(file.length).toBeLessThan((tier === 'normal' ? 6 : 15) * 1024 * 1024);
    const length = file.readUInt32LE(12), doc = JSON.parse(file.toString('utf8', 20, 20 + length)), bin = file.subarray(28 + length);
    expect(doc.extensionsUsed).toContain('EXT_meshopt_compression'); expect(doc.images ?? []).toHaveLength(0);
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
      const a = doc.accessors[id], data = decoded.get(a.bufferView)!, ext = doc.bufferViews[a.bufferView].extensions.EXT_meshopt_compression;
      const dv = new DataView(data.buffer, data.byteOffset, data.byteLength), size = a.type === 'VEC4' ? 4 : a.type === 'VEC3' ? 3 : 1;
      const bytes = a.componentType === 5121 ? 1 : a.componentType === 5123 ? 2 : 4;
      const result: number[] = [];
      for (let i = 0; i < a.count; i++) for (let j = 0; j < size; j++) {
        const offset = (a.byteOffset ?? 0) + i * ext.byteStride + j * bytes;
        let v = a.componentType === 5126 ? dv.getFloat32(offset, true) : bytes === 1 ? dv.getUint8(offset) : bytes === 2 ? dv.getUint16(offset, true) : dv.getUint32(offset, true);
        if (a.normalized) v /= bytes === 1 ? 255 : 65535;
        result.push(v);
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
        if (node.name === 'Sculpted sandstone faces') {
          expect(primitive.attributes.COLOR_0).toBeDefined();
          const colors = values(primitive.attributes.COLOR_0);
          expect(colors[0]).toBeGreaterThan(.2); expect(colors[0]).toBeLessThan(.6);
          expect(colors[0]).toBeGreaterThan(colors[2]);
        }
        const g = new BufferGeometry(); g.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3)); g.setIndex(new BufferAttribute(new Uint32Array(indices), 1));
        g.applyMatrix4(new Matrix4().compose(new Vector3().fromArray(node.translation ?? [0, 0, 0]), new Quaternion().fromArray(node.rotation ?? [0, 0, 0, 1]), new Vector3().fromArray(node.scale ?? [1, 1, 1])));
        // Match Bayon's viewer BVH configuration, preserving all intersections.
        g.boundsTree = new MeshBVH(g, { strategy: SAH, indirect: true });
        const mesh = new Mesh(g, material); mesh.raycast = acceleratedRaycast; mesh.name = node.name; meshes.push(mesh);
      }
    }
    expect(meshes).toHaveLength(15); expect(triangles).toBe(r.triangles);
    expect(triangles).toBeLessThan(tier === 'normal' ? 250000 : 750000);
    const ray = new Raycaster(), normal = new Vector3();
    ray.firstHitOnly = false;
    // Check acceleration against the standard triangle raycast at the portal,
    // where the upper tower and the walkable floor must both remain discoverable.
    ray.set(new Vector3(0, 10, 6.1), new Vector3(0, -1, 0));
    const accelerated = ray.intersectObjects(meshes).map(h => h.point.y);
    meshes.forEach(m => { m.raycast = Mesh.prototype.raycast; });
    const standard = ray.intersectObjects(meshes).map(h => h.point.y);
    expect(accelerated.length).toBe(standard.length);
    accelerated.forEach((y, i) => expect(y).toBeCloseTo(standard[i], 5));
    meshes.forEach(m => { m.raycast = acceleratedRaycast; });
    // Three flights, both directions, with a real open gateway between them.
    const route = Array.from({ length: 225 }, (_, i) => 9.5 - i * .05);
    let feet = 0, sample = 0;
    for (const z of [...route, ...route.toReversed()]) {
      // Let the test runner's worker RPC respond during these CPU-heavy real-mesh raycasts.
      if (sample++ % 15 === 0) await new Promise(resolve => setTimeout(resolve, 0));
      ray.set(new Vector3(0, feet + 3.25, z), new Vector3(0, -1, 0)); ray.far = Infinity;
      const hit = ray.intersectObjects(meshes).find(h => h.face && isTerrainFloor(h.point.y, feet, normal.copy(h.face.normal).transformDirection(h.object.matrixWorld).y));
      expect(hit, `${tier}: floor z=${z}`).toBeDefined();
      expect(Math.abs(hit!.point.y - feet), `${tier}: discontinuity z=${z}`).toBeLessThan(.15);
      feet = hit!.point.y;
      // Same body-height wall ray as the walking controller. No invisible barrier on ascent.
      ray.set(new Vector3(0, feet + .55, z), new Vector3(0, 0, -1)); ray.far = .40;
      expect(ray.intersectObjects(meshes), `${tier}: blocked z=${z}`).toHaveLength(0);
    }
    expect(feet).toBeCloseTo(0, 4);
    for (const poi of site.pois!) {
      const camera = new Vector3(...poi.camera), target = new Vector3(...poi.target);
      ray.set(camera, target.clone().sub(camera).normalize()); ray.far = camera.distanceTo(target);
      const hit = ray.intersectObjects(meshes)[0];
      expect(hit?.object.name ?? '', poi.id).not.toMatch(/Canopy|Tree trunks/);
      if (hit) expect(hit.distance, poi.id).toBeGreaterThan(.45);
      if (['face-towers', 'smile-of-angkor', 'central-sanctuary'].includes(poi.id)) {
        expect(hit?.object.name, `${poi.id}: no intervening roof`).toBe('Sculpted sandstone faces');
      }
    }
    meshes.forEach(m => m.geometry.dispose()); material.dispose();
  }, 60000);
});
