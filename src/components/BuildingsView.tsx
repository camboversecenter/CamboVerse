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
import { PalmPlant, BroadleafPlant, type PlantLook, type TreeShape } from "./GrovePlants";
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

/** Sugar palms lining the entrance avenue, plus shade trees along the roads. */
function siteTrees() {
  // Sugar palms flank the entrance avenue, stopping short of the plaza so the
  // Great Hall is framed rather than blocked.
  // Sugar palms stand around the entrance forecourt, as in the entry photo.
  const palms: { pos: [number, number, number]; seed: number }[] = [];
  for (let i = 0; i < 4; i++) {
    palms.push({ pos: [-24 - i * 9, 0, 150 - i * 5], seed: i * 3 + 1 });
    palms.push({ pos: [24 + i * 9, 0, 150 - i * 5], seed: i * 3 + 2 });
  }
  const trees: { pos: [number, number, number]; seed: number }[] = [];
  // the tree-lined road that runs up the west side of the lawn
  for (let i = 0; i < 12; i++) trees.push({ pos: [-66, 0, 132 - i * 12], seed: 40 + i });
  // both sides of the road east to the car park
  for (let i = 0; i < 8; i++) {
    trees.push({ pos: [46, 0, 132 - i * 13], seed: 60 + i });
    trees.push({ pos: [128, 0, 120 - i * 13], seed: 70 + i });
  }
  // between the parking bays, and along the hall's plaza
  for (let i = 0; i < 6; i++) trees.push({ pos: [64, 0, 106 - i * 14], seed: 80 + i });
  for (let i = 0; i < 6; i++) trees.push({ pos: [-40 + i * 16, 0, 30], seed: 100 + i });
  // the far edge of the lawn, in front of the teaching block
  for (let i = 0; i < 7; i++) trees.push({ pos: [-52 + i * 17, 0, 44], seed: 120 + i });
  return { palms, trees };
}

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

const PALM_LOOK: PlantLook = { form: "palm", leaf: "#3f8a44", leaf2: "#57a052", bark: "#9a7b4a" };
const SHADE_SHAPE: TreeShape = { spread: 0.9, levels: 3, children: 3, trunkFrac: 0.38, girth: 1.1, clump: 2.6 };
const SHADE_LOOK: PlantLook = {
  form: "broadleaf", leaf: "#3f7a34", leaf2: "#55953f", bark: "#6b5340", shape: SHADE_SHAPE,
};

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
  const { palms, trees } = useMemo(() => siteTrees(), []);
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

      {/* entrance forecourt + avenue */}
      {/* entrance forecourt */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, GROUND.plaza, 152]} receiveShadow>
        <circleGeometry args={[30, 40]} />
        <meshStandardMaterial map={pave} roughness={1} {...LIFT.plaza} />
      </mesh>
      {/* the road across the front of the monument, and the one east to the car park */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[20, GROUND.road, 138]} receiveShadow>
        <planeGeometry args={[260, 14]} />
        <meshStandardMaterial map={road} roughness={1} {...LIFT.road} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[112, GROUND.road, 74]} receiveShadow>
        <planeGeometry args={[14, 140]} />
        <meshStandardMaterial map={road} roughness={1} {...LIFT.road} />
      </mesh>
      {/* the great hall's plaza */}
      {/* the Great Hall's plaza */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[92, GROUND.plaza, 6]} receiveShadow>
        <planeGeometry args={[110, 96]} />
        <meshStandardMaterial map={pave} roughness={1} {...LIFT.plaza} />
      </mesh>
      {/* ring road along the west + the car park apron */}
      {/* the tree-lined road up the west side */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-58, GROUND.road, 60]} receiveShadow>
        <planeGeometry args={[13, 190]} />
        <meshStandardMaterial map={road} roughness={1} {...LIFT.road} />
      </mesh>
      {/* the car park apron */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[94, GROUND.apron, 74]} receiveShadow>
        <planeGeometry args={[76, 84]} />
        <meshStandardMaterial map={road} roughness={1} {...LIFT.apron} />
      </mesh>

      {/* --- the buildings: tapping one opens its own page --- */}
      {/* 1 — you arrive here, looking north across the lawn */}
      <Tappable id="gate" onOpen={onOpenBuilding}>
        <EntranceMonument position={[0, 0, 152]} rotation={Math.PI} />
      </Tappable>
      {/* the teaching block closes the far side of the lawn, with the
          part-built block beside it — the view from the entrance */}
      <Tappable id="teaching" onOpen={onOpenBuilding}>
        <TeachingBlock position={[-6, 0, 12]} rotation={0} w={86} d={16} floors={4} />
      </Tappable>
      <Tappable id="construction" onOpen={onOpenBuilding}>
        <ConstructionBlock position={[-84, 0, 12]} w={46} d={18} floors={5} />
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
        <SportsField position={[-104, 0, 104]} rx={42} rz={36} />
      </Tappable>

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
