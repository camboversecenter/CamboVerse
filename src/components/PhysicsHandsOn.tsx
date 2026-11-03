import {useEffect, useMemo, useRef} from 'react';
import {useFrame} from '@react-three/fiber';
import {BufferGeometry, Group, Vector3} from 'three';
import {projectileFlightTime, projectileRange, projectileTrajectory, pendulumPosition, type CircuitAnalysis} from '../physics';
import {LabSlider3D} from './LabSlider3D';
import {useLabGrabbable} from './LabInteraction';
import {VRSurface} from './VRSurface';

export interface PhysicsHandsOnProps {
  angle: number; speed: number; launchId: number; onAngle: (n:number)=>void; onSpeed: (n:number)=>void; onLaunch: ()=>void;
  length: number; amplitude: number; onLength: (n:number)=>void; onAmplitude: (n:number)=>void;
  circuit: CircuitAnalysis; onCircuit: ()=>void;
}

function Projectile({angle,speed,launchId,onAngle,onSpeed,onLaunch}: Pick<PhysicsHandsOnProps,'angle'|'speed'|'launchId'|'onAngle'|'onSpeed'|'onLaunch'>) {
  const ball = useRef<Group>(null), time = useRef(0), playing = useRef(false);
  const scale = 1.25 / Math.max(1, projectileRange(angle,speed));
  const trajectory = useMemo(() => new BufferGeometry().setFromPoints(projectileTrajectory(angle,speed).map(p=>new Vector3(-.6+p.x*scale,.12+p.y*scale,0))), [angle,speed,scale]);
  useEffect(()=>()=>trajectory.dispose(),[trajectory]);
  useEffect(()=>{playing.current=false;time.current=0;},[angle,speed]);
  useEffect(()=>{time.current=0;playing.current=launchId>0;},[launchId]);
  useFrame((_,dt)=>{
    if(!ball.current)return;
    if(playing.current)time.current=Math.min(projectileFlightTime(angle,speed),time.current+dt);
    const t=time.current, a=angle*Math.PI/180;
    ball.current.position.set(-.6+speed*Math.cos(a)*t*scale,.12+Math.max(0,speed*Math.sin(a)*t-4.905*t*t)*scale,0);
  });
  return <group position={[3.2,1.05,-4.2]}>
    <mesh position={[0,-.025,0]}><boxGeometry args={[1.5,.04,.4]}/><meshStandardMaterial color="#25424d"/></mesh>
    <lineSegments geometry={trajectory}><lineBasicMaterial color="#e5cb78"/></lineSegments>
    <group ref={ball}><mesh><sphereGeometry args={[.055,16,12]}/><meshStandardMaterial color="#ff914e"/></mesh></group>
    <group position={[0,.75,0]}><VRSurface variant="heading" title="Launch · compare the range" width={1.3} height={.14}/></group>
    <LabSlider3D label="Angle" value={angle} min={5} max={85} step={1} onChange={onAngle} position={[0,.52,.05]} unit="°"/>
    <LabSlider3D label="Speed" value={speed} min={5} max={50} step={1} onChange={onSpeed} position={[0,.27,.08]} unit=" m/s"/>
    <group position={[0,-.18,.25]}><VRSurface title="Launch" width={.5} height={.14} onClick={onLaunch}/></group>
  </group>;
}

function Pendulum({length,amplitude,onLength,onAmplitude}: Pick<PhysicsHandsOnProps,'length'|'amplitude'|'onLength'|'onAmplitude'>) {
  const bob=useRef<Group>(null), rod=useRef<Group>(null), time=useRef(0);
  const vectors=useMemo(()=>({axis:new Vector3(0,1,0),direction:new Vector3()}),[]);
  const L=.35+length*.12, pivot=1.15;
  const held=useLabGrabbable(bob,true,{onRelease:(object,cancelled)=>{
    if(!cancelled)onAmplitude(Math.max(5,Math.min(80,Math.round(Math.abs(Math.atan2(object.position.x,pivot-object.position.y)*180/Math.PI)))));
    time.current=0;
  }});
  useEffect(()=>{time.current=0;},[length,amplitude]);
  useFrame((_,dt)=>{
    if(!bob.current||!rod.current)return;
    if(!held()){
      time.current+=dt;const angle=pendulumPosition(length,amplitude*Math.PI/180,time.current);
      bob.current.position.set(Math.sin(angle)*L,pivot-Math.cos(angle)*L,0);
    }
    const x=bob.current.position.x,y=bob.current.position.y-pivot,z=bob.current.position.z;
    rod.current.position.set(x/2,pivot+y/2,z/2);
    rod.current.scale.y=Math.hypot(x,y,z);
    rod.current.quaternion.setFromUnitVectors(vectors.axis,vectors.direction.set(x,y,z).normalize());
  });
  return <group position={[-4.2,.1,3]}>
    <mesh position={[0,.6,-.08]}><boxGeometry args={[.04,1.2,.04]}/><meshStandardMaterial color="#8da2a8"/></mesh>
    <group ref={rod}><mesh><cylinderGeometry args={[.007,.007,1,6]}/><meshStandardMaterial color="#9dc5cd"/></mesh></group>
    <group ref={bob}><mesh><sphereGeometry args={[.09,16,12]}/><meshStandardMaterial color="#e9bc62"/></mesh></group>
    <group position={[0,1.65,0]}><VRSurface variant="heading" title="Grip the bob · release to swing" width={1.3} height={.14}/></group>
    <LabSlider3D label="Length" value={length} min={.1} max={5} step={.1} onChange={onLength} position={[0,1.42,0]} unit=" m"/>
  </group>;
}

export function PhysicsHandsOn(props: PhysicsHandsOnProps) {
  return <>
    <Projectile {...props}/><Pendulum {...props}/>
    <group position={[-4.2,1.15,0]}>
      <mesh position={[0,-.14,0]}><boxGeometry args={[.65,.04,.4]}/><meshStandardMaterial color="#235950"/></mesh>
      <mesh><sphereGeometry args={[.11,16,12]}/><meshStandardMaterial color="#fff3b0" emissive="#ffdf62" emissiveIntensity={props.circuit.bulbBrightness*2}/></mesh>
      <group position={[0,.5,0]}><VRSurface variant="heading" title={`Circuit · ${(props.circuit.current*1000).toFixed(1)} mA`} width={1.2} height={.15}/></group>
      <group position={[0,.27,0]}><VRSurface title="Change circuit preset" width={.9} height={.15} onClick={props.onCircuit}/></group>
    </group>
  </>;
}
