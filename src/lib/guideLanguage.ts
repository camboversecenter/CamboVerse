import {useState} from 'react';
import {LANGS,type LangCode} from './voice';

const key='camboverse-penh-language';
export function guideLanguage(code:unknown) {return LANGS.find(language=>language.code===code)??LANGS[0];}
export function useGuideLanguage() {
  const [code,setCode]=useState<LangCode>(()=>{
    try{return guideLanguage(localStorage.getItem(key)).code;}catch{return 'en';}
  });
  const choose=(next:LangCode)=>{setCode(next);try{localStorage.setItem(key,next);}catch{/* Storage is optional. */}};
  return {language:guideLanguage(code),choose};
}
