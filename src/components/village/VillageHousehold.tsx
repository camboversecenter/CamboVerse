import { Component, Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Canvas } from '@react-three/fiber';
import { ExploreControls as OrbitControls } from '../ExploreControls';
import { useGLTF, Center, Html } from '@react-three/drei';
import type { VillageMode } from './layout';
export const HOUSEHOLD = [
 ['water-jar','Water jar','A vessel for storing water. Think about where a household obtains water and how it carries it home.'],
 ['basket-study','Basket','A container for carrying or storing goods. This plain shape is a placeholder for a locally reviewed weaving pattern.'],
 ['cooking-pot','Cooking pot','A vessel used in preparing food. Materials and cooking arrangements vary between households and places.'],
 ['winnowing-tray','Winnowing tray','Air can carry lighter chaff away from heavier grain. This tray introduces that separation principle.'],
 ['mortar-study','Mortar','A bowl-shaped tool used with a pestle to pound ingredients. The pestle and working demonstration are not yet modelled.'],
] as const;
class PreviewBoundary extends Component<{children:ReactNode},{failed:boolean}> {
 state={failed:false};
 static getDerivedStateFromError(){return {failed:true};}
 render(){return this.state.failed?<p role="alert">This object could not load. You can still read its description or choose another object.</p>:this.props.children;}
}
function ObjectModel({id,mode}:{id:string;mode:VillageMode}){
 const {scene}=useGLTF(`/models/village/${id}-${mode}.glb`);
 const copy=useMemo(()=>scene.clone(true),[scene]);
 return <primitive object={copy} dispose={null}/>;
}
export function HouseholdPlacements({mode}:{mode:VillageMode}){
 return <Suspense fallback={null}><group position={[-8,1.84,-7.5]}>
 {HOUSEHOLD.map(([id],i)=><group key={id} position={[-1+i*.48,0,0]} scale={.45}><ObjectModel id={id} mode={mode}/></group>)}
 </group></Suspense>;
}
export function VillageHousehold({mode,onClose}:{mode:VillageMode;onClose:()=>void}){
 const [item,setItem]=useState(0);const [tab,setTab]=useState<'objects'|'story'|'activity'>('objects');
 const [wind,setWind]=useState(0);const [result,setResult]=useState<number|null>(null);
 const [toss,setToss]=useState(0);
 const closeButton=useRef<HTMLButtonElement>(null);
 useEffect(()=>{
  const previous=document.activeElement;
  closeButton.current?.focus();
  return ()=>{if(previous instanceof HTMLElement && previous.isConnected) previous.focus();};
 },[]);
 return <section className="village-study" aria-label="Household study" onKeyDown={e=>{if(e.key==='Escape'){e.stopPropagation();onClose();}}}>
 <header><h2>A household, a working day</h2><button ref={closeButton} onClick={onClose} aria-label="Close household study">✕</button></header>
 <p className="village-draft">Interpretive prototype · cultural review pending · not a dated historical reconstruction.</p>
 <nav aria-label="Household activities">{(['objects','story','activity'] as const).map(t=><button key={t} aria-pressed={tab===t} onClick={()=>setTab(t)}>{t==='objects'?'Objects':t==='story'?'Resident story':'Try winnowing'}</button>)}</nav>
 {tab==='objects'&&<>
 <nav aria-label="Household objects">{HOUSEHOLD.map(([,name],i)=><button key={name} aria-pressed={item===i} onClick={()=>setItem(i)}>{name}</button>)}</nav>
 <div className="household-preview" aria-label={`${HOUSEHOLD[item][1]} 3D preview`}><PreviewBoundary key={`${item}-${mode}`}><Canvas frameloop="demand" fallback={<p>3D preview unavailable. Read the object description below.</p>} camera={{position:[1.2,1,1.4],fov:42}} dpr={mode==='normal'?1:1.5}>
 <ambientLight intensity={1.5}/><directionalLight position={[3,4,2]} intensity={2}/>
 <Suspense fallback={<Html center><span role="status">Loading object…</span></Html>}><Center key={`${item}-${mode}`}><ObjectModel id={HOUSEHOLD[item][0]} mode={mode}/></Center></Suspense>
 <OrbitControls enablePan minDistance={.6} maxDistance={3}/>
 </Canvas></PreviewBoundary></div><h3>{HOUSEHOLD[item][1]}</h3><p>{HOUSEHOLD[item][2]}</p><small>Drag to rotate · pinch/scroll to zoom. Original simplified Blender models.</small>
 </>}
 {tab==='story'&&<><h3>Morning at home</h3><p><strong>Fictional resident vignette—not an oral-history quotation.</strong></p><p>“Before we begin the day’s work, we prepare water and food. The baskets and tools each have a place. Some tasks happen in the yard, others in the shade beneath the house. What would you carry if you were helping today?”</p><p>Explore an object and explain how it might help a household. A future version should replace this draft with a contributor-approved local story and recording.</p></>}
 {tab==='activity'&&<><h3>Separate grain from chaff</h3><p>Choose airflow, then toss the tray. This is a concept illustration—not a real wind-speed or farming simulation.</p>
 <label>Airflow <select value={wind} onChange={e=>{setWind(Number(e.target.value));setResult(null);}}><option value={0}>Still air</option><option value={1}>Gentle breeze</option><option value={2}>Strong gust</option></select></label>
 <div key={toss} className={`winnow-demo wind-${result??0}${result!==null?' tossed':''}`} aria-hidden="true"><div className="grain">••••••••</div><div className="chaff">✧ ✧ ✧ ✧</div><div className="tray"/></div>
 <button onClick={()=>{setResult(wind);setToss(t=>t+1);}}>Toss tray</button><button onClick={()=>{setResult(null);setWind(0);}}>Reset activity</button>
 <p role="status">{result===null?'What do you predict will move farther?':result===0?'Still air: little separation in this illustration.':result===1?'Gentle breeze: lighter chaff moves farther while most grain stays near the tray.':'Strong gust: chaff moves away, but some grain may be lost too.'}</p></>}
 </section>;
}
