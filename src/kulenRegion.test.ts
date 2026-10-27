import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { MeshoptDecoder } from 'three-stdlib';
import { MeshBVH, SAH, acceleratedRaycast } from 'three-mesh-bvh';
import { BufferAttribute, BufferGeometry, Matrix4, Mesh, MeshBasicMaterial, Quaternion, Raycaster, Vector3 } from 'three';
import { SPOTS } from './spots';
import { KULEN_LANDMARKS, KULEN_POIS, kulenPosition } from './kulenRegion';
import { KULEN_WATERFALL } from './kulenWaterfall';
import { regionalOverviewCamera } from './regionalCamera';

const site = SPOTS.find(s => s.id === 'phnom-kulen')!;
const report = (tier: string) => JSON.parse(readFileSync(`output/phnom-kulen-region-v3/${tier}-report.json`, 'utf8'));
const hash = (data: Buffer) => createHash('sha256').update(data).digest('hex');

describe('Kulen mountain region is not the waterfall scene', () => {
  it('pulls the overview back for narrow phone screens without changing its target', () => {
    const pose=site.overview!, target=new Vector3(...pose.target);
    const desktop=new Vector3(...regionalOverviewCamera(pose,16/9));
    const phone=new Vector3(...regionalOverviewCamera(pose,360/800));
    expect(desktop.toArray()).toEqual(pose.camera);
    expect(phone.distanceTo(target)).toBeGreaterThan(desktop.distanceTo(target)*2);
    expect(phone.distanceTo(target)).toBeLessThan(330);
    expect(phone.clone().sub(target).normalize().distanceTo(desktop.clone().sub(target).normalize())).toBeLessThan(1e-10);
  });
  it('has five separate landmarks, approximate projected pins and a separate walkable study', () => {
    expect(site.overviewOnly).toBe(true); expect(site.terrainWalking).toBeUndefined();
    expect(site.pois).toEqual(KULEN_POIS);
    expect(site.pois?.map(p=>p.id)).toEqual(['waterfalls','preah-ang-thom','river-of-lingas','rong-chen','srah-damrei']);
    expect(KULEN_WATERFALL.model).not.toBe(site.model);
    expect(KULEN_WATERFALL.terrainWalking).toBe(true);
    expect(KULEN_WATERFALL.pois?.some(p=>p.id==='river-of-lingas')).toBe(false);
    for(const p of KULEN_LANDMARKS) {
      const pos=kulenPosition(p.lat,p.lng), exported=report('normal').landmarks.find((l:{id:string})=>l.id===p.id);
      exported.position.forEach((v:number,i:number)=>expect(v).toBeCloseTo(pos[i],7));
      expect(p.source).toMatch(/^https:\/\/helloangkor.com\/attractions\//);
    }
    const at=(id:string)=>KULEN_POIS.find(p=>p.id===id)!.target;
    expect(at('waterfalls')[2]).toBeLessThan(at('preah-ang-thom')[2]);
    expect(at('river-of-lingas')[0]).toBeLessThan(at('waterfalls')[0]);
    expect(at('rong-chen')[2]).toBeGreaterThan(at('waterfalls')[2]);
    expect(at('srah-damrei')[2]).toBeGreaterThan(at('rong-chen')[2]);
    expect(report('normal').trees).toEqual(report('ultra').trees);
    expect(report('normal').trees).toHaveLength(520);
    expect(report('normal').landmarks).toEqual(report('ultra').landmarks);
    expect(report('normal').surveyed).toBe(false);
    expect(new Vector3(...site.overview!.camera).distanceTo(new Vector3(...site.overview!.target))).toBeLessThan(90);
  });
  for (const tier of ['normal','ultra']) it(`${tier}: decodes finite geometry, preserves old study and frames the landmarks`, async () => {
    const r=report(tier), file=readFileSync(`public${tier==='normal'?site.model:site.heritageUltraModel}`);
    expect(hash(file)).toBe(r.sha256);
    expect(hash(readFileSync(`public/models/local/phnom-kulen-refined-v2/phnom-kulen-${tier}.glb`))).toBe(r.sourceSha256);
    expect(file.length).toBeLessThan((tier==='normal'?1.5:4.5)*1024*1024);
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
    expect(triangles).toBeLessThan(tier==='normal'?80000:250000);
    const ray=new Raycaster(); ray.firstHitOnly=false;
    for(const p of site.pois!) {
      const camera=new Vector3(...p.camera), target=new Vector3(...p.target);
      ray.set(camera,target.clone().sub(camera).normalize()); ray.far=camera.distanceTo(target);
      const hit=ray.intersectObjects(meshes)[0];
      expect(hit?.object.name??'',p.id).not.toMatch(/canopy|trunks/i);
      if(hit) expect(hit.distance,p.id).toBeGreaterThan(1.5);
      ray.set(new Vector3(target.x,7.4,target.z),new Vector3(0,-1,0)); ray.far=8;
      // Rong Chen's low earthen terraces share the terrain material. Check the
      // underlying plateau as well as the visible terrace, not only first hit.
      const ground=ray.intersectObjects(meshes.filter(m=>m.name==='Forested plateau'))
        .find(h=>Math.abs(h.point.y-7)<.05 && (h.face?.normal.y ?? 0)>.9);
      expect(ground,p.id).toBeDefined();
      expect(ground.face!.normal.y,p.id).toBeGreaterThan(.9);
      expect(ground.point.y,p.id).toBeCloseTo(7,1);
    }
    meshes.forEach(m=>m.geometry.dispose()); material.dispose();
  },60000);
});

