// @vitest-environment jsdom
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {act,createElement} from 'react';
import {createRoot,type Root} from 'react-dom/client';
import {WalkActions} from './WalkActions';
import type {WalkInput} from './FirstPersonControls';
let root:Root,host:HTMLDivElement,input:{current:WalkInput};
beforeEach(async()=>{
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true);host=document.createElement('div');document.body.append(host);root=createRoot(host);
  input={current:{move:{x:0,y:-1},look:{dx:0,dy:0}}};
  await act(async()=>root.render(createElement(WalkActions,{input})));
});
afterEach(async()=>{await act(async()=>root.unmount());host.remove();vi.unstubAllGlobals();});
describe('mobile building actions',()=>{
  it('runs and jumps while the movement finger stays active',async()=>{
    const [run,jump]=host.querySelectorAll('button');
    await act(async()=>run.click());expect(input.current.sprint).toBe(true);expect(run.getAttribute('aria-pressed')).toBe('true');
    await act(async()=>jump.click());expect(input.current.jump).toBe(true);expect(input.current.move.y).toBe(-1);
    await act(async()=>run.click());expect(input.current.sprint).toBe(false);
  });
  it('clears Run and pending Jump on window blur',async()=>{
    await act(async()=>host.querySelector('button')!.click());input.current.jump=true;
    await act(async()=>window.dispatchEvent(new Event('blur')));
    expect(input.current.sprint).toBe(false);expect(input.current.jump).toBe(false);expect(host.querySelector('button')!.getAttribute('aria-pressed')).toBe('false');
  });
  it('clears pending actions when controls leave the view for VR',async()=>{
    await act(async()=>host.querySelector('button')!.click());input.current.jump=true;
    await act(async()=>root.render(null));
    expect(input.current.sprint).toBe(false);expect(input.current.jump).toBe(false);
  });
});
