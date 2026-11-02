import {CAMPUS_GUIDE_NAME_KM} from '../campusGuide';
import {Suspense,useEffect,useMemo,useRef,useState} from 'react';
import {useFrame,useLoader} from '@react-three/fiber';
import {Group,SRGBColorSpace,TextureLoader,Vector3} from 'three';
import {locationGuideContext,type GuideExperience} from '../locationGuide';
import {askGuide,type GuideReply} from '../lib/guide';
import {LANGS,listenOnce,sttSupported,type LangCode} from '../lib/voice';
import {GuideNarrator,type NarrationStatus} from '../lib/guideNarrator';
import {guideLanguage,useGuideLanguage} from '../lib/guideLanguage';
import {worldPanelPose} from '../vrPresentation';
import {VRSurface} from './VRSurface';
import {VRPanelFrame,VRPageControls} from './VRPanel';
import {locationGuideReply} from '../lib/locationGuideReply';
import {KHMER_GUIDE,khmerGuideTitle,khmerGuideQuestion,khmerSourceTitle} from '../guideKhmer';

function PenhPortrait(){
  const texture=useLoader(TextureLoader,'/province-thumbnails/01-phnom-penh.webp');texture.colorSpace=SRGBColorSpace;
  return <mesh position={[-.56,.59,.01]} renderOrder={2001}><planeGeometry args={[.14,.14]}/><meshBasicMaterial map={texture} transparent depthTest={false} depthWrite={false} toneMapped={false}/></mesh>;
}

/** Controller-selectable guide. Suggested questions work without a microphone;
 * free-form voice input is offered only when the headset browser supports it. */
export function VRCaptureGuide({locationId,objectId,scale,onClose,embedded=false,experience}:{locationId:string;objectId?:string;scale:number;onClose:()=>void;embedded?:boolean;experience?:GuideExperience}) {
  const experienceId:GuideExperience=experience??(locationId==='flower-clock'?'clock-3dgs':'staircase-3dgs');
  const isCampus=experienceId==='campus',name=isCampus?'Campus guide':'Penh';
  const context=locationGuideContext(experienceId,locationId,objectId);
  const [reply,setReply]=useState<GuideReply|null>(null),[page,setPage]=useState(0),[loading,setLoading]=useState(false);
  const [listening,setListening]=useState(false),[speech,setSpeech]=useState<NarrationStatus>('idle'),[error,setError]=useState('');
  const {language,choose}=useGuideLanguage();
  const km=language.code==='km',displayName=km?(isCampus?CAMPUS_GUIDE_NAME_KM:KHMER_GUIDE.name):name;
  const [pages,setPages]=useState(1);
  useEffect(()=>{setPage(p=>Math.min(p,pages-1));},[pages]);
  const [replyLang,setReplyLang]=useState<LangCode>('en');
  const narrator=useMemo(()=>new GuideNarrator(setSpeech),[]);
  const pending=useRef<AbortController|null>(null),stopListen=useRef<null|(()=>void)>(null);
  const panel=useRef<Group>(null),placed=useRef(false),vectors=useMemo(()=>({head:new Vector3(),direction:new Vector3()}),[]);
  useFrame(({camera})=>{
    if(embedded||!panel.current||placed.current)return;
    camera.getWorldPosition(vectors.head);camera.getWorldDirection(vectors.direction);
    const pose=worldPanelPose(vectors.head,vectors.direction,scale);
    panel.current.position.set(...pose.position);panel.current.rotation.set(0,pose.yaw,0);panel.current.visible=true;placed.current=true;
  });
  useEffect(()=>()=>{const request=pending.current;pending.current=null;request?.abort();stopListen.current?.();narrator.dispose();},[narrator]);
  if(!context)return null;

  const ask=async(question:string)=>{
    if(loading)return;
    pending.current?.abort();const controller=new AbortController();pending.current=controller;
    setLoading(true);setReply(null);setError('');setPage(0);narrator.stop();
    const timer=setTimeout(()=>controller.abort(),15000);
    const result=await askGuide({experienceId,locationId,objectId,question,lang:language.code},controller.signal);
    clearTimeout(timer);
    if(pending.current!==controller)return;
    const answer=locationGuideReply(context,question,result,language.code);
    setReply(answer);setReplyLang(answer.lang);
    setLoading(false);pending.current=null;
  };
  const voice=()=>{
    if(listening){stopListen.current?.();stopListen.current=null;setListening(false);return;}
    setError('');setListening(true);
    const unavailable=km?KHMER_GUIDE.voiceUnavailable:'Voice unavailable. Choose a question.';
    try{stopListen.current=listenOnce(language.bcp,text=>{stopListen.current=null;setListening(false);void ask(text);},()=>{stopListen.current=null;setListening(false);setError(unavailable);});
      if(!stopListen.current){setListening(false);setError(unavailable);}}
    catch{setListening(false);setError(unavailable);}
  };
  const narrate=()=>{
    if(!reply)return;
    if(speech==='speaking'||speech==='loading'){narrator.stop();return;}
    void narrator.start(reply.text,guideLanguage(replyLang).bcp,isCampus?undefined:'penh');
  };
  const reset=()=>{narrator.stop();setReply(null);setPage(0);setError('');};
  const closeLabel=km?(embedded?KHMER_GUIDE.back:KHMER_GUIDE.close):embedded?'Back to information':'Close guide';
  return <group ref={panel} scale={scale} visible={embedded}>
    <VRPanelFrame height={1.64}/>
    {!reply?<>
      {!isCampus&&<Suspense fallback={null}><PenhPortrait/></Suspense>}
      <group position={[.08,.60,0]}><VRSurface variant="heading" title={(km?KHMER_GUIDE.ask:'Ask')+' '+displayName} width={1.02} height={.14}/></group>
      <group position={[0,.44,0]}><VRSurface variant="text" title={km?khmerGuideTitle(context):isCampus||objectId?context.title:locationId==='flower-clock'?'Flower Clock':'Naga Staircase'} width={1.32} height={.12}/></group>
      {context.facts.slice(0,3).map((fact,i)=><group key={fact.question} position={[0,.28-i*.18,0]}>
        <VRSurface title={km?khmerGuideQuestion(fact.question):fact.question} width={1.32} height={.16} disabled={loading||listening} onClick={()=>void ask(km?khmerGuideQuestion(fact.question):fact.question)}/></group>)}
      <group position={[-.34,-.27,0]}><VRSurface title={loading?(km?KHMER_GUIDE.checking:'Checking notes…'):listening?(km?KHMER_GUIDE.listening:'Listening… select to stop'):sttSupported()?(km?KHMER_GUIDE.voice:'Ask by voice'):(km?'សូមជ្រើសរើសសំណួរ':'Choose a question above')} width={.64} height={.17} disabled={loading||!sttSupported()} onClick={voice}/></group>
      <group position={[.34,-.27,0]}><VRSurface title={km?KHMER_GUIDE.language+': ខ្មែរ · '+KHMER_GUIDE.changeLanguage:'Language: '+language.name+' · Select to change'} width={.64} height={.17} disabled={loading} onClick={()=>{stopListen.current?.();setListening(false);choose(LANGS[(LANGS.findIndex(l=>l.code===language.code)+1)%LANGS.length].code);}}/></group>
      <group position={[0,-.43,0]}><VRSurface variant="text" title={error||(isCampus?(km?'មគ្គុទ្ទេសក៍បញ្ញាសិប្បនិម្មិត · កំណត់ត្រាបរិវេណ':'AI guide · Campus model notes'):(km?KHMER_GUIDE.credit:'Fictional AI · CamboVerse Center · CC BY 4.0'))} width={1.32} height={.10}/></group>
      <group position={[0,-.55,0]}><VRSurface variant="text" title={(km?KHMER_GUIDE.privacy:'Questions and narration sent to Gemini')+(sttSupported()?' · '+(km?KHMER_GUIDE.voicePrivacy:'Voice may use browser speech service'):'')} width={1.32} height={.13}/></group>
      <group position={[0,-.71,0]}><VRSurface title={closeLabel} width={1.32} height={.14} onClick={onClose}/></group>
    </>:<>
      <group position={[0,.18,0]}><VRSurface variant="board" eyebrow={km?khmerGuideTitle(context):context.title} title={km?displayName+' · '+(reply.fallback?KHMER_GUIDE.saved:KHMER_GUIDE.answer):reply.fallback?name+' · Saved notes (English)':name+' · '+guideLanguage(replyLang).name+' · AI answer'} body={reply.text} page={page} onPages={setPages} footer={km?khmerSourceTitle(reply.sources?.[0]):reply.sources?.[0]?.title??'Location guide'} width={1.34} height={1.08}/></group>
      <group position={[0,-.46,0]}><VRPageControls page={page} pages={pages} onPage={setPage} km={km}/></group>
      <group position={[-.46,-.69,0]}><VRSurface active title={speech==='loading'?(km?KHMER_GUIDE.loadingVoice:'Loading…'):speech==='speaking'?(km?KHMER_GUIDE.stop:'Stop'):speech==='unavailable'?(km?KHMER_GUIDE.retryVoice:'Retry voice'):(km?KHMER_GUIDE.listen:'Listen')} width={.42} height={.17} onClick={narrate}/></group>
      <group position={[0,-.69,0]}><VRSurface title={km?KHMER_GUIDE.another:'Ask another'} width={.42} height={.17} onClick={reset}/></group>
      <group position={[.46,-.69,0]}><VRSurface title={closeLabel} width={.42} height={.17} onClick={onClose}/></group>
    </>}
  </group>;
}
