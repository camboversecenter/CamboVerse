import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { createXRStore, XR, XROrigin, useXR } from "@react-three/xr";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Fighter } from "./Fighter";
import { KUN_MOVES, KUN_ABOUT, KUN_CREDENTIAL, moveById, type KunMove } from "../kunkhmer";
import { claimCredential, getIdentity, earnedAchievements } from "../lib/identity";

/**
 * The Kun Khmer Dojo — play and learn Cambodia's ancient martial art.
 *
 * LEARN: a procedural boxer demonstrates each of the seven techniques; tap a
 * technique to see it performed and read what it is. PLAY: a reaction-training
 * round calls out techniques and asks you to strike the right one in time —
 * pass it and a "Kun Khmer training" learning credential is stamped in your
 * Heritage Passport. Explorable in 3D and in VR.
 *
 * Move set, names, and controls follow the CamboVerse "Kun Khmer Fight 3D"
 * reference game (Apache-2.0, camboversecenter/kunkhmer); this is an
 * educational adaptation on CamboVerse's own R3F/XR stack.
 */
const ROUND = 8; // prompts per training round
const PASS = 0.75;
const WINDOW = 2600; // ms to react to each prompt

type Mode = "learn" | "play";

export function KunKhmer({ onBackToMap }: { onBackToMap: () => void }) {
  const store = useMemo(() => createXRStore({ emulate: false }), []);
  const [vrSupported, setVrSupported] = useState(false);
  const [mode, setMode] = useState<Mode>("learn");

  // The fighter is driven by a current move + a trigger counter (increment to
  // replay). Both Learn taps and Play prompts flow through here.
  const [move, setMove] = useState<KunMove>(KUN_MOVES[0]);
  const [trigger, setTrigger] = useState(0);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [alreadyTrained, setAlreadyTrained] = useState(false);

  const demo = useCallback((m: KunMove) => {
    setMove(m);
    setTrigger((t) => t + 1);
  }, []);

  useEffect(() => {
    const xr = (navigator as Navigator & { xr?: { isSessionSupported(m: string): Promise<boolean> } }).xr;
    xr?.isSessionSupported("immersive-vr").then(setVrSupported).catch(() => setVrSupported(false));
  }, []);

  // Show a "✓ trained" state if this visitor already holds the credential.
  useEffect(() => {
    let live = true;
    (async () => {
      const set = await earnedAchievements(await getIdentity(false));
      if (live) setAlreadyTrained(set.has(KUN_CREDENTIAL));
    })();
    return () => {
      live = false;
    };
  }, []);

  return (
    <div className="kun">
      <Canvas dpr={[1, 2]} camera={{ position: [0, 1.4, 4.4], fov: 45 }} gl={{ antialias: true }} shadows>
        <XR store={store}>
          <color attach="background" args={["#1a1220"]} />
          <fog attach="fog" args={["#1a1220", 9, 20]} />
          <ambientLight intensity={0.7} />
          <directionalLight position={[3, 7, 5]} intensity={1.15} castShadow shadow-mapSize={[1024, 1024]} />
          <spotLight position={[-4, 6, 2]} angle={0.6} intensity={0.5} color="#e08a2f" />

          {/* Ring: a raised canvas floor with corner posts. */}
          <group position={[0, 0, 0]}>
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
              <boxGeometry args={[6, 6, 0.12]} />
              <meshStandardMaterial color="#3a4a6a" roughness={0.9} />
            </mesh>
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.07, 0]} receiveShadow>
              <planeGeometry args={[5.4, 5.4]} />
              <meshStandardMaterial color="#c7ccd8" roughness={1} />
            </mesh>
            {[[-2.7, -2.7], [2.7, -2.7], [-2.7, 2.7], [2.7, 2.7]].map(([x, z], i) => (
              <mesh key={i} position={[x, 1, z]} castShadow>
                <cylinderGeometry args={[0.09, 0.09, 2, 10]} />
                <meshStandardMaterial color="#d94f4f" roughness={0.6} />
              </mesh>
            ))}
          </group>

          <Fighter move={move.id} trigger={trigger} position={[0, 0.07, 0]} />

          <XROrigin position={[0, 1.1, 3.6]} />
          <Nav />
        </XR>
      </Canvas>

      {/* ---- HUD ---- */}
      <div className="cls-top">
        <button className="backbtn" onClick={onBackToMap}>
          ← Map
        </button>
        <span className="cls-title">🥊 Kun Khmer Dojo</span>
        {vrSupported && (
          <button className="vr-btn cls-vr" onClick={() => store.enterVR()}>
            🥽 VR
          </button>
        )}
      </div>

      <div className="kun-modes">
        <button className={mode === "learn" ? "kun-seg on" : "kun-seg"} onClick={() => setMode("learn")}>
          📖 Learn
        </button>
        <button className={mode === "play" ? "kun-seg on" : "kun-seg"} onClick={() => setMode("play")}>
          🎯 Train{alreadyTrained ? " ✓" : ""}
        </button>
        <button className="kun-about-btn" onClick={() => setAboutOpen(true)}>
          ℹ️ About
        </button>
      </div>

      {mode === "learn" ? (
        <LearnPanel move={move} onDemo={demo} />
      ) : (
        <TrainPanel onDemo={demo} onEarned={() => setAlreadyTrained(true)} alreadyTrained={alreadyTrained} />
      )}

      {aboutOpen && <AboutPanel onClose={() => setAboutOpen(false)} />}
    </div>
  );
}

/** Learn mode: a row of technique buttons + the selected move's explanation. */
function LearnPanel({ move, onDemo }: { move: KunMove; onDemo: (m: KunMove) => void }) {
  // Keyboard shortcuts mirror the reference game's controls.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const m = KUN_MOVES.find((mv) => mv.key === e.key.toLowerCase());
      if (m) {
        e.preventDefault();
        onDemo(m);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onDemo]);

  return (
    <>
      <div className="kun-moves">
        {KUN_MOVES.map((m) => (
          <button
            key={m.id}
            className={m.id === move.id ? "kun-move on" : "kun-move"}
            style={{ borderColor: m.color, ...(m.id === move.id ? { background: m.color } : {}) }}
            onClick={() => onDemo(m)}
          >
            <span className="kun-move-kh khmer">{m.khmer}</span>
            <span className="kun-move-en">{m.english}</span>
            <span className="kun-move-key">{m.key === " " ? "␣" : m.key.toUpperCase()}</span>
          </button>
        ))}
      </div>
      <div className="kun-info" style={{ borderColor: move.color }}>
        <div className="kun-info-head">
          <span className="kun-info-kh khmer">{move.khmer}</span>
          <span className="kun-info-name">
            {move.name} · <b>{move.english}</b>
          </span>
        </div>
        <p className="kun-info-desc">{move.desc}</p>
        <button className="kun-replay" style={{ background: move.color }} onClick={() => onDemo(move)}>
          ▶ Show me again
        </button>
      </div>
    </>
  );
}

type Phase = "idle" | "prompt" | "feedback" | "done";

/** Play mode: a reaction-training round that earns the training credential. */
function TrainPanel({
  onDemo,
  onEarned,
  alreadyTrained,
}: {
  onDemo: (m: KunMove) => void;
  onEarned: () => void;
  alreadyTrained: boolean;
}) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [order, setOrder] = useState<string[]>([]);
  const [qi, setQi] = useState(0);
  const [results, setResults] = useState<boolean[]>([]);
  const [last, setLast] = useState<{ ok: boolean; wanted: KunMove } | null>(null);
  const [claiming, setClaiming] = useState(false);
  const [earned, setEarned] = useState(false);
  const answered = useRef(false);
  const timer = useRef<number | undefined>(undefined);

  const target = phase === "prompt" ? moveById(order[qi]) : undefined;
  const score = results.filter(Boolean).length;

  const start = () => {
    // Only trainable techniques (skip the pure block/dodge? keep all — they're
    // valid reactions). A round of ROUND random prompts.
    const seq = Array.from({ length: ROUND }, () => KUN_MOVES[Math.floor(Math.random() * KUN_MOVES.length)].id);
    setOrder(seq);
    setQi(0);
    setResults([]);
    setLast(null);
    setEarned(false);
    setPhase("prompt");
  };

  // Advance to the next prompt (or finish the round).
  const nextPrompt = useCallback(
    (all: boolean[], nextI: number) => {
      if (nextI >= ROUND) {
        setPhase("done");
        const s = all.filter(Boolean).length;
        if (s / ROUND >= PASS) {
          setClaiming(true);
          claimCredential(KUN_CREDENTIAL, `train:${s}/${ROUND}`).then((ok) => {
            setClaiming(false);
            if (ok) {
              setEarned(true);
              onEarned();
            }
          });
        }
        return;
      }
      setQi(nextI);
      setPhase("prompt");
    },
    [onEarned],
  );

  const resolve = useCallback(
    (picked: KunMove | null) => {
      if (answered.current) return;
      answered.current = true;
      window.clearTimeout(timer.current);
      const wanted = moveById(order[qi])!;
      const ok = picked?.id === wanted.id;
      onDemo(wanted); // the fighter always shows the correct technique
      const next = [...results, ok];
      setResults(next);
      setLast({ ok, wanted });
      setPhase("feedback");
      window.setTimeout(() => nextPrompt(next, qi + 1), 1100);
    },
    [order, qi, results, onDemo, nextPrompt],
  );

  // Start each prompt's reaction window.
  useEffect(() => {
    if (phase !== "prompt") return;
    answered.current = false;
    setLast(null);
    timer.current = window.setTimeout(() => resolve(null), WINDOW);
    return () => window.clearTimeout(timer.current);
  }, [phase, qi, resolve]);

  // Keyboard: press the technique's key to answer.
  useEffect(() => {
    if (phase !== "prompt") return;
    const onKey = (e: KeyboardEvent) => {
      const m = KUN_MOVES.find((mv) => mv.key === e.key.toLowerCase());
      if (m) {
        e.preventDefault();
        resolve(m);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, resolve]);

  if (phase === "idle") {
    return (
      <div className="kun-train">
        <p className="kun-train-lead">
          <b>Reaction training.</b> A technique will be called out — strike it by tapping its button (or
          pressing its key) before the timer runs out. {ROUND} rounds; {Math.ceil(ROUND * PASS)} correct to
          earn your training credential.
        </p>
        <button className="kun-start" onClick={start}>
          {alreadyTrained ? "Train again" : "Begin training"} 🥊
        </button>
      </div>
    );
  }

  if (phase === "done") {
    const passed = score / ROUND >= PASS;
    return (
      <div className="kun-train">
        <div className={passed ? "kun-score pass" : "kun-score"}>
          {score} / {ROUND}
        </div>
        {passed ? (
          <>
            <p className="kun-train-msg pass">🎉 Trained! You struck fast and true.</p>
            <p className="kun-train-sub">
              {claiming
                ? "Saving your credential…"
                : earned
                  ? "A Kun Khmer training credential was added to your Heritage Passport."
                  : "Nice work!"}
            </p>
          </>
        ) : (
          <p className="kun-train-msg">Keep drilling — {Math.ceil(ROUND * PASS)} correct to pass. Try again.</p>
        )}
        <button className="kun-start" onClick={start}>
          Train again 🥊
        </button>
      </div>
    );
  }

  // prompt / feedback share the technique-button pad.
  return (
    <div className="kun-train">
      <div className="kun-train-top">
        <span className="kun-train-count">
          {qi + 1} / {ROUND}
        </span>
        {phase === "prompt" && target ? (
          <span className="kun-call">
            Strike: <span className="khmer">{target.khmer}</span> <b>{target.english}</b>
          </span>
        ) : last ? (
          <span className={last.ok ? "kun-call ok" : "kun-call bad"}>
            {last.ok ? "✓ Hit!" : `✕ It was ${last.wanted.english}`}
          </span>
        ) : (
          <span className="kun-call">…</span>
        )}
      </div>
      <div className="kun-moves kun-moves-pad">
        {KUN_MOVES.map((m) => {
          const reveal = phase === "feedback" && last?.wanted.id === m.id;
          return (
            <button
              key={m.id}
              className={reveal ? "kun-move on" : "kun-move"}
              style={{ borderColor: m.color, ...(reveal ? { background: m.color } : {}) }}
              disabled={phase !== "prompt"}
              onClick={() => resolve(m)}
            >
              <span className="kun-move-kh khmer">{m.khmer}</span>
              <span className="kun-move-en">{m.english}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function AboutPanel({ onClose }: { onClose: () => void }) {
  return (
    <div className="kun-about" onClick={onClose}>
      <div className="kun-about-card" onClick={(e) => e.stopPropagation()}>
        <div className="kun-about-top">
          <span className="kun-about-title">
            🥊 Kun Khmer <span className="khmer">កុនខ្មែរ</span>
          </span>
          <button className="cls-close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        {KUN_ABOUT.map((f) => (
          <div key={f.title} className="kun-fact">
            <h4>
              {f.title} {f.khmer && <span className="khmer">{f.khmer}</span>}
            </h4>
            <p>{f.body}</p>
          </div>
        ))}
        <p className="kun-credit">
          Technique names and controls adapted from the CamboVerse “Kun Khmer Fight 3D” reference game
          (Apache-2.0, camboversecenter/kunkhmer). Kun Khmer is a living heritage of the Cambodian people.
        </p>
      </div>
    </div>
  );
}

function Nav() {
  const inXR = useXR((s) => s.session != null);
  if (inXR) return null;
  return (
    <OrbitControls
      makeDefault
      enablePan={false}
      minDistance={2.5}
      maxDistance={9}
      maxPolarAngle={Math.PI / 2.05}
      enableDamping
      dampingFactor={0.08}
      target={[0, 1, 0]}
    />
  );
}
