// @vitest-environment jsdom
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {act,createElement} from 'react';
import {createRoot,type Root} from 'react-dom/client';
import {VRBuildingGuide} from './VRBuildingGuide';
const mock=vi.hoisted(()=>({frame:()=>{},button:{state:'default'},visibilityState:'visible'}));
vi.mock('@react-three/fiber',()=>({useFrame:(f:()=>void)=>{mock.frame=f;}}));
vi.mock('@react-three/xr',()=>({useXR:()=>true,useXRStore:()=>({getState:()=>({session:{visibilityState:mock.visibilityState},inputSourceStates:[{type:'controller',inputSource:{handedness:'left'},gamepad:{'y-button':mock.button}}]})})}));
vi.mock('./VRCaptureGuide',()=>({VRCaptureGuide:({locationId,onClose}:{locationId:string;onClose:()=>void})=>createElement('button',{onClick:onClose},`Close ${locationId} guide`)}));
let root:Root,host:HTMLDivElement;
beforeEach(()=>{vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true);mock.button.state='default';mock.visibilityState='visible';host=document.createElement('div');document.body.append(host);root=createRoot(host);});
afterEach(async()=>{await act(async()=>root.unmount());host.remove();vi.unstubAllGlobals();});
it('toggles only on each Y press, pauses locomotion, and closes from its board',async()=>{
  const change=vi.fn();await act(async()=>root.render(createElement(VRBuildingGuide,{locationId:'hall',onOpenChange:change})));
  expect(host.textContent).toBe('');
  await act(async()=>{mock.button.state='pressed';mock.frame();});expect(host.textContent).toContain('hall');expect(change).toHaveBeenLastCalledWith(true);
  await act(async()=>mock.frame());expect(host.textContent).toContain('hall');
  await act(async()=>{mock.button.state='default';mock.frame();mock.button.state='pressed';mock.frame();});
  expect(host.textContent).toBe('');expect(change).toHaveBeenLastCalledWith(false);
  await act(async()=>{mock.button.state='default';mock.frame();mock.button.state='pressed';mock.frame();});
  await act(async()=>host.querySelector('button')!.click());expect(host.textContent).toBe('');expect(change).toHaveBeenLastCalledWith(false);
});
