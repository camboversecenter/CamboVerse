import type { CaptureWalkArea } from './spots';

export function areaGroundHeight(area:CaptureWalkArea,x:number,z:number):number {
  return area.ground.height+(x-area.center[0])*area.ground.slopeX+(z-area.center[1])*area.ground.slopeZ;
}

/** Radial collision keeps the clock protected while letting the visitor slide
 * around its edge. Neither looking nor elapsed frame time changes floor height. */
export function constrainAreaPosition(area:CaptureWalkArea,x:number,z:number):[number,number] {
  let dx=x-area.center[0],dz=z-area.center[1];
  let distance=Math.hypot(dx,dz);
  const requestedRadius=distance;
  if(distance<1e-9){dx=area.start[0]-area.center[0];dz=area.start[1]-area.center[1];distance=Math.hypot(dx,dz)||1;}
  const radius=Math.max(area.innerRadius,Math.min(area.outerRadius,requestedRadius));
  return [area.center[0]+dx/distance*radius,area.center[1]+dz/distance*radius];
}

export function areaEyePosition(area:CaptureWalkArea,x=area.start[0],z=area.start[1]):[number,number,number] {
  const [px,pz]=constrainAreaPosition(area,x,z);
  return [px,areaGroundHeight(area,px,pz)+area.eyeHeight,pz];
}

export function advanceAreaWalk(area:CaptureWalkArea,x:number,z:number,yaw:number,forward:number,side:number,delta:number):[number,number] {
  const distance=area.speed*Math.max(0,Math.min(delta,.05))/Math.max(1,Math.hypot(forward,side));
  return constrainAreaPosition(area,
    x+(-Math.sin(yaw)*forward+Math.cos(yaw)*side)*distance,
    z+(-Math.cos(yaw)*forward-Math.sin(yaw)*side)*distance);
}

/** Cheap authored surface under the navigation band, filling missing pavement.
 * It is deliberately outside the protected clock and shared by all tiers. */
export function areaGroundTriangles(area:CaptureWalkArea,segments=96):Float32Array {
  const points:number[]=[];
  const vertex=(angle:number,radius:number)=>{
    const x=area.center[0]+Math.sin(angle)*radius,z=area.center[1]+Math.cos(angle)*radius;
    return [x,areaGroundHeight(area,x,z)-.035,z];
  };
  for(let i=0;i<segments;i++) {
    const a=i/segments*Math.PI*2,b=(i+1)/segments*Math.PI*2;
    const p=vertex(a,area.innerRadius-.28),q=vertex(a,area.outerRadius+.25);
    const r=vertex(b,area.innerRadius-.28),s=vertex(b,area.outerRadius+.25);
    points.push(...p,...r,...q,...q,...r,...s);
  }
  return new Float32Array(points);
}
