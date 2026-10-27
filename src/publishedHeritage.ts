import type { Spot } from './spots';

const legacy:Record<string,string>={
  'angkor-wat':'angkor-wat',bayon:'bayon','ta-prohm':'ta-prohm','banteay-srei':'banteay-srei',
  'preah-vihear':'preah-vihear','royal-palace':'royal-palace','sambor-prei-kuk':'sambor-prei-kuk','koh-ker':'koh-ker',
};

/** Publish reviewed assets only; retain existing public models for local studies. */
export function publishedHeritage(site:Spot):Spot {
  const fallback=`/models/${legacy[site.id]??'heritage-sample'}.glb`;
  if(site.id!=='wat-phnom')return {...site,model:fallback,heritageUltraModel:site.heritageUltraModel?fallback:undefined};
  return {...site,model:'/models/heritage/wat-phnom-v4/normal.glb',
    heritageUltraModel:'/models/heritage/wat-phnom-v4/ultra.glb',
    pois:site.pois?.map(p=>{
      if(!p.capture)return p;
      const name=p.id==='flower-clock'?'wat-phnom-clock-v1':p.id==='naga-staircase'?'wat-phnom-staircase-v1':null;
      if(!name)return p;
      return {...p,capture:{...p.capture,normal:`/models/captures/${name}/normal.splat`,
        ultra:`/models/captures/${name}/ultra.splat`,cleanup:undefined}};
    })};
}
