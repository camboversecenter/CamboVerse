// Structural asset checks complement (and never replace) visual review.
import { readFileSync, existsSync, statSync } from 'node:fs';
const ids=['angkor-wat','bayon','ta-prohm','banteay-srei','preah-vihear','royal-palace','wat-phnom','sambor-prei-kuk','koh-ker','banteay-chhmar','preah-khan','beng-mealea','phnom-kulen','oudong','pre-rup'];
const root='public/models/local/heritage-blender-v1/';
let failures=0;
for(const id of ids) {
  const counts={};
  let newestExport=0;
  for(const tier of ['normal','ultra']) {
    const stem=root+id+'-'+tier;
    if(!existsSync(stem+'.glb') || !existsSync(stem+'.blend')) { console.log('MISSING',id,tier); failures++; continue; }
    const b=readFileSync(stem+'.glb');
    newestExport=Math.max(newestExport,statSync(stem+'.glb').mtimeMs);
    if(b.readUInt32LE(0)!==0x46546c67 || b.readUInt32LE(8)!==b.length) throw new Error('Invalid GLB '+stem);
    const j=JSON.parse(b.subarray(20,20+b.readUInt32LE(12)).toString());
    let tris=0,draws=0;
    for(const m of j.meshes??[]) for(const p of m.primitives) {
      draws++;
      const a=j.accessors[p.attributes.POSITION];
      if(!a || !a.count || !a.min?.every(Number.isFinite) || !a.max?.every(Number.isFinite)) throw new Error('Invalid bounds '+stem);
      tris+=(p.indices===undefined?a.count:j.accessors[p.indices].count)/3;
    }
    if(!draws) throw new Error('Empty GLB '+stem);
    counts[tier]=tris;
    if(tier==='normal' && (tris>50000 || draws>40 || b.length>2*1024*1024)) {
      console.log('NORMAL BUDGET EXCEEDED',id); failures++;
    }
    console.log(id,tier,Math.round(b.length/1024)+' KiB',tris+' triangles',draws+' primitives');
  }
  if(!existsSync(root+id+'-review.png')) { console.log('MISSING RENDER',id); failures++; }
  else if(statSync(root+id+'-review.png').mtimeMs<newestExport) {
    console.log('STALE RENDER: rebuild still running or visual evidence out of date',id); failures++;
  }
  if(counts.normal>=counts.ultra) { console.log('NORMAL MUST HAVE FEWER TRIANGLES',id); failures++; }
}
process.exitCode=failures?1:0;
