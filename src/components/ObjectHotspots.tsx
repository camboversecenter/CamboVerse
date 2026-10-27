import { Html } from '@react-three/drei';
import { useXR } from '@react-three/xr';
import { useEffect, useRef, useState } from 'react';
import { OBJECT_INFO, type ObjectAnchor, type ObjectInfo } from '../objectHotspots';
import { speak, stopSpeaking, ttsSupported } from '../lib/voice';
import './ObjectHotspots.css';

/** HTML markers sit above the walking gesture layer and follow world anchors. */
export function ObjectHotspotMarkers({anchors,onSelect}:{anchors:ObjectAnchor[];onSelect:(id:string)=>void}) {
  const immersive=useXR(s=>s.session!=null);
  if(immersive)return null;
  return <>{anchors.map(anchor=><Html key={anchor.id} position={anchor.position} center zIndexRange={[27,22]}>
    <button className="object-hotspot-marker" aria-label={`Learn about ${OBJECT_INFO[anchor.id].title}`}
      onPointerDown={e=>e.stopPropagation()} onClick={e=>{e.stopPropagation();onSelect(anchor.id);}}>
      <span aria-hidden="true">i</span>{OBJECT_INFO[anchor.id].title}
    </button>
  </Html>)}</>;
}

export function ObjectInfoCard({object,onClose,onAsk}:{object:ObjectInfo;onClose:()=>void;onAsk:()=>void}) {
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
      <button onClick={()=>{stop();onAsk();}}>Ask Kiri about this</button>
    </div>
    {(!ttsSupported()||speech==='unavailable')&&<p className="object-info-audio-note" role="status">Narration is unavailable in this browser. You can still read the information above.</p>}
    {speech==='loading'&&<p className="object-info-audio-note" role="status">Starting narration…</p>}
  </aside>;
}
