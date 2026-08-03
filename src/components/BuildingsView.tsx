import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Sky } from "@react-three/drei";
import { createXRStore, XR, XROrigin, useXR } from "@react-three/xr";
import { ACESFilmicToneMapping, type Texture } from "three";
import { FirstPersonControls, type WalkInput } from "./FirstPersonControls";
import { WalkControls } from "./WalkControls";
import {
  GreatHall, TeachingBlock, EntranceMonument, Shrine, ParkingCanopy, SportsField,
  ConstructionBlock, Props, MainGate,
} from "./CampusBuildings";
import { grassTexture, metresRepeat } from "../lib/groundTexture";
import { paveTexture, roadTexture, hedgeTexture } from "../lib/campusTexture";
import { buildingsOfSite, NUM_SITE, type Site } from "../buildings";
import { Forest, type TreeDef } from "./Forest";
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

/**
 * The road network — edited visually in `public/campus-editor.html` (drag
 * buildings/roads, export JSON, paste the result here). Each segment is just
 * two endpoints and a width, so it can point any direction, not only along
 * the X/Z axes — `RoadSegment` below turns that into an oriented plane.
 */
type RoadDef = { id: string; kind: "road" | "walkway"; widthM: number; from: [number, number]; to: [number, number] };
const ROADS: RoadDef[] = [
  { id: "avenue-lane-out", kind: "road", widthM: 14, from: [-10, 152], to: [-3, 249] },
  { id: "avenue-walk-l", kind: "walkway", widthM: 2.3, from: [-18, 152.7], to: [-11, 249.7] },
  { id: "avenue-walk-r", kind: "walkway", widthM: 2.3, from: [-3.1, 151.3], to: [3.9, 248.3] },
  { id: "south-perimeter", kind: "road", widthM: 10, from: [-140.1, 148.9], to: [178.7, 145.9] },
  { id: "north-perimeter", kind: "road", widthM: 10, from: [-138.5, -115.6], to: [128.2, -132.5] },
  { id: "west-perimeter", kind: "road", widthM: 9.5, from: [-139, -119.6], to: [-138.5, 154.1] },
  { id: "east-perimeter", kind: "road", widthM: 10, from: [122.7, -138.1], to: [174, 150] },
  { id: "middle-horiz", kind: "road", widthM: 10, from: [-135.5, 35], to: [150.4, 34.5] },
  { id: "central-vert", kind: "road", widthM: 10, from: [20.5, -118.2], to: [21.5, 142.8] },
  { id: "road-jcrjrw", kind: "road", widthM: 10, from: [16.9, -69.5], to: [-90.5, -69] },
  { id: "road-b14lw1", kind: "road", widthM: 10, from: [-95, 33], to: [-95, -112] },
  { id: "road-upcm9l", kind: "road", widthM: 10, from: [101, 39], to: [102.5, 142.4] },
  { id: "road-xlueh9", kind: "road", widthM: 10, from: [17.4, -39.2], to: [-90.1, -39.6] },
];

/**
 * Boundary walls. Same two-endpoint shape as a road — a wall is a road that
 * stands up — plus the height to extrude it to.
 */
type WallDef = { id: string; widthM: number; heightM: number; from: [number, number]; to: [number, number] };
const WALLS: WallDef[] = [
  { id: "wall-ubcfdu", widthM: 0.5, heightM: 2.4, from: [-20, 162.7], to: [-15.3, 250.8] },
  { id: "wall-upehtn", widthM: 0.5, heightM: 2.4, from: [2.1, 162.8], to: [8.7, 248.6] },
  { id: "wall-38v12i", widthM: 0.5, heightM: 2.4, from: [0.9, 163.2], to: [183.2, 161.6] },
  { id: "wall-gzpyay", widthM: 0.5, heightM: 2.4, from: [182.7, 161.7], to: [129, -137.8] },
  { id: "wall-vsoh40", widthM: 0.5, heightM: 2.4, from: [-131, -119.9], to: [130, -138.3] },
  { id: "wall-v939fs", widthM: 0.5, heightM: 2.4, from: [-145.4, 163.7], to: [-145.9, -118.9] },
  { id: "wall-psu6uu", widthM: 0.5, heightM: 2.4, from: [-144.9, 164.2], to: [-19.4, 164.2] },
];

/** Water. Position/rotation/size come straight from the editor's footprint. */
type PoolDef = { id: string; position: [number, number]; rotation: number; size: [number, number] };
const POOLS: PoolDef[] = [
  { id: "pool-ani4gy", position: [-116.2, -24.7], rotation: 0, size: [30, 93.8] },
];

/**
 * Every solid thing's plan footprint, so planting can be kept off it. Mirrors
 * the buildings placed in the scene below (plus the pool) — when you move a
 * building, move its footprint too, and the trees re-flow around it instead of
 * being left standing inside a wall.
 */
type Footprint = { x: number; z: number; w: number; d: number; rot: number };
const FOOTPRINTS: Footprint[] = [
  { x: -3, z: 249, w: 15, d: 6, rot: 3.07 },            // gate
  { x: -12, z: 126.5, w: 6, d: 6, rot: 3.142 },         // monument
  { x: -16, z: -90.1, w: 53, d: 16.1, rot: 0 },         // teaching
  { x: -66, z: -89.5, w: 42, d: 16.1, rot: 0 },         // construction
  { x: 40.1, z: 91.2, w: 92.5, d: 12.4, rot: 1.567 },   // canopy 1
  { x: 59.9, z: 90.2, w: 79.2, d: 12.5, rot: 1.567 },   // canopy 2
  { x: 81.5, z: 89.7, w: 86.4, d: 12.5, rot: 1.567 },   // canopy 3
  { x: 63.2, z: -49.4, w: 50.3, d: 76.8, rot: 0 },      // great hall
  { x: 83.8, z: 6.3, w: 8, d: 8, rot: 0 },              // shrine
  { x: -55.7, z: 79, w: 120.4, d: 66, rot: 0 },         // sports field
  { x: -64.4, z: 158.5, w: 12, d: 6, rot: 0 },          // sport bathroom
  { x: -116.2, z: -24.7, w: 30, d: 93.8, rot: 0 },      // pool
];

/** Is (px,pz) inside a footprint, allowing `margin` metres of clearance? */
function insideFootprint(px: number, pz: number, f: Footprint, margin: number): boolean {
  const c = Math.cos(f.rot), s = Math.sin(f.rot);
  const dx = px - f.x, dz = pz - f.z;
  const lx = dx * c + dz * s;   // world → the footprint's own frame
  const lz = -dx * s + dz * c;
  return Math.abs(lx) <= f.w / 2 + margin && Math.abs(lz) <= f.d / 2 + margin;
}

/** Shortest distance from (px,pz) to the segment a→b. */
function distToSegment(px: number, pz: number, a: [number, number], b: [number, number]): number {
  const vx = b[0] - a[0], vz = b[1] - a[1];
  const len2 = vx * vx + vz * vz;
  const t = len2 > 0 ? Math.max(0, Math.min(1, ((px - a[0]) * vx + (pz - a[1]) * vz) / len2)) : 0;
  return Math.hypot(px - (a[0] + t * vx), pz - (a[1] + t * vz));
}

/** Somewhere a tree must not stand: on a building, in the pool, or on paving. */
function isObstructed(px: number, pz: number): boolean {
  for (const f of FOOTPRINTS) if (insideFootprint(px, pz, f, 3)) return true;
  for (const r of ROADS) if (distToSegment(px, pz, r.from, r.to) < r.widthM / 2 + 2.5) return true;
  for (const w of WALLS) if (distToSegment(px, pz, w.from, w.to) < 2) return true;
  return false;
}

/** One road/walkway segment, oriented to point from `from` to `to`. */
function RoadSegment({
  from, to, widthM, kind, roadTex, walkTex,
}: RoadDef & { roadTex: Texture; walkTex: Texture }) {
  const dx = to[0] - from[0];
  const dz = to[1] - from[1];
  const length = Math.hypot(dx, dz);
  const angle = Math.atan2(dx, dz); // rotation.y that points local +Z at (dx, dz)
  const midX = (from[0] + to[0]) / 2;
  const midZ = (from[1] + to[1]) / 2;
  const isWalk = kind === "walkway";
  return (
    <group position={[midX, 0, midZ]} rotation={[0, angle, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, isWalk ? GROUND.plaza : GROUND.road, 0]} receiveShadow>
        <planeGeometry args={[widthM, length]} />
        <meshStandardMaterial map={isWalk ? walkTex : roadTex} roughness={1} {...(isWalk ? LIFT.plaza : LIFT.road)} />
      </mesh>
    </group>
  );
}

/**
 * A boundary wall: the same oriented-segment maths as `RoadSegment`, but the
 * plane becomes a box standing `heightM` tall. Zero-length segments (an
 * accidental double-click in the editor) would make degenerate geometry, so
 * they are skipped rather than drawn.
 */
function WallSegment({ from, to, widthM, heightM }: WallDef) {
  const dx = to[0] - from[0];
  const dz = to[1] - from[1];
  const length = Math.hypot(dx, dz);
  if (length < 0.5) return null;
  const angle = Math.atan2(dx, dz);
  return (
    <group position={[(from[0] + to[0]) / 2, 0, (from[1] + to[1]) / 2]} rotation={[0, angle, 0]}>
      <mesh position={[0, heightM / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[widthM, heightM, length]} />
        <meshStandardMaterial color="#cdbfae" roughness={0.95} />
      </mesh>
      {/* a darker coping course so the top edge reads at distance */}
      <mesh position={[0, heightM + 0.06, 0]} castShadow>
        <boxGeometry args={[widthM + 0.18, 0.12, length]} />
        <meshStandardMaterial color="#a89a86" roughness={0.9} />
      </mesh>
    </group>
  );
}

/**
 * A pool: a water surface inside a shallow paved coping. Flat like a road, so
 * it uses the same lift/polygon-offset discipline to stay out of the ground
 * plane's z-fight. Kept to plain materials — no reflection pass — so it stays
 * inside the low-end-phone budget.
 */
function Pool({ position, rotation, size }: PoolDef) {
  const [w, d] = size;
  return (
    <group position={[position[0], 0, position[1]]} rotation={[0, rotation, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, GROUND.apron, 0]} receiveShadow>
        <planeGeometry args={[w + 3, d + 3]} />
        <meshStandardMaterial color="#cfc9bd" roughness={1} {...LIFT.apron} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, GROUND.plaza, 0]} receiveShadow>
        <planeGeometry args={[w, d]} />
        <meshStandardMaterial color="#3d7f96" roughness={0.14} metalness={0.5} {...LIFT.plaza} />
      </mesh>
    </group>
  );
}

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

function CampusWorld({ mode, onOpenBuilding }: { mode: ViewMode; onOpenBuilding: (id: string, room?: string) => void }) {
  const grass = useMemo(() => grassTexture(46), []);
  const pave = useMemo(() => paveTexture(metresRepeat(104, 104, PAVER_M)[0]), []);
  const road = useMemo(() => roadTexture(metresRepeat(120, 120, PAVER_M)[0]), []);
  const hedge = useMemo(() => hedgeTexture(), []);
  const ultra = mode === "ultra";

  /**
   * Planting is *derived from the roads*, not hand-placed: walk each road,
   * drop a tree either side of it, and throw away any that would land on a
   * building, in the pool, on other paving or against a wall. That is why a
   * layout change re-flows the planting instead of leaving trees standing in
   * the middle of the pitch.
   */
  const trees = useMemo<TreeDef[]>(() => {
    const list: TreeDef[] = [];
    let s = 12;
    const rnd = (min: number, max: number) => {
      s = (s * 1103515245 + 12345) & 0x7fffffff;
      return min + (s / 0x7fffffff) * (max - min);
    };
    const SPACING = 18;
    for (const r of ROADS) {
      if (r.kind === "walkway") continue; // the avenue's walkways get palms instead
      const vx = r.to[0] - r.from[0], vz = r.to[1] - r.from[1];
      const len = Math.hypot(vx, vz);
      if (len < 1) continue;
      const ux = vx / len, uz = vz / len;      // along the road
      const nx = -uz, nz = ux;                 // across it
      const off = r.widthM / 2 + 5;
      for (let t = SPACING / 2; t < len; t += SPACING) {
        for (const side of [-1, 1]) {
          const x = r.from[0] + ux * t + nx * off * side + rnd(-1.5, 1.5);
          const z = r.from[1] + uz * t + nz * off * side + rnd(-1.5, 1.5);
          if (isObstructed(x, z)) continue;
          list.push({ x, z, s: rnd(6, 11), c: "#4a783c" });
        }
      }
    }
    return list;
  }, []);

  // Street furniture, likewise placed off the layout rather than fixed
  // coordinates: bollards line the entrance avenue, lamps line the main
  // east–west road through the middle of the campus.
  const bollards = useMemo(() => {
    const out: { pos: [number, number, number] }[] = [];
    const avenue = ROADS.find((r) => r.id === "avenue-lane-out");
    if (!avenue) return out;
    const vx = avenue.to[0] - avenue.from[0], vz = avenue.to[1] - avenue.from[1];
    const len = Math.hypot(vx, vz);
    const ux = vx / len, uz = vz / len;
    const nx = -uz, nz = ux;
    const off = avenue.widthM / 2 + 1.5;
    for (let t = 4; t < len; t += 6) {
      for (const side of [-1, 1]) {
        out.push({ pos: [avenue.from[0] + ux * t + nx * off * side, 0.55, avenue.from[1] + uz * t + nz * off * side] });
      }
    }
    return out;
  }, []);
  const lamps = useMemo(() => {
    const out: { pos: [number, number, number] }[] = [];
    const mid = ROADS.find((r) => r.id === "middle-horiz");
    if (!mid) return out;
    const off = mid.widthM / 2 + 2;
    for (let x = mid.from[0] + 20; x < mid.to[0]; x += 26) {
      for (const side of [-1, 1]) {
        const z = mid.from[1] + off * side;
        if (isObstructed(x, z)) continue;
        out.push({ pos: [x, 2.6, z] });
      }
    }
    return out;
  }, []);

  // Sugar palms line the entrance avenue, following it wherever it points.
  const palms = useMemo(() => {
    const list: [number, number, number][] = [];
    const avenue = ROADS.find((r) => r.id === "avenue-lane-out");
    if (!avenue) return list;
    const vx = avenue.to[0] - avenue.from[0], vz = avenue.to[1] - avenue.from[1];
    const len = Math.hypot(vx, vz);
    const ux = vx / len, uz = vz / len;
    const nx = -uz, nz = ux;
    const off = avenue.widthM / 2 + 5.5;
    for (let t = 8; t < len - 4; t += 16) {
      for (const side of [-1, 1]) {
        list.push([avenue.from[0] + ux * t + nx * off * side, 0, avenue.from[1] + uz * t + nz * off * side]);
      }
    }
    return list;
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

      {/* --- Ground works (see the arrays above — edit visually in public/campus-editor.html) --- */}
      {ROADS.map((r) => (
        <RoadSegment key={r.id} {...r} roadTex={road} walkTex={pave} />
      ))}
      {POOLS.map((p) => (
        <Pool key={p.id} {...p} />
      ))}
      {WALLS.map((w) => (
        <WallSegment key={w.id} {...w} />
      ))}

      {/* --- the buildings: tapping one opens its own page --- */}
      <Tappable id="gate" onOpen={onOpenBuilding}>
        <MainGate position={[-3, 0, 249]} rotation={3.07} />
      </Tappable>
      {/* The NUM Monument sign near the forecourt */}
      <EntranceMonument position={[-12, 0, 126.5]} rotation={3.142} />
      <Tappable id="teaching" onOpen={onOpenBuilding}>
        <TeachingBlock position={[-16, 0, -90.1]} w={53} d={16.1} floors={4} onRoomClick={(r: string) => onOpenBuilding('teaching', r)} />
      </Tappable>
      <Tappable id="construction" onOpen={onOpenBuilding}>
        <ConstructionBlock position={[-66, 0, -89.5]} w={42} d={16.1} floors={5} />
      </Tappable>
      <Tappable id="parking" onOpen={onOpenBuilding}>
        <ParkingCanopy position={[40.1, 0, 91.2]} rotation={1.567} length={92.5} width={12.4} />
        <ParkingCanopy position={[59.9, 0, 90.2]} rotation={1.567} length={79.2} width={12.5} />
        <ParkingCanopy position={[81.5, 0, 89.7]} rotation={1.567} length={86.4} width={12.5} />
      </Tappable>
      <Tappable id="hall" onOpen={onOpenBuilding}>
        <GreatHall position={[63.2, 0, -49.4]} w={50.3} d={76.8} />
      </Tappable>
      <Tappable id="shrine" onOpen={onOpenBuilding}>
        <Shrine position={[83.8, 0, 6.3]} />
      </Tappable>
      <Tappable id="field" onOpen={onOpenBuilding}>
        <SportsField position={[-55.7, 0, 79]} w={120.4} d={66} />
      </Tappable>
      {/* Sport Bathroom — a toilet block by the sports field. Added in the
          editor, so it has no entry in src/buildings.ts and no page of its own
          yet; drawn as scenery rather than made tappable. It borrows the
          TeachingBlock component (the closest thing that exists) at
          single-storey, bathroom scale. */}
      <TeachingBlock position={[-64.4, 0, 158.5]} w={12} d={6} floors={1} tower={false} />

      {/* --- planting --- */}
      <Forest trees={trees} />
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
      {/* clipped hedge beds flanking the monument at the head of the avenue */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[-12 + s * 17, 0.5, 126.5]} castShadow receiveShadow>
          <boxGeometry args={[16, 1, 4]} />
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
