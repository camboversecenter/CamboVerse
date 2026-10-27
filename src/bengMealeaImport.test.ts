import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { MeshoptDecoder } from 'three-stdlib';
import { MeshBVH, SAH, acceleratedRaycast } from 'three-mesh-bvh';
import { BufferAttribute, BufferGeometry, Matrix4, Mesh, MeshBasicMaterial, Quaternion, Raycaster, Vector3 } from 'three';
import { SPOTS } from './spots';
import { isTerrainFloor } from './terrainWalk';

const site = SPOTS.find(s => s.id === 'beng-mealea')!;
const report = (tier: string) => JSON.parse(readFileSync(`output/beng-mealea-review-v2/${tier}-report.json`, 'utf8'));
const hash = (data: Buffer) => createHash('sha256').update(data).digest('hex');

describe('Beng Mealea reference-led import', () => {
  it('keeps three stops and the same content in Normal and Ultra', () => {
    expect(site.pois?.map(p => p.id)).toEqual(['overgrown-ruins', 'root-covered-windows', 'visitor-walkway']);
    expect(site.aerial).toBe(true); expect(site.terrainWalking).toBe(true);
    expect(new Vector3(...site.overview!.camera).distanceTo(new Vector3(...site.overview!.target))).toBeLessThan(65);
    expect(report('normal').enclosures).toEqual(report('ultra').enclosures);
    expect(report('normal').trees).toEqual(report('ultra').trees);
    expect(report('normal').enclosures).toHaveLength(3);
    expect(report('normal').heroTrees).toHaveLength(2);
    expect(report('normal').heroTrees).toEqual(report('ultra').heroTrees);
    expect(report('normal').libraries).toEqual(report('ultra').libraries);
    expect(report('normal').libraries).toHaveLength(4);
    expect(report('normal').rubble).toEqual(report('ultra').rubble);
    expect(report('normal').rubble.length).toBeGreaterThan(400);
    expect(site.landscape).toBeUndefined();
    expect(report('normal').surveyed).toBe(false);
    expect(report('ultra').triangles).toBeGreaterThan(report('normal').triangles);
  });

  for (const tier of ['normal', 'ultra']) it(`${tier}: decodes real geometry, preserves the original, and keeps the main passage grounded`, async () => {
    const r = report(tier), file = readFileSync(`public${tier === 'normal' ? site.model : site.heritageUltraModel}`);
    expect(hash(readFileSync(`public/models/local/heritage-blender-v1/beng-mealea-${tier}.glb`))).toBe(r.originalSha256);
    expect(hash(file)).toBe(r.sha256);
    expect(file.readUInt32LE(0)).toBe(0x46546c67); expect(file.readUInt32LE(8)).toBe(file.length);
    expect(file.length).toBeLessThan((tier === 'normal' ? 2 : 5) * 1024 * 1024);
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
        if (node.name === 'Carved sandstone' || node.name === 'Pale living roots') {
          expect(primitive.attributes.COLOR_0).toBeDefined();
          const colors = values(primitive.attributes.COLOR_0);
          expect(colors[0]).toBeGreaterThan(.2); expect(colors[0]).toBeLessThan(.6);
          expect(colors[0]).toBeGreaterThan(colors[2]);
        }
        const g = new BufferGeometry(); g.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3)); g.setIndex(new BufferAttribute(new Uint32Array(indices), 1));
        g.applyMatrix4(new Matrix4().compose(new Vector3().fromArray(node.translation ?? [0, 0, 0]), new Quaternion().fromArray(node.rotation ?? [0, 0, 0, 1]), new Vector3().fromArray(node.scale ?? [1, 1, 1])));
        // Match Beng Mealea's viewer BVH configuration, preserving all intersections.
        g.boundsTree = new MeshBVH(g, { strategy: SAH, indirect: true });
        const mesh = new Mesh(g, material); mesh.raycast = acceleratedRaycast; mesh.name = node.name; meshes.push(mesh);
      }
    }
    expect(meshes).toHaveLength(15); expect(triangles).toBe(r.triangles);
    expect(triangles).toBeLessThan(tier === 'normal' ? 120000 : 350000);
    const ray = new Raycaster(), normal = new Vector3();
    ray.firstHitOnly = false;
    // Check acceleration against the standard triangle raycast at the portal,
    // where the upper tower and the walkable floor must both remain discoverable.
    ray.set(new Vector3(0, 10, 7), new Vector3(0, -1, 0));
    const accelerated = ray.intersectObjects(meshes).map(h => h.point.y);
    meshes.forEach(m => { m.raycast = Mesh.prototype.raycast; });
    const standard = ray.intersectObjects(meshes).map(h => h.point.y);
    expect(accelerated.length).toBe(standard.length);
    accelerated.forEach((y, i) => expect(y).toBeCloseTo(standard[i], 5));
    meshes.forEach(m => { m.raycast = acceleratedRaycast; });
    // Ascend the entrance steps and traverse three gateway openings to the ruin overlook.
    const route = Array.from({ length: 421 }, (_, i) => 18 - i * .05);
    let feet = .12, sample = 0, highest = .12;
    for (const z of [...route, ...route.toReversed()]) {
      // Let the test runner's worker RPC respond during these CPU-heavy real-mesh raycasts.
      if (sample++ % 15 === 0) await new Promise(resolve => setTimeout(resolve, 0));
      ray.set(new Vector3(0, feet + 3.25, z), new Vector3(0, -1, 0)); ray.far = Infinity;
      const hit = ray.intersectObjects(meshes).find(h => h.face && isTerrainFloor(h.point.y, feet, normal.copy(h.face.normal).transformDirection(h.object.matrixWorld).y));
      expect(hit, `${tier}: floor z=${z}`).toBeDefined();
      expect(Math.abs(hit!.point.y - feet), `${tier}: discontinuity z=${z}`).toBeLessThan(.15);
      feet = hit!.point.y;
      highest = Math.max(highest, feet);
      // Same body-height wall ray as the walking controller, clear of beams and rubble.
      ray.set(new Vector3(0, feet + .55, z), new Vector3(0, 0, sample <= route.length ? -1 : 1)); ray.far = .40;
      expect(ray.intersectObjects(meshes), `${tier}: blocked z=${z}`).toHaveLength(0);
    }
    // Grounded boardwalk: never snap to gallery roofs, handrails or roots.
    expect(feet).toBeCloseTo(.12, 2);
    expect(highest).toBeCloseTo(.42, 2);
    for (const poi of site.pois!) {
      const camera = new Vector3(...poi.camera), target = new Vector3(...poi.target);
      ray.set(camera, target.clone().sub(camera).normalize()); ray.far = camera.distanceTo(target);
      const hit = ray.intersectObjects(meshes)[0];
      expect(hit?.object.name ?? '', poi.id).not.toMatch(/canopy|trunks|fans/i);
      if (hit) expect(hit.distance, poi.id).toBeGreaterThan(.45);
      if (poi.id === 'visitor-walkway') {
        expect(hit?.distance ?? camera.distanceTo(target)).toBeGreaterThan(6);
      }

    }
    // Cross the boardwalk's T-junction in both directions, never stepping onto rails.
    const branch = Array.from({ length: 145 }, (_, i) => i * .05);
    let branchSample = 0;
    for (const x of [...branch, ...branch.toReversed()]) {
      ray.set(new Vector3(x, 2, 3), new Vector3(0, -1, 0)); ray.far = Infinity;
      const hit = ray.intersectObjects(meshes).find(h => h.face && isTerrainFloor(h.point.y, .42, normal.copy(h.face.normal).transformDirection(h.object.matrixWorld).y));
      expect(hit?.point.y, `branch x=${x}`).toBeCloseTo(.42, 2);
      ray.set(new Vector3(x, .97, 3), new Vector3(branchSample++ < branch.length ? 1 : -1, 0, 0)); ray.far = .35;
      expect(ray.intersectObjects(meshes), `branch barrier x=${x}`).toHaveLength(0);
    }
    // Separate decks meet at x=.9; neither side has double coplanar floors.
    for (const x of [.85, .95]) {
      ray.set(new Vector3(x, .8, 3.07), new Vector3(0, -1, 0)); ray.far = .5;
      expect(ray.intersectObjects(meshes).filter(h => h.object.name === 'Visitor walkway timber' && Math.abs(h.point.y-.42)<.01)).toHaveLength(1);
    }
    meshes.forEach(m => m.geometry.dispose()); material.dispose();
  }, 60000);
});
