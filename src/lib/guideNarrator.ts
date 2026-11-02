import {speak,stopSpeaking} from './voice';

let activeNarrations=0;
export function guideNarrationActive(){return activeNarrations>0;}
export type NarrationStatus='idle'|'loading'|'speaking'|'unavailable';

/** Request speech on explicit Listen, using a context unlocked in that gesture.
 * Abort, disconnect and release resources when leaving or stopping. */
export class GuideNarrator {
  private context?:AudioContext;
  private source?:AudioBufferSourceNode;
  private request?:AbortController;
  private generation=0;
  private counted=false;
  constructor(private status:(s:NarrationStatus)=>void){}
  private mark(on:boolean){if(this.counted===on)return;this.counted=on;activeNarrations+=on?1:-1;}
  stop(){
    this.generation++;this.request?.abort();this.request=undefined;
    if(this.source){this.source.onended=null;try{this.source.stop();}catch{}this.source.disconnect();this.source=undefined;}
    stopSpeaking();this.mark(false);this.status('idle');
  }
  dispose(){this.stop();if(this.context){void this.context.close().catch(()=>{});this.context=undefined;}}
  async start(text:string,bcp='en-US',persona?:'penh'){
    this.stop();const id=++this.generation;this.mark(true);this.status('loading');
    try{
      const AudioCtor=window.AudioContext||(window as unknown as {webkitAudioContext:typeof AudioContext}).webkitAudioContext;
      if(!AudioCtor)throw new Error('Audio unavailable');
      this.context??=new AudioCtor();
      // Begin resume synchronously while the controller trigger is still active.
      const resumed=this.context.resume();
      const request=new AbortController();this.request=request;
      const [response]=await Promise.all([fetch('/api/guide-voice',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({text,persona}),signal:request.signal}),resumed]);
      if(!response.ok)throw new Error('Voice service unavailable');
      const bytes=await response.arrayBuffer();
      const decoded=await this.context.decodeAudioData(bytes);
      if(id!==this.generation)return;
      const source=this.context.createBufferSource();source.buffer=decoded;source.connect(this.context.destination);this.source=source;
      source.onended=()=>{if(id!==this.generation)return;this.source=undefined;this.mark(false);this.status('idle');};
      source.start();this.status('speaking');
    }catch{
      if(id!==this.generation)return;
      const ok=speak(text,bcp,{onStart:()=>{if(id===this.generation)this.status('speaking');},onEnd:()=>{if(id===this.generation){this.mark(false);this.status('idle');}},onError:()=>{if(id===this.generation){this.mark(false);this.status('unavailable');}}});
      if(!ok){this.mark(false);this.status('unavailable');}
    }
  }
}
