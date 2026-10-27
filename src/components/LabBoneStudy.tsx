import { Suspense, useContext, useEffect, useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import { Mesh, type MeshStandardMaterial } from 'three';
import type { Detail } from './LabOrgans';
import { ModelErrorBoundary } from './ModelErrorBoundary';
import { LabPreviewContext } from './LabPreviewContext';

export function LabBoneStudy({detail,mode}: {detail:Detail;mode:'macro'|'cutaway'|'micro'}) {
  const preview = useContext(LabPreviewContext);
  if (preview) return <BonePreview mode={mode} />;
  return <><ambientLight intensity={.6}/><directionalLight position={[20,30,40]} intensity={1.8}/>
    <ModelErrorBoundary key={`${mode}-${detail}`} fallback={null}><Suspense fallback={null}><Loaded detail={detail} mode={mode}/></Suspense></ModelErrorBoundary></>;
}

/** Lightweight, explicitly schematic silhouette for the offline catalog image. */
function BonePreview({ mode }: { mode: 'macro' | 'cutaway' | 'micro' }) {
  if (mode === 'micro') return <group rotation={[0.4, 0.25, 0]}>
    {[1.5, 2.5, 3.5, 4.5].map(radius => <mesh key={radius}>
      <torusGeometry args={[radius, 0.35, 8, 48]} />
      <meshStandardMaterial color={radius > 3 ? '#d9c7a3' : '#cda982'} roughness={0.75} />
    </mesh>)}
    <mesh><cylinderGeometry args={[0.7, 0.7, 1.2, 20]} /><meshStandardMaterial color="#ad6070" /></mesh>
  </group>;
  return <group rotation={[0.15, 0, -0.2]}>
    <mesh><cylinderGeometry args={[mode === 'cutaway' ? 2.8 : 2.4, 2.1, 25, 24]} />
      <meshStandardMaterial color="#d8c8a7" roughness={0.8} /></mesh>
    <mesh position={[0, 12.2, 0]} scale={[3.7, 2.8, 3]}><sphereGeometry args={[1, 16, 12]} /><meshStandardMaterial color="#e4d4b5" /></mesh>
    <mesh position={[0, -12.2, 0]} scale={[3.5, 2.6, 3]}><sphereGeometry args={[1, 16, 12]} /><meshStandardMaterial color="#e4d4b5" /></mesh>
    {mode === 'cutaway' && <mesh position={[0, 0, 2.1]}><cylinderGeometry args={[1.1, 0.9, 20, 16]} />
      <meshStandardMaterial color="#b56766" roughness={0.85} /></mesh>}
  </group>;
}
function Loaded({detail,mode}: {detail:Detail;mode:'macro'|'cutaway'|'micro'}) {
  const version=mode==='macro'?'v2':'v1';
  const {scene}=useGLTF(`/models/local/humerus-study-${version}-${mode}-${detail}.glb`);
  const model=useMemo(()=>{
    const copy=scene.clone(true);
    copy.traverse(o=>{if(o instanceof Mesh){
      o.material=(Array.isArray(o.material)?o.material[0]:o.material).clone();
      o.castShadow=detail==='ultra';
    }});return copy;
  },[scene,detail]);
  useEffect(()=>()=>model.traverse(o=>{if(o instanceof Mesh)(o.material as MeshStandardMaterial).dispose();}),[model]);
  return <primitive object={model} dispose={null}/>;
}
