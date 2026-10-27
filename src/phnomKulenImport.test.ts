import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { MeshoptDecoder } from 'three-stdlib';
import { MeshBVH, SAH, acceleratedRaycast } from 'three-mesh-bvh';
import { BufferAttribute, BufferGeometry, Matrix4, Mesh, MeshBasicMaterial, Quaternion, Raycaster, Vector3 } from 'three';
import { KULEN_WATERFALL } from './kulenWaterfall';
import { isTerrainFloor } from './terrainWalk';

const site = KULEN_WATERFALL;
const report = (tier: string) => JSON.parse(readFileSync(`output/phnom-kulen-waterfall-v3/${tier}-report.json`, 'utf8'));
const hash = (data: Buffer) => createHash('sha256').update(data).digest('hex');

describe('Phnom Kulen reference-led landscape', () => {
  it('keeps the waterfall study separate and removes the unrelated carved riverbed', () => {
    expect(site.pois?.map(p => p.id)).toEqual(['waterfalls', 'forest-path']);
    expect(site.aerial).toBe(true); expect(site.terrainWalking).toBe(true);
    expect(site.sceneryGroundY).toBeLessThan(-.18);
    expect(new Vector3(...site.overview!.camera).distanceTo(new Vector3(...site.overview!.target))).toBeLessThan(55);
    for (const key of ['trees', 'lingas', 'curtains', 'rocks', 'stairs']) expect(report('normal')[key]).toEqual(report('ultra')[key]);
    expect(report('normal').trees).toHaveLength(66);
    expect(report('normal').lingas).toHaveLength(0);
    expect(report('normal').curtains).toHaveLength(11);
    expect(report('normal').stairs.count).toBe(48);
    expect(report('normal').surveyed).toBe(false);
    expect(report('ultra').triangles).toBeGreaterThan(report('normal').triangles);
    expect(site.name).toBe('Kulen Waterfall Study');
  });

  for (const tier of ['normal', 'ultra']) it(`${tier}: validates the real export and grounded bank-to-riverbed route`, async () => {
    const r = report(tier), file = readFileSync(`public${tier === 'normal' ? site.model : site.heritageUltraModel}`);
    expect(hash(readFileSync(`public/models/local/heritage-blender-v1/phnom-kulen-${tier}.glb`))).toBe(r.originalSha256);
    expect(hash(file)).toBe(r.sha256);
    expect(file.readUInt32LE(0)).toBe(0x46546c67); expect(file.readUInt32LE(8)).toBe(file.length);
    expect(file.length).toBeLessThan((tier === 'normal' ? 1.5 : 3) * 1024 * 1024);
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
        // Match Phnom Kulen's viewer BVH configuration, preserving all intersections.
        g.boundsTree = new MeshBVH(g, { strategy: SAH, indirect: true });
        const mesh = new Mesh(g, material); mesh.raycast = acceleratedRaycast; mesh.name = node.name; meshes.push(mesh);
      }
    }

    expect(meshes).toHaveLength(14); expect(triangles).toBe(r.triangles);
    expect(triangles).toBeLessThan(tier === 'normal' ? 80000 : 250000);
    expect(doc.animations ?? []).toHaveLength(0);
    expect(doc.materials.every((m: { alphaMode?: string }) => !m.alphaMode || m.alphaMode === 'OPAQUE')).toBe(true);
    const ray = new Raycaster(), normal = new Vector3(); ray.firstHitOnly = false;
    ray.set(new Vector3(10.5, 10, 0), new Vector3(0, -1, 0));
    const accelerated = ray.intersectObjects(meshes).map(h => h.point.y);
    meshes.forEach(m => { m.raycast = Mesh.prototype.raycast; });
    const standard = ray.intersectObjects(meshes).map(h => h.point.y);
    expect(accelerated.length).toBe(standard.length);
    accelerated.forEach((y, i) => expect(y).toBeCloseTo(standard[i], 5));
    meshes.forEach(m => { m.raycast = acceleratedRaycast; });
    const corners = [[0, 9.5], [0, 10.75], [10.5, 10.75], [10.5, -8.75], [4.5, -8.75], [4.5, -10.5]];
    const route: number[][] = [];
    for (let i = 1; i < corners.length; i++) {
      const [ax, az] = corners[i-1], [bx, bz] = corners[i];
      const count = Math.ceil(Math.hypot(bx-ax, bz-az)/.08);
      for (let k = 0; k < count; k++) route.push([ax+(bx-ax)*k/count, az+(bz-az)*k/count]);
    }
    route.push(corners.at(-1)!);
    const samples = [...route, ...route.toReversed()];
    let feet = .22, highest = feet;
    for (let i = 0; i < samples.length; i++) {
      if (i % 15 === 0) await new Promise(resolve => setTimeout(resolve, 0));
      const [x,z] = samples[i];
      ray.set(new Vector3(x, feet+3.25, z), new Vector3(0,-1,0)); ray.far = Infinity;
      const hit = ray.intersectObjects(meshes).find(h => h.face && isTerrainFloor(h.point.y, feet, normal.copy(h.face.normal).transformDirection(h.object.matrixWorld).y));
      expect(hit, `${tier} missing floor at ${x},${z}`).toBeDefined();
      expect(Math.abs(hit!.point.y-feet), `${tier} abrupt step at ${x},${z}`).toBeLessThan(.20);
      feet=hit!.point.y; highest=Math.max(highest, feet);
      expect(hit!.object.name).not.toMatch(/water|canopy|trunks/i);
      const next = samples[i+1];
      if (next && Math.hypot(next[0]-x, next[1]-z) > .001) {
        ray.set(new Vector3(x,feet+.55,z), new Vector3(next[0]-x,0,next[1]-z).normalize()); ray.far=.40;
        expect(ray.intersectObjects(meshes), `${tier} blocked route at ${x},${z}`).toHaveLength(0);
      }
    }
    expect(feet).toBeCloseTo(.22,2); expect(highest).toBeCloseTo(7.56,2);
    // No coincident path/terrain surfaces that could flicker on rotation.
    for (const [x,z] of [[6.7,-9],[4.5,-11],[10.5,-8.9]]) {
      ray.set(new Vector3(x,8,z),new Vector3(0,-1,0)); ray.far=1;
      const top=ray.intersectObjects(meshes).filter(h => h.face && h.face.normal.y>.55);
      expect(top.length).toBeGreaterThan(0);
      const first=top[0];
      expect(top.filter(h => Math.abs(h.point.y-first.point.y)<.015)).toHaveLength(1);
    }
    for (const poi of site.pois!) {
      const camera=new Vector3(...poi.camera), target=new Vector3(...poi.target);
      ray.set(camera,target.clone().sub(camera).normalize()); ray.far=camera.distanceTo(target);
      const hit=ray.intersectObjects(meshes)[0];
      expect(hit?.object.name ?? '',poi.id).not.toMatch(/canopy|trunks/i);
      if(hit) expect(hit.distance,poi.id).toBeGreaterThan(.45);
    }
    meshes.forEach(m => m.geometry.dispose()); material.dispose();
  }, 60000);
});

