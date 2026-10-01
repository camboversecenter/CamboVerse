import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { Html, OrbitControls } from "@react-three/drei";
import { createXRStore, XR, XROrigin, useXR } from "@react-three/xr";
import { ACESFilmicToneMapping, Vector3 } from "three";
import { Heart, Lungs, type Detail } from "./LabOrgans";
import { RealSpecimen, realModelFor, type Anchors } from "./LabRealModels";
import { Body, SingleOrgan } from "./LabBody";
import { Lever, GearTrain, Engine } from "./LabMachines";
import { Water, Methane, SaltCrystal, Carbon } from "./LabChemistry";
import { BurnMethane, MakeWater, Neutralise } from "./LabReactions";
import { TreadlePump, BiogasDigester } from "./LabFarm";
import { studioEnvironment } from "../lib/studioEnv";
import { subjectById, type LabLayer, type Specimen } from "../lab";

/**
 * Draw whichever exhibit this is. The one place a new exhibit is plugged in —
 * everything else in the Lab is data.
 */
function TheSpecimen({
  id, organOf, layer, detail, onPick, selected, extracted, running, knob,
}: {
  id: string; organOf?: string; layer: LabLayer; detail: Detail;
  onPick: (partId: string) => void; selected: string | null; extracted: string | null;
  running: boolean; knob: number;
}) {
  // An organ pulled out of the body onto its own screen: the same geometry the
  // body uses, drawn alone.
  if (organOf) return <SingleOrgan organId={organOf} detail={detail} onPick={onPick} selected={selected} />;
  const machine = { layer, detail, onPick, selected, running, knob };
  switch (id) {
    case "lever": return <Lever {...machine} />;
    case "gear-train": return <GearTrain {...machine} />;
    case "engine": return <Engine {...machine} />;
    case "water": return <Water {...machine} />;
    case "methane": return <Methane {...machine} />;
    case "salt": return <SaltCrystal {...machine} />;
    case "carbon": return <Carbon {...machine} />;
    case "burn-methane": return <BurnMethane {...machine} />;
    case "make-water": return <MakeWater {...machine} />;
    case "neutralise": return <Neutralise {...machine} />;
    case "treadle-pump": return <TreadlePump {...machine} />;
    case "biogas": return <BiogasDigester {...machine} />;
    case "human-body":
      return <Body layer={layer} detail={detail} onPick={onPick} selected={selected} extracted={extracted} />;
    case "heart": return <Heart layer={layer} detail={detail} onPick={onPick} selected={selected} />;
    case "lungs": return <Lungs layer={layer} detail={detail} onPick={onPick} selected={selected} />;
    default: return null;
  }
}

/**
 * Re-frame the camera when the exhibit changes.
 *
 * react-three-fiber reads the `camera` prop **once, at canvas creation**. Since
 * teleporting from the body to one of its organs re-renders the same
 * `SpecimenView` rather than remounting it, the camera kept the body's distance
 * and a 15 cm pancreas rendered three times too far away. Setting it here, on
 * every change of framing, is what makes the jump land correctly.
 */
function FrameCamera({ id, dist, aim, size }: { id: string; dist: number; aim: number; size: number }) {
  const camera = useThree((s) => s.camera);
  const controls = useThree((s) => s.controls) as unknown as { target: Vector3 } | null;
  const framedFor = useRef<string | null>(null);
  useEffect(() => {
    const target = new Vector3(0, aim, 0);
    // How far the standard three-quarter view sits from its target.
    const reach = Math.hypot(dist * 0.4, size * 0.24, dist);
    if (framedFor.current !== id) {
      // A new exhibit: the standard three-quarter view.
      camera.position.set(dist * 0.4, aim + size * 0.24, dist);
      framedFor.current = id;
    } else {
      // Same exhibit, new framing — the notes sheet opened or closed. Move in or
      // out along the student's *current* line of sight. Re-aiming instead would
      // yank the view they had turned to out from under them, which is why the
      // first version refused to re-frame at all and cropped the body's head.
      const from = controls?.target ?? target;
      const dir = camera.position.clone().sub(from).normalize();
      camera.position.copy(target).addScaledVector(dir, reach);
    }
    camera.lookAt(target);
    const persp = camera as typeof camera & { far: number };
    persp.far = Math.max(600, dist * 4);
    camera.updateProjectionMatrix();
  }, [camera, controls, id, dist, aim, size]);
  return null;
}

/**
 * The studio environment, built once per canvas and shared by every material.
 *
 * This is what makes a wet surface read as wet: an organ's realism is almost
 * entirely in the shape of its specular highlight, and a directional light can
 * only give it one hard dot. Generated in-browser rather than downloaded — no
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
  specimen, onBack, onOpenSpecimen, backLabel = "← Lab",
}: {
  specimen: Specimen;
  onBack: () => void;
  /** Teleport to another exhibit — an organ's own screen, from inside the body. */
  onOpenSpecimen: (id: string) => void;
  backLabel?: string;
}) {
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
  useEffect(() => { setKnob(specimen.knob?.value ?? 0); }, [specimen.knob?.value, specimen.id]);
  // Teleporting from the body to an organ's own screen reuses this component.
  // Without a reset the body's selection stays lit on the organ — its part ids
  // match — and washes its colour out. The view mode is kept on purpose: a
  // visitor who chose Ultra stays in Ultra.
  useEffect(() => { setPicked(null); setExtracted(null); setLayer("whole"); }, [specimen.id]);
  const [spin, setSpin] = useState(true);
  const [info, setInfo] = useState(true);

  useEffect(() => {
    const xr = (navigator as Navigator & { xr?: { isSessionSupported(m: string): Promise<boolean> } }).xr;
    xr?.isSessionSupported("immersive-vr").then(setVrSupported).catch(() => setVrSupported(false));
  }, []);

  const part = picked ? specimen.parts.find((p) => p.id === picked) ?? null : null;
  const subject = subjectById(specimen.subject);

  // Real anatomy in Ultra (and so in VR), where an exhibit has it. Normal keeps
  // the procedural model: same parts, same labels, same questions, a fraction
  // of the weight. Degrade the detail, never the content.
  const real = detail === "ultra" ? realModelFor(specimen.id) : null;
  // Label anchors from the real model, keyed by the file they came from so a
  // stale set can never be applied to a different exhibit.
  const [anchorSet, setAnchorSet] = useState<{ url: string; at: Anchors } | null>(null);
  const realUrl = real?.url ?? null;
  const onAnchors = useCallback((at: Anchors) => {
    if (realUrl) setAnchorSet({ url: realUrl, at });
  }, [realUrl]);
  const anchors = real && anchorSet?.url === real.url ? anchorSet.at : null;

  /**
   * Fit the exhibit to the part of the screen that is actually clear.
   *
   * Open, the notes sheet covers the bottom ~44% and the header and layer
   * buttons the top ~10%, leaving a band about 46% of the screen tall whose
   * centre sits ~17% above the screen's. The first version sized the exhibit
   * to the *whole* screen and then lifted it by 26% of the frame: that put a
   * standing figure's centre under the header, so its head went off the top
   * while its feet were still behind the sheet. Fitting to the band, and
   * centring on it, is what keeps a 175 cm figure and a 13 cm heart both whole.
   */
  const BAND = info ? 0.46 : 0.82;
  const LIFT = info ? 0.17 : 0;

  // Frame off the horizontal field of view too: on a portrait phone it is barely
  // 29° against the 45° vertical, so sizing off height alone hangs the specimen
  // off the sides of the screen.
  const { dist, visibleH } = useMemo(() => {
    const aspect = Math.min(2.2, Math.max(0.45, window.innerWidth / window.innerHeight));
    const halfV = Math.tan((45 * Math.PI) / 360);
    const halfH = Math.atan(halfV * aspect);
    const margin = 1.18;
    const d = Math.max(
      (specimen.spanU * 0.5 * margin) / Math.tan(halfH),
      (specimen.sizeU * 0.5 * margin) / (halfV * BAND),
      18,
    );
    // How much world height the frame covers at that distance. The camera sits
    // off-axis, so this is the flat-on figure and slightly conservative, which
    // is the right direction to be wrong in.
    return { dist: d, visibleH: 2 * d * halfV };
  }, [specimen.sizeU, specimen.spanU, BAND]);

  // The orbit target lands at the centre of the viewport, so aiming *low* lifts
  // the exhibit up into the clear band. A specimen's mass sits a little above
  // its origin (the heart's apex hangs below it), hence the 0.15 rather than 0.
  const centre = specimen.centreU ?? specimen.sizeU * 0.15;
  const aim = centre - visibleH * LIFT;

  return (
    <div className="lab">
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
          <color attach="background" args={["#101a22"]} />
          <StudioLight />
          <FrameCamera id={specimen.id} dist={dist} aim={aim} size={specimen.sizeU} />
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
            {real ? (
              // While the real model downloads, the student is looking at the
              // procedural one — never a blank stage.
              <Suspense fallback={
                <TheSpecimen
                  id={specimen.id} organOf={specimen.organOf} layer={layer} detail={detail}
                  onPick={setPicked} selected={picked} extracted={extracted}
                  running={running} knob={knob}
                />
              }>
                <RealSpecimen
                  model={real} specimen={specimen} layer={layer} onPick={setPicked}
                  selected={picked} extracted={extracted} onAnchors={onAnchors}
                />
              </Suspense>
            ) : (
              <TheSpecimen
                id={specimen.id}
                organOf={specimen.organOf}
                layer={layer}
                detail={detail}
                onPick={setPicked}
                selected={picked}
                extracted={extracted}
                running={running}
                knob={knob}
              />
            )}
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
                {/* A zero-size anchor exactly on the part, with the label lifted
                    above it on a stem. Centred on the point, the label used to
                    sit squarely on top of the organ it was naming. */}
                <div className="lab-pin-anchor">
                  <div className="lab-pin">
                    <b>{part.name}</b>
                    {part.khmer && <span className="khmer">{part.khmer}</span>}
                  </div>
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
            makeDefault
            target={[0, aim, 0]}
            autoRotate={spin && nav === "explore"}
            autoRotateSpeed={0.55}
          />
        </XR>
      </Canvas>

      <div className="cls-top">
        <button className="backbtn" onClick={onBack}>{backLabel}</button>
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
        <button className="lab-layer" onClick={() => setSpin((v) => !v)} title="Turn the exhibit">
          {spin ? "⏸" : "▶"}
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
                    if (extracted && extracted !== p.id) setExtracted(null);
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

        {real ? (
          // CC BY-SA requires attribution wherever the work is shown.
          <p className="bld-note">
            <b>Real anatomy</b> from{" "}
            <a href={real.credit.href} target="_blank" rel="noreferrer noopener">Z-Anatomy</a>,{" "}
            <a href={real.credit.licenceHref} target="_blank" rel="noreferrer noopener">
              {real.credit.licence}
            </a>
            , simplified to load on a phone. Colours follow the classroom
            convention — red where blood is rich in oxygen, blue where it is not.
            Switch to <b>Normal</b> for the lighter diagram.
          </p>
        ) : (
          <p className="bld-note">
            A <b>schematic teaching model</b>, built in code from description —
            not a scan, not a measurement, and not accurate enough for anything
            professional. Structure and proportion are right; fine detail is not.
          </p>
        )}
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
