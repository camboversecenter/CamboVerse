// @vitest-environment jsdom
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {act,createElement} from 'react';
import {createRoot,type Root} from 'react-dom/client';
import {VRObjectHotspots} from './VRObjectHotspots';
import {STAIRCASE_OBJECT_ANCHORS} from '../objectHotspots';
import {isKhmerGuideText,khmerObjectTitle} from '../guideKhmer';

vi.mock('@react-three/fiber',()=>({useFrame:()=>{}}));
vi.mock('../lib/guideNarrator',()=>({GuideNarrator:class {start(){} stop(){} dispose(){}}}));
vi.mock('./VRSurface',()=>({VRSurface:({title,onClick,body,footer,eyebrow}:{title:string;onClick?:()=>void;body?:string;footer?:string;eyebrow?:string})=>createElement('button',{onClick},[title,body,footer,eyebrow].filter(Boolean).join(' '))}));
vi.mock('./VRCaptureGuide',()=>({VRCaptureGuide:({objectId,onClose}:{objectId:string;onClose:()=>void})=>createElement('button',{onClick:onClose},`Guide for ${objectId}`)}));
let root:Root,host:HTMLDivElement;
beforeEach(()=>{localStorage.clear();vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true);host=document.createElement('div');document.body.append(host);root=createRoot(host);});
afterEach(async()=>{await act(async()=>root.unmount());host.remove();vi.unstubAllGlobals();});
const button=(text:string)=>[...host.querySelectorAll('button')].find(item=>item.textContent?.includes(text))!;
describe('VR object information',()=>{
  it.each([['Naga balustrade','naga-balustrade'],['Guardian lion','guardian-lion']])('opens and returns from Penh for %s',async(title,id)=>{
    await act(async()=>root.render(createElement(VRObjectHotspots,{anchors:STAIRCASE_OBJECT_ANCHORS,scale:1,penhGuide:true})));
    await act(async()=>button(title).click());
    expect(button('Listen')).toBeTruthy();expect(button('Ask Penh')).toBeTruthy();
    await act(async()=>button('Ask Penh').click());expect(button(`Guide for ${id}`)).toBeTruthy();
    await act(async()=>button(`Guide for ${id}`).click());expect(button('Ask Penh')).toBeTruthy();
    await act(async()=>button('Close').click());expect(button(`ⓘ ${title}`)).toBeTruthy();
  });
  it('does not add the Wat Phnom guide to unrelated objects',async()=>{
    await act(async()=>root.render(createElement(VRObjectHotspots,{anchors:[{id:'room-screen',position:[0,0,0]}],scale:1})));
    await act(async()=>button('Meeting-room screen').click());
    expect(button('Listen')).toBeTruthy();expect(button('Ask Penh')).toBeUndefined();
  });
  it('keeps the VR labels and information board in Khmer',async()=>{
    localStorage.setItem('camboverse-penh-language','km');
    await act(async()=>root.render(createElement(VRObjectHotspots,{anchors:STAIRCASE_OBJECT_ANCHORS,scale:1,penhGuide:true})));
    expect(isKhmerGuideText(host.textContent!)).toBe(true);
    await act(async()=>button(khmerObjectTitle('naga-balustrade')).click());
    expect(isKhmerGuideText(host.textContent!)).toBe(true);
  });
});
