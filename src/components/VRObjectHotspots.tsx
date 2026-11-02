import {useEffect,useLayoutEffect,useMemo,useRef,useState} from 'react';
import {useFrame} from '@react-three/fiber';
import {Group,Vector3} from 'three';
import {OBJECT_INFO,type ObjectAnchor,type ObjectInfo} from '../objectHotspots';
import {worldPanelPose,vrMarkerScale} from '../vrPresentation';
import {GuideNarrator,type NarrationStatus} from '../lib/guideNarrator';
import {VRSurface} from './VRSurface';
import {VRCaptureGuide} from './VRCaptureGuide';

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
    <VRSurface variant="marker" title={`ⓘ ${OBJECT_INFO[anchor.id].title}`} width={.95} height={.18} onClick={onSelect}/>
  </group>;
}

function VRObjectCard({object,scale,onClose,penhGuide}:{object:ObjectInfo;scale:number;onClose:()=>void;penhGuide:boolean}) {
  const ref=useRef<Group>(null),place=useRef(true);
  const helpers=useMemo(()=>({head:new Vector3(),forward:new Vector3()}),[]);
  const [speech,setSpeech]=useState<NarrationStatus>('idle'),[guideOpen,setGuideOpen]=useState(false);
  const narrator=useMemo(()=>new GuideNarrator(setSpeech),[]);
  useLayoutEffect(()=>{place.current=true;},[object.id]);
  useEffect(()=>()=>narrator.dispose(),[narrator]);
  useFrame(({camera})=>{
    if(!ref.current||!place.current)return;
    camera.getWorldPosition(helpers.head);camera.getWorldDirection(helpers.forward);
    const pose=worldPanelPose(helpers.head,helpers.forward,scale);
    ref.current.position.set(...pose.position);ref.current.rotation.set(0,pose.yaw,0);
    ref.current.visible=true;place.current=false;
  });
  const listen=()=>{
    if(speech==='speaking'||speech==='loading'){narrator.stop();return;}
    void narrator.start(`${object.title}. ${object.text}`,'en-US',penhGuide?'penh':undefined);
  };
  return <group ref={ref} scale={scale} visible={false}>
    {guideOpen?<VRCaptureGuide embedded locationId="naga-staircase" objectId={object.id} scale={1} onClose={()=>setGuideOpen(false)}/>:<>
      <VRSurface variant="board" title={object.title} body={object.text} footer={object.source.title} width={1.46} height={1.04}/>
      <group position={[penhGuide ? -.49 : -.37,-.66,.002]}><VRSurface variant="action" title={speech==='loading'?'Loading…':speech==='unavailable'?'Retry voice':speech==='speaking'?'Stop':'▶ Listen'} width={penhGuide ? .46 : .68} height={.18} onClick={listen}/></group>
      {penhGuide&&<group position={[0,-.66,.002]}><VRSurface variant="action" title="✦ Ask Penh" width={.46} height={.18} onClick={()=>{narrator.stop();setGuideOpen(true);}}/></group>}
      <group position={[penhGuide ? .49 : .37,-.66,.002]}><VRSurface variant="action" title="✕ Close" width={penhGuide ? .46 : .68} height={.18} onClick={onClose}/></group>
    </>}
  </group>;
}

export function VRObjectHotspots({anchors,scale,penhGuide=false}:{anchors:ObjectAnchor[];scale:number;penhGuide?:boolean}) {
  const [selected,setSelected]=useState<string|null>(null);
  return <>
    {!selected&&anchors.map(anchor=><VRMarker key={anchor.id} anchor={anchor} scale={scale} onSelect={()=>setSelected(anchor.id)}/>)}
    {selected&&<VRObjectCard key={selected} object={OBJECT_INFO[selected]} scale={scale} penhGuide={penhGuide} onClose={()=>setSelected(null)}/>}
  </>;
}
