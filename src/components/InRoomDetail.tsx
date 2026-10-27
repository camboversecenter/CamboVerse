import { Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { ExploreControls as OrbitControls } from './ExploreControls';
import { Html } from '@react-three/drei';
import { ACESFilmicToneMapping } from 'three';
import { specimenById, type LabLayer } from '../lab';
import type { Detail } from './LabOrgans';
import { StagedExhibit } from './LabExhibit';
import { studioEnvironment } from '../lib/studioEnv';
import './InRoomDetail.css';

function StudioLight() {
  const gl = useThree(s => s.gl);
  const scene = useThree(s => s.scene);
  useEffect(() => {
    const env = studioEnvironment(gl, { intensity: 1 });
    scene.environment = env;
    return () => { scene.environment = null; env.dispose(); };
  }, [gl, scene]);
  return null;
}

function DetailCamera({ dist, aim, size, span, spin, onInteract }: {
  dist: number; aim: number; size: number; span: number; spin: boolean; onInteract: () => void;
}) {
  const camera = useThree(s => s.camera);
  const viewport = useThree(s => s.size);
  useLayoutEffect(() => {
    camera.position.set(dist * 0.4, aim + size * 0.24, dist);
    camera.lookAt(0, aim, 0);
    const persp = camera as typeof camera & { far: number };
    persp.far = Math.max(600, dist * 4);
    camera.updateProjectionMatrix();
  }, [camera, dist, aim, size, viewport.width, viewport.height]);
  return <OrbitControls enablePan resetKey={`${dist}:${aim}:${span}`}
    minDistance={Math.max(span * 0.5, 2)} maxDistance={dist * 2.4}
    maxPolarAngle={Math.PI * 0.49} enableDamping dampingFactor={0.08}
    autoRotate={spin} autoRotateSpeed={0.55} onStart={onInteract}
    target={[0, aim, 0]} />;
}

export function InRoomDetail({ specimenId, detail, onClose, onOpenSpecimen }: {
  specimenId: string; detail: Detail; onClose: () => void; onOpenSpecimen: (id: string) => void;
}) {
  const specimen = specimenById(specimenId);
  if (!specimen) return null;

  const [layer, setLayer] = useState<LabLayer>('whole');
  const [picked, setPicked] = useState<string | null>(null);
  const [extracted, setExtracted] = useState<string | null>(null);
  const [spinModel, setSpinModel] = useState(true);
  const [running] = useState(true);
  const [knob] = useState(specimen.knob?.value ?? 0);
  const [nav, setNav] = useState<'explore' | 'quiz'>('explore');
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({});
  const [closing, setClosing] = useState(false);

  const viewportRef = useRef<HTMLDivElement>(null);
  const [viewport, setViewport] = useState({ width: 1, height: 1 });
  useLayoutEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const obs = new ResizeObserver(([e]) => setViewport({ width: e.contentRect.width, height: e.contentRect.height }));
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const pickPart = (id: string) => {
    if (specimen.parts.length === 0) return;
    setPicked(id);
    setSpinModel(false);
    if (extracted && extracted !== id) setExtracted(null);
  };

  const part = picked ? specimen.parts.find(p => p.id === picked) ?? null : null;
  const centre = specimen.centreU ?? specimen.sizeU * 0.15;
  const dist = useMemo(() => {
    const aspect = Math.max(0.1, viewport.width / Math.max(1, viewport.height));
    const halfV = Math.tan((45 * Math.PI) / 360);
    const halfH = Math.atan(halfV * aspect);
    const margin = 1.18;
    return Math.max((specimen.spanU * 0.5 * margin) / Math.tan(halfH), (specimen.sizeU * 0.5 * margin) / halfV, 18);
  }, [specimen.sizeU, specimen.spanU, viewport.width, viewport.height]);

  const handleClose = () => {
    if (closing) return;
    setClosing(true);
    setTimeout(onClose, 200);
  };

  return <div className={`bio-detail-overlay bio-ui${closing ? ' bio-detail--closing' : ''}`} onClick={e => e.stopPropagation()}>
    <div className="bio-detail-layout">
      {/* 3D viewport */}
      <div className="bio-detail-viewport" ref={viewportRef}>
        <Canvas dpr={detail === 'normal' ? [1, 1.5] : [1, 2]} camera={{ fov: 45, near: 0.4, far: Math.max(600, dist * 4) }}
          gl={{ antialias: detail === 'ultra', powerPreference: 'high-performance' }}
          shadows={detail === 'ultra'}
          onCreated={({ gl }) => { gl.toneMapping = ACESFilmicToneMapping; gl.toneMappingExposure = 1.1; }}
          onPointerMissed={() => { setPicked(null); setExtracted(null); }}
        >
          <color attach="background" args={['#27353e']} />
          <fog attach="fog" args={['#27353e', dist * 2, dist * 5]} />
          {detail === 'ultra' && <StudioLight />}
          <DetailCamera dist={dist} aim={centre} size={specimen.sizeU} span={specimen.spanU}
            spin={spinModel && !picked} onInteract={() => setSpinModel(false)} />
          <group>
            <Suspense fallback={null}>
              <StagedExhibit specimen={specimen} id={specimen.id} organOf={specimen.organOf}
                layer={layer} detail={detail} onPick={pickPart} selected={picked}
                extracted={extracted} running={running} knob={knob} />
            </Suspense>
            {part && part.at && extracted !== part.id && (
              <Html position={part.at} center distanceFactor={specimen.sizeU * 2.6} occlude={false}
                zIndexRange={[20, 0]} style={{ pointerEvents: 'none' }}>
                <div className="lab-pin"><b>{part.name}</b>{part.khmer && <span className="khmer">{part.khmer}</span>}</div>
              </Html>
            )}
          </group>
        </Canvas>
      </div>

      {/* Side panel */}
      <div className="bio-detail-panel">
        <div className="bio-detail-header">
          <button className="bio-detail-back" onClick={handleClose}>← Back to room</button>
          <h2>🔬 {specimen.name}</h2>
        </div>

        {/* Tabs */}
        <div className="bio-detail-tabs">
          <button className={nav === 'explore' ? 'active' : ''} onClick={() => setNav('explore')}>Explore</button>
          <button className={nav === 'quiz' ? 'active' : ''} onClick={() => setNav('quiz')}>Quiz</button>
        </div>

        <div className="bio-detail-scroll">
          {nav === 'explore' ? <>
            {/* Layer buttons */}
            <div className="bio-detail-layers">
              {specimen.layers.map(l => (
                <button key={l.id} className={layer === l.id ? 'active' : ''} onClick={() => setLayer(l.id)}>{l.label}</button>
              ))}
              <button onClick={() => setSpinModel(v => !v)}>{spinModel ? '⏸ Pause' : '🔄 Rotate'}</button>
            </div>

            {/* Part info or specimen info */}
            {part ? <>
              <div className="bio-detail-part-name">
                <b>{part.name}</b>
                {part.khmer ? <span className="khmer"> {part.khmer}</span> : <span className="bio-detail-needkm">Khmer term needed</span>}
              </div>
              <p className="bio-detail-blurb">{part.blurb}</p>
              <div className="bio-detail-actions">
                {part.detail && <button onClick={() => onOpenSpecimen(part.detail!)}>Open {part.name.toLowerCase()} →</button>}
                {specimen.extractable && part.layer !== 'whole' && (
                  <button className={extracted === part.id ? 'active' : ''} onClick={() => setExtracted(e => e === part.id ? null : part.id)}>
                    {extracted === part.id ? '↩ Put it back' : '⤴ Take it out'}
                  </button>
                )}
                <button onClick={() => { setPicked(null); setExtracted(null); }}>← All parts</button>
              </div>
            </> : <>
              <p className="bio-detail-blurb">{specimen.english}</p>
              <p className="bio-detail-scale">📏 {specimen.reallife}</p>
            </>}

            {/* Part chips */}
            {specimen.parts.length > 0 ? (
              <div className="bio-detail-chips">
                {specimen.parts.map(p => (
                  <button key={p.id} className={picked === p.id ? 'active' : ''} onClick={() => {
                    pickPart(p.id);
                    if (p.layer !== 'whole' && layer === 'whole') setLayer(p.layer);
                  }}>{p.name}</button>
                ))}
              </div>
            ) : !part && (
              <p className="bio-detail-hint">Single-structure organ -- rotate the 3D model to explore.</p>
            )}
          </> : <>
            {/* Quiz */}
            <div className="bio-detail-quiz">
              {specimen.quiz.map((item, qi) => {
                const given = quizAnswers[qi];
                const answered = given !== undefined;
                return <div key={item.q} className="bio-detail-q">
                  <p><b>{qi + 1}.</b> {item.q}</p>
                  <div className="bio-detail-opts">
                    {item.options.map((opt, oi) => {
                      const cls = !answered ? '' : oi === item.answer ? 'right' : oi === given ? 'wrong' : '';
                      return <button key={opt} className={cls} disabled={answered}
                        onClick={() => setQuizAnswers(a => ({ ...a, [qi]: oi }))}>{opt}</button>;
                    })}
                  </div>
                  {answered && <p className="bio-detail-why">{item.why}</p>}
                </div>;
              })}
              {Object.keys(quizAnswers).length > 0 && <button onClick={() => setQuizAnswers({})}>Start again</button>}
            </div>
          </>}
        </div>

        <p className="bio-detail-disclaimer">Schematic teaching model. Not a scan or medically validated anatomy.</p>
      </div>
    </div>
  </div>;
}
