import { useEffect, useMemo } from 'react';
import { useXR } from '@react-three/xr';
import { CanvasTexture, SRGBColorSpace } from 'three';
import { KHMER_GAMES, type KhmerGame } from '../games';
import { GAME_RULES, type GameLevel } from '../khmerGameEngine';
import { drawGameBoard } from '../gameArtwork';
import { gameProgress, type GameSaveStatus } from './GamePlay';
import type { KhmerGameSession } from './useKhmerGame';

function XRLabel({ text, at, width = 2.2, height = .16, button, disabled = false }: {
  text: string; at: [number, number, number]; width?: number; height?: number; button?: () => void; disabled?: boolean;
}) {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas'); canvas.width = 900; canvas.height = 96;
    const c = canvas.getContext('2d')!;
    c.fillStyle = button ? disabled ? '#42534d' : '#bfe3b3' : '#142e2a'; c.fillRect(0, 0, 900, 96);
    c.font = '600 34px system-ui'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillStyle = button ? '#173329' : '#f3ecd9'; c.fillText(text, 450, 48, 860);
    const value = new CanvasTexture(canvas); value.colorSpace = SRGBColorSpace; return value;
  }, [text, !!button, disabled]);
  useEffect(() => () => texture.dispose(), [texture]);
  return <mesh position={at} onClick={event => { event.stopPropagation(); if (!disabled) button?.(); }}>
    <planeGeometry args={[width, height]} /><meshBasicMaterial map={texture} toneMapped={false} />
  </mesh>;
}

export function GamesXRPanel({ game, gameI, onPick, session, playing, onPlay, onClose, onNext, level, onLevel, saveStatus, onRetrySave, onExit }: {
  game: KhmerGame; gameI: number; onPick: (i: number) => void; session: KhmerGameSession; playing: boolean;
  onPlay: () => void; onClose: () => void; onNext: () => void; level: GameLevel; onLevel: (level: GameLevel) => void;
  saveStatus: GameSaveStatus; onRetrySave: () => void; onExit: () => void;
}) {
  const inXR = useXR(s => s.session != null);
  const canvas = useMemo(() => { const c = document.createElement('canvas'); c.width = 600; c.height = 280; return c; }, []);
  const texture = useMemo(() => { const t = new CanvasTexture(canvas); t.colorSpace = SRGBColorSpace; return t; }, [canvas]);
  useEffect(() => () => texture.dispose(), [texture]);
  useEffect(() => {
    if (!inXR) return;
    drawGameBoard(canvas.getContext('2d')!, session.state, game.color); texture.needsUpdate = true;
  }, [session.state, game.color, texture, canvas, inXR]);
  if (!inXR) return null;
  const { state: s, send } = session;
  const rules = GAME_RULES[game.play];
  const busy = s.phase !== 'playing' || s.cooldown > 0;
  return <group position={[0, 1.55, 3]}>
    <mesh position={[0, 0, -.02]}><boxGeometry args={[2.65, 2.15, .025]} /><meshBasicMaterial color="#142e2a" /></mesh>
    <XRLabel text={`Khmer Games · ${game.english}`} at={[0, .94, 0]} />
    {!playing ? <>
      {KHMER_GAMES.map((g, i) => <XRLabel key={g.id} text={`${i === gameI ? '• ' : ''}${g.english}`} at={[0, .64 - i * .24, 0]} height={.2} button={() => onPick(i)} />)}
      <XRLabel text={level === 'practice' ? 'Relaxed · switch to Challenge' : 'Challenge · switch to Relaxed'} at={[0, -.35, 0]} height={.18} button={() => onLevel(level === 'practice' ? 'challenge' : 'practice')} />
      <XRLabel text="Play selected game" at={[0, -.61, 0]} height={.22} button={onPlay} />
      <XRLabel text="Exit VR" at={[0, -.89, 0]} height={.18} button={onExit} />
    </> : <>
      <mesh position={[0, .35, 0]}><planeGeometry args={[2.25, 1.05]} /><meshBasicMaterial map={texture} toneMapped={false} /></mesh>
      <XRLabel text={s.phase === 'ready' ? rules.goal : s.phase === 'result' ? `${s.won ? 'Round won!' : 'Keep practising'} · ${s.score}/100` : s.phase === 'paused' ? 'Paused — progress is frozen' : gameProgress(s)} at={[0, -.27, .01]} height={.15} />
      <XRLabel text={s.feedback || (s.phase === 'ready' ? rules.controls : 'Point at a button and select.')} at={[0, -.44, .01]} height={.13} />
      {s.phase === 'ready' || s.phase === 'result' ? <>
        <XRLabel text={s.phase === 'ready' ? 'Start round' : 'Play again'} at={[-.58, -.64, .01]} width={1.08} height={.2} button={() => send('start')} />
        <XRLabel text="Next game" at={[.58, -.64, .01]} width={1.08} height={.2} button={onNext} />
      </> : s.phase === 'paused' ? <>
        <XRLabel text="Resume" at={[-.58, -.64, .01]} width={1.08} height={.2} button={() => send('resume')} />
        <XRLabel text="Restart" at={[.58, -.64, .01]} width={1.08} height={.2} button={() => send('restart')} />
      </> : game.play === 'race' ? <>
        <XRLabel text={`Left${s.nextFoot === 'left' ? ' · next' : ''}`} at={[-.58, -.64, .01]} width={1.08} height={.2} disabled={busy} button={() => send('left')} />
        <XRLabel text={`Right${s.nextFoot === 'right' ? ' · next' : ''}`} at={[.58, -.64, .01]} width={1.08} height={.2} disabled={busy} button={() => send('right')} />
      </> : <XRLabel text={game.play === 'aim' ? 'Swing' : game.play === 'catch' ? 'Catch' : 'Pull together'} at={[0, -.64, .01]} height={.2} disabled={busy} button={() => send('action')} />}
      <XRLabel text="Game collection" at={[-.58, -.9, .01]} width={1.08} height={.18} button={onClose} />
      <XRLabel text={s.phase === 'result' ? saveStatus === 'failed' ? 'Retry Passport save' : saveStatus === 'saved' ? 'Passport saved · Exit VR' : 'Exit VR' : 'Pause'} at={[.58, -.9, .01]} width={1.08} height={.18} button={s.phase === 'result' ? saveStatus === 'failed' ? onRetrySave : onExit : () => send('pause')} />
    </>}
  </group>;
}
