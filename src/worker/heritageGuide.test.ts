import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {SPOTS} from '../spots';
import {ERAS} from '../history';
import {handleHeritageGuide} from './heritageGuide';
import {handleGuideVoice} from './guideVoice';
import {KULEN_WATERFALL} from '../kulenWaterfall';

const guideSites=[...SPOTS,KULEN_WATERFALL];

let objects:Map<string,{bytes:ArrayBuffer;contentType:string}>;
let storage:R2Bucket;
const origin='https://example.org/api/guide';
beforeEach(()=>{
  objects=new Map();vi.stubGlobal('caches',undefined);
  storage={get:async(key:string)=>{
    const record=objects.get(key);return record?{body:new Response(record.bytes.slice(0)).body,httpMetadata:{contentType:record.contentType}}:null;
  },put:async(key:string,bytes:ArrayBuffer,options:R2PutOptions)=>{
    if(objects.has(key))return null;
    objects.set(key,{bytes:bytes.slice(0),contentType:(options.httpMetadata as R2HTTPMetadata).contentType!});return {key};
  }} as unknown as R2Bucket;
});
afterEach(()=>vi.unstubAllGlobals());
const audio=()=>Response.json({candidates:[{content:{parts:[{inlineData:{data:btoa('RIFFxxxxWAVE1234')}}]}}]});
describe('Kiri guide recording coverage',()=>{
  it('records and replays authored English text and speech at every site and POI',async()=>{
    const fetch=vi.fn(async(_url:string)=>audio());vi.stubGlobal('fetch',fetch);
    let count=0;
    for(const spot of guideSites){
      for(const poiId of [null,...(spot.pois??[]).map(p=>p.id)]){
        const body={spotId:spot.id,poiId,lang:'en'};
        const response=await handleHeritageGuide(body,{GUIDE_STORAGE:storage},origin);
        const reply=await response.json() as {text:string;lang:string;source:string};
        expect(reply.source).toBe('authored');expect(reply.lang).toBe('en');expect(reply.text.length).toBeGreaterThan(0);
        expect(reply.text.length).toBeLessThanOrEqual(1500);
        const voice=()=>new Request('https://example.org/api/guide-voice',{method:'POST',body:JSON.stringify({text:reply.text,lang:'en-US'})});
        expect((await handleGuideVoice(voice(),{GEMINI_API_KEY:'test-only',GUIDE_STORAGE:storage})).status).toBe(200);
        const before=fetch.mock.calls.length;
        expect((await handleHeritageGuide(body,{GUIDE_STORAGE:storage},origin)).headers.get('x-guide-content-source')).toBe('r2');
        expect((await handleGuideVoice(voice(),{GUIDE_STORAGE:storage})).headers.get('x-guide-content-source')).toBe('r2');
        expect(fetch.mock.calls.length).toBe(before);count++;
      }
    }
    expect([...objects.keys()].filter(k=>k.includes('/answers/'))).toHaveLength(count);
    expect(fetch.mock.calls.every(([url])=>String(url).includes('-tts:generateContent'))).toBe(true);
  });
  it('records era text at every site and keeps it distinct from the current scene',async()=>{
    const fetch=vi.fn();vi.stubGlobal('fetch',fetch);
    for(const spot of guideSites)for(const era of ERAS){
      const request={spotId:spot.id,eraId:era.id,lang:'en'};
      const response=await handleHeritageGuide(request,{GUIDE_STORAGE:storage},origin);
      const reply=await response.json() as {text:string};
      expect(reply.text).toContain(era.story);expect(reply.text.length).toBeLessThanOrEqual(1500);
      expect((await handleHeritageGuide(request,{GUIDE_STORAGE:storage},origin)).headers.get('x-guide-content-source')).toBe('r2');
    }
    expect(objects.size).toBe(guideSites.length*ERAS.length);expect(fetch).not.toHaveBeenCalled();
  });
  it('saves translated introductions, reuses them without a key, and separates languages',async()=>{
    const fetch=vi.fn(async(_url:string,init:RequestInit)=>Response.json({content:[{type:'text',text:JSON.parse(String(init.body)).system.includes('ALWAYS reply in Khmer')?'សួស្តី! នេះជាទីតាំងបេតិកភណ្ឌ។':'A translated introduction.'}]}));vi.stubGlobal('fetch',fetch);
    for(const lang of ['km','fr','zh']){
      const request={spotId:SPOTS[0].id,lang};
      const env={ANTHROPIC_API_KEY:'test-only',GUIDE_STORAGE:storage};
      await handleHeritageGuide(request,env,origin);
      expect((await handleHeritageGuide(request,{GUIDE_STORAGE:storage},origin)).headers.get('x-guide-content-source')).toBe('r2');
    }
    expect(fetch).toHaveBeenCalledTimes(3);expect(objects.size).toBe(3);
  });
  it('keeps custom questions out of shared text storage and rejects unknown locations',async()=>{
    const fetch=vi.fn(async()=>Response.json({content:[{type:'text',text:'An answer.'}]}));vi.stubGlobal('fetch',fetch);
    const env={ANTHROPIC_API_KEY:'test-only',GUIDE_STORAGE:storage};
    await handleHeritageGuide({spotId:SPOTS[0].id,lang:'en',question:'A visitor question'},env,origin);
    expect(objects.size).toBe(0);
    expect((await handleHeritageGuide({spotId:'missing'},env,origin)).status).toBe(404);
    expect((await handleHeritageGuide({spotId:SPOTS[0].id,poiId:'missing'},env,origin)).status).toBe(404);
    expect((await handleHeritageGuide({spotId:SPOTS[0].id,eraId:'missing'},env,origin)).status).toBe(404);
    expect((await handleHeritageGuide({spotId:SPOTS[0].id,question:'x'.repeat(501)},env,origin)).status).toBe(400);
  });
  it('does not permanently save mixed-script Khmer that the speech endpoint would reject',async()=>{
    vi.stubGlobal('fetch',vi.fn(async()=>Response.json({content:[{type:'text',text:'សួស្តី Kiri ครับ'}]})));
    const response=await handleHeritageGuide({spotId:SPOTS[0].id,lang:'km'},{ANTHROPIC_API_KEY:'test-only',GUIDE_STORAGE:storage},origin);
    expect(await response.json()).toMatchObject({lang:'en',fallback:true});expect(objects.size).toBe(0);
  });
});
