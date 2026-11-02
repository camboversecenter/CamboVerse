import {savedLocationAnswer,type LocationContext} from '../locationGuide';
import {isKhmerGuideText,savedKhmerLocationAnswer} from '../guideKhmer';
import type {GuideReply} from './guide';
import type {LangCode} from './voice';

/** Both browser and immersive guides enforce the selected answer language. */
export function locationGuideReply(context:LocationContext,question:string,reply:GuideReply|null,lang:LangCode):GuideReply&{lang:LangCode} {
  const text=typeof reply?.text==='string'?reply.text.trim():'';
  if(lang==='km')return reply&&text&&isKhmerGuideText(text)
    ?{...reply,text,lang:'km'}:{...savedKhmerLocationAnswer(context,question),fallback:true,lang:'km'};
  return reply&&text?{...reply,text,lang:reply.lang??(reply.fallback?'en':lang)}
    :{...savedLocationAnswer(context,question),fallback:true,lang:'en'};
}
