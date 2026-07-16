import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { createXRStore, XR, XROrigin, useXR } from "@react-three/xr";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Object3D, type InstancedMesh, type Group } from "three";
import { FARM_STAGES, FARM_CREDENTIAL } from "../farm";
import { claimCredential, getIdentity, earnedAchievements } from "../lib/identity";

/**
 * The Virtual Farm — the Khmer rice year, two ways:
 *
 *  • Learn — a guided walk through the growing cycle (ploughing → seedbed →
 *    transplanting → tending water → harvest → threshing → granary), earning a
 *    Heritage Passport credential.
 *
 *  • My Farm (the Living Farm) — a farmer photographs their real paddy over the
 *    season and tags each photo with its stage; the virtual paddy then *grows to
 *    match*, and anyone can scrub the timeline to watch a real field come to
 *    life. This offline prototype keeps the diary on the device (localStorage);
 *    the concept and the path to a shared, consented photo commons are written
 *    up in docs/LIVING_FARM.md.
 *
 * Explorable in 3D and VR. Everything is procedural — nothing to download.
 */
const TAPS = 4; // action taps to complete a learn stage
const DIARY_KEY = "camboverse.farm.diary.v1";

interface CheckIn {
  id: string;
  date: string; // YYYY-MM-DD
  stageId: string;
  growth: number;
  photo: string; // downscaled data URL
  note?: string;
}

type Mode = "learn" | "diary";

export function FarmView({ onBackToMap }: { onBackToMap: () => void }) {
  const store = useMemo(() => createXRStore({ emulate: false }), []);
  const [vrSupported, setVrSupported] = useState(false);
  const [mode, setMode] = useState<Mode>("learn");

  // Learn-mode journey.
  const [index, setIndex] = useState(0);
  const [prog, setProg] = useState(0);
  const [done, setDone] = useState<Set<string>>(new Set());
  const [pulse, setPulse] = useState(0);
  const [claimed, setClaimed] = useState(false);
  const [alreadyDone, setAlreadyDone] = useState(false);

  // Diary (Living Farm) — persisted on the device.
  const [checks, setChecks] = useState<CheckIn[]>(() => loadChecks());
  const [sel, setSel] = useState(0);
  const [adding, setAdding] = useState<string | null>(null); // pending photo data URL
  const fileRef = useRef<HTMLInputElement>(null);

  const stage = FARM_STAGES[index];
  const allDone = done.size === FARM_STAGES.length;
  const stageDone = done.has(stage.id);

  // Growth that drives the 3D paddy depends on the mode.
  const selCheck = checks[Math.min(sel, checks.length - 1)];
  const growth = mode === "learn" ? stage.growth : (selCheck?.growth ?? -1);

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

  useEffect(() => {
    if (allDone && !claimed) {
      setClaimed(true);
      claimCredential(FARM_CREDENTIAL, `cycle:${FARM_STAGES.length}`).then((ok) => {
        if (ok) setAlreadyDone(true);
      });
    }
  }, [allDone, claimed]);

  useEffect(() => setSel(Math.max(0, checks.length - 1)), [checks.length]);

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

  const onPickFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-picking the same file
    if (!file) return;
    try {
      setAdding(await downscaleImage(file));
    } catch {
      /* ignore an unreadable image */
    }
  };
  const saveCheck = (stageId: string, note: string) => {
    const st = FARM_STAGES.find((s) => s.id === stageId)!;
    const c: CheckIn = {
      id: `${Date.now()}`,
      date: new Date().toISOString().slice(0, 10),
      stageId,
      growth: st.growth,
      photo: adding!,
      note: note.trim() || undefined,
    };
    const nextChecks = [...checks, c];
    setChecks(nextChecks);
    saveChecks(nextChecks);
    setAdding(null);
    setMode("diary");
  };
  const removeCheck = (id: string) => {
    const nextChecks = checks.filter((c) => c.id !== id);
    setChecks(nextChecks);
    saveChecks(nextChecks);
  };

  return (
    <div className="farm">
      <Canvas dpr={[1, 2]} camera={{ position: [0, 3.1, 6.6], fov: 45 }} gl={{ antialias: true }} shadows>
        <XR store={store}>
          <color attach="background" args={["#a9d0e8"]} />
          <fog attach="fog" args={["#a9d0e8", 16, 34]} />
          <ambientLight intensity={0.9} />
          <directionalLight position={[5, 9, 4]} intensity={1.15} castShadow shadow-mapSize={[1024, 1024]} />
          <hemisphereLight args={["#cfe7ff", "#6a5a34", 0.5]} />
          <FarmScene growth={growth} pulse={pulse} accent={mode === "learn" ? stage.color : "#4c8a3f"} />
          <XROrigin position={[0, 1.1, 5]} />
          <Nav />
        </XR>
      </Canvas>

      {/* ---- HUD ---- */}
      <div className="cls-top">
        <button className="backbtn" onClick={onBackToMap}>
          ← Map
        </button>
        <span className="cls-title">🌾 Virtual Farm</span>
        {vrSupported && (
          <button className="vr-btn cls-vr" onClick={() => store.enterVR()}>
            🥽 VR
          </button>
        )}
      </div>

      <div className="farm-modes">
        <button className={mode === "learn" ? "farm-seg on" : "farm-seg"} onClick={() => setMode("learn")}>
          📖 Learn the cycle
        </button>
        <button className={mode === "diary" ? "farm-seg on" : "farm-seg"} onClick={() => setMode("diary")}>
          🌱 My Farm{checks.length ? ` · ${checks.length}` : ""}
        </button>
      </div>

      {mode === "learn" ? (
        <>
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
                  You walked the whole rice cycle — from the buffalo's first furrow to the granary. This is
                  the work that feeds Cambodia and sets the rhythm of the year.
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
        </>
      ) : (
        <DiaryPanel
          checks={checks}
          sel={Math.min(sel, checks.length - 1)}
          onScrub={setSel}
          onAdd={() => fileRef.current?.click()}
          onRemove={removeCheck}
        />
      )}

      {/* Hidden picker — uses the device camera on mobile. */}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: "none" }}
        onChange={onPickFile}
      />

      {adding && <AddCheckModal photo={adding} onSave={saveCheck} onCancel={() => setAdding(null)} />}
    </div>
  );
}

/* ---------- Living-Farm diary UI ---------- */

function DiaryPanel({
  checks,
  sel,
  onScrub,
  onAdd,
  onRemove,
}: {
  checks: CheckIn[];
  sel: number;
  onScrub: (i: number) => void;
  onAdd: () => void;
  onRemove: (id: string) => void;
}) {
  if (checks.length === 0) {
    return (
      <div className="farm-diary farm-diary-empty">
        <p className="farm-diary-lead">
          <b>Your Living Farm.</b> Photograph your real paddy through the season and tag each photo with its
          stage — the virtual field grows to match, and you can watch the whole season play back.
        </p>
        <button className="farm-add" onClick={onAdd}>
          📷 Add the first photo
        </button>
        <p className="farm-diary-note">Kept on this device for now — see docs/LIVING_FARM.md for the plan to share it.</p>
      </div>
    );
  }
  const c = checks[sel];
  const st = FARM_STAGES.find((s) => s.id === c.stageId);
  return (
    <div className="farm-diary">
      <div className="farm-diary-top">
        <img className="farm-photo" src={c.photo} alt={`Paddy on ${c.date}`} />
        <div className="farm-diary-meta">
          <div className="farm-diary-date">
            {st?.emoji} {c.date}
          </div>
          <div className="farm-diary-stage" style={{ color: st?.color }}>
            <span className="khmer">{st?.khmer}</span> · {st?.english}
          </div>
          {c.note && <div className="farm-diary-noteline">“{c.note}”</div>}
          <button className="farm-remove" onClick={() => onRemove(c.id)}>
            Remove
          </button>
        </div>
      </div>

      {checks.length > 1 && (
        <div className="farm-scrub">
          <span className="farm-scrub-cap">
            {sel + 1} / {checks.length}
          </span>
          <input
            type="range"
            min={0}
            max={checks.length - 1}
            value={sel}
            onChange={(e) => onScrub(Number(e.target.value))}
            aria-label="Scrub the season"
          />
        </div>
      )}

      <button className="farm-add" onClick={onAdd}>
        📷 Add a photo
      </button>
    </div>
  );
}

function AddCheckModal({
  photo,
  onSave,
  onCancel,
}: {
  photo: string;
  onSave: (stageId: string, note: string) => void;
  onCancel: () => void;
}) {
  const [stageId, setStageId] = useState("transplant"); // a sensible mid-cycle default
  const [note, setNote] = useState("");
  return (
    <div className="farm-modal" onClick={onCancel}>
      <div className="farm-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="farm-modal-top">
          <span className="farm-modal-title">Tag this photo</span>
          <button className="cls-close" onClick={onCancel} aria-label="Close">
            ✕
          </button>
        </div>
        <img className="farm-modal-photo" src={photo} alt="Your paddy" />
        <p className="farm-modal-q">Which stage is your paddy at?</p>
        <div className="farm-modal-stages">
          {FARM_STAGES.map((s) => (
            <button
              key={s.id}
              className={s.id === stageId ? "farm-chip on" : "farm-chip"}
              style={s.id === stageId ? { background: s.color, borderColor: s.color } : { borderColor: s.color }}
              onClick={() => setStageId(s.id)}
            >
              {s.emoji} {s.english}
            </button>
          ))}
        </div>
        <input
          className="farm-modal-note"
          placeholder="A note (optional) — e.g. first rain, transplanting day…"
          value={note}
          maxLength={80}
          onChange={(e) => setNote(e.target.value)}
        />
        <button className="farm-modal-save" onClick={() => onSave(stageId, note)}>
          Save to my farm
        </button>
      </div>
    </div>
  );
}

/* ---------- storage + image helpers ---------- */

function loadChecks(): CheckIn[] {
  try {
    const raw = localStorage.getItem(DIARY_KEY);
    return raw ? (JSON.parse(raw) as CheckIn[]) : [];
  } catch {
    return [];
  }
}
function saveChecks(checks: CheckIn[]) {
  try {
    localStorage.setItem(DIARY_KEY, JSON.stringify(checks));
  } catch {
    /* quota / private mode — the diary just won't persist */
  }
}

/** Downscale a photo on-device before storing — small enough for a $150 phone
 * and, later, a 4G upload. */
function downscaleImage(file: File, max = 1024, quality = 0.72): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const w = Math.max(1, Math.round(img.width * scale));
      const h = Math.max(1, Math.round(img.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        URL.revokeObjectURL(url);
        reject(new Error("no 2d context"));
        return;
      }
      ctx.drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("image load failed"));
    };
    img.src = url;
  });
}

/* ---------- 3D scene (growth-driven) ---------- */

function FarmScene({ growth, pulse, accent }: { growth: number; pulse: number; accent: string }) {
  return (
    <>
      <Paddy flooded={growth >= 0 && growth < 0.75} />
      <RicePaddy growth={growth} pulse={pulse} />
      {growth >= 0 && growth < 0.06 && <Buffalo pulse={pulse} />}
      {growth >= 0.1 && growth <= 0.9 && <Person position={[1.6, 0, 1.9]} rotation={-0.7} color={accent} />}
      <StiltHouse position={[-3.4, 0, -2.6]} />
      <Palm position={[3.5, 0, -2.2]} h={3.2} />
      <Palm position={[4.2, 0, -0.6]} h={2.6} />
    </>
  );
}

/** The paddy: dirt ground, a water field (when flooded), and earthen dikes. */
function Paddy({ flooded }: { flooded: boolean }) {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[16, 48]} />
        <meshStandardMaterial color="#7a5c34" roughness={1} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]} receiveShadow>
        <planeGeometry args={[5.2, 5.2]} />
        <meshStandardMaterial color={flooded ? "#6b7f52" : "#8a6a3a"} roughness={0.9} />
      </mesh>
      {flooded && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
          <planeGeometry args={[5, 5]} />
          <meshStandardMaterial color="#5a86a8" transparent opacity={0.55} roughness={0.3} metalness={0.1} />
        </mesh>
      )}
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

function hex(n: number) {
  return Math.max(0, Math.min(255, Math.round(n)));
}
function lerpHex(a: string, b: string, t: number): string {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  const p = pa.map((v, i) => hex(v + (pb[i] - v) * t));
  return `#${p.map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

/** Rice look at any point on the growth curve (0 = bare → 1 = harvested). */
function riceLook(g: number): { show: boolean; height: number; color: string; seedbed: boolean } {
  if (g < 0.06) return { show: false, height: 0, color: "#4c8a3f", seedbed: false };
  if (g >= 0.92) return { show: true, height: 0.2, color: "#b39355", seedbed: false }; // stubble
  const t = Math.min(1, (g - 0.08) / (0.85 - 0.08));
  const height = 0.28 + t * (1.25 - 0.28);
  const gold = Math.max(0, Math.min(1, (g - 0.6) / 0.28));
  const color = lerpHex("#4c9a3a", "#d8b23a", gold);
  return { show: true, height, color, seedbed: g < 0.2 };
}

/** Rice stalks as one InstancedMesh — hundreds of stalks, one draw call. */
function RicePaddy({ growth, pulse }: { growth: number; pulse: number }) {
  const ref = useRef<InstancedMesh>(null);
  const dummy = useMemo(() => new Object3D(), []);
  const COLS = 22;
  const look = riceLook(growth);

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
    let i = 0;
    cells.forEach(([x, z], idx) => {
      if (look.seedbed && !(x < -0.9 && z < -0.9)) return; // nursery corner only
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
  }, [cells, dummy, look.show, look.height, look.seedbed, pulse]);

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
      <mesh position={[0, 0.62, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <capsuleGeometry args={[0.34, 0.9, 6, 10]} />
        <meshStandardMaterial color="#4a4a52" roughness={0.85} />
      </mesh>
      {[[-0.4, 0.3], [-0.4, -0.3], [0.4, 0.3], [0.4, -0.3]].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.22, z]} castShadow>
          <cylinderGeometry args={[0.07, 0.07, 0.44, 6]} />
          <meshStandardMaterial color="#3c3c44" />
        </mesh>
      ))}
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
      <mesh position={[-0.7, 0.3, 0]} rotation={[0, 0, 0.5]} castShadow>
        <cylinderGeometry args={[0.03, 0.03, 1.1, 6]} />
        <meshStandardMaterial color="#6b4a2a" />
      </mesh>
    </group>
  );
}

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
      <mesh position={[0, 1.06, 0]} castShadow>
        <coneGeometry args={[0.22, 0.16, 16]} />
        <meshStandardMaterial color="#c9a24a" roughness={0.85} />
      </mesh>
    </group>
  );
}

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
