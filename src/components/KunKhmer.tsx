import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { createXRStore, XR, XROrigin, useXR } from "@react-three/xr";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Fighter } from "./Fighter";
import { KUN_MOVES, KUN_ABOUT, KUN_CREDENTIAL, moveById, type KunMove } from "../kunkhmer";
import { claimCredential, getIdentity, earnedAchievements } from "../lib/identity";

/**
 * The Kun Khmer Dojo — play and learn Cambodia's ancient martial art, in a ring
 * with an opponent, the way the reference game stages a fight.
 *
 * LEARN: your boxer demonstrates each of the seven techniques against a sparring
 * partner who recoils when struck (and throws at you so you can block or dodge);
 * tap a technique to see it performed and read what it is. PLAY: a sparring bout
 * calls out techniques — land the right one in time to hit the opponent, miss
 * and you take one. Win the round and a "Kun Khmer training" learning credential
 * is stamped in your Heritage Passport. Explorable in 3D and in VR.
 *
 * Move set, names, controls, and the two-fighter ring follow the CamboVerse
 * "Kun Khmer Fight 3D" reference game (Apache-2.0, camboversecenter/kunkhmer);
 * this is an educational adaptation on CamboVerse's own R3F/XR stack.
 */
const ROUND = 8; // prompts per sparring bout
const PASS = 0.75;
const WINDOW = 2600; // ms to react to each prompt
const HIT = 16; // opponent HP lost per landed strike
const TAKE = 22; // your HP lost per miss

type Mode = "learn" | "play";
const isDefensive = (id: string) => id === "rung" || id === "romiel";

export function KunKhmer({ onBackToMap }: { onBackToMap: () => void }) {
  const store = useMemo(() => createXRStore({ emulate: false }), []);
  const [vrSupported, setVrSupported] = useState(false);
  const [mode, setMode] = useState<Mode>("learn");

  // Two fighters, each driven by a move id + a trigger counter (increment to
  // replay). "guard" is the neutral stance; "hurt" is a struck recoil.
  const [pMove, setPMove] = useState("guard");
  const [pTrig, setPTrig] = useState(0);
  const [oMove, setOMove] = useState("guard");
  const [oTrig, setOTrig] = useState(0);
  const reactTimer = useRef<number | undefined>(undefined);

  const [selected, setSelected] = useState<KunMove>(KUN_MOVES[0]);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [alreadyTrained, setAlreadyTrained] = useState(false);

  useEffect(() => () => window.clearTimeout(reactTimer.current), []);

  const bumpP = (id: string) => { setPMove(id); setPTrig((t) => t + 1); };
  const bumpO = (id: string) => { setOMove(id); setOTrig((t) => t + 1); };

  // Your fighter strikes; the opponent responds. A defensive technique makes
  // the opponent throw a punch that you block/dodge; otherwise it recoils.
  const strikeOpponent = useCallback((m: KunMove) => {
    window.clearTimeout(reactTimer.current);
    setSelected(m);
    bumpP(m.id);
    if (isDefensive(m.id)) {
      bumpO("mat");
    } else {
      reactTimer.current = window.setTimeout(() => bumpO("hurt"), 180);
    }
  }, []);

  // The opponent lands one on you: it jabs, then you recoil.
  const takeHit = useCallback(() => {
    window.clearTimeout(reactTimer.current);
    bumpO("mat");
    reactTimer.current = window.setTimeout(() => bumpP("hurt"), 190);
  }, []);

  const resetStances = useCallback(() => {
    window.clearTimeout(reactTimer.current);
    bumpP("guard");
    bumpO("guard");
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
      <Canvas dpr={[1, 2]} camera={{ position: [0, 1.7, 8.2], fov: 40 }} gl={{ antialias: true }} shadows>
        <XR store={store}>
          <color attach="background" args={["#1a1220"]} />
          <fog attach="fog" args={["#1a1220", 11, 22]} />
          <ambientLight intensity={0.7} />
          <directionalLight position={[3, 7, 5]} intensity={1.15} castShadow shadow-mapSize={[1024, 1024]} />
          <spotLight position={[0, 8, 3]} angle={0.7} intensity={0.7} color="#ffd9a0" penumbra={0.6} castShadow />

          <Ring />

          {/* Two boxers, facing each other across the canvas. */}
          <Fighter move={pMove} trigger={pTrig} facing={Math.PI / 2} palette="red" position={[-0.78, 0.16, 0.12]} />
          <Fighter move={oMove} trigger={oTrig} facing={-Math.PI / 2} palette="blue" position={[0.78, 0.16, -0.12]} />

          <XROrigin position={[0, 1.1, 3.9]} />
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
        <button
          className={mode === "learn" ? "kun-seg on" : "kun-seg"}
          onClick={() => { setMode("learn"); resetStances(); }}
        >
          📖 Learn
        </button>
        <button
          className={mode === "play" ? "kun-seg on" : "kun-seg"}
          onClick={() => { setMode("play"); resetStances(); }}
        >
          🥊 Spar{alreadyTrained ? " ✓" : ""}
        </button>
        <button className="kun-about-btn" onClick={() => setAboutOpen(true)}>
          ℹ️ About
        </button>
      </div>

      {mode === "learn" ? (
        <LearnPanel move={selected} onDemo={strikeOpponent} />
      ) : (
        <SparPanel
          onStrike={strikeOpponent}
          onTake={takeHit}
          onReset={resetStances}
          onEarned={() => setAlreadyTrained(true)}
          alreadyTrained={alreadyTrained}
        />
      )}

      {aboutOpen && <AboutPanel onClose={() => setAboutOpen(false)} />}
    </div>
  );
}

/** A raised ring: canvas floor, four corner posts, three ropes per side. */
function Ring() {
  const corners: [number, number][] = [[-2.7, -2.7], [2.7, -2.7], [-2.7, 2.7], [2.7, 2.7]];
  const ropeY = [0.55, 0.95, 1.35];
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <boxGeometry args={[6, 6, 0.28]} />
        <meshStandardMaterial color="#2c3550" roughness={0.95} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.15, 0]} receiveShadow>
        <planeGeometry args={[5.4, 5.4]} />
        <meshStandardMaterial color="#c7ccd8" roughness={1} />
      </mesh>
      {corners.map(([x, z], i) => (
        <mesh key={i} position={[x, 1.05, z]} castShadow>
          <cylinderGeometry args={[0.1, 0.1, 2, 12]} />
          <meshStandardMaterial color="#d94f4f" roughness={0.6} />
        </mesh>
      ))}
      {ropeY.map((y) =>
        [
          { p: [0, y, 2.7] as [number, number, number], horiz: true },
          { p: [0, y, -2.7] as [number, number, number], horiz: true },
          { p: [2.7, y, 0] as [number, number, number], horiz: false },
          { p: [-2.7, y, 0] as [number, number, number], horiz: false },
        ].map((r, k) => (
          <mesh key={`${y}-${k}`} position={r.p} rotation={[0, r.horiz ? 0 : Math.PI / 2, 0]}>
            <boxGeometry args={[5.4, 0.03, 0.03]} />
            <meshStandardMaterial color="#e6e2d6" roughness={0.7} />
          </mesh>
        )),
      )}
    </group>
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

/** Play mode: a sparring bout that earns the training credential. */
function SparPanel({
  onStrike,
  onTake,
  onReset,
  onEarned,
  alreadyTrained,
}: {
  onStrike: (m: KunMove) => void;
  onTake: () => void;
  onReset: () => void;
  onEarned: () => void;
  alreadyTrained: boolean;
}) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [order, setOrder] = useState<string[]>([]);
  const [qi, setQi] = useState(0);
  const [results, setResults] = useState<boolean[]>([]);
  const [last, setLast] = useState<{ ok: boolean; wanted: KunMove } | null>(null);
  const [oHP, setOHP] = useState(100);
  const [pHP, setPHP] = useState(100);
  const [claiming, setClaiming] = useState(false);
  const [earned, setEarned] = useState(false);
  const answered = useRef(false);
  const timer = useRef<number | undefined>(undefined);

  const target = phase === "prompt" ? moveById(order[qi]) : undefined;
  const score = results.filter(Boolean).length;

  const start = () => {
    const seq = Array.from({ length: ROUND }, () => KUN_MOVES[Math.floor(Math.random() * KUN_MOVES.length)].id);
    setOrder(seq);
    setQi(0);
    setResults([]);
    setLast(null);
    setEarned(false);
    setOHP(100);
    setPHP(100);
    onReset();
    setPhase("prompt");
  };

  const nextPrompt = useCallback(
    (all: boolean[], nextI: number) => {
      if (nextI >= ROUND) {
        setPhase("done");
        onReset();
        const s = all.filter(Boolean).length;
        if (s / ROUND >= PASS) {
          setClaiming(true);
          claimCredential(KUN_CREDENTIAL, `spar:${s}/${ROUND}`).then((ok) => {
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
    [onReset, onEarned],
  );

  const resolve = useCallback(
    (picked: KunMove | null) => {
      if (answered.current) return;
      answered.current = true;
      window.clearTimeout(timer.current);
      const wanted = moveById(order[qi])!;
      const ok = picked?.id === wanted.id;
      if (ok) {
        onStrike(wanted); // you land the technique; opponent recoils
        setOHP((h) => Math.max(0, h - HIT));
      } else {
        onTake(); // you miss; the opponent lands one on you
        setPHP((h) => Math.max(0, h - TAKE));
      }
      const next = [...results, ok];
      setResults(next);
      setLast({ ok, wanted });
      setPhase("feedback");
      window.setTimeout(() => nextPrompt(next, qi + 1), 1100);
    },
    [order, qi, results, onStrike, onTake, nextPrompt],
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

  const HealthBars = () => (
    <div className="kun-hp">
      <div className="kun-hp-row">
        <span className="kun-hp-name you">You</span>
        <span className="kun-hp-bar"><span className="kun-hp-fill you" style={{ width: `${pHP}%` }} /></span>
      </div>
      <div className="kun-hp-row">
        <span className="kun-hp-name opp">Boxer</span>
        <span className="kun-hp-bar"><span className="kun-hp-fill opp" style={{ width: `${oHP}%` }} /></span>
      </div>
    </div>
  );

  if (phase === "idle") {
    return (
      <div className="kun-train">
        <p className="kun-train-lead">
          <b>Sparring bout.</b> A technique will be called out — land it by tapping its button (or pressing
          its key) before the timer runs out. Hit and the opponent recoils; miss and you take one. {ROUND}{" "}
          exchanges; {Math.ceil(ROUND * PASS)} landed to earn your training credential.
        </p>
        <button className="kun-start" onClick={start}>
          {alreadyTrained ? "Spar again" : "Touch gloves"} 🥊
        </button>
      </div>
    );
  }

  if (phase === "done") {
    const passed = score / ROUND >= PASS;
    return (
      <div className="kun-train">
        <HealthBars />
        <div className={passed ? "kun-score pass" : "kun-score"}>
          {score} / {ROUND} landed
        </div>
        {passed ? (
          <>
            <p className="kun-train-msg pass">🎉 Victory! You fought fast and true.</p>
            <p className="kun-train-sub">
              {claiming
                ? "Saving your credential…"
                : earned
                  ? "A Kun Khmer training credential was added to your Heritage Passport."
                  : "Nice work!"}
            </p>
          </>
        ) : (
          <p className="kun-train-msg">Keep drilling — {Math.ceil(ROUND * PASS)} landed to win. Go again.</p>
        )}
        <button className="kun-start" onClick={start}>
          Spar again 🥊
        </button>
      </div>
    );
  }

  // prompt / feedback share the technique-button pad + health bars.
  return (
    <>
      <div className="kun-spar-hud">
        <HealthBars />
        <div className="kun-spar-call">
          <span className="kun-train-count">
            {qi + 1} / {ROUND}
          </span>
          {phase === "prompt" && target ? (
            <span className="kun-call">
              Land: <span className="khmer">{target.khmer}</span> <b>{target.english}</b>
            </span>
          ) : last ? (
            <span className={last.ok ? "kun-call ok" : "kun-call bad"}>
              {last.ok ? "✓ Landed!" : `✕ It was ${last.wanted.english}`}
            </span>
          ) : (
            <span className="kun-call">…</span>
          )}
        </div>
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
    </>
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
          Technique names, controls, and the two-fighter ring are adapted from the CamboVerse “Kun Khmer
          Fight 3D” reference game (Apache-2.0, camboversecenter/kunkhmer). Kun Khmer is a living heritage of
          the Cambodian people.
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
      maxDistance={10}
      maxPolarAngle={Math.PI / 2.05}
      enableDamping
      dampingFactor={0.08}
      target={[0, 1.05, 0]}
    />
  );
}
