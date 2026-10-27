import { describe, expect, it } from 'vitest';
import { SPOTS } from './spots';
import { advanceCaptureFlight, captureSpacePress, toggleCaptureFlight, type CaptureFlightState } from './captureFlight';
import { areaEyePosition, areaGroundHeight } from './captureAreaWalk';
import {captureWalkPosition,projectCaptureWalk} from './captureWalk';
const area=SPOTS.find(s=>s.id==='wat-phnom')!.pois!.find(p=>p.id==='flower-clock')!.capture!.walkAround!;
const idle={yaw:0,forward:0,side:0,vertical:0};
const path=SPOTS.find(s=>s.id==='wat-phnom')!.pois!.find(p=>p.id==='naga-staircase')!.capture!.walk!;

describe('Naga staircase flight',()=>{
  it('takes off at the stair scale, hovers and rises only on request',()=>{
    let state=toggleCaptureFlight(path,{mode:'walking',position:captureWalkPosition(path,.5)});
    const height=state.position[1];
    expect(height-captureWalkPosition(path,.5)[1]).toBeCloseTo(.65*(path.eyeHeight??.3)/1.2);
    for(let i=0;i<100;i++)state=advanceCaptureFlight(path,state,idle,1/60);
    expect(state.position[1]).toBe(height);
    state=advanceCaptureFlight(path,state,{...idle,vertical:1},.05);
    expect(state.position[1]).toBeGreaterThan(height);
  });
  it('lands outside the route back onto the stairs at the correct eye height',()=>{
    let state:CaptureFlightState={mode:'flying',position:[2,4,-1]};
    const target=projectCaptureWalk(path,2,-1);
    state=toggleCaptureFlight(path,state);
    for(let i=0;i<240;i++)state=advanceCaptureFlight(path,state,idle,1/60);
    expect(state.mode).toBe('walking');
    expect(state.position).toEqual(target.position);
    expect(Math.abs(target.lateral)).toBeLessThanOrEqual(path.lateralLimit!);
  });
});

describe('explicit clock flight and Space gestures',()=>{
  it('jumps on one press and toggles only on a quick distinct second press',()=>{
    const first=captureSpacePress(-Infinity,100);expect(first.action).toBe('jump');
    expect(captureSpacePress(first.last,220,true)).toEqual({last:100,action:'none'});
    const second=captureSpacePress(first.last,300);expect(second.action).toBe('toggle-flight');
    expect(captureSpacePress(second.last,400).action).toBe('jump');
    expect(captureSpacePress(first.last,500).action).toBe('jump');
  });
  it('hovers without gaining altitude from horizontal movement, then rises/descends on request',()=>{
    let state=toggleCaptureFlight(area,{mode:'walking',position:areaEyePosition(area)});
    const height=state.position[1];
    for(let i=0;i<100;i++)state=advanceCaptureFlight(area,state,idle,1/60);
    expect(state.position[1]).toBe(height);
    state=advanceCaptureFlight(area,state,{...idle,vertical:1},.05);expect(state.position[1]).toBeGreaterThan(height);
    state=advanceCaptureFlight(area,state,{...idle,vertical:-1},.05);expect(state.position[1]).toBeCloseTo(height);
  });
  it('may fly above the clock but lands on the outside path instead of its face',()=>{
    let state:CaptureFlightState={mode:'flying',position:[area.center[0],4,area.center[1]]};
    const hovered=advanceCaptureFlight(area,state,idle,.05);expect(hovered.position[0]).toBe(area.center[0]);
    state=toggleCaptureFlight(area,state);expect(state.mode).toBe('landing');
    for(let i=0;i<180;i++)state=advanceCaptureFlight(area,state,idle,1/60);
    expect(state.mode).toBe('walking');
    const [x,y,z]=state.position;
    expect(Math.hypot(x-area.center[0],z-area.center[1])).toBeCloseTo(area.innerRadius);
    expect(y).toBeCloseTo(areaGroundHeight(area,x,z)+area.eyeHeight);
  });
  it('keeps flight within the capture and altitude limits and can take off again during landing',()=>{
    let state:CaptureFlightState=toggleCaptureFlight(area,{mode:'walking',position:areaEyePosition(area)});
    for(let i=0;i<1000;i++)state=advanceCaptureFlight(area,state,{...idle,forward:-1,vertical:1},1/60);
    const [x,y,z]=state.position;
    expect(Math.hypot(x-area.center[0],z-area.center[1])).toBeLessThanOrEqual(area.outerRadius+1e-8);
    expect(y).toBeCloseTo(areaGroundHeight(area,x,z)+area.eyeHeight+12);
    state=toggleCaptureFlight(area,state);state=toggleCaptureFlight(area,state);expect(state.mode).toBe('flying');
    for(let i=0;i<1000;i++)state=advanceCaptureFlight(area,state,{...idle,vertical:-1},1/60);
    expect(state.position[1]).toBeCloseTo(areaGroundHeight(area,state.position[0],state.position[2])+area.eyeHeight+.45);
  });
});
