import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Sky } from "@react-three/drei";
import { createXRStore, XR, XROrigin, useXR } from "@react-three/xr";
import { ACESFilmicToneMapping } from "three";
import { FirstPersonControls, type WalkInput } from "./FirstPersonControls";
import { WalkControls } from "./WalkControls";
import {
  GreatHall, TeachingBlock, EntranceMonument, Shrine, ParkingCanopy, SportsField, Props,
} from "./CampusBuildings";
import { PalmPlant, BroadleafPlant, type PlantLook, type TreeShape } from "./GrovePlants";
import { grassTexture } from "../lib/groundTexture";
import { paveTexture, roadTexture, hedgeTexture } from "../lib/campusTexture";

/**
 * 🎓 **NUM International Campus** — a walkable virtual twin of the National
 * University of Management's international campus: the entrance monument, the
 * great hall under its deep red roof, the teaching blocks, the Khmer shrine,
 * the parking canopies and the sports field, set in the surrounding Phnom Penh
 * fringe.
 *
 * Built procedurally from primitives and canvas-drawn textures — nothing is
 * downloaded — and it follows CamboVerse's three view modes (AGENTS.md):
 * Normal for a low-end phone, Ultra for a capable device, and VR (which always
 * presents Ultra). You can orbit it from above or walk it in first person.
 */
type ViewMode = "normal" | "ultra";
type Nav = "orbit" | "walk";

function detectViewMode(): ViewMode {
  if (typeof navigator === "undefined") return "ultra";
  const cores = navigator.hardwareConcurrency ?? 4;
  const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 4;
  const small = typeof window !== "undefined" && Math.min(window.screen.width, window.screen.height) < 500;
  return cores <= 4 || mem <= 3 || small ? "normal" : "ultra";
}

/* --------------------------------------------------------------- layout --- */

/**
 * Landmarks a visitor can jump to. `at` is where they stand and `yaw` which way
 * they face, so arriving somewhere already looks at the thing you came to see
 * rather than at the back of it.
 */
const PLACES = [
  { id: "gate", name: "Main Entrance", khmer: "ច្រកចូល", at: [0, 1.6, 128] as [number, number, number], yaw: 0,
    note: "The NUM International Campus monument, flanked by sugar palms — Cambodia's national tree." },
  { id: "hall", name: "The Great Hall", khmer: "សាលធំ", at: [0, 1.6, 92] as [number, number, number], yaw: 0,
    note: "The campus landmark: a glazed hall inside a colonnade, under a deep hipped roof crowned with a Khmer spire." },
  { id: "teaching", name: "Teaching Block", khmer: "អគារសិក្សា", at: [-30, 1.6, 72] as [number, number, number], yaw: 0.71,
    note: "Four floors of classrooms behind window bands, under the campus's signature red roof." },
  { id: "shrine", name: "Campus Shrine", khmer: "ខ្ទមទេវតា", at: [34, 1.6, 58] as [number, number, number], yaw: 0,
    note: "A Khmer shrine in the plaza — a place to leave an offering before an exam." },
  { id: "field", name: "Sports Field", khmer: "ទីលានកីឡា", at: [-80, 1.6, 142] as [number, number, number], yaw: 0,
    note: "The running track and football pitch on the campus's western side." },
  { id: "parking", name: "Parking Canopies", khmer: "ចំណតរថយន្ត", at: [62, 1.6, 130] as [number, number, number], yaw: 0,
    note: "Long shaded canopies over the car park — welcome relief in the Cambodian sun." },
];

/** Sugar palms lining the entrance avenue, plus shade trees along the roads. */
function siteTrees() {
  // Sugar palms flank the entrance avenue, stopping short of the plaza so the
  // Great Hall is framed rather than blocked.
  const palms: { pos: [number, number, number]; seed: number }[] = [];
  for (let i = 0; i < 7; i++) {
    const z = 122 - i * 9;
    palms.push({ pos: [-17, 0, z], seed: i * 3 + 1 });
    palms.push({ pos: [17, 0, z], seed: i * 3 + 2 });
  }
  const trees: { pos: [number, number, number]; seed: number }[] = [];
  // shade trees down the ring road and the plaza edges
  for (let i = 0; i < 11; i++) {
    trees.push({ pos: [-40, 0, 108 - i * 11], seed: 40 + i });
    trees.push({ pos: [86, 0, 108 - i * 11], seed: 60 + i });
  }
  // forecourt row, split either side so nothing stands in the avenue
  for (let i = 0; i < 4; i++) {
    trees.push({ pos: [-46 + i * 9, 0, 118], seed: 80 + i });
    trees.push({ pos: [22 + i * 9, 0, 118], seed: 90 + i });
  }
  for (let i = 0; i < 8; i++) trees.push({ pos: [-32 + i * 10, 0, -38], seed: 100 + i });
  for (let i = 0; i < 5; i++) trees.push({ pos: [44, 0, 40 - i * 12], seed: 120 + i });
  return { palms, trees };
}

const PALM_LOOK: PlantLook = { form: "palm", leaf: "#3f8a44", leaf2: "#57a052", bark: "#9a7b4a" };
const SHADE_SHAPE: TreeShape = { spread: 0.9, levels: 3, children: 3, trunkFrac: 0.38, girth: 1.1, clump: 2.6 };
const SHADE_LOOK: PlantLook = {
  form: "broadleaf", leaf: "#3f7a34", leaf2: "#55953f", bark: "#6b5340", shape: SHADE_SHAPE,
};

/* ----------------------------------------------------------------- view --- */

export function NumCampusView({ onBackToMap }: { onBackToMap: () => void }) {
  const store = useMemo(() => createXRStore({ emulate: false }), []);
  const [vrSupported, setVrSupported] = useState(false);
  const [mode, setMode] = useState<ViewMode>(detectViewMode);
  const [nav, setNav] = useState<Nav>("orbit");
  const [place, setPlace] = useState<string | null>(null);
  const input = useRef<WalkInput>({ move: { x: 0, y: 0 }, look: { dx: 0, dy: 0 } });
  const [start, setStart] = useState<[number, number, number]>(PLACES[0].at);
  const [startYaw, setStartYaw] = useState(PLACES[0].yaw);

  useEffect(() => {
    const xr = (navigator as Navigator & { xr?: { isSessionSupported(m: string): Promise<boolean> } }).xr;
    xr?.isSessionSupported("immersive-vr").then(setVrSupported).catch(() => setVrSupported(false));
  }, []);

  const selected = PLACES.find((p) => p.id === place) ?? null;
  const goTo = (id: string) => {
    const p = PLACES.find((x) => x.id === id);
    if (!p) return;
    setPlace(id);
    setStart(p.at);
    setStartYaw(p.yaw);
    setNav("walk"); // arrive standing on the ground, already facing it
  };

  return (
    <div className="campus">
      <Canvas
        dpr={mode === "normal" ? [1, 1.5] : [1, 2]}
        camera={{ position: [0, 78, 210], fov: 45, far: 2000 }}
        gl={{ antialias: mode === "ultra", powerPreference: "high-performance" }}
        shadows={mode === "ultra"}
        onCreated={({ gl }) => {
          gl.toneMapping = ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.15;
        }}
      >
        <XR store={store}>
          <CampusWorld mode={mode} />
          <XROrigin position={[0, 0, 96]} />
          <VrImpliesUltra onEnter={() => setMode("ultra")} />
          {nav === "walk" ? (
            <FirstPersonControls input={input} start={start} startYaw={startYaw} />
          ) : (
            <OrbitControls
              enablePan
              minDistance={20}
              maxDistance={420}
              maxPolarAngle={Math.PI / 2.12}
              enableDamping
              target={[0, 6, 30]}
            />
          )}
        </XR>
      </Canvas>

      <div className="cls-top">
        <button className="backbtn" onClick={onBackToMap}>← Map</button>
        <span className="cls-title">🎓 NUM International Campus</span>
        <button
          className="grove-quality"
          onClick={() => setMode((m) => (m === "ultra" ? "normal" : "ultra"))}
          title="View mode — Normal is the low-end baseline, Ultra is the full 3D scene"
        >
          {mode === "ultra" ? "✨ Ultra" : "🍃 Normal"}
        </button>
        {vrSupported && (
          <button className="vr-btn cls-vr" onClick={() => { setMode("ultra"); store.enterVR(); }}>🥽 VR</button>
        )}
      </div>

      {/* orbit ⇄ walk */}
      <div className="campus-nav">
        <button className={nav === "orbit" ? "campus-mode on" : "campus-mode"} onClick={() => setNav("orbit")}>
          🛰️ Overview
        </button>
        <button className={nav === "walk" ? "campus-mode on" : "campus-mode"} onClick={() => setNav("walk")}>
          🚶 Walk
        </button>
      </div>

      {/* jump to a landmark */}
      <div className="campus-places">
        {PLACES.map((p) => (
          <button
            key={p.id}
            className={place === p.id ? "campus-place on" : "campus-place"}
            onClick={() => goTo(p.id)}
          >
            {p.name}
          </button>
        ))}
      </div>

      {selected && (
        <div className="campus-card">
          <div className="campus-card-head">
            <b>{selected.name}</b> <span className="khmer">{selected.khmer}</span>
            <button className="grove-x" onClick={() => setPlace(null)}>✕</button>
          </div>
          <p>{selected.note}</p>
        </div>
      )}

      {nav === "walk" && <WalkControls input={input} />}
      {nav === "walk" && (
        <div className="campus-hint">Drag to look · use the stick to walk</div>
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

/* ---------------------------------------------------------------- world --- */

function CampusWorld({ mode }: { mode: ViewMode }) {
  const grass = useMemo(() => grassTexture(90), []);
  const pave = useMemo(() => paveTexture(40), []);
  const road = useMemo(() => roadTexture(30), []);
  const hedge = useMemo(() => hedgeTexture(), []);
  const { palms, trees } = useMemo(() => siteTrees(), []);
  const ultra = mode === "ultra";

  // Street furniture, instanced.
  const bollards = useMemo(() => {
    const out: { pos: [number, number, number] }[] = [];
    for (let i = 0; i < 14; i++) {
      out.push({ pos: [-13.5, 0.55, 122 - i * 6] });
      out.push({ pos: [13.5, 0.55, 122 - i * 6] });
    }
    return out;
  }, []);
  const lamps = useMemo(() => {
    const out: { pos: [number, number, number] }[] = [];
    for (let i = 0; i < 9; i++) {
      out.push({ pos: [-37, 2.6, 108 - i * 11] });
      out.push({ pos: [83, 2.6, 108 - i * 11] });
    }
    return out;
  }, []);
  // The neighbourhood the campus sits in: rows of pitched-roof houses.
  const houses = useMemo(() => {
    const out: { pos: [number, number, number]; rot: number; scale: number }[] = [];
    let s = 7;
    const rnd = () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
    for (let ring = 0; ring < 3; ring++) {
      for (let i = 0; i < 26; i++) {
        const a = (i / 26) * Math.PI * 2 + ring * 0.12;
        const r = 210 + ring * 34 + rnd() * 16;
        out.push({
          pos: [Math.cos(a) * r, 0, Math.sin(a) * r + 30],
          rot: a + Math.PI / 2,
          scale: 0.85 + rnd() * 0.5,
        });
      }
    }
    return out;
  }, []);

  return (
    <>
      <Sky sunPosition={[120, 70, 60]} turbidity={5} rayleigh={1.0} mieCoefficient={0.005} mieDirectionalG={0.92} />
      <fog attach="fog" args={["#cfe0e8", 220, 900]} />
      <ambientLight intensity={0.52} />
      <hemisphereLight args={["#cfe2ff", "#6b8a45", 0.8]} />
      <directionalLight
        position={[120, 90, 60]}
        intensity={2.4}
        color="#fff1d6"
        castShadow={ultra}
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0006}
        shadow-camera-near={1}
        shadow-camera-far={420}
        shadow-camera-left={-150}
        shadow-camera-right={150}
        shadow-camera-top={150}
        shadow-camera-bottom={-150}
      />

      {/* ground: lawn everywhere, then paving laid over it */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.03, 0]} receiveShadow>
        <planeGeometry args={[1400, 1400]} />
        <meshStandardMaterial map={grass} roughness={1} />
      </mesh>

      {/* entrance forecourt + avenue */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 100]} receiveShadow>
        <circleGeometry args={[28, 40]} />
        <meshStandardMaterial map={pave} roughness={1} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.008, 70]} receiveShadow>
        <planeGeometry args={[24, 74]} />
        <meshStandardMaterial map={road} roughness={1} />
      </mesh>
      {/* the great hall's plaza */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[4, 0.012, 20]} receiveShadow>
        <planeGeometry args={[150, 96]} />
        <meshStandardMaterial map={pave} roughness={1} />
      </mesh>
      {/* ring road along the west + the car park apron */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-40, 0.009, 40]} receiveShadow>
        <planeGeometry args={[14, 210]} />
        <meshStandardMaterial map={road} roughness={1} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[62, 0.009, 84]} receiveShadow>
        <planeGeometry args={[86, 62]} />
        <meshStandardMaterial map={road} roughness={1} />
      </mesh>

      {/* --- the buildings --- */}
      <EntranceMonument position={[0, 0, 104]} rotation={Math.PI} />
      <GreatHall position={[0, 0, 10]} />
      <TeachingBlock position={[-76, 0, 16]} rotation={Math.PI / 2} w={86} d={15} floors={4} />
      <TeachingBlock position={[0, 0, -62]} rotation={0} w={70} d={14} floors={3} tower={false} />
      <Shrine position={[34, 0, 36]} />
      {[0, 1, 2].map((i) => (
        <ParkingCanopy key={i} position={[62, 0, 66 + i * 16]} length={62} width={12} />
      ))}
      <SportsField position={[-80, 0, 92]} rx={42} rz={34} />

      {/* --- planting --- */}
      {palms.map((p) => (
        <group key={`p${p.pos[0]}-${p.pos[2]}`} position={p.pos}>
          <PalmPlant look={PALM_LOOK} height={11} seed={p.seed} opacity={1} wind={ultra ? 1 : 0} />
        </group>
      ))}
      {trees.map((t) => (
        <group key={`t${t.pos[0]}-${t.pos[2]}`} position={t.pos}>
          <BroadleafPlant
            look={SHADE_LOOK}
            height={7.5}
            seed={t.seed}
            opacity={1}
            wind={ultra ? 1 : 0}
            detail={ultra ? 1 : 0}
          />
        </group>
      ))}

      {/* --- site furniture --- */}
      <Props items={bollards}>
        <cylinderGeometry args={[0.11, 0.13, 1.1, 6]} />
        <meshStandardMaterial color="#6f7275" roughness={0.7} metalness={0.25} />
      </Props>
      <Props items={lamps}>
        <cylinderGeometry args={[0.09, 0.12, 5.2, 6]} />
        <meshStandardMaterial color="#dcdad4" roughness={0.6} />
      </Props>
      {/* clipped hedges around the forecourt beds */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 19, 0.5, 92]} castShadow receiveShadow>
          <boxGeometry args={[18, 1, 4]} />
          <meshStandardMaterial map={hedge} roughness={0.95} />
        </mesh>
      ))}

      {/* --- the neighbourhood beyond the wall --- */}
      <Props items={houses}>
        <boxGeometry args={[9, 7, 11]} />
        <meshStandardMaterial color="#d8cfc4" roughness={0.9} />
      </Props>
      <Props items={houses.map((h) => ({ ...h, pos: [h.pos[0], 7 * (h.scale ?? 1), h.pos[2]] as [number, number, number] }))}>
        <coneGeometry args={[8.4, 3.4, 4]} />
        <meshStandardMaterial color="#9d4038" roughness={0.8} />
      </Props>
      {/* perimeter wall */}
      {[
        { p: [0, 1.2, 150] as [number, number, number], w: 300 },
        { p: [0, 1.2, -96] as [number, number, number], w: 300 },
      ].map((seg, i) => (
        <mesh key={i} position={seg.p} castShadow receiveShadow>
          <boxGeometry args={[seg.w, 2.4, 0.5]} />
          <meshStandardMaterial color="#cdbfae" roughness={0.95} />
        </mesh>
      ))}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 150, 1.2, 27]} castShadow receiveShadow>
          <boxGeometry args={[0.5, 2.4, 246]} />
          <meshStandardMaterial color="#cdbfae" roughness={0.95} />
        </mesh>
      ))}
    </>
  );
}
