import {useEffect,useLayoutEffect,useMemo,useRef,useState} from 'react';
import {useFrame} from '@react-three/fiber';
import {Group,Vector3} from 'three';
import {OBJECT_INFO,type ObjectAnchor,type ObjectInfo} from '../objectHotspots';
import {worldPanelPose,vrMarkerScale} from '../vrPresentation';
import {GuideNarrator,type NarrationStatus} from '../lib/guideNarrator';
import {VRSurface} from './VRSurface';
import {VRPanelFrame,VRPageControls} from './VRPanel';
import {VRCaptureGuide} from './VRCaptureGuide';
import {useGuideLanguage} from '../lib/guideLanguage';
import {KHMER_GUIDE,khmerObjectTitle,khmerSourceTitle,savedKhmerLocationAnswer} from '../guideKhmer';
import {locationGuideContext} from '../locationGuide';

function VRMarker({anchor,scale,onSelect,km}:{anchor:ObjectAnchor;scale:number;onSelect:()=>void;km:boolean}) {
  const ref=useRef<Group>(null),head=useMemo(()=>new Vector3(),[]),anchorWorld=useMemo(()=>new Vector3(),[]);
  useFrame(({camera})=>{
    // Rotate the sign for readability, but keep it attached to its sculpture.
    if(!ref.current)return;
    camera.getWorldPosition(head);ref.current.lookAt(head);
    const distance=head.distanceTo(ref.current.getWorldPosition(anchorWorld));
    ref.current.scale.setScalar(vrMarkerScale(distance));
    ref.current.visible=distance>.15*scale;
  });
  return <group ref={ref} position={anchor.position} scale={scale}>
    <VRSurface variant="marker" title={`ⓘ ${km?khmerObjectTitle(anchor.id):OBJECT_INFO[anchor.id].title}`} width={.95} height={.18} onClick={onSelect}/>
  </group>;
}

function VRObjectCard({object,scale,onClose,penhGuide,km}:{object:ObjectInfo;scale:number;onClose:()=>void;penhGuide:boolean;km:boolean}) {
  const ref=useRef<Group>(null),place=useRef(true);
  const helpers=useMemo(()=>({head:new Vector3(),forward:new Vector3()}),[]);
  const [speech,setSpeech]=useState<NarrationStatus>('idle'),[guideOpen,setGuideOpen]=useState(false);
  const [page,setPage]=useState(0),[pages,setPages]=useState(1);
  useEffect(()=>{setPage(p=>Math.min(p,pages-1));},[pages]);
  const narrator=useMemo(()=>new GuideNarrator(setSpeech),[]);
  const context=km?locationGuideContext('staircase-3dgs','naga-staircase',object.id):null;
  const title=km?khmerObjectTitle(object.id):object.title,text=km&&context?savedKhmerLocationAnswer(context).text:object.text;
  useLayoutEffect(()=>{place.current=true;},[object.id]);
  useEffect(()=>{setPage(0);narrator.stop();},[km,narrator]);
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
    void narrator.start(`${title}${km?'។':'.'} ${text}`,km?'km-KH':'en-US',penhGuide?'penh':undefined);
  };
  return <group ref={ref} scale={scale} visible={false}>
    {guideOpen?<VRCaptureGuide embedded locationId="naga-staircase" objectId={object.id} scale={1} onClose={()=>setGuideOpen(false)}/>:<>
      <VRPanelFrame/>
      <group position={[0,.17,0]}><VRSurface variant="board" title={title} body={text} page={page} onPages={setPages} footer={km?khmerSourceTitle(object.source):object.source.title} eyebrow={km?'វត្តភ្នំ · ព័ត៌មាន':'WAT PHNOM · ABOUT THIS OBJECT'} width={1.34} height={1.02}/></group>
      <group position={[0,-.44,0]}><VRPageControls page={page} pages={pages} onPage={setPage} km={km}/></group>
      <group position={[penhGuide ? -.46 : -.34,-.65,.002]}><VRSurface variant="action" active title={speech==='loading'?(km?KHMER_GUIDE.loadingVoice:'Loading…'):speech==='unavailable'?(km?KHMER_GUIDE.retryVoice:'Retry voice'):speech==='speaking'?(km?KHMER_GUIDE.stop:'Stop'):(km?KHMER_GUIDE.listen:'▶ Listen')} width={penhGuide ? .42 : .62} height={.17} onClick={listen}/></group>
      {penhGuide&&<group position={[0,-.65,.002]}><VRSurface variant="action" title={km?`${KHMER_GUIDE.ask} ${KHMER_GUIDE.name}`:'Ask Penh'} width={.42} height={.17} onClick={()=>{narrator.stop();setGuideOpen(true);}}/></group>}
      <group position={[penhGuide ? .46 : .34,-.65,.002]}><VRSurface variant="action" title={km?'បិទ':'Close'} width={penhGuide ? .42 : .62} height={.17} onClick={onClose}/></group>
    </>}
  </group>;
}

export function VRObjectHotspots({anchors,scale,penhGuide=false}:{anchors:ObjectAnchor[];scale:number;penhGuide?:boolean}) {
  const [selected,setSelected]=useState<string|null>(null);
  const {language}=useGuideLanguage();const km=penhGuide&&language.code==='km';
  return <>
    {!selected&&anchors.map(anchor=><VRMarker key={anchor.id} anchor={anchor} scale={scale} km={km} onSelect={()=>setSelected(anchor.id)}/>)}
    {selected&&<VRObjectCard key={selected} object={OBJECT_INFO[selected]} scale={scale} penhGuide={penhGuide} km={km} onClose={()=>setSelected(null)}/>}
  </>;
}
