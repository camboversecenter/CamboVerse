import { useEffect, useLayoutEffect, useRef, type MutableRefObject } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { MathUtils, PerspectiveCamera } from 'three';
import type { CaptureWalkArea } from '../spots';
import type { WalkInput } from './FirstPersonControls';
import { advanceAreaWalk, areaEyePosition } from '../captureAreaWalk';
import { advanceCaptureJump, type CaptureJumpState } from '../captureWalk';
import { advanceCaptureFlight, captureSpacePress, toggleCaptureFlight, type CaptureFlightMode, type CaptureFlightState } from '../captureFlight';

export function CaptureAreaControls({area,input,onFlightChange}:{area:CaptureWalkArea;input:MutableRefObject<WalkInput>;onFlightChange?:(mode:CaptureFlightMode)=>void}) {
  const {camera,gl}=useThree();
  const position=useRef<[number,number]>(area.start);
  const yaw=useRef(area.startYaw),pitch=useRef(area.startPitch);
  const target=useRef({yaw:area.startYaw,pitch:area.startPitch});
  const keys=useRef(new Set<string>()),velocity=useRef({forward:0,side:0});
  const jump=useRef<CaptureJumpState|null>(null);
  const flight=useRef<CaptureFlightState>({mode:'walking',position:areaEyePosition(area)});
  const lastSpace=useRef(-Infinity),reportedMode=useRef<CaptureFlightMode>('walking');
  const report=useRef(onFlightChange);report.current=onFlightChange;
  useLayoutEffect(()=>{
    position.current=[...area.start];yaw.current=target.current.yaw=area.startYaw;
    pitch.current=target.current.pitch=area.startPitch;jump.current=null;
    flight.current={mode:'walking',position:areaEyePosition(area)};reportedMode.current='walking';report.current?.('walking');
    camera.position.set(...areaEyePosition(area));camera.rotation.set(pitch.current,yaw.current,0,'YXZ');
    const oldFov=camera instanceof PerspectiveCamera?camera.fov:null,oldNear=camera.near;
    if(camera instanceof PerspectiveCamera){camera.fov=62;camera.near=.035;camera.updateProjectionMatrix();}
    return ()=>{if(camera instanceof PerspectiveCamera&&oldFov!==null){camera.fov=oldFov;camera.near=oldNear;camera.updateProjectionMatrix();}};
  },[area,camera]);
  useEffect(()=>{
    const movement=new Set(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight']);
    const reset=()=>{keys.current.clear();lastSpace.current=-Infinity;velocity.current={forward:0,side:0};input.current.move={x:0,y:0};input.current.look={dx:0,dy:0};input.current.jump=false;input.current.flyToggle=false;input.current.flyVertical=0;input.current.flyStep=0;};
    reset();
    const down=(e:KeyboardEvent)=>{
      if(e.ctrlKey||e.metaKey||e.altKey){reset();return;}
      if(e.target instanceof HTMLElement&&e.target.closest('input,textarea,select,[contenteditable="true"]'))return;
      if(e.code==='Space'){
        if(e.target instanceof HTMLElement&&e.target.closest('button,a,[role="button"]'))return;
        e.preventDefault();
        const tap=captureSpacePress(lastSpace.current,performance.now(),e.repeat);lastSpace.current=tap.last;
        if(tap.action==='toggle-flight'){input.current.flyToggle=true;input.current.jump=false;}
        else if(tap.action==='jump'&&flight.current.mode==='walking')input.current.jump=true;
        keys.current.add('Space');
      }else if(e.code==='ShiftLeft'||e.code==='ShiftRight'){
        keys.current.add(e.code);
      }else if(movement.has(e.code)){e.preventDefault();keys.current.add(e.code);}
    };
    const up=(e:KeyboardEvent)=>keys.current.delete(e.code);
    const hidden=()=>{if(document.hidden)reset();};
    window.addEventListener('keydown',down);window.addEventListener('keyup',up);window.addEventListener('blur',reset);document.addEventListener('visibilitychange',hidden);
    return ()=>{reset();window.removeEventListener('keydown',down);window.removeEventListener('keyup',up);window.removeEventListener('blur',reset);document.removeEventListener('visibilitychange',hidden);};
  },[input]);
  useFrame((_,delta)=>{
    if(gl.xr.isPresenting)return;
    const dt=Math.min(delta,.05),look=input.current.look;
    target.current.yaw-=look.dx*.0027;
    target.current.pitch=MathUtils.clamp(target.current.pitch-look.dy*.0027,-1.15,.8);look.dx=look.dy=0;
    yaw.current=MathUtils.damp(yaw.current,target.current.yaw,14,dt);pitch.current=MathUtils.damp(pitch.current,target.current.pitch,14,dt);
    const pressed=(a:string,b:string)=>Number(keys.current.has(a)||keys.current.has(b));
    velocity.current.forward=MathUtils.damp(velocity.current.forward,MathUtils.clamp(pressed('KeyW','ArrowUp')-pressed('KeyS','ArrowDown')-input.current.move.y,-1,1),18,dt);
    velocity.current.side=MathUtils.damp(velocity.current.side,MathUtils.clamp(pressed('KeyD','ArrowRight')-pressed('KeyA','ArrowLeft')+input.current.move.x,-1,1),18,dt);
    if(input.current.flyToggle){
      flight.current=toggleCaptureFlight(area,flight.current);input.current.flyToggle=false;input.current.jump=false;jump.current=null;
    }
    if(flight.current.mode!=='walking'){
      const vertical=Number(keys.current.has('Space'))-Number(keys.current.has('ShiftLeft')||keys.current.has('ShiftRight'))+(input.current.flyVertical??0);
      flight.current=advanceCaptureFlight(area,flight.current,{yaw:yaw.current,forward:velocity.current.forward,side:velocity.current.side,vertical,step:input.current.flyStep},dt);
      const [x,y,z]=flight.current.position;position.current=[x,z];camera.position.set(x,y,z);
      if(flight.current.mode==='walking'){jump.current={y,velocity:0,grounded:true};velocity.current={forward:0,side:0};}
    }else{
      position.current=advanceAreaWalk(area,...position.current,yaw.current,velocity.current.forward,velocity.current.side,dt);
      const [x,y,z]=areaEyePosition(area,...position.current);
      jump.current=advanceCaptureJump(jump.current??{y,velocity:0,grounded:true},y,input.current.jump??false,dt);
      camera.position.set(x,jump.current.y,z);flight.current.position=[x,jump.current.y,z];
    }
    input.current.jump=false;input.current.flyStep=0;
    camera.rotation.set(pitch.current,yaw.current,0,'YXZ');
    if(flight.current.mode!==reportedMode.current){reportedMode.current=flight.current.mode;report.current?.(flight.current.mode);}
  });
  return null;
}
