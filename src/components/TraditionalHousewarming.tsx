import { useEffect, useMemo, type ReactNode } from 'react';
import { useThree } from '@react-three/fiber';
import { DoubleSide } from 'three';
import type { Detail } from './LabOrgans';
import { Timber, useWeave, Vessel, FruitTray, Flame } from './TraditionalWedding';
import { HOUSEWARMING_ITEMS, type HousewarmingObject } from '../housewarmingStudy';

type V3 = [number,number,number];
const floor = 1.25;
export function HousewarmingCamera({ close, roof }: { close: boolean; roof: boolean }) {
  const {camera,size,gl} = useThree();
  useEffect(() => {
    if(gl.xr.isPresenting) return;
    const d = Math.min(24,Math.max(roof ? 12.5 : close ? 5.2 : 9.8, (close ? 2 : 3.6)/(Math.tan(Math.PI*25/180)*size.width/size.height)));
    camera.position.set(d*.25,1.7+d*.5,d*.85);
    camera.lookAt(0,1.7,0); camera.updateProjectionMatrix();
  },[camera,size.width,size.height,close,roof,gl]);
  return null;
}

/** A roof cutaway exposes the ceremony on the floor of the completed house. */
export function TraditionalHousewarming({detail,moment,roof,selected,onSelect}: {
  detail: Detail; moment: string; roof: boolean; selected: HousewarmingObject|null; onSelect:(id:HousewarmingObject)=>void;
}) {
  const weave=useWeave();
  const timber=useMemo(() => {
    const parts:{at:V3;size:V3}[]=[];
    for(let i=0;i<24;i++) parts.push({at:[-3.45+i*.30,1.16,0],size:[.288,.18,5.8]});
    for(const x of [-3.4,3.4]) for(const z of [-2.65,0,2.65]) parts.push({at:[x,2.15,z],size:[.17,4.3,.17]});
    for(const z of [-2.65,0,2.65]) parts.push({at:[0,1.03,z],size:[7.1,.16,.16]});
    for(let i=0;i<24;i++) parts.push({at:[-3.45+i*.3,2.65,-2.78],size:[.288,2.65,.10]});
    for(const x of [-3.5,3.5]) {
      for(let i=0;i<18;i++) {
        const z=-2.55+i*.3;
        // Open window band and cutaway side walls retain daylight and sight lines.
        parts.push({at:[x,1.61,z],size:[.1,.70,.288]});
        parts.push({at:[x,3.85,z],size:[.1,.28,.288]});
      }
      for(const z of [-1.6,-.8,0,.8,1.6]) parts.push({at:[x,2.85,z],size:[.055,1.75,.055]});
      parts.push({at:[x,4.1,0],size:[.15,.15,5.8]});
    }
    // Low front rail leaves the central stair opening clear.
    for(const side of [-1,1]) {
      parts.push({at:[side*2.25,1.94,2.7],size:[2.3,.09,.1]});
      for(let j=0;j<8;j++) parts.push({at:[side*(1.18+j*.3),1.6,2.7],size:[.045,.65,.045]});
    }
    return parts;
  },[]);
  const stairs=useMemo(()=>Array.from({length:6},(_,i)=>({at:[0,.11+i*.206,4.5-i*.30] as V3,size:[1.8,.13,.39] as V3})),[]);
  const central=useMemo(()=>[{at:[0,2.12,-.9] as V3,size:[.20,4.24,.20] as V3}],[]);
  const mat=(at:V3,size:[number,number])=><mesh position={at} rotation={[-Math.PI/2,0,0]} receiveShadow={detail==='ultra'}><planeGeometry args={size}/><meshStandardMaterial map={weave} roughness={1}/></mesh>;
  const pick=(id:HousewarmingObject,at:V3,children:ReactNode)=><group position={at} onClick={e=>{e.stopPropagation();onSelect(id);}}>
    <mesh position={[0,.22,0]}><sphereGeometry args={[.48,8,6]}/><meshBasicMaterial transparent opacity={0} colorWrite={false} depthWrite={false}/></mesh>
    {children}
    {selected===id&&<mesh position={[0,.025,0]} rotation={[-Math.PI/2,0,0]}><ringGeometry args={[.55,.59,32]}/><meshBasicMaterial color="#f0d497" side={DoubleSide}/></mesh>}
  </group>;
  const active=HOUSEWARMING_ITEMS[moment]??HOUSEWARMING_ITEMS.offerings;
  return <group>
    <mesh rotation={[-Math.PI/2,0,0]} position={[0,-.02,0]} receiveShadow={detail==='ultra'}><planeGeometry args={[100,100]}/><meshStandardMaterial color="#a3ad90" roughness={1}/></mesh>
    <Timber pieces={timber} color="#82654e" detail={detail}/>
    {pick('threshold',[0,.75,3.6],<group position={[0,-.75,-3.6]}><Timber pieces={stairs} color="#82654e" detail={detail}/></group>)}
    {pick('post',[0,floor,-.9],<group position={[0,-floor,.9]}><Timber pieces={central} color={selected==='post'?'#c69d60':'#71543d'} detail={detail}/></group>)}
    {roof&&[-1,1].map(s=><mesh key={s} position={[s*1.85,4.9,0]} rotation={[0,0,s*-.42]} castShadow={detail==='ultra'}><boxGeometry args={[4.05,.10,6.5]}/><meshStandardMaterial color="#806956" roughness={1}/></mesh>)}
    {mat([.55,floor+.015,1],[3.5,2.6])}
    {pick('seats',[-2.1,floor+.03,-.6],<group>{[-1.3,-.45,.4,1.25].map(z=><group key={z} position={[0,0,z]}>{mat([0,.01,0],[1.05,.72])}<mesh position={[0,.045,0]} scale={[.39,.045,.22]}><sphereGeometry args={[1,detail==='ultra'?24:12,10]}/><meshStandardMaterial color="#986747" roughness={1}/></mesh></group>)}</group>)}
    {active.includes('offerings')&&pick('offerings',[.6,floor+.03,.85],<group>{[-.6,.6].map(x=><group key={x} position={[x,0,0]}><FruitTray detail={detail}/></group>)}<group position={[0,0,-.55]}><Vessel detail={detail} bowl/><group position={[0,.3,0]}><Flame detail={detail}/></group></group></group>)}
    {active.includes('water')&&pick('water',[-.45,floor+.03,.7],<group><Vessel detail={detail} bowl/><mesh position={[0,.255,0]} rotation={[-Math.PI/2,0,0]}><circleGeometry args={[.24,detail==='ultra'?32:12]}/><meshStandardMaterial color="#7eaaa2" roughness={.24}/></mesh><mesh position={[.3,.32,0]} rotation={[0,0,-1.05]}><cylinderGeometry args={[.014,.018,.58,8]}/><meshStandardMaterial color="#806647"/></mesh></group>)}
    {active.includes('meal')&&pick('meal',[.55,floor+.03,.85],<group>{[-.7,0,.7].map(x=><group key={x} position={[x,0,0]}><Vessel detail={detail} bowl/><mesh position={[0,.26,0]} scale={[1,.22,1]}><sphereGeometry args={[.23,12,8]}/><meshStandardMaterial color={x===0?'#eadcc2':'#9d8555'} roughness={1}/></mesh></group>)}</group>)}
    {/* Quiet domestic storage, not additional ritual requirements. */}
    {[1.8,2.5].map(x=><mesh key={x} position={[x,1.65,-2.1]}><cylinderGeometry args={[.24,.34,.75,detail==='ultra'?24:10]}/><meshStandardMaterial color="#92795a" roughness={1}/></mesh>)}
  </group>;
}
