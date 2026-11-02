import {useEffect,useMemo,useRef,useState} from 'react';
import {useFrame} from '@react-three/fiber';
import {Group,Vector3} from 'three';
import {locationGuideContext,savedLocationAnswer,type GuideExperience} from '../locationGuide';
import {askGuide,type GuideReply} from '../lib/guide';
import {listenOnce,speak,stopSpeaking,sttSupported,ttsSupported} from '../lib/voice';
import {guideAnswerPages,worldPanelPose} from '../vrPresentation';
import {VRSurface} from './VRSurface';

/** Controller-selectable guide. Suggested questions work without a microphone;
 * free-form voice input is offered only when the headset browser supports it. */
export function VRCaptureGuide({locationId,scale,onClose}:{locationId:string;scale:number;onClose:()=>void}) {
  const experienceId:GuideExperience=locationId==='flower-clock'?'clock-3dgs':'staircase-3dgs';
  const context=locationGuideContext(experienceId,locationId);
  const [reply,setReply]=useState<GuideReply|null>(null),[page,setPage]=useState(0),[loading,setLoading]=useState(false);
  const [listening,setListening]=useState(false),[speaking,setSpeaking]=useState(false),[error,setError]=useState('');
  const pending=useRef<AbortController|null>(null),stopListen=useRef<null|(()=>void)>(null),speechToken=useRef(0);
  const panel=useRef<Group>(null),placed=useRef(false),vectors=useMemo(()=>({head:new Vector3(),direction:new Vector3()}),[]);
  useFrame(({camera})=>{
    if(!panel.current||placed.current)return;
    camera.getWorldPosition(vectors.head);camera.getWorldDirection(vectors.direction);
    const pose=worldPanelPose(vectors.head,vectors.direction,scale);
    panel.current.position.set(...pose.position);panel.current.rotation.set(0,pose.yaw,0);panel.current.visible=true;placed.current=true;
  });
  useEffect(()=>()=>{const request=pending.current;pending.current=null;request?.abort();stopListen.current?.();speechToken.current++;stopSpeaking();},[]);
  if(!context)return null;
  const pages=reply?guideAnswerPages(reply.text):[];
  const ask=async(question:string)=>{
    if(loading)return;
    pending.current?.abort();const controller=new AbortController();pending.current=controller;
    setLoading(true);setReply(null);setError('');setPage(0);speechToken.current++;stopSpeaking();setSpeaking(false);
    const timer=setTimeout(()=>controller.abort(),15000);
    const result=await askGuide({experienceId,locationId,question,lang:'en'},controller.signal);
    clearTimeout(timer);
    if(pending.current!==controller)return;
    setReply(result?.text?.trim()?result:{...savedLocationAnswer(context,question),fallback:true});
    setLoading(false);pending.current=null;
  };
  const voice=()=>{
    if(listening){stopListen.current?.();stopListen.current=null;setListening(false);return;}
    setError('');setListening(true);
    try{stopListen.current=listenOnce('en-US',text=>{stopListen.current=null;setListening(false);void ask(text);},()=>{stopListen.current=null;setListening(false);setError('Voice unavailable. Choose a question.');});
      if(!stopListen.current){setListening(false);setError('Voice unavailable. Choose a question.');}}
    catch{setListening(false);setError('Voice unavailable. Choose a question.');}
  };
  const narrate=()=>{
    if(!reply)return;
    if(speaking){speechToken.current++;stopSpeaking();setSpeaking(false);return;}
    const token=++speechToken.current;setSpeaking(true);
    if(!speak(reply.text,'en-US',{onEnd:()=>{if(token===speechToken.current)setSpeaking(false);},onError:()=>{if(token===speechToken.current){setSpeaking(false);setError('Narration unavailable. Read the answer.');}}})){
      setSpeaking(false);setError('Narration unavailable. Read the answer.');
    }
  };
  const reset=()=>{speechToken.current++;stopSpeaking();setSpeaking(false);setReply(null);setPage(0);setError('');};
  return <group ref={panel} scale={scale} visible={false}>
    {!reply?<>
      <group position={[0,.48,0]}><VRSurface title={`Ask Kiri · ${locationId==='flower-clock'?'Flower Clock':'Naga Staircase'}`} /></group>
      {context.facts.slice(0,3).map((fact,i)=><group key={fact.question} position={[0,.28-i*.17,0]}>
        <VRSurface title={fact.question} height={.16} onClick={()=>void ask(fact.question)}/></group>)}
      <group position={[0,-.25,0]}><VRSurface title={loading?'Checking notes…':listening?'Listening… select to stop':sttSupported()?'Ask by voice':'Voice unavailable · choose a question'} onClick={!loading&&sttSupported()?voice:undefined}/></group>
      {sttSupported()&&<group position={[0,-.4,0]}><VRSurface title="Voice may use browser speech service" height={.09}/></group>}
      {error&&<group position={[0,-.47,0]}><VRSurface title={error}/></group>}
      <group position={[0,-.58,0]}><VRSurface title="Close guide" onClick={onClose}/></group>
    </>:<>
      <VRSurface title={reply.fallback?'Kiri · Saved notes':'Kiri · AI answer'} body={pages[page]??reply.text} footer={`Page ${page+1}/${pages.length} · ${reply.sources?.[0]?.title??'Location guide'}`} width={1.28} height={.96}/>
      <group position={[-.45,-.59,0]}><VRSurface title="Previous" width={.42} onClick={()=>setPage(p=>Math.max(0,p-1))}/></group>
      <group position={[0,-.59,0]}><VRSurface title="Next" width={.42} onClick={()=>setPage(p=>Math.min(pages.length-1,p+1))}/></group>
      <group position={[.45,-.59,0]}><VRSurface title={!ttsSupported()?'No narration':speaking?'Stop':'Listen'} width={.42} onClick={ttsSupported()?narrate:undefined}/></group>
      <group position={[-.33,-.76,0]}><VRSurface title="Ask another" width={.62} onClick={reset}/></group>
      <group position={[.33,-.76,0]}><VRSurface title="Close guide" width={.62} onClick={onClose}/></group>
      {error&&<group position={[0,-.92,0]}><VRSurface title={error}/></group>}
    </>}
  </group>;
}
