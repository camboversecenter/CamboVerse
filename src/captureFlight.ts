import type { CaptureWalkArea } from './spots';
import { areaEyePosition, areaGroundHeight } from './captureAreaWalk';

export type CaptureFlightMode = 'walking'|'flying'|'landing';
export type CaptureFlightState = {mode:CaptureFlightMode;position:[number,number,number]};

/** The first press jumps immediately. A second distinct press toggles flight;
 * held-key repeat never counts as another tap. Consume pairs, not triples. */
export function captureSpacePress(previous:number,now:number,repeat=false):{last:number;action:'none'|'jump'|'toggle-flight'} {
  if(repeat)return {last:previous,action:'none'};
  if(now>=previous&&now-previous<=350)return {last:-Infinity,action:'toggle-flight'};
  return {last:now,action:'jump'};
}

export function toggleCaptureFlight(area:CaptureWalkArea,state:CaptureFlightState):CaptureFlightState {
  if(state.mode==='flying')return {...state,mode:'landing'};
  const [x,y,z]=state.position;
  return {mode:'flying',position:[x,Math.max(y,areaGroundHeight(area,x,z)+area.eyeHeight+.65),z]};
}

export function advanceCaptureFlight(area:CaptureWalkArea,state:CaptureFlightState,
  input:{yaw:number;forward:number;side:number;vertical:number;step?:number},delta:number):CaptureFlightState {
  if(state.mode==='walking')return state;
  const dt=Math.max(0,Math.min(delta,.05));
  let [x,y,z]=state.position;
  if(state.mode==='landing'){
    const target=areaEyePosition(area,x,z);
    const blend=1-Math.exp(-7*dt);
    x+=(target[0]-x)*blend;y+=(target[1]-y)*blend;z+=(target[2]-z)*blend;
    if(Math.hypot(x-target[0],y-target[1],z-target[2])<.015)return {mode:'walking',position:target};
    return {mode:'landing',position:[x,y,z]};
  }
  const distance=area.speed*dt/Math.max(1,Math.hypot(input.forward,input.side));
  x+=(-Math.sin(input.yaw)*input.forward+Math.cos(input.yaw)*input.side)*distance;
  z+=(-Math.cos(input.yaw)*input.forward-Math.sin(input.yaw)*input.side)*distance;
  const dx=x-area.center[0],dz=z-area.center[1],radius=Math.hypot(dx,dz);
  // Flying may pass above the clock, but stays within the captured area.
  if(radius>area.outerRadius){x=area.center[0]+dx/radius*area.outerRadius;z=area.center[1]+dz/radius*area.outerRadius;}
  const eye=areaGroundHeight(area,x,z)+area.eyeHeight;
  y=Math.max(eye+.45,Math.min(eye+12,y+Math.max(-1,Math.min(1,input.vertical))*2.6*dt+(input.step??0)));
  return {mode:'flying',position:[x,y,z]};
}
