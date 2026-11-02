// @vitest-environment jsdom
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {act,createElement,Fragment} from 'react';
import {createRoot,type Root} from 'react-dom/client';
import {Group,PerspectiveCamera} from 'three';
import {VRRig} from './VRRig';
import {VRBuildingGuide} from './VRBuildingGuide';
import {campusEntranceSpawn,bboxOf} from '../campusLayout';
import {RUN_MULTIPLIER} from '../buildingMovement';
const mock=vi.hoisted(()=>({frames:new Set<(s:unknown,dt:number)=>void>(),origin:null as unknown,sources:[] as unknown[],session:{visibilityState:'visible'}}));
vi.mock('@react-three/fiber',async()=>{const React=await import('react');return {useFrame:(f:(s:unknown,dt:number)=>void)=>{React.useEffect(()=>{mock.frames.add(f);return()=>{mock.frames.delete(f);};},[f]);}};});
vi.mock('./VRCaptureGuide',()=>({VRCaptureGuide:({onClose}:{onClose:()=>void})=>createElement('button',{onClick:onClose},'Close guide')}));
vi.mock('@react-three/xr',async()=>{const React=await import('react');return {
  XROrigin:React.forwardRef((_,ref)=>{React.useImperativeHandle(ref,()=>mock.origin);return null;}),
  useXR:()=>true,useXRControllerLocomotion:()=>{},useXRStore:()=>({getState:()=>({inputSourceStates:mock.sources,session:mock.session})}),
};});
let root:Root,host:HTMLDivElement,origin:Group,camera:PerspectiveCamera;
let stick:{xAxis:number;yAxis:number},grip:{state:string},jump:{state:string},fly:{state:string},down:{state:string},guide:{state:string},turn:{xAxis:number};
const tick=()=>{for(const frame of mock.frames)frame({camera},1/60);};
beforeEach(async()=>{
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true);origin=new Group();mock.origin=origin;camera=new PerspectiveCamera();camera.position.y=1.6;origin.add(camera);
  stick={xAxis:0,yAxis:-1};grip={state:'default'};jump={state:'default'};fly={state:'default'};down={state:'default'};guide={state:'default'};turn={xAxis:0};mock.session.visibilityState='visible';
  mock.sources=[{type:'controller',inputSource:{handedness:'left'},gamepad:{'xr-standard-thumbstick':stick,'xr-standard-squeeze':grip,'x-button':down,'y-button':guide}},{type:'controller',inputSource:{handedness:'right'},gamepad:{'a-button':jump,'b-button':fly,'xr-standard-thumbstick':turn}}];
  host=document.createElement('div');document.body.append(host);root=createRoot(host);
  await act(async()=>root.render(createElement(VRRig,{position:[0,0,0],buildingMovement:true})));
});
afterEach(async()=>{await act(async()=>root.unmount());host.remove();vi.unstubAllGlobals();});
describe('Buildings Quest controller mapping',()=>{
  it('flies with B/A/X, keeps its height, and lands smoothly without held-button bouncing',()=>{
    stick.yAxis=0;fly.state='pressed';tick();jump.state='pressed';
    for(let i=0;i<60;i++)tick();expect(origin.position.y).toBeCloseTo(2);
    jump.state='default';fly.state='default';tick();const height=origin.position.y;
    for(let i=0;i<30;i++)tick();expect(origin.position.y).toBeCloseTo(height);
    down.state='pressed';for(let i=0;i<15;i++)tick();expect(origin.position.y).toBeCloseTo(height-.5);
    down.state='default';fly.state='pressed';tick();expect(origin.position.y).toBeGreaterThan(0);
    for(let i=0;i<180;i++)tick();expect(origin.position.y).toBe(0);
    expect(camera.position.y).toBe(1.6);
  });
  it('keeps walking, turning, flying and selecting the board while Y guide is open',async()=>{
    await act(async()=>root.render(createElement(Fragment,null,createElement(VRRig,{position:[0,0,0],buildingMovement:true}),createElement(VRBuildingGuide,{locationId:'hall'}))));
    tick();const before=origin.position.z;
    await act(async()=>{guide.state='pressed';tick();});expect(host.textContent).toContain('Close guide');
    const openPosition=origin.position.z;expect(openPosition).toBeLessThan(before);
    guide.state='default';tick();expect(origin.position.z).toBeLessThan(openPosition);
    turn.xAxis=1;tick();expect(origin.rotation.y).toBeCloseTo(-Math.PI/6);
    turn.xAxis=0;fly.state='pressed';jump.state='pressed';tick();expect(origin.position.y).toBeGreaterThan(0);
    await act(async()=>host.querySelector('button')!.click());expect(host.textContent).not.toContain('Close guide');
    const last=origin.position.clone();tick();expect(origin.position.distanceTo(last)).toBeGreaterThan(0);
  });
  it('starts outside the main gate and does not teleport on unrelated renders',async()=>{
    const entry=campusEntranceSpawn(),gate=bboxOf('gate');
    expect(entry.floor[0]).toBe(gate.cx);expect(entry.floor[2]).toBe(gate.maxZ+12);
    expect(entry.eye[2]).toBe(entry.floor[2]);expect(entry.yaw).toBe(0);
    await act(async()=>root.render(createElement(VRRig,{position:entry.floor,startYaw:entry.yaw,buildingMovement:true})));
    expect(origin.position.toArray()).toEqual(entry.floor);expect(origin.rotation.y).toBe(0);
    tick();const moved=origin.position.clone();
    await act(async()=>root.render(createElement(VRRig,{position:[...entry.floor],startYaw:entry.yaw,buildingMovement:true})));
    expect(origin.position.toArray()).toEqual(moved.toArray());
  });
  it('does not keep ascending after controllers disconnect or toggle B on focus return',()=>{
    stick.yAxis=0;fly.state='pressed';jump.state='pressed';tick();
    const height=origin.position.y;mock.sources=[];tick();expect(origin.position.y).toBe(height);
    mock.sources=[{type:'controller',inputSource:{handedness:'right'},gamepad:{'b-button':fly}}];
    mock.session.visibilityState='visible-blurred';tick();mock.session.visibilityState='visible';tick();
    expect(origin.position.y).toBe(height);
  });
  it('accepts a second A press while airborne but not a third',()=>{
    stick.yAxis=0;jump.state='pressed';tick();jump.state='default';tick();
    for(let i=0;i<10;i++)tick();
    const before=origin.position.y;jump.state='pressed';tick();jump.state='default';tick();
    expect(origin.position.y-before).toBeGreaterThan(.09);
    for(let i=0;i<10;i++)tick();
    const third=origin.position.y;jump.state='pressed';tick();
    expect(origin.position.y-third).toBeLessThan(.025);
    for(let i=0;i<180;i++)tick();expect(origin.position.y).toBe(0);
  });
  it('uses the left grip for running and stops when controllers disconnect',()=>{
    tick();const walk=-origin.position.z;grip.state='pressed';const before=origin.position.z;tick();
    expect(before-origin.position.z).toBeCloseTo(walk*RUN_MULTIPLIER);
    grip.state='default';const released=origin.position.z;tick();expect(released-origin.position.z).toBeCloseTo(walk);
    mock.sources=[];const stopped=origin.position.clone();tick();expect(origin.position.toArray()).toEqual(stopped.toArray());
  });
  it('jumps with A, lands on the floor and needs a release before the next jump',()=>{
    stick.yAxis=0;jump.state='pressed';tick();expect(origin.position.y).toBeGreaterThan(0);
    for(let i=0;i<180;i++)tick();expect(origin.position.y).toBe(0);expect(camera.position.y).toBe(1.6);
    jump.state='default';tick();jump.state='pressed';tick();expect(origin.position.y).toBeGreaterThan(0);
  });
  it('pauses movement when the headset loses focus',()=>{
    mock.session.visibilityState='visible-blurred';tick();expect(origin.position.toArray()).toEqual([0,0,0]);
  });
});
