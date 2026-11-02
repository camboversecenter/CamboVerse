import {useEffect,useRef,useState} from 'react';
import {useFrame} from '@react-three/fiber';
import {useXR,useXRStore} from '@react-three/xr';
import {VRCaptureGuide} from './VRCaptureGuide';

/** World-anchored board, opened only on demand. Y and Close both dismiss it. */
export function VRBuildingGuide({locationId,scale=1,onOpenChange}:{locationId:string;scale?:number;onOpenChange:(open:boolean)=>void}){
  const store=useXRStore(),active=useXR(s=>s.session!=null);
  const [open,setOpen]=useState(false),held=useRef(false);
  useEffect(()=>{setOpen(false);held.current=false;},[active,locationId]);
  useEffect(()=>{onOpenChange(open);return()=>onOpenChange(false);},[open,onOpenChange]);
  useFrame(()=>{
    if(!active)return;
    const state=store.getState();
    const left=state.inputSourceStates.find(s=>s.type==='controller'&&s.inputSource.handedness==='left');
    const pressed=left?.type==='controller'&&left.gamepad['y-button']?.state==='pressed';
    if(state.session?.visibilityState==='hidden'||state.session?.visibilityState==='visible-blurred'){held.current=!!pressed;return;}
    if(pressed&&!held.current)setOpen(v=>!v);
    held.current=!!pressed;
  });
  return active&&open?<VRCaptureGuide key={locationId} experience="campus" locationId={locationId} scale={scale} onClose={()=>setOpen(false)}/>:null;
}
