import { useRef, type MutableRefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import type { Object3D } from 'three';
import { FirstPersonControls, type WalkInput } from './FirstPersonControls';
import { nearestCeremonyStop, type CeremonyStop } from '../ceremonyWalk';

/** Shared lab movement, with the loaded Blender meshes as the collision world. */
export function CeremonyWalk({input,collision,enabled,start,onNear,stops}:{
  input:MutableRefObject<WalkInput>;collision:MutableRefObject<Object3D|null>;
  enabled:boolean;start:CeremonyStop;onNear:(stop:CeremonyStop|null)=>void;stops:readonly CeremonyStop[];
}) {
  const last=useRef<string|null|undefined>(undefined);
  useFrame(({camera,gl})=>{
    if(!enabled||gl.xr.isPresenting)return;
    const near=nearestCeremonyStop(stops,camera.position.x,camera.position.y,camera.position.z);
    if(near?.id!==last.current){last.current=near?.id;onNear(near);}
  });
  return <>
    <FirstPersonControls input={input} collision={collision} enabled={enabled}
      start={[...start.position]} startYaw={start.yaw??(start.id==='offerings'?.8:start.id==='community'?-2.4:0)}
      startPitch={start.pitch??(start.id==='offerings'||start.id==='community'?-.55:-.04)}
      eyeHeight={1.6} speed={1.9} terrainWalking allowJump={false}
      bounds={{minX:-9,maxX:9,minZ:-9.8,maxZ:8}} />
    {stops.map((s,i)=><group key={s.id} position={[s.position[0],s.position[1]-1.58,s.position[2]]}>
      <mesh rotation={[-Math.PI/2,0,0]}><ringGeometry args={[.25,.29,24]}/><meshBasicMaterial color="#f4d791" depthWrite={false}/></mesh>
      <Html center position={[0,.38,0]} distanceFactor={4} zIndexRange={[9,0]} style={{pointerEvents:'none'}}><span className="pchum-waypoint">{i+1} · {s.name}</span></Html>
    </group>)}
  </>;
}
