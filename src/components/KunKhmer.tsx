import { Canvas, useFrame } from '@react-three/fiber';
import { createXRStore, XR, XROrigin, useXR } from '@react-three/xr';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Fighter } from './Fighter';
import { ExploreControls } from './ExploreControls';
import { KunXRPanel } from './KunXRPanel';
import { useKunTraining } from './useKunTraining';
import { KUN_MOVES, KUN_ABOUT, KUN_CREDENTIAL, moveById, type KunMove } from '../kunkhmer';
import { KUN_PASS, KUN_RECORD_KEY, KUN_ROUND, kunScore, parseKunRecord, promptSeconds, type KunLevel, type KunRecord } from '../kunTraining';
import { claimCredential, getIdentity, earnedAchievements } from '../lib/identity';
import { playBell, playHit, playWhoosh, setMuted, isMuted } from '../lib/kunSound';
import './KunKhmer.css';

type Mode = 'learn' | 'train';
type SaveStatus = 'idle' | 'saving' | 'saved' | 'failed';
const defensive = (id: string) => id === 'rung' || id === 'romiel';
function readRecord() { try { return parseKunRecord(localStorage.getItem(KUN_RECORD_KEY)); } catch { return parseKunRecord(null); } }
function detectQuality() {
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 4;
  return (navigator.hardwareConcurrency ?? 4) <= 4 || memory <= 3 || Math.min(screen.width, screen.height) < 500 ? 'normal' : 'ultra';
}
export function KunKhmer({ onBackToMap }: { onBackToMap: () => void }) {
  const store = useMemo(() => createXRStore({ emulate: false }), []);
  const [inVR, setInVR] = useState(false);
  const [vrSupported, setVRSupported] = useState(false);
  const [vrError, setVRError] = useState('');
  const [quality, setQuality] = useState(detectQuality);
  const ultra = inVR || quality === 'ultra';
  const [mode, setMode] = useState<Mode>('learn');
  const [selected, setSelected] = useState(KUN_MOVES[0]);
  const [level, setLevel] = useState<KunLevel>('relaxed');
  const [slow, setSlow] = useState(false);
  const [frozen, setFrozen] = useState(false);
  const [motion, setMotion] = useState(() => !matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [muted, setMutedState] = useState(() => { try { return localStorage.getItem('camboverse.kun.sound') === 'off' || isMuted(); } catch { return isMuted(); } });
  const [record, setRecord] = useState(readRecord);
  const records = useRef(record);
  const [localSaved, setLocalSaved] = useState(true);
  const [credential, setCredential] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const saveGeneration = useRef(0), saveBusy = useRef(false);
  const session = useKunTraining(inVR);
  const { state: s } = session;
  const [fighter, setFighter] = useState({ move: 'guard', partner: 'guard', trigger: 0, partnerTrigger: 0 });
  const reaction = useRef<ReturnType<typeof setTimeout>>();
  const lastDemo = useRef(0);
  const handled = useRef(0), resultHandled = useRef(false);
  const panel = useRef<HTMLElement>(null);
  const studio = useRef<HTMLDivElement>(null);
  const resetStance = useCallback(() => {
    clearTimeout(reaction.current); setFrozen(false);
    setFighter(f => ({ move: 'guard', partner: 'guard', trigger: f.trigger + 1, partnerTrigger: f.partnerTrigger + 1 }));
  }, []);
  const remember = useCallback((change: (old: KunRecord) => KunRecord) => {
    const next = change(records.current); records.current = next; setRecord(next);
    try { localStorage.setItem(KUN_RECORD_KEY, JSON.stringify(next)); setLocalSaved(true); } catch { setLocalSaved(false); }
  }, []);
  useEffect(() => { setMuted(muted); try { localStorage.setItem('camboverse.kun.sound', muted ? 'off' : 'on'); } catch { /* session preference still works */ } }, [muted]);
  useEffect(() => {
    let live = true;
    navigator.xr?.isSessionSupported('immersive-vr').then(ok => { if (live) setVRSupported(ok); }).catch(() => {});
    getIdentity(false).then(earnedAchievements).then(set => { if (live) setCredential(set.has(KUN_CREDENTIAL)); });
    return () => { live = false; clearTimeout(reaction.current); saveGeneration.current++; };
  }, []);
  const perform = useCallback((m: KunMove) => {
    clearTimeout(reaction.current); setSelected(m); setFrozen(false);
    setFighter(f => ({ move: m.id, partner: defensive(m.id) ? 'mat' : 'guard', trigger: f.trigger + 1, partnerTrigger: f.partnerTrigger + 1 }));
    playWhoosh();
    reaction.current = setTimeout(() => {
      if (!defensive(m.id)) setFighter(f => ({ ...f, partner: 'hurt', partnerTrigger: f.partnerTrigger + 1 }));
      if (m.id !== 'romiel') playHit(m.id === 'rung' ? 'block' : m.id === 'ti' ? 'kick' : m.id === 'kumpleang' ? 'knee' : m.id === 'sok' ? 'elbow' : 'punch');
    }, mode === 'learn' && slow ? 480 : 240);
  }, [mode, slow]);
  const demo = useCallback((m: KunMove) => {
    const now = performance.now(); if (now - lastDemo.current < 250) return;
    lastDemo.current = now; perform(m);
    remember(old => old.seen.includes(m.id) ? old : { ...old, seen: [...old.seen, m.id] });
  }, [perform, remember]);
  const invalidateSave = () => { saveGeneration.current++; saveBusy.current = false; setSaveStatus('idle'); };
  const switchMode = (next: Mode) => {
    invalidateSave(); session.reset(level); handled.current = 0; resultHandled.current = false;
    setMode(next); resetStance(); panel.current?.scrollTo({ top: 0 });
  };
  const start = () => {
    invalidateSave(); handled.current = 0; resultHandled.current = false; resetStance();
    session.start(level); playBell();
  };
  const saveVictory = useCallback(async (score: number) => {
    if (saveBusy.current) return;
    if (credential) { setSaveStatus('saved'); return; }
    saveBusy.current = true; setSaveStatus('saving');
    const generation = ++saveGeneration.current;
    let ok = false;
    try { ok = await claimCredential(KUN_CREDENTIAL, `spar:${score}/${KUN_ROUND}`); } catch { /* allow retry */ }
    if (generation !== saveGeneration.current) return;
    saveBusy.current = false; setSaveStatus(ok ? 'saved' : 'failed'); if (ok) setCredential(true);
  }, [credential]);
  useEffect(() => {
    if (s.phase === 'paused') clearTimeout(reaction.current);
    if (s.phase === 'feedback' && s.answers.length > handled.current) {
      handled.current = s.answers.length;
      const last = s.answers.at(-1)!;
      if (last.correct) perform(moveById(last.wanted)!); else resetStance();
    }
    if (s.phase === 'done' && !resultHandled.current) {
      resultHandled.current = true; resetStance();
      const score = kunScore(s);
      remember(old => ({ ...old, rounds: old.rounds + 1, wins: old.wins + Number(score >= KUN_PASS), best: Math.max(old.best, score) }));
      playBell(score >= KUN_PASS ? 2 : 1);
      if (score >= KUN_PASS) void saveVictory(score);
    }
  }, [s, perform, remember, saveVictory, resetStance]);
  const keyboard = useRef({ mode, s, demo, session }); keyboard.current = { mode, s, demo, session };
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.repeat || e.ctrlKey || e.metaKey || e.altKey || (e.target instanceof HTMLElement && e.target.closest('input, textarea, select, [contenteditable=true], summary'))) return;
      const current = keyboard.current;
      if (e.code === 'Escape') { current.session.pause(); return; }
      // A focused button keeps native Space activation; B is always available for Block.
      if (e.code === 'Space' && e.target instanceof HTMLElement && e.target.closest('button')) return;
      const move = e.code === 'KeyB' ? moveById('rung') : KUN_MOVES.find(m => m.key === e.key.toLowerCase());
      if (!move) return;
      if (current.mode === 'learn' || current.s.phase === 'prompt') {
        e.preventDefault(); if (current.mode === 'learn') current.demo(move); else current.session.answer(move.id);
      }
    };
    window.addEventListener('keydown', key); return () => window.removeEventListener('keydown', key);
  }, []);
  useEffect(() => { if (mode === 'train' && ['ready', 'paused', 'done'].includes(s.phase)) { panel.current?.scrollTo({ top: 0 }); panel.current?.querySelector<HTMLButtonElement>('[data-primary]')?.focus({ preventScroll: true }); } }, [mode, s.phase]);
  useEffect(() => { session.pause(); }, [inVR, session.pause]);
  useEffect(() => { if (s.phase === 'countdown') { studio.current?.scrollTo({ top: 0 }); panel.current?.scrollTo({ top: 0 }); } }, [s.phase]);
  const score = kunScore(s), last = s.answers.at(-1), target = moveById(s.order[s.index]);
  const active = ['countdown', 'prompt', 'feedback'].includes(s.phase);
  const review = [...new Set(s.answers.filter(a => !a.correct).map(a => a.wanted))];
  const inspect = (id: string) => { switchMode('learn'); setSelected(moveById(id)!); };
  const trainingMessage = s.phase === 'countdown' ? `Get ready · ${Math.ceil(s.remaining)}` : s.phase === 'prompt' ? `Choose ${target?.english}` : s.phase === 'feedback' ? last?.correct ? 'Correct · return to guard' : `${last?.picked === null ? 'Time ended' : 'Not quite'} · ${target?.english}` : s.phase === 'paused' ? 'Round paused' : s.phase === 'done' ? `${score} / ${KUN_ROUND} correct` : 'Eight prompts · six correct to complete';
  return <div ref={studio} className={`kk-studio${mode === 'train' && s.phase !== 'ready' ? ' kk-training-active' : ''}`}>
    <header className="kk-header"><button className="kk-secondary" onClick={onBackToMap}>← Map</button><div><span className="kk-eyebrow">MOVEMENT · CULTURE · COORDINATION</span><h1>Kun Khmer <span className="khmer">គុនខ្មែរ</span></h1></div><span className="kk-badge">{record.seen.length}/7 explored{credential ? ' · Passport ✓' : ''}</span></header>
    <nav className="kk-toolbar" aria-label="Training mode"><div className="kk-segment"><button aria-pressed={mode === 'learn'} onClick={() => switchMode('learn')}>01 · Explore techniques</button><button aria-pressed={mode === 'train'} onClick={() => switchMode('train')}>02 · Training challenge</button></div><button className="kk-secondary" aria-pressed={!muted} onClick={() => setMutedState(v => !v)}>Sound {muted ? 'off' : 'on'}</button></nav>
    <div className="kk-layout">
      <div className="kk-stage">
        <Canvas shadows={ultra} dpr={ultra ? [1, 2] : [1, 1.25]} camera={{ position: [3.6, 2.7, 6.7], fov: 39 }}>
          <XR store={store}><XRSession changed={setInVR} tick={session.tick} pause={session.pause} />
            <color attach="background" args={['#222b30']} /><fog attach="fog" args={['#222b30', 12, 28]} />
            <ambientLight intensity={.9} /><hemisphereLight args={['#ffefd8', '#48515b', 1.5]} />
            <directionalLight position={[-3, 8, 5]} intensity={2.1} castShadow={ultra} shadow-mapSize={[1024, 1024]} shadow-normalBias={.035} />
            <TrainingRing ultra={ultra} />
            <Fighter move={fighter.move} trigger={fighter.trigger} facing={Math.PI / 2} position={[-.75, .16, .05]} ultra={ultra} speed={mode === 'learn' && slow ? .5 : 1} paused={s.phase === 'paused' || frozen} idleMotion={motion && ultra && mode === 'learn'} />
            <Fighter move={fighter.partner} trigger={fighter.partnerTrigger} facing={-Math.PI / 2} palette="blue" position={[.75, .16, -.05]} ultra={ultra} speed={mode === 'learn' && slow ? .5 : 1} paused={s.phase === 'paused' || frozen} idleMotion={motion && ultra && mode === 'learn'} />
            <XROrigin position={[0, 0, 6]} /><Nav />
            <KunXRPanel mode={mode} onMode={switchMode} selected={selected} onDemo={demo} session={session} level={level} onLevel={setLevel} onStart={start} slow={slow} onSlow={() => setSlow(v => !v)} frozen={frozen} onFreeze={() => { clearTimeout(reaction.current); setFrozen(v => !v); }} saveStatus={saveStatus} onRetry={() => saveVictory(score)} onExit={() => store.getState().session?.end()} muted={muted} onMute={() => setMutedState(v => !v)} />
          </XR>
        </Canvas>
        <div className="kk-stage-tools"><div className="kk-segment" aria-label="Scene detail">{['normal','ultra'].map(q => <button key={q} disabled={inVR} aria-pressed={(ultra ? 'ultra' : 'normal') === q} onClick={() => setQuality(q)}>{q === 'normal' ? 'Normal' : 'Ultra'}</button>)}</div><button className="kk-secondary" disabled={!ultra} aria-pressed={motion && ultra} onClick={() => setMotion(v => !v)}>Ambient motion {motion && ultra ? 'on' : 'off'}</button></div>
        <div className="kk-caption"><span className="kk-eyebrow">THE TRAINING RING</span><b>{mode === 'learn' ? selected.english : trainingMessage}</b><small>Red · demonstrator &nbsp; Blue · training partner</small></div>
      </div>
      <section className={`kk-panel${mode === 'train' ? ' kk-panel--train' : ''}`} ref={panel} aria-label={mode === 'learn' ? 'Technique study' : 'Training challenge'}>
        {mode === 'learn' ? <>
          <span className="kk-eyebrow">TECHNIQUE {KUN_MOVES.indexOf(selected) + 1} OF 7</span><h2>{selected.english}</h2><p className="kk-native khmer">{selected.khmer} <span>{selected.name}</span></p>
          <p className="kk-description">{selected.desc}</p>
          <div className="kk-segment" aria-label="Demonstration speed"><button aria-pressed={!slow} onClick={() => setSlow(false)}>Normal speed</button><button aria-pressed={slow} onClick={() => setSlow(true)}>Slow · 0.5×</button></div>
          <div className="kk-actions"><button className="kk-primary" onClick={() => demo(selected)}>Replay movement</button><button className="kk-secondary" aria-pressed={frozen} onClick={() => { clearTimeout(reaction.current); setFrozen(v => !v); }}>{frozen ? 'Resume pose' : 'Freeze pose'}</button></div>
          <TechniquePad selected={selected.id} seen={record.seen} onPick={demo} />
          <button className="kk-next" onClick={() => demo(KUN_MOVES[(KUN_MOVES.indexOf(selected) + 1) % KUN_MOVES.length])}>Next technique →</button>
          <p className="kk-note">Rotate the scene to study the movement. These simplified animations illustrate recognition, not a coached physical lesson.</p>
        </> : <>
          <span className="kk-eyebrow">RECOGNITION & REACTION</span><h2>Training challenge</h2>
          {s.phase === 'ready' ? <>
            <p className="kk-description">Match the called technique using its button or key. Eight prompts cover all seven moves; six correct completes the round.</p>
            <div className="kk-segment" aria-label="Challenge difficulty">{(['relaxed','challenge'] as const).map(l => <button key={l} aria-pressed={level === l} onClick={() => setLevel(l)}>{l === 'relaxed' ? 'Relaxed · 4.5s' : 'Challenge · 2.6s'}</button>)}</div>
            <p className="kk-note">Start when ready. You can pause at any time; leaving this tab also pauses your round.</p><button data-primary className="kk-primary kk-wide" onClick={start}>Start training</button>
          </> : s.phase === 'done' ? <>
            <div className="kk-result"><strong>{score}<small> / 8</small></strong><span>{score >= KUN_PASS ? 'Round complete' : 'Keep practising'}</span></div>
            <p>Best streak: {s.bestStreak} · Accuracy: {Math.round(score / KUN_ROUND * 100)}%</p>
            <p className="kk-note" role="status">{localSaved ? 'Progress saved on this device.' : 'Progress is kept for this visit; device storage is unavailable.'} {score >= KUN_PASS ? saveStatus === 'saving' ? 'Saving Passport…' : saveStatus === 'saved' ? 'Passport stamp saved.' : saveStatus === 'failed' ? 'Passport save failed. You can retry.' : '' : ''}</p>
            {saveStatus === 'failed' && <button className="kk-secondary" onClick={() => saveVictory(score)}>Retry Passport save</button>}
            {review.length > 0 && <div className="kk-review"><h3>Revisit these moves</h3>{review.map(id => <button key={id} className="kk-secondary" onClick={() => inspect(id)}>{moveById(id)?.english} ↗</button>)}</div>}
            <div className="kk-actions"><button data-primary className="kk-primary" onClick={start}>Train again</button><button className="kk-secondary" onClick={() => switchMode('learn')}>Explore moves</button></div>
          </> : <>
            <div className="kk-round-top"><span>Prompt {s.index + 1} / 8 · {score} correct</span><button className="kk-secondary" onClick={s.phase === 'paused' ? session.resume : session.pause}>{s.phase === 'paused' ? 'Resume' : 'Pause'}</button></div>
            <div className="kk-call" role="status" aria-live="polite">{trainingMessage}</div>
            {s.phase === 'prompt' && <><progress aria-label="Response time remaining" value={s.remaining} max={promptSeconds(s.level)} /><span className="kk-timer">{s.remaining.toFixed(1)} seconds</span></>}
            {s.phase === 'paused' ? <div className="kk-actions"><button data-primary className="kk-primary" onClick={session.resume}>Resume round</button><button className="kk-secondary" onClick={start}>Restart round</button></div> : <TechniquePad selected={s.phase === 'feedback' ? target?.id : undefined} disabled={s.phase !== 'prompt'} onPick={m => session.answer(m.id)} />}
            <p className="kk-note">Tap the matching move · Esc pauses · each prompt accepts one answer.</p>
          </>}
          {!active && s.phase !== 'paused' && <div className="kk-records"><span><b>{record.best}/8</b>Best result</span><span><b>{record.rounds}</b>Rounds</span><span><b>{record.wins}</b>Completed</span></div>}
        </>}
        <details className="kk-about"><summary>Culture & this experience</summary>{KUN_ABOUT.map(f => <div key={f.title}><h3>{f.title}</h3><p>{f.body}</p></div>)}<p>Adapted from the CamboVerse “Kun Khmer Fight 3D” reference (Apache-2.0). This is a solo learning challenge; its scores are not competition scoring.</p></details>
        {!localSaved && mode === 'learn' && <p role="status" className="kk-note">Device storage is unavailable; progress lasts for this visit.</p>}
        {vrSupported && <button className="kk-secondary kk-wide" onClick={() => { setVRError(''); store.enterVR().catch(() => setVRError('VR could not start. You can keep using the screen controls.')); }}>Enter VR</button>}{vrError && <p role="status">{vrError}</p>}
      </section>
    </div>
  </div>;
}
function TechniquePad({ selected, seen = [], disabled = false, onPick }: { selected?: string; seen?: string[]; disabled?: boolean; onPick: (m: KunMove) => void }) {
  return <div className="kk-pad" aria-label="Techniques">{KUN_MOVES.map(m => <button key={m.id} aria-pressed={selected === m.id} disabled={disabled} onClick={() => onPick(m)}><span className="khmer">{m.khmer}</span><b>{m.english}{seen.includes(m.id) ? ' ✓' : ''}</b><kbd>{m.id === 'rung' ? 'B / Space' : m.key.toUpperCase()}</kbd></button>)}</div>;
}
function XRSession({ changed, tick, pause }: { changed: (active: boolean) => void; tick: (seconds: number) => void; pause: () => void }) {
  const xrSession = useXR(s => s.session); const elapsed = useRef(0);
  useEffect(() => { changed(xrSession != null); elapsed.current = 0; }, [xrSession, changed]);
  useEffect(() => {
    if (!xrSession) return;
    const visibility = () => { if (xrSession.visibilityState !== 'visible') pause(); };
    xrSession.addEventListener('visibilitychange', visibility);
    return () => xrSession.removeEventListener('visibilitychange', visibility);
  }, [xrSession, pause]);
  useFrame((_, dt) => { if (!xrSession) return; elapsed.current += dt; if (elapsed.current >= .032) { tick(elapsed.current); elapsed.current = 0; } });
  return null;
}
function Nav() { const active = useXR(s => s.session != null); return active ? null : <ExploreControls target={[0, 1, 0]} minDistance={3} maxDistance={12} maxPolarAngle={Math.PI / 2.05} enableDamping dampingFactor={.08} />; }
function TrainingRing({ ultra }: { ultra: boolean }) {
  return <group>
    <mesh rotation={[-Math.PI / 2,0,0]} position={[0,-.22,0]} receiveShadow><planeGeometry args={[50,50]} /><meshStandardMaterial color="#263136" roughness={1} /></mesh>
    <mesh position={[0,0,0]}><boxGeometry args={[6,.28,6]} /><meshStandardMaterial color="#273e46" roughness={.9} /></mesh>
    <mesh rotation={[-Math.PI / 2,0,0]} position={[0,.145,0]} receiveShadow><planeGeometry args={[5.5,5.5]} /><meshStandardMaterial color="#b3b2a4" roughness={1} /></mesh>
    <mesh rotation={[-Math.PI / 2,0,0]} position={[0,.15,0]}><ringGeometry args={[1.13,1.16,ultra ? 64 : 24]} /><meshStandardMaterial color="#e1d4ac" /></mesh>
    {[-1,1].flatMap(x => [-1,1].map(z => <group key={`${x}${z}`} position={[x*2.72,0,z*2.72]}><mesh position={[0,.92,0]} castShadow={ultra}><cylinderGeometry args={[.075,.09,1.8,ultra ? 16 : 6]} /><meshStandardMaterial color={x < 0 ? '#a54336' : '#365d7d'} /></mesh><mesh position={[0,1.04,0]}><boxGeometry args={[.2,.63,.2]} /><meshStandardMaterial color={x < 0 ? '#b95643' : '#497595'} roughness={.8} /></mesh></group>))}
    {[.58,.91,1.24].flatMap(y => [-1,1].flatMap(side => [true,false].map(horizontal => <mesh key={`${y}${side}${horizontal}`} position={horizontal ? [0,y,side*2.72] : [side*2.72,y,0]} rotation={horizontal ? [0,0,Math.PI/2] : [Math.PI/2,0,0]}><cylinderGeometry args={[.018,.018,5.44,ultra ? 8 : 4]} /><meshStandardMaterial color="#d9d0ba" roughness={.9} transparent opacity={side === 1 ? .45 : 1} /></mesh>)))}
    {[-1,1].map(side => <mesh key={side} position={[side*4.2,.35,-1]}><boxGeometry args={[.6,.7,3]} /><meshStandardMaterial color="#594c3d" /></mesh>)}
  </group>;
}
