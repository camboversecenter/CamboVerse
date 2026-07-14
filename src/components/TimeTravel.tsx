import { useEffect, useState } from "react";
import { ERAS } from "../history";
import { GuideMascot, type MascotState } from "./GuideMascot";
import { askGuide } from "../lib/guide";
import { LANGS, type LangCode, speak, stopSpeaking, ttsSupported } from "../lib/voice";
import type { Spot } from "../spots";

/**
 * "Back in Time" — a journey through the ages of Cambodia, laid over the site so
 * it feels like the place itself is time-shifting. Scrub the timeline, and each
 * era tints the scene, tells the story of that generation (with a note on this
 * very site), and Kiri the monkey can narrate it aloud in your language.
 */
export function TimeTravel({ spot, onClose }: { spot: Spot; onClose: () => void }) {
  const [i, setI] = useState(2); // start at the Angkor golden age
  const [lang, setLang] = useState<LangCode>("en");
  const [speaking, setSpeaking] = useState(false);
  const [loading, setLoading] = useState(false);
  const era = ERAS[i];
  const siteNote = era.sites?.[spot.id];
  const go = (d: number) => setI((v) => Math.min(ERAS.length - 1, Math.max(0, v + d)));

  // Stop any narration when the era changes or the panel closes.
  useEffect(() => {
    stopSpeaking();
    setSpeaking(false);
  }, [i, lang]);
  useEffect(() => () => stopSpeaking(), []);

  const narrate = async () => {
    if (speaking) {
      stopSpeaking();
      setSpeaking(false);
      return;
    }
    setLoading(true);
    const reply = await askGuide({ spotId: spot.id, eraId: era.id, lang });
    const text = reply?.text?.trim() || [era.story, siteNote].filter(Boolean).join(" ");
    setLoading(false);
    const bcp = LANGS.find((l) => l.code === lang)!.bcp;
    speak(text, bcp, { onStart: () => setSpeaking(true), onEnd: () => setSpeaking(false) });
  };

  const mascotState: MascotState = speaking || loading ? "talking" : "idle";

  return (
    <div className="timetravel">
      {/* Era-coloured veil over the 3D scene */}
      <div
        className="tt-veil"
        style={{ background: `radial-gradient(120% 90% at 50% 0%, transparent 30%, ${era.mood}66 100%)` }}
      />

      <div className="tt-top">
        <span className="tt-title">⏳ Back in Time · {spot.name}</span>
        <button className="tt-close" onClick={onClose} aria-label="Leave the time journey">
          ✕
        </button>
      </div>

      <div className="tt-panel" style={{ borderColor: era.mood }}>
        {/* Timeline rail */}
        <div className="tt-rail">
          {ERAS.map((e, j) => (
            <button
              key={e.id}
              className={j === i ? "tt-chip on" : "tt-chip"}
              style={j === i ? { background: e.mood, borderColor: e.mood, color: "#10140b" } : undefined}
              onClick={() => setI(j)}
            >
              {e.years.split("–")[0]}
            </button>
          ))}
        </div>

        <div className="tt-head">
          <span className="tt-age" style={{ color: era.mood }}>
            {era.age}
          </span>
          <span className="tt-years">{era.years}</span>
        </div>
        <h2>
          {era.name} <span className="khmer">{era.khmer}</span>
        </h2>
        <p className="tt-blurb">{era.blurb}</p>
        <p className="tt-story">{era.story}</p>
        {siteNote && (
          <p className="tt-site" style={{ borderColor: era.mood }}>
            <b>At {spot.name}:</b> {siteNote}
          </p>
        )}
        <ul className="tt-highlights">
          {era.highlights.map((h) => (
            <li key={h} style={{ borderColor: era.mood }}>
              {h}
            </li>
          ))}
        </ul>

        {/* Kiri narrates this era */}
        <div className="tt-kiri">
          <div className={`tt-kiri-face${speaking ? " speaking" : ""}`}>
            <GuideMascot state={mascotState} size={52} />
          </div>
          <div className="tt-kiri-langs">
            {LANGS.map((l) => (
              <button
                key={l.code}
                className={l.code === lang ? "lang on" : "lang"}
                onClick={() => setLang(l.code)}
              >
                {l.name}
              </button>
            ))}
          </div>
          {ttsSupported() && (
            <button className="tt-narrate" onClick={narrate}>
              {speaking ? "⏸ Stop" : loading ? "…" : "🔊 Kiri narrates"}
            </button>
          )}
        </div>

        <div className="tt-nav">
          <button onClick={() => go(-1)} disabled={i === 0}>
            ◂ Earlier
          </button>
          <span className="tt-count">
            {i + 1} / {ERAS.length}
          </span>
          <button onClick={() => go(1)} disabled={i === ERAS.length - 1}>
            Later ▸
          </button>
        </div>
      </div>
    </div>
  );
}
