import { useEffect, useMemo, useRef, useState } from "react";
import { GuideMascot, type MascotState } from "./GuideMascot";
import { askGuide } from "../lib/guide";
import {
  LANGS,
  type LangCode,
  sttSupported,
  listenOnce,
} from "../lib/voice";
import {GuideNarrator,type NarrationStatus} from '../lib/guideNarrator';
import type { Spot, Poi } from "../spots";

/**
 * Kiri the monkey's guide panel: he narrates the current place (or answers a
 * typed/spoken question) in the chosen language, replays saved narration, and
 * lets the visitor step through the site's points of interest with him.
 */
export function TourGuide({
  spot,
  activePoi,
  count,
  index,
  onPrev,
  onNext,
  onClose,
}: {
  spot: Spot;
  activePoi: Poi | null;
  count: number;
  index: number;
  onPrev: () => void;
  onNext: () => void;
  onClose: () => void;
}) {
  const [lang, setLang] = useState<LangCode>("en");
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [speech,setSpeech]=useState<NarrationStatus>('idle');
  const narrator=useMemo(()=>new GuideNarrator(setSpeech),[]);
  const [replyLang,setReplyLang]=useState<LangCode>('en');
  const [listening, setListening] = useState(false);
  const [question, setQuestion] = useState("");
  const pending=useRef<AbortController|null>(null);
  const stopListen=useRef<null|(()=>void)>(null);

  const bcp = LANGS.find((l) => l.code === lang)!.bcp;
  const speaking=speech==='speaking';

  // Fetch narration whenever the place, POI, or language changes.
  useEffect(() => {
    const ctrl = new AbortController();
    pending.current?.abort();pending.current=ctrl;
    setLoading(true);
    narrator.stop();stopListen.current?.();setListening(false);
    askGuide({ spotId: spot.id, poiId: activePoi?.id ?? null, lang }, ctrl.signal).then((reply) => {
      if (ctrl.signal.aborted) return;
      const t = reply?.text?.trim() || activePoi?.info || spot.blurb;
      setText(t);
      setReplyLang(reply?.lang??(reply?.text?lang:'en'));
      setLoading(false);
    });
    return () => ctrl.abort();
  }, [spot.id, spot.blurb, activePoi?.id, activePoi?.info, lang, narrator]);

  // Stop any speech when the panel unmounts.
  useEffect(() => () => {pending.current?.abort();stopListen.current?.();narrator.dispose();}, [narrator]);

  const ask = (q: string) => {
    const query = q.trim();
    if (!query||loading) return;
    setQuestion("");
    setLoading(true);
    narrator.stop();
    pending.current?.abort();const ctrl=new AbortController();pending.current=ctrl;
    askGuide({ spotId: spot.id, poiId: activePoi?.id ?? null, lang, question: query },ctrl.signal).then((reply) => {
      if(ctrl.signal.aborted||pending.current!==ctrl)return;
      const t = reply?.text?.trim() || "Sorry, I could not answer that just now.";
      setText(t);
      setReplyLang(reply?.lang??(reply?.text?lang:'en'));
      setLoading(false);
    });
  };

  const toggleSound = () => {
    if(speech==='speaking'||speech==='loading'){narrator.stop();return;}
    if(text&&!loading)void narrator.start(text,LANGS.find(l=>l.code===replyLang)!.bcp);
  };

  const mic = () => {
    if (listening) return;
    setListening(true);
    stopListen.current=listenOnce(
      bcp,
      (t) => {
        setListening(false);
        ask(t);
      },
      () => setListening(false),
    );
  };

  const mascotState: MascotState = speaking ? "talking" : loading ? "talking" : activePoi ? "pointing" : "idle";
  const where = activePoi ? activePoi.title : spot.name;

  return (
    <div className="guide">
      <button className="guide-close" onClick={onClose} aria-label="Close guide">
        ✕
      </button>

      <div className="guide-top">
        <div className={`guide-avatar${speaking ? " speaking" : ""}`}>
          <GuideMascot state={mascotState} size={92} />
        </div>
        <div className="guide-speech">
          <div className="guide-who">
            Kiri · <span className="guide-where">{where}</span>
            {count > 0 && activePoi && (
              <span className="guide-count">
                {index + 1}/{count}
              </span>
            )}
          </div>
          <p className={loading ? "guide-text loading" : "guide-text"}>
            {loading ? "…" : text}
          </p>
        </div>
      </div>

      <div className="guide-langs">
        {LANGS.map((l) => (
          <button
            key={l.code}
            className={l.code === lang ? "lang on" : "lang"}
            onClick={() => setLang(l.code)}
          >
            {l.name}
          </button>
        ))}
        <button className="guide-sound" onClick={toggleSound} disabled={loading} aria-label={speech==='speaking'||speech==='loading'?'Stop narration':'Listen to Kiri'}>
          {speech==='loading'?'Loading voice…':speech==='speaking'?'■ Stop':'🔊 Listen'}
        </button>
      </div>

      {replyLang!==lang&&!loading&&<p className="guide-note">Translation unavailable; showing English location notes.</p>}
      {speech==='unavailable'&&<p className="guide-note" role="status">Narration is unavailable. You can still read the answer.</p>}

      <form
        className="guide-ask"
        onSubmit={(e) => {
          e.preventDefault();
          ask(question);
        }}
      >
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder={listening ? "Listening…" : "Ask Kiri a question…"}
          aria-label="Ask a question"
          maxLength={500}
          disabled={loading}
        />
        {sttSupported() && (
          <button type="button" className={listening ? "guide-mic on" : "guide-mic"} onClick={mic} aria-label="Ask by voice">
            🎤
          </button>
        )}
        <button type="submit" className="guide-send" disabled={loading||!question.trim()}>
          Ask
        </button>
      </form>

      {count > 0 && (
        <div className="guide-nav">
          <button onClick={onPrev}>◂ Prev spot</button>
          <button onClick={onNext}>Next spot ▸</button>
        </div>
      )}
    </div>
  );
}
