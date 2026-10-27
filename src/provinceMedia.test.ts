import {expect,it} from 'vitest';
import {existsSync,readFileSync,statSync} from 'node:fs';
import {PROVINCE_MEDIA} from './provinceMedia';

it('exposes all 25 existing collections with their exact approved images, songs and metadata',()=>{
  expect(PROVINCE_MEDIA).toHaveLength(25);
  expect(new Set(PROVINCE_MEDIA.map(p=>p.id)).size).toBe(25);
  for(const p of PROVINCE_MEDIA){
    const original=JSON.parse(readFileSync(`camboverse-provinces/${p.folder}/avatar/avatar.json`,'utf8'));
    expect(p.avatar).toEqual(original);
    for(const key of ['face','body','look','song','lyrics','rights'] as const)expect(p[key]?.length,p.folder+':'+key).toBeGreaterThan(0);
    expect(p.look).toContain(original.refs.approved);
    expect(existsSync(`public${p.thumbnail}`)).toBe(true);
  }
  expect(PROVINCE_MEDIA.reduce((size,p)=>size+statSync(`public${p.thumbnail}`).size,0)).toBeLessThan(80_000);
});
