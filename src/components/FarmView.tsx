import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { createXRStore, XR, XROrigin, useXR } from "@react-three/xr";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Object3D, type InstancedMesh, type Group } from "three";
import { FARM_STAGES, FARM_CREDENTIAL, type Field } from "../farm";
import { claimCredential, getIdentity, earnedAchievements } from "../lib/identity";

/**
 * The Virtual Farm — a guided walk through the Khmer rice year. The paddy in the
 * scene changes with each stage (bare → ploughed → seedbed → transplanted →
 * growing → ripe → harvested); do each step to move the cycle on. Finish the
 * whole cycle to earn a Heritage Passport credential. Explorable in 3D and VR.
 */
const TAPS = 4; // action taps to complete a stage

export function FarmView({ onBackToMap }: { onBackToMap: () => void }) {
  const store = useMemo(() => createXRStore({ emulate: false }), []);
  const [vrSupported, setVrSupported] = useState(false);
  const [index, setIndex] = useState(0);
  const [prog, setProg] = useState(0);
  const [done, setDone] = useState<Set<string>>(new Set());
  const [pulse, setPulse] = useState(0);
  const [claimed, setClaimed] = useState(false);
  const [alreadyDone, setAlreadyDone] = useState(false);

  const stage = FARM_STAGES[index];
  const allDone = done.size === FARM_STAGES.length;
  const stageDone = done.has(stage.id);

  useEffect(() => {
    const xr = (navigator as Navigator & { xr?: { isSessionSupported(m: string): Promise<boolean> } }).xr;
    xr?.isSessionSupported("immersive-vr").then(setVrSupported).catch(() => setVrSupported(false));
  }, []);

  useEffect(() => {
    let live = true;
    (async () => {
      const set = await earnedAchievements(await getIdentity(false));
      if (live) setAlreadyDone(set.has(FARM_CREDENTIAL));
    })();
    return () => {
      live = false;
    };
  }, []);

  // Claim the credential once the whole cycle is walked.
  useEffect(() => {
    if (allDone && !claimed) {
      setClaimed(true);
      claimCredential(FARM_CREDENTIAL, `cycle:${FARM_STAGES.length}`).then((ok) => {
        if (ok) setAlreadyDone(true);
      });
    }
  }, [allDone, claimed]);

  const act = () => {
    setPulse((p) => p + 1);
    setProg((p) => {
      const n = p + 1;
      if (n >= TAPS) {
        setDone((d) => new Set(d).add(stage.id));
        return TAPS;
      }
      return n;
    });
  };

  const goto = (i: number) => {
    setIndex(i);
    setProg(done.has(FARM_STAGES[i].id) ? TAPS : 0);
  };
  const next = () => index < FARM_STAGES.length - 1 && goto(index + 1);

  return (
    <div className="farm">
      <Canvas dpr={[1, 2]} camera={{ position: [0, 3.1, 6.6], fov: 45 }} gl={{ antialias: true }} shadows>
        <XR store={store}>
          <color attach="background" args={["#a9d0e8"]} />
          <fog attach="fog" args={["#a9d0e8", 16, 34]} />
          <ambientLight intensity={0.9} />
          <directionalLight position={[5, 9, 4]} intensity={1.15} castShadow shadow-mapSize={[1024, 1024]} />
          <hemisphereLight args={["#cfe7ff", "#6a5a34", 0.5]} />

          <Paddy field={stage.field} />
          <RicePaddy field={stage.field} pulse={pulse} />
          {stage.id === "plough" && <Buffalo pulse={pulse} />}
          {(stage.id === "transplant" || stage.id === "harvest" || stage.id === "seedbed") && (
            <Person position={[1.6, 0, 1.9]} rotation={-0.7} color={stage.color} />
          )}

          {/* Setting: a stilt house and sugar palms in the distance. */}
          <StiltHouse position={[-3.4, 0, -2.6]} />
          <Palm position={[3.5, 0, -2.2]} h={3.2} />
          <Palm position={[4.2, 0, -0.6]} h={2.6} />

          <XROrigin position={[0, 1.1, 5]} />
          <Nav />
        </XR>
      </Canvas>

      {/* ---- HUD ---- */}
      <div className="cls-top">
        <button className="backbtn" onClick={onBackToMap}>
          ← Map
        </button>
        <span className="cls-title">🌾 Virtual Farm · Rice Cycle</span>
        {vrSupported && (
          <button className="vr-btn cls-vr" onClick={() => store.enterVR()}>
            🥽 VR
          </button>
        )}
      </div>

      {/* Stage stepper */}
      <div className="farm-steps">
        {FARM_STAGES.map((s, i) => (
          <button
            key={s.id}
            className={`farm-step${i === index ? " on" : ""}${done.has(s.id) ? " done" : ""}`}
            style={i === index ? { borderColor: s.color } : undefined}
            onClick={() => goto(i)}
            aria-label={s.english}
            title={s.english}
          >
            <span className="farm-step-emoji">{s.emoji}</span>
            {done.has(s.id) && <span className="farm-step-tick">✓</span>}
          </button>
        ))}
      </div>

      {/* Stage panel */}
      <div className="farm-info" style={{ borderColor: stage.color }}>
        <div className="farm-info-head">
          <span className="farm-emoji">{stage.emoji}</span>
          <div>
            <h2>
              <span className="khmer">{stage.khmer}</span> {stage.name}
            </h2>
            <span className="farm-en">{stage.english}</span>
          </div>
          <span className="farm-count">
            {index + 1}/{FARM_STAGES.length}
          </span>
        </div>
        <div className="farm-tool">
          🛠️ <span className="khmer">{stage.tool.khmer}</span> · {stage.tool.roman} —{" "}
          <span className="farm-tool-en">{stage.tool.english}</span>
        </div>
        <p className="farm-fact">{stage.fact}</p>

        {stageDone ? (
          <div className="farm-donerow">
            <span className="farm-check" style={{ color: stage.color }}>
              ✓ {stage.action} — done
            </span>
            {!allDone && index < FARM_STAGES.length - 1 && (
              <button className="farm-next" style={{ background: stage.color }} onClick={next}>
                Next step →
              </button>
            )}
          </div>
        ) : (
          <div className="farm-actionrow">
            <button className="farm-do" style={{ background: stage.color }} onClick={act}>
              {stage.action} 👐
            </button>
            <div className="farm-prog">
              <span className="farm-prog-fill" style={{ width: `${(prog / TAPS) * 100}%`, background: stage.color }} />
            </div>
          </div>
        )}
      </div>

      {allDone && (
        <div className="farm-win" role="dialog">
          <div className="farm-win-card">
            <div className="farm-win-emoji">🌾🎉</div>
            <h2>The harvest is in!</h2>
            <p>
              You walked the whole rice cycle — from the buffalo's first furrow to the granary. This is the
              work that feeds Cambodia and sets the rhythm of the year.
            </p>
            <p className="farm-win-sub">
              {alreadyDone
                ? "A Virtual Farm credential is saved in your Heritage Passport."
                : "Saving your credential…"}
            </p>
            <button className="farm-win-btn" onClick={onBackToMap}>
              Back to the map
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- 3D scene ---------- */

/** The paddy: dirt ground, a water field, and low earthen dikes. */
function Paddy({ field }: { field: Field }) {
  // Dry once ploughed-for-harvest; flooded while growing.
  const flooded = field === "ploughed" || field === "seedbed" || field === "transplanted" || field === "growing";
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[16, 48]} />
        <meshStandardMaterial color="#7a5c34" roughness={1} />
      </mesh>
      {/* paddy bed */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]} receiveShadow>
        <planeGeometry args={[5.2, 5.2]} />
        <meshStandardMaterial color={flooded ? "#6b7f52" : "#8a6a3a"} roughness={0.9} />
      </mesh>
      {/* thin water sheet when flooded */}
      {flooded && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
          <planeGeometry args={[5, 5]} />
          <meshStandardMaterial color="#5a86a8" transparent opacity={0.55} roughness={0.3} metalness={0.1} />
        </mesh>
      )}
      {/* dikes around and across the paddy */}
      {[
        [0, 2.6, 5.4, 0.24],
        [0, -2.6, 5.4, 0.24],
        [2.6, 0, 0.24, 5.4],
        [-2.6, 0, 0.24, 5.4],
        [0, 0, 5.4, 0.14],
      ].map(([x, z, w, d], i) => (
        <mesh key={i} position={[x, 0.09, z]} castShadow>
          <boxGeometry args={[w, 0.18, d]} />
          <meshStandardMaterial color="#6b4f2c" roughness={1} />
        </mesh>
      ))}
    </group>
  );
}

const FIELD_LOOK: Record<Field, { show: boolean; height: number; color: string; young?: boolean }> = {
  bare: { show: false, height: 0, color: "#4c8a3f" },
  ploughed: { show: false, height: 0, color: "#4c8a3f" },
  seedbed: { show: true, height: 0.28, color: "#6fbf4a", young: true },
  transplanted: { show: true, height: 0.42, color: "#5fb040" },
  growing: { show: true, height: 0.9, color: "#4c9a3a" },
  ripe: { show: true, height: 1.25, color: "#d8b23a" },
  harvested: { show: true, height: 0.2, color: "#b39355" },
};

/** Rice stalks as one InstancedMesh — hundreds of stalks, one draw call. */
function RicePaddy({ field, pulse }: { field: Field; pulse: number }) {
  const ref = useRef<InstancedMesh>(null);
  const dummy = useMemo(() => new Object3D(), []);
  const COLS = 22;
  const look = FIELD_LOOK[field];

  // Base grid positions within the paddy (seedbed uses only a corner cluster).
  const cells = useMemo(() => {
    const out: [number, number][] = [];
    for (let r = 0; r < COLS; r++) {
      for (let c = 0; c < COLS; c++) {
        const x = (c / (COLS - 1) - 0.5) * 4.4;
        const z = (r / (COLS - 1) - 0.5) * 4.4;
        out.push([x, z]);
      }
    }
    return out;
  }, []);

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    if (!look.show) {
      mesh.count = 0;
      mesh.instanceMatrix.needsUpdate = true;
      return;
    }
    const seed = field === "seedbed";
    let i = 0;
    cells.forEach(([x, z], idx) => {
      // Seedbed: only a dense cluster in one corner.
      if (seed && !(x < -0.9 && z < -0.9)) return;
      const jx = (((idx * 37) % 20) / 20 - 0.5) * 0.14;
      const jz = (((idx * 53) % 20) / 20 - 0.5) * 0.14;
      const h = look.height * (0.82 + ((idx * 13) % 10) / 28);
      dummy.position.set(x + jx, h / 2 + 0.05, z + jz);
      dummy.scale.set(1, h, 1);
      dummy.rotation.set(0, (idx % 7) * 0.4, 0);
      dummy.updateMatrix();
      mesh.setMatrixAt(i++, dummy.matrix);
    });
    mesh.count = i;
    mesh.instanceMatrix.needsUpdate = true;
  }, [field, cells, dummy, look, pulse]);

  // Gentle wind sway of the whole field.
  useFrame((state) => {
    if (ref.current) ref.current.rotation.z = Math.sin(state.clock.elapsedTime * 1.4) * 0.03;
  });

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, COLS * COLS]} castShadow>
      <coneGeometry args={[0.05, 1, 5]} />
      <meshStandardMaterial color={look.color} roughness={0.9} />
    </instancedMesh>
  );
}

/** A simple water buffalo pulling a plough. */
function Buffalo({ pulse }: { pulse: number }) {
  const ref = useRef<Group>(null);
  const lurch = useRef(0);
  useEffect(() => {
    lurch.current = 0.35;
  }, [pulse]);
  useFrame((state, dt) => {
    if (!ref.current) return;
    lurch.current = Math.max(0, lurch.current - dt);
    ref.current.position.x = -1.6 + lurch.current * 0.6;
    ref.current.position.y = Math.sin(state.clock.elapsedTime * 2) * 0.02;
  });
  return (
    <group ref={ref} position={[-1.6, 0, 0.6]} rotation={[0, -0.3, 0]}>
      {/* body */}
      <mesh position={[0, 0.62, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <capsuleGeometry args={[0.34, 0.9, 6, 10]} />
        <meshStandardMaterial color="#4a4a52" roughness={0.85} />
      </mesh>
      {/* legs */}
      {[[-0.4, 0.3], [-0.4, -0.3], [0.4, 0.3], [0.4, -0.3]].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.22, z]} castShadow>
          <cylinderGeometry args={[0.07, 0.07, 0.44, 6]} />
          <meshStandardMaterial color="#3c3c44" />
        </mesh>
      ))}
      {/* head + horns */}
      <group position={[0.7, 0.72, 0]}>
        <mesh castShadow>
          <boxGeometry args={[0.34, 0.28, 0.3]} />
          <meshStandardMaterial color="#43434c" roughness={0.85} />
        </mesh>
        {[-1, 1].map((s) => (
          <mesh key={s} position={[0.02, 0.18, s * 0.16]} rotation={[0, 0, 0.5]} castShadow>
            <torusGeometry args={[0.16, 0.028, 6, 10, Math.PI]} />
            <meshStandardMaterial color="#d8d2c4" />
          </mesh>
        ))}
      </group>
      {/* plough beam trailing behind */}
      <mesh position={[-0.7, 0.3, 0]} rotation={[0, 0, 0.5]} castShadow>
        <cylinderGeometry args={[0.03, 0.03, 1.1, 6]} />
        <meshStandardMaterial color="#6b4a2a" />
      </mesh>
    </group>
  );
}

/** A simple farmer figure. */
function Person({
  position,
  rotation = 0,
  color,
}: {
  position: [number, number, number];
  rotation?: number;
  color: string;
}) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh position={[0, 0.28, 0]} castShadow>
        <cylinderGeometry args={[0.17, 0.2, 0.52, 10]} />
        <meshStandardMaterial color={color} roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.66, 0]} castShadow>
        <capsuleGeometry args={[0.12, 0.24, 4, 8]} />
        <meshStandardMaterial color="#7c5b3a" roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.95, 0]} castShadow>
        <sphereGeometry args={[0.13, 14, 14]} />
        <meshStandardMaterial color="#c98a5a" roughness={0.7} />
      </mesh>
      {/* conical farmer's hat */}
      <mesh position={[0, 1.06, 0]} castShadow>
        <coneGeometry args={[0.22, 0.16, 16]} />
        <meshStandardMaterial color="#c9a24a" roughness={0.85} />
      </mesh>
    </group>
  );
}

/** A raised wooden stilt house (ផ្ទះខ្មែរ) for the setting. */
function StiltHouse({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {[[-0.5, -0.4], [0.5, -0.4], [-0.5, 0.4], [0.5, 0.4]].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.5, z]} castShadow>
          <cylinderGeometry args={[0.06, 0.06, 1, 6]} />
          <meshStandardMaterial color="#6b4a2a" />
        </mesh>
      ))}
      <mesh position={[0, 1.1, 0]} castShadow>
        <boxGeometry args={[1.4, 0.5, 1.1]} />
        <meshStandardMaterial color="#8a6a3a" roughness={0.9} />
      </mesh>
      <mesh position={[0, 1.55, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
        <coneGeometry args={[1.15, 0.6, 4]} />
        <meshStandardMaterial color="#9c3f2e" roughness={0.9} />
      </mesh>
    </group>
  );
}

/** A sugar palm (ត្នោត), Cambodia's national tree. */
function Palm({ position, h = 3 }: { position: [number, number, number]; h?: number }) {
  return (
    <group position={position}>
      <mesh position={[0, h / 2, 0]} castShadow>
        <cylinderGeometry args={[0.09, 0.13, h, 7]} />
        <meshStandardMaterial color="#7c6242" roughness={1} />
      </mesh>
      {Array.from({ length: 7 }, (_, i) => {
        const a = (i / 7) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.cos(a) * 0.4, h, Math.sin(a) * 0.4]} rotation={[0.5, -a, 0]} castShadow>
            <boxGeometry args={[0.1, 0.03, 1.1]} />
            <meshStandardMaterial color="#3f7a34" roughness={0.9} />
          </mesh>
        );
      })}
    </group>
  );
}

function Nav() {
  const inXR = useXR((s) => s.session != null);
  if (inXR) return null;
  return (
    <OrbitControls
      makeDefault
      enablePan={false}
      minDistance={3.5}
      maxDistance={13}
      maxPolarAngle={Math.PI / 2.15}
      enableDamping
      dampingFactor={0.08}
      target={[0, 0.4, 0]}
    />
  );
}
