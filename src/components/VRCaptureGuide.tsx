import {Suspense,useEffect,useMemo,useRef,useState} from 'react';
import {useFrame,useLoader} from '@react-three/fiber';
import {Group,SRGBColorSpace,TextureLoader,Vector3} from 'three';
import {locationGuideContext,type GuideExperience} from '../locationGuide';
import {askGuide,type GuideReply} from '../lib/guide';
import {LANGS,listenOnce,sttSupported,type LangCode} from '../lib/voice';
import {GuideNarrator,type NarrationStatus} from '../lib/guideNarrator';
import {guideLanguage,useGuideLanguage} from '../lib/guideLanguage';
import {guideAnswerPages,worldPanelPose} from '../vrPresentation';
import {VRSurface} from './VRSurface';
import {locationGuideReply} from '../lib/locationGuideReply';
import {KHMER_GUIDE,khmerGuideTitle,khmerGuideQuestion,khmerSourceTitle} from '../guideKhmer';

function PenhPortrait(){
  const texture=useLoader(TextureLoader,'/province-thumbnails/01-phnom-penh.webp');texture.colorSpace=SRGBColorSpace;
  return <mesh position={[-.62,.42,.01]} renderOrder={2001}><planeGeometry args={[.18,.18]}/><meshBasicMaterial map={texture} transparent depthTest={false} depthWrite={false} toneMapped={false}/></mesh>;
}

/** Controller-selectable guide. Suggested questions work without a microphone;
 * free-form voice input is offered only when the headset browser supports it. */
export function VRCaptureGuide({locationId,objectId,scale,onClose,embedded=false}:{locationId:string;objectId?:string;scale:number;onClose:()=>void;embedded?:boolean}) {
  const experienceId:GuideExperience=locationId==='flower-clock'?'clock-3dgs':'staircase-3dgs';
  const context=locationGuideContext(experienceId,locationId,objectId);
  const [reply,setReply]=useState<GuideReply|null>(null),[page,setPage]=useState(0),[loading,setLoading]=useState(false);
  const [listening,setListening]=useState(false),[speech,setSpeech]=useState<NarrationStatus>('idle'),[error,setError]=useState('');
  const {language,choose}=useGuideLanguage();
  const km=language.code==='km';
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
  const pages=reply?guideAnswerPages(reply.text):[];
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
    void narrator.start(reply.text,guideLanguage(replyLang).bcp,'penh');
  };
  const reset=()=>{narrator.stop();setReply(null);setPage(0);setError('');};
  return <group ref={panel} scale={scale} visible={embedded}>
    {!reply?<>
      <Suspense fallback={null}><PenhPortrait/></Suspense>
      <group position={[0,.48,0]}><VRSurface title={km?`${KHMER_GUIDE.ask} ${KHMER_GUIDE.name} · ${khmerGuideTitle(context)}`:`Ask Penh · ${objectId?context.title:locationId==='flower-clock'?'Flower Clock':'Naga Staircase'}`} /></group>
      <group position={[0,.39,0]}><VRSurface title={km?KHMER_GUIDE.credit:'Fictional AI · CamboVerse Center · CC BY 4.0'} height={.07}/></group>
      {context.facts.slice(0,3).map((fact,i)=><group key={fact.question} position={[0,.28-i*.17,0]}>
        <VRSurface title={km?khmerGuideQuestion(fact.question):fact.question} height={.16} onClick={()=>void ask(km?khmerGuideQuestion(fact.question):fact.question)}/></group>)}
      <group position={[0,-.25,0]}><VRSurface title={loading?(km?KHMER_GUIDE.checking:'Checking notes…'):listening?(km?KHMER_GUIDE.listening:'Listening… select to stop'):sttSupported()?(km?KHMER_GUIDE.voice:'Ask by voice'):(km?KHMER_GUIDE.voiceUnavailable:'Voice unavailable · choose a question')} onClick={!loading&&sttSupported()?voice:undefined}/></group>
      <group position={[0,-.42,0]}><VRSurface title={km?`${KHMER_GUIDE.language}: ខ្មែរ · ${KHMER_GUIDE.changeLanguage}`:`Language: ${language.name} · Select to change`} onClick={!loading?()=>{stopListen.current?.();setListening(false);choose(LANGS[(LANGS.findIndex(l=>l.code===language.code)+1)%LANGS.length].code);}:undefined}/></group>
      <group position={[0,-.53,0]}><VRSurface title={km?KHMER_GUIDE.privacy:'Questions and narration sent to Gemini'} height={.07}/></group>
      {sttSupported()&&<group position={[0,-.61,0]}><VRSurface title={km?KHMER_GUIDE.voicePrivacy:'Voice may use browser speech service'} height={.09}/></group>}
      {error&&<group position={[0,-.70,0]}><VRSurface title={error}/></group>}
      <group position={[0,-.82,0]}><VRSurface title={km?(embedded?KHMER_GUIDE.back:KHMER_GUIDE.close):embedded?'Back to information':'Close guide'} onClick={onClose}/></group>
    </>:<>
      <VRSurface title={km?`${KHMER_GUIDE.name} · ${reply.fallback?KHMER_GUIDE.saved:KHMER_GUIDE.answer}`:reply.fallback?'Penh · Saved notes (English)':`Penh · ${guideLanguage(replyLang).name} · AI answer`} body={pages[page]??reply.text} footer={km?`${KHMER_GUIDE.page} ${page+1}/${pages.length} · ${khmerSourceTitle(reply.sources?.[0])}`:`Page ${page+1}/${pages.length} · ${reply.sources?.[0]?.title??'Location guide'}`} width={1.28} height={.96}/>
      <group position={[-.45,-.59,0]}><VRSurface title={km?KHMER_GUIDE.previous:'Previous'} width={.42} onClick={()=>setPage(p=>Math.max(0,p-1))}/></group>
      <group position={[0,-.59,0]}><VRSurface title={km?KHMER_GUIDE.next:'Next'} width={.42} onClick={()=>setPage(p=>Math.min(pages.length-1,p+1))}/></group>
      <group position={[.45,-.59,0]}><VRSurface title={speech==='loading'?(km?KHMER_GUIDE.loadingVoice:'Loading…'):speech==='speaking'?(km?KHMER_GUIDE.stop:'Stop'):speech==='unavailable'?(km?KHMER_GUIDE.retryVoice:'Retry voice'):(km?KHMER_GUIDE.listen:'Listen')} width={.42} onClick={narrate}/></group>
      <group position={[-.33,-.76,0]}><VRSurface title={km?KHMER_GUIDE.another:'Ask another'} width={.62} onClick={reset}/></group>
      <group position={[.33,-.76,0]}><VRSurface title={km?KHMER_GUIDE.close:'Close guide'} width={.62} onClick={onClose}/></group>
      {error&&<group position={[0,-.92,0]}><VRSurface title={error}/></group>}
    </>}
  </group>;
}
