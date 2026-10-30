import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {HeritageAmbience} from './heritageAmbience';

let media:{play:ReturnType<typeof vi.fn>;pause:ReturnType<typeof vi.fn>;load:ReturnType<typeof vi.fn>;removeAttribute:ReturnType<typeof vi.fn>;volume:number;currentTime:number;duration:number;loop:boolean;preload:string;onerror:(()=>void)|null};
const controllers:HeritageAmbience[]=[];
beforeEach(()=>{
  vi.useFakeTimers();
  media={play:vi.fn(async()=>{}),pause:vi.fn(),load:vi.fn(),removeAttribute:vi.fn(),volume:1,currentTime:5,duration:39,loop:false,preload:'',onerror:null};
  vi.stubGlobal('Audio',vi.fn(function(){return media;}));
  vi.stubGlobal('window',{speechSynthesis:{speaking:false}});
});
afterEach(()=>{controllers.forEach(c=>c.dispose());controllers.length=0;vi.unstubAllGlobals();vi.useRealTimers();});
function player(){const state=vi.fn();const controller=new HeritageAmbience(state);controllers.push(controller);return {controller,state};}

describe('optional heritage ambience',()=>{
  it('does not create media before opt-in and mutes/disposes all resources',async()=>{
    const {controller,state}=player();
    expect(Audio).not.toHaveBeenCalled();
    await controller.setEnabled(true);vi.advanceTimersByTime(4000);
    expect(media.preload).toBe('none');expect(media.loop).toBe(true);
    expect(media.volume).toBeCloseTo(.18,3);expect(state).toHaveBeenLastCalledWith('playing');
    await controller.setEnabled(false);expect(media.pause).toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);expect(state).toHaveBeenLastCalledWith('off');
    controller.dispose();expect(media.removeAttribute).toHaveBeenCalledWith('src');
  });
  it('ducks under narration and fades both ends of the loop',async()=>{
    const {controller}=player();await controller.setEnabled(true);vi.advanceTimersByTime(4000);
    window.speechSynthesis.speaking=true;vi.advanceTimersByTime(4000);
    expect(media.volume).toBeCloseTo(.18*.22,3);
    window.speechSynthesis.speaking=false;media.currentTime=38.9;vi.advanceTimersByTime(4000);
    expect(media.volume).toBeCloseTo(.18*.125,3);
    media.currentTime=.1;vi.advanceTimersByTime(4000);
    expect(media.volume).toBeCloseTo(.18*.125,3);
  });
  it('pauses while hidden and surfaces a playback failure for retry',async()=>{
    const {controller,state}=player();await controller.setEnabled(true);
    controller.setSuspended(true);expect(state).toHaveBeenLastCalledWith('paused');
    expect(vi.getTimerCount()).toBe(0);
    media.play.mockRejectedValue(new Error('media blocked'));
    controller.setSuspended(false);await Promise.resolve();
    expect(state).toHaveBeenLastCalledWith('error');expect(controller.enabled).toBe(false);
    media.play.mockResolvedValue(undefined);await controller.setEnabled(true);
    expect(state).toHaveBeenLastCalledWith('playing');
    media.onerror?.();expect(state).toHaveBeenLastCalledWith('error');expect(vi.getTimerCount()).toBe(0);
  });
  it('does not resurrect playback when disabled while play is still pending',async()=>{
    let finish!:()=>void;
    media.play.mockImplementation(()=>new Promise<void>(resolve=>{finish=resolve;}));
    const {controller,state}=player();const starting=controller.setEnabled(true);
    await controller.setEnabled(false);finish();await starting;
    expect(controller.enabled).toBe(false);expect(state).toHaveBeenLastCalledWith('off');
    expect(vi.getTimerCount()).toBe(0);expect(media.pause).toHaveBeenCalled();
  });
});
