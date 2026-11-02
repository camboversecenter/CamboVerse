// @vitest-environment jsdom
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {act,createElement} from 'react';
import {createRoot,type Root} from 'react-dom/client';
import {VRSurface} from './VRSurface';

let root:Root,host:HTMLDivElement,drawn:string[];
beforeEach(()=>{
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true);drawn=[];
  vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockImplementation(()=>({
    font:'',fillStyle:'',strokeStyle:'',lineWidth:0,textAlign:'',textBaseline:'',
    beginPath(){},roundRect(){},fill(){},stroke(){},arc(){},fillRect(){},save(){},rect(){},clip(){},restore(){},
    measureText(text:string){return {width:text.length*16};},
    fillText(text:string){drawn.push(text);},
  }) as unknown as CanvasRenderingContext2D);
  host=document.createElement('div');document.body.append(host);root=createRoot(host);
});
afterEach(async()=>{await act(async()=>root.unmount());host.remove();vi.restoreAllMocks();vi.unstubAllGlobals();});

describe('rendered VR surfaces',()=>{
  it('makes only enabled actions selectable by the ray',async()=>{
    const click=vi.fn();
    await act(async()=>root.render(createElement(VRSurface,{title:'Listen',onClick:click})));
    expect(host.querySelector('mesh')?.getAttribute('pointer-events')).toBe('auto');
    await act(async()=>host.querySelector('mesh')!.dispatchEvent(new MouseEvent('click',{bubbles:true})));
    expect(click).toHaveBeenCalledTimes(1);
    await act(async()=>root.render(createElement(VRSurface,{title:'Listen',onClick:click,disabled:true})));
    expect(host.querySelector('mesh')?.getAttribute('pointer-events')).toBe('none');
    await act(async()=>host.querySelector('mesh')!.dispatchEvent(new MouseEvent('click',{bubbles:true})));
    expect(click).toHaveBeenCalledTimes(1);
    await act(async()=>root.render(createElement(VRSurface,{title:'A source credit',variant:'text'})));
    expect(host.querySelector('mesh')?.getAttribute('pointer-events')).toBe('none');
  });
  it('draws every word of a long answer through measured pages',async()=>{
    const words=Array.from({length:700},(_,i)=>'word'+i),body=words.join(' '),onPages=vi.fn();
    const props={title:'Penh',body,width:1.34,height:1.08,onPages,variant:'board' as const};
    await act(async()=>root.render(createElement(VRSurface,props)));
    const count=onPages.mock.calls.at(-1)![0] as number;
    expect(count).toBeGreaterThan(1);
    for(let page=1;page<count;page++)await act(async()=>root.render(createElement(VRSurface,{...props,page})));
    const rendered=drawn.filter(line=>line.startsWith('word')).join(' ').split(' ');
    expect(rendered).toEqual(words);
  });
});
