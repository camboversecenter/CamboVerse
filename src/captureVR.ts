import type { PoiCapture } from './spots';
import { areaGroundHeight, constrainAreaPosition } from './captureAreaWalk';
import { captureWalkGroundHeight, captureWalkPosition } from './captureWalk';

/** Capture units are visually calibrated, not metres. Scale tracked head and
 * controller offsets together so the headset eye height matches the route. */
export function captureVRScale(capture?:PoiCapture):number {
  return (capture?.walkAround?.eyeHeight ?? capture?.walk?.eyeHeight ?? 1.6)/1.6;
}

/** Foot position on the same authored surface used by browser walking. */
export function captureVRFloor(capture:PoiCapture,x:number,z:number):[number,number,number] {
  if(capture.walkAround){
    const area=capture.walkAround,[px,pz]=constrainAreaPosition(area,x,z);
    return [px,areaGroundHeight(area,px,pz),pz];
  }
  if(capture.walk){
    const path=capture.walk,dx=path.end[0]-path.start[0],dz=path.end[2]-path.start[2];
    const length=Math.hypot(dx,dz)||1;
    const t=Math.max(0,Math.min(1,((x-path.start[0])*dx+(z-path.start[2])*dz)/(length*length)));
    const lateral=(-(x-path.start[0])*dz+(z-path.start[2])*dx)/length;
    const p=captureWalkPosition(path,t,lateral);
    return [p[0],captureWalkGroundHeight(path,t),p[2]];
  }
  return [x,0,z];
}

export function captureVRArrival(capture:PoiCapture):{position:[number,number,number];yaw:number} {
  const area=capture.walkAround,path=capture.walk;
  if(area)return {position:captureVRFloor(capture,...area.start),yaw:area.startYaw};
  if(path)return {position:captureVRFloor(capture,path.start[0],path.start[2]),yaw:path.startYaw??0};
  return {position:[capture.camera[0],0,capture.camera[2]],yaw:Math.atan2(capture.camera[0]-capture.target[0],capture.camera[2]-capture.target[2])};
}

/** Snap turns consume a stick press; turning after releasing movement must
 * never reuse an earlier frame's walking velocity. Head pitch is excluded. */
export function captureVRInputStep(side:number,forward:number,turn:number,yaw:number,speed:number,delta:number,canTurn:boolean) {
  const angle=Math.abs(turn)>.5&&canTurn?(turn>0?-1:1)*Math.PI/6:0;
  const ready=Math.abs(turn)<.5?true:angle!==0?false:canTurn;
  const x=Math.abs(side)>.15?side:0,z=Math.abs(forward)>.15?forward:0;
  const distance=speed*Math.max(0,Math.min(delta,.05))/Math.max(1,Math.hypot(x,z));
  return {dx:(Math.cos(yaw+angle)*x-Math.sin(yaw+angle)*z)*distance,
    dz:(-Math.sin(yaw+angle)*x-Math.cos(yaw+angle)*z)*distance,angle,canTurn:ready};
}
