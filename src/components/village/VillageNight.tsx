import { useMemo } from 'react';
import { houses, local } from './layout';

export function VillageNight({ night }: { night: boolean }) {
  const stars = useMemo(() => {
    const positions=[];
    for(let i=0;i<100;i++) {
      const a=i*2.399963, y=20+(i%29)*1.7, r=60+(i%13);
      positions.push(Math.cos(a)*r,y,Math.sin(a)*r);
    }
    return new Float32Array(positions);
  },[]);
  return <group>
    {houses.map((h,i) => {
      const p=local(h,1.25,1.7);
      return <group key={i} position={[p.position[0],2.65,p.position[2]]}>
        <mesh><boxGeometry args={[.18,.3,.18]} /><meshStandardMaterial color="#e6be75" emissive="#ffa541" emissiveIntensity={night?3:0} /></mesh>
        {night && <mesh rotation={[-Math.PI/2,0,0]} position={[0,-2.57,0]}><circleGeometry args={[1.65,16]} /><meshBasicMaterial color="#f4b656" transparent opacity={.13} depthWrite={false} /></mesh>}
      </group>;
    })}
    {night && <>
      <points><bufferGeometry><bufferAttribute attach="attributes-position" args={[stars,3]} /></bufferGeometry><pointsMaterial color="#dce8ff" size={.12} sizeAttenuation fog={false} /></points>
      <mesh position={[-28,35,-35]}><sphereGeometry args={[1.7,16,12]} /><meshBasicMaterial color="#e7eddf" fog={false} /></mesh>
      <pointLight position={[-8,3.3,-5.5]} color="#ffbb73" intensity={22} distance={11} decay={2} />
      <pointLight position={[8,3.3,5.5]} color="#ffbb73" intensity={22} distance={11} decay={2} />
      <pointLight position={[0,4,-15]} color="#ffd18f" intensity={30} distance={13} decay={2} />
    </>}
  </group>;
}
