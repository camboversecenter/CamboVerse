import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { MeshoptDecoder } from 'three-stdlib';
import { Matrix4, Quaternion, Vector3 } from 'three';
import { farmModelUrl, farmPlantInstances, riceLook } from './farmAppearance';
import layout from './farmVisualLayout.json';

const report = (tier: string) => JSON.parse(readFileSync(`output/farm-visuals-v3/${tier}-report.json`, 'utf8'));
describe('Blender farm visuals and growth', () => {
  it('keeps landmarks and plants identical across fidelity tiers', () => {
    const n = report('normal'), u = report('ultra');
    expect(n.layout).toEqual(layout); expect(n.layout).toEqual(u.layout); expect(n.trees).toEqual(u.trees);
    expect(Object.keys(n.parts)).toEqual(['Env','Buffalo','Farmer','Rice','Grain']);
    for (const key of Object.keys(n.parts)) {
      expect(n.parts[key].drawCalls).toBe(u.parts[key].drawCalls);
      expect(n.parts[key].triangles).toBeLessThan(u.parts[key].triangles);
    }
    // Full mature-field geometry, not just the tiny rice prototype budget.
    expect(n.parts.Env.triangles + n.parts.Farmer.triangles + (n.parts.Rice.triangles+n.parts.Grain.triangles)*484).toBeLessThan(140000);
    expect(u.parts.Env.triangles + u.parts.Farmer.triangles + (u.parts.Rice.triangles+u.parts.Grain.triangles)*484).toBeLessThan(330000);
  });
  it('does not plant unworked patches or retain grain on harvested stalks', () => {
    expect(farmPlantInstances(.02,'plough',[])).toHaveLength(0);
    expect(farmPlantInstances(.32,'transplant',[])).toHaveLength(0);
    const planted = farmPlantInstances(.32,'transplant',[0]);
    expect(planted.length).toBeGreaterThan(50);
    expect(planted.every(p => p.x < 0 && p.z < 0 && !p.grain)).toBe(true);
    const full = farmPlantInstances(.85,'harvest',[]), half = farmPlantInstances(.85,'harvest',[0,1]);
    expect(full).toHaveLength(484); expect(full.every(p => p.grain)).toBe(true);
    expect(half.filter(p => p.cut)).toHaveLength(242); expect(half.filter(p => p.grain)).toHaveLength(242);
    expect(farmPlantInstances(1,'store',[]).every(p => p.cut && !p.grain)).toBe(true);
  });
  it('uses a nursery corner, stable transforms, and safe appearance values', () => {
    const nursery = farmPlantInstances(.15,'seedbed',[0,1,2,3]);
    expect(nursery.length).toBeGreaterThan(20); expect(nursery.length).toBeLessThan(100);
    expect(nursery.every(p => p.x < -.85 && p.z < -.85)).toBe(true);
    expect(farmPlantInstances(.55,'water',[])).toEqual(farmPlantInstances(.55,'water',[]));
    expect(riceLook(NaN).show).toBe(false); expect(riceLook(-1).show).toBe(false);
    expect(riceLook(.85).height).toBeCloseTo(1.25);
  });
  for (const tier of ['normal','ultra']) it(`${tier}: decodes the real asset, preserves anchors and has no external textures`, async () => {
    const bytes=readFileSync(`public${farmModelUrl(tier==='ultra')}`), r=report(tier);
    expect(createHash('sha256').update(bytes).digest('hex')).toBe(r.sha256);
    expect(bytes.length).toBeLessThan((tier==='normal' ? .8 : 1.6)*1024*1024);
    expect(bytes.readUInt32LE(0)).toBe(0x46546c67); expect(bytes.readUInt32LE(8)).toBe(bytes.length);
    const length=bytes.readUInt32LE(12), doc=JSON.parse(bytes.toString('utf8',20,20+length)), bin=bytes.subarray(28+length);
    expect(doc.images ?? []).toHaveLength(0); expect(doc.animations ?? []).toHaveLength(0); expect(doc.cameras ?? []).toHaveLength(0);
    const decoder=typeof MeshoptDecoder==='function' ? MeshoptDecoder() : MeshoptDecoder;
    if (!('ready' in decoder)) throw new Error('Bundled meshopt unavailable');
    await decoder.ready;
    const decoded=new Map<number,Uint8Array>();
    for(let i=0;i<doc.bufferViews.length;i++) {
      const ext=doc.bufferViews[i].extensions?.EXT_meshopt_compression;
      if(!ext) continue;
      const data=new Uint8Array(ext.count*ext.byteStride);
      decoder.decodeGltfBuffer(data,ext.count,ext.byteStride,bin.subarray(ext.byteOffset??0,(ext.byteOffset??0)+ext.byteLength),ext.mode,ext.filter);
      decoded.set(i,data);
    }
    const values=(id:number) => {
      const a=doc.accessors[id], data=decoded.get(a.bufferView)!, ext=doc.bufferViews[a.bufferView].extensions.EXT_meshopt_compression;
      const dv=new DataView(data.buffer,data.byteOffset,data.byteLength), size=a.type==='VEC4'?4:a.type==='VEC3'?3:1;
      const width=a.componentType===5121?1:a.componentType===5123?2:4;
      const result:number[]=[];
      for(let i=0;i<a.count;i++) for(let j=0;j<size;j++) {
        const offset=(a.byteOffset??0)+i*ext.byteStride+j*width;
        let v=a.componentType===5126?dv.getFloat32(offset,true):width===1?dv.getUint8(offset):width===2?dv.getUint16(offset,true):dv.getUint32(offset,true);
        if(a.normalized) v/=width===1?255:65535;
        result.push(v);
      }
      expect(result.every(Number.isFinite)).toBe(true); return result;
    };
    const counts: Record<string,number>={}; const bounds: Record<string,{min:number;max:number}>={};
    let draws=0;
    for (const node of doc.nodes) {
      if(node.mesh===undefined) continue;
      expect(node.children).toBeUndefined();
      const prefix=node.name.split('_')[0]; expect(['Env','Buffalo','Farmer','Rice','Grain']).toContain(prefix);
      const matrix=new Matrix4().compose(new Vector3().fromArray(node.translation??[0,0,0]),new Quaternion().fromArray(node.rotation??[0,0,0,1]),new Vector3().fromArray(node.scale??[1,1,1])); const v=new Vector3();
      for(const prim of doc.meshes[node.mesh].primitives) {
        draws++; const pos=values(prim.attributes.POSITION), idx=values(prim.indices);
        expect(idx.every(i=>i>=0&&i<pos.length/3)).toBe(true);
        counts[prefix]=(counts[prefix]??0)+idx.length/3;
        for(let i=0;i<pos.length;i+=3) {
          v.set(pos[i],pos[i+1],pos[i+2]).applyMatrix4(matrix);
          const b=bounds[prefix]??={min:Infinity,max:-Infinity}; b.min=Math.min(b.min,v.y); b.max=Math.max(b.max,v.y);
        }
        if (node.name.includes('Timber') || node.name.includes('Indigo')) {
          // Shared vertex-colour materials need colour attributes on every user.
          expect(prim.attributes.COLOR_0,node.name).toBeDefined();
        }
      }
    }
    expect(draws).toBe(21);
    for(const [prefix,count] of Object.entries(counts)) expect(count).toBe(r.parts[prefix].triangles);
    expect(Math.abs(bounds.Rice.min)).toBeLessThan(.015); expect(bounds.Rice.max).toBeGreaterThan(.95);
    expect(bounds.Rice.max).toBeLessThan(1.1); expect(bounds.Grain.min).toBeGreaterThan(.7);
    expect(bounds.Buffalo.min).toBeGreaterThan(-.02); expect(bounds.Buffalo.max).toBeLessThan(1.4);
  });
});
