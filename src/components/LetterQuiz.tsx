import { useMemo, useState } from "react";
import { KHMER_FONTS, type KhmerGroup, type KhmerShape } from "../khmer";
import { claimCredential } from "../lib/identity";

/**
 * A quick match-the-sound quiz for one group of Khmer letters. Shows a letter
 * (in the current shape) and asks which sound it makes. Pass the round and you
 * earn a learning credential on the rails — it appears in your Heritage
 * Passport, tying the classroom into the platform's learn-to-earn loop.
 */
const ROUND = 8; // questions per round (fewer if the group is smaller)
const PASS = 0.75;

interface Question {
  glyph: string;
  answer: string;
  options: string[];
  correct: number;
}

function shuffle<T>(a: T[]): T[] {
  const r = a.slice();
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
}
const sample = <T,>(a: T[], k: number): T[] => shuffle(a).slice(0, k);

function buildQuestions(group: KhmerGroup): Question[] {
  const letters = group.letters;
  const romans = [...new Set(letters.map((l) => l.roman))];
  const chosen = sample(letters, Math.min(ROUND, letters.length));
  return chosen.map((l) => {
    const distractors = sample(romans.filter((r) => r !== l.roman), 3);
    const options = shuffle([l.roman, ...distractors]);
    return { glyph: l.display, answer: l.roman, options, correct: options.indexOf(l.roman) };
  });
}

export function LetterQuiz({
  group,
  shape,
  onClose,
  onEarned,
}: {
  group: KhmerGroup;
  shape: KhmerShape;
  onClose: () => void;
  onEarned: () => void;
}) {
  const questions = useMemo(() => buildQuestions(group), [group]);
  const family = KHMER_FONTS[shape].family;

  const [qi, setQi] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [results, setResults] = useState<boolean[]>([]);
  const [done, setDone] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [earned, setEarned] = useState(false);

  const q = questions[qi];
  const score = results.filter(Boolean).length;

  async function finish(all: boolean[]) {
    setDone(true);
    const s = all.filter(Boolean).length;
    if (s / all.length >= PASS) {
      setClaiming(true);
      const ok = await claimCredential(`alphabet:${group.id}`, `quiz:${s}/${all.length}`);
      setClaiming(false);
      if (ok) {
        setEarned(true);
        onEarned();
      }
    }
  }

  const pick = (i: number) => {
    if (picked != null) return;
    setPicked(i);
    const next = [...results, i === q.correct];
    setResults(next);
    window.setTimeout(() => {
      if (qi + 1 < questions.length) {
        setQi(qi + 1);
        setPicked(null);
      } else {
        finish(next);
      }
    }, 800);
  };

  if (done) {
    const passed = score / questions.length >= PASS;
    return (
      <div className="quiz">
        <div className="quiz-card quiz-result">
          <div className={passed ? "quiz-score pass" : "quiz-score"}>
            {score} / {questions.length}
          </div>
          {passed ? (
            <>
              <p className="quiz-msg pass">🎉 Passed! {group.title}.</p>
              <p className="quiz-sub">
                {claiming
                  ? "Saving your credential…"
                  : earned
                    ? "A learning credential was added to your Heritage Passport."
                    : "Nice work!"}
              </p>
            </>
          ) : (
            <>
              <p className="quiz-msg">Keep practising — {Math.ceil(questions.length * PASS)} correct to pass.</p>
              <p className="quiz-sub">Study the letters, then try again.</p>
            </>
          )}
          <button className="quiz-done" onClick={onClose}>
            Back to the classroom
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="quiz">
      <div className="quiz-card">
        <div className="quiz-top">
          <span className="quiz-progress">
            Question {qi + 1} / {questions.length}
          </span>
          <button className="quiz-x" onClick={onClose} aria-label="Close quiz">
            ✕
          </button>
        </div>
        <p className="quiz-q">What sound does this letter make?</p>
        <div className="quiz-glyph" style={{ fontFamily: `'${family}', 'Noto Sans Khmer', serif` }}>
          {q.glyph}
        </div>
        <div className="quiz-options">
          {q.options.map((opt, i) => {
            const cls =
              picked == null
                ? "quiz-opt"
                : i === q.correct
                  ? "quiz-opt correct"
                  : i === picked
                    ? "quiz-opt wrong"
                    : "quiz-opt";
            return (
              <button key={opt + i} className={cls} onClick={() => pick(i)} disabled={picked != null}>
                {opt}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
