import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {handleGuideVoice} from './guideVoice';
import {handleLocationGuide} from './locationGuide';
import * as locations from '../locationGuide';

type Stored={bytes:ArrayBuffer;contentType?:string};
let recordings:Map<string,Stored>;
let edge:Map<string,Response>;
let storage:{get:ReturnType<typeof vi.fn>;put:ReturnType<typeof vi.fn>};
let env:{GEMINI_API_KEY?:string;GUIDE_STORAGE:R2Bucket;PENH_VOICE_ID?:string};
const speech=(text='Welcome',lang='en-US')=>new Request('https://example.org/api/guide-voice',{method:'POST',body:JSON.stringify({text,lang,persona:'penh'})});
const audio=()=>Response.json({candidates:[{content:{parts:[{inlineData:{mimeType:'audio/wav',data:btoa('RIFFxxxxWAVE1234')}}]}}]});
const answer=()=>Response.json({candidates:[{content:{parts:[{text:'This is the staircase.'}]}}]});
const question={experienceId:'staircase-3dgs',locationId:'naga-staircase',question:'Tell me about the history',lang:'en'};

beforeEach(()=>{
  recordings=new Map();edge=new Map();
  storage={get:vi.fn(async(key:string)=>{
    const hit=recordings.get(key);
    return hit?{body:new Response(hit.bytes.slice(0)).body,httpMetadata:{contentType:hit.contentType}}:null;
  }),put:vi.fn(async(key:string,bytes:ArrayBuffer,options:R2PutOptions)=>{
    if(recordings.has(key)&&!(options.onlyIf instanceof Headers)&&options.onlyIf?.etagDoesNotMatch==='*')return null;
    const metadata=options.httpMetadata as R2HTTPMetadata;
    recordings.set(key,{bytes:bytes.slice(0),contentType:metadata?.contentType});return {key};
  })};
  env={GEMINI_API_KEY:'test-only-private-key',GUIDE_STORAGE:storage as unknown as R2Bucket};
  vi.stubGlobal('caches',{default:{
    match:vi.fn(async(key:Request)=>edge.get(key.url)?.clone()),
    put:vi.fn(async(key:Request,response:Response)=>{edge.set(key.url,response.clone());}),
  }});
});
afterEach(()=>{vi.unstubAllGlobals();vi.restoreAllMocks();});

describe('permanent guide library',()=>{
  it('loads speech from R2 after edge eviction without another TTS request',async()=>{
    const fetch=vi.fn(async()=>audio());vi.stubGlobal('fetch',fetch);
    const first=await handleGuideVoice(speech(),env);
    expect(first.headers.get('x-guide-content-source')).toBe('generated');
    expect(recordings.size).toBe(1);
    const [key,recording]=[...recordings][0];
    expect(key).toMatch(/^guide\/v1\/speech\/[a-f0-9]{64}\.wav$/);
    expect(recording.contentType).toBe('audio/wav');
    expect(storage.put.mock.calls[0][2]).not.toHaveProperty('expirationTtl');
    edge.clear();
    const replay=await handleGuideVoice(speech(),env);
    expect(await replay.text()).toBe('RIFFxxxxWAVE1234');
    expect(replay.headers.get('x-guide-content-source')).toBe('r2');
    expect(replay.headers.get('content-type')).toBe('audio/wav');
    expect(fetch).toHaveBeenCalledOnce();expect(storage.put).toHaveBeenCalledOnce();
  });
  it('keeps public answers and uses a new version when notes or language change',async()=>{
    const fetch=vi.fn(async()=>answer());vi.stubGlobal('fetch',fetch);
    await handleLocationGuide(question,env);edge.clear();
    const replay=await handleLocationGuide(question,env);
    expect((await replay.json() as {text:string}).text).toBe('This is the staircase.');
    expect(replay.headers.get('x-guide-content-source')).toBe('r2');expect(fetch).toHaveBeenCalledOnce();
    const context=locations.locationGuideContext('staircase-3dgs','naga-staircase')!;
    vi.spyOn(locations,'locationGuideContext').mockReturnValueOnce({...context,introduction:'Changed source notes.'});
    await handleLocationGuide(question,env);
    await handleLocationGuide({...question,lang:'fr'},env);
    expect(fetch).toHaveBeenCalledTimes(3);expect(recordings.size).toBe(3);
    expect([...recordings.keys()].every(key=>/^guide\/v1\/answers\/[a-f0-9]{64}\.json$/.test(key))).toBe(true);
  });
  it('plays recorded content without a generation key or an available edge cache',async()=>{
    const fetch=vi.fn().mockImplementationOnce(async()=>audio()).mockImplementationOnce(async()=>answer());vi.stubGlobal('fetch',fetch);
    await handleGuideVoice(speech(),env);await handleLocationGuide(question,env);
    delete env.GEMINI_API_KEY;vi.stubGlobal('caches',undefined);
    const voice=await handleGuideVoice(speech(),env),text=await handleLocationGuide(question,env);
    expect(await voice.text()).toBe('RIFFxxxxWAVE1234');
    expect((await text.json() as {fallback:boolean}).fallback).toBe(false);
    expect(fetch).toHaveBeenCalledTimes(2);
    expect((await handleGuideVoice(speech('Not recorded'),env)).status).toBe(503);
  });
  it('stores another recording for changed text or resolved voice',async()=>{
    const fetch=vi.fn(async()=>audio());vi.stubGlobal('fetch',fetch);
    await handleGuideVoice(speech(),env);
    await handleGuideVoice(speech('Updated information'),env);
    await handleGuideVoice(speech(),{...env,PENH_VOICE_ID:'voice_revised'});
    expect(recordings.size).toBe(3);expect(fetch).toHaveBeenCalledTimes(3);
  });
  it('promotes an older edge-only recording after R2 is connected',async()=>{
    const fetch=vi.fn(async()=>audio());vi.stubGlobal('fetch',fetch);
    await handleGuideVoice(speech(),{GEMINI_API_KEY:env.GEMINI_API_KEY});expect(recordings.size).toBe(0);
    await handleGuideVoice(speech(),env);
    expect(recordings.size).toBe(1);expect(fetch).toHaveBeenCalledOnce();
    edge.clear();await handleGuideVoice(speech(),env);expect(fetch).toHaveBeenCalledOnce();
  });
  it('does not persist free-form text answers, provider failures or fallbacks',async()=>{
    const fetch=vi.fn(async()=>answer());vi.stubGlobal('fetch',fetch);
    await handleLocationGuide({...question,question:'A personal question not on the suggested list'},env);
    expect(recordings.size).toBe(0);
    fetch.mockImplementation(async()=>new Response('',{status:503}));
    await handleLocationGuide(question,env);await handleGuideVoice(speech(),env);
    expect(recordings.size).toBe(0);expect(storage.put).not.toHaveBeenCalled();
  });
  it('preserves the first recorded answer when another isolate won the write race',async()=>{
    const fetch=vi.fn(async()=>answer());vi.stubGlobal('fetch',fetch);
    storage.put.mockImplementationOnce(async(key:string,_bytes:ArrayBuffer,options:R2PutOptions)=>{
      expect(options.onlyIf).toEqual({etagDoesNotMatch:'*'});
      const winner=Response.json({text:'The answer saved by the first writer.',fallback:false,lang:'en',sources:[]});
      recordings.set(key,{bytes:await winner.arrayBuffer(),contentType:'application/json'});return null;
    });
    const response=await handleLocationGuide(question,env);
    expect((await response.json() as {text:string}).text).toBe('The answer saved by the first writer.');
    edge.clear();await handleLocationGuide(question,env);expect(fetch).toHaveBeenCalledOnce();
  });
  it('returns working audio during storage failure and retries saving from the edge',async()=>{
    const fetch=vi.fn(async()=>audio());vi.stubGlobal('fetch',fetch);
    storage.get.mockRejectedValueOnce(new Error('R2 temporarily unavailable'));
    storage.put.mockRejectedValueOnce(new Error('R2 temporarily unavailable'));
    expect((await handleGuideVoice(speech(),env)).status).toBe(200);expect(recordings.size).toBe(0);
    expect((await handleGuideVoice(speech(),env)).status).toBe(200);
    expect(recordings.size).toBe(1);expect(fetch).toHaveBeenCalledOnce();
  });
});
