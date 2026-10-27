import { describe, expect, it } from 'vitest';
import { SPOTS } from './spots';
import { advanceAreaWalk, areaEyePosition, areaGroundHeight, areaGroundTriangles, constrainAreaPosition } from './captureAreaWalk';
import { captureWalkLook } from './captureWalk';

const capture=SPOTS.find(s=>s.id==='wat-phnom')!.pois!.find(p=>p.id==='flower-clock')!.capture!;
const area=capture.walkAround!;
const radius=(p:[number,number])=>Math.hypot(p[0]-area.center[0],p[1]-area.center[1]);

describe('walking around the flower clock',()=>{
  it('starts outside the protected clock at the authored eye height',()=>{
    const p=areaEyePosition(area);
    expect(radius([p[0],p[2]])).toBeGreaterThan(area.innerRadius);
    expect(p[1]-areaGroundHeight(area,p[0],p[2])).toBeCloseTo(area.eyeHeight);
    expect(capture.normal).not.toContain('staircase');
  });
  it('blocks entering the clock and walking out into missing space',()=>{
    let p:[number,number]=[...area.start];
    for(let i=0;i<3000;i++)p=advanceAreaWalk(area,...p,0,1,0,1/60);
    expect(radius(p)).toBeCloseTo(area.innerRadius);
    for(let i=0;i<3000;i++)p=advanceAreaWalk(area,...p,0,-1,0,1/60);
    expect(radius(p)).toBeCloseTo(area.outerRadius);
    expect(radius(constrainAreaPosition(area,...area.center))).toBeCloseTo(area.innerRadius);
  });
  it('can circle the entire clock with camera-relative movement and slide at its edge',()=>{
    let p:[number,number]=[...area.start],rotation=0,previous=Math.atan2(p[0]-area.center[0],p[1]-area.center[1]);
    for(let i=0;i<2400;i++){
      const angle=Math.atan2(p[0]-area.center[0],p[1]-area.center[1]);
      p=advanceAreaWalk(area,...p,angle,0,1,1/60);
      const next=Math.atan2(p[0]-area.center[0],p[1]-area.center[1]);
      rotation+=Math.atan2(Math.sin(next-previous),Math.cos(next-previous));previous=next;
      expect(radius(p)).toBeGreaterThanOrEqual(area.innerRadius-1e-9);
      expect(radius(p)).toBeLessThanOrEqual(area.outerRadius+1e-9);
    }
    expect(rotation).toBeGreaterThan(Math.PI*2);
    const edge:[number,number]=[area.center[0],area.center[1]+area.innerRadius];
    const slid=advanceAreaWalk(area,...edge,0,1,1,.05);
    expect(slid[0]).toBeGreaterThan(edge[0]);expect(radius(slid)).toBeCloseTo(area.innerRadius);
  });
  it('grounds every heading, normalizes diagonal speed and caps stalled frame movement',()=>{
    const p=area.start,eye=areaEyePosition(area,...p);
    for(const yaw of [-10*Math.PI,0,Math.PI,10*Math.PI]){
      expect(captureWalkLook(yaw,0).yaw).toBe(yaw);
      expect(areaEyePosition(area,...p)[1]).toBe(eye[1]);
    }
    const diagonal=advanceAreaWalk(area,...p,0,1,1,.01);
    expect(Math.hypot(diagonal[0]-p[0],diagonal[1]-p[1])).toBeCloseTo(area.speed*.01);
    expect(advanceAreaWalk(area,...p,0,1,0,100)).toEqual(advanceAreaWalk(area,...p,0,1,0,.05));
  });
  it('keeps the lightweight ground surface outside the clock and on the floor plane',()=>{
    const data=areaGroundTriangles(area);
    expect(data.length/9).toBe(192);
    for(let i=0;i<data.length;i+=3){
      expect(radius([data[i],data[i+2]])).toBeGreaterThan(area.innerRadius-.29);
      expect(data[i+1]).toBeCloseTo(areaGroundHeight(area,data[i],data[i+2])-.035,5);
    }
  });
});
