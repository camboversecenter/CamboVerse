import { Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { ExploreControls as OrbitControls } from './ExploreControls';
import { Html } from "@react-three/drei";
import { createXRStore, XR, XROrigin, useXR } from "@react-three/xr";
import { ACESFilmicToneMapping } from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import type { Detail } from "./LabOrgans";
import { studioEnvironment } from "../lib/studioEnv";
import { StagedExhibit } from "./LabExhibit";
import { RealSpecimen, realModelFor, type Anchors } from "./LabRealModels";
import { subjectById, type LabLayer, type Specimen } from "../lab";

/** Fit the actual canvas after a resize, an exhibit change, or an explicit reset. */
type CameraView = "three-quarter" | "front" | "side" | "top";

function FrameCamera({ dist, aim, size, span, reset, spin, view, onInteract }: {
  dist: number; aim: number; size: number; span: number; reset: number;
  spin: boolean; view: CameraView; onInteract: () => void;
}) {
  const camera = useThree((s) => s.camera);
  const viewport = useThree((s) => s.size);
  const inXR = useXR((s) => s.session != null);
  const controls = useRef<OrbitControlsImpl>(null);
  useLayoutEffect(() => {
    if (inXR) return;
    controls.current?.reset();
    const position = view === "front" ? [0, aim + size * 0.08, dist]
      : view === "side" ? [dist, aim + size * 0.08, 0]
        : view === "top" ? [0, aim + dist, 0.01]
          : [dist * 0.4, aim + size * 0.24, dist];
    camera.position.set(position[0], position[1], position[2]);
    camera.lookAt(0, aim, 0);
    const persp = camera as typeof camera & { far: number; near: number };
    persp.far = Math.max(600, dist * 4);
    camera.updateProjectionMatrix();
    controls.current?.target.set(0, aim, 0);
    controls.current?.update();
  }, [camera, dist, aim, size, reset, view, viewport.width, viewport.height, inXR]);
  return <OrbitControls ref={controls} enabled={!inXR} enablePan resetKey={`${view}:${reset}:${dist}:${aim}`}
    minDistance={Math.max(span * 0.5, 2)} maxDistance={dist * 2.4}
    maxPolarAngle={Math.PI * 0.49} enableDamping dampingFactor={0.08}
    autoRotate={spin && !inXR} autoRotateSpeed={0.55} onStart={onInteract} />;
}

/**
 * The studio environment, built once per canvas and shared by every material.
 *
 * This is what makes a wet surface read as wet: an organ's realism is almost
 * entirely in the shape of its specular highlight, and a directional light can
 * only give it one hard dot. Generated in-browser rather than downloaded no
 * CDN, no HDRI file, nothing crosses the network.
 */
function StudioLight() {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  useEffect(() => {
    const env = studioEnvironment(gl, { intensity: 1 });
    scene.environment = env;
    return () => { scene.environment = null; env.dispose(); };
  }, [gl, scene]);
  return null;
}

/**
 * One **specimen's page**: the model turning on a stand, its parts nameable by
 * tapping them, layers you can peel back, and a few questions at the end.
 *
 * Three view modes, as everywhere in CamboVerse (AGENTS.md):
 *   - **Normal** the ~$150-Android baseline: coarser meshes, no shadows.
 *   - **Ultra** full detail for a capable device.
 *   - **VR** WebXR, and always presents the Ultra scene.
 *
 * The lesson survives without any of the extras: a student who never opens the
 * quiz, never enters VR and never taps a part still gets a labelled organ they
 * can turn around. Degrade the detail, never the content.
 */
type Nav = "explore" | "quiz";

function detectViewMode(): Detail {
  if (typeof navigator === "undefined") return "ultra";
  const cores = navigator.hardwareConcurrency ?? 4;
  const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 4;
  const small = typeof window !== "undefined" && Math.min(window.screen.width, window.screen.height) < 500;
  return cores <= 4 || mem <= 3 || small ? "normal" : "ultra";
}

type SpecimenViewProps = {
  specimen: Specimen; onBack: () => void;
  onOpenSpecimen: (id: string) => void; backLabel?: string;
};

export function SpecimenView({
  specimen, onBack, onOpenSpecimen, backLabel = "← Lab",
}: SpecimenViewProps) {
  const store = useMemo(() => createXRStore({ emulate: false }), []);
  const [vrSupported, setVrSupported] = useState(false);
  const [detail, setDetail] = useState<Detail>(detectViewMode);
  const [layer, setLayer] = useState<LabLayer>("whole");
  const [nav, setNav] = useState<Nav>("explore");
  const [picked, setPicked] = useState<string | null>(null);
  // Which part has been pulled clear of the exhibit. Only one at a time: the
  // empty space it leaves behind is half of what the extraction teaches.
  const [extracted, setExtracted] = useState<string | null>(null);
  // Machines run by default: a student who lands on an engine should see it
  // turning, not have to discover a button before anything happens.
  const [running, setRunning] = useState(true);
  const [knob, setKnob] = useState(specimen.knob?.value ?? 0);
  const [spin, setSpin] = useState(true);
  const [info, setInfo] = useState(true);
  const [cameraView, setCameraView] = useState<CameraView>("three-quarter");
  const [readMore, setReadMore] = useState(false);
  const [reset, setReset] = useState(0);
  const [lastSpecimen, setLastSpecimen] = useState(specimen.id);
  const [panelTheme, setPanelTheme] = useState<"light" | "dark">("dark");
  // Reset lesson state before mounting the new model, retaining the canvas,
  // quality preference, and XR store across jumps from the body to an organ.
  if (lastSpecimen !== specimen.id) {
    setLastSpecimen(specimen.id);
    setLayer("whole"); setPicked(null); setExtracted(null); setNav("explore");
    setKnob(specimen.knob?.value ?? 0); setRunning(true); setSpin(true);
    setCameraView("three-quarter"); setReadMore(false);
    setReset((value) => value + 1);
  }
  const viewportRef = useRef<HTMLDivElement>(null);
  const [viewport, setViewport] = useState({ width: 1, height: 1 });
  useLayoutEffect(() => {
    const element = viewportRef.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      setViewport({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const pickPart = (id: string) => {
    setPicked(id);
    setSpin(false);
    setInfo(true);
    setNav("explore");
    setReadMore(false);
    if (extracted && extracted !== id) setExtracted(null);
  };

  useEffect(() => {
    const xr = (navigator as Navigator & { xr?: { isSessionSupported(m: string): Promise<boolean> } }).xr;
    xr?.isSessionSupported("immersive-vr").then(setVrSupported).catch(() => setVrSupported(false));
  }, []);

  const part = picked ? specimen.parts.find((p) => p.id === picked) ?? null : null;
  const subject = subjectById(specimen.subject);
  const real = detail === "ultra" ? realModelFor(specimen.id) : null;
  const [anchorSet, setAnchorSet] = useState<{ url: string; at: Anchors } | null>(null);
  const realUrl = real?.url ?? null;
  const onAnchors = useCallback((at: Anchors) => {
    if (realUrl) setAnchorSet({ url: realUrl, at });
  }, [realUrl]);
  const anchors = real && anchorSet?.url === real.url ? anchorSet.at : null;

  // Frame off the horizontal field of view: on a portrait phone it is barely
  // 29° against the 45° vertical, so sizing off height alone hangs the specimen
  // off the sides of the screen.
  const dist = useMemo(() => {
    const aspect = Math.max(0.1, viewport.width / Math.max(1, viewport.height));
    const halfV = Math.tan((45 * Math.PI) / 360);
    const halfH = Math.atan(halfV * aspect);
    const margin = 1.18;
    const d = Math.max(
      (specimen.spanU * 0.5 * margin) / Math.tan(halfH),
      (specimen.sizeU * 0.5 * margin) / halfV,
      18,
    );
    return d;
  }, [specimen.sizeU, specimen.spanU, viewport.width, viewport.height]);

  // The canvas occupies the space left by the tools and notes, never behind them.
  const centre = specimen.centreU ?? specimen.sizeU * 0.15;

  return (
    <div className={`lab lab-experience${info ? " lab-notes-open" : ""}`}>
      <div className="lab-viewport" ref={viewportRef}>
      <Canvas
        dpr={detail === "normal" ? [1, 1.5] : [1, 2]}
        camera={{
          position: [dist * 0.4, centre + specimen.sizeU * 0.06, dist],
          fov: 45,
          near: 0.4,
          // The far plane has to follow the framing distance. A fixed 800 was
          // fine for a 13 cm heart and clipped a 3.6 m-wide reaction entirely —
          // the scene simply rendered empty.
          far: Math.max(600, dist * 4),
        }}
        gl={{ antialias: detail === "ultra", powerPreference: "high-performance" }}
        shadows={detail === "ultra"}
        onCreated={({ gl }) => {
          gl.toneMapping = ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.1;
        }}
        onPointerMissed={() => { setPicked(null); setExtracted(null); }}
      >
        <XR store={store}>
          <color attach="background" args={["#27353e"]} />
          <fog attach="fog" args={["#27353e", dist * 2, dist * 5]} />
          {detail === "ultra" && <StudioLight />}
          <FrameCamera dist={dist} aim={centre} size={specimen.sizeU} span={specimen.spanU}
            reset={reset} spin={spin && !picked && nav === "explore"} view={cameraView} onInteract={() => setSpin(false)} />
          {/* A specimen light rig, not a landscape one: a key from the front-left,
              a cool fill from behind so the silhouette separates from the dark
              background, and enough ambient that a cavity is never pure black. */}

          <group>
            {real ? <Suspense fallback={<StagedExhibit
              key={specimen.id}
              specimen={specimen}
              id={specimen.id}
              organOf={specimen.organOf}
              layer={layer}
              detail={detail}
              onPick={pickPart}
              selected={picked}
              extracted={extracted}
              running={running}
              knob={knob}
            />}>
              <RealSpecimen model={real} specimen={specimen} layer={layer}
                onPick={pickPart} selected={picked} extracted={extracted} onAnchors={onAnchors} />
            </Suspense> : <StagedExhibit
              key={specimen.id} specimen={specimen} id={specimen.id}
              organOf={specimen.organOf} layer={layer} detail={detail}
              onPick={pickPart} selected={picked} extracted={extracted}
              running={running} knob={knob}
            />}
            {/* A pin on the selected part only. Every label at once is how an
                anatomy diagram works on paper and how nothing works on a phone. */}
            {part && extracted !== part.id && (
              <Html
                position={anchors?.[part.id] ?? part.at}
                center
                distanceFactor={specimen.sizeU * 2.6}
                occlude={false}
                zIndexRange={[20, 0]}
                style={{ pointerEvents: "none" }}
              >
                <div className="lab-pin">
                  <b>{part.name}</b>
                  {part.khmer && <span className="khmer">{part.khmer}</span>}
                </div>
              </Html>
            )}
          </group>

          <XROrigin position={[0, -specimen.sizeU * 0.2, dist * 0.75]} />
          <VrImpliesUltra onEnter={() => setDetail("ultra")} />
        </XR>
      </Canvas>
      </div>

      <div className="cls-top">
        <button className="backbtn" onClick={onBack}>{backLabel}</button>
        <span className="cls-title">🔬 {specimen.name}</span>
        <button
          className="grove-quality"
          onClick={() => setDetail((m) => (m === "ultra" ? "normal" : "ultra"))}
          title="View mode Normal is the low-end baseline, Ultra is the full 3D model"
        >
          {detail === "ultra" ? "✨ Ultra" : "🍃 Normal"}
        </button>
        {vrSupported && (
          <button className="vr-btn cls-vr" onClick={() => { setDetail("ultra"); store.enterVR(); }}>
            🥽 VR
          </button>
        )}
      </div>

      <div className="lab-tools">
      <div className="lab-layers" role="group" aria-label="Exhibit controls">
        <span className="lab-tool-label">View</span>
        {specimen.layers.map((l) => (
          <button
            key={l.id}
            className={layer === l.id ? "lab-layer on" : "lab-layer"}
            onClick={() => setLayer(l.id)}
            aria-pressed={layer === l.id}
            title={l.hint}
          >
            {l.label}
          </button>
        ))}
        <button className="lab-layer" onClick={() => { setPicked(null); setSpin((v) => !v); }}
          aria-pressed={spin} title="Turn the exhibit">
          {spin ? "Pause rotation" : "Rotate"}
        </button>
        <button className="lab-layer" onClick={() => { setReset((v) => v + 1); setSpin(false); }}>
          Reset view
        </button>
        {specimen.animated && (
          <button
            className={running ? "lab-layer lab-run on" : "lab-layer lab-run"}
            onClick={() => setRunning((v) => !v)}
            title="Run the mechanism"
          >
            {running ? "⏹ Stop it" : "▶ Run it"}
          </button>
        )}
      </div>

      <div className="lab-cameras" role="group" aria-label="Camera views">
        <span className="lab-tool-label">Camera</span>
        {([
          ["three-quarter", "3/4"], ["front", "Front"], ["side", "Side"], ["top", "Top"],
        ] as const).map(([id, label]) => (
          <button key={id} className={cameraView === id ? "lab-camera on" : "lab-camera"}
            aria-pressed={cameraView === id}
            onClick={() => { setCameraView(id); setReset(v => v + 1); setSpin(false); }}>
            {label}
          </button>
        ))}
      </div>

      {specimen.knob && (
        <div className="lab-knob">
          <label htmlFor="lab-knob-input">
            {specimen.knob.label}
            <b>{knob}{specimen.knob.unit}</b>
          </label>
          <input
            id="lab-knob-input"
            type="range"
            min={specimen.knob.min}
            max={specimen.knob.max}
            step={specimen.knob.step}
            value={knob}
            onChange={(e) => setKnob(Number(e.target.value))}
          />
        </div>
      )}
      </div>

      {!info && (
        <button className="bld-show" onClick={() => setInfo(true)}>
          ℹ️ About this specimen
        </button>
      )}

      <div className={`lab-panel theme-${panelTheme}`} hidden={!info} aria-label="Exhibit notes">
        <div className="lab-sheet-handle" aria-hidden="true" />
        <div className="lab-tabs">
          <button
            className={nav === "explore" ? "lab-tab on" : "lab-tab"}
            onClick={() => setNav("explore")}
          >
            Explore
          </button>
          <button
            className={nav === "quiz" ? "lab-tab on" : "lab-tab"}
            onClick={() => { setNav("quiz"); setSpin(false); }}
          >
            Check yourself
          </button>
          <button
            className="lab-tab lab-theme-toggle"
            onClick={() => setPanelTheme(t => t === "light" ? "dark" : "light")}
            aria-label="Toggle Theme"
            style={{ marginLeft: "auto", marginRight: "4px" }}
          >
            {panelTheme === "light" ? "🌙 Dark" : "☀️ Light"}
          </button>
          <button className="bld-hide" style={{ marginLeft: 0 }} onClick={() => setInfo(false)} aria-label="Hide the notes">
            ✕
          </button>
        </div>

        {nav === "explore" ? (
          <>
            {part ? (
              <>
                <div className="lab-head">
                  <b>{part.name}</b>
                  {part.khmer
                    ? <span className="khmer">{part.khmer}</span>
                    : <span className="lab-needkm" title="No Khmer term has been verified yet">
                        Khmer term needed
                      </span>}
                </div>
                <p className="bld-about">{part.blurb}</p>
                <div className="lab-actions">
                  {part.detail && (
                    <button className="lab-open" onClick={() => onOpenSpecimen(part.detail!)}>
                      Open {part.name.toLowerCase()} →
                    </button>
                  )}
                  {specimen.extractable && part.layer !== "whole" && (
                    <button
                      className={extracted === part.id ? "lab-extract on" : "lab-extract"}
                      onClick={() => setExtracted((e) => (e === part.id ? null : part.id))}
                    >
                      {extracted === part.id ? "↩ Put it back" : "⤴ Take it out"}
                    </button>
                  )}
                  <button className="lab-clear" onClick={() => { setPicked(null); setExtracted(null); }}>
                    ← All parts
                  </button>
                </div>
              </>
            ) : (
              <>
                <span className="lab-card-kicker">Interactive learning model</span>
                <div className="lab-head">
                  <b>{specimen.name}</b>
                  {specimen.khmer && <span className="khmer">{specimen.khmer}</span>}
                </div>
                <div className="bld-sub">
                  {specimen.english} · {subject?.name ?? ""} · {specimen.topic}
                </div>
                {specimen.about.slice(0, readMore ? specimen.about.length : 1).map((p) => (
                  <p key={p.slice(0, 24)} className="bld-about">{p}</p>
                ))}
                {specimen.about.length > 1 && <button className="lab-read-more" onClick={() => setReadMore(value => !value)}>
                  {readMore ? "Show less" : "Read full lesson"}
                </button>}
                <p className="lab-scale">📏 {specimen.reallife}</p>
              </>
            )}

            <div className="lab-partlist">
              {specimen.parts.map((p) => (
                <button
                  key={p.id}
                  className={picked === p.id ? "lab-chip on" : "lab-chip"}
                  onClick={() => {
                    pickPart(p.id);
                    // Jump to the layer the part actually lives in, otherwise
                    // tapping "Left ventricle" highlights something hidden.
                    if (specimen.id === 'head-anatomy' || (p.layer !== "whole" && layer === "whole")) setLayer(p.layer);
                  }}
                >
                  {p.name}
                </button>
              ))}
            </div>
          </>
        ) : (
          <Quiz key={specimen.id} specimen={specimen} />
        )}

        <p className="bld-note">
          {real ? <>
            <b>Real anatomy</b> from{" "}
            <a href={real.credit.href} target="_blank" rel="noreferrer noopener">Z-Anatomy</a>,{" "}
            <a href={real.credit.licenceHref} target="_blank" rel="noreferrer noopener">{real.credit.licence}</a>.
            Simplified to load on a phone; switch to Normal for the lighter diagram.
          </> : specimen.id === "head-anatomy" ? <>
            Blender-authored teaching views: surface, half-face muscles, and an
            open skull with brain. Internal shapes and fibre patterns are simplified
            illustrations, not medically validated anatomy.
          </> : import.meta.env.DEV && specimen.id === "lungs" ? <>
            Local Blender lung pilot with schematic lobes, notch and a reduced bronchial tree.
            Branch density illustrates the lesson, not every airway. The procedural model
            is used if the pilot cannot load. Not medically validated.
          </> : import.meta.env.DEV && specimen.id === "eye" ? <>
            Local Blender eye pilot with separate teaching parts and simplified optics.
            The procedural model is used if the pilot cannot load. Not a scan or a
            medically validated anatomy model.
          </> : import.meta.env.DEV && specimen.id === "human-body" ? <>
            Local exterior-body pilot using MakeHuman's CC0 base mesh, adapted in Blender.
            Organs and skeleton remain schematic. The procedural exterior is used if
            the pilot cannot load. Not a scan or a medically validated anatomy model.
          </> : <>A <b>schematic teaching model</b>, built in code from description
          not a scan, not a measurement, and not accurate enough for anything
          professional. Structure and proportion are right; fine detail is not.</>}
        </p>
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------- quiz --- */

function Quiz({ specimen }: { specimen: Specimen }) {
  const [answers, setAnswers] = useState<Record<number, number>>({});

  return (
    <div className="lab-quiz">
      {specimen.quiz.map((item, qi) => {
        const given = answers[qi];
        const answered = given !== undefined;
        return (
          <div key={item.q} className="lab-q">
            <p className="lab-qtext">{qi + 1}. {item.q}</p>
            <div className="lab-opts">
              {item.options.map((opt, oi) => {
                const right = oi === item.answer;
                const cls = !answered ? "lab-opt"
                  : right ? "lab-opt right"
                    : oi === given ? "lab-opt wrong" : "lab-opt";
                return (
                  <button
                    key={opt}
                    className={cls}
                    disabled={answered}
                    onClick={() => setAnswers((a) => ({ ...a, [qi]: oi }))}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
            {/* The explanation shows whether you were right or wrong. Getting it
                right by luck should still teach you why. */}
            {answered && <p className="lab-why">{item.why}</p>}
          </div>
        );
      })}
      {Object.keys(answers).length > 0 && (
        <button className="lab-clear" onClick={() => setAnswers({})}>Start again</button>
      )}
    </div>
  );
}

/** VR always presents the Ultra scene. */
function VrImpliesUltra({ onEnter }: { onEnter: () => void }) {
  const inXR = useXR((s) => s.session != null);
  useEffect(() => { if (inXR) onEnter(); }, [inXR, onEnter]);
  return null;
}
