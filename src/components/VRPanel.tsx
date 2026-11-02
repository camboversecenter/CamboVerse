import {useMemo} from 'react';
import {Shape} from 'three';
import {VRSurface} from './VRSurface';
import {KHMER_GUIDE} from '../guideKhmer';

/** Shallow rounded frame shared by menu, object details and Penh. */
export function VRPanelFrame({width=1.48,height=1.55}:{width?:number;height?:number}){
  const shape=useMemo(()=>{
    const s=new Shape(),x=-width/2,y=-height/2,r=.05;
    s.moveTo(x+r,y);s.lineTo(x+width-r,y);s.quadraticCurveTo(x+width,y,x+width,y+r);
    s.lineTo(x+width,y+height-r);s.quadraticCurveTo(x+width,y+height,x+width-r,y+height);
    s.lineTo(x+r,y+height);s.quadraticCurveTo(x,y+height,x,y+height-r);
    s.lineTo(x,y+r);s.quadraticCurveTo(x,y,x+r,y);return s;
  },[width,height]);
  return <group pointerEvents="none">
    <mesh position={[0,-.015,-.018]} renderOrder={1997}><shapeGeometry args={[shape]}/><meshBasicMaterial color="#071b17" transparent depthTest={false} depthWrite={false} toneMapped={false}/></mesh>
    <mesh position={[0,0,-.012]} renderOrder={1998}><shapeGeometry args={[shape]}/><meshBasicMaterial color="#a39359" transparent depthTest={false} depthWrite={false} toneMapped={false}/></mesh>
    <mesh position={[0,0,-.006]} scale={[.992,.992,1]} renderOrder={1999}><shapeGeometry args={[shape]}/><meshBasicMaterial color="#102c26" transparent depthTest={false} depthWrite={false} toneMapped={false}/></mesh>
  </group>;
}

export function VRPageControls({page,pages,onPage,km}:{page:number;pages:number;onPage:(page:number)=>void;km:boolean}){
  return <group>
    <group position={[-.48,0,0]}><VRSurface title={km?KHMER_GUIDE.previous:'Previous'} width={.36} height={.14} disabled={page===0} onClick={()=>onPage(Math.max(0,page-1))}/></group>
    <VRSurface variant="text" title={`${km?KHMER_GUIDE.page:'Page'} ${page+1} / ${pages}`} width={.5} height={.12}/>
    <group position={[.48,0,0]}><VRSurface title={km?KHMER_GUIDE.next:'Next'} width={.36} height={.14} disabled={page>=pages-1} onClick={()=>onPage(Math.min(pages-1,page+1))}/></group>
  </group>;
}
