import { useRef, useState } from 'react';
import type { Building } from '../buildings';
import type { PoiCapture } from '../spots';
import { Viewer } from './Viewer';
import { WalkControls } from './WalkControls';
import type { WalkInput } from './FirstPersonControls';
import { CaptureFlightButtons } from './CaptureFlightButtons';
import type { CaptureFlightMode } from '../captureFlight';
import './BuildingCaptureView.css';

/** A capture belongs to its building page, separate from campus overview cost.
 * Walking uses its authored ground apron, never splat fragments as collision. */
export function BuildingCaptureView({building,capture,backLabel,onBack,onModel}:{
  building:Building;capture:PoiCapture;backLabel:string;onBack:()=>void;onModel:()=>void;
}) {
  const [clean,setClean]=useState(true),[info,setInfo]=useState(false);
  const [walking,setWalking]=useState(false);
  const [flightMode,setFlightMode]=useState<CaptureFlightMode>('walking');
  const input=useRef<WalkInput>({move:{x:0,y:0},look:{dx:0,dy:0}});
  const toggleWalking=()=>{
    input.current={move:{x:0,y:0},look:{dx:0,dy:0}};
    setInfo(false);setFlightMode('walking');setWalking(v=>!v);
  };
  return <main className="building building-capture">
    <Viewer modelUrl="" capture={capture} cleanCapture={clean} blurb={building.name}
      mode={walking?'walk':'orbit'} walkInput={input} onCaptureFlightChange={setFlightMode}/>
    {walking&&<WalkControls input={input} hint=""/>}
    <header className="building-capture-header">
      <button onClick={onBack}>{backLabel}</button>
      <strong>{building.name}<small>Photo capture</small></strong>
    </header>
    {capture.walkAround&&<button className="building-capture-walk" aria-pressed={walking} onClick={toggleWalking}>
      {walking?'⟳ Inspect capture':'🚶 Walk around'}
    </button>}
    {walking&&<div className={`capture-step-nav${flightMode==='flying'?' flight-active':''}`}>
      {flightMode==='walking'&&<button title="Jump (Space)" onPointerDown={e=>e.preventDefault()} onClick={()=>{input.current.jump=true;}}>↑ Jump</button>}
      <CaptureFlightButtons input={input} mode={flightMode}/>
    </div>}
    {capture.cleanup&&<div className="capture-quality" role="group" aria-label="Capture view">
      <button aria-pressed={clean} onClick={()=>setClean(true)}>Clean view</button>
      <button aria-pressed={!clean} onClick={()=>setClean(false)}>Full scan</button>
    </div>}
    <div className="building-capture-actions">
      <button onClick={onModel}>Illustrative model</button>
      <button aria-expanded={info} aria-controls="building-capture-notes" onClick={()=>setInfo(v=>!v)}>{info?'Hide information':'About capture'}</button>
    </div>
    {info&&<aside className="building-capture-notes" id="building-capture-notes">
      <h2>{building.name}</h2>
      <p>{walking?'WASD or the joystick to walk; drag to look. Space jumps, double Space toggles flying. Hold Space to rise or Shift to descend.':'Drag to rotate, scroll to zoom, and right-drag or use two fingers to move the view. Choose Walk around to explore at eye level.'}</p>
      <p>Some surroundings and unphotographed angles are incomplete. Clean view reduces background fragments; Full scan preserves the wider export.</p>
      <a href="https://www.kaggle.com/code/camboversecenter/conference-hall-step2b-train-splat/output" target="_blank" rel="noreferrer">CamboVerse · capture source</a>
    </aside>}
  </main>;
}
