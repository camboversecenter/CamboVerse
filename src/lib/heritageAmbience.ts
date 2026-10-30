export const HERITAGE_AMBIENCE={
  url:'/audio/ambience/cambodia-birds.ogg',
  credit:'Cambodia birds · L. Shyamal · CC0',
  source:'https://commons.wikimedia.org/wiki/File:Cambodia_birds.ogg',
  location:'Recorded in Siem Reap; used as background ambience.',
};
export type AmbienceState='off'|'loading'|'playing'|'paused'|'error';

/** Quiet opt-in audio. Creating the controller never creates/downloads audio. */
export class HeritageAmbience {
  private audio?:HTMLAudioElement;
  private timer?:ReturnType<typeof setInterval>;
  private generation=0;
  private suspended=false;
  enabled=false;
  constructor(private changed:(state:AmbienceState)=>void){}
  async setEnabled(enabled:boolean){
    this.enabled=enabled;
    const generation=++this.generation;
    if(!enabled||this.suspended){
      this.audio?.pause();this.clearTimer();this.changed(enabled?'paused':'off');return;
    }
    if(!this.audio){
      this.audio=new Audio(HERITAGE_AMBIENCE.url);this.audio.preload='none';this.audio.loop=true;
      this.audio.onerror=()=>{this.generation++;this.enabled=false;this.audio?.pause();this.clearTimer();this.changed('error');};
    }
    this.audio.volume=0;
    this.changed('loading');
    try{
      await this.audio.play();
      if(generation!==this.generation){if(!this.enabled||this.suspended)this.audio?.pause();return;}
      this.changed('playing');this.clearTimer();
      this.timer=setInterval(()=>{
        if(!this.audio)return;
        const start=Math.min(1,this.audio.currentTime/.8);
        const end=Number.isFinite(this.audio.duration)?Math.min(1,Math.max(0,(this.audio.duration-this.audio.currentTime)/.8)):1;
        const speaking=typeof window!=='undefined'&&window.speechSynthesis?.speaking;
        const target=.18*Math.max(0,Math.min(start,end))*(speaking? .22:1);
        this.audio.volume+=(target-this.audio.volume)*.25;
      },100);
    }catch{
      if(generation!==this.generation)return;
      this.enabled=false;this.audio.pause();this.clearTimer();this.changed('error');
    }
  }
  setSuspended(suspended:boolean){
    if(this.suspended===suspended)return;
    this.suspended=suspended;
    if(this.enabled)void this.setEnabled(true);
  }
  private clearTimer(){if(this.timer!==undefined)clearInterval(this.timer);this.timer=undefined;}
  dispose(){
    this.enabled=false;this.generation++;this.clearTimer();
    if(this.audio){this.audio.pause();this.audio.onerror=null;this.audio.removeAttribute('src');this.audio.load();this.audio=undefined;}
  }
}
