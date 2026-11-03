// @vitest-environment jsdom
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {act, createElement, useEffect, useState} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {Euler, Group, PerspectiveCamera, Vector3} from 'three';
import {LabVRRig, useLabVR, type VRStation} from './LabVR';
import {IMMERSIVE_XR_OPTIONS} from '../immersiveVR';
import {labStationArrival} from '../labVRNavigation';

const mock = vi.hoisted(() => ({frames:new Set<(state:unknown,dt:number)=>void>(), origin:null as unknown,
  session:{visibilityState:'visible',end:vi.fn(async()=>{})}, sources:[] as unknown[], subscribe:vi.fn(), create:vi.fn(),
  stop:vi.fn(), dispose:vi.fn(), narrate:vi.fn()}));
vi.mock('@react-three/fiber', async () => {
  const React = await import('react');
  return {useFrame:(frame:(state:unknown,dt:number)=>void) => React.useEffect(() => {mock.frames.add(frame); return () => {mock.frames.delete(frame);};}, [frame])};
});
vi.mock('@react-three/xr', async () => {
  const React = await import('react');
  return {createXRStore:(options:unknown)=>{mock.create(options);return {subscribe:mock.subscribe,getState:()=>({session:mock.session})};},
    useXR:(select:(s:unknown)=>unknown)=>select({session:mock.session}),
    useXRStore:()=>({getState:()=>({session:mock.session,inputSourceStates:mock.sources})}), useXRControllerLocomotion:()=>{},
    XROrigin:React.forwardRef((_,ref)=>{React.useImperativeHandle(ref,()=>mock.origin);return null;})};
});
vi.mock('./CaptureVR',()=>({ImmersiveVREntry:()=>null}));
vi.mock('./VRPanel',()=>({VRPanelFrame:()=>null,VRPageControls:()=>null}));
vi.mock('./VRSurface',()=>({VRSurface:({title,body,onClick,disabled}:{title:string;body?:string;onClick?:()=>void;disabled?:boolean}) =>
  createElement(onClick?'button':'div',{onClick,disabled},title,body)}));
vi.mock('../lib/guideNarrator',()=>({GuideNarrator:class {stop=mock.stop;dispose=mock.dispose;start=mock.narrate;}}));

let host:HTMLDivElement, root:Root, origin:Group, camera:PerspectiveCamera;
let y:{state:string}, a:{state:string}, b:{state:string}, stick:{xAxis:number;yAxis:number};
const stations:VRStation[]=[
  {id:'a',label:'Anatomy study',description:'Anatomy learning notes.',at:[-1,1.3,-2]},
  {id:'b',label:'Mixing station',description:'Chemistry learning notes.',at:[2,1.3,0]},
];
const tick=()=>{for(const frame of mock.frames)frame({camera},1/60);};
const button=(label:string)=>Array.from(host.querySelectorAll('button')).find(b=>b.textContent===label)!;
const render=()=>root.render(createElement(LabVRRig,{title:'Test room',start:[0,0,2],bounds:[-3,3,-3,3],stations}));
beforeEach(async()=>{
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true);vi.clearAllMocks();mock.subscribe.mockReturnValue(()=>{});
  origin=new Group();mock.origin=origin;camera=new PerspectiveCamera();camera.position.y=1.6;origin.add(camera);
  y={state:'default'};a={state:'default'};b={state:'default'};stick={xAxis:0,yAxis:0};
  mock.session.visibilityState='visible';
  mock.sources=[{type:'controller',inputSource:{handedness:'left'},gamepad:{'y-button':y,'xr-standard-thumbstick':stick}},
    {type:'controller',inputSource:{handedness:'right'},gamepad:{'a-button':a,'b-button':b}}];
  // A minimal host for group transforms; actual locomotion uses a Three Group.
  const positions=new WeakMap<HTMLElement,Vector3>(), rotations=new WeakMap<HTMLElement,Euler>();
  Object.defineProperty(HTMLElement.prototype,'position',{configurable:true,get(){if(!positions.has(this))positions.set(this,new Vector3());return positions.get(this);}});
  Object.defineProperty(HTMLElement.prototype,'rotation',{configurable:true,get(){if(!rotations.has(this))rotations.set(this,new Euler());return rotations.get(this);}});
  host=document.createElement('div');document.body.append(host);root=createRoot(host);
  await act(async()=>render());
});
afterEach(async()=>{
  await act(async()=>root.unmount());host.remove();vi.unstubAllGlobals();
  Reflect.deleteProperty(HTMLElement.prototype,'position');Reflect.deleteProperty(HTMLElement.prototype,'rotation');
});

describe('Learning Lab immersive interaction',()=>{
  it('walks and flies with the welcome board open, and toggles Y once per press',async()=>{
    expect(button('Close')).toBeTruthy();
    stick.yAxis=-1;const start=origin.position.z;await act(async()=>tick());expect(origin.position.z).toBeLessThan(start);
    b.state='pressed';a.state='pressed';await act(async()=>tick());expect(origin.position.y).toBeGreaterThan(0);
    y.state='pressed';await act(async()=>tick());expect(button('Close')).toBeUndefined();
    await act(async()=>tick());expect(button('Close')).toBeUndefined();
    y.state='default';await act(async()=>tick());y.state='pressed';await act(async()=>tick());expect(button('Close')).toBeTruthy();
    await act(async()=>button('Close').click());expect(button('Close')).toBeUndefined();
    mock.session.visibilityState='visible-blurred';y.state='default';await act(async()=>tick());y.state='pressed';await act(async()=>tick());
    mock.session.visibilityState='visible';await act(async()=>tick());expect(button('Close')).toBeUndefined();
  });
  it('opens marker notes, reads them, visits at floor level and resets to the entrance',async()=>{
    await act(async()=>button('Close').click());await act(async()=>button('Mixing station').click());
    expect(host.textContent).toContain('Chemistry learning notes.');
    await act(async()=>button('Listen to these notes').click());expect(mock.narrate).toHaveBeenCalledWith('Mixing station. Chemistry learning notes.');
    await act(async()=>button('Visit station').click());
    expect(origin.position.toArray()).toEqual(labStationArrival(stations[1].at,[-3,3,-3,3]).position);
    expect(origin.rotation.y).toBeCloseTo(-Math.PI/2);expect(button('Close')).toBeUndefined();expect(mock.dispose).toHaveBeenCalled();
    y.state='pressed';await act(async()=>tick());await act(async()=>button('Controls').click());
    await act(async()=>button('Room entrance').click());expect(origin.position.toArray()).toEqual([0,0,2]);expect(origin.rotation.y).toBe(0);
  });
  it('anchors the board once and preserves the visit when room state rerenders',async()=>{
    await act(async()=>tick());const board=host.querySelector('group')! as unknown as Group;
    const at=board.position.clone();camera.rotation.y=1;camera.position.x=.3;await act(async()=>tick());
    expect(board.position.toArray()).toEqual(at.toArray());
    await act(async()=>button('Learn').click());await act(async()=>button('Visit station').click());
    const visited=origin.position.clone();await act(async()=>render());expect(origin.position.toArray()).toEqual(visited.toArray());
  });
  it('runs controller activities and exits through the actual session',async()=>{
    const select=vi.fn();
    await act(async()=>root.render(createElement(LabVRRig,{start:[0,0,2],bounds:[-3,3,-3,3],stations,
      actions:()=>[{id:'rotate',label:'Rotate organ',onSelect:select},{id:'pour',label:'Pour',onSelect:select,disabled:true}]})));
    await act(async()=>button('Activities').click());await act(async()=>button('Rotate organ').click());expect(select).toHaveBeenCalledTimes(1);
    expect(button('Pour').disabled).toBe(true);
    await act(async()=>button('Controls').click());await act(async()=>button('Exit VR').click());expect(mock.session.end).toHaveBeenCalledTimes(1);
  });
  it('uses shared controller rays and only upgrades the room for an immersive session',async()=>{
    function Probe(){const vr=useLabVR();useEffect(()=>{},[]);return createElement('p',null,vr.active?'Ultra':'Normal');}
    await act(async()=>root.render(createElement(Probe)));
    expect(mock.create).toHaveBeenCalledWith({...IMMERSIVE_XR_OPTIONS,emulate:false});
    const listener=mock.subscribe.mock.calls[0][0];
    await act(async()=>listener({session:{},mode:'inline'}));expect(host.textContent).toBe('Normal');
    await act(async()=>listener({session:{},mode:'immersive-vr'}));expect(host.textContent).toBe('Ultra');
    await act(async()=>listener({session:null,mode:null}));expect(host.textContent).toBe('Normal');
  });
  it('shows and narrates live experiment results inside the same world panel',async()=>{
    function Experiment(){const [amount,setAmount]=useState(10);return createElement(LabVRRig,{title:'Chemistry',start:[0,0,2],bounds:[-3,3,-3,3],stations,
      actions:()=>[{id:'dose',label:'Add dose',onSelect:()=>setAmount(n=>n+1)}],
      activity:()=>({objective:'Change an amount and compare the result.',result:`Mixture contains ${amount} mL.`})});}
    await act(async()=>root.render(createElement(Experiment)));
    await act(async()=>button('Activities').click());await act(async()=>button('Add dose').click());
    await act(async()=>button('Results').click());expect(host.textContent).toContain('Mixture contains 11 mL.');
    await act(async()=>button('Listen to these notes').click());expect(mock.narrate).toHaveBeenCalledWith('Anatomy study. Mixture contains 11 mL.');
    const z=origin.position.z;stick.yAxis=-1;await act(async()=>tick());expect(origin.position.z).toBeLessThan(z);
  });
});
