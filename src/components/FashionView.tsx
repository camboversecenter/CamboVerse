import { Canvas, useThree } from "@react-three/fiber";
import { ExploreControls as OrbitControls } from './ExploreControls';
import { createXRStore, XR, XROrigin, useXR } from "@react-three/xr";
import { useEffect, useMemo, useRef, useState } from "react";
import type { OrbitControls as Controls } from 'three-stdlib';
import {
  DAY_COLORS, VARIETIES, FASHION_ERAS, FASHION_CREDENTIAL, type Outfit,
} from "../fashion";
import { claimCredential, getIdentity, earnedAchievements } from "../lib/identity";
import { FashionFigure } from "./FashionFigure";
import { FashionTryOn } from "./FashionTryOn";
import { FashionDayFigure, type FashionQuality, type FashionLoadState } from './FashionDayFigure';
import './FashionStudio.css';

/**
 * Khmer Traditional Fashion (សម្លៀកបំពាក់ខ្មែរ) dress a procedural figure and
 * learn Khmer clothing three ways: the seven-day colour custom, the varieties of
 * garment, and how dress changed through the ages. Explorable in 3D and VR.
 */
type Mode = "day" | "variety" | "ages";
type View = 'Front' | 'Side' | 'Back';

function initialQuality(): FashionQuality {
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 4;
  return (navigator.hardwareConcurrency ?? 4) <= 4 || memory <= 3 || Math.min(screen.width, screen.height) < 500 ? 'normal' : 'ultra';
}

export function FashionView({ onBackToMap }: { onBackToMap: () => void }) {
  const store = useMemo(() => createXRStore({ emulate: false }), []);
  const [vrSupported, setVrSupported] = useState(false);
  const [mode, setMode] = useState<Mode>("day");
  const [tryOn, setTryOn] = useState(false);
  const [quality, setQuality] = useState<FashionQuality>(initialQuality);
  const [inVR, setInVR] = useState(false);
  const detail = inVR ? 'ultra' : quality;
  const [view, setView] = useState<View>('Front');
  const [viewRevision, setViewRevision] = useState(0);
  const [rotating, setRotating] = useState(false);
  const [loadState, setLoadState] = useState<FashionLoadState>('loading');
  const [retry, setRetry] = useState(0);

  const today = new Date().getDay(); // 0=Sun … 6=Sat
  const [dayI, setDayI] = useState(today);
  const [varI, setVarI] = useState(0);
  const [eraI, setEraI] = useState(FASHION_ERAS.length - 1); // start in the modern day
  const [seenEras, setSeenEras] = useState<Set<string>>(new Set([FASHION_ERAS[FASHION_ERAS.length - 1].id]));
  const [earned, setEarned] = useState(false);

  useEffect(() => {
    const xr = (navigator as Navigator & { xr?: { isSessionSupported(m: string): Promise<boolean> } }).xr;
    xr?.isSessionSupported("immersive-vr").then(setVrSupported).catch(() => setVrSupported(false));
  }, []);
  useEffect(() => {
    let live = true;
    (async () => {
      const set = await earnedAchievements(await getIdentity(false));
      if (live) setEarned(set.has(FASHION_CREDENTIAL));
    })();
    return () => { live = false; };
  }, []);

  // Touring every era earns a gentle "through the ages" credential.
  useEffect(() => {
    if (seenEras.size === FASHION_ERAS.length && !earned) {
      setEarned(true);
      claimCredential(FASHION_CREDENTIAL, `eras:${seenEras.size}`);
    }
  }, [seenEras, earned]);

  const day = DAY_COLORS[dayI];
  const variety = VARIETIES[varI];
  const era = FASHION_ERAS[eraI];

  const outfit: Outfit =
    mode === "day"
      ? { skirt: day.color, top: "sbai", topColor: day.color, gold: true, skirtStyle: "skirt" }
      : mode === "variety"
        ? variety.outfit
        : era.outfit;

  const pickEra = (i: number) => {
    setEraI(i);
    setSeenEras((s) => new Set(s).add(FASHION_ERAS[i].id));
  };

  return (
    <div className={`fashion${mode === 'day' ? ' fashion-day' : ''}`}>
      <div className="fash-stage">
      <Canvas dpr={detail === 'normal' ? [1, 1.25] : [1, 2]} camera={{ position: [0, 1.05, 3.2], fov: 40 }} gl={{ antialias: true }} shadows={detail === 'ultra'}>
        <XR store={store}>
          <SessionQuality onChange={setInVR} />
          <color attach="background" args={[mode === 'day' ? '#e7e3db' : '#efe7dc']} />
          <ambientLight intensity={0.6} />
          <hemisphereLight args={["#fff9ed", "#89857b", 1]} />
          <directionalLight position={[-3, 5, 4]} intensity={2.1} castShadow={detail === 'ultra'} shadow-mapSize={[1024, 1024]} shadow-camera-left={-2} shadow-camera-right={2} shadow-camera-top={3} shadow-camera-bottom={-2} shadow-normalBias={0.015} />
          <directionalLight position={[3, 2, -3]} intensity={1.5} />
          {/* pedestal */}
          <mesh position={[0, 0.05, 0]} receiveShadow>
            <cylinderGeometry args={[0.52, 0.54, 0.1, detail === 'ultra' ? 64 : 24]} />
            <meshStandardMaterial color="#c9c1b2" roughness={0.9} />
          </mesh>
          {mode === 'day' ? <FashionDayFigure key={retry} quality={detail} color={day.color} onStatus={setLoadState} /> : <FashionFigure outfit={outfit} />}
          <XROrigin position={[0, 0, 2.6]} />
          <Nav view={view} revision={viewRevision} rotating={rotating} onInteract={() => setRotating(false)} mode={mode} />
        </XR>
      </Canvas>
      {mode === 'day' && <>
        <div className="fash-stage-caption"><span>THE COLOUR COLLECTION</span><b>Sampot &amp; sbai</b></div>
        {loadState !== 'ready' && <div className="fash-load" role="status">
          {loadState === 'loading' ? 'Preparing the mannequin…' : <>The mannequin could not load. <button onClick={() => setRetry(v => v + 1)}>Try again</button></>}
        </div>}
        <div className="fash-view-controls" aria-label="Mannequin view">
          {(['Front', 'Side', 'Back'] as const).map(v => <button key={v} aria-pressed={view === v && !rotating} onClick={() => { setView(v); setViewRevision(n => n + 1); setRotating(false); }}>{v}</button>)}
          <button aria-pressed={rotating} onClick={() => setRotating(v => !v)}>{rotating ? 'Pause' : 'Rotate'}</button>
        </div>
      </>}
      </div>

      <div className="cls-top">
        <button className="backbtn" onClick={onBackToMap}>← Map</button>
        <span className="cls-title">👗 Khmer Fashion</span>
        {vrSupported && <button className="vr-btn cls-vr" onClick={() => store.enterVR()}>🥽 VR</button>}
      </div>

      <button className="fash-try" onClick={() => setTryOn(true)}>🤳 Try it on</button>
      <div className="fash-quality" aria-label="Model detail">
        {(['normal', 'ultra'] as const).map(q => <button key={q} aria-pressed={detail === q} disabled={inVR} onClick={() => setQuality(q)}>{q === 'normal' ? 'Normal' : 'Ultra'}</button>)}
      </div>

      {tryOn && <FashionTryOn onClose={() => setTryOn(false)} initialColor={outfit.topColor} />}

      <div className="fash-modes">
        <button className={mode === "day" ? "fash-seg on" : "fash-seg"} onClick={() => setMode("day")}>🎨 Colour by day</button>
        <button className={mode === "variety" ? "fash-seg on" : "fash-seg"} onClick={() => setMode("variety")}>👚 Varieties</button>
        <button className={mode === "ages" ? "fash-seg on" : "fash-seg"} onClick={() => setMode("ages")}>⏳ Through the ages</button>
      </div>

      {mode === "day" && (
        <div className="fash-panel fash-day-panel">
          <div className="fash-eyebrow">KHMER DRESS · SEVEN DAYS</div>
          <h1>A colour for every day</h1>
          <p className="fash-intro">Choose a day to dress the mannequin. Drag to turn it and explore the cloth from every side.</p>
          <div className="fash-swatches">
            {DAY_COLORS.map((d, i) => (
              <button
                key={d.day}
                className={`fash-swatch${i === dayI ? " on" : ""}${i === today ? " today" : ""}`}
                aria-pressed={i === dayI}
                onClick={() => setDayI(i)}
                aria-label={d.day}
                title={`${d.day}${i === today ? " (today)" : ""}`}
              ><span className="fash-colour-dot" style={{ background: d.color }} /><span>{d.day.slice(0, 3)}</span></button>
            ))}
          </div>
          <div className="fash-info-head">
            <span className="khmer">{day.khmer}</span>
            <b>{day.day}</b>
            {dayI === today && <span className="fash-today">today</span>}
          </div>
          <div className="fash-daycolor"><span style={{ background: day.color }} />{day.colorName}</div>
          <p className="fash-desc">
            Khmer tradition associates each day of the week with a colour (ពណ៌ប្រចាំថ្ងៃ).
            Here, the sampot wrap skirt and sbai shoulder cloth share that day's palette.
          </p>
          <details className="fash-garment-details"><summary>About the outfit</summary><p>The sampot wraps around the lower body. The sbai crosses the torso and drapes over one shoulder. This original display outfit uses simple folds and a woven-style border to show their form.</p><p>Colours and ways of dressing vary by community and occasion. This is an interpretation, not a reproduction of a particular royal or ceremonial costume.</p></details>
          <p className="fash-note">Traditional palette · shades vary across textiles and screens.</p>
        </div>
      )}

      {mode === "variety" && (
        <div className="fash-panel" style={{ borderColor: "#c8912e" }}>
          <div className="fash-chips">
            {VARIETIES.map((v, i) => (
              <button key={v.id} className={i === varI ? "fash-chip on" : "fash-chip"} onClick={() => setVarI(i)}>
                <span className="khmer">{v.khmer}</span>
              </button>
            ))}
          </div>
          <div className="fash-info-head">
            <span className="khmer">{variety.khmer}</span> <b>{variety.name}</b>
          </div>
          <div className="fash-en">{variety.english}</div>
          <p className="fash-desc">{variety.desc}</p>
          <p className="fash-note">A starting set many more garments to add (see TODO.md).</p>
        </div>
      )}

      {mode === "ages" && (
        <div className="fash-panel" style={{ borderColor: "#8a5a3a" }}>
          <div className="fash-eras">
            {FASHION_ERAS.map((e, i) => (
              <button key={e.id} className={i === eraI ? "fash-era on" : "fash-era"} onClick={() => pickEra(i)}>
                {e.years.split("–")[0]}
              </button>
            ))}
          </div>
          <div className="fash-info-head">
            <span className="khmer">{era.khmer}</span> <b>{era.name}</b>
            <span className="fash-years">{era.years}</span>
          </div>
          <p className="fash-desc">{era.desc}</p>
          <p className="fash-note">
            {earned
              ? "You've toured Khmer fashion through the ages a stamp is in your Heritage Passport."
              : `Visit every era to earn a Heritage Passport stamp · ${seenEras.size}/${FASHION_ERAS.length}`}
          </p>
        </div>
      )}
    </div>
  );
}

function SessionQuality({ onChange }: { onChange: (active: boolean) => void }) {
  const active = useXR(s => s.session != null);
  useEffect(() => { onChange(active); }, [active, onChange]);
  return null;
}

function Nav({ view, revision, rotating, onInteract, mode }: { view: View; revision: number; rotating: boolean; onInteract: () => void; mode: Mode }) {
  const inXR = useXR((s) => s.session != null);
  const camera = useThree(s => s.camera);
  const controls = useRef<Controls>(null);
  useEffect(() => {
    if (inXR) return;
    const position: [number, number, number] = view === 'Back' ? [0, 1.05, -3.2] : view === 'Side' ? [3.2, 1.05, 0] : [0, 1.05, 3.2];
    camera.position.set(...position);
    controls.current?.target.set(0, .97, 0);
    controls.current?.update();
  }, [view, revision, camera, inXR, mode]);
  if (inXR) return null;
  return (
    <OrbitControls
      ref={controls}
      enablePan
      minDistance={1.8}
      maxDistance={6}
      maxPolarAngle={Math.PI / 1.9}
      enableDamping
      dampingFactor={0.08}
      target={[0, .97, 0]}
      autoRotate={rotating}
      onStart={onInteract}
      autoRotateSpeed={0.8}
    />
  );
}
