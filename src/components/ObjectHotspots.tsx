import { Html } from '@react-three/drei';
import { useXR } from '@react-three/xr';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { OBJECT_INFO, type ObjectAnchor, type ObjectInfo } from '../objectHotspots';
import {GuideNarrator,type NarrationStatus} from '../lib/guideNarrator';
import './ObjectHotspots.css';
import {VRObjectHotspots} from './VRObjectHotspots';

/** HTML markers sit above the walking gesture layer and follow world anchors. */
export function ObjectHotspotMarkers({anchors,onSelect,vrScale=1,vrPenhGuide=false}:{anchors:ObjectAnchor[];onSelect:(id:string)=>void;vrScale?:number;vrPenhGuide?:boolean}) {
  const immersive=useXR(s=>s.session!=null);
  // A fixed-position viewer is a stacking context: a high z-index inside it
  // cannot rise above the separate walking overlay. The capture fills the
  // viewport, so its projected labels can be placed directly in the body.
  const overlay=useMemo(()=>typeof document==='undefined'?undefined:{current:document.body},[]);
  if(immersive)return <VRObjectHotspots anchors={anchors} scale={vrScale} penhGuide={vrPenhGuide}/>;
  return <>{anchors.map(anchor=><Html key={anchor.id} position={anchor.position} center zIndexRange={[27,22]} portal={vrPenhGuide?overlay:undefined}>
    <button className="object-hotspot-marker" aria-label={`Learn about ${OBJECT_INFO[anchor.id].title}`}
      onPointerDown={e=>e.stopPropagation()} onClick={e=>{e.stopPropagation();onSelect(anchor.id);}}>
      <span className="object-marker-icon" aria-hidden="true">i</span><span className="object-marker-copy">{OBJECT_INFO[anchor.id].title}</span><span className="object-marker-arrow" aria-hidden="true">›</span>
    </button>
  </Html>)}</>;
}

export function ObjectInfoCard({object,onClose,onAsk,guideName='Kiri',children}:{object:ObjectInfo;onClose:()=>void;onAsk?:()=>void;guideName?:string;children?:ReactNode}) {
  const [speech,setSpeech]=useState<NarrationStatus>('idle');
  const narrator=useMemo(()=>new GuideNarrator(setSpeech),[]);
  useEffect(()=>()=>narrator.dispose(),[narrator]);
  const stop=()=>narrator.stop();
  const listen=()=>{
    if(speech==='loading'||speech==='speaking'){stop();return;}
    void narrator.start(`${object.title}. ${object.text}`,'en-US',guideName==='Penh'?'penh':undefined);
  };
  return <aside className="object-info-card" aria-label={`${object.title} information`}>
    <header><div><small>ABOUT THIS OBJECT</small><h2>{object.title}</h2></div>
      <button aria-label="Close object information" onClick={()=>{stop();onClose();}}>×</button></header>
    <p>{object.text}</p>
    <div className="object-info-source">{object.source.url?<a href={object.source.url} target="_blank" rel="noreferrer">{object.source.title}</a>:object.source.title}</div>
    <div className="object-info-actions">
      <button onClick={listen} aria-pressed={speech==='loading'||speech==='speaking'}>
        {speech==='loading'||speech==='speaking'?'■ Stop narration':'▶ Listen'}
      </button>
      {onAsk&&<button onClick={()=>{stop();onAsk();}}>Ask {guideName} about this</button>}
    </div>
    {children}
    {speech==='unavailable'&&<p className="object-info-audio-note" role="status">Narration is unavailable in this browser. You can still read the information above.</p>}
    {speech==='loading'&&<p className="object-info-audio-note" role="status">Starting narration…</p>}
  </aside>;
}
