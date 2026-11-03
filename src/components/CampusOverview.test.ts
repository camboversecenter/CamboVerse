// @vitest-environment jsdom
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {act,createElement} from 'react';
import {createRoot,type Root} from 'react-dom/client';
import {PerspectiveCamera,Vector3} from 'three';
import {CampusOverview} from './CampusOverview';

const mock=vi.hoisted(()=>({camera:null as unknown,immersive:false}));
vi.mock('@react-three/fiber',()=>({useThree:(select:(state:unknown)=>unknown)=>select(mock)}));
vi.mock('@react-three/xr',()=>({useXR:()=>mock.immersive}));
vi.mock('./ExploreControls',async()=>{
  const {forwardRef}=await import('react');
  return {ExploreControls:forwardRef(()=>null)};
});
let camera:PerspectiveCamera,root:Root,host:HTMLDivElement;
beforeEach(()=>{vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true);camera=new PerspectiveCamera();mock.camera=camera;mock.immersive=false;host=document.createElement('div');root=createRoot(host);});
afterEach(async()=>{await act(async()=>root.unmount());vi.unstubAllGlobals();});
describe('campus overview camera',()=>{
  it('replaces a walking pose with an upright view of the campus and supports reset',async()=>{
    camera.position.set(-3,1.25,265);camera.rotation.set(1.2,.8,.5);
    await act(async()=>root.render(createElement(CampusOverview,{resetKey:0})));
    expect(camera.position.toArray()).toEqual([30,120,320]);
    expect(camera.getWorldDirection(new Vector3()).dot(new Vector3(24,6,70).sub(camera.position).normalize())).toBeCloseTo(1);
    camera.position.set(400,10,-20);
    await act(async()=>root.render(createElement(CampusOverview,{resetKey:1})));
    expect(camera.position.toArray()).toEqual([30,120,320]);
  });
  it('does not touch the headset pose and restores overview after leaving VR',async()=>{
    mock.immersive=true;camera.position.set(1,1.6,2);
    await act(async()=>root.render(createElement(CampusOverview,{resetKey:0})));
    expect(camera.position.toArray()).toEqual([1,1.6,2]);
    mock.immersive=false;
    await act(async()=>root.render(createElement(CampusOverview,{resetKey:0})));
    expect(camera.position.toArray()).toEqual([30,120,320]);
  });
});
