import {afterEach,describe,expect,it,vi} from 'vitest';
import {HeritageMusic} from './heritageMusic';
afterEach(()=>{vi.useRealTimers();vi.unstubAllGlobals();});
describe('background music',()=>{
  it('starts on request, pauses on hidden, restarts and releases its audio nodes',async()=>{
    vi.useFakeTimers();
    const gains:ReturnType<typeof gain>[]=[];
    function gain(){return {gain:{value:0,setTargetAtTime:vi.fn(),setValueAtTime:vi.fn(),exponentialRampToValueAtTime:vi.fn()},connect:vi.fn(function(){return this;}),disconnect:vi.fn()};}
    const oscillators:Array<{start:ReturnType<typeof vi.fn>;stop:ReturnType<typeof vi.fn>;disconnect:ReturnType<typeof vi.fn>;connect:ReturnType<typeof vi.fn>;frequency:{value:number};onended:null}>=[];
    const ctx={currentTime:0,destination:{},resume:vi.fn(async()=>{}),close:vi.fn(async()=>{}),createGain:()=>{const g=gain();gains.push(g);return g;},createOscillator:()=>{const o={start:vi.fn(),stop:vi.fn(),disconnect:vi.fn(),connect:vi.fn((target)=>target),frequency:{value:0},onended:null};oscillators.push(o);return o;}};
    vi.stubGlobal('window',{AudioContext:class {constructor(){return ctx;}}});
    const status=vi.fn(),music=new HeritageMusic(status);expect(ctx.resume).not.toHaveBeenCalled();
    await music.setEnabled(true);expect(status).toHaveBeenLastCalledWith('playing');expect(oscillators[0].start).toHaveBeenCalled();
    music.setSuspended(true);expect(status).toHaveBeenLastCalledWith('paused');expect(oscillators[0].stop).toHaveBeenCalled();expect(vi.getTimerCount()).toBe(0);
    music.setSuspended(false);await Promise.resolve();expect(status).toHaveBeenLastCalledWith('playing');
    await music.setEnabled(false);expect(status).toHaveBeenLastCalledWith('off');expect(vi.getTimerCount()).toBe(0);
    music.dispose();expect(ctx.close).toHaveBeenCalledOnce();expect(gains.length).toBeGreaterThan(0);
  });
});
