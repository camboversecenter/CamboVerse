import {guideNarrationActive} from './guideNarrator';
import type {AmbienceState} from './heritageAmbience';

/** A quiet, original synthesized instrumental pattern (not traditional music). */
export class HeritageMusic {
  private ctx?:AudioContext;private master?:GainNode;private timer?:ReturnType<typeof setInterval>;
  private nodes=new Set<AudioScheduledSourceNode>();private next=0;private step=0;private suspended=false;
  private generation=0;enabled=false;
  constructor(private changed:(s:AmbienceState)=>void){}
  async setEnabled(enabled:boolean){
    this.enabled=enabled;const generation=++this.generation;
    if(!enabled||this.suspended){this.stopAudio();this.changed(enabled?'paused':'off');return;}
    this.changed('loading');
    try{
      const Ctor=window.AudioContext||(window as unknown as {webkitAudioContext:typeof AudioContext}).webkitAudioContext;
      this.ctx??=new Ctor();await this.ctx.resume();
      if(generation!==this.generation)return;
      this.master=this.ctx.createGain();this.master.gain.value=.32;this.master.connect(this.ctx.destination);
      this.next=this.ctx.currentTime+.1;this.step=0;this.changed('playing');this.tick();
      this.timer=setInterval(()=>this.tick(),400);
    }catch{if(generation===this.generation){this.enabled=false;this.stopAudio();this.changed('error');}}
  }
  private tick(){
    const c=this.ctx,m=this.master;if(!c||!m)return;
    m.gain.setTargetAtTime(guideNarrationActive() ? .08 : .32,c.currentTime,.15);
    const notes=[261.63,329.63,392,493.88,440,392,329.63,293.66];
    while(this.next<c.currentTime+.6){
      const t=this.next,o=c.createOscillator(),gain=c.createGain();o.type='sine';o.frequency.value=notes[this.step%notes.length];
      gain.gain.setValueAtTime(.0001,t);gain.gain.exponentialRampToValueAtTime(.055,t+.12);gain.gain.exponentialRampToValueAtTime(.0001,t+2.4);
      o.connect(gain).connect(m);o.onended=()=>{this.nodes.delete(o);o.disconnect();gain.disconnect();};this.nodes.add(o);o.start(t);o.stop(t+2.5);
      this.step++;this.next+=2.2;
    }
  }
  setSuspended(s:boolean){if(this.suspended===s)return;this.suspended=s;if(this.enabled)void this.setEnabled(true);}
  private stopAudio(){if(this.timer!==undefined)clearInterval(this.timer);this.timer=undefined;for(const n of this.nodes){n.onended=null;try{n.stop();}catch{}n.disconnect();}this.nodes.clear();this.master?.disconnect();this.master=undefined;}
  dispose(){this.enabled=false;this.generation++;this.stopAudio();if(this.ctx){void this.ctx.close().catch(()=>{});this.ctx=undefined;}}
}
