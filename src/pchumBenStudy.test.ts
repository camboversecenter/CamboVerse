import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { PCHUM_BEN_ITEMS, PCHUM_BEN_OBJECTS, PCHUM_STOPS, nearestPchumStop } from './pchumBenStudy';
import { BufferGeometry, Float32BufferAttribute, Group, Mesh, MeshBasicMaterial, Raycaster, Vector3 } from 'three';
import { templateById } from './ceremony';

// Validate the actual Blender exports, not only the UI's data declarations.
function model(tier:string) {
  const data=readFileSync(new URL(`../public/models/local/pchum-ben-v2/pchum-ben-${tier}.glb`,import.meta.url));
  expect(data.toString('ascii',0,4)).toBe('glTF');
  expect(data.readUInt32LE(8)).toBe(data.length);
  return {data,bytes:data.length,json:JSON.parse(data.toString('utf8',20,20+data.readUInt32LE(12)))};
}
describe('Blender Pchum Ben delivery',()=>{
  for(const tier of ['normal','ultra']) it(`${tier} contains every selectable group and embedded resources`,()=>{
    const {json,bytes}=model(tier);
    const names=json.nodes.map((n:{name:string})=>n.name);
    for(const id of ['environment','roof',...Object.keys(PCHUM_BEN_OBJECTS)]) expect(names).toContain(id);
    expect(json.asset.generator).toContain('Blender');
    expect(json.buffers.every((b:{uri?:string})=>!b.uri)).toBe(true);
    expect(json.images.every((i:{bufferView?:number})=>i.bufferView!==undefined)).toBe(true);
    expect(bytes).toBeLessThan(tier==='normal'?350_000:1_200_000);
    const triangles=json.meshes.reduce((sum:number,m:{primitives:{indices:number}[]})=>sum+m.primitives.reduce((n:number,p:{indices:number})=>n+json.accessors[p.indices].count/3,0),0);
    expect(triangles).toBeLessThan(tier==='normal'?8500:35000);
  });
  it('keeps all lessons available in both tiers',()=>{
    for(const moment of templateById('pchum-ben')!.moments) {
      expect(PCHUM_BEN_ITEMS[moment.id]?.length).toBeGreaterThan(0);
      for(const id of PCHUM_BEN_ITEMS[moment.id]) expect(PCHUM_BEN_OBJECTS[id]).toBeDefined();
    }
    expect(templateById('pchum-ben')!.needsReview).toBe(true);
  });
});

// Reconstruct collision geometry directly from the real export, without browser
// texture APIs. This catches a closed doorway or a wrongly placed floor.
function collisionWorld(tier:string) {
  const {json:g,data}=model(tier), bin=28+data.readUInt32LE(12);
  const values=(index:number)=>{
    const a=g.accessors[index],v=g.bufferViews[a.bufferView];
    const width=a.type==='VEC3'?3:1, size=a.componentType===5123?2:4;
    const result:number[]=[];
    for(let i=0;i<a.count;i++)for(let j=0;j<width;j++){
      const p=bin+(v.byteOffset??0)+(a.byteOffset??0)+i*(v.byteStride??width*size)+j*size;
      result.push(a.componentType===5126?data.readFloatLE(p):a.componentType===5123?data.readUInt16LE(p):data.readUInt32LE(p));
    }
    return result;
  };
  const nodes=g.nodes.map((n:{mesh?:number;matrix?:number[];translation?:number[];rotation?:number[];scale?:number[]})=>{
    const root=new Group();
    if(n.matrix)root.applyMatrix4(root.matrix.fromArray(n.matrix));
    else {if(n.translation)root.position.fromArray(n.translation);if(n.rotation)root.quaternion.fromArray(n.rotation);if(n.scale)root.scale.fromArray(n.scale);}
    if(n.mesh!==undefined) for(const p of g.meshes[n.mesh].primitives){
      const geometry=new BufferGeometry();geometry.setAttribute('position',new Float32BufferAttribute(values(p.attributes.POSITION),3));geometry.setIndex(values(p.indices));geometry.computeVertexNormals();root.add(new Mesh(geometry,new MeshBasicMaterial()));
    }
    return root;
  });
  g.nodes.forEach((n:{children?:number[]},i:number)=>n.children?.forEach(c=>nodes[i].add(nodes[c])));
  const root=new Group();g.scenes[g.scene??0].nodes.forEach((i:number)=>root.add(nodes[i]));root.updateMatrixWorld(true);return root;
}
describe('Pchum Ben walking',()=>{
  for(const tier of ['normal','ultra']) it(`${tier}: doorway is open, hall has a floor and walls block movement`,()=>{
    const world=collisionWorld(tier);
    const hits=(p:number[],d:number[],far:number)=>new Raycaster(new Vector3().fromArray(p),new Vector3().fromArray(d),0,far).intersectObject(world,true);
    expect(hits([0,1.7,-4.6],[0,0,-1],2)).toHaveLength(0);
    expect(hits([2.6,1.7,-4.6],[0,0,-1],2).length).toBeGreaterThan(0);
    const floor=hits([0,2.5,-7.1],[0,-1,0],3)[0];expect(floor.point.y).toBeCloseTo(.59,2);
    expect(hits([0,1.2,-7.1],[0,0,-1],3).length).toBeGreaterThan(0);
  });
  it('has reachable stories at all four stops, without triggering above the hall',()=>{
    for(const stop of PCHUM_STOPS){expect(nearestPchumStop(...stop.position)?.id).toBe(stop.id);expect(templateById('pchum-ben')!.moments.some(m=>m.id===stop.moment)).toBe(true);}
    expect(nearestPchumStop(0,6,-7.1)).toBeNull();expect(nearestPchumStop(8,1.6,8)).toBeNull();
  });
});
