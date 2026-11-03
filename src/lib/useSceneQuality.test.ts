// @vitest-environment jsdom
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {act,createElement} from 'react';
import {createRoot,type Root} from 'react-dom/client';
import {useSceneQuality} from './useSceneQuality';

let root:Root,host:HTMLDivElement;
function Probe({immersive}:{immersive:boolean}) {
  const quality=useSceneQuality(immersive,()=> 'normal');
  return createElement('button',{onClick:quality.toggle},quality.mode);
}
beforeEach(()=>{vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true);host=document.createElement('div');root=createRoot(host);});
afterEach(async()=>{await act(async()=>root.unmount());vi.unstubAllGlobals();});
describe('temporary headset quality',()=>{
  it('restores Normal after a session and preserves a later manual Ultra choice',async()=>{
    await act(async()=>root.render(createElement(Probe,{immersive:false})));
    expect(host.textContent).toBe('normal');
    await act(async()=>root.render(createElement(Probe,{immersive:true})));
    expect(host.textContent).toBe('ultra');
    await act(async()=>host.querySelector('button')!.click());
    expect(host.textContent).toBe('ultra');
    await act(async()=>root.render(createElement(Probe,{immersive:false})));
    expect(host.textContent).toBe('normal');
    await act(async()=>host.querySelector('button')!.click());
    await act(async()=>root.render(createElement(Probe,{immersive:true})));
    await act(async()=>root.render(createElement(Probe,{immersive:false})));
    expect(host.textContent).toBe('ultra');
  });
});
