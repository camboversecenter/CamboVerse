import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useFrame } from '@react-three/fiber';
import { createXRStore, useXR, useXRStore } from '@react-three/xr';
import { Group, REVISION, Vector3 } from 'three';
import type { Poi } from '../spots';
import { captureVRScale } from '../captureVR';
import './CaptureVR.css';
import {checkImmersiveVR,immersiveVRError,immersiveVRFailure,startImmersiveVR} from '../immersiveVR';
import {worldPanelPose} from '../vrPresentation';
import {VRSurface} from './VRSurface';
import type {AmbienceControl} from './HeritageAmbience';

export interface CaptureVRTour {
  title:string;
  stops:Poi[];
  activeId?:string;
  onSelect:(id:string)=>void;
}

/** Entry stays discoverable on desktop; unsupported devices get instructions,
 * never a fake headset session or a hidden button. Session starts on a click. */
export function CaptureVREntry({store,tour}:{store:ReturnType<typeof createXRStore>;tour:CaptureVRTour}) {
  return <ImmersiveVREntry store={store} title={tour.title} onBeforeEnter={()=>{
    if(!tour.activeId&&tour.stops[0])tour.onSelect(tour.stops[0].id);
  }} tour={tour}/>;
}

export function ImmersiveVREntry({store,title,tour,onBeforeEnter,className='capture-vr-entry'}:{
  store:ReturnType<typeof createXRStore>;title:string;tour?:CaptureVRTour;onBeforeEnter?:()=>void;className?:string;
}) {
  const [open,setOpen]=useState(false),[supported,setSupported]=useState(false);
  const [active,setActive]=useState(false),[pending,setPending]=useState(false);
  const [message,setMessage]=useState('Checking headset support…');
  const [checkCode,setCheckCode]=useState('checking'),[failure,setFailure]=useState('');
  const titleId=useId();
  const dialog=useRef<HTMLDialogElement>(null),entry=useRef<HTMLButtonElement>(null);
  const requesting=useRef(false);
  const check=useCallback(async()=>{
    const policy=(document as Document & {permissionsPolicy?:{allowsFeature:(feature:string)=>boolean};featurePolicy?:{allowsFeature:(feature:string)=>boolean}});
    const result=await checkImmersiveVR({secure:window.isSecureContext,xr:navigator.xr,
      spatialTrackingAllowed:(policy.permissionsPolicy??policy.featurePolicy)?.allowsFeature('xr-spatial-tracking')});
    setSupported(result.ready);setMessage(result.message);setCheckCode(result.code);
  },[]);
  useEffect(()=>{
    const refresh=()=>{if(document.visibilityState==='visible')void check();};
    void check();navigator.xr?.addEventListener('devicechange',check);
    window.addEventListener('focus',refresh);document.addEventListener('visibilitychange',refresh);
    setActive(store.getState().session!=null&&store.getState().mode==='immersive-vr');
    const unsubscribe=store.subscribe(s=>setActive(s.session!=null&&s.mode==='immersive-vr'));
    return ()=>{navigator.xr?.removeEventListener('devicechange',check);window.removeEventListener('focus',refresh);document.removeEventListener('visibilitychange',refresh);unsubscribe();void store.getState().session?.end().catch(()=>{});};
  },[store,check]);
  useEffect(()=>{
    if(open&&!dialog.current?.open)dialog.current?.showModal();
    else if(!open&&dialog.current?.open)dialog.current.close();
  },[open]);
  const enter=async()=>{
    if(requesting.current||!supported)return;
    requesting.current=true;
    setPending(true);setFailure('');
    try{
      onBeforeEnter?.();
      await startImmersiveVR(store);
      setOpen(false);
    }catch(error){
      const failure=immersiveVRFailure(error);setFailure(`${failure.name}: ${failure.message}`);
      setMessage(immersiveVRError(error));setOpen(true);
    }finally{requesting.current=false;setPending(false);}
  };
  const exit=async()=>{
    try{await store.getState().session?.end();}
    catch{setMessage('Use the headset system menu to leave VR.');setOpen(true);}
  };
  const entryButton=<button ref={entry} className={className} disabled={pending} onClick={()=>{
      if(active)void exit();else if(supported)void enter();else{setOpen(true);void check();}
    }}>{pending?'Starting VR…':active?'Exit VR':'🥽 Enter VR'}</button>;
  return <>
    {/* The fixed canvas creates a stacking context below the walk gesture layer.
        Portal entry to body so walking and POI cards cannot swallow its clicks. */}
    {className==='capture-vr-entry'?createPortal(<div className="capture-vr-launcher">
      {entryButton}<button className="capture-vr-help" aria-label="VR help and headset status" onClick={()=>{setOpen(true);void check();}}>?</button>
    </div>,document.body):entryButton}
    {createPortal(<dialog ref={dialog} className="capture-vr-dialog" aria-labelledby={titleId} onCancel={()=>setOpen(false)} onClose={()=>{setOpen(false);entry.current?.focus();}}>
      <h2 id={titleId}>{title} in VR</h2>
      <p>Enter the scene with headset tracking and separate views for both eyes. VR uses Ultra detail.</p>
      {tour&&<div className="capture-vr-stops" role="group" aria-label="VR capture">
        {tour.stops.map(stop=><button key={stop.id} aria-pressed={tour.activeId===stop.id} onClick={()=>tour.onSelect(stop.id)}>{stop.title}</button>)}
      </div>}
      <p role="status">{message}</p>
      {failure&&<p role="alert">{failure}</p>}
      <p>{tour?'Left stick: walk. Right stick: snap turn. Y on the left controller: open or hide the menu. Point and press the trigger on an information label to read or listen.':'Left stick: walk. Right stick: snap turn. Use the headset system menu to leave VR.'}</p>
      <p className="capture-vr-note">Open the same site on your headset using HTTPS. This computer’s 127.0.0.1 address is only local to this computer.</p>
      <details className="capture-vr-note"><summary>Headset check details</summary>
        <p>WebXR: {checkCode} · Three.js r{REVISION}<br/>Session: {active?'immersive-vr':'not started'}<br/>VR entry: 2</p>
      </details>
      <div className="capture-vr-actions">
        <button onClick={()=>void check()}>Check headset</button>
        <button disabled={!supported||pending} onClick={()=>void enter()}>{pending?'Starting VR…':'Enter VR'}</button>
        <button onClick={()=>setOpen(false)}>Close</button>
      </div>
    </dialog>,document.body)}
  </>;
}

/** Menu stays in the world. Only opening with Y, switching capture or resetting
 * takes a new pose; ordinary head movement never drags the panel around. */
export function CaptureVRMenu({tour,onReset,resetKey,ambience}:{tour:CaptureVRTour;onReset:()=>void;resetKey:number;ambience:AmbienceControl}) {
  const session=useXR(s=>s.session),panel=useRef<Group>(null);
  const store=useXRStore(),[open,setOpen]=useState(false),[exitFailed,setExitFailed]=useState(false);
  const placement=useRef({pending:true,side:-.95}),pressed=useRef(false);
  const helpers=useMemo(()=>({head:new Vector3(),forward:new Vector3()}),[]);
  const capture=tour.stops.find(s=>s.id===tour.activeId)?.capture;
  const scale=captureVRScale(capture);
  useLayoutEffect(()=>{
    placement.current={pending:true,side:-.95};pressed.current=false;setOpen(false);setExitFailed(false);
    if(panel.current)panel.current.visible=false;
  },[session,capture,resetKey]);
  useFrame(({camera})=>{
    if(!panel.current||!session)return;
    const left=store.getState().inputSourceStates.find(s=>s.type==='controller'&&s.inputSource.handedness==='left');
    const down=left?.type==='controller'&&left.gamepad['y-button']?.state==='pressed';
    if(down&&!pressed.current){if(!open)placement.current={pending:true,side:0};setOpen(!open);}
    pressed.current=down;
    if(!placement.current.pending)return;
    camera.getWorldPosition(helpers.head);camera.getWorldDirection(helpers.forward);
    const pose=worldPanelPose(helpers.head,helpers.forward,scale,placement.current.side);
    panel.current.position.set(...pose.position);panel.current.rotation.set(0,pose.yaw,0);
    panel.current.scale.setScalar(scale);panel.current.visible=true;placement.current.pending=false;
  });
  if(!session)return null;
  const sound=ambience.state==='playing'?'Bird ambience · Mute':ambience.state==='loading'?'Loading birds…':ambience.state==='error'?'Retry bird ambience':'Bird ambience · Off';
  return <group ref={panel} visible={false}>
    {!open?<VRSurface title="Menu · Y" width={.48} onClick={()=>setOpen(true)}/>:<>
      <group position={[0,.40,0]}><VRSurface title="Wat Phnom · Hide menu" onClick={()=>setOpen(false)}/></group>
      {tour.stops.map((stop,i)=><group key={stop.id} position={[0,.23-i*.17,0]}><VRSurface title={stop.title} active={stop.id===tour.activeId} onClick={()=>{tour.onSelect(stop.id);setOpen(false);}}/></group>)}
      <group position={[0,-.11,0]}><VRSurface title={sound} onClick={ambience.toggle}/></group>
      <group position={[0,-.28,0]}><VRSurface title="Reset position" onClick={onReset}/></group>
      <group position={[0,-.45,0]}><VRSurface title={exitFailed?'Use headset menu to exit':'Exit VR'} onClick={()=>{void session.end().catch(()=>setExitFailed(true));}}/></group>
      <group position={[0,-.59,0]}><VRSurface title="Birds: Siem Reap · L. Shyamal · CC0" height={.09}/></group>
    </>}
  </group>;
}
