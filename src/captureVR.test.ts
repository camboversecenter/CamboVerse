import { describe,expect,it } from 'vitest';
import { SPOTS } from './spots';
import { captureVRArrival,captureVRFloor,captureVRScale,captureVRInputStep } from './captureVR';
import { areaGroundHeight } from './captureAreaWalk';
import { captureWalkGroundHeight,captureWalkPosition } from './captureWalk';

const stops=SPOTS.find(s=>s.id==='wat-phnom')!.pois!;
const stair=stops.find(p=>p.id==='naga-staircase')!.capture!;
const clock=stops.find(p=>p.id==='flower-clock')!.capture!;

describe('Wat Phnom VR navigation',()=>{
  it('moves in the head heading and snaps without carrying stale walking velocity',()=>{
    const walk=captureVRInputStep(0,1,0,0,1.4,1/60,true);
    expect(walk.dx).toBe(0);expect(walk.dz).toBeCloseTo(-1.4/60);
    const turn=captureVRInputStep(0,0,1,0,1.4,1/60,true);
    expect(turn.angle).toBeCloseTo(-Math.PI/6);expect(turn.canTurn).toBe(false);
    expect(turn.dx).toBe(0);expect(Math.abs(turn.dz)).toBe(0);
    expect(captureVRInputStep(0,0,1,0,1.4,1/60,turn.canTurn).angle).toBe(0);
    const release=captureVRInputStep(0,0,0,0,1.4,1/60,turn.canTurn);
    expect(release.canTurn).toBe(true);
    expect(captureVRInputStep(0,0,-1,0,1.4,1/60,release.canTurn).angle).toBeCloseTo(Math.PI/6);
    const diagonal=captureVRInputStep(1,1,0,Math.PI/2,1.4,100,true);
    expect(Math.hypot(diagonal.dx,diagonal.dz)).toBeCloseTo(1.4*.05);
    const noise=captureVRInputStep(.05,.05,.05,0,1.4,1/60,true);
    expect(noise.dx).toBe(0);expect(Math.abs(noise.dz)).toBe(0);expect(noise.angle).toBe(0);
  });
  it('starts both captures on their own ground and scales tracked eye height to capture units',()=>{
    for(const capture of [stair,clock]){
      const arrival=captureVRArrival(capture);
      const eyeHeight=capture.walk?.eyeHeight??capture.walkAround!.eyeHeight;
      expect(captureVRScale(capture)*1.6).toBeCloseTo(eyeHeight!);
      expect(captureVRFloor(capture,arrival.position[0],arrival.position[2])).toEqual(arrival.position);
      expect(arrival.yaw).toBe(0);
    }
    expect(captureVRArrival(stair).position).toEqual([0,.85,.5]);
    expect(captureVRArrival(clock).position[1]).toBeCloseTo(areaGroundHeight(clock.walkAround!,...clock.walkAround!.start));
  });
  it('follows the stair height profile and clips head/controller movement to the supported strip',()=>{
    const path=stair.walk!;
    for(let i=0;i<=60;i++){
      const t=i/60,p=captureWalkPosition(path,t);
      const ground=captureVRFloor(stair,p[0],p[2]);
      expect(ground[1]).toBeCloseTo(captureWalkGroundHeight(path,t));
    }
    const far=captureVRFloor(stair,100,-100);
    expect(far[0]).toBeCloseTo(path.lateralLimit!);expect(far[2]).toBe(path.end[2]);
    expect(far[1]).toBeCloseTo(captureWalkGroundHeight(path,1));
    const start=captureVRFloor(stair,-100,100);
    expect(start[0]).toBeCloseTo(-path.lateralLimit!);expect(start[2]).toBe(path.start[2]);
  });
  it('protects the clock for every approach, including room-scale headset offsets',()=>{
    const area=clock.walkAround!;
    for(let i=0;i<100;i++){
      const angle=i/100*Math.PI*2;
      for(const r of [0,1,area.innerRadius,8,area.outerRadius,100]){
        const p=captureVRFloor(clock,area.center[0]+Math.sin(angle)*r,area.center[1]+Math.cos(angle)*r);
        const radius=Math.hypot(p[0]-area.center[0],p[2]-area.center[1]);
        expect(radius).toBeGreaterThanOrEqual(area.innerRadius-1e-8);
        expect(radius).toBeLessThanOrEqual(area.outerRadius+1e-8);
        expect(p[1]).toBeCloseTo(areaGroundHeight(area,p[0],p[2]));
      }
    }
  });
});
