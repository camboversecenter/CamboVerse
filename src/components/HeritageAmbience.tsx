import {useEffect,useMemo,useState} from 'react';
import {createPortal} from 'react-dom';
import {createXRStore} from '@react-three/xr';
import {HERITAGE_AMBIENCE,HeritageAmbience,type AmbienceState} from '../lib/heritageAmbience';

export type AmbienceControl={state:AmbienceState;toggle:()=>void};

/** Shared by the browser button and the actual in-headset menu. */
export function useHeritageAmbience(enabled:boolean,store:ReturnType<typeof createXRStore>):AmbienceControl {
  const [state,setState]=useState<AmbienceState>('off');
  const player=useMemo(()=>new HeritageAmbience(setState),[]);
  useEffect(()=>{
    if(!enabled)return;
    let session=store.getState().session;
    const visibility=()=>player.setSuspended(document.hidden||!!session&&session.visibilityState!=='visible');
    session?.addEventListener('visibilitychange',visibility);
    const unsubscribe=store.subscribe(next=>{
      if(next.session===session)return;
      session?.removeEventListener('visibilitychange',visibility);session=next.session;
      session?.addEventListener('visibilitychange',visibility);visibility();
    });
    document.addEventListener('visibilitychange',visibility);visibility();
    return ()=>{unsubscribe();session?.removeEventListener('visibilitychange',visibility);document.removeEventListener('visibilitychange',visibility);player.dispose();};
  },[enabled,player,store]);
  return {state,toggle:()=>{if(enabled)void player.setEnabled(!player.enabled);}};
}

export function HeritageAmbienceButton({control}:{control:AmbienceControl}) {
  return createPortal(<div className="heritage-ambience">
    <button onClick={control.toggle} aria-pressed={control.state==='playing'||control.state==='paused'}>
      {control.state==='playing'?'♪ Birds · Mute':control.state==='loading'?'Loading birds…':control.state==='error'?'Retry bird ambience':'♪ Bird ambience'}
    </button>
    <details><summary>Sound credit</summary><a href={HERITAGE_AMBIENCE.source} target="_blank" rel="noreferrer">{HERITAGE_AMBIENCE.credit}</a><p>{HERITAGE_AMBIENCE.location}</p></details>
  </div>,document.body);
}
