import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { askGuide, type GuideReply } from '../lib/guide';
import { locationGuideContext, savedLocationAnswer, type GuideExperience } from '../locationGuide';
import { GuideMascot } from './GuideMascot';
import './LocationGuide.css';
import {listenOnce,sttSupported} from '../lib/voice';
import {GuideNarrator,type NarrationStatus} from '../lib/guideNarrator';
import {LANGS,type LangCode} from '../lib/voice';
import {guideLanguage,useGuideLanguage} from '../lib/guideLanguage';

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
  const isPenh=experienceId==='wat-phnom'||experienceId==='staircase-3dgs'||experienceId==='clock-3dgs',name=isPenh?'Penh':'Kiri';
  const language=isPenh?chosenLanguage:guideLanguage('en');
  const pending = useRef<AbortController|null>(null);
  const log = useRef<HTMLDivElement>(null);
  const contextKey = `${experienceId}/${locationId}/${objectId??''}`;
  useLayoutEffect(()=>{
    const previous=pending.current; pending.current=null; previous?.abort();
    setMessages([]); setQuestion(''); setLoading(false);
    return ()=>{ const previous=pending.current; pending.current=null; previous?.abort(); narrator.dispose();stopListen.current?.();stopListen.current=null; };
  },[contextKey]);
  useEffect(()=>{if(openRequest>0)setOpen(true);},[openRequest]);
  useEffect(()=>{if(hidden){const previous=pending.current;pending.current=null;previous?.abort();setLoading(false);narrator.stop();stopListen.current?.();stopListen.current=null;setListening(false);}},[hidden,narrator]);
  useEffect(()=>{ if(log.current)log.current.scrollTop=log.current.scrollHeight; },[messages,loading,open]);
  if (!context||hidden) return null;

  const toggle = (next:boolean) => {
    if (!next) { const previous=pending.current; pending.current=null; previous?.abort(); setLoading(false); narrator.stop();stopListen.current?.();stopListen.current=null;setListening(false); }
    setOpen(next); onOpenChange?.(next);
  };
  const narrate=(text:string,index:number,lang:LangCode)=>{
    if((speech==='speaking'||speech==='loading')&&speechIndex===index){narrator.stop();setSpeechIndex(null);return;}
    setSpeechIndex(index);void narrator.start(text,guideLanguage(lang).bcp,isPenh?'penh':undefined);
  };
  const listen=()=>{
    if(listening){stopListen.current?.();stopListen.current=null;setListening(false);return;}
    setVoiceError('');setListening(true);
    try{stopListen.current=listenOnce(language.bcp,text=>{stopListen.current=null;setListening(false);setQuestion(text);},()=>{stopListen.current=null;setListening(false);setVoiceError('Voice input unavailable. Please type your question.');});
      if(!stopListen.current){setListening(false);setVoiceError('Voice input unavailable. Please type your question.');}}
    catch{setListening(false);setVoiceError('Voice input unavailable. Please type your question.');}
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
        setMessages(items=>[...items.slice(-7),{question:query,...savedLocationAnswer(context,query),fallback:true,lang:'en'}]);
        setLoading(false);
        pending.current=null;
      }
      return;
    }
    const valid=reply && typeof reply.text==='string' && reply.text.trim();
    const answer=valid?reply:{...savedLocationAnswer(context,query),fallback:true};
    setMessages(items=>[...items.slice(-7),{question:query,...answer,lang:answer.fallback?'en':language.code}]);
    setLoading(false);
    pending.current=null;
  };
  return <div className={`location-guide-host ${experienceId}${embedded?' location-guide-embedded':''}`}>
    {!open ? <button className="location-guide-launcher" onClick={()=>toggle(true)} aria-label={`Ask ${name} about this location`}>
      {isPenh?<img className="penh-avatar" src="/province-thumbnails/01-phnom-penh.webp" alt=""/>:<GuideMascot size={42} state="idle"/>}<span>Ask {name}</span>
    </button> : <aside className="location-guide-panel" aria-label={`${name} location guide`}>
      <header className="location-guide-header">
        {isPenh?<img className="penh-avatar" src="/province-thumbnails/01-phnom-penh.webp" alt=""/>:<GuideMascot size={54} state={loading?'talking':'idle'}/>}
        <div><strong>Ask {name}</strong><p>{context.title}{isPenh?' · Fictional AI guide':''}</p></div>
        <button className="location-guide-close" onClick={()=>toggle(false)} aria-label={`Minimize ${name} guide`}>−</button>
      </header>
      {isPenh&&<label className="location-guide-language">Language / ភាសា <select value={language.code} disabled={loading} onChange={e=>{narrator.stop();stopListen.current?.();setListening(false);choose(e.target.value as LangCode);}}>{LANGS.map(option=><option key={option.code} value={option.code}>{option.name}</option>)}</select></label>}
      <div className="location-guide-scroll" ref={log}>
        <p className="location-guide-intro">{context.introduction}</p>
        <div className="location-guide-suggestions" aria-label="Suggested questions">
          {context.facts.slice(0,3).map(f=><button key={f.question} disabled={loading} onClick={()=>void ask(f.question)}>{f.question}</button>)}
        </div>
        <div className="location-guide-messages" role="log" aria-live="polite" aria-relevant="additions">
          {messages.map((message,index)=><article key={`${contextKey}/${index}`}>
            <p className="location-guide-question">{message.question}</p>
            <div className="location-guide-answer">
              <small>{message.fallback?'Saved location notes · English':`${name} · AI answer · ${guideLanguage(message.lang).name}`}</small>
              <p>{message.text}</p>
              <button type="button" onClick={()=>narrate(message.text,index,message.lang)}>{speechIndex===index&&speech==='loading'?'■ Loading voice…':speechIndex===index&&speech==='speaking'?'■ Stop narration':'▶ Listen'}</button>
              {!!message.sources?.length && <div className="location-guide-sources">
                {message.sources.map(source=>source.url
                  ? <a key={source.title} href={source.url} target="_blank" rel="noreferrer">↗ {source.title}</a>
                  : <span key={source.title}>{source.title}</span>)}
              </div>}
            </div>
          </article>)}
          {loading && <p role="status">{name} is checking this location’s notes…</p>}
        </div>
      </div>
      <form className="location-guide-form" onSubmit={e=>{e.preventDefault();void ask(question);}}>
        <label className="location-guide-label" htmlFor={`kiri-${experienceId}`}>Ask about this location</label>
        <div><input id={`kiri-${experienceId}`} value={question} onChange={e=>setQuestion(e.target.value)} maxLength={500} placeholder="Ask about history or this spot…" disabled={loading}/>
          {sttSupported()&&<button type="button" onClick={listen} aria-pressed={listening}>{listening?'Stop':'🎤'}</button>}
          <button type="submit" disabled={loading||!question.trim()}>Ask</button></div>
        {(voiceError||speech==='unavailable')&&<p role="status">{voiceError||'Narration is unavailable in this browser.'}</p>}
      </form>
      <p className="location-guide-footnote">{isPenh?'Penh is a fictional AI character · CamboVerse Center, CC BY 4.0. Her current voice is an approximation. ':''}Questions and requested narration are sent to Gemini when available. Optional voice input may use your browser’s speech service.</p>
    </aside>}
  </div>;
}
