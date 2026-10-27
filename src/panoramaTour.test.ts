import { readFileSync } from 'node:fs';
import { BackSide, Group, Mesh, MeshBasicMaterial, Raycaster, SphereGeometry, Vector3 } from 'three';
import { describe,expect,it } from 'vitest';
import { PANORAMA_MANIFEST, panoramaDirection, panoramaUrl, type PanoramaId, type PanoramaStop } from './panoramaTour';
const PANORAMA_STOPS:PanoramaStop[]=JSON.parse(readFileSync(`public${PANORAMA_MANIFEST}`,'utf8'));

describe('27-photo room hotspot tour',()=>{
  it('keeps every location reachable with a return connection and both image sizes',()=>{
    const visited=new Set<PanoramaId>(), pending:PanoramaId[]=['050'];
    while(pending.length){const id=pending.pop()!;if(visited.has(id))continue;visited.add(id);const stop=PANORAMA_STOPS.find(s=>s.id===id)!;
      for(const link of stop.links){expect(PANORAMA_STOPS.find(s=>s.id===link.to)?.links.some(l=>l.to===id)).toBe(true);pending.push(link.to);}
      expect(stop.orientation.reduce((sum,n)=>sum+n*n,0)).toBeCloseTo(1,6);
      for(const ultra of [false,true]){const bytes=readFileSync(`public${panoramaUrl(id,ultra)}`);expect(bytes.readUInt16BE(0)).toBe(0xffd8);expect(bytes.length).toBeLessThan(ultra?1600000:450000);}
    }
    expect(visited.size).toBe(27);
    expect(new Set(PANORAMA_STOPS.map(s=>s.id)).size).toBe(27);
  });
  it('puts clickable spots over the correct photo pixels on the actual inward sphere',()=>{
    const geometry=new SphereGeometry(50,128,64), material=new MeshBasicMaterial({side:BackSide});
    for(const stop of PANORAMA_STOPS){
      const group=new Group();group.quaternion.fromArray(stop.orientation);
      const mesh=new Mesh(geometry,material);mesh.scale.set(-1,1,1);mesh.rotation.y=-Math.PI/2;group.add(mesh);group.updateMatrixWorld(true);
      for(const link of stop.links){
        const direction=new Vector3(...panoramaDirection(link.u,link.v,stop.orientation)).normalize();
        expect(direction.y).toBeLessThan(0);
        const hit=new Raycaster(new Vector3(),direction).intersectObject(mesh)[0];
        expect(hit,`${stop.id}/${link.to}`).toBeDefined();expect(hit.uv!.x).toBeCloseTo(link.u,3);expect(hit.uv!.y).toBeCloseTo(1-link.v,3);
      }
    }
    geometry.dispose();material.dispose();
  });
});
