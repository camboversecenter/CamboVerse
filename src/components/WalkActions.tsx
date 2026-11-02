import {useEffect,useState,type MutableRefObject} from 'react';
import type {WalkInput} from './FirstPersonControls';

/** Separate from the look surface so a second finger never becomes a look drag.
 * Run toggles for two-thumb mobile use; keyboard Shift remains hold-to-run. */
export function WalkActions({input,inline=false}:{input:MutableRefObject<WalkInput>;inline?:boolean}){
  const [running,setRunning]=useState(false);
  useEffect(()=>{
    const clear=()=>{input.current.sprint=false;input.current.jump=false;setRunning(false);};
    const hidden=()=>{if(document.hidden)clear();};
    const focus=(e:FocusEvent)=>{if(e.target instanceof HTMLElement&&!e.target.closest('.walk-actions')&&e.target.closest('input,textarea,select,button,a,[contenteditable="true"]'))clear();};
    window.addEventListener('blur',clear);document.addEventListener('visibilitychange',hidden);document.addEventListener('focusin',focus);
    return()=>{input.current.sprint=false;input.current.jump=false;window.removeEventListener('blur',clear);document.removeEventListener('visibilitychange',hidden);document.removeEventListener('focusin',focus);};
  },[input]);
  return <div className={`walk-actions${inline?' walk-actions-inline':''}`} role="group" aria-label="Walking actions"
    onPointerDown={e=>{e.stopPropagation();e.preventDefault();}} onPointerUp={e=>e.stopPropagation()}>
    <button type="button" aria-pressed={running} title="Run (hold Shift on keyboard)" onClick={e=>{e.stopPropagation();const next=!running;input.current.sprint=next;setRunning(next);}}>{running?'Run · On':'Run'}</button>
    <button type="button" title="Jump (Space). Press again in the air for a second jump." onClick={e=>{e.stopPropagation();input.current.jump=true;}}>↑ Jump</button>
  </div>;
}
