import {afterEach,describe,expect,it,vi} from 'vitest';
import {handleGuideVoice} from './guideVoice';
afterEach(()=>vi.unstubAllGlobals());
const request=(body:unknown)=>new Request('https://example.org/api/guide-voice',{method:'POST',body:JSON.stringify(body)});
describe('guide speech service',()=>{
  it('returns audio only and never sends the server key to the visitor',async()=>{
    const fetch=vi.fn().mockResolvedValue(Response.json({candidates:[{content:{parts:[{inlineData:{mimeType:'audio/wav',data:btoa('RIFFxxxxWAVE1234')}}]}}]}));vi.stubGlobal('fetch',fetch);
    const response=await handleGuideVoice(request({text:'Welcome to Wat Phnom.'}),{GEMINI_API_KEY:'test-private-key'});
    expect(response.status).toBe(200);expect(response.headers.get('content-type')).toBe('audio/wav');
    expect(await response.text()).toBe('RIFFxxxxWAVE1234');
    expect(fetch.mock.calls[0][0]).toContain('gemini-3.8-flash-lite-tts');
    const options=fetch.mock.calls[0][1];expect(options.headers['x-goog-api-key']).toBe('test-private-key');
    expect(JSON.parse(options.body).contents[0].parts[0].text).toBe('Welcome to Wat Phnom.');
  });
  it('rejects long inputs, missing keys, failed providers and non-WAV output',async()=>{
    expect((await handleGuideVoice(request({text:'a'.repeat(1501)}),{})).status).toBe(400);
    expect((await handleGuideVoice(request({text:'hello'}),{})).status).toBe(503);
    vi.stubGlobal('fetch',vi.fn().mockResolvedValue(Response.json({candidates:[{content:{parts:[{inlineData:{data:btoa('not audio')}}]}}]})));
    const response=await handleGuideVoice(request({text:'hello'}),{GEMINI_API_KEY:'test-private-key'});
    expect(response.status).toBe(502);expect(await response.text()).not.toContain('test-private-key');
  });
  it('uses an approved server-configured voice and gentle delivery only for Penh',async()=>{
    const fetch=vi.fn().mockResolvedValue(Response.json({candidates:[{content:{parts:[{inlineData:{data:btoa('RIFFxxxxWAVE1234')}}]}}]}));vi.stubGlobal('fetch',fetch);
    const env={GEMINI_API_KEY:'test-private-key',PENH_VOICE_ID:'voice_approved123'};
    const response=await handleGuideVoice(request({text:'Welcome.',persona:'penh'}),env);
    expect(response.status).toBe(200);
    const sent=JSON.parse(fetch.mock.calls[0][1].body);
    expect(sent.generationConfig.speechConfig.voiceConfig.voice).toBe('voice_approved123');
    expect(sent.contents[0].parts[0].speech_metadata.style).toContain('gently');
    expect(await response.text()).not.toContain(env.PENH_VOICE_ID);
    await handleGuideVoice(request({text:'Hello.'}),env);
    const other=JSON.parse(fetch.mock.calls[1][1].body);
    expect(other.generationConfig.speechConfig.voiceConfig.voice).toBe('Kore');
    expect(other.contents[0].parts[0]).not.toHaveProperty('speech_metadata');
    expect((await handleGuideVoice(request({text:'hello',persona:'unknown'}),env)).status).toBe(400);
  });
});
