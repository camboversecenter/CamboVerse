import { useCallback, useEffect, useRef, useState } from 'react';
import type { GamePlay } from '../games';
import { actGame, newGame, tickGame, type GameAction, type GameLevel } from '../khmerGameEngine';

export function useKhmerGame(kind: GamePlay, level: GameLevel, active: boolean) {
  const [state, setState] = useState(() => newGame(kind, level));
  const current = useRef(state);
  const send = useCallback((action: GameAction) => {
    const next = actGame(current.current, action);
    if (next !== current.current) { current.current = next; setState(next); }
  }, []);
  useEffect(() => { current.current = newGame(kind, level); setState(current.current); }, [kind, level, active]);
  useEffect(() => {
    if (!active || !['playing', 'countdown'].includes(state.phase)) return;
    let frame = 0, last = 0;
    const animate = (now: number) => {
      if (!last) last = now;
      const elapsed = now - last;
      if (elapsed >= 32) {
        const next = tickGame(current.current, elapsed / 1000);
        last = now;
        if (next !== current.current) { current.current = next; setState(next); }
      }
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    const hide = () => { if (document.hidden) send('pause'); };
    const blur = () => send('pause');
    document.addEventListener('visibilitychange', hide);
    window.addEventListener('blur', blur);
    return () => { cancelAnimationFrame(frame); document.removeEventListener('visibilitychange', hide); window.removeEventListener('blur', blur); };
  }, [active, send, state.phase]);
  return { state, send };
}
export type KhmerGameSession = ReturnType<typeof useKhmerGame>;
