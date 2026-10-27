import {expect,it} from 'vitest';
import {existsSync} from 'node:fs';
import {SPOTS} from './spots';
import {publishedHeritage} from './publishedHeritage';

it('publishes the finished Wat Phnom previews without depending on private originals',()=>{
  const local=SPOTS.find(s=>s.id==='wat-phnom')!;
  const result=publishedHeritage(local);
  for(const path of [result.model,result.heritageUltraModel])expect(existsSync(`public${path}`)).toBe(true);
  for(const id of ['naga-staircase','flower-clock']){
    const capture=result.pois!.find(p=>p.id===id)!.capture!;
    expect(capture.normal).not.toContain('/local/');
    expect(capture.cleanup).toBeUndefined();
    for(const path of [capture.normal,capture.ultra])expect(existsSync(`public${path}`)).toBe(true);
    expect(capture.walk??capture.walkAround).toBeDefined();
  }
  expect(local.pois!.find(p=>p.id==='flower-clock')!.capture!.normal).toContain('/local/');
});

it('retains working public models for other sites while their local studies stay private',()=>{
  for(const site of SPOTS){
    const result=publishedHeritage(site);
    expect(existsSync(`public${result.model}`),site.id).toBe(true);
    if(result.heritageUltraModel)expect(existsSync(`public${result.heritageUltraModel}`),site.id).toBe(true);
  }
});
