import {useEffect, useState} from 'react';
import {createPortal} from 'react-dom';
import type {createXRStore} from '@react-three/xr';
import './LabVRSimulator.css';

type Store = ReturnType<typeof createXRStore>;
type Hand = 'left' | 'right';

/** Local-only controls send input to the actual IWER WebXR emulator. */
export function LabVRSimulator({store, error}: {store: Store; error?: string}) {
  const [device,setDevice]=useState(()=>store.getState().emulator);
  const [session,setSession]=useState(()=>!!store.getState().session);
  const [open,setOpen]=useState(true);
  useEffect(()=>store.subscribe(s=>{setDevice(s.emulator);setSession(!!s.session);}),[store]);
  useEffect(()=>{
    if(!device)return;
    const clear=()=>{
      for(const side of ['left','right'] as const){
        const controller=device.controllers[side];
        if(!controller)continue;
        for(const id of ['trigger','squeeze',...(side==='left'?['x-button','y-button']:['a-button','b-button'])]) controller.updateButtonValue(id,0);
        controller.updateAxes('thumbstick',0,0);
      }
    };
    window.addEventListener('blur',clear);
    document.addEventListener('visibilitychange',clear);
    return ()=>{clear();window.removeEventListener('blur',clear);document.removeEventListener('visibilitychange',clear);};
  },[device,session]);
  const button=(side:Hand,id:string,label:string)=>{
    const set=(value:number)=>device?.controllers[side]?.updateButtonValue(id,value);
    return <button type="button" key={id} disabled={!device||!session} onPointerDown={e=>{e.currentTarget.setPointerCapture(e.pointerId);set(1);}}
      onPointerUp={()=>set(0)} onPointerCancel={()=>set(0)} onLostPointerCapture={()=>set(0)} onBlur={()=>set(0)}
      onKeyDown={e=>{if(e.key===' '||e.key==='Enter'){e.preventDefault();set(1);}}} onKeyUp={e=>{if(e.key===' '||e.key==='Enter'){e.preventDefault();set(0);}}}>{label}</button>;
  };
  const stick=(side:Hand,x:number,y:number,label:string)=>{
    const set=(active:boolean)=>device?.controllers[side]?.updateAxes('thumbstick',active?x:0,active?y:0);
    return <button type="button" key={label} disabled={!device||!session} onPointerDown={e=>{e.currentTarget.setPointerCapture(e.pointerId);set(true);}}
      onPointerUp={()=>set(false)} onPointerCancel={()=>set(false)} onLostPointerCapture={()=>set(false)} onBlur={()=>set(false)}
      onKeyDown={e=>{if(e.key===' '||e.key==='Enter'){e.preventDefault();set(true);}}} onKeyUp={e=>{if(e.key===' '||e.key==='Enter'){e.preventDefault();set(false);}}}>{label}</button>;
  };
  return createPortal(<aside className="lab-vr-simulator" aria-label="PC VR simulator controls">
    <button type="button" className="lab-vr-simulator-toggle" onClick={()=>setOpen(v=>!v)} aria-expanded={open}>🥽 PC VR test {open?'−':'+'}</button>
    {open&&<div className="lab-vr-simulator-body">
      <strong>Quest controller simulator</strong>
      <p role="status">{error ? `Simulator could not start. Reload to retry. ${error}` : !device?'Waiting for the local simulator.':session?'Simulator active · hold controls to press':'Simulator ready · select Enter VR in the room.'}</p>
      <p>Use the emulator’s headset/controller tools to look and aim. Hold the buttons below to send controller input.</p>
      <div className="lab-vr-simulator-hands">
        <section><b>Left controller</b><div>{stick('left',0,-1,'↑')}{stick('left',-1,0,'←')}{stick('left',1,0,'→')}{stick('left',0,1,'↓')}</div><div>{button('left','trigger','Trigger')}{button('left','squeeze','Grip')}{button('left','y-button','Y · Menu')}{button('left','x-button','X')}</div></section>
        <section><b>Right controller</b><div>{stick('right',-1,0,'Turn ←')}{stick('right',1,0,'Turn →')}</div><div>{button('right','trigger','Trigger')}{button('right','squeeze','Grip')}{button('right','a-button','A · Jump')}{button('right','b-button','B · Fly')}</div></section>
      </div>
      <small>PC simulation only. Headset tracking and comfort require a real Quest test.</small>
    </div>}
  </aside>,document.body);
}
