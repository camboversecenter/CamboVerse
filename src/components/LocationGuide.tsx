import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { askGuide, type GuideReply } from '../lib/guide';
import { locationGuideContext, type GuideExperience } from '../locationGuide';
import {CAMPUS_GUIDE_NAME_KM} from '../campusGuide';
import { GuideMascot } from './GuideMascot';
import './LocationGuide.css';
import {listenOnce,sttSupported} from '../lib/voice';
import {GuideNarrator,type NarrationStatus} from '../lib/guideNarrator';
import {LANGS,type LangCode} from '../lib/voice';
import {guideLanguage,useGuideLanguage} from '../lib/guideLanguage';
import {locationGuideReply} from '../lib/locationGuideReply';
import {KHMER_GUIDE,KHMER_LANGUAGE_NAMES,khmerGuideTitle,khmerGuideQuestion,khmerSourceTitle} from '../guideKhmer';

type Message = GuideReply & { question?: string; lang:LangCode };

/** Non-modal, text-first guide shared by the capture and photo-tour previews. */
export function LocationGuide({ experienceId, locationId, objectId, openRequest=0, hidden=false, embedded=false, onOpenChange }: {
  experienceId: GuideExperience; locationId: string; objectId?: string; openRequest?:number; hidden?:boolean; embedded?:boolean; onOpenChange?: (open:boolean)=>void;
}) {
  const context = locationGuideContext(experienceId, locationId,objectId);
  const [open,setOpen] = useState(false), [question,setQuestion] = useState('');
  const [messages,setMessages] = useState<Message[]>([]), [loading,setLoading] = useState(false);
  const [speech,setSpeech]=useState<NarrationStatus>('idle'),[speechIndex,setSpeechIndex]=useState<number|null>(null);
  const narrator=useMemo(()=>new GuideNarrator(setSpeech),[]);
  const [listening,setListening]=useState(false),[voiceError,setVoiceError]=useState('');
  const {language:chosenLanguage,choose}=useGuideLanguage();
  const stopListen=useRef<null|(()=>void)>(null);
  const isCampus=experienceId==='campus';
  const isPenh=experienceId==='wat-phnom'||experienceId==='staircase-3dgs'||experienceId==='clock-3dgs',name=isCampus?'Campus guide':isPenh?'Penh':'Kiri';
  const language=isPenh||isCampus?chosenLanguage:guideLanguage('en');
  const km=language.code==='km',displayName=km?(isCampus?CAMPUS_GUIDE_NAME_KM:KHMER_GUIDE.name):name;
  const pending = useRef<AbortController|null>(null);
  const latestAnswer = useRef<HTMLElement>(null);
  const contextKey = `${experienceId}/${locationId}/${objectId??''}`;
  useLayoutEffect(()=>{
    const previous=pending.current; pending.current=null; previous?.abort();
    setMessages([]); setQuestion(''); setLoading(false);
    return ()=>{ const previous=pending.current; pending.current=null; previous?.abort(); narrator.dispose();stopListen.current?.();stopListen.current=null; };
  },[contextKey]);
  useEffect(()=>{if(openRequest>0)setOpen(true);},[openRequest]);
  useEffect(()=>{onOpenChange?.(open&&!hidden);return()=>onOpenChange?.(false);},[open,hidden,onOpenChange]);
  useEffect(()=>{if(hidden){const previous=pending.current;pending.current=null;previous?.abort();setLoading(false);narrator.stop();stopListen.current?.();stopListen.current=null;setListening(false);}},[hidden,narrator]);
  // Only reveal new answers. Opening an empty guide must not scroll past its
  // questions, and an embedded guide shares its parent's scroll container.
  useEffect(()=>{if(messages.length)latestAnswer.current?.scrollIntoView?.({block:'nearest'});},[messages]);
  if (!context||hidden) return null;

  const toggle = (next:boolean) => {
    if (!next) { const previous=pending.current; pending.current=null; previous?.abort(); setLoading(false); narrator.stop();stopListen.current?.();stopListen.current=null;setListening(false); }
    setOpen(next);
  };
  const narrate=(text:string,index:number,lang:LangCode)=>{
    if((speech==='speaking'||speech==='loading')&&speechIndex===index){narrator.stop();setSpeechIndex(null);return;}
    setSpeechIndex(index);void narrator.start(text,guideLanguage(lang).bcp,isPenh?'penh':undefined);
  };
  const listen=()=>{
    if(listening){stopListen.current?.();stopListen.current=null;setListening(false);return;}
    setVoiceError('');setListening(true);
    const unavailable=km?KHMER_GUIDE.voiceUnavailable:'Voice input unavailable. Please type your question.';
    try{stopListen.current=listenOnce(language.bcp,text=>{stopListen.current=null;setListening(false);setQuestion(text);},()=>{stopListen.current=null;setListening(false);setVoiceError(unavailable);});
      if(!stopListen.current){setListening(false);setVoiceError(unavailable);}}
    catch{setListening(false);setVoiceError(unavailable);}
  };
  const ask = async (value:string) => {
    const query=value.trim(); if (!query || loading) return;
    pending.current?.abort();
    const controller=new AbortController(); pending.current=controller;
    setLoading(true); setQuestion('');
    // A missing endpoint is an explicit saved-note preview, never a fake AI answer.
    const timeout=setTimeout(()=>controller.abort(),15_000);
    const reply=await askGuide({experienceId,locationId,objectId,lang:language.code,question:query},controller.signal);
    clearTimeout(timeout);
    if (pending.current!==controller || controller.signal.aborted) {
      if(pending.current===controller && controller.signal.aborted) {
        setMessages(items=>[...items.slice(-7),{question:query,...locationGuideReply(context,query,null,language.code)}]);
        setLoading(false);
        pending.current=null;
      }
      return;
    }
    const answer=locationGuideReply(context,query,reply,language.code);
    setMessages(items=>[...items.slice(-7),{question:query,...answer}]);
    setLoading(false);
    pending.current=null;
  };
  return <div className={`location-guide-host ${experienceId}${embedded?' location-guide-embedded':''}`}>
    {!open ? <button className="location-guide-launcher" onClick={()=>toggle(true)} aria-label={km?`${KHMER_GUIDE.ask} ${displayName}`:`Ask ${name} about this location`}>
      {isPenh?<img className="penh-avatar" src="/province-thumbnails/01-phnom-penh.webp" alt=""/>:isCampus?<span className="campus-guide-icon" aria-hidden="true">🏛</span>:<GuideMascot size={42} state="idle"/>}<span>{km?KHMER_GUIDE.ask:'Ask'} {displayName}</span>
    </button> : <aside className="location-guide-panel" aria-label={km?`${displayName} · មគ្គុទ្ទេសក៍`:`${name} location guide`} lang={language.bcp}>
      <header className="location-guide-header">
        {isPenh?<img className="penh-avatar" src="/province-thumbnails/01-phnom-penh.webp" alt=""/>:isCampus?<span className="campus-guide-icon" aria-hidden="true">🏛</span>:<GuideMascot size={54} state={loading?'talking':'idle'}/>}
        <div><strong>{km?KHMER_GUIDE.ask:'Ask'} {displayName}</strong><p>{km?khmerGuideTitle(context):objectId?context.title.split(' · ').slice(-1)[0]:context.title.replace(/^Wat Phnom · /,'')}</p></div>
        <button className="location-guide-close" onClick={()=>toggle(false)} aria-label={km?KHMER_GUIDE.minimize:`Minimize ${name} guide`}>−</button>
      </header>
      {(isPenh||isCampus)&&<label className="location-guide-language">{km?KHMER_GUIDE.language:'Language / ភាសា'} <select value={language.code} disabled={loading} onChange={e=>{narrator.stop();stopListen.current?.();setListening(false);setVoiceError('');setMessages([]);setQuestion('');choose(e.target.value as LangCode);}}>{LANGS.map(option=><option key={option.code} value={option.code}>{km?KHMER_LANGUAGE_NAMES[option.code]:option.name}</option>)}</select></label>}
      <div className="location-guide-scroll">
        {!embedded&&<p className="location-guide-intro">{km?(context.introductionKhmer??KHMER_GUIDE.introduction):context.introduction}</p>}
        <div className="location-guide-suggestions" aria-label={km?KHMER_GUIDE.suggested:'Suggested questions'}>
          {context.facts.slice(0,3).map(f=><button key={f.question} disabled={loading} onClick={()=>void ask(km?khmerGuideQuestion(f.question):f.question)}>{km?khmerGuideQuestion(f.question):f.question}</button>)}
        </div>
        <div className="location-guide-messages" role="log" aria-live="polite" aria-relevant="additions">
          {messages.map((message,index)=><article key={`${contextKey}/${index}`} ref={index===messages.length-1?latestAnswer:undefined}>
            <p className="location-guide-question">{message.question}</p>
            <div className="location-guide-answer">
              <small>{km?(message.fallback?KHMER_GUIDE.saved:`${displayName} · ${KHMER_GUIDE.answer}`):message.fallback?'Saved location notes · English':`${name} · AI answer · ${guideLanguage(message.lang).name}`}</small>
              <p>{message.text}</p>
              <button type="button" onClick={()=>narrate(message.text,index,message.lang)}>{speechIndex===index&&speech==='loading'?(km?KHMER_GUIDE.loadingVoice:'■ Loading voice…'):speechIndex===index&&speech==='speaking'?(km?KHMER_GUIDE.stop:'■ Stop narration'):(km?`▶ ${KHMER_GUIDE.listen}`:'▶ Listen')}</button>
              {!!message.sources?.length && <div className="location-guide-sources">
                {message.sources.map(source=>source.url
                  ? <a key={source.title} href={source.url} target="_blank" rel="noreferrer">↗ {km?khmerSourceTitle(source):source.title}</a>
                  : <span key={source.title}>{km?khmerSourceTitle(source):source.title}</span>)}
              </div>}
            </div>
          </article>)}
          {loading && <p role="status">{km?KHMER_GUIDE.checking:`${name} is checking this location’s notes…`}</p>}
        </div>
      </div>
      <form className="location-guide-form" onSubmit={e=>{e.preventDefault();void ask(question);}}>
        <label className="location-guide-label" htmlFor={`kiri-${experienceId}`}>{km?KHMER_GUIDE.questionLabel:'Ask about this location'}</label>
        <div><input id={`kiri-${experienceId}`} value={question} onChange={e=>setQuestion(e.target.value)} maxLength={500} placeholder={km?KHMER_GUIDE.placeholder:'Ask about history or this spot…'} disabled={loading}/>
          {sttSupported()&&<button type="button" onClick={listen} aria-label={km?KHMER_GUIDE.voice:'Ask by voice'} aria-pressed={listening}>{listening?(km?KHMER_GUIDE.stop:'Stop'):'🎤'}</button>}
          <button type="submit" disabled={loading||!question.trim()}>{km?KHMER_GUIDE.ask:'Ask'}</button></div>
        {(voiceError||speech==='unavailable')&&<p role="status">{voiceError||(km?KHMER_GUIDE.narrationUnavailable:'Narration is unavailable in this browser.')}</p>}
      </form>
      <details className="location-guide-about"><summary>{km?(isCampus?`អំពី${CAMPUS_GUIDE_NAME_KM}`:KHMER_GUIDE.about):`About ${name} · AI guide`}</summary>
        <p className="location-guide-footnote">{km?(isCampus?`${KHMER_GUIDE.privacy}។ ${KHMER_GUIDE.voicePrivacy}។`:KHMER_GUIDE.disclosure):<>{isPenh?'Penh is a fictional AI character · CamboVerse Center, CC BY 4.0. Her current voice is an approximation. ':''}Questions and requested narration are sent to Gemini when available. Optional voice input may use your browser’s speech service.</>}</p>
      </details>
    </aside>}
  </div>;
}
