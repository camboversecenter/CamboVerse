// @vitest-environment jsdom
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {act,createElement} from 'react';
import {createRoot,type Root} from 'react-dom/client';
import {WalkControls} from './WalkControls';
import type {WalkInput} from './FirstPersonControls';

let host:HTMLDivElement,root:Root,input:{current:WalkInput};
function pointer(element:Element,type:string,x:number,y:number,id=1){
  const event=new MouseEvent(type,{bubbles:true,button:0,clientX:x,clientY:y});
  Object.defineProperty(event,'pointerId',{value:id});element.dispatchEvent(event);
}
beforeEach(async()=>{
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true);
  host=document.createElement('div');document.body.append(host);root=createRoot(host);
  input={current:{move:{x:0,y:0},look:{dx:0,dy:0}}};
  await act(async()=>root.render(createElement(WalkControls,{input})));
  const layer=host.querySelector('.walk-layer') as HTMLDivElement;layer.setPointerCapture=vi.fn();
  const joystick=host.querySelector('.joystick') as HTMLDivElement;
  joystick.getBoundingClientRect=()=>({left:0,top:0,width:104,height:104,right:104,bottom:104,x:0,y:0,toJSON:()=>({})});
});
afterEach(async()=>{await act(async()=>root.unmount());host.remove();vi.unstubAllGlobals();});
describe('walk joystick',()=>{
  it('ignores near-centre noise and releases movement when capture is lost',()=>{
    const layer=host.querySelector('.walk-layer')!;
    act(()=>pointer(layer,'pointerdown',54,52));expect(input.current.move).toEqual({x:0,y:0});
    act(()=>pointer(layer,'pointermove',94,52));expect(input.current.move.x).toBeGreaterThan(.7);
    act(()=>pointer(layer,'lostpointercapture',94,52));expect(input.current.move).toEqual({x:0,y:0});
  });
  it('does not start the joystick outside its circle and clears it on focus and blur',()=>{
    const layer=host.querySelector('.walk-layer')!;
    act(()=>pointer(layer,'pointerdown',115,52));expect(input.current.move).toEqual({x:0,y:0});
    act(()=>pointer(layer,'pointerup',115,52));
    act(()=>pointer(layer,'pointerdown',95,52));expect(input.current.move.x).toBeGreaterThan(0);
    const field=document.createElement('input');document.body.append(field);act(()=>field.focus());
    expect(input.current.move).toEqual({x:0,y:0});field.remove();
    act(()=>pointer(layer,'pointerdown',95,52,2));act(()=>window.dispatchEvent(new Event('blur')));
    expect(input.current.move).toEqual({x:0,y:0});
  });
});
