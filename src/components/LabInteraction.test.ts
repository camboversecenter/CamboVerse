// @vitest-environment jsdom
import {act,createElement,useEffect} from 'react';
import {createRoot} from 'react-dom/client';
import {describe,it,expect,vi} from 'vitest';
import {BoxGeometry,Group,Matrix4,Mesh,MeshBasicMaterial,Quaternion,Vector3} from 'three';
import {LabInteractionProvider,useLabInteraction} from './LabInteraction';
import type {LabManipulation} from '../labManipulation';

const mock=vi.hoisted(()=>({frame:null as unknown as (s:unknown,dt:number,frame:unknown)=>void,state:{} as unknown}));
vi.mock('@react-three/fiber',()=>({useFrame:(f:typeof mock.frame)=>{mock.frame=f;}}));
vi.mock('@react-three/xr',()=>({useXRStore:()=>({getState:()=>mock.state})}));

describe('native controller pose bridge',()=>{
  it('uses target-ray space to select, grip space to hold, and the current walking origin',async()=>{
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true);
    const host=document.createElement('div'),root=createRoot(host);
    const origin=new Group();origin.position.set(2,0,3);origin.rotation.y=.7;
    const specimen=new Group();specimen.position.set(0,1.2,-.6);origin.add(specimen);
    specimen.add(new Mesh(new BoxGeometry(.2,.2,.2),new MeshBasicMaterial()));origin.updateMatrixWorld(true);
    const raySpace={},gripSpace={},press={state:'default'},reference={};
    mock.state={origin,originReferenceSpace:reference,session:{visibilityState:'visible'},inputSourceStates:[{
      id:'right',type:'controller',inputSource:{handedness:'right',targetRaySpace:raySpace,gripSpace},gamepad:{'xr-standard-squeeze':press},
    }]};
    let engine:LabManipulation|null=null;
    function Register(){const value=useLabInteraction();engine=value;useEffect(()=>value!.register(specimen,()=>({})),[value]);return null;}
    const ray=new Matrix4().makeTranslation(0,1.2,0);
    const grip=new Matrix4().compose(new Vector3(0,1.2,0),new Quaternion().setFromAxisAngle(new Vector3(1,0,0),.7),new Vector3(1,1,1));
    const frame={getPose:(space:unknown,ref:unknown)=>{expect(ref).toBe(reference);return {transform:{matrix:(space===raySpace?ray:grip).elements}};}};
    try {
      await act(async()=>root.render(createElement(LabInteractionProvider,null,createElement(Register))));
      mock.frame({},1/60,frame);press.state='pressed';mock.frame({},1/60,frame);
      expect(engine!.isHeld(specimen)).toBe(true);expect(engine!.ownsGrip('right')).toBe(true);
      grip.setPosition(.3,1.2,0);mock.frame({},1/60,frame);
      expect(specimen.position.x).toBeCloseTo(.3);expect(specimen.position.z).toBeCloseTo(-.6);
      mock.frame({},1/60,{getPose:()=>undefined});expect(engine!.isHeld(specimen)).toBe(false);
      expect(specimen.position.x).toBeCloseTo(0);
    } finally {await act(async()=>root.unmount());host.remove();vi.unstubAllGlobals();}
  });
});
