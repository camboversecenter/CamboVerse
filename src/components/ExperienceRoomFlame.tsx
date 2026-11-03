import {useRef} from 'react';
import {Group} from 'three';
import {FLAME_TESTS, type FlameTestEntry} from '../chemistry';
import {useLabGrabbable} from './LabInteraction';
import {VRSurface} from './VRSurface';

/** Sample positions and burner are local to the tabletop. */
export function sampleInFlame(x:number,y:number,z:number) {
  return Number.isFinite(x+y+z) && Math.hypot(x,y-.27,z) < .22;
}

/** Shared qualitative explanation; measured spectral lines need separate review. */
export function flameExplanation(entry:FlameTestEntry) {
  return `When ${entry.name} ions absorb energy, their electrons can move to higher energy levels. As they return to lower levels, they emit light; the characteristic flame colour is ${entry.color.toLowerCase()}.`;
}

function Sample({entry,x,onSelect}:{entry:FlameTestEntry;x:number;onSelect:(entry:FlameTestEntry)=>void}) {
  const object=useRef<Group>(null), applied=useRef(false);
  useLabGrabbable(object,true,{
    onMove: current=>{
      if (!applied.current && sampleInFlame(current.position.x,current.position.y,current.position.z)) {
        applied.current=true;onSelect(entry);
      }
    },
    onRelease:()=>{applied.current=false;},
  });
  return <group ref={object} position={[x,0,.22]} onClick={e=>{e.stopPropagation();onSelect(entry);}}>
    <mesh><cylinderGeometry args={[.035,.035,.14,12]}/><meshStandardMaterial color="#ded6bf"/></mesh>
    <mesh position={[0,.08,0]}><sphereGeometry args={[.04,12,8]}/><meshStandardMaterial color={entry.hex}/></mesh>
    <group position={[0,-.12,0]}><VRSurface title={entry.ion} variant="text" width={.18} height={.08}/></group>
  </group>;
}

export function ExperienceRoomFlame({selected,onSelect}:{selected:FlameTestEntry|null;onSelect:(entry:FlameTestEntry)=>void}) {
  return <group position={[-4.2,1.22,3]} rotation-y={Math.PI/2}>
    <mesh position={[0,-.12,0]}><boxGeometry args={[1.55,.05,.7]}/><meshStandardMaterial color="#294c4d"/></mesh>
    <mesh position={[0,.05,0]}><cylinderGeometry args={[.07,.11,.32,16]}/><meshStandardMaterial color="#889fa4" metalness={.5}/></mesh>
    <mesh position={[0,.27,0]}><coneGeometry args={[.105,.32,16]}/><meshBasicMaterial color={selected?.hex ?? '#67bbf2'} transparent opacity={.85}/></mesh>
    <mesh position={[0,.27,0]} rotation-x={Math.PI/2}><torusGeometry args={[.17,.006,6,32]}/><meshBasicMaterial color="#e5cb78"/></mesh>
    <group position={[0,.63,0]}><VRSurface variant="heading" title="Grip a sample and move it to the flame" width={1.65} height={.15}/></group>
    <group position={[0,.46,0]}><VRSurface variant="text" title={selected ? `${selected.name}: ${selected.color}` : 'Or point and select a sample'} width={1.4} height={.12}/></group>
    {FLAME_TESTS.map((entry,i)=><Sample key={entry.ion} entry={entry} x={(i-3)*.2} onSelect={onSelect}/>)}
  </group>;
}
