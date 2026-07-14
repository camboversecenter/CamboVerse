import { useEffect, useRef, useState } from "react";
import { GuideMascot, type MascotState } from "./GuideMascot";
import { askGuide } from "../lib/guide";
import {
  LANGS,
  type LangCode,
  speak,
  stopSpeaking,
  ttsSupported,
  voiceFor,
  sttSupported,
  listenOnce,
} from "../lib/voice";
import type { Spot, Poi } from "../spots";

/**
 * Kiri the monkey's guide panel: he narrates the current place (or answers a
 * typed/spoken question) in the chosen language, reads it aloud on-device, and
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
  const [speaking, setSpeaking] = useState(false);
  const [listening, setListening] = useState(false);
  const [question, setQuestion] = useState("");
  const [sound, setSound] = useState(ttsSupported());
  const soundRef = useRef(sound);
  soundRef.current = sound;

  const bcp = LANGS.find((l) => l.code === lang)!.bcp;
  const hasVoice = ttsSupported() && !!voiceFor(bcp);

  const say = (t: string) => {
    if (!soundRef.current) return;
    speak(t, bcp, { onStart: () => setSpeaking(true), onEnd: () => setSpeaking(false) });
  };

  // Fetch narration whenever the place, POI, or language changes.
  useEffect(() => {
    const ctrl = new AbortController();
    setLoading(true);
    stopSpeaking();
    setSpeaking(false);
    askGuide({ spotId: spot.id, poiId: activePoi?.id ?? null, lang }, ctrl.signal).then((reply) => {
      if (ctrl.signal.aborted) return;
      const t = reply?.text?.trim() || activePoi?.info || spot.blurb;
      setText(t);
      setLoading(false);
      say(t);
    });
    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spot.id, activePoi?.id, lang]);

  // Stop any speech when the panel unmounts.
  useEffect(() => () => stopSpeaking(), []);

  const ask = (q: string) => {
    const query = q.trim();
    if (!query) return;
    setQuestion("");
    setLoading(true);
    stopSpeaking();
    setSpeaking(false);
    askGuide({ spotId: spot.id, poiId: activePoi?.id ?? null, lang, question: query }).then((reply) => {
      const t = reply?.text?.trim() || "Sorry, I could not answer that just now.";
      setText(t);
      setLoading(false);
      say(t);
    });
  };

  const toggleSound = () => {
    if (sound) {
      stopSpeaking();
      setSpeaking(false);
      setSound(false);
    } else {
      setSound(true);
      if (text) speak(text, bcp, { onStart: () => setSpeaking(true), onEnd: () => setSpeaking(false) });
    }
  };

  const mic = () => {
    if (listening) return;
    setListening(true);
    listenOnce(
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
        {ttsSupported() && (
          <button className="guide-sound" onClick={toggleSound} aria-label="Toggle voice">
            {sound ? "🔊" : "🔇"}
          </button>
        )}
      </div>

      {sound && !hasVoice && <p className="guide-note">No {LANGS.find((l) => l.code === lang)!.name} voice on this device — showing text.</p>}

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
        />
        {sttSupported() && (
          <button type="button" className={listening ? "guide-mic on" : "guide-mic"} onClick={mic} aria-label="Ask by voice">
            🎤
          </button>
        )}
        <button type="submit" className="guide-send">
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
