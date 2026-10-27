import { Canvas } from '@react-three/fiber';
import { ExploreControls } from './ExploreControls';
import { createXRStore, XR, XROrigin, useXR } from '@react-three/xr';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { KHMER_GAMES, gameCredential } from '../games';
import { claimCredential, getIdentity, earnedAchievements } from '../lib/identity';
import { GamePlay, type GameSaveStatus } from './GamePlay';
import { GameScene, FestivalGround } from './KhmerGamesScene';
import { GamesXRPanel } from './GamesXRPanel';
import { useKhmerGame } from './useKhmerGame';
import { GAME_RECORD_KEY, GAME_RULES, parseRecords, type GameLevel, type GameRecords, type GameState } from '../khmerGameEngine';
import './KhmerGames.css';

function initialQuality() {
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 4;
  return (navigator.hardwareConcurrency ?? 4) <= 4 || memory <= 3 || Math.min(screen.width, screen.height) < 500 ? 'normal' : 'ultra';
}
function loadRecords(): GameRecords { try { return parseRecords(localStorage.getItem(GAME_RECORD_KEY)); } catch { return {}; } }

export function GamesView({ onBackToMap }: { onBackToMap: () => void }) {
  const store = useMemo(() => createXRStore({ emulate: false }), []);
  const [vrSupported, setVrSupported] = useState(false);
  const [inVR, setInVR] = useState(false);
  const [vrError, setVrError] = useState('');
  const [quality, setQuality] = useState(initialQuality);
  const ultra = inVR || quality === 'ultra';
  const [gameI, setGameI] = useState(0);
  const game = KHMER_GAMES[gameI];
  const [playing, setPlaying] = useState(false);
  const [level, setLevel] = useState<GameLevel>('practice');
  const [earned, setEarned] = useState<Set<string>>(new Set());
  const [records, setRecords] = useState<GameRecords>(loadRecords);
  const recordRef = useRef(records);
  const [localSaved, setLocalSaved] = useState(true);
  const [saveStatus, setSaveStatus] = useState<GameSaveStatus>('idle');
  const session = useKhmerGame(game.play, level, playing);
  const processed = useRef<GameState | null>(null);
  const saveRequest = useRef(0);
  const saveBusy = useRef(false);
  const collection = useRef<HTMLDivElement>(null);
  const [motion, setMotion] = useState(() => !matchMedia('(prefers-reduced-motion: reduce)').matches);
  useEffect(() => {
    navigator.xr?.isSessionSupported('immersive-vr').then(setVrSupported).catch(() => setVrSupported(false));
    let live = true;
    getIdentity(false).then(earnedAchievements).then(set => { if (live) setEarned(set); });
    return () => { live = false; saveRequest.current++; };
  }, []);
  useEffect(() => { if (collection.current) collection.current.inert = playing && !inVR; }, [playing, inVR]);
  const pickGame = (index: number) => {
    saveRequest.current++; saveBusy.current = false; setSaveStatus('idle');
    setGameI(index);
  };
  const close = () => { saveRequest.current++; saveBusy.current = false; setPlaying(false); };
  const saveVictory = useCallback(async () => {
    if (saveBusy.current) return;
    if (earned.has(gameCredential(game.id))) { setSaveStatus('saved'); return; }
    saveBusy.current = true; setSaveStatus('saving');
    const request = ++saveRequest.current;
    let ok = false;
    try { ok = await claimCredential(gameCredential(game.id), `game:${game.id}:win`); } catch { /* retry remains available */ }
    if (request !== saveRequest.current) return;
    saveBusy.current = false; setSaveStatus(ok ? 'saved' : 'failed');
    if (ok) setEarned(previous => new Set(previous).add(gameCredential(game.id)));
  }, [game.id, earned]);
  useEffect(() => {
    const state = session.state;
    if (state.phase !== 'result') { processed.current = null; return; }
    if (!playing || processed.current === state) return;
    processed.current = state;
    const old = recordRef.current[game.id] ?? { played: 0, wins: 0, best: 0 };
    const next = { ...recordRef.current, [game.id]: { played: old.played + 1, wins: old.wins + Number(state.won), best: Math.max(old.best, state.score) } };
    recordRef.current = next; setRecords(next);
    try { localStorage.setItem(GAME_RECORD_KEY, JSON.stringify(next)); setLocalSaved(true); } catch { setLocalSaved(false); }
    if (state.won) void saveVictory();
  }, [session.state, game.id, playing, saveVictory]);
  const start = () => { setSaveStatus('idle'); setPlaying(true); };
  const next = () => { pickGame((gameI + 1) % KHMER_GAMES.length); setPlaying(true); };
  const record = records[game.id];
  const wins = KHMER_GAMES.filter(g => (records[g.id]?.wins ?? 0) > 0 || earned.has(gameCredential(g.id))).length;
  return <div className="kg-hub">
    <div ref={collection} className="kg-collection" aria-hidden={playing && !inVR ? true : undefined}>
      <header className="kg-header"><button className="kg-secondary" onClick={onBackToMap}>← Map</button><div><span className="kg-eyebrow">PLAY · LEARN · CELEBRATE</span><h1>Khmer Games</h1></div><span className="kg-progress">{wins} / 4 games won</span></header>
      <nav className="kg-tabs" aria-label="Khmer games">{KHMER_GAMES.map((g, i) => <button key={g.id} aria-pressed={gameI === i} onClick={() => pickGame(i)}><span className="kg-game-number">0{i + 1}</span><span><b className="khmer">{g.khmer}</b><small>{g.english}</small></span>{(records[g.id]?.wins ?? 0) > 0 && <span className="kg-won" aria-label="Won">✓</span>}</button>)}</nav>
      <div className="kg-layout">
        <div className="kg-stage">
          <Canvas dpr={ultra ? [1, 2] : [1, 1.25]} camera={{ position: [0, 3.3, 8.5], fov: 46 }} gl={{ antialias: true }} shadows={ultra}>
            <XR store={store}>
              <XRSession onChange={setInVR} />
              <color attach="background" args={['#c8d7cf']} /><fog attach="fog" args={['#c8d7cf', 17, 38]} />
              <ambientLight intensity={.8} /><hemisphereLight args={['#fff4dc', '#647a57', 1.2]} />
              <directionalLight position={[-4, 9, 5]} intensity={1.7} castShadow={ultra} shadow-mapSize={[1024, 1024]} shadow-camera-left={-7} shadow-camera-right={7} shadow-camera-top={7} shadow-camera-bottom={-7} shadow-normalBias={.035} />
              <FestivalGround ultra={ultra} />
              <GameScene key={game.id} game={game} ultra={ultra} motion={motion && ultra && !playing} />
              <XROrigin position={[0, 0, 5.4]} />
              <Nav enabled={!playing} resetKey={game.id} />
              <GamesXRPanel game={game} gameI={gameI} onPick={pickGame} session={session} playing={playing} onPlay={start} onClose={close} onNext={next} level={level} onLevel={setLevel} saveStatus={saveStatus} onRetrySave={saveVictory} onExit={() => store.getState().session?.end()} />
            </XR>
          </Canvas>
          <div className="kg-stage-top"><div className="kg-quality" aria-label="Scene detail">{['normal', 'ultra'].map(q => <button key={q} aria-pressed={(ultra ? 'ultra' : 'normal') === q} onClick={() => setQuality(q)} disabled={inVR}>{q === 'normal' ? 'Normal' : 'Ultra'}</button>)}</div><button className="kg-secondary" aria-pressed={motion && ultra} disabled={!ultra} onClick={() => setMotion(v => !v)}>Scene motion {motion && ultra ? 'on' : 'off'}</button></div>
          <div className="kg-scene-caption"><span>THE FESTIVAL GROUNDS</span><b>{game.english}</b><small>Drag to look around · scroll or pinch to zoom</small></div>
        </div>
        <section className="kg-info" aria-label={game.english}>
          <span className="kg-eyebrow">GAME 0{gameI + 1} · {game.occasion.toUpperCase()}</span>
          <h2>{game.name}</h2><p className="kg-native khmer">{game.khmer}</p>
          <p className="kg-lead">{GAME_RULES[game.play].goal}</p>
          <div className="kg-facts"><span>{game.players}</span><span>Solo digital challenge</span></div>
          <div className="kg-level" aria-label="Game difficulty">{(['practice', 'challenge'] as const).map(l => <button key={l} aria-pressed={level === l} onClick={() => setLevel(l)}>{l === 'practice' ? 'Relaxed' : 'Challenge'}</button>)}</div>
          <p className="kg-hint">{level === 'practice' ? 'More time and wider timing zones to learn the controls.' : 'Faster movement and tighter timing for another challenge.'}</p>
          <button className="kg-primary kg-launch" onClick={start}>Play {game.english} <span>→</span></button>
          <div className="kg-records"><span><b>{record?.best ?? '—'}</b>Best score</span><span><b>{record?.played ?? 0}</b>Rounds played</span><span><b>{record?.wins ?? 0}</b>Wins</span></div>
          <details className="kg-learn"><summary>Traditional play & cultural context</summary><p>{game.how}</p><p>{game.desc}</p><p>Rules vary between communities. This solo challenge teaches timing and coordination; it does not reproduce the full group game.</p></details>
          {vrSupported && <button className="kg-secondary kg-vr" onClick={() => { setVrError(''); store.enterVR().catch(() => setVrError('VR could not start. You can keep playing here.')); }}>Enter VR</button>}
          {vrError && <p role="status">{vrError}</p>}
        </section>
      </div>
    </div>
    {playing && !inVR && <GamePlay key={game.id} game={game} session={session} onClose={close} onNext={next} saveStatus={saveStatus} onRetrySave={saveVictory} localSaved={localSaved} />}
  </div>;
}
function XRSession({ onChange }: { onChange: (active: boolean) => void }) {
  const active = useXR(s => s.session != null);
  useEffect(() => { onChange(active); }, [active, onChange]);
  return null;
}
function Nav({ enabled, resetKey }: { enabled: boolean; resetKey: string }) {
  const inXR = useXR(s => s.session != null);
  if (inXR) return null;
  return <ExploreControls enabled={enabled} resetKey={resetKey} target={[0, 1, 0]} minDistance={3.5} maxDistance={13} maxPolarAngle={Math.PI / 2.1} enableDamping dampingFactor={.08} />;
}
