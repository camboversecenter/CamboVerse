import {afterEach,describe,expect,it,vi} from 'vitest';
import {GuideNarrator,guideNarrationActive} from './guideNarrator';
afterEach(()=>vi.unstubAllGlobals());
describe('guide narration playback',()=>{
  it('unlocks audio on the click, plays returned speech, and cleans up',async()=>{
    const source={connect:vi.fn(),start:vi.fn(),stop:vi.fn(),disconnect:vi.fn(),onended:null,buffer:null};
    const ctx={resume:vi.fn(async()=>{}),decodeAudioData:vi.fn(async()=>({})),createBufferSource:()=>source,destination:{},close:vi.fn(async()=>{})};
    vi.stubGlobal('window',{AudioContext:class {constructor(){return ctx;}},speechSynthesis:{cancel:vi.fn()}});
    const fetch=vi.fn(async()=>new Response(new Uint8Array([1,2])));vi.stubGlobal('fetch',fetch);
    const status=vi.fn(),narrator=new GuideNarrator(status);
    const pending=narrator.start('Hello visitor','en-US','penh');expect(ctx.resume).toHaveBeenCalledOnce();expect(guideNarrationActive()).toBe(true);
    await pending;expect(source.start).toHaveBeenCalledOnce();expect(status).toHaveBeenLastCalledWith('speaking');
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({text:'Hello visitor',persona:'penh',lang:'en-US'});
    narrator.stop();expect(source.stop).toHaveBeenCalledOnce();expect(guideNarrationActive()).toBe(false);
    narrator.dispose();expect(ctx.close).toHaveBeenCalledOnce();
  });
  it('reports unavailable speech when the server and device voice cannot play',async()=>{
    vi.stubGlobal('window',{});const status=vi.fn(),narrator=new GuideNarrator(status);
    await narrator.start('Hello');expect(status).toHaveBeenLastCalledWith('unavailable');expect(guideNarrationActive()).toBe(false);narrator.dispose();
  });
  it('does not send or speak mixed-script Khmer narration',async()=>{
    const fetch=vi.fn();vi.stubGlobal('fetch',fetch);
    const status=vi.fn(),narrator=new GuideNarrator(status);
    await narrator.start('សួស្តី ครับ','km-KH','penh');
    expect(fetch).not.toHaveBeenCalled();expect(status).toHaveBeenLastCalledWith('unavailable');
  });
  it('replays a completed recording without fetching and separates changed text, language and persona',async()=>{
    const sources:Array<{connect:ReturnType<typeof vi.fn>;start:ReturnType<typeof vi.fn>;stop:ReturnType<typeof vi.fn>;disconnect:ReturnType<typeof vi.fn>;onended:null;buffer:null}>=[];
    const ctx={resume:vi.fn(async()=>{}),decodeAudioData:vi.fn(async(bytes:ArrayBuffer)=>{structuredClone(bytes,{transfer:[bytes]});return {};}),createBufferSource:()=>{
      const source={connect:vi.fn(),start:vi.fn(),stop:vi.fn(),disconnect:vi.fn(),onended:null,buffer:null};sources.push(source);return source;
    },destination:{},close:vi.fn(async()=>{})};
    vi.stubGlobal('window',{AudioContext:class {constructor(){return ctx;}},speechSynthesis:{cancel:vi.fn()}});
    const fetch=vi.fn(async()=>new Response(new Uint8Array([1,2])));vi.stubGlobal('fetch',fetch);
    const narrator=new GuideNarrator(vi.fn());
    await narrator.start('Welcome','en-US','penh');narrator.stop();
    await narrator.start(' Welcome ','en-US','penh');
    expect(fetch).toHaveBeenCalledTimes(1);expect(sources[1].start).toHaveBeenCalledOnce();
    expect(ctx.decodeAudioData.mock.calls.map(([bytes])=>bytes.byteLength)).toEqual([0,0]);
    await narrator.start('New information','en-US','penh');
    await narrator.start('Welcome','fr-FR','penh');
    await narrator.start('Welcome','en-US');
    expect(fetch).toHaveBeenCalledTimes(4);
    narrator.dispose();
    await narrator.start('Welcome','en-US','penh');expect(fetch).toHaveBeenCalledTimes(5);narrator.dispose();
  });
  it('does not save failed audio and retries it on the next Listen',async()=>{
    const ctx={resume:vi.fn(async()=>{}),decodeAudioData:vi.fn().mockRejectedValueOnce(new Error('Bad audio')).mockResolvedValue({}),createBufferSource:()=>({connect:vi.fn(),start:vi.fn(),stop:vi.fn(),disconnect:vi.fn(),onended:null,buffer:null}),destination:{},close:vi.fn(async()=>{})};
    vi.stubGlobal('window',{AudioContext:class {constructor(){return ctx;}}});
    const fetch=vi.fn(async()=>new Response(new Uint8Array([1,2])));vi.stubGlobal('fetch',fetch);
    const narrator=new GuideNarrator(vi.fn());await narrator.start('Retry');await narrator.start('Retry');
    expect(fetch).toHaveBeenCalledTimes(2);narrator.dispose();
  });
  it('evicts old recordings to keep the active guide within its memory budget',async()=>{
    const ctx={resume:vi.fn(async()=>{}),decodeAudioData:vi.fn(async()=>({})),createBufferSource:()=>({connect:vi.fn(),start:vi.fn(),stop:vi.fn(),disconnect:vi.fn(),onended:null,buffer:null}),destination:{},close:vi.fn(async()=>{})};
    vi.stubGlobal('window',{AudioContext:class {constructor(){return ctx;}},speechSynthesis:{cancel:vi.fn()}});
    const fetch=vi.fn(async()=>new Response(new Uint8Array(3*1024*1024)));vi.stubGlobal('fetch',fetch);
    const narrator=new GuideNarrator(vi.fn());
    for(const text of ['First','Second','Third','Second'])await narrator.start(text);
    expect(fetch).toHaveBeenCalledTimes(3);
    await narrator.start('First');expect(fetch).toHaveBeenCalledTimes(4);narrator.dispose();
  });
});
