import { useEffect, useId, useRef } from 'react';
import type { KhmerGame } from '../games';
import { GAME_RULES, type GameAction, type GameState } from '../khmerGameEngine';
import { drawGameBoard } from '../gameArtwork';
import type { KhmerGameSession } from './useKhmerGame';

export type GameSaveStatus = 'idle' | 'saving' | 'saved' | 'failed';
export function GameBoard({ state, color }: { state: GameState; color: string }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const context = canvas.current?.getContext('2d');
    if (context) drawGameBoard(context, state, color);
  }, [state, color]);
  return <canvas ref={canvas} width={600} height={280} className="kg-board" role="img" aria-label={`Game board. ${gameProgress(state)}`} />;
}
export function gameProgress(s: GameState) {
  if (s.kind === 'race') return `You ${Math.round(s.you)}% · Rival ${Math.round(s.rival)}%`;
  if (s.kind === 'tug') return `Rope ${Math.round(s.you)}% · ${Math.max(0, 40 - Math.floor(s.elapsed))}s left`;
  return `${s.hits} ${s.kind === 'aim' ? 'hits' : 'catches'} · ${s.attempts} of 5 attempts`;
}
export function GamePlay({ game, session, onClose, onNext, saveStatus, onRetrySave, localSaved }: {
  game: KhmerGame; session: KhmerGameSession; onClose: () => void; onNext: () => void;
  saveStatus: GameSaveStatus; onRetrySave: () => void; localSaved: boolean;
}) {
  const { state: s, send } = session;
  const card = useRef<HTMLDivElement>(null);
  const title = useId();
  const rules = GAME_RULES[game.play];
  const callbacks = useRef({ onClose, send }); callbacks.current = { onClose, send };
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    card.current?.querySelector<HTMLButtonElement>('[data-primary]')?.focus();
    const keys = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); callbacks.current.onClose(); return; }
      if (e.key === 'Tab') {
        const buttons = [...(card.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled), summary') ?? [])];
        const first = buttons[0], last = buttons[buttons.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
        if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
        return;
      }
      if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
      // Preserve Space/Enter activation on focused dialog controls.
      if (e.code === 'Space' && e.target instanceof HTMLElement && e.target.closest('button, summary')) return;
      const action: GameAction | undefined = e.code === 'ArrowLeft' || e.code === 'KeyA' ? 'left'
        : e.code === 'ArrowRight' || e.code === 'KeyD' ? 'right' : e.code === 'Space' ? 'action' : undefined;
      if (action && card.current?.dataset.phase === 'playing') { e.preventDefault(); callbacks.current.send(action); }
      if (e.code === 'KeyP') { e.preventDefault(); callbacks.current.send(card.current?.dataset.phase === 'paused' ? 'resume' : 'pause'); }
    };
    window.addEventListener('keydown', keys);
    return () => { window.removeEventListener('keydown', keys); queueMicrotask(() => previous?.focus()); };
  }, []);
  useEffect(() => {
    if (['result', 'paused', 'ready'].includes(s.phase)) card.current?.querySelector<HTMLButtonElement>('[data-primary]')?.focus();
  }, [s.phase]);
  const active = s.phase === 'playing' || s.phase === 'countdown';
  return <div className="kg-overlay">
    <div ref={card} data-phase={s.phase} className="kg-dialog" role="dialog" aria-modal="true" aria-labelledby={title}>
      <header className="kg-dialog-head"><div><span className="kg-eyebrow">{s.level === 'practice' ? 'RELAXED PRACTICE' : 'TIMING CHALLENGE'}</span><h2 id={title}>{game.english}</h2><span className="khmer">{game.khmer}</span></div><button onClick={onClose} aria-label="Close game" className="kg-icon">×</button></header>
      <GameBoard state={s} color={game.color} />
      <div className="kg-game-content">
        {s.phase === 'ready' ? <>
          <h3>{rules.goal}</h3><p>{rules.controls}</p>
          <p className="kg-key-hint">Touch the buttons or use {rules.keys.toLowerCase()}.</p>
          <button data-primary className="kg-primary" onClick={() => send('start')}>Start round</button>
          <small>A short solo adaptation. Traditional play happens together.</small>
        </> : s.phase === 'result' ? <>
          <div className="kg-result-heading"><span>{s.won ? 'Round won' : 'Keep practising'}</span><strong>{s.score}<small> / 100</small></strong></div>
          <p>{gameProgress(s)}</p>
          <p className="kg-record-status" role="status">{localSaved ? 'Result saved on this device.' : 'Result kept for this visit; device storage is unavailable.'} {s.won && (saveStatus === 'saving' ? 'Saving Passport stamp…' : saveStatus === 'saved' ? 'Passport stamp saved.' : saveStatus === 'failed' ? 'Passport is unavailable. You can retry saving.' : '')}</p>
          {s.won && saveStatus === 'failed' && <button className="kg-secondary" onClick={onRetrySave}>Retry Passport save</button>}
          <div className="kg-action-row"><button data-primary className="kg-primary" onClick={() => send('restart')}>Play again</button><button className="kg-secondary" onClick={onNext}>Next game →</button></div>
          {!s.won && <p className="kg-key-hint">{rules.controls}</p>}
        </> : s.phase === 'paused' ? <>
          <h3>Round paused</h3><p>Your progress and the timer are frozen.</p>
          <div className="kg-action-row"><button data-primary className="kg-primary" onClick={() => send('resume')}>Resume round</button><button className="kg-secondary" onClick={() => send('restart')}>Restart</button></div>
        </> : <>
          <div className="kg-scoreline"><span>{gameProgress(s)}</span><button className="kg-secondary" onClick={() => send('pause')}>Pause</button></div>
          <p className="kg-feedback" role="status" aria-live="polite">{s.phase === 'countdown' ? `Get ready… ${Math.ceil(s.countdown)}` : s.feedback || rules.goal}</p>
          {game.play === 'race' ? <div className="kg-action-row">{(['left', 'right'] as const).map(foot => <button className={`kg-hop${s.nextFoot === foot ? ' next' : ''}`} key={foot} disabled={s.phase !== 'playing' || s.cooldown > 0} onClick={() => send(foot)}>{foot === 'left' ? '← Left' : 'Right →'}{s.nextFoot === foot ? ' · next' : ''}</button>)}</div>
          : <button className="kg-primary kg-main-action" disabled={s.phase !== 'playing' || s.cooldown > 0} onClick={() => send('action')}>{game.play === 'aim' ? 'Swing' : game.play === 'tug' ? 'Pull together' : 'Catch'}</button>}
          <p className="kg-key-hint">{rules.keys} · P to pause · Esc to close</p>
        </>}
        {!active && <button className="kg-text-button" onClick={onClose}>Back to game collection</button>}
      </div>
    </div>
  </div>;
}
