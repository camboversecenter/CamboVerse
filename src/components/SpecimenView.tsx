import { useEffect, useMemo, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { Html, OrbitControls } from "@react-three/drei";
import { createXRStore, XR, XROrigin, useXR } from "@react-three/xr";
import { ACESFilmicToneMapping } from "three";
import { TheSpecimen, type Detail } from "./LabOrgans";
import { subjectById, type LabLayer, type Specimen } from "../lab";

/**
 * One **specimen's page**: the model turning on a stand, its parts nameable by
 * tapping them, layers you can peel back, and a few questions at the end.
 *
 * Three view modes, as everywhere in CamboVerse (AGENTS.md):
 *   - **Normal** — the ~$150-Android baseline: coarser meshes, no shadows.
 *   - **Ultra** — full detail for a capable device.
 *   - **VR** — WebXR, and always presents the Ultra scene.
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

export function SpecimenView({
  specimen, onBack,
}: {
  specimen: Specimen;
  onBack: () => void;
}) {
  const store = useMemo(() => createXRStore({ emulate: false }), []);
  const [vrSupported, setVrSupported] = useState(false);
  const [detail, setDetail] = useState<Detail>(detectViewMode);
  const [layer, setLayer] = useState<LabLayer>("whole");
  const [nav, setNav] = useState<Nav>("explore");
  const [picked, setPicked] = useState<string | null>(null);
  const [spin, setSpin] = useState(true);
  const [info, setInfo] = useState(true);

  useEffect(() => {
    const xr = (navigator as Navigator & { xr?: { isSessionSupported(m: string): Promise<boolean> } }).xr;
    xr?.isSessionSupported("immersive-vr").then(setVrSupported).catch(() => setVrSupported(false));
  }, []);

  const part = picked ? specimen.parts.find((p) => p.id === picked) ?? null : null;
  const subject = subjectById(specimen.subject);

  // Frame off the horizontal field of view: on a portrait phone it is barely
  // 29° against the 45° vertical, so sizing off height alone hangs the specimen
  // off the sides of the screen.
  const dist = useMemo(() => {
    const aspect = Math.min(2.2, Math.max(0.45, window.innerWidth / window.innerHeight));
    const halfV = Math.tan((45 * Math.PI) / 360);
    const halfH = Math.atan(halfV * aspect);
    const margin = 1.18;
    return Math.max(
      (specimen.spanU * 0.5 * margin) / Math.tan(halfH),
      (specimen.sizeU * 0.5 * margin) / halfV,
      18,
    );
  }, [specimen.sizeU, specimen.spanU]);

  // Same rule as the building pages: the orbit target lands at the centre of the
  // viewport, so aiming low lifts the specimen into the clear band above an open
  // sheet, and centring it is right once the sheet is dismissed. A specimen's
  // mass sits a little above its origin (the heart's apex hangs below it), hence
  // the 0.15 rather than 0.
  const aim = specimen.sizeU * (info ? -0.35 : 0.15);

  return (
    <div className="lab">
      <Canvas
        dpr={detail === "normal" ? [1, 1.5] : [1, 2]}
        camera={{ position: [dist * 0.4, specimen.sizeU * 0.18, dist], fov: 45, near: 0.4, far: 400 }}
        gl={{ antialias: detail === "ultra", powerPreference: "high-performance" }}
        shadows={detail === "ultra"}
        onCreated={({ gl }) => {
          gl.toneMapping = ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.1;
        }}
        onPointerMissed={() => setPicked(null)}
      >
        <XR store={store}>
          <color attach="background" args={["#101a22"]} />
          {/* A specimen light rig, not a landscape one: a key from the front-left,
              a cool fill from behind so the silhouette separates from the dark
              background, and enough ambient that a cavity is never pure black. */}
          <ambientLight intensity={0.55} />
          <hemisphereLight args={["#cfe4ff", "#4a3a38", 0.6]} />
          <directionalLight
            position={[18, 26, 22]}
            intensity={2.1}
            castShadow={detail === "ultra"}
            shadow-mapSize={[1024, 1024]}
            shadow-bias={-0.0008}
          />
          <directionalLight position={[-22, 8, -18]} intensity={0.7} color="#9fc4ff" />

          <group>
            <TheSpecimen
              id={specimen.id}
              layer={layer}
              detail={detail}
              onPick={setPicked}
              selected={picked}
            />
            {/* A pin on the selected part only. Every label at once is how an
                anatomy diagram works on paper and how nothing works on a phone. */}
            {part && (
              <Html
                position={part.at}
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
          <OrbitControls
            enablePan={false}
            minDistance={specimen.spanU * 0.5}
            maxDistance={dist * 2.4}
            enableDamping
            dampingFactor={0.08}
            target={[0, aim, 0]}
            autoRotate={spin && nav === "explore"}
            autoRotateSpeed={0.55}
          />
        </XR>
      </Canvas>

      <div className="cls-top">
        <button className="backbtn" onClick={onBack}>← Lab</button>
        <span className="cls-title">🔬 {specimen.name}</span>
        <button
          className="grove-quality"
          onClick={() => setDetail((m) => (m === "ultra" ? "normal" : "ultra"))}
          title="View mode — Normal is the low-end baseline, Ultra is the full 3D model"
        >
          {detail === "ultra" ? "✨ Ultra" : "🍃 Normal"}
        </button>
        {vrSupported && (
          <button className="vr-btn cls-vr" onClick={() => { setDetail("ultra"); store.enterVR(); }}>
            🥽 VR
          </button>
        )}
      </div>

      <div className="lab-layers">
        {specimen.layers.map((l) => (
          <button
            key={l.id}
            className={layer === l.id ? "lab-layer on" : "lab-layer"}
            onClick={() => setLayer(l.id)}
            title={l.hint}
          >
            {l.label}
          </button>
        ))}
        <button className="lab-layer" onClick={() => setSpin((v) => !v)}>
          {spin ? "⏸" : "▶"}
        </button>
      </div>

      {!info && (
        <button className="bld-show" onClick={() => setInfo(true)}>
          ℹ️ About this specimen
        </button>
      )}

      <div className={`lab-panel${info ? "" : " bld-panel--hidden"}`} aria-hidden={!info}>
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
          <button className="bld-hide" onClick={() => setInfo(false)} aria-label="Hide the notes">
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
                <button className="lab-clear" onClick={() => setPicked(null)}>
                  ← All parts
                </button>
              </>
            ) : (
              <>
                <div className="lab-head">
                  <b>{specimen.name}</b>
                  {specimen.khmer && <span className="khmer">{specimen.khmer}</span>}
                </div>
                <div className="bld-sub">
                  {specimen.english} · {subject?.name ?? ""} · {specimen.topic}
                </div>
                {specimen.about.map((p) => (
                  <p key={p.slice(0, 24)} className="bld-about">{p}</p>
                ))}
                <p className="lab-scale">📏 {specimen.reallife}</p>
              </>
            )}

            <div className="lab-partlist">
              {specimen.parts.map((p) => (
                <button
                  key={p.id}
                  className={picked === p.id ? "lab-chip on" : "lab-chip"}
                  onClick={() => {
                    setPicked(p.id);
                    // Jump to the layer the part actually lives in, otherwise
                    // tapping "Left ventricle" highlights something hidden.
                    if (p.layer !== "whole" && layer === "whole") setLayer(p.layer);
                  }}
                >
                  {p.name}
                </button>
              ))}
            </div>
          </>
        ) : (
          <Quiz specimen={specimen} />
        )}

        <p className="bld-note">
          A <b>schematic teaching model</b>, built in code from description —
          not a scan, not a measurement, and not accurate enough for anything
          professional. Structure and proportion are right; fine detail is not.
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
