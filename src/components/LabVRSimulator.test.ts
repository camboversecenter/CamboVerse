// @vitest-environment jsdom
import {act,createElement} from 'react';
import {Simulate} from 'react-dom/test-utils';
import {createRoot} from 'react-dom/client';
import {expect,it,vi} from 'vitest';
import {LabVRSimulator} from './LabVRSimulator';

it('sends held trigger and thumbstick input to the emulated controllers and releases them on blur',async()=>{
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true);
  const left={updateButtonValue:vi.fn(),updateAxes:vi.fn()},right={updateButtonValue:vi.fn(),updateAxes:vi.fn()};
  const device={controllers:{left,right}},state={emulator:device,session:{}};
  const store={getState:()=>state,subscribe:()=>()=>{}};
  const host=document.createElement('div'),root=createRoot(host);document.body.append(host);
  try{
    await act(async()=>root.render(createElement(LabVRSimulator,{store:store as never})));
    expect(document.querySelector('[role=status]')?.textContent).toContain('active');
    const sections=document.querySelectorAll('.lab-vr-simulator section');
    const get=(side:number,label:string)=>Array.from(sections[side].querySelectorAll('button')).find(b=>b.textContent===label)!;
    await act(async()=>Simulate.keyDown(get(1,'Trigger'),{key:' '}));
    expect(right.updateButtonValue).toHaveBeenCalledWith('trigger',1);
    await act(async()=>Simulate.keyUp(get(1,'Trigger'),{key:' '}));
    expect(right.updateButtonValue).toHaveBeenCalledWith('trigger',0);
    await act(async()=>Simulate.keyDown(get(0,'↑'),{key:'Enter'}));
    expect(left.updateAxes).toHaveBeenCalledWith('thumbstick',0,-1);
    await act(async()=>window.dispatchEvent(new Event('blur')));
    expect(left.updateAxes).toHaveBeenLastCalledWith('thumbstick',0,0);
    expect(right.updateButtonValue).toHaveBeenCalledWith('squeeze',0);
  }finally{await act(async()=>root.unmount());host.remove();vi.unstubAllGlobals();}
});
