import { useCallback, useEffect, useRef, useState } from 'react';
import { answerKunRound, newKunRound, pauseKunRound, resumeKunRound, startKunRound, tickKunRound, type KunLevel, type KunRound } from '../kunTraining';

export function useKunTraining(externalClock = false) {
  const [state, setState] = useState(newKunRound);
  const current = useRef(state);
  const update = useCallback((fn: (s: KunRound) => KunRound) => {
    const next = fn(current.current);
    if (next !== current.current) { current.current = next; setState(next); }
  }, []);
  const start = useCallback((level: KunLevel) => update(() => startKunRound(level)), [update]);
  const reset = useCallback((level: KunLevel) => update(() => newKunRound(level)), [update]);
  const answer = useCallback((id: string) => update(s => answerKunRound(s, id)), [update]);
  const pause = useCallback(() => update(pauseKunRound), [update]);
  const resume = useCallback(() => update(resumeKunRound), [update]);
  const tick = useCallback((seconds: number) => update(s => tickKunRound(s, seconds)), [update]);
  useEffect(() => {
    if (!['countdown', 'prompt', 'feedback'].includes(state.phase)) return;
    let frame = 0, last = 0;
    const animate = (now: number) => {
      if (!last) last = now;
      if (now - last >= 32) { update(s => tickKunRound(s, (now - last) / 1000)); last = now; }
      frame = requestAnimationFrame(animate);
    };
    if (!externalClock) frame = requestAnimationFrame(animate);
    const hide = () => { if (document.hidden) pause(); };
    document.addEventListener('visibilitychange', hide); window.addEventListener('blur', pause);
    return () => { cancelAnimationFrame(frame); document.removeEventListener('visibilitychange', hide); window.removeEventListener('blur', pause); };
  }, [state.phase, update, pause, externalClock]);
  return { state, start, reset, answer, pause, resume, tick };
}
export type KunSession = ReturnType<typeof useKunTraining>;
