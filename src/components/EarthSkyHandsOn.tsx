import {useMemo, useRef} from 'react';
import {useFrame} from '@react-three/fiber';
import {Color, Group, Vector3} from 'three';
import {EARTH_LAYERS, PLANETS, SEASONS, type EarthLayer, type Planet} from '../earthsky';
import {LabSlider3D} from './LabSlider3D';
import {useLabGrabbable} from './LabInteraction';
import {VRSurface} from './VRSurface';

// These teaching models need a visible day/night terminator independent of the
// room's ambient lighting. Otherwise moving the Moon never shows its lit half.
function SunlitSphere({radius,color,sun}: {radius:number;color:string;sun:[number,number,number]}) {
  const [x,y,z]=sun;
  const uniforms=useMemo(()=>({base:{value:new Color(color)},sun:{value:new Vector3(x,y,z)}}),[color,x,y,z]);
  return <mesh><sphereGeometry args={[radius,32,24]}/><shaderMaterial uniforms={uniforms}
    vertexShader={`varying vec3 surfaceNormal; varying vec3 surfacePosition;
      void main() {vec4 world = modelMatrix * vec4(position, 1.0);
        surfacePosition = world.xyz; surfaceNormal = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * viewMatrix * world;}`}
    fragmentShader={`uniform vec3 base; uniform vec3 sun;
      varying vec3 surfaceNormal; varying vec3 surfacePosition;
      void main() {float light = max(0.0, dot(normalize(surfaceNormal), normalize(sun - surfacePosition)));
        gl_FragColor = vec4(base * (0.06 + 0.94 * light), 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`}/></mesh>;
}

function Sample({at,color,size,label,onSelect,half=false}: {at:[number,number,number];color:string;size:number;label:string;onSelect:()=>void;half?:boolean}) {
  const ref=useRef<Group>(null);
  useLabGrabbable(ref,true,{onRelease:(_,cancelled)=>{if(!cancelled)onSelect();}});
  return <group ref={ref} position={at} onClick={e=>{e.stopPropagation();onSelect();}}>
    <mesh><sphereGeometry args={[size,24,16,0,half?Math.PI:Math.PI*2]}/><meshStandardMaterial color={color} side={2}/></mesh>
    <group position={[0,-size-.08,0]}><VRSurface variant="text" title={label} width={.38} height={.09}/></group>
  </group>;
}

function Orbit({at,angle,onChange,tides=false}: {at:[number,number,number];angle:number;onChange:(n:number)=>void;tides?:boolean}) {
  const moon=useRef<Group>(null), elapsed=useRef(0);
  const commit=(object:Group)=>onChange((Math.round(Math.atan2(object.position.z,object.position.x)*180/Math.PI)+360)%360);
  const held=useLabGrabbable(moon,true,{onMove:(object,dt)=>{
    elapsed.current+=dt;
    if(elapsed.current>.1){elapsed.current=0;commit(object as Group);}
  },onRelease:(object,cancelled)=>{if(!cancelled)commit(object as Group);}});
  useFrame(()=>{if(moon.current&&!held())moon.current.position.set(Math.cos(angle*Math.PI/180)*.5,0,Math.sin(angle*Math.PI/180)*.5);});
  return <group position={at}>
    <mesh><sphereGeometry args={[.18,24,16]}/><meshStandardMaterial color="#4696bf"/></mesh>
    {tides && <group rotation-y={-angle*Math.PI/180}><mesh scale={[1.5,1,1]}><sphereGeometry args={[.2,24,16]}/><meshStandardMaterial color="#59b9d4" transparent opacity={.3} depthWrite={false}/></mesh></group>}
    <mesh rotation-x={Math.PI/2}><torusGeometry args={[.5,.005,4,48]}/><meshBasicMaterial color="#9ab8c1"/></mesh>
    <group ref={moon}><SunlitSphere radius={.065} color="#ded9c8" sun={[at[0]+1000,at[1],at[2]]}/></group>
    {!tides && <group position={[.9,0,0]}><mesh><sphereGeometry args={[.12,16,12]}/><meshBasicMaterial color="#ffd16b"/></mesh></group>}
    <group position={[0,.65,0]}><VRSurface variant="heading" title={tides?'Move the Moon · observe both bulges':'Grip the Moon · change its phase'} width={1.5} height={.15}/></group>
    <LabSlider3D label="Moon angle" value={angle} min={0} max={359} step={1} onChange={onChange} position={[0,.4,0]} unit="°"/>
  </group>;
}

function Globe({rotation,onRotation}: {rotation:number;onRotation:(n:number)=>void}) {
  const ref=useRef<Group>(null), forward=useMemo(()=>new Vector3(),[]);
  const held=useLabGrabbable(ref,true,{onRelease:(object,cancelled)=>{
    if(cancelled)return;
    forward.set(0,0,1).applyQuaternion(object.quaternion);
    onRotation((Math.round(Math.atan2(forward.x,forward.z)*180/Math.PI)+360)%360);
  }});
  useFrame(()=>{if(ref.current&&!held())ref.current.rotation.set(0,rotation*Math.PI/180,0);});
  return <group position={[4.5,1.25,-4.8]}>
    <group ref={ref}>
      <SunlitSphere radius={.26} color="#3c9bc3" sun={[1004.5,1.25,-4.8]}/>
      {[0,1,2].map(i=><mesh key={i} rotation={[0,0,i*Math.PI/3]}><torusGeometry args={[.265,.004,4,48]}/><meshBasicMaterial color="#a1d1b6"/></mesh>)}
      <mesh position={[.265,0,0]}><sphereGeometry args={[.035,12,8]}/><meshBasicMaterial color="#ffd775"/></mesh>
    </group>
    <mesh position={[.8,0,0]}><sphereGeometry args={[.13,16,12]}/><meshBasicMaterial color="#ffd16b"/></mesh>
    <group position={[0,.65,0]}><VRSurface variant="heading" title="Rotate Earth · follow the gold marker" width={1.5} height={.15}/></group>
    <LabSlider3D label="Earth rotation" value={rotation} min={0} max={359} step={1} onChange={onRotation} position={[0,.42,0]} unit="°"/>
  </group>;
}

export function EarthSkyHandsOn({rotation,onRotation,moonAngle,onMoon,seasonIndex,onSeason,tideAngle,onTide,onPlanet,onLayer}: {
  rotation:number;onRotation:(n:number)=>void;moonAngle:number;onMoon:(n:number)=>void;
  seasonIndex:number;onSeason:(n:number)=>void;tideAngle:number;onTide:(n:number)=>void;
  onPlanet:(p:Planet)=>void;onLayer:(l:EarthLayer)=>void;
}) {
  // March equinox starts perpendicular to the fixed tilt; June's north pole
  // then points toward the Sun, rather than labelling a solstice as an equinox.
  const seasonAngle=(seasonIndex-1)*Math.PI/2;
  return <>
    <Globe rotation={rotation} onRotation={onRotation}/>
    <Orbit at={[-5.5,1.2,0]} angle={moonAngle} onChange={onMoon}/>
    <Orbit at={[0,1.2,4.8]} angle={tideAngle} onChange={onTide} tides/>
    <group position={[0,1.2,-4.8]}>
      <group position={[0,.7,0]}><VRSurface variant="heading" title="Grip a planet · compare its facts" width={1.6} height={.15}/></group>
      {PLANETS.map((p,i)=><Sample key={p.id} at={[(i%4-1.5)*.5,Math.floor(i/4)*.35,0]} color={p.color} size={.09+i*.007} label={p.name} onSelect={()=>onPlanet(p)}/>)}
    </group>
    <group position={[-4.5,1.2,-4.8]}>
      <group position={[0,.65,0]}><VRSurface variant="heading" title="Pick up a layer · compare its properties" width={1.7} height={.15}/></group>
      {EARTH_LAYERS.map((l,i)=><Sample key={l.name} at={[(i-2)*.3,0,0]} color={l.color} size={.12} label={l.name} half onSelect={()=>onLayer(l)}/>)}
    </group>
    <group position={[5.5,1.2,0]}>
      <mesh><sphereGeometry args={[.14,20,16]}/><meshBasicMaterial color="#ffd16b"/></mesh>
      <group position={[Math.cos(seasonAngle)*.5,0,Math.sin(seasonAngle)*.5]} rotation-z={23.5*Math.PI/180}>
        <SunlitSphere radius={.12} color="#3c9bc3" sun={[5.5,1.2,0]}/>
        <mesh><cylinderGeometry args={[.006,.006,.38,6]}/><meshBasicMaterial color="#ffd775"/></mesh>
      </group>
      <group position={[0,.65,0]}><VRSurface variant="heading" title={SEASONS[seasonIndex].name} width={1.4} height={.15}/></group>
      <group position={[0,.4,0]}><VRSurface title="Next season" width={.9} height={.15} onClick={()=>onSeason((seasonIndex+1)%4)}/></group>
    </group>
  </>;
}
