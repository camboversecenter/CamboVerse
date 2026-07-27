import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Sky } from "@react-three/drei";
import { createXRStore, XR, XROrigin, useXR } from "@react-three/xr";
import { ACESFilmicToneMapping } from "three";
import { FirstPersonControls, type WalkInput } from "./FirstPersonControls";
import { WalkControls } from "./WalkControls";
import {
  GreatHall, TeachingBlock, EntranceMonument, Shrine, ParkingCanopy, SportsField,
  ConstructionBlock, Props,
} from "./CampusBuildings";
import { grassTexture, metresRepeat } from "../lib/groundTexture";
import { paveTexture, roadTexture, hedgeTexture } from "../lib/campusTexture";
import { buildingsOfSite, NUM_SITE, type Site } from "../buildings";

/**
 * A **walkable site** — a group of buildings you can move between. Opened from
 * the 🏛 Buildings directory (`BuildingsHome`), never straight off the map.
 *
 * The first site is the National University of Management's international
 * campus: the entrance monument, the great hall under its deep red roof, the
 * teaching block, the Khmer shrine, the parking canopies and the sports field.
 *
 * Overview it from above or walk it in first person; **tap a building** to open
 * its own page. Built procedurally from primitives and canvas-drawn textures —
 * nothing is downloaded — and it follows CamboVerse's three view modes
 * (AGENTS.md): Normal, Ultra, and VR (which always presents Ultra).
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
 * The buildings standing on this site, in the order they're listed (which is
 * the order you meet them walking it).
 *
 * The ground plan below is the NUM campus specifically — the roads, lawns and
 * tree rows are its layout, not a generic one — so this reads NUM_SITE rather
 * than the `site` prop. A second walkable site needs its own scene component;
 * what it shares with this one is the directory, not the geometry.
 */
const SITE_BUILDINGS = buildingsOfSite(NUM_SITE);

/**
 * The ground is a stack of flat surfaces that overlap in plan — lawn, roads, car
 * park apron, plazas. To a depth buffer they are effectively coplanar, and the
 * winner flips from triangle to triangle as the camera moves: the jagged grey
 * tears that made the concrete flicker.
 *
 * Two things stop it, and both are needed. Each layer sits a few centimetres
 * above the last (invisible underfoot, plenty for the depth buffer at range),
 * **and** each carries a distinct polygon offset, so the draw order is strictly
 * decided rather than left to floating-point luck where two layers cross.
 */
const GROUND = { lawn: -0.08, road: 0.04, apron: 0.08, plaza: 0.12 };
const LIFT = {
  road: { polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 },
  apron: { polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 },
  plaza: { polygonOffset: true, polygonOffsetFactor: -5, polygonOffsetUnits: -5 },
};

/** One paving tile-set per 8 m of ground → roughly 1 m slabs. */
const PAVER_M = 8;

/* ----------------------------------------------------------------- view --- */

export function BuildingsView({
  site, onBack, onOpenBuilding,
}: {
  site: Site;
  /** Back to the Buildings directory, which is where the map exit lives. */
  onBack: () => void;
  onOpenBuilding: (id: string) => void;
}) {
  const store = useMemo(() => createXRStore({ emulate: false }), []);
  const [vrSupported, setVrSupported] = useState(false);
  const [mode, setMode] = useState<ViewMode>(detectViewMode);
  const [nav, setNav] = useState<Nav>("orbit");
  const [place, setPlace] = useState<string | null>(null);
  const input = useRef<WalkInput>({ move: { x: 0, y: 0 }, look: { dx: 0, dy: 0 } });
  const [start, setStart] = useState<[number, number, number]>(SITE_BUILDINGS[0].view.at);
  const [startYaw, setStartYaw] = useState(SITE_BUILDINGS[0].view.yaw);

  useEffect(() => {
    const xr = (navigator as Navigator & { xr?: { isSessionSupported(m: string): Promise<boolean> } }).xr;
    xr?.isSessionSupported("immersive-vr").then(setVrSupported).catch(() => setVrSupported(false));
  }, []);

  const selected = SITE_BUILDINGS.find((p) => p.id === place) ?? null;
  const goTo = (id: string) => {
    const p = SITE_BUILDINGS.find((x) => x.id === id);
    if (!p) return;
    setPlace(id);
    setStart(p.view.at);
    setStartYaw(p.view.yaw);
    setNav("walk"); // arrive standing on the ground, already facing it
  };

  return (
    <div className="campus">
      <Canvas
        dpr={mode === "normal" ? [1, 1.5] : [1, 2]}
        camera={{ position: [30, 120, 320], fov: 45, near: 0.5, far: 1600 }}
        gl={{ antialias: mode === "ultra", powerPreference: "high-performance" }}
        shadows={mode === "ultra"}
        onCreated={({ gl }) => {
          gl.toneMapping = ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.15;
        }}
      >
        <XR store={store}>
          <CampusWorld mode={mode} onOpenBuilding={onOpenBuilding} />
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
              target={[24, 6, 70]}
            />
          )}
        </XR>
      </Canvas>

      <div className="cls-top">
        <button className="backbtn" onClick={onBack}>← Buildings</button>
        <span className="cls-title">🏛 {site.name}</span>
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
        {SITE_BUILDINGS.map((p) => (
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
          <p>{selected.english}</p>
          <button className="campus-open" onClick={() => onOpenBuilding(selected.id)}>
            Open building page →
          </button>
        </div>
      )}

      {nav === "walk" && <WalkControls input={input} />}
      {nav === "walk" && (
        <div className="campus-hint">Drag to look · use the stick to walk</div>
      )}
    </div>
  );
}

/**
 * Makes a building tappable: a click anywhere on it opens that building's page,
 * and hovering shows a pointer so it's discoverable on desktop. (Taps reach the
 * canvas in Overview; in Walk mode the look-drag layer owns the screen, so the
 * landmark list is the way in.)
 */
function Tappable({
  id, onOpen, children,
}: {
  id: string; onOpen: (id: string) => void; children: React.ReactNode;
}) {
  return (
    <group
      onClick={(e) => { e.stopPropagation(); onOpen(id); }}
      onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = "pointer"; }}
      onPointerOut={() => { document.body.style.cursor = ""; }}
    >
      {children}
    </group>
  );
}

/** VR always presents the Ultra scene. */
function VrImpliesUltra({ onEnter }: { onEnter: () => void }) {
  const inXR = useXR((s) => s.session != null);
  useEffect(() => { if (inXR) onEnter(); }, [inXR, onEnter]);
  return null;
}

/* ---------------------------------------------------------------- world --- */

function CampusWorld({ mode, onOpenBuilding }: { mode: ViewMode; onOpenBuilding: (id: string) => void }) {
  const grass = useMemo(() => grassTexture(46), []);
  const pave = useMemo(() => paveTexture(metresRepeat(104, 104, PAVER_M)[0]), []);
  const road = useMemo(() => roadTexture(metresRepeat(120, 120, PAVER_M)[0]), []);
  const hedge = useMemo(() => hedgeTexture(), []);
  const ultra = mode === "ultra";

  // Street furniture, instanced.
  const bollards = useMemo(() => {
    const out: { pos: [number, number, number] }[] = [];
    for (let i = 0; i < 14; i++) {
      out.push({ pos: [-26 + i * 4, 0.55, 146] });
      out.push({ pos: [-26 + i * 4, 0.55, 158] });
    }
    return out;
  }, []);
  const lamps = useMemo(() => {
    const out: { pos: [number, number, number] }[] = [];
    for (let i = 0; i < 9; i++) {
      out.push({ pos: [-58, 2.6, 130 - i * 13] });
      out.push({ pos: [112, 2.6, 126 - i * 13] });
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
        const r = 250 + ring * 34 + rnd() * 16;
        out.push({
          pos: [Math.cos(a) * r + 20, 0, Math.sin(a) * r + 70],
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
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, GROUND.lawn, 0]} receiveShadow>
        <planeGeometry args={[1400, 1400]} />
        <meshStandardMaterial map={grass} roughness={1} />
      </mesh>

      {/* entrance forecourt */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, GROUND.plaza, 152]} receiveShadow>
        <circleGeometry args={[30, 40]} />
        <meshStandardMaterial map={pave} roughness={1} {...LIFT.plaza} />
      </mesh>
      
      {/* Central Entrance Avenue (1) */}
      <group position={[0, 0, 123]}>
        {/* The central dark road */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, GROUND.road, 0]} receiveShadow>
          <planeGeometry args={[8, 58]} />
          <meshStandardMaterial map={road} roughness={1} {...LIFT.road} />
        </mesh>
        {/* Left and Right grass strips */}
        {[-5, 5].map((x) => (
          <mesh key={x} rotation={[-Math.PI / 2, 0, 0]} position={[x, GROUND.lawn + 0.01, 0]} receiveShadow>
            <planeGeometry args={[2, 58]} />
            <meshStandardMaterial map={grass} roughness={1} />
          </mesh>
        ))}
        {/* Left and Right outer walkways */}
        {[-7, 7].map((x) => (
          <mesh key={x} rotation={[-Math.PI / 2, 0, 0]} position={[x, GROUND.plaza, 0]} receiveShadow>
            <planeGeometry args={[2, 58]} />
            <meshStandardMaterial map={pave} roughness={1} {...LIFT.plaza} />
          </mesh>
        ))}
      </group>


      {/* --- Perimeter Ring Road --- */}
      {/* South Perimeter Road (3) - main cross road at the front */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[2.5, GROUND.road, 112]} receiveShadow>
        <planeGeometry args={[259, 14]} />
        <meshStandardMaterial map={road} roughness={1} {...LIFT.road} />
      </mesh>
      
      {/* East Perimeter Road - down the side of the car park & Great Hall */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[125, GROUND.road, 36]} receiveShadow>
        <planeGeometry args={[14, 166]} />
        <meshStandardMaterial map={road} roughness={1} {...LIFT.road} />
      </mesh>

      {/* West Perimeter Road - up the left side of the football field */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-120, GROUND.road, 36]} receiveShadow>
        <planeGeometry args={[14, 166]} />
        <meshStandardMaterial map={road} roughness={1} {...LIFT.road} />
      </mesh>

      {/* North Perimeter Road - running behind the teaching blocks */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[2.5, GROUND.road, -40]} receiveShadow>
        <planeGeometry args={[259, 14]} />
        <meshStandardMaterial map={road} roughness={1} {...LIFT.road} />
      </mesh>

      {/* --- Internal Road Grid --- */}
      {/* Middle Horizontal Road - separating front zone from central complex */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[2.5, GROUND.road, 24]} receiveShadow>
        <planeGeometry args={[259, 14]} />
        <meshStandardMaterial map={road} roughness={1} {...LIFT.road} />
      </mesh>

      {/* West Internal Vertical Road - separating ponds/courts from central complex */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-50, GROUND.road, -8]} receiveShadow>
        <planeGeometry args={[14, 64]} />
        <meshStandardMaterial map={road} roughness={1} {...LIFT.road} />
      </mesh>

      {/* East Internal Vertical Road - separating Great Hall & Parking from central complex */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[70, GROUND.road, 36]} receiveShadow>
        <planeGeometry args={[14, 152]} />
        <meshStandardMaterial map={road} roughness={1} {...LIFT.road} />
      </mesh>

      {/* Small monument plaza (2) at the end of the avenue */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, GROUND.plaza, 94]} receiveShadow>
        <planeGeometry args={[22, 22]} />
        <meshStandardMaterial map={pave} roughness={1} {...LIFT.plaza} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, GROUND.plaza + 0.01, 94]} receiveShadow>
        <circleGeometry args={[8, 32]} />
        <meshStandardMaterial color="#f4f4f1" roughness={1} />
      </mesh>
      {/* the great hall's plaza */}
      {/* the Great Hall's plaza */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[92, GROUND.plaza, 6]} receiveShadow>
        <planeGeometry args={[110, 96]} />
        <meshStandardMaterial map={pave} roughness={1} {...LIFT.plaza} />
      </mesh>

      {/* the car park apron */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[94, GROUND.apron, 74]} receiveShadow>
        <planeGeometry args={[76, 84]} />
        <meshStandardMaterial map={road} roughness={1} {...LIFT.apron} />
      </mesh>

      {/* Internal Road in front of Teaching Blocks (7 & 8) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[2.5, GROUND.road, -10]} receiveShadow>
        <planeGeometry args={[231, 10]} />
        <meshStandardMaterial map={road} roughness={1} {...LIFT.road} />
      </mesh>

      {/* Rear Garden / Courtyard (15) */}
      <group position={[-46, 0, 10]}>
        {/* Grass area */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, GROUND.lawn + 0.02, 0]} receiveShadow>
          <planeGeometry args={[120, 26]} />
          <meshStandardMaterial color="#6a9b4a" roughness={1} />
        </mesh>
        
        {/* Central paved path connecting central complex to back road */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, GROUND.plaza, 0]} receiveShadow>
          <planeGeometry args={[6, 26]} />
          <meshStandardMaterial map={pave} roughness={1} {...LIFT.plaza} />
        </mesh>



        {/* Small garden seating areas (red pavilions/squares from map) */}
        {[-30, 30].map((px) => (
          <group key={`seat-${px}`}>
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[px, GROUND.plaza + 0.03, 0]} receiveShadow>
              <planeGeometry args={[10, 10]} />
              <meshStandardMaterial map={pave} roughness={1} {...LIFT.plaza} />
            </mesh>
            <mesh position={[px, 0.4, 0]}>
              <boxGeometry args={[4, 0.8, 4]} />
              <meshStandardMaterial color="#c94b36" roughness={0.8} />
            </mesh>
          </group>
        ))}
      </group>

      {/* --- the buildings: tapping one opens its own page --- */}
      {/* 1 — you arrive here, looking north across the lawn */}
      <Tappable id="gate" onOpen={onOpenBuilding}>
        <EntranceMonument position={[0, 0, 152]} rotation={Math.PI} />
      </Tappable>
      {/* the teaching block closes the far side of the lawn, with the
          part-built block beside it — the view from the entrance */}
      <Tappable id="teaching" onOpen={onOpenBuilding}>
        <TeachingBlock position={[-16, 0, -23.5]} rotation={0} floors={4} />
      </Tappable>
      <Tappable id="construction" onOpen={onOpenBuilding}>
        <ConstructionBlock position={[-84, 0, -22]} w={46} d={18} floors={5} />
      </Tappable>
      {/* 2 — turn right and walk east: the car park */}
      <Tappable id="parking" onOpen={onOpenBuilding}>
        {[0, 1, 2].map((i) => (
          <ParkingCanopy key={i} position={[74 + i * 19, 0, 74]} rotation={Math.PI / 2} length={64} width={13} />
        ))}
      </Tappable>
      {/* 3 — and next to the car park, the Great Hall with its shrine */}
      <Tappable id="hall" onOpen={onOpenBuilding}>
        <GreatHall position={[96, 0, -6]} />
      </Tappable>
      <Tappable id="shrine" onOpen={onOpenBuilding}>
        <Shrine position={[62, 0, 12]} />
      </Tappable>
      <Tappable id="field" onOpen={onOpenBuilding}>
        <SportsField position={[-50, 0, 68]} w={120} d={75} />
      </Tappable>

      {/* 10 — The Reflecting Ponds (West side) */}
      <group position={[-85, 0, 0]}>
        {/* Top Pond */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, GROUND.plaza, -24]} receiveShadow>
          <planeGeometry args={[50, 14]} />
          <meshStandardMaterial color="#c2c3c0" roughness={0.9} {...LIFT.plaza} />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, GROUND.plaza + 0.01, -24]} receiveShadow>
          <planeGeometry args={[48.5, 12.5]} />
          <meshStandardMaterial color="#1f4b66" roughness={0.1} metalness={0.8} />
        </mesh>
        {/* Bottom Pond */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, GROUND.plaza, 7]} receiveShadow>
          <planeGeometry args={[50, 20]} />
          <meshStandardMaterial color="#c2c3c0" roughness={0.9} {...LIFT.plaza} />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, GROUND.plaza + 0.01, 7]} receiveShadow>
          <planeGeometry args={[48.5, 18.5]} />
          <meshStandardMaterial color="#1f4b66" roughness={0.1} metalness={0.8} />
        </mesh>
      </group>

      {/* --- planting --- */}
      {/* Trees temporarily removed as requested */}

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
        <mesh key={s} position={[s * 20, 0.5, 146]} castShadow receiveShadow>
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
        { p: [20, 1.2, 178] as [number, number, number], w: 360 },
        { p: [20, 1.2, -46] as [number, number, number], w: 360 },
      ].map((seg, i) => (
        <mesh key={i} position={seg.p} castShadow receiveShadow>
          <boxGeometry args={[seg.w, 2.4, 0.5]} />
          <meshStandardMaterial color="#cdbfae" roughness={0.95} />
        </mesh>
      ))}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[20 + s * 180, 1.2, 66]} castShadow receiveShadow>
          <boxGeometry args={[0.5, 2.4, 224]} />
          <meshStandardMaterial color="#cdbfae" roughness={0.95} />
        </mesh>
      ))}
    </>
  );
}
