// @vitest-environment jsdom
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {act,createElement} from 'react';
import {createRoot,type Root} from 'react-dom/client';
import {Group,PerspectiveCamera} from 'three';
import {VRRig} from './VRRig';
import {RUN_MULTIPLIER} from '../buildingMovement';
const mock=vi.hoisted(()=>({frame:null as null|((s:unknown,dt:number)=>void),origin:null as unknown,sources:[] as unknown[],session:{visibilityState:'visible'}}));
vi.mock('@react-three/fiber',()=>({useFrame:(f:typeof mock.frame)=>{mock.frame=f;}}));
vi.mock('@react-three/xr',async()=>{const React=await import('react');return {
  XROrigin:React.forwardRef((_,ref)=>{React.useImperativeHandle(ref,()=>mock.origin);return null;}),
  useXR:()=>true,useXRControllerLocomotion:()=>{},useXRStore:()=>({getState:()=>({inputSourceStates:mock.sources,session:mock.session})}),
};});
let root:Root,host:HTMLDivElement,origin:Group,camera:PerspectiveCamera;
let stick:{xAxis:number;yAxis:number},grip:{state:string},jump:{state:string};
const tick=()=>mock.frame?.({camera},1/60);
beforeEach(async()=>{
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true);origin=new Group();mock.origin=origin;camera=new PerspectiveCamera();camera.position.y=1.6;origin.add(camera);
  stick={xAxis:0,yAxis:-1};grip={state:'default'};jump={state:'default'};mock.session.visibilityState='visible';
  mock.sources=[{type:'controller',inputSource:{handedness:'left'},gamepad:{'xr-standard-thumbstick':stick,'xr-standard-squeeze':grip}},{type:'controller',inputSource:{handedness:'right'},gamepad:{'a-button':jump}}];
  host=document.createElement('div');document.body.append(host);root=createRoot(host);
  await act(async()=>root.render(createElement(VRRig,{position:[0,0,0],buildingMovement:true})));
});
afterEach(async()=>{await act(async()=>root.unmount());host.remove();vi.unstubAllGlobals();});
describe('Buildings Quest controller mapping',()=>{
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
