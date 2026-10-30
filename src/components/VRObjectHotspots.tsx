import {useEffect,useLayoutEffect,useMemo,useRef,useState} from 'react';
import {useFrame} from '@react-three/fiber';
import {Group,Vector3} from 'three';
import {OBJECT_INFO,type ObjectAnchor,type ObjectInfo} from '../objectHotspots';
import {worldPanelPose,vrMarkerScale} from '../vrPresentation';
import {speak,stopSpeaking,ttsSupported} from '../lib/voice';
import {VRSurface} from './VRSurface';

function VRMarker({anchor,scale,onSelect}:{anchor:ObjectAnchor;scale:number;onSelect:()=>void}) {
  const ref=useRef<Group>(null),head=useMemo(()=>new Vector3(),[]);
  useFrame(({camera})=>{
    // Rotate the sign for readability, but keep it attached to its sculpture.
    if(!ref.current)return;
    camera.getWorldPosition(head);ref.current.lookAt(head);
    const distance=head.distanceTo(ref.current.position);
    ref.current.scale.setScalar(vrMarkerScale(distance));
    ref.current.visible=distance>.15*scale;
  });
  return <group ref={ref} position={anchor.position} scale={scale}>
    <VRSurface title={`ⓘ ${OBJECT_INFO[anchor.id].title}`} width={.95} height={.16} onClick={onSelect}/>
  </group>;
}

function VRObjectCard({object,scale,onClose}:{object:ObjectInfo;scale:number;onClose:()=>void}) {
  const ref=useRef<Group>(null),place=useRef(true),generation=useRef(0);
  const helpers=useMemo(()=>({head:new Vector3(),forward:new Vector3()}),[]);
  const [speech,setSpeech]=useState<'idle'|'speaking'|'unavailable'>('idle');
  useLayoutEffect(()=>{place.current=true;},[object.id]);
  useEffect(()=>()=>{generation.current++;stopSpeaking();},[]);
  useFrame(({camera})=>{
    if(!ref.current||!place.current)return;
    camera.getWorldPosition(helpers.head);camera.getWorldDirection(helpers.forward);
    const pose=worldPanelPose(helpers.head,helpers.forward,scale);
    ref.current.position.set(...pose.position);ref.current.rotation.set(0,pose.yaw,0);
    ref.current.visible=true;place.current=false;
  });
  const listen=()=>{
    const token=++generation.current;
    if(speech==='speaking'){stopSpeaking();setSpeech('idle');return;}
    setSpeech('speaking');
    const ok=speak(`${object.title}. ${object.text}`,'en-US',{
      onEnd:()=>{if(token===generation.current)setSpeech('idle');},
      onError:()=>{if(token===generation.current)setSpeech('unavailable');},
    });
    if(!ok)setSpeech('unavailable');
  };
  return <group ref={ref} scale={scale} visible={false}>
    <VRSurface title={object.title} body={object.text} footer={object.source.title} width={1.28} height={.96}/>
    <group position={[-.33,-.59,.002]}><VRSurface title={!ttsSupported()||speech==='unavailable'?'Narration unavailable':speech==='speaking'?'Stop narration':'Listen'} width={.62} height={.14} onClick={listen}/></group>
    <group position={[.33,-.59,.002]}><VRSurface title="Close information" width={.62} height={.14} onClick={onClose}/></group>
  </group>;
}

export function VRObjectHotspots({anchors,scale}:{anchors:ObjectAnchor[];scale:number}) {
  const [selected,setSelected]=useState<string|null>(null);
  return <>
    {!selected&&anchors.map(anchor=><VRMarker key={anchor.id} anchor={anchor} scale={scale} onSelect={()=>setSelected(anchor.id)}/>)}
    {selected&&<VRObjectCard key={selected} object={OBJECT_INFO[selected]} scale={scale} onClose={()=>setSelected(null)}/>}
  </>;
}
