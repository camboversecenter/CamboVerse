// @vitest-environment jsdom
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {act,createElement} from 'react';
import {createRoot,type Root} from 'react-dom/client';
import {CaptureVRMenu} from './CaptureVR';

const mocked=vi.hoisted(()=>({y:false,frame:null as null|((state:unknown)=>void),session:{end:vi.fn(async()=>{})}}));
vi.mock('@react-three/fiber',()=>({useFrame:(callback:(state:unknown)=>void)=>{mocked.frame=callback;}}));
vi.mock('@react-three/xr',()=>({
  useXR:(select:(state:unknown)=>unknown)=>select({session:mocked.session}),
  useXRStore:()=>({getState:()=>({inputSourceStates:[{type:'controller',inputSource:{handedness:'left'},gamepad:{'y-button':{state:mocked.y?'pressed':'default'}}}]})}),
}));
vi.mock('../lib/guideLanguage',()=>({useGuideLanguage:()=>({language:{code:'en'}})}));
vi.mock('./VRSurface',()=>({VRSurface:({title,onClick}:{title:string;onClick?:()=>void})=>createElement('button',{onClick},title)}));
let host:HTMLDivElement,root:Root;
const camera={getWorldPosition:(v:{set:(x:number,y:number,z:number)=>void})=>v.set(0,1.6,0),getWorldDirection:(v:{set:(x:number,y:number,z:number)=>void})=>v.set(0,0,-1)};
async function tick(y:boolean){mocked.y=y;await act(async()=>mocked.frame?.({camera}));}
beforeEach(async()=>{
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true);mocked.y=false;
  host=document.createElement('div');document.body.append(host);root=createRoot(host);
  await act(async()=>root.render(createElement(CaptureVRMenu,{
    tour:{title:'Wat Phnom',stops:[],onSelect:vi.fn()},onReset:vi.fn(),resetKey:0,onGuide:vi.fn(),
    ambience:{state:'off',musicState:'off',toggle:vi.fn(),toggleMusic:vi.fn(),start:vi.fn()},
  })));
  const panel=host.querySelector('group')!;
  Object.assign(panel,{position:{set:vi.fn()},rotation:{set:vi.fn()},scale:{setScalar:vi.fn()}});
});
afterEach(async()=>{await act(async()=>root.unmount());host.remove();vi.unstubAllGlobals();});
describe('VR menu visibility',()=>{
  it('has no menu tab or targets while closed, and Y opens and hides it',async()=>{
    expect(host.querySelectorAll('button')).toHaveLength(0);
    await tick(true);await tick(true);
    expect(host.textContent).toContain('Hide menu');
    await tick(false);await tick(true);
    expect(host.querySelectorAll('button')).toHaveLength(0);
    await tick(true);expect(host.querySelectorAll('button')).toHaveLength(0);
    await tick(false);await tick(true);expect(host.textContent).toContain('Hide menu');
  });
  it('Hide menu removes every target and Y can open it again',async()=>{
    await tick(true);await tick(false);
    const hide=[...host.querySelectorAll('button')].find(button=>button.textContent?.includes('Hide menu'))!;
    await act(async()=>hide.click());expect(host.querySelectorAll('button')).toHaveLength(0);
    await tick(true);expect(host.textContent).toContain('Hide menu');
  });
});
