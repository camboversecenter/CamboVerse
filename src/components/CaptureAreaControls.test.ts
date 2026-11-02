// @vitest-environment jsdom
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {act,createElement} from 'react';
import {createRoot,type Root} from 'react-dom/client';
import {PerspectiveCamera} from 'three';
import {CaptureAreaControls} from './CaptureAreaControls';
import type {WalkInput} from './FirstPersonControls';
import {buildingById} from '../buildings';
const mock=vi.hoisted(()=>({frame:null as null|((state:unknown,dt:number)=>void),state:null as unknown}));
vi.mock('@react-three/fiber',()=>({useThree:()=>mock.state,useFrame:(f:typeof mock.frame)=>{mock.frame=f;}}));
let root:Root,host:HTMLDivElement,camera:PerspectiveCamera,input:{current:WalkInput};
const area=buildingById('shrine')!.capture!.walkAround!;
const tick=()=>mock.frame?.({},1/60);
const press=()=>{window.dispatchEvent(new KeyboardEvent('keydown',{code:'Space',cancelable:true}));tick();window.dispatchEvent(new KeyboardEvent('keyup',{code:'Space'}));};
beforeEach(async()=>{
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true);camera=new PerspectiveCamera();mock.state={camera,gl:{xr:{isPresenting:false}}};
  input={current:{move:{x:0,y:0},look:{dx:0,dy:0}}};host=document.createElement('div');document.body.append(host);root=createRoot(host);
  await act(async()=>root.render(createElement(CaptureAreaControls,{area,input,allowDoubleJump:true,allowSprint:true})));
});
afterEach(async()=>{await act(async()=>root.unmount());host.remove();vi.unstubAllGlobals();});
it('double Space gives the campus capture a second jump instead of toggling flight',()=>{
  const floor=camera.position.y;press();for(let i=0;i<6;i++)tick();
  const before=camera.position.y;press();expect(camera.position.y-before).toBeGreaterThan(.02);
  for(let i=0;i<6;i++)tick();const third=camera.position.y;press();expect(camera.position.y-third).toBeLessThan(.02);
  expect(input.current.flyToggle).toBe(false);
  for(let i=0;i<180;i++)tick();expect(camera.position.y).toBeCloseTo(floor);
  input.current.jump=true;tick();expect(camera.position.y).toBeGreaterThan(floor);
});
