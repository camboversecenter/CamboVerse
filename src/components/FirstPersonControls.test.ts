// @vitest-environment jsdom
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {act,createElement} from 'react';
import {createRoot,type Root} from 'react-dom/client';
import {PerspectiveCamera,Scene} from 'three';
import {FirstPersonControls,type WalkInput} from './FirstPersonControls';
import {RUN_MULTIPLIER} from '../buildingMovement';

const mocked=vi.hoisted(()=>({frame:null as null|((state:unknown,dt:number)=>void),state:null as unknown}));
vi.mock('@react-three/fiber',()=>({useThree:(select:(s:unknown)=>unknown)=>select(mocked.state),useFrame:(f:typeof mocked.frame)=>{mocked.frame=f;}}));
let root:Root,host:HTMLDivElement,camera:PerspectiveCamera,input:{current:WalkInput};
const tick=()=>mocked.frame?.({},1/60);
const key=(type:string,code:string,key=code,repeat=false)=>window.dispatchEvent(new KeyboardEvent(type,{code,key,repeat,cancelable:true}));
beforeEach(async()=>{
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true);camera=new PerspectiveCamera();
  mocked.state={camera,scene:new Scene(),gl:{xr:{isPresenting:false}}};
  input={current:{move:{x:0,y:0},look:{dx:0,dy:0}}};
  host=document.createElement('div');document.body.append(host);root=createRoot(host);
  await act(async()=>root.render(createElement(FirstPersonControls,{input,start:[0,1.25,0]})));tick();
});
afterEach(async()=>{await act(async()=>root.unmount());host.remove();vi.unstubAllGlobals();});
describe('building keyboard and touch walking',()=>{
  it('allows one extra airborne jump, blocks a third, and resets on landing',async()=>{
    await act(async()=>root.render(createElement(FirstPersonControls,{input,start:[0,1.25,0],allowDoubleJump:true})));tick();
    key('keydown','Space',' ');tick();key('keyup','Space',' ');
    for(let i=0;i<15;i++)tick();
    const before=camera.position.y;key('keydown','Space',' ');tick();key('keyup','Space',' ');
    const secondRise=camera.position.y-before;expect(secondRise).toBeGreaterThan(.06);
    for(let i=0;i<10;i++)tick();
    const third=camera.position.y;key('keydown','Space',' ');tick();key('keyup','Space',' ');
    expect(camera.position.y-third).toBeLessThan(secondRise-.02);
    for(let i=0;i<180;i++)tick();expect(camera.position.y).toBe(1.25);
    input.current.jump=true;tick();expect(camera.position.y).toBeGreaterThan(1.25);
    for(let i=0;i<15;i++)tick();const touch=camera.position.y;input.current.jump=true;tick();
    expect(camera.position.y-touch).toBeGreaterThan(.06);
  });
  it('speeds up with Shift or Run and restores normal speed on release',()=>{
    key('keydown','KeyW');tick();const normal=-camera.position.z;
    key('keydown','ShiftLeft','Shift');const before=camera.position.z;tick();expect(before-camera.position.z).toBeCloseTo(normal*RUN_MULTIPLIER);
    key('keyup','ShiftLeft','Shift');const released=camera.position.z;tick();expect(released-camera.position.z).toBeCloseTo(normal);
    input.current.sprint=true;const touch=camera.position.z;tick();expect(touch-camera.position.z).toBeCloseTo(normal*RUN_MULTIPLIER);
    window.dispatchEvent(new Event('blur'));const stopped=camera.position.clone();tick();expect(camera.position.z).toBe(stopped.z);expect(input.current.sprint).toBe(false);
  });
  it('consumes a touch jump and does not repeatedly bounce while Space is held',()=>{
    input.current.jump=true;tick();expect(camera.position.y).toBeGreaterThan(1.25);expect(input.current.jump).toBe(false);
    for(let i=0;i<120;i++)tick();expect(camera.position.y).toBe(1.25);
    key('keydown','Space',' ');tick();expect(camera.position.y).toBeGreaterThan(1.25);
    for(let i=0;i<180;i++){key('keydown','Space',' ',true);tick();}
    expect(camera.position.y).toBe(1.25);
    key('keyup','Space',' ');key('keydown','Space',' ');tick();expect(camera.position.y).toBeGreaterThan(1.25);
  });
});
