import {useEffect,useMemo,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {createXRStore} from '@react-three/xr';
import {HERITAGE_AMBIENCE,HeritageAmbience,ambienceShouldSuspend,type AmbienceState} from '../lib/heritageAmbience';
import {HeritageMusic} from '../lib/heritageMusic';

export type AmbienceControl={state:AmbienceState;musicState:AmbienceState;toggle:()=>void;toggleMusic:()=>void;start:()=>void};

/** Shared by the browser button and the actual in-headset menu. */
export function useHeritageAmbience(enabled:boolean,store:ReturnType<typeof createXRStore>):AmbienceControl {
  const [state,setState]=useState<AmbienceState>('off');
  const [musicState,setMusicState]=useState<AmbienceState>('off');
  const player=useMemo(()=>new HeritageAmbience(setState),[]);
  const music=useMemo(()=>new HeritageMusic(setMusicState),[]);
  const mutedByVisitor=useRef(false),musicMuted=useRef(false);
  useEffect(()=>{
    if(!enabled)return;
    let session=store.getState().session;
    // During immersive presentation a browser may hide the 2D document even
    // while the headset session itself is visible.
    const visibility=()=>{const suspended=ambienceShouldSuspend(document.hidden,session?.visibilityState);player.setSuspended(suspended);music.setSuspended(suspended);};
    session?.addEventListener('visibilitychange',visibility);
    const unsubscribe=store.subscribe(next=>{
      if(next.session===session)return;
      session?.removeEventListener('visibilitychange',visibility);session=next.session;
      session?.addEventListener('visibilitychange',visibility);visibility();
    });
    document.addEventListener('visibilitychange',visibility);visibility();
    return ()=>{unsubscribe();session?.removeEventListener('visibilitychange',visibility);document.removeEventListener('visibilitychange',visibility);player.dispose();music.dispose();};
  },[enabled,player,music,store]);
  return {state,musicState,toggle:()=>{if(enabled){mutedByVisitor.current=player.enabled;void player.setEnabled(!player.enabled);}},
    toggleMusic:()=>{if(enabled){musicMuted.current=music.enabled;void music.setEnabled(!music.enabled);}},
    start:()=>{if(enabled&&!mutedByVisitor.current&&!player.enabled)void player.setEnabled(true);if(enabled&&!musicMuted.current&&!music.enabled)void music.setEnabled(true);}};
}

export function HeritageAmbienceButton({control}:{control:AmbienceControl}) {
  return createPortal(<div className="heritage-ambience">
    <button onClick={control.toggle} aria-pressed={control.state==='playing'||control.state==='paused'}>
      {control.state==='playing'?'♪ Birds · Mute':control.state==='loading'?'Loading birds…':control.state==='error'?'Retry bird ambience':'♪ Bird ambience'}
    </button>
    <button onClick={control.toggleMusic} aria-pressed={control.musicState==='playing'||control.musicState==='paused'}>{control.musicState==='playing'?'♫ Music · Mute':control.musicState==='loading'?'Loading music…':control.musicState==='error'?'Retry music':'♫ Background music'}</button>
    <details><summary>Sound credit</summary><a href={HERITAGE_AMBIENCE.source} target="_blank" rel="noreferrer">{HERITAGE_AMBIENCE.credit}</a><p>{HERITAGE_AMBIENCE.location}</p></details>
  </div>,document.body);
}
