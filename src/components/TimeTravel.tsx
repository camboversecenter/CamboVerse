import { useEffect, useState } from "react";
import { ERAS } from "../history";
import { GuideMascot, type MascotState } from "./GuideMascot";
import { askGuide } from "../lib/guide";
import { LANGS, type LangCode, speak, stopSpeaking, ttsSupported } from "../lib/voice";
import { getIdentity, earnedAchievements, claimCredential } from "../lib/identity";
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
  const [earned, setEarned] = useState<Set<string>>(new Set());
  const era = ERAS[i];
  const siteNote = era.sites?.[spot.id];
  const go = (d: number) => setI((v) => Math.min(ERAS.length - 1, Math.max(0, v + d)));

  // The learning credential earned by passing this era's quiz, at this site.
  const achievement = `history:${spot.id}:${era.id}`;
  const hasCredential = earned.has(achievement);

  // Load any credentials this visitor already holds (never mints an account).
  useEffect(() => {
    let live = true;
    (async () => {
      const id = await getIdentity(false);
      const set = await earnedAchievements(id);
      if (live) setEarned(set);
    })();
    return () => {
      live = false;
    };
  }, []);

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

        {/* Learn-to-earn: pass the era's quiz to earn a learning credential */}
        {era.quiz?.length ? (
          <EraQuiz
            key={achievement}
            era={era}
            earned={hasCredential}
            onEarned={() => setEarned((s) => new Set(s).add(achievement))}
            claim={() => claimCredential(achievement, `${spot.id}/${era.id}`)}
          />
        ) : null}

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

/**
 * A short, friendly quiz for one era. Answer every question correctly and the
 * visitor earns a free, portable learning credential on the CamboVerse rails —
 * the first "learn" loop of the platform. Non-monetary, and open to everyone.
 */
function EraQuiz({
  era,
  earned,
  onEarned,
  claim,
}: {
  era: { mood: string; quiz?: import("../history").QuizQuestion[] };
  earned: boolean;
  onEarned: () => void;
  claim: () => Promise<boolean>;
}) {
  const quiz = era.quiz ?? [];
  const [open, setOpen] = useState(false);
  const [picks, setPicks] = useState<number[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<"pass" | "fail" | null>(null);

  if (earned) {
    return (
      <div className="tt-cred earned" style={{ borderColor: era.mood }}>
        <span className="tt-cred-badge" style={{ background: era.mood }}>
          ✓
        </span>
        <span>Learning credential earned for this era.</span>
      </div>
    );
  }

  if (!open) {
    return (
      <button className="tt-cred-start" style={{ borderColor: era.mood, color: era.mood }} onClick={() => setOpen(true)}>
        🎓 Earn this era's learning credential
      </button>
    );
  }

  const answered = quiz.every((_, qi) => picks[qi] != null);

  const submit = async () => {
    const allCorrect = quiz.every((q, qi) => picks[qi] === q.answer);
    if (!allCorrect) {
      setResult("fail");
      return;
    }
    setSubmitting(true);
    const ok = await claim();
    setSubmitting(false);
    if (ok) {
      setResult("pass");
      onEarned();
    } else {
      setResult("fail");
    }
  };

  return (
    <div className="tt-quiz" style={{ borderColor: era.mood }}>
      {quiz.map((q, qi) => (
        <div key={qi} className="tt-q">
          <p className="tt-q-text">{q.q}</p>
          <div className="tt-q-choices">
            {q.choices.map((c, ci) => (
              <button
                key={ci}
                className={picks[qi] === ci ? "tt-choice on" : "tt-choice"}
                style={picks[qi] === ci ? { borderColor: era.mood, background: `${era.mood}22` } : undefined}
                onClick={() => {
                  setResult(null);
                  setPicks((p) => {
                    const n = p.slice();
                    n[qi] = ci;
                    return n;
                  });
                }}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      ))}
      {result === "fail" && <p className="tt-quiz-msg fail">Not quite — check the story above and try again.</p>}
      {result === "pass" && <p className="tt-quiz-msg pass">🎉 Correct! Your credential is saved.</p>}
      <div className="tt-quiz-actions">
        <button className="tt-quiz-cancel" onClick={() => setOpen(false)}>
          Close
        </button>
        <button
          className="tt-quiz-submit"
          style={{ background: era.mood }}
          disabled={!answered || submitting || result === "pass"}
          onClick={submit}
        >
          {submitting ? "Saving…" : "Submit"}
        </button>
      </div>
    </div>
  );
}
