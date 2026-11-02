import {useEffect,useState} from 'react';
import {LANGS,type LangCode} from './voice';

const key='camboverse-penh-language';
const changed='camboverse-guide-language';
export function guideLanguage(code:unknown) {return LANGS.find(language=>language.code===code)??LANGS[0];}
export function useGuideLanguage() {
  const [code,setCode]=useState<LangCode>(()=>{
    try{return guideLanguage(localStorage.getItem(key)).code;}catch{return 'en';}
  });
  useEffect(()=>{
    const sync=(event:Event)=>{if(event instanceof CustomEvent)setCode(guideLanguage(event.detail).code);};
    window.addEventListener(changed,sync);return()=>window.removeEventListener(changed,sync);
  },[]);
  const choose=(next:LangCode)=>{setCode(next);try{localStorage.setItem(key,next);}catch{/* Storage is optional. */}window.dispatchEvent(new CustomEvent(changed,{detail:next}));};
  return {language:guideLanguage(code),choose};
}
