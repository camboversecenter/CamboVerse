import { Component, Suspense, useEffect, useMemo, type ReactNode, type MutableRefObject } from 'react';
import { Html, useGLTF } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import { Mesh, type Object3D } from 'three';
import type { Detail } from './LabOrgans';
import { PCHUM_BEN_ITEMS, PCHUM_BEN_OBJECTS, pchumBenAsset, type PchumBenObject } from '../pchumBenStudy';

export function PchumBenCamera({close}:{close:boolean}) {
  const {camera,size,gl}=useThree();
  useEffect(()=>{
    if(gl.xr.isPresenting)return;
    const d=Math.min(28,Math.max(close?4.8:16,(close?2:5)/(Math.tan(Math.PI*25/180)*size.width/size.height)));
    camera.position.set(d*.25,.7+d*.55,d*.88+(close?0:-2));camera.lookAt(0,close?.65:1,close?0:-2);camera.updateProjectionMatrix();
  },[camera,size.width,size.height,gl,close]);
  return null;
}
export class AssetBoundary extends Component<{children:ReactNode},{failed:boolean}> {
  state={failed:false};
  static getDerivedStateFromError(){return {failed:true};}
  render(){return this.state.failed?<Html center><div className="pchum-load" role="alert">The Blender model could not load. Check the local server, then reload this page. The lesson notes remain available.</div></Html>:this.props.children;}
}
const anchors:Record<PchumBenObject,[number,number,number]>={buddha:[0,1.5,-9.05],rice:[-.6,.28,.5],leaf:[.95,.28,.4],flags:[-.6,.28,.5],incense:[0,.28,-.65],receptacle:[1.9,.28,.1],alms:[.15,.28,.45],food:[0,.28,1.25],seating:[-2.6,.53,-.65]};
function Asset({detail,moment,roof,selected,onSelect,collision,onReady}:{detail:Detail;moment:string;roof:boolean;selected:PchumBenObject|null;onSelect:(id:PchumBenObject)=>void;collision:MutableRefObject<Object3D|null>;onReady:(detail:Detail)=>void}) {
  const asset=useGLTF(pchumBenAsset(detail));
  const scene=useMemo(()=>asset.scene.clone(true),[asset.scene]);
  const active=useMemo(()=>[...PCHUM_BEN_ITEMS[moment]??PCHUM_BEN_ITEMS['before-dawn'],'buddha'] as PchumBenObject[],[moment]);
  useEffect(()=>{collision.current=scene;onReady(detail);return()=>{collision.current=null;};},[scene,detail,collision,onReady]);
  useEffect(()=>{
    for(const id of Object.keys(PCHUM_BEN_OBJECTS)){
      const node=scene.getObjectByName(id);if(node)node.visible=active.includes(id as PchumBenObject);
    }
    const canopy=scene.getObjectByName('roof');if(canopy)canopy.visible=roof;
    scene.traverse(o=>{if(o instanceof Mesh){o.castShadow=detail==='ultra';o.receiveShadow=detail==='ultra';}});
  },[scene,active,roof,detail]);
  return <group>
    <primitive object={scene} dispose={null} onClick={(e:{stopPropagation:()=>void;object:{userData:Record<string,unknown>}})=>{
      const id=e.object.userData.study_part;
      if(typeof id==='string'&&id in PCHUM_BEN_OBJECTS){e.stopPropagation();onSelect(id as PchumBenObject);}
    }}/>
    {active.map(id=><mesh key={id} position={[anchors[id][0],id==='flags'?1.3:anchors[id][1]+.25,anchors[id][2]]} onClick={e=>{e.stopPropagation();onSelect(id);}}>
      <sphereGeometry args={[id==='flags'?.15:.36,8,6]}/><meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false}/>
    </mesh>)}
    {selected&&active.includes(selected)&&<mesh position={anchors[selected]} rotation={[-Math.PI/2,0,0]}><ringGeometry args={[.67,.71,32]}/><meshBasicMaterial color="#f2d995" depthTest={false}/></mesh>}
  </group>;
}
export function BlenderPchumBen(props:Parameters<typeof Asset>[0]) {
  return <AssetBoundary key={props.detail}><Suspense fallback={<Html center><div className="pchum-load" role="status">Loading the Blender ceremony model…</div></Html>}><Asset {...props}/></Suspense></AssetBoundary>;
}
