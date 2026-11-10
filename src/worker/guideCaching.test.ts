import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {handleGuideVoice} from './guideVoice';
import {handleLocationGuide} from './locationGuide';
import {cachedGuideResponse} from './guideCache';
import * as locations from '../locationGuide';

let now:number;
let stored:Map<string,{response:Response;expires:number}>;
let edge:{match:ReturnType<typeof vi.fn>;put:ReturnType<typeof vi.fn>};
const env={GEMINI_API_KEY:'test-only-private-key'};
const speech=(text='Welcome',lang='en-US',persona:string|undefined='penh')=>new Request('https://example.org/api/guide-voice',{method:'POST',body:JSON.stringify({text,lang,persona})});
const audio=()=>Response.json({candidates:[{content:{parts:[{inlineData:{mimeType:'audio/wav',data:btoa('RIFFxxxxWAVE1234')}}]}}]});
const answer=(text='This is the staircase.')=>Response.json({candidates:[{content:{parts:[{text}]}}]});
const question={experienceId:'staircase-3dgs',locationId:'naga-staircase',question:'Tell me about the history',lang:'en'};

beforeEach(()=>{
  now=0;stored=new Map();
  edge={match:vi.fn(async(key:Request)=>{
    const hit=stored.get(key.url);return hit&&hit.expires>now?hit.response.clone():undefined;
  }),put:vi.fn(async(key:Request,response:Response)=>{
    const ttl=Number(response.headers.get('cache-control')!.match(/max-age=(\d+)/)![1]);
    stored.set(key.url,{response:response.clone(),expires:now+ttl*1000});
  })};
  vi.stubGlobal('caches',{default:edge});
});
afterEach(()=>{vi.unstubAllGlobals();vi.restoreAllMocks();});

describe('saved guide speech',()=>{
  it('reuses audio across requests without another provider call and hashes its keys',async()=>{
    const fetch=vi.fn(async()=>audio());vi.stubGlobal('fetch',fetch);
    const first=await handleGuideVoice(speech(),env);
    const replay=await handleGuideVoice(speech(' Welcome '),env);
    expect(await first.text()).toBe('RIFFxxxxWAVE1234');expect(await replay.text()).toBe('RIFFxxxxWAVE1234');
    expect(fetch).toHaveBeenCalledOnce();expect(replay.headers.get('cache-control')).toBe('no-store');
    const [key,entry]=[...stored][0];
    expect(key).toMatch(/^https:\/\/example.org\/__guide-cache\/v1\/speech\/[a-f0-9]{64}$/);
    expect(key).not.toContain('Welcome');expect(key).not.toContain(env.GEMINI_API_KEY);
    expect(entry.response.headers.get('cache-control')).toContain('max-age=2592000');
  });
  it('records new audio for changed text, language, persona or configured voice',async()=>{
    const fetch=vi.fn(async()=>audio());vi.stubGlobal('fetch',fetch);
    await handleGuideVoice(speech(),env);
    await handleGuideVoice(speech('Updated facts'),env);
    await handleGuideVoice(speech('Welcome','fr-FR'),env);
    await handleGuideVoice(new Request('https://example.org/api/guide-voice',{method:'POST',body:JSON.stringify({text:'Welcome',lang:'en-US'})}),env);
    await handleGuideVoice(speech(),{...env,PENH_VOICE_ID:'voice_new'});
    expect(fetch).toHaveBeenCalledTimes(5);
  });
  it('renews expired speech and never saves failures or invalid audio',async()=>{
    const fetch=vi.fn().mockImplementationOnce(async()=>new Response('',{status:503}))
      .mockImplementationOnce(async()=>Response.json({candidates:[{content:{parts:[{inlineData:{data:btoa('bad audio')}}]}}]}))
      .mockImplementation(async()=>audio());vi.stubGlobal('fetch',fetch);
    expect((await handleGuideVoice(speech(),env)).status).toBe(502);
    expect((await handleGuideVoice(speech(),env)).status).toBe(502);expect(stored.size).toBe(0);
    await handleGuideVoice(speech(),env);now=31*24*60*60*1000;
    await handleGuideVoice(speech(),env);expect(fetch).toHaveBeenCalledTimes(4);
  });
  it('rejects mixed Khmer with the full locale before accessing recordings or the provider',async()=>{
    const fetch=vi.fn();vi.stubGlobal('fetch',fetch);
    expect((await handleGuideVoice(speech('សួស្តី ครับ','km-KH'),env)).status).toBe(400);
    expect(edge.match).not.toHaveBeenCalled();expect(fetch).not.toHaveBeenCalled();
  });
  it('collapses simultaneous misses within the Worker isolate',async()=>{
    let resolve!:(value:Response)=>void;
    const fetch=vi.fn(()=>new Promise<Response>(done=>{resolve=done;}));vi.stubGlobal('fetch',fetch);
    const first=handleGuideVoice(speech(),env),second=handleGuideVoice(speech(),env);
    await vi.waitFor(()=>expect(fetch).toHaveBeenCalledOnce());resolve(audio());
    const responses=await Promise.all([first,second]);
    expect(await responses[0].text()).toBe('RIFFxxxxWAVE1234');expect(await responses[1].text()).toBe('RIFFxxxxWAVE1234');
  });
});

describe('saved public location answers',()=>{
  it('reuses a suggested answer and generates fresh text after notes or language change',async()=>{
    const fetch=vi.fn(async()=>answer());vi.stubGlobal('fetch',fetch);
    await handleLocationGuide(question,env);await handleLocationGuide(question,env);
    expect(fetch).toHaveBeenCalledOnce();
    const context=locations.locationGuideContext('staircase-3dgs','naga-staircase')!;
    vi.spyOn(locations,'locationGuideContext').mockReturnValueOnce({...context,introduction:'Updated reviewed location notes.'});
    await handleLocationGuide(question,env);expect(fetch).toHaveBeenCalledTimes(2);
    await handleLocationGuide({...question,lang:'fr'},env);expect(fetch).toHaveBeenCalledTimes(3);
    expect([...stored.values()][0].response.headers.get('cache-control')).toContain('max-age=604800');
  });
  it('does not share free-form questions or cache saved-note fallbacks',async()=>{
    const fetch=vi.fn(async()=>answer());vi.stubGlobal('fetch',fetch);
    const personal={...question,question:'I am visiting with my family; suggest something for me'};
    await handleLocationGuide(personal,env);await handleLocationGuide(personal,env);
    expect(fetch).toHaveBeenCalledTimes(2);expect(stored.size).toBe(0);
    fetch.mockImplementation(async()=>new Response('',{status:503}));
    const response=await handleLocationGuide(question,env);
    expect((await response.json() as {fallback:boolean}).fallback).toBe(true);expect(stored.size).toBe(0);
    fetch.mockImplementation(async()=>answer());await handleLocationGuide(question,env);
    expect(stored.size).toBe(1);
  });
  it('expires answers after seven days and isolates hostnames',async()=>{
    const fetch=vi.fn(async()=>answer());vi.stubGlobal('fetch',fetch);
    await handleLocationGuide(question,env,'https://one.example');
    await handleLocationGuide(question,env,'https://two.example');
    now=8*24*60*60*1000;await handleLocationGuide(question,env,'https://one.example');
    expect(fetch).toHaveBeenCalledTimes(3);
  });
});

describe('guide cache availability and configuration changes',()=>{
  it('still delivers when the cache cannot read or write',async()=>{
    edge.match.mockRejectedValue(new Error('Unavailable'));edge.put.mockRejectedValue(new Error('Full'));
    const fetch=vi.fn(async()=>audio());vi.stubGlobal('fetch',fetch);
    expect((await handleGuideVoice(speech(),env)).status).toBe(200);
    expect((await handleGuideVoice(speech(),env)).status).toBe(200);expect(fetch).toHaveBeenCalledTimes(2);
  });
  it('invalidates recordings for a new model or cache revision',async()=>{
    const generate=vi.fn(async()=>new Response('recording'));
    const base={origin:'https://example.org',kind:'speech' as const,ttl:60,generate};
    for(const identity of [{model:'one',revision:1},{model:'one',revision:1},{model:'two',revision:1},{model:'two',revision:2}])await cachedGuideResponse({...base,identity});
    expect(generate).toHaveBeenCalledTimes(3);
  });
});
