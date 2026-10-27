import type { CaptureWalkArea,CaptureWalkPath } from './spots';
import { areaEyePosition, areaGroundHeight } from './captureAreaWalk';
import { projectCaptureWalk } from './captureWalk';

export type CaptureFlightMode = 'walking'|'flying'|'landing';
export type CaptureFlightState = {mode:CaptureFlightMode;position:[number,number,number]};
type FlightSurface=CaptureWalkArea|CaptureWalkPath;
const landing=(surface:FlightSurface,x:number,z:number):[number,number,number]=>'center' in surface?areaEyePosition(surface,x,z):projectCaptureWalk(surface,x,z).position;

/** The first press jumps immediately. A second distinct press toggles flight;
 * held-key repeat never counts as another tap. Consume pairs, not triples. */
export function captureSpacePress(previous:number,now:number,repeat=false):{last:number;action:'none'|'jump'|'toggle-flight'} {
  if(repeat)return {last:previous,action:'none'};
  if(now>=previous&&now-previous<=350)return {last:-Infinity,action:'toggle-flight'};
  return {last:now,action:'jump'};
}

export function toggleCaptureFlight(area:FlightSurface,state:CaptureFlightState):CaptureFlightState {
  if(state.mode==='flying')return {...state,mode:'landing'};
  const [x,y,z]=state.position;
  const scale='center' in area?1:(area.eyeHeight??.3)/1.2;
  return {mode:'flying',position:[x,Math.max(y,landing(area,x,z)[1]+.65*scale),z]};
}

export function advanceCaptureFlight(area:FlightSurface,state:CaptureFlightState,
  input:{yaw:number;forward:number;side:number;vertical:number;step?:number},delta:number):CaptureFlightState {
  if(state.mode==='walking')return state;
  const dt=Math.max(0,Math.min(delta,.05));
  let [x,y,z]=state.position;
  if(state.mode==='landing'){
    const target=landing(area,x,z);
    const blend=1-Math.exp(-7*dt);
    x+=(target[0]-x)*blend;y+=(target[1]-y)*blend;z+=(target[2]-z)*blend;
    if(Math.hypot(x-target[0],y-target[1],z-target[2])<.015)return {mode:'walking',position:target};
    return {mode:'landing',position:[x,y,z]};
  }
  const scale='center' in area?1:(area.eyeHeight??.3)/1.2;
  const distance=('center' in area?area.speed:.65)*dt/Math.max(1,Math.hypot(input.forward,input.side));
  x+=(-Math.sin(input.yaw)*input.forward+Math.cos(input.yaw)*input.side)*distance;
  z+=(-Math.cos(input.yaw)*input.forward-Math.sin(input.yaw)*input.side)*distance;
  if('center' in area){
    const dx=x-area.center[0],dz=z-area.center[1],radius=Math.hypot(dx,dz);
    if(radius>area.outerRadius){x=area.center[0]+dx/radius*area.outerRadius;z=area.center[1]+dz/radius*area.outerRadius;}
  }else{
    const dx=area.end[0]-area.start[0],dz=area.end[2]-area.start[2],length=Math.hypot(dx,dz)||1;
    const t=Math.max(-.5/length,Math.min(1+.5/length,((x-area.start[0])*dx+(z-area.start[2])*dz)/(length*length)));
    const limit=(area.lateralLimit??.18)+.75;
    const side=Math.max(-limit,Math.min(limit,(-(x-area.start[0])*dz+(z-area.start[2])*dx)/length));
    x=area.start[0]+dx*t-dz/length*side;z=area.start[2]+dz*t+dx/length*side;
  }
  const eye='center' in area?areaGroundHeight(area,x,z)+area.eyeHeight:landing(area,x,z)[1];
  y=Math.max(eye+.45*scale,Math.min(eye+12*scale,y+Math.max(-1,Math.min(1,input.vertical))*2.6*scale*dt+(input.step??0)*scale));
  return {mode:'flying',position:[x,y,z]};
}
