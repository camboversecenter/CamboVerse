import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Sky } from "@react-three/drei";
import { createXRStore, XR, useXR } from "@react-three/xr";
import { ACESFilmicToneMapping } from "three";
import { FirstPersonControls, type WalkInput } from "./FirstPersonControls";
import { WalkControls } from "./WalkControls";
import { VRRig } from "./VRRig";
import {
  GreatHall, TeachingBlock, EntranceMonument, Shrine, ParkingCanopy, SportsField,
  ConstructionBlock, Props, MainGate,
} from "./CampusBuildings";
import { grassTexture, metresRepeat } from "../lib/groundTexture";
import { paveTexture, roadTexture, hedgeTexture } from "../lib/campusTexture";
import { buildingsOfSite, NUM_SITE, type Site } from "../buildings";

import { MangoForest, type MangoDef } from "./MangoTree";
import { BananaForest, type BananaDef } from "./BananaTree";
import campusTreesData from "../data/campusTrees.json";
import { Palm } from "./Palm";

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
  onOpenBuilding: (id: string, room?: string) => void;
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
          {/* VR locomotion rig: left stick = walk, right stick = snap-turn 30°.
              Spawns at the campus entrance facing the monument. Works on any
              WebXR device; optimised for Meta Quest 3. */}
          <VRRig position={[0, 0, 96]} />
          <VrImpliesUltra onEnter={() => setMode("ultra")} />
          {nav === "walk" ? (
            <FirstPersonControls 
              input={input} 
              start={start} 
              startYaw={startYaw} 
            />
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
        <button
          className="vr-btn cls-vr"
          style={!vrSupported ? { opacity: 0.45, cursor: "not-allowed" } : undefined}
          title={vrSupported ? "Enter VR — works on Meta Quest 3 and any WebXR headset" : "VR not detected — open this page on a Meta Quest browser or connect a headset via Air Link"}
          onClick={() => { if (vrSupported) { setMode("ultra"); store.enterVR(); } }}
        >
          🥽 VR
        </button>
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
        <div className="campus-hint">
          Drag to look · use the stick to walk · tap space to jump
        </div>
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

function CampusWorld({ mode, onOpenBuilding }: { mode: ViewMode; onOpenBuilding: (id: string, room?: string) => void }) {
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

  const { mangoTrees, bananaTrees } = useMemo(() => {
    const mangoes: MangoDef[] = [];
    const bananas: BananaDef[] = [];
    let s = 12;
    const rnd = (min: number, max: number) => {
      s = (s * 1103515245 + 12345) & 0x7fffffff;
      return min + (s / 0x7fffffff) * (max - min);
    };
    
    // Add a tree to one of the arrays randomly (stable based on sequence)
    const addTree = (x: number, z: number) => {
      // 30% chance to be a banana tree
      if (rnd(0, 1) < 0.3) {
        bananas.push({ x, z });
      } else {
        mangoes.push({ x, z });
      }
    };

    // Perimeter trees
    for (let x = -170; x <= 130; x += 15) {
      if (Math.abs(x + 40) > 15) addTree(x + rnd(-2, 2), 133 + rnd(-2, 2));
      addTree(x + rnd(-2, 2), -53 + rnd(-2, 2));
    }
    for (let z = -40; z <= 120; z += 15) {
      addTree(-173 + rnd(-2, 2), z + rnd(-2, 2));
      addTree(133 + rnd(-2, 2), z + rnd(-2, 2));
    }
    
    // Internal road trees
    for (let x = -170; x <= 130; x += 18) {
      if (Math.abs(x + 40) > 15) {
        addTree(x + rnd(-1, 1), 33 + rnd(-1, 1));
        addTree(x + rnd(-1, 1), 47 + rnd(-1, 1));
      }
    }
    for (let z = -40; z <= 120; z += 18) {
      if (Math.abs(z - 40) > 15) {
        addTree(-48 + rnd(-1, 1), z + rnd(-1, 1));
        addTree(-32 + rnd(-1, 1), z + rnd(-1, 1));
      }
    }
    return { mangoTrees: mangoes, bananaTrees: bananas };
  }, []);

  const palms = useMemo(() => {
    const list: [number, number, number][] = [];
    for (let z = 155; z <= 235; z += 16) {
      list.push([-51, 0, z]);
      list.push([-29, 0, z]);
    }
    return list;
  }, []);

  // The neighbourhood the campus sits in: rows of pitched-roof houses in a grid.
  const houses = useMemo(() => {
    const out: { pos: [number, number, number]; rot: number; scale: number }[] = [];
    let s = 7;
    const rnd = () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
    
    for (let x = -400; x <= 400; x += 35) {
      for (let z = -350; z <= 450; z += 45) {
        // Skip the main campus footprint so houses don't spawn on the lawn
        if (x > -220 && x < 180 && z > -120 && z < 280) continue;
        
        // Add a little organic jitter to the grid
        const px = x + rnd() * 8;
        const pz = z + rnd() * 12;
        
        out.push({
          pos: [px, 0, pz],
          // Align houses to the grid (0 or 90 degrees)
          rot: rnd() > 0.5 ? 0 : Math.PI / 2,
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

      {/* --- Central Entrance Avenue --- */}
      <group position={[-40, 0, 190]}>
        {/* Inbound and Outbound lanes (each 6m wide) */}
        {[-5, 5].map((x) => (
          <mesh key={`lane-${x}`} rotation={[-Math.PI / 2, 0, 0]} position={[x, GROUND.road, 0]} receiveShadow>
            <planeGeometry args={[6, 100]} />
            <meshStandardMaterial map={road} roughness={1} {...LIFT.road} />
          </mesh>
        ))}
        {/* Planted Median */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, GROUND.lawn + 0.05, 0]} receiveShadow>
          <planeGeometry args={[4, 100]} />
          <meshStandardMaterial map={grass} roughness={1} />
        </mesh>
        <mesh position={[0, 0.4, 0]} castShadow receiveShadow>
          <boxGeometry args={[2, 0.8, 92]} />
          <meshStandardMaterial map={hedge} roughness={0.95} />
        </mesh>
        {/* Left and Right outer walkways */}
        {[-9, 9].map((x) => (
          <mesh key={`walk-${x}`} rotation={[-Math.PI / 2, 0, 0]} position={[x, GROUND.plaza, 0]} receiveShadow>
            <planeGeometry args={[2, 100]} />
            <meshStandardMaterial map={pave} roughness={1} {...LIFT.plaza} />
          </mesh>
        ))}
      </group>

      {/* --- Main Campus Grid --- */}
      {/* South Perimeter Road */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-20, GROUND.road, 140]} receiveShadow>
        <planeGeometry args={[334, 14]} />
        <meshStandardMaterial map={road} roughness={1} {...LIFT.road} />
      </mesh>

      {/* North Perimeter Road */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-20, GROUND.road, -60]} receiveShadow>
        <planeGeometry args={[334, 14]} />
        <meshStandardMaterial map={road} roughness={1} {...LIFT.road} />
      </mesh>

      {/* West Perimeter Road */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-180, GROUND.road, 40]} receiveShadow>
        <planeGeometry args={[14, 214]} />
        <meshStandardMaterial map={road} roughness={1} {...LIFT.road} />
      </mesh>

      {/* East Perimeter Road */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[140, GROUND.road, 40]} receiveShadow>
        <planeGeometry args={[14, 214]} />
        <meshStandardMaterial map={road} roughness={1} {...LIFT.road} />
      </mesh>

      {/* Middle Horizontal Road */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-20, GROUND.road, 40]} receiveShadow>
        <planeGeometry args={[334, 14]} />
        <meshStandardMaterial map={road} roughness={1} {...LIFT.road} />
      </mesh>

      {/* Central Vertical Road */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-40, GROUND.road, 40]} receiveShadow>
        <planeGeometry args={[14, 214]} />
        <meshStandardMaterial map={road} roughness={1} {...LIFT.road} />
      </mesh>

      {/* Forecourt Plaza where avenue meets South Perimeter */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-40, GROUND.plaza, 140]} receiveShadow>
        <circleGeometry args={[20, 32]} />
        <meshStandardMaterial map={pave} roughness={1} {...LIFT.plaza} />
      </mesh>

      {/* --- the buildings: tapping one opens its own page --- */}
      {/* 1 — you arrive here, looking north across the lawn */}
      <Tappable id="gate" onOpen={onOpenBuilding}>
        <MainGate position={[-40, 0, 240]} rotation={Math.PI} />
      </Tappable>
      
      {/* The NUM Monument sign at the forecourt circle */}
      <EntranceMonument position={[-40, 0, 140]} rotation={Math.PI} />
      {/* Quadrant 1 (Top Left): Teaching and Construction Site */}
      <Tappable id="teaching" onOpen={onOpenBuilding}>
        <TeachingBlock position={[-100, 0, -30]} w={60} d={15} floors={4} onRoomClick={(r: string) => onOpenBuilding('teaching', r)} />
      </Tappable>
      <Tappable id="construction" onOpen={onOpenBuilding}>
        <ConstructionBlock position={[-155, 0, -30]} w={46} d={18} floors={5} />
      </Tappable>
      {/* Quadrant 4 (Bottom Right): Parking Canopies */}
      <Tappable id="parking" onOpen={onOpenBuilding}>
        {[0, 1, 2].map((i) => (
          <ParkingCanopy key={i} position={[50 + i * 20, 0, 90]} rotation={Math.PI / 2} length={64} width={13} />
        ))}
      </Tappable>
      {/* Quadrant 2 (Top Right): Great Hall */}
      <Tappable id="hall" onOpen={onOpenBuilding}>
        <GreatHall position={[70, 0, -10]} />
      </Tappable>
      <Tappable id="shrine" onOpen={onOpenBuilding}>
        <Shrine position={[25, 0, 10]} />
      </Tappable>
      {/* Quadrant 3 (Bottom Left): Sports Field */}
      <Tappable id="field" onOpen={onOpenBuilding}>
        <SportsField position={[-110, 0, 90]} w={120} d={75} />
      </Tappable>

      {/* --- planting --- */}
      <MangoForest
        trees={mangoTrees}
        height_m={campusTreesData.observations[0].measure.height_m}
        dbh_cm={campusTreesData.observations[0].measure.dbh_cm}
      />
      <BananaForest
        trees={bananaTrees}
        height_m={campusTreesData.observations[0].measure.height_m}
        dbh_cm={campusTreesData.observations[0].measure.dbh_cm}
      />
      {palms.map((p, i) => <Palm key={`palm-${i}`} position={p} scale={1.1} spin={i * 2.3} />)}

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
        <mesh key={s} position={[-40 + s * 20, 0.5, 146]} castShadow receiveShadow>
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
      {/* perimeter wall (temporarily removed) */}
      {/*
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
      */}
    </>
  );
}
