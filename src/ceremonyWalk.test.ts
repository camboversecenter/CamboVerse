import { describe,it,expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { BoxGeometry,Group,Mesh,MeshBasicMaterial,Raycaster,Vector3 } from 'three';
import { ceremonyStops,nearestCeremonyStop } from './ceremonyWalk';
import { templateById } from './ceremony';
import { NEW_YEAR_ITEMS,NEW_YEAR_OBJECTS } from './khmerNewYearStudy';
import { isWalkingSurface } from './terrainWalk';

describe('ceremony walking and story routes',()=>{
  for(const id of ['wedding','housewarming','pchum-ben','khmer-new-year']) it(`${id} has reachable, valid story destinations`,()=>{
    const stops=ceremonyStops(id),template=templateById(id)!;
    expect(new Set(stops.map(s=>s.id)).size).toBe(stops.length);
    for(const s of stops){
      expect(nearestCeremonyStop(stops,...s.position)?.id).toBe(s.id);
      expect(template.moments.some(m=>m.id===s.moment)).toBe(true);
      expect(Math.abs(s.position[0])).toBeLessThan(9);
      expect(s.position[2]).toBeGreaterThan(-9.8);
      expect(nearestCeremonyStop(stops,s.position[0],s.position[1]+4,s.position[2])).toBeNull();
    }
  });
  it('ignores invisible picking shapes and hidden groups but keeps explicit floor colliders',()=>{
    const root=new Group(),mesh=new Mesh(new BoxGeometry(1,1,1),new MeshBasicMaterial());root.add(mesh);root.updateMatrixWorld(true);
    const hit=new Raycaster(new Vector3(0,0,2),new Vector3(0,0,-1)).intersectObject(root,true)[0];
    expect(isWalkingSurface(hit)).toBe(true);
    mesh.material.transparent=true;mesh.material.opacity=0;expect(isWalkingSurface(hit)).toBe(false);
    mesh.userData.walkCollision=true;expect(isWalkingSurface(hit)).toBe(true);
    mesh.userData.walkCollision=false;mesh.material.opacity=1;root.visible=false;expect(isWalkingSurface(hit)).toBe(false);
  });
});
describe('Blender Khmer New Year delivery',()=>{
  for(const tier of ['normal','ultra']) it(`${tier} contains every learning object and only embedded resources`,()=>{
    const data=readFileSync(new URL(`../public/models/local/khmer-new-year-v1/khmer-new-year-${tier}.glb`,import.meta.url));
    expect(data.toString('ascii',0,4)).toBe('glTF');expect(data.readUInt32LE(8)).toBe(data.length);
    const g=JSON.parse(data.toString('utf8',20,20+data.readUInt32LE(12)));
    expect(g.asset.generator).toContain('Blender');
    for(const id of ['environment','roof',...Object.keys(NEW_YEAR_OBJECTS)])expect(g.nodes.some((n:{name:string})=>n.name===id)).toBe(true);
    expect(g.buffers.every((b:{uri?:string})=>!b.uri)).toBe(true);
    expect(g.images.every((i:{bufferView?:number})=>i.bufferView!==undefined)).toBe(true);
    expect(data.length).toBeLessThan(tier==='normal'?250_000:700_000);
    const tris=g.meshes.reduce((sum:number,m:{primitives:{indices:number}[]})=>sum+m.primitives.reduce((n:number,p:{indices:number})=>n+g.accessors[p.indices].count/3,0),0);
    expect(tris).toBeLessThan(tier==='normal'?5000:18000);
    for(const m of templateById('khmer-new-year')!.moments)for(const id of NEW_YEAR_ITEMS[m.id])expect(NEW_YEAR_OBJECTS[id]).toBeDefined();
  });
});
