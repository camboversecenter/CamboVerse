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
    const pending=narrator.start('Hello visitor');expect(ctx.resume).toHaveBeenCalledOnce();expect(guideNarrationActive()).toBe(true);
    await pending;expect(source.start).toHaveBeenCalledOnce();expect(status).toHaveBeenLastCalledWith('speaking');
    narrator.stop();expect(source.stop).toHaveBeenCalledOnce();expect(guideNarrationActive()).toBe(false);
    narrator.dispose();expect(ctx.close).toHaveBeenCalledOnce();
  });
  it('reports unavailable speech when the server and device voice cannot play',async()=>{
    vi.stubGlobal('window',{});const status=vi.fn(),narrator=new GuideNarrator(status);
    await narrator.start('Hello');expect(status).toHaveBeenLastCalledWith('unavailable');expect(guideNarrationActive()).toBe(false);narrator.dispose();
  });
});
