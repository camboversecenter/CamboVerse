import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { createXRStore, XR, XROrigin, useXR } from "@react-three/xr";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Mesh, Group } from "three";
import {
  SANCTUARIES, BREATH_PATTERNS, DURATIONS, SUTRAS, MED_CREDENTIAL,
  type Sanctuary, type BreathPattern,
} from "../meditation";
import { claimCredential, getIdentity, earnedAchievements } from "../lib/identity";
import * as sound from "../lib/meditationSound";

/**
 * Virtual Meditation — sit inside a serene Khmer sanctuary (forest, temple at
 * dawn, mountain mist, riverside), in 3D or VR, with a generated ambient
 * soundscape and a gentle breathing guide. Optionally add a warm chant tone and
 * traditional Theravada verses. The practice is universal; the setting honours
 * Cambodia's sacred landscapes. Completing a sitting leaves a quiet "moment of
 * calm" in the Heritage Passport — a note, not a score.
 */
type Phase = "setup" | "active" | "done";
const smooth = (t: number) => t * t * (3 - 2 * t);

export function MeditationView({ onBackToMap }: { onBackToMap: () => void }) {
  const store = useMemo(() => createXRStore({ emulate: false }), []);
  const [vrSupported, setVrSupported] = useState(false);
  const [phase, setPhase] = useState<Phase>("setup");
  const [sanctuary, setSanctuary] = useState<Sanctuary>(SANCTUARIES[0]);
  const [pattern, setPattern] = useState<BreathPattern>(BREATH_PATTERNS[0]);
  const [minutes, setMinutes] = useState<number>(5);
  const [chant, setChant] = useState(false);
  const [sutraI, setSutraI] = useState(0);
  const [muted, setMutedState] = useState(sound.isMuted());
  const [remaining, setRemaining] = useState(0);
  const [earned, setEarned] = useState(false);

  // Breath state is animated outside React to avoid per-frame re-renders.
  const breath = useRef({ scale: 0.55, phase: "Breathe in" });
  const ringRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLDivElement>(null);
  const startAt = useRef(0);

  useEffect(() => {
    const xr = (navigator as Navigator & { xr?: { isSessionSupported(m: string): Promise<boolean> } }).xr;
    xr?.isSessionSupported("immersive-vr").then(setVrSupported).catch(() => setVrSupported(false));
  }, []);
  useEffect(() => {
    let live = true;
    (async () => {
      const set = await earnedAchievements(await getIdentity(false));
      if (live) setEarned(set.has(MED_CREDENTIAL));
    })();
    return () => {
      live = false;
    };
  }, []);

  // Stop audio if we leave the view.
  useEffect(() => () => sound.stop(), []);

  // Cycle sutras while chanting.
  useEffect(() => {
    if (!chant) return;
    const iv = window.setInterval(() => setSutraI((i) => (i + 1) % SUTRAS.length), 20000);
    return () => window.clearInterval(iv);
  }, [chant]);

  // The sitting: audio + a countdown; a bell to open and to close.
  function begin() {
    startAt.current = performance.now();
    setRemaining(minutes * 60);
    setPhase("active");
    sound.start(sanctuary, chant);
    sound.chime();
  }
  function end(complete: boolean) {
    sound.chime();
    sound.stop();
    setPhase("done");
    if (complete && !earned) {
      claimCredential(MED_CREDENTIAL, `sit:${sanctuary.id}:${minutes}m`).then((ok) => ok && setEarned(true));
    }
  }

  // Countdown tick.
  useEffect(() => {
    if (phase !== "active") return;
    const iv = window.setInterval(() => {
      const elapsed = (performance.now() - startAt.current) / 1000;
      const left = Math.max(0, minutes * 60 - elapsed);
      setRemaining(left);
      if (left <= 0) {
        window.clearInterval(iv);
        end(true);
      }
    }, 500);
    return () => window.clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, minutes]);

  // Breath animation loop (drives the DOM ring + the shared ref for the 3D orb).
  useEffect(() => {
    if (phase !== "active") return;
    let raf = 0;
    const total = pattern.inhale + pattern.hold + pattern.exhale + pattern.rest;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      const t = ((performance.now() - startAt.current) / 1000) % total;
      let scale = 0.55;
      let label = "Breathe in";
      if (t < pattern.inhale) {
        scale = 0.55 + 0.45 * smooth(t / pattern.inhale);
        label = "Breathe in";
      } else if (t < pattern.inhale + pattern.hold) {
        scale = 1;
        label = "Hold";
      } else if (t < pattern.inhale + pattern.hold + pattern.exhale) {
        scale = 1 - 0.45 * smooth((t - pattern.inhale - pattern.hold) / pattern.exhale);
        label = "Breathe out";
      } else {
        scale = 0.55;
        label = "Rest";
      }
      breath.current.scale = scale;
      breath.current.phase = label;
      if (ringRef.current) ringRef.current.style.transform = `scale(${scale})`;
      if (labelRef.current && labelRef.current.textContent !== label) labelRef.current.textContent = label;
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [phase, pattern]);

  const toggleMute = () => {
    const m = !muted;
    sound.setMuted(m);
    setMutedState(m);
  };
  const toggleChant = () => {
    const on = !chant;
    setChant(on);
    if (phase === "active") sound.setChant(on);
  };

  const mm = Math.floor(remaining / 60);
  const ss = Math.floor(remaining % 60);

  return (
    <div className="med">
      <Canvas dpr={[1, 2]} camera={{ position: [0, 1.5, 6], fov: 50 }} gl={{ antialias: true }}>
        <XR store={store}>
          <color attach="background" args={[sanctuary.sky]} />
          <fog attach="fog" args={sanctuary.fog} />
          <MedScene sanctuary={sanctuary} breath={breath} active={phase === "active"} />
          <XROrigin position={[0, 1.1, 3]} />
          <Nav />
        </XR>
      </Canvas>

      {/* ---- HUD ---- */}
      <div className="cls-top">
        <button className="backbtn" onClick={() => { sound.stop(); onBackToMap(); }}>
          ← Map
        </button>
        <span className="cls-title">🧘 Virtual Meditation</span>
        {vrSupported && (
          <button className="vr-btn cls-vr" onClick={() => store.enterVR()}>
            🥽 VR
          </button>
        )}
      </div>

      <button className="med-mute" onClick={toggleMute} aria-label={muted ? "Unmute" : "Mute"}>
        {muted ? "🔇" : "🔊"}
      </button>

      {phase === "setup" && (
        <div className="med-setup">
          <div className="med-invite">
            <span className="med-inv-title">
              <span className="khmer">{sanctuary.khmer}</span> {sanctuary.english}
            </span>
            <p>{sanctuary.invite}</p>
          </div>

          <div className="med-row">
            {SANCTUARIES.map((s) => (
              <button
                key={s.id}
                className={s.id === sanctuary.id ? "med-chip on" : "med-chip"}
                style={s.id === sanctuary.id ? { background: s.accent, borderColor: s.accent } : { borderColor: s.accent }}
                onClick={() => setSanctuary(s)}
              >
                <span className="khmer">{s.khmer}</span> {s.english}
              </button>
            ))}
          </div>

          <div className="med-opts">
            <div className="med-opt">
              <span className="med-opt-label">Breath</span>
              <div className="med-seg-row">
                {BREATH_PATTERNS.map((b) => (
                  <button key={b.id} className={b.id === pattern.id ? "med-seg on" : "med-seg"} onClick={() => setPattern(b)}>
                    {b.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="med-opt">
              <span className="med-opt-label">Length</span>
              <div className="med-seg-row">
                {DURATIONS.map((d) => (
                  <button key={d} className={d === minutes ? "med-seg on" : "med-seg"} onClick={() => setMinutes(d)}>
                    {d} min
                  </button>
                ))}
              </div>
            </div>
            <div className="med-opt">
              <span className="med-opt-label">Chant · សូត្រ</span>
              <button className={chant ? "med-seg on" : "med-seg"} onClick={toggleChant}>
                {chant ? "On 🔔" : "Off"}
              </button>
            </div>
          </div>

          <button className="med-begin" style={{ background: sanctuary.accent }} onClick={begin}>
            Begin sitting
          </button>
          {earned && <p className="med-note">You've earned a moment of calm before — welcome back.</p>}
        </div>
      )}

      {phase === "active" && (
        <>
          <div className="med-guide">
            <div className="med-ring" ref={ringRef} style={{ borderColor: sanctuary.accent }} />
            <div className="med-phase" ref={labelRef}>Breathe in</div>
          </div>
          <div className="med-active-bar">
            <span className="med-clock">{mm}:{ss.toString().padStart(2, "0")}</span>
            <button className={chant ? "med-seg on" : "med-seg"} onClick={toggleChant}>
              {chant ? "🔔 Chant on" : "🔔 Chant"}
            </button>
            <button className="med-end" onClick={() => end(false)}>End</button>
          </div>
          {chant && <SutraCard i={sutraI} />}
        </>
      )}

      {phase === "done" && (
        <div className="med-done">
          <div className="med-done-emoji">🕉️</div>
          <h2>Rest complete</h2>
          <p>May you carry this stillness with you.</p>
          <p className="med-note">
            {earned ? "A “moment of calm” is noted in your Heritage Passport." : ""}
          </p>
          <div className="med-done-actions">
            <button className="med-begin" style={{ background: sanctuary.accent }} onClick={() => setPhase("setup")}>
              Sit again
            </button>
            <button className="med-end" onClick={() => { sound.stop(); onBackToMap(); }}>Back to map</button>
          </div>
        </div>
      )}
    </div>
  );
}

function SutraCard({ i }: { i: number }) {
  const s = SUTRAS[i];
  return (
    <div className="med-sutra">
      <div className="med-sutra-title">{s.title}</div>
      <div className="med-sutra-pali">{s.pali}</div>
      <div className="med-sutra-khmer khmer">{s.khmer}</div>
      <div className="med-sutra-en">{s.english}</div>
      <div className="med-sutra-note">Traditional Theravada verse · shared as heritage, to be verified with Cambodian monks.</div>
    </div>
  );
}

/* ---------- 3D sanctuaries ---------- */

function MedScene({
  sanctuary,
  breath,
  active,
}: {
  sanctuary: Sanctuary;
  breath: React.MutableRefObject<{ scale: number; phase: string }>;
  active: boolean;
}) {
  return (
    <>
      <ambientLight intensity={0.7} />
      <hemisphereLight args={[sanctuary.sky, "#20281f", 0.6]} />
      <directionalLight position={[4, 8, 4]} intensity={0.8} color={sanctuary.sky} />
      {sanctuary.scene === "forest" && <ForestScene accent={sanctuary.accent} />}
      {sanctuary.scene === "temple" && <TempleScene />}
      {sanctuary.scene === "mountain" && <MountainScene />}
      {sanctuary.scene === "river" && <RiverScene accent={sanctuary.accent} />}
      {active && <BreathOrb breath={breath} color={sanctuary.accent} />}
    </>
  );
}

/** A soft glowing orb at eye level that breathes with the guide. */
function BreathOrb({ breath, color }: { breath: React.MutableRefObject<{ scale: number }>; color: string }) {
  const ref = useRef<Mesh>(null);
  useFrame(() => {
    if (ref.current) {
      const s = 0.5 + breath.current.scale * 0.7;
      ref.current.scale.setScalar(s);
    }
  });
  return (
    <mesh ref={ref} position={[0, 1.4, 0]}>
      <sphereGeometry args={[0.4, 24, 24]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.6} transparent opacity={0.55} />
    </mesh>
  );
}

function Ground({ color }: { color: string }) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
      <circleGeometry args={[30, 48]} />
      <meshStandardMaterial color={color} roughness={1} />
    </mesh>
  );
}

function Tree({ position, h = 3, foliage = "#3f6a34" }: { position: [number, number, number]; h?: number; foliage?: string }) {
  return (
    <group position={position}>
      <mesh position={[0, h / 2, 0]}>
        <cylinderGeometry args={[0.1, 0.16, h, 6]} />
        <meshStandardMaterial color="#5b4630" roughness={1} />
      </mesh>
      {[0, 1, 2].map((i) => (
        <mesh key={i} position={[0, h - 0.2 + i * 0.5, 0]}>
          <sphereGeometry args={[0.9 - i * 0.18, 10, 10]} />
          <meshStandardMaterial color={foliage} roughness={1} />
        </mesh>
      ))}
    </group>
  );
}

function Fireflies({ count = 16, color = "#ffe08a" }: { count?: number; color?: string }) {
  const ref = useRef<Group>(null);
  const seeds = useMemo(
    () => Array.from({ length: count }, (_, i) => ({
      x: Math.sin(i * 12.9) * 6, y: 0.6 + ((i * 7) % 10) / 5, z: -2 - ((i * 5) % 8), r: (i % 7) * 0.9,
    })),
    [count],
  );
  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime;
    ref.current.children.forEach((c, i) => {
      c.position.y = seeds[i].y + Math.sin(t * 0.6 + seeds[i].r) * 0.35;
      c.position.x = seeds[i].x + Math.cos(t * 0.3 + seeds[i].r) * 0.5;
    });
  });
  return (
    <group ref={ref}>
      {seeds.map((s, i) => (
        <mesh key={i} position={[s.x, s.y, s.z]}>
          <sphereGeometry args={[0.05, 8, 8]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.4} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}

function ForestScene({ accent }: { accent: string }) {
  const trees = useMemo(
    () => Array.from({ length: 14 }, (_, i) => ({
      x: Math.sin(i * 2.3) * (4 + (i % 5)), z: -3 - ((i * 3) % 10), h: 2.4 + (i % 4) * 0.7,
    })),
    [],
  );
  return (
    <group>
      <Ground color="#2c3a26" />
      {trees.map((t, i) => (
        <Tree key={i} position={[t.x, 0, t.z]} h={t.h} foliage={i % 2 ? "#3f6a34" : "#4c7a3a"} />
      ))}
      <Fireflies color={accent} />
    </group>
  );
}

function Prasat({ position, h = 3 }: { position: [number, number, number]; h?: number }) {
  const tiers = 4;
  return (
    <group position={position}>
      <mesh position={[0, 0.4, 0]}>
        <boxGeometry args={[1.6, 0.8, 1.6]} />
        <meshStandardMaterial color="#6b6152" roughness={1} />
      </mesh>
      {Array.from({ length: tiers }, (_, i) => {
        const w = 1.2 - i * 0.22;
        return (
          <mesh key={i} position={[0, 0.9 + (i * h) / tiers, 0]}>
            <boxGeometry args={[w, h / tiers, w]} />
            <meshStandardMaterial color="#726858" roughness={1} />
          </mesh>
        );
      })}
      <mesh position={[0, 0.9 + h + 0.25, 0]}>
        <coneGeometry args={[0.28, 0.7, 8]} />
        <meshStandardMaterial color="#7c7160" roughness={1} />
      </mesh>
    </group>
  );
}

function TempleScene() {
  return (
    <group>
      <Ground color="#b8a67e" />
      <Prasat position={[0, 0, -6]} h={3.6} />
      <Prasat position={[-2.6, 0, -7]} h={2.4} />
      <Prasat position={[2.6, 0, -7]} h={2.4} />
      {/* soft dawn sun */}
      <mesh position={[3, 3.4, -10]}>
        <sphereGeometry args={[1.1, 24, 24]} />
        <meshStandardMaterial color="#ffe9c2" emissive="#ffdca0" emissiveIntensity={0.9} toneMapped={false} />
      </mesh>
    </group>
  );
}

function MountainScene() {
  const ridges = [
    { z: -8, w: 26, h: 3.2, c: "#8aa2b3" },
    { z: -12, w: 34, h: 4.4, c: "#7690a3" },
    { z: -16, w: 44, h: 6, c: "#64809a" },
  ];
  return (
    <group>
      <Ground color="#9fb0bc" />
      {ridges.map((r, i) => (
        <mesh key={i} position={[0, r.h / 2 - 0.5, r.z]}>
          <coneGeometry args={[r.w / 2, r.h, 3]} />
          <meshStandardMaterial color={r.c} roughness={1} />
        </mesh>
      ))}
      {/* drifting cloud sea */}
      {Array.from({ length: 5 }, (_, i) => (
        <mesh key={i} position={[(i - 2) * 4, 0.2, -6 - i]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[3, 20]} />
          <meshStandardMaterial color="#eef4f8" transparent opacity={0.4} />
        </mesh>
      ))}
    </group>
  );
}

function RiverScene({ accent }: { accent: string }) {
  const water = useRef<Mesh>(null);
  useFrame((state) => {
    if (water.current) water.current.position.y = -0.02 + Math.sin(state.clock.elapsedTime * 0.6) * 0.02;
  });
  return (
    <group>
      <Ground color="#7a5f52" />
      <mesh ref={water} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, -4]}>
        <planeGeometry args={[40, 26]} />
        <meshStandardMaterial color="#5b6f86" transparent opacity={0.75} roughness={0.25} metalness={0.2} />
      </mesh>
      {/* reeds along the near bank */}
      {Array.from({ length: 12 }, (_, i) => (
        <mesh key={i} position={[(i - 6) * 0.9 + Math.sin(i) * 0.3, 0.5, 1.4]} rotation={[0, 0, Math.sin(i) * 0.12]}>
          <cylinderGeometry args={[0.02, 0.03, 1 + (i % 3) * 0.3, 5]} />
          <meshStandardMaterial color="#5a7a45" roughness={1} />
        </mesh>
      ))}
      {/* dusk sun low on the water */}
      <mesh position={[0, 1.2, -14]}>
        <sphereGeometry args={[1.3, 24, 24]} />
        <meshStandardMaterial color="#f2b48a" emissive="#e88f6a" emissiveIntensity={0.9} toneMapped={false} />
      </mesh>
      <Fireflies count={10} color={accent} />
    </group>
  );
}

function Nav() {
  const inXR = useXR((s) => s.session != null);
  if (inXR) return null;
  return (
    <OrbitControls
      enablePan={false}
      minDistance={2}
      maxDistance={10}
      maxPolarAngle={Math.PI / 1.9}
      enableDamping
      dampingFactor={0.06}
      target={[0, 1.2, 0]}
      autoRotate
      autoRotateSpeed={0.15}
    />
  );
}
