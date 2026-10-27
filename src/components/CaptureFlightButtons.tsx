import type { MutableRefObject, PointerEvent } from 'react';
import type { WalkInput } from './FirstPersonControls';
import type { CaptureFlightMode } from '../captureFlight';

export function CaptureFlightButtons({input,mode}:{input:MutableRefObject<WalkInput>;mode:CaptureFlightMode}) {
  const hold=(e:PointerEvent<HTMLButtonElement>,direction:number)=>{
    e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);input.current.flyVertical=direction;
  };
  const release=()=>{input.current.flyVertical=0;};
  return <>
    <button title="Double Space to toggle flying" aria-pressed={mode==='flying'} disabled={mode==='landing'}
      onPointerDown={e=>e.preventDefault()} onClick={()=>{input.current.flyToggle=true;}}>
      {mode==='landing'?'Landing…':mode==='flying'?'↓ Land':'✦ Fly'}
    </button>
    {mode==='flying'&&<>
      <button aria-label="Fly up" title="Hold Space to rise" onPointerDown={e=>hold(e,1)} onPointerUp={release} onPointerCancel={release} onLostPointerCapture={release} onClick={()=>{input.current.flyStep=.3;}}>↑ Up</button>
      <button aria-label="Fly down" title="Hold Shift to descend" onPointerDown={e=>hold(e,-1)} onPointerUp={release} onPointerCancel={release} onLostPointerCapture={release} onClick={()=>{input.current.flyStep=-.3;}}>↓ Down</button>
    </>}
  </>;
}
