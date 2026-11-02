import { Html } from '@react-three/drei';
import { useXR } from '@react-three/xr';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { OBJECT_INFO, type ObjectAnchor, type ObjectInfo } from '../objectHotspots';
import { speak, stopSpeaking, ttsSupported } from '../lib/voice';
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
      <span aria-hidden="true">i</span><span className="object-marker-copy"><strong>{OBJECT_INFO[anchor.id].title}</strong><small>View details</small></span><span className="object-marker-arrow" aria-hidden="true">›</span>
    </button>
  </Html>)}</>;
}

export function ObjectInfoCard({object,onClose,onAsk,guideName='Kiri',children}:{object:ObjectInfo;onClose:()=>void;onAsk?:()=>void;guideName?:string;children?:ReactNode}) {
  const [speech,setSpeech]=useState<'idle'|'loading'|'speaking'|'unavailable'>('idle');
  const generation=useRef(0);
  useEffect(()=>()=>{generation.current++;stopSpeaking();},[]);
  const stop=()=>{generation.current++;stopSpeaking();setSpeech('idle');};
  const listen=()=>{
    if(speech==='loading'||speech==='speaking'){stop();return;}
    const token=++generation.current;setSpeech('loading');
    const ok=speak(`${object.title}. ${object.text}`,'en-US',{
      onStart:()=>{if(generation.current===token)setSpeech('speaking');},
      onEnd:()=>{if(generation.current===token)setSpeech('idle');},
      onError:()=>{if(generation.current===token)setSpeech('unavailable');},
    });
    if(!ok)setSpeech('unavailable');
  };
  return <aside className="object-info-card" aria-label={`${object.title} information`}>
    <header><div><small>ABOUT THIS OBJECT</small><h2>{object.title}</h2></div>
      <button aria-label="Close object information" onClick={()=>{stop();onClose();}}>×</button></header>
    <p>{object.text}</p>
    <div className="object-info-source">{object.source.url?<a href={object.source.url} target="_blank" rel="noreferrer">{object.source.title}</a>:object.source.title}</div>
    <div className="object-info-actions">
      <button onClick={listen} disabled={!ttsSupported()} aria-pressed={speech==='loading'||speech==='speaking'}>
        {speech==='loading'||speech==='speaking'?'■ Stop narration':'▶ Listen'}
      </button>
      {onAsk&&<button onClick={()=>{stop();onAsk();}}>Ask {guideName} about this</button>}
    </div>
    {children}
    {(!ttsSupported()||speech==='unavailable')&&<p className="object-info-audio-note" role="status">Narration is unavailable in this browser. You can still read the information above.</p>}
    {speech==='loading'&&<p className="object-info-audio-note" role="status">Starting narration…</p>}
  </aside>;
}
