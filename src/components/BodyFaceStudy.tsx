import { Suspense, useEffect, useMemo, useRef } from 'react';
import { useAnimations, useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { Box3, DoubleSide, Group, Mesh, MeshStandardMaterial, Vector3 } from 'three';
import { ModelErrorBoundary } from './ModelErrorBoundary';
import { Body } from './LabBody';
import type { Detail } from './LabOrgans';
type Props={detail:Detail;selected:string|null;taken:string|null;pick:(id:string)=>void;turn:number;spin:boolean;trayRotX:number;trayZoom:number};
export function BodyFaceStudy(props:Props){
 const fallback=<Body layer="whole" detail={props.detail} onPick={props.pick}/>;
 return <ModelErrorBoundary key={props.detail} fallback={fallback}><Suspense fallback={fallback}><Loaded {...props}/></Suspense></ModelErrorBoundary>;
}
function Loaded({detail,selected,taken,pick,turn,spin,trayRotX,trayZoom}:Props){
 const {scene,animations}=useGLTF(`/models/local/lab-body-face-v3-${detail}.glb`);
 const root=useRef<Group>(null);
 const {model,parts}=useMemo(()=>{
  const model=scene.clone(true);model.updateMatrixWorld(true);
  const parts=new Map<string,{group:Group;home:Vector3;size:number}>();
  const meshes:Mesh[]=[];
  model.traverse(o=>{if(o instanceof Mesh){o.material=(Array.isArray(o.material)?o.material:[o.material]).map(m=>m.clone());o.castShadow=detail==='ultra';meshes.push(o);}});
  for(const mesh of meshes){
   const id=mesh.userData.faceId as string|undefined;
   mesh.userData.organId=id??'skin';
   if(!id)continue;
   (mesh.material as MeshStandardMaterial[]).forEach(m=>{m.side=DoubleSide;});
   if(!parts.has(id)){const group=new Group();group.userData.organId=id;model.add(group);parts.set(id,{group,home:new Vector3(),size:1});}
   parts.get(id)!.group.attach(mesh);
  }
  for(const part of parts.values()){
   const box=new Box3().setFromObject(part.group,true);box.getCenter(part.home);part.size=Math.max(...box.getSize(new Vector3()).toArray());
   part.group.position.copy(part.home);part.group.children.forEach(o=>o.position.sub(part.home));
  }
  return {model,parts};
 },[scene,detail]);
 const {actions}=useAnimations(animations,root);
 useEffect(()=>{Object.values(actions).forEach(a=>a?.play());return()=>{Object.values(actions).forEach(a=>a?.stop());};},[actions]);
 useEffect(()=>{model.traverse(o=>{if(o instanceof Mesh)(o.material as MeshStandardMaterial[]).forEach(m=>{m.emissive?.set(o.userData.organId===selected?'#734920':'#000000');m.emissiveIntensity=.25;});});},[model,selected]);
 useEffect(()=>()=>model.traverse(o=>{if(o instanceof Mesh)(o.material as MeshStandardMaterial[]).forEach(m=>m.dispose());}),[model]);
 const angle=useRef(0);
 useFrame((_,dt)=>{
  if(spin)angle.current+=dt*.35;
  for(const [id,p] of parts){const active=id===taken;
   p.group.position.copy(active?new Vector3(140,13,45):p.home);
   p.group.scale.setScalar(active?48/p.size*trayZoom:1);
   p.group.rotation.set(active?trayRotX:0,active?turn+(spin?angle.current:0):0,0);
  }
 });
 return <group ref={root} onClick={e=>{e.stopPropagation();pick(e.object.userData.organId??'skin');}}><primitive object={model} dispose={null}/></group>;
}
