import { Suspense, useMemo, type ReactNode } from 'react';
import { useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { Group, Mesh } from 'three';
import { ModelErrorBoundary } from './ModelErrorBoundary';

export function EarthSkyBlenderProp({kind,position,ultra,fallback}: {
  kind:string;position:[number,number,number];ultra:boolean;fallback:ReactNode;
}) {
  if (!import.meta.env.DEV) return fallback;
  return <ModelErrorBoundary key={`${kind}-${ultra}`} fallback={fallback}>
    <Suspense fallback={fallback}><Loaded kind={kind} position={position} ultra={ultra}/></Suspense>
  </ModelErrorBoundary>;
}
function Loaded({kind,position,ultra}:{kind:string;position:[number,number,number];ultra:boolean}) {
  const {scene}=useGLTF(`/models/local/earthsky-${kind}-v1-${ultra?'ultra':'normal'}.glb`);
  const copy=useMemo(()=>{
    const model=scene.clone(true);
    const earth=new Group();earth.name='animated-earth';
    const surfaces=model.children.filter(o=>o.name==='earth-ocean'||o.name.startsWith('latitude')||o.name.startsWith('longitude'));
    model.add(earth);surfaces.forEach(o=>earth.add(o));
    model.traverse(o=>{if(o instanceof Mesh)o.castShadow=ultra;});return model;
  },[scene,ultra]);
  const motion=useMemo(()=>{
    const earth=copy.getObjectByName('animated-earth')!;
    return {earth,moon:copy.getObjectByName('moon'),pivots:Array.from({length:4},(_,i)=>copy.getObjectByName(`orbit-pivot-${i}`))};
  },[copy]);
  useFrame(({clock})=>{
    motion.pivots.forEach((pivot,i)=>{if(pivot)pivot.rotation.y=clock.elapsedTime*.5/(i+1)+i*.9;});
    if(kind==='globe')motion.earth.rotation.y=clock.elapsedTime*.15;
    if(kind==='moon'&&motion.moon)motion.moon.position.set(Math.cos(clock.elapsedTime*.2)*.36,0,Math.sin(clock.elapsedTime*.2)*.36);
  });
  return <group position={position}><primitive object={copy} dispose={null}/></group>;
}
