// @vitest-environment jsdom
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {act,createElement,type ReactNode,type RefObject} from 'react';
import {createPortal} from 'react-dom';
import {createRoot,type Root} from 'react-dom/client';
import {ObjectHotspotMarkers} from './ObjectHotspots';
import {STAIRCASE_OBJECT_ANCHORS} from '../objectHotspots';

vi.mock('@react-three/xr',()=>({useXR:()=>false}));
vi.mock('@react-three/drei',()=>({Html:({children,portal,zIndexRange}:{children:ReactNode;portal?:RefObject<HTMLElement>;zIndexRange:number[]})=>{
  const marker=createElement('div',{'data-testid':'projected-marker',style:{position:'absolute',zIndex:zIndexRange[1]}},children);
  return portal?.current?createPortal(marker,portal.current):marker;
}}));
vi.mock('./VRObjectHotspots',()=>({VRObjectHotspots:()=>null}));
let root:Root,host:HTMLDivElement;
beforeEach(()=>{vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true);host=document.createElement('div');host.className='viewer';document.body.append(host);root=createRoot(host);});
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
});
