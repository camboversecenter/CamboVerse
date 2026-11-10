import {speak,stopSpeaking} from './voice';
import {isKhmerGuideText} from '../guideKhmer';

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
  // Keep at most 8 MiB of encoded recordings while this guide is alive. Audio
  // buffers are decoded for playback only; mobile memory stays bounded.
  private recordings=new Map<string,ArrayBuffer>();
  private recordingBytes=0;
  constructor(private status:(s:NarrationStatus)=>void){}
  private mark(on:boolean){if(this.counted===on)return;this.counted=on;activeNarrations+=on?1:-1;}
  stop(){
    this.generation++;this.request?.abort();this.request=undefined;
    if(this.source){this.source.onended=null;try{this.source.stop();}catch{}this.source.disconnect();this.source=undefined;}
    stopSpeaking();this.mark(false);this.status('idle');
  }
  dispose(){this.stop();this.recordings.clear();this.recordingBytes=0;if(this.context){void this.context.close().catch(()=>{});this.context=undefined;}}
  async start(text:string,bcp='en-US',persona?:'penh'){
    this.stop();
    if(bcp.startsWith('km')&&!isKhmerGuideText(text)){this.status('unavailable');return;}
    const id=++this.generation;this.mark(true);this.status('loading');
    try{
      const AudioCtor=window.AudioContext||(window as unknown as {webkitAudioContext:typeof AudioContext}).webkitAudioContext;
      if(!AudioCtor)throw new Error('Audio unavailable');
      this.context??=new AudioCtor();
      // Begin resume synchronously while the controller trigger is still active.
      const resumed=this.context.resume();
      const body=JSON.stringify({text:text.trim(),persona,lang:bcp});
      let bytes=this.recordings.get(body);
      if(bytes){
        // Touch the entry so eviction removes the least recently used recording.
        this.recordings.delete(body);this.recordings.set(body,bytes);
        await resumed;
      }else{
        const request=new AbortController();this.request=request;
        const [response]=await Promise.all([fetch('/api/guide-voice',{method:'POST',headers:{'content-type':'application/json'},body,signal:request.signal}),resumed]);
        if(!response.ok)throw new Error('Voice service unavailable');
        bytes=await response.arrayBuffer();
      }
      if(id!==this.generation)return;
      // decodeAudioData may detach its input. Preserve the reusable original.
      const decoded=await this.context.decodeAudioData(bytes.slice(0));
      if(id!==this.generation)return;
      if(!this.recordings.has(body)&&bytes.byteLength<=8*1024*1024){
        while(this.recordings.size>=8||this.recordingBytes+bytes.byteLength>8*1024*1024){
          const oldest=this.recordings.keys().next().value!;
          this.recordingBytes-=this.recordings.get(oldest)!.byteLength;this.recordings.delete(oldest);
        }
        this.recordings.set(body,bytes);this.recordingBytes+=bytes.byteLength;
      }
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
