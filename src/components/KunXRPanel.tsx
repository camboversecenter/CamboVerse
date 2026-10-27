import { useEffect, useMemo, useState } from 'react';
import { useXR } from '@react-three/xr';
import { CanvasTexture, SRGBColorSpace } from 'three';
import { KUN_ABOUT, KUN_MOVES, moveById, type KunMove } from '../kunkhmer';
import { kunScore, type KunLevel } from '../kunTraining';
import type { KunSession } from './useKunTraining';

function Label({ text, at, width = 2.35, height = .19, action, disabled = false }: { text: string; at: [number,number,number]; width?: number; height?: number; action?: () => void; disabled?: boolean }) {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas'); canvas.width = 900; canvas.height = 100;
    const c = canvas.getContext('2d')!;
    c.fillStyle = action ? disabled ? '#454c50' : '#e3c68f' : '#202e35'; c.fillRect(0,0,900,100);
    c.fillStyle = action ? '#1f292c' : '#f1eadb'; c.font = '600 38px system-ui'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(text,450,50,850);
    const t = new CanvasTexture(canvas); t.colorSpace = SRGBColorSpace; return t;
  }, [text, !!action, disabled]);
  useEffect(() => () => texture.dispose(), [texture]);
  return <mesh position={at} onClick={e => { e.stopPropagation(); if (!disabled) action?.(); }}><planeGeometry args={[width,height]} /><meshBasicMaterial map={texture} toneMapped={false} /></mesh>;
}
export function KunXRPanel({ mode, onMode, selected, onDemo, session, level, onLevel, onStart, slow, onSlow, frozen, onFreeze, saveStatus, onRetry, onExit, muted, onMute }: {
  mode: 'learn' | 'train'; onMode: (m: 'learn' | 'train') => void; selected: KunMove; onDemo: (m: KunMove) => void;
  session: KunSession; level: KunLevel; onLevel: (l: KunLevel) => void; onStart: () => void;
  slow: boolean; onSlow: () => void; frozen: boolean; onFreeze: () => void;
  saveStatus: string; onRetry: () => void; onExit: () => void;
  muted: boolean; onMute: () => void;
}) {
  const xr = useXR(s => s.session != null);
  const [note, setNote] = useState(0);
  if (!xr) return null;
  const s = session.state, target = moveById(s.order[s.index]), last = s.answers.at(-1);
  const message = mode === 'learn' ? selected.english : s.phase === 'prompt' ? `Choose ${target?.english} · ${Math.ceil(s.remaining)}s` : s.phase === 'countdown' ? `Ready · ${Math.ceil(s.remaining)}` : s.phase === 'feedback' ? `${last?.correct ? 'Correct' : 'Review'} · ${target?.english}` : s.phase === 'paused' ? 'Paused' : s.phase === 'done' ? `Finished · ${kunScore(s)}/8 correct` : '8 prompts · 6 correct to complete';
  const fact = note === 0 ? { title: selected.english, body: selected.desc } : KUN_ABOUT[note - 1];
  const lines: string[] = [];
  for (const word of fact.body.split(' ')) {
    if (!lines.length || lines[lines.length - 1].length + word.length > 45) lines.push(word);
    else lines[lines.length - 1] += ` ${word}`;
  }
  return <><group position={[-1.6,1.65,3.5]} rotation={[0,.2,0]}>
    <mesh position={[0,0,-.025]}><boxGeometry args={[2.65,2.5,.04]} /><meshBasicMaterial color="#202e35" /></mesh>
    <Label text="Kun Khmer · learning ring" at={[0,1.1,0]} />
    <Label text={mode === 'learn' ? 'Switch to training challenge' : 'Return to technique study'} at={[0,.85,0]} action={() => onMode(mode === 'learn' ? 'train' : 'learn')} />
    <Label text={message} at={[0,.6,0]} />
    {KUN_MOVES.map((m,i) => <Label key={m.id} text={m.english} at={[(i % 2 === 0 ? -.61 : .61),.34-Math.floor(i/2)*.23,0]} width={1.16} disabled={mode === 'train' && s.phase !== 'prompt'} action={() => mode === 'learn' ? onDemo(m) : session.answer(m.id)} />)}
    {mode === 'learn' ? <>
      <Label text={slow ? 'Speed 0.5x' : 'Speed 1x'} at={[-.61,-.62,0]} width={1.16} action={onSlow} />
      <Label text={frozen ? 'Resume pose' : 'Freeze pose'} at={[.61,-.62,0]} width={1.16} action={onFreeze} />
      <Label text="Replay movement" at={[0,-.85,0]} action={() => onDemo(selected)} />
    </> : <>
      <Label text={s.phase === 'ready' || s.phase === 'done' ? 'Start round' : s.phase === 'paused' ? 'Resume round' : 'Pause round'} at={[-.61,-.62,0]} width={1.16} action={s.phase === 'ready' || s.phase === 'done' ? onStart : s.phase === 'paused' ? session.resume : session.pause} />
      <Label text="Restart" at={[.61,-.62,0]} width={1.16} action={onStart} />
      {s.phase === 'ready' || s.phase === 'done' ? <Label text={saveStatus === 'failed' && s.phase === 'done' ? 'Retry Passport save' : `Difficulty: ${level}`} at={[0,-.85,0]} action={saveStatus === 'failed' && s.phase === 'done' ? onRetry : () => onLevel(level === 'relaxed' ? 'challenge' : 'relaxed')} /> : <Label text={`Prompt ${s.index+1}/8 · ${kunScore(s)} correct`} at={[0,-.85,0]} />}
    </>}
    <Label text="Exit VR" at={[0,-1.1,0]} action={onExit} />
  </group><group position={[1.6,1.65,3.5]} rotation={[0,-.2,0]}>
    <mesh position={[0,0,-.025]}><boxGeometry args={[2.65,2.5,.04]} /><meshBasicMaterial color="#202e35" /></mesh>
    <Label text={`Learn more · ${note + 1}/5`} at={[0,1.1,0]} />
    <Label text={fact.title} at={[0,.85,0]} />
    {lines.map((line,i) => <Label key={i} text={line} height={.15} at={[0,.58-i*Math.min(.2,1.18/Math.max(1,lines.length-1)),0]} />)}
    <Label text="Next note" at={[0,-.85,0]} action={() => setNote(n => (n + 1) % 5)} />
    <Label text={muted ? 'Sound off · enable' : 'Sound on · mute'} at={[0,-1.1,0]} action={onMute} />
  </group></>;
}
