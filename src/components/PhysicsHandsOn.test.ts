// @vitest-environment jsdom
import {act, createElement as h, useState} from 'react';
import {Simulate} from 'react-dom/test-utils';
import {createRoot} from 'react-dom/client';
import {expect, it, vi} from 'vitest';
import {ENERGY_SCENARIOS, SIMPLE_MACHINES, energyAtHeight, slopeForces} from '../physics';
import {PhysicsHandsOn} from './PhysicsHandsOn';

vi.mock('@react-three/fiber',()=>({useFrame:()=>{}}));
vi.mock('./LabInteraction',()=>({useLabGrabbable:()=>()=>false}));
vi.mock('./LabSlider3D',()=>({LabSlider3D:({label,value,onChange}:{label:string;value:number;onChange:(n:number)=>void})=>
  h('input',{'aria-label':label,value,onChange:(e:React.ChangeEvent<HTMLInputElement>)=>onChange(Number(e.target.value))})}));
vi.mock('./VRSurface',()=>({VRSurface:({title,onClick}:{title:string;onClick?:()=>void})=>
  onClick?h('button',{onClick},title):h('span',null,title)}));

it('connects ramp and machine controls to the same live state and release command',async()=>{
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true);
  const error=vi.spyOn(console,'error').mockImplementation(()=>{}), release=vi.fn();
  const host=document.createElement('div'),root=createRoot(host);
  function Demo(){
    const [angle,setAngle]=useState(15),[mu,setMu]=useState(.6),[effort,setEffort]=useState(100),[index,setIndex]=useState(0);
    return h(PhysicsHandsOn,{angle:45,speed:15,launchId:0,onAngle:()=>{},onSpeed:()=>{},onLaunch:()=>{},
      length:1,amplitude:30,onLength:()=>{},onAmplitude:()=>{},circuit:{current:0,bulbBrightness:0} as never,onCircuit:()=>{},
      machine:SIMPLE_MACHINES[index],effort,onEffort:setEffort,onNextMachine:()=>setIndex((index+1)%SIMPLE_MACHINES.length),
      slopeMass:5,slopeAngle:angle,slopeMu:mu,onSlopeAngle:setAngle,onSlopeMu:setMu,releaseId:0,onReleaseSlope:release,
      energy:ENERGY_SCENARIOS[0],energyHeight:5,onEnergyHeight:()=>{},onNextEnergy:()=>{}});
  }
  try {
    await act(async()=>root.render(h(Demo)));
    expect(host.textContent).toContain('friction holds');
    const input=host.querySelector<HTMLInputElement>('[aria-label="Friction"]')!;
    await act(async()=>Simulate.change(input,{target:{value:'0.1'}} as never));
    expect(slopeForces(5,15,.1).slides).toBe(true);
    expect(host.textContent).toContain('gravity wins');
    await act(async()=>Array.from(host.querySelectorAll('button')).find(b=>b.textContent==='Release block')!.click());
    expect(release).toHaveBeenCalledTimes(1);
    await act(async()=>Array.from(host.querySelectorAll('button')).find(b=>b.textContent==='Next machine')!.click());
    expect(host.textContent).toContain('Pulley');
  } finally {await act(async()=>root.unmount());error.mockRestore();vi.unstubAllGlobals();}
});

it('conserves energy through a fall and preserves initial speed for the rolling example',()=>{
  const shelf=ENERGY_SCENARIOS[0], rolling=ENERGY_SCENARIOS[1];
  const top=energyAtHeight(shelf,5), ground=energyAtHeight(shelf,0);
  expect(top.kinetic).toBeCloseTo(0);expect(ground.potential).toBeCloseTo(0);
  expect(ground.kinetic).toBeCloseTo(top.total);
  expect(energyAtHeight(rolling,0).kinetic).toBeCloseTo(50);
});
