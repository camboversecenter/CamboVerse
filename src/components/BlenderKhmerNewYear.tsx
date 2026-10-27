import { Suspense, useEffect, useMemo, type MutableRefObject } from 'react';
import { Html,useGLTF } from '@react-three/drei';
import { Mesh,type Object3D } from 'three';
import type { Detail } from './LabOrgans';
import { AssetBoundary } from './BlenderPchumBen';
import { NEW_YEAR_OBJECTS,newYearAsset,type NewYearObject } from '../khmerNewYearStudy';

const anchors:Record<NewYearObject,[number,number,number]>={welcome:[-3,.54,2.3],generosity:[0,.35,-4.5],sand:[3,.03,1],water:[-3,.5,-1.4],games:[5.6,.02,-3.2]};
function Asset({detail,roof,selected,onSelect,collision,onReady}:{detail:Detail;roof:boolean;selected:NewYearObject|null;onSelect:(id:NewYearObject)=>void;collision:MutableRefObject<Object3D|null>;onReady:(detail:Detail)=>void}){
  const asset=useGLTF(newYearAsset(detail));
  const scene=useMemo(()=>asset.scene.clone(true),[asset.scene]);
  useEffect(()=>{collision.current=scene;onReady(detail);return()=>{collision.current=null;};},[scene,collision,detail,onReady]);
  useEffect(()=>{const canopy=scene.getObjectByName('roof');if(canopy)canopy.visible=roof;scene.traverse(o=>{if(o instanceof Mesh){o.castShadow=detail==='ultra';o.receiveShadow=detail==='ultra';}});},[scene,roof,detail]);
  return <group>
    <primitive object={scene} dispose={null} onClick={(e:{stopPropagation:()=>void;object:Object3D})=>{const id=e.object.userData.study_part;if(typeof id==='string'&&id in NEW_YEAR_OBJECTS){e.stopPropagation();onSelect(id as NewYearObject);}}}/>
    {selected&&<mesh position={anchors[selected]} rotation={[-Math.PI/2,0,0]}><ringGeometry args={[.7,.75,32]}/><meshBasicMaterial color="#ffe1a2" depthTest={false}/></mesh>}
  </group>;
}
export function BlenderKhmerNewYear(props:Parameters<typeof Asset>[0]){
  return <AssetBoundary key={props.detail}><Suspense fallback={<Html center><div className="pchum-load" role="status">Loading Khmer New Year…</div></Html>}><Asset {...props}/></Suspense></AssetBoundary>;
}
