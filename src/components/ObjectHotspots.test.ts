// @vitest-environment jsdom
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {act,createElement,type ReactNode,type RefObject} from 'react';
import {createPortal} from 'react-dom';
import {createRoot,type Root} from 'react-dom/client';
import {ObjectHotspotMarkers,ObjectInfoCard} from './ObjectHotspots';
import {OBJECT_INFO,STAIRCASE_OBJECT_ANCHORS} from '../objectHotspots';
import {isKhmerGuideText,KHMER_GUIDE} from '../guideKhmer';

const mocks=vi.hoisted(()=>({start:vi.fn(),stop:vi.fn(),dispose:vi.fn()}));
vi.mock('@react-three/xr',()=>({useXR:()=>false}));
vi.mock('@react-three/drei',()=>({Html:({children,portal,zIndexRange}:{children:ReactNode;portal?:RefObject<HTMLElement>;zIndexRange:number[]})=>{
  const marker=createElement('div',{'data-testid':'projected-marker',style:{position:'absolute',zIndex:zIndexRange[1]}},children);
  return portal?.current?createPortal(marker,portal.current):marker;
}}));
vi.mock('./VRObjectHotspots',()=>({VRObjectHotspots:()=>null}));
vi.mock('../lib/guideNarrator',()=>({GuideNarrator:class {start(...args:unknown[]){mocks.start(...args);} stop(){mocks.stop();} dispose(){mocks.dispose();}}}));
let root:Root,host:HTMLDivElement;
beforeEach(()=>{localStorage.clear();mocks.start.mockClear();vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true);host=document.createElement('div');host.className='viewer';document.body.append(host);root=createRoot(host);});
afterEach(async()=>{await act(async()=>root.unmount());host.remove();vi.unstubAllGlobals();});
describe('capture information labels',()=>{
  it('places clickable labels above the separate walking layer',async()=>{
    const select=vi.fn();
    const walk=document.createElement('div');walk.className='walk-layer';walk.style.zIndex='15';document.body.append(walk);
    await act(async()=>root.render(createElement(ObjectHotspotMarkers,{anchors:STAIRCASE_OBJECT_ANCHORS,onSelect:select,vrPenhGuide:true})));
    const markers=[...document.querySelectorAll<HTMLElement>('[data-testid="projected-marker"]')];
    expect(markers).toHaveLength(2);
    expect(markers.every(marker=>marker.parentElement===document.body&&Number(marker.style.zIndex)>15)).toBe(true);
    await act(async()=>markers[0].querySelector('button')!.click());expect(select).toHaveBeenCalledWith('naga-balustrade');
    await act(async()=>markers[1].querySelector('button')!.click());expect(select).toHaveBeenCalledWith('guardian-lion');
    walk.remove();
  });
  it('uses Penh narration for the object card even without a browser voice',async()=>{
    await act(async()=>root.render(createElement(ObjectInfoCard,{object:OBJECT_INFO['naga-balustrade'],guideName:'Penh',onClose:vi.fn()})));
    const listen=[...host.querySelectorAll('button')].find(button=>button.textContent?.includes('Listen'))!;
    await act(async()=>listen.click());
    expect(mocks.start).toHaveBeenCalledWith(expect.stringContaining('Naga balustrade.'),'en-US','penh');
  });
  it('renders and narrates the Khmer object information in Khmer',async()=>{
    localStorage.setItem('camboverse-penh-language','km');
    await act(async()=>root.render(createElement(ObjectInfoCard,{object:OBJECT_INFO['naga-balustrade'],guideName:'Penh',onClose:vi.fn()})));
    expect(isKhmerGuideText(host.textContent!)).toBe(true);
    await act(async()=>[...host.querySelectorAll('button')].find(button=>button.textContent===KHMER_GUIDE.listen)!.click());
    expect(isKhmerGuideText(mocks.start.mock.calls[0][0])).toBe(true);expect(mocks.start.mock.calls[0][1]).toBe('km-KH');
  });
});
