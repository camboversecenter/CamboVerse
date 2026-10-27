import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { createXRStore, useXR } from '@react-three/xr';
import { CanvasTexture, Group, Quaternion, SRGBColorSpace, Vector3 } from 'three';
import type { Poi } from '../spots';
import { captureVRScale } from '../captureVR';
import './CaptureVR.css';

export interface CaptureVRTour {
  title:string;
  stops:Poi[];
  activeId?:string;
  onSelect:(id:string)=>void;
}

/** Entry stays discoverable on desktop; unsupported devices get instructions,
 * never a fake headset session or a hidden button. Session starts on a click. */
export function CaptureVREntry({store,tour}:{store:ReturnType<typeof createXRStore>;tour:CaptureVRTour}) {
  const [open,setOpen]=useState(false),[supported,setSupported]=useState(false);
  const [active,setActive]=useState(false),[pending,setPending]=useState(false);
  const [message,setMessage]=useState('Checking headset support…');
  const dialog=useRef<HTMLDialogElement>(null),entry=useRef<HTMLButtonElement>(null);
  const check=async()=>{
    if(!window.isSecureContext){setSupported(false);setMessage('Open this site over HTTPS in your headset browser. A plain HTTP address on your Wi-Fi network cannot start VR.');return;}
    try{
      const available=await navigator.xr?.isSessionSupported('immersive-vr')??false;
      setSupported(available);
      setMessage(available?'Headset ready. Choose a capture, then enter VR.':'No VR headset detected here. Open this site in a WebXR headset browser, or connect a PC VR headset and check again.');
    }catch{setSupported(false);setMessage('Could not check the headset. Check your connection and try again.');}
  };
  useEffect(()=>{
    void check();navigator.xr?.addEventListener('devicechange',check);
    const unsubscribe=store.subscribe(s=>setActive(s.session!=null));
    return ()=>{navigator.xr?.removeEventListener('devicechange',check);unsubscribe();void store.getState().session?.end().catch(()=>{});};
  },[store]);
  useEffect(()=>{
    if(open&&!dialog.current?.open)dialog.current?.showModal();
    else if(!open&&dialog.current?.open)dialog.current.close();
  },[open]);
  const enter=async()=>{
    if(pending||!supported)return;
    setPending(true);
    try{
      const session=await store.enterVR();
      if(session)setOpen(false);
      else setMessage('VR did not start. Check your headset and try again.');
    }catch(error){
      setMessage(error instanceof Error&&error.name==='NotAllowedError'?'VR permission was declined. You can try again.':'VR could not start. Check your headset connection and try again.');
    }finally{setPending(false);}
  };
  const exit=async()=>{
    try{await store.getState().session?.end();}
    catch{setMessage('Use the headset system menu to leave VR.');setOpen(true);}
  };
  return <>
    <button ref={entry} className="capture-vr-entry" onClick={()=>{if(active)void exit();else{setOpen(true);void check();}}}>{active?'Exit VR':'🥽 VR tour'}</button>
    <dialog ref={dialog} className="capture-vr-dialog" aria-labelledby="capture-vr-title" onCancel={()=>setOpen(false)} onClose={()=>{setOpen(false);entry.current?.focus();}}>
      <h2 id="capture-vr-title">{tour.title} in VR</h2>
      <p>Visit the real captures at eye level. VR uses Ultra detail.</p>
      <div className="capture-vr-stops" role="group" aria-label="VR capture">
        {tour.stops.map(stop=><button key={stop.id} aria-pressed={tour.activeId===stop.id} onClick={()=>tour.onSelect(stop.id)}>{stop.title}</button>)}
      </div>
      <p role="status">{message}</p>
      <p>Left stick: walk. Right stick: snap turn. Point and press the trigger to choose a capture, reset your position, or exit.</p>
      <p className="capture-vr-note">Open the same site on your headset using HTTPS. This computer’s 127.0.0.1 address is only local to this computer.</p>
      <div className="capture-vr-actions">
        <button onClick={()=>void check()}>Check headset</button>
        <button disabled={!supported||pending||!tour.activeId} onClick={()=>void enter()}>{pending?'Starting VR…':'Enter VR'}</button>
        <button onClick={()=>setOpen(false)}>Close</button>
      </div>
    </dialog>
  </>;
}

function VRButton({label,onClick,active=false}:{label:string;onClick?:()=>void;active?:boolean}) {
  const texture=useMemo(()=>{
    const canvas=document.createElement('canvas');canvas.width=640;canvas.height=96;
    const ctx=canvas.getContext('2d')!;
    ctx.fillStyle=active?'#426137':'#163b33';ctx.fillRect(0,0,640,96);
    ctx.strokeStyle='#c1d2a4';ctx.lineWidth=4;ctx.strokeRect(2,2,636,92);
    ctx.fillStyle='#fff8df';ctx.font='600 32px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(label,320,48,600);
    const map=new CanvasTexture(canvas);map.colorSpace=SRGBColorSpace;return map;
  },[label,active]);
  useEffect(()=>()=>texture.dispose(),[texture]);
  return <mesh renderOrder={1000} onClick={onClick?e=>{e.stopPropagation();onClick();}:undefined}>
    <planeGeometry args={[.72,.108]}/><meshBasicMaterial map={texture} depthTest={false} depthWrite={false} toneMapped={false}/>
  </mesh>;
}

/** Real scene geometry, visible to both eyes and selectable by controller ray.
 * The compact panel follows the head below/left of the main view. */
export function CaptureVRMenu({tour,onReset}:{tour:CaptureVRTour;onReset:()=>void}) {
  const session=useXR(s=>s.session),panel=useRef<Group>(null);
  const [exitFailed,setExitFailed]=useState(false);
  const helpers=useMemo(()=>({head:new Vector3(),offset:new Vector3(),rotation:new Quaternion()}),[]);
  const capture=tour.stops.find(s=>s.id===tour.activeId)?.capture;
  const scale=captureVRScale(capture);
  useFrame(({camera})=>{
    if(!panel.current||!session)return;
    camera.getWorldPosition(helpers.head);camera.getWorldQuaternion(helpers.rotation);
    helpers.offset.set(-.48,-.35,-1.4).multiplyScalar(scale).applyQuaternion(helpers.rotation);
    panel.current.position.copy(helpers.head).add(helpers.offset);panel.current.quaternion.copy(helpers.rotation);
    panel.current.scale.setScalar(scale);
  });
  if(!session)return null;
  return <group ref={panel}>
    <group position={[0,.24,0]}><VRButton label="Wat Phnom · VR captures"/></group>
    {tour.stops.map((stop,i)=><group key={stop.id} position={[0,.10-i*.125,0]}><VRButton label={stop.title} active={stop.id===tour.activeId} onClick={()=>tour.onSelect(stop.id)}/></group>)}
    <group position={[0,-.17,0]}><VRButton label="Reset position" onClick={onReset}/></group>
    <group position={[0,-.295,0]}><VRButton label={exitFailed?'Use headset menu to exit':'Exit VR'} onClick={()=>{void session.end().catch(()=>setExitFailed(true));}}/></group>
  </group>;
}
