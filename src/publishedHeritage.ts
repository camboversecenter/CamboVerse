import type { Spot } from './spots';

/** Keep the reviewed Blender models in both builds; only redirect the two
 * already-published Wat Phnom captures away from their local review files. */
export function publishedHeritage(site:Spot):Spot {
  if(site.id!=='wat-phnom')return site;
  return {...site,
    pois:site.pois?.map(p=>{
      if(!p.capture)return p;
      const name=p.id==='flower-clock'?'wat-phnom-clock-v1':p.id==='naga-staircase'?'wat-phnom-staircase-v1':null;
      if(!name)return p;
      return {...p,capture:{...p.capture,normal:`/models/captures/${name}/normal.splat`,
        ultra:`/models/captures/${name}/ultra.splat`,cleanup:undefined}};
    })};
}
