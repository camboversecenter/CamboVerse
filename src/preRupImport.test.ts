import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { MeshoptDecoder } from 'three-stdlib';
import { MeshBVH, SAH, acceleratedRaycast } from 'three-mesh-bvh';
import { BufferAttribute, BufferGeometry, Matrix4, Mesh, MeshBasicMaterial, Quaternion, Raycaster, Vector3 } from 'three';
import { SPOTS } from './spots';
import { isTerrainFloor } from './terrainWalk';

const site = SPOTS.find(s => s.id === 'pre-rup')!;
const report = (tier: string) => JSON.parse(readFileSync(`output/pre-rup-review-v2/${tier}-report.json`, 'utf8'));
const hash = (data: Buffer) => createHash('sha256').update(data).digest('hex');

describe('Pre Rup reference-led import', () => {
  it('preserves content in both tiers and starts outside the pyramid', () => {
    expect(site.pois?.map(p => p.id)).toEqual(['terraced-ascent', 'five-sanctuaries', 'eastern-towers', 'courtyard-libraries']);
    expect(site.terrainWalking).toBe(true);
    expect(site.walkStart).toEqual([0, 1.29, 13.95]);
    expect(new Vector3(...site.overview!.camera).distanceTo(new Vector3(...site.overview!.target))).toBeLessThan(55);
    const n = report('normal'), u = report('ultra');
    for (const key of ['trees', 'tiers', 'stairs', 'upperTowers', 'lowerTowers', 'smallShrines', 'libraries', 'enclosures', 'rubble']) expect(n[key], key).toEqual(u[key]);
    expect(n.tiers).toHaveLength(3); expect(n.upperTowers).toHaveLength(5);
    expect(n.lowerTowers).toHaveLength(6); expect(n.lowerTowers.filter((t: {standing: boolean}) => t.standing)).toHaveLength(5);
    expect(n.smallShrines).toHaveLength(12); expect(n.libraries).toHaveLength(2);
    expect(n.surveyed).toBe(false); expect(n.photographsEmbedded).toBe(false);
    expect(u.triangles).toBeGreaterThan(n.triangles);
  });

  for (const tier of ['normal', 'ultra']) it(`${tier}: validates exported geometry, grounded ascent/descent and camera clearance`, async () => {
    const r = report(tier), file = readFileSync(`public${tier === 'normal' ? site.model : site.heritageUltraModel}`);
    expect(hash(readFileSync(`public/models/local/heritage-blender-v1/pre-rup-${tier}.glb`))).toBe(r.originalSha256);
    expect(hash(file)).toBe(r.sha256);
    expect(file.readUInt32LE(0)).toBe(0x46546c67); expect(file.readUInt32LE(8)).toBe(file.length);
    expect(file.length).toBeLessThan((tier === 'normal' ? 2.2 : 5.5) * 1024 * 1024);
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
        const g = new BufferGeometry(); g.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3)); g.setIndex(new BufferAttribute(new Uint32Array(indices), 1));
        g.applyMatrix4(new Matrix4().compose(new Vector3().fromArray(node.translation ?? [0, 0, 0]), new Quaternion().fromArray(node.rotation ?? [0, 0, 0, 1]), new Vector3().fromArray(node.scale ?? [1, 1, 1])));
        // Match Pre Rup's viewer BVH configuration, preserving all intersections.
        g.boundsTree = new MeshBVH(g, { strategy: SAH, indirect: true });
        const mesh = new Mesh(g, material); mesh.raycast = acceleratedRaycast; mesh.name = node.name; meshes.push(mesh);
      }
    }

    expect(meshes).toHaveLength(13); expect(triangles).toBe(r.triangles);
    expect(triangles).toBeLessThan(tier === 'normal' ? 100000 : 300000);
    const ray = new Raycaster(), normal = new Vector3(); ray.firstHitOnly = false;
    // Match the walking controller's foot-relative floor selection and waist ray.
    for (let side = 0; side < 4; side++) {
      const a = side * Math.PI / 2, dx = Math.sin(a), dz = Math.cos(a);
      const route = Array.from({length: 136}, (_, i) => 13.95 - i * .05);
      let feet = .04, highest = 0, sample = 0;
      for (const distance of [...route, ...route.toReversed()]) {
        if (sample % 20 === 0) await new Promise(resolve => setTimeout(resolve, 0));
        const x = dx * distance, z = dz * distance;
        ray.set(new Vector3(x, feet + 3.25, z), new Vector3(0, -1, 0)); ray.far = Infinity;
        const floor = ray.intersectObjects(meshes).find(h => h.face && isTerrainFloor(h.point.y, feet, normal.copy(h.face.normal).transformDirection(h.object.matrixWorld).y));
        expect(floor, `${tier}: side ${side}, floor ${distance}`).toBeDefined();
        expect(Math.abs(floor!.point.y - feet)).toBeLessThan(.18);
        feet = floor!.point.y; highest = Math.max(highest, feet);
        const sign = sample++ < route.length ? -1 : 1;
        ray.set(new Vector3(x, feet + .55, z), new Vector3(dx * sign, 0, dz * sign)); ray.far = .40;
        expect(ray.intersectObjects(meshes), `${tier}: side ${side}, barrier ${distance}`).toHaveLength(0);
      }
      // Meshopt position quantization can shift a broad site's floor by < .01 units.
      expect(Math.abs(highest - 5.6)).toBeLessThan(.01); expect(Math.abs(feet - .04)).toBeLessThan(.01);
    }
    // Spawn at the camera's foot height; not under or on top of a temple mass.
    ray.set(new Vector3(...site.walkStart!), new Vector3(0, -1, 0)); ray.far = 2;
    expect(Math.abs(ray.intersectObjects(meshes)[0]!.point.y - .04)).toBeLessThan(.01);
    for (const poi of site.pois!) {
      const camera = new Vector3(...poi.camera), target = new Vector3(...poi.target);
      ray.set(camera, target.clone().sub(camera).normalize()); ray.far = camera.distanceTo(target);
      const hit = ray.intersectObjects(meshes)[0];
      expect(hit?.object.name ?? '', poi.id).not.toMatch(/canopy|trunks/i);
      if (hit) expect(hit.distance, poi.id).toBeGreaterThan(1);
    }
    // BVH must retain lower floor intersections below tower roofs.
    ray.set(new Vector3(0, 20, 0), new Vector3(0, -1, 0)); ray.far = Infinity;
    const accelerated = ray.intersectObjects(meshes).map(h => h.point.y);
    meshes.forEach(m => { m.raycast = Mesh.prototype.raycast; });
    const standard = ray.intersectObjects(meshes).map(h => h.point.y);
    expect(accelerated.length).toBe(standard.length);
    accelerated.forEach((y, i) => expect(y).toBeCloseTo(standard[i], 5));
    meshes.forEach(m => m.geometry.dispose()); material.dispose();
  }, 60000);
});

