import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Sky } from "@react-three/drei";
import { createXRStore, XR, useXR } from "@react-three/xr";
import {
  ACESFilmicToneMapping, Path, Shape, ShapeGeometry,
  Float32BufferAttribute, type Texture,
} from "three";
import { FirstPersonControls, type WalkInput } from "./FirstPersonControls";
import { WalkControls } from "./WalkControls";
import { VRRig } from "./VRRig";
import {
  GreatHall, TeachingBlock, EntranceMonument, Shrine, ParkingCanopy, SportsField,
  ConstructionBlock, Props, MainGate, Pool,
} from "./CampusBuildings";
import { grassTexture, metresRepeat } from "../lib/groundTexture";
import { paveTexture, roadTexture, hedgeTexture } from "../lib/campusTexture";
import { buildingsOfSite, NUM_SITE, type Site } from "../buildings";
import {
  CAMPUS_BUILDINGS, CAMPUS_POOLS, CAMPUS_ROADS, CAMPUS_WALLS,
  sizeOf, type LayoutRect, type LayoutSegment,
} from "../campusLayout";
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

/**
 * How tall the campus trees stand, in metres.
 *
 * `Forest` takes an overall *scale*, not a height: a tree's crown tops out at
 * 1.95 × that scale (the highest canopy blob sits at 1.15 + 0.5 with a 0.6
 * radius, all × scale). So converting metres → scale keeps the number here
 * meaningful instead of an arbitrary multiplier.
 */
// const TREE_HEIGHT_M = 5.5;
// const TREE_CROWN_PER_SCALE = 1.95;
// const TREE_SCALE = TREE_HEIGHT_M / TREE_CROWN_PER_SCALE;

/**
 * The ground plan lives in `campusLayout.ts` — see the note there. These are
 * just local aliases so the rendering code below reads the same as before.
 */
const ROADS = CAMPUS_ROADS;
const WALLS = CAMPUS_WALLS;
const POOLS = CAMPUS_POOLS;
type RoadDef = LayoutSegment;
type WallDef = LayoutSegment;

/**
 * Every solid thing's plan footprint, so planting can be kept off it — read
 * straight off the shared layout, so moving a building in the editor moves
 * the keep-out with it and the trees re-flow instead of standing in a wall.
 */
const FOOTPRINTS: LayoutRect[] = [...CAMPUS_BUILDINGS, ...CAMPUS_POOLS];

/** Is (px,pz) inside a footprint, allowing `margin` metres of clearance? */
function insideFootprint(px: number, pz: number, f: LayoutRect, margin: number): boolean {
  const [w, d] = sizeOf(f);
  const c = Math.cos(f.rotation), s = Math.sin(f.rotation);
  const dx = px - f.position[0], dz = pz - f.position[2];
  const lx = dx * c + dz * s;   // world → the footprint's own frame
  const lz = -dx * s + dz * c;
  return Math.abs(lx) <= w / 2 + margin && Math.abs(lz) <= d / 2 + margin;
}

/** Shortest distance from (px,pz) to the segment a→b. */
function distToSegment(px: number, pz: number, a: [number, number], b: [number, number]): number {
  const vx = b[0] - a[0], vz = b[1] - a[1];
  const len2 = vx * vx + vz * vz;
  const t = len2 > 0 ? Math.max(0, Math.min(1, ((px - a[0]) * vx + (pz - a[1]) * vz) / len2)) : 0;
  return Math.hypot(px - (a[0] + t * vx), pz - (a[1] + t * vz));
}

/** Somewhere a tree must not stand: on a building, in the pool, or on paving. */
function isObstructed(px: number, pz: number, extraMargin = 0): boolean {
  for (const f of FOOTPRINTS) if (insideFootprint(px, pz, f, 3 + extraMargin)) return true;
  for (const r of ROADS) if (distToSegment(px, pz, r.from, r.to) < r.widthM / 2 + 2.5 + extraMargin) return true;
  for (const w of WALLS) if (distToSegment(px, pz, w.from, w.to) < 2 + extraMargin) return true;
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
function WallSegment({ from, to, widthM, heightM = 4 }: WallDef) {
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
/**
 * The four world-space corners of a rect in the layout, in order. Used to cut
 * the pool's opening out of the lawn so the basin below is actually visible.
 */
function rectCorners(b: LayoutRect): [number, number][] {
  const [w, d] = sizeOf(b);
  const c = Math.cos(b.rotation), s = Math.sin(b.rotation);
  const cx = b.position[0], cz = b.position[2];
  return ([[-1, -1], [1, -1], [1, 1], [-1, 1]] as const).map(([sx_, sz_]) => {
    const lx = (sx_ * w) / 2, lz = (sz_ * d) / 2;
    return [cx + lx * c - lz * s, cz + lx * s + lz * c] as [number, number];
  });
}

/** Places the shared `Pool` basin at its spot on the campus ground stack. */
function CampusPool({ position, rotation, size }: LayoutRect) {
  const [w, d] = size ?? [10, 10];
  return (
    <group position={[position[0], 0, position[2]]} rotation={[0, rotation, 0]}>
      <Pool w={w} d={d} topY={GROUND.apron} />
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
  // r3f's onClick fires on pointerup with no drag threshold, so an orbit-drag
  // that happens to end over a building would open it. Track the pointerdown
  // spot and only treat it as a tap if the pointer barely moved.
  const down = useRef<{ x: number; y: number } | null>(null);
  return (
    <group
      onPointerDown={(e) => { down.current = { x: e.clientX, y: e.clientY }; }}
      onPointerUp={(e) => {
        const start = down.current;
        down.current = null;
        if (start && Math.hypot(e.clientX - start.x, e.clientY - start.y) < 6) {
          e.stopPropagation();
          onOpen(id);
        }
      }}
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

  /**
   * The lawn, with a hole cut for each pool.
   *
   * `ShapeGeometry` lays the shape out in XY and the mesh is rotated -90° about
   * X, which maps shape-Y to world -Z — hence the sign flip when placing the
   * holes. Its generated UVs are raw shape coordinates, so they are rewritten
   * to 0..1 across the sheet to match what `planeGeometry` gave the grass
   * texture before; otherwise the tiling would blow up by a factor of 1400.
   */
  const lawnGeo = useMemo(() => {
    const HALF = 700;
    const outline = new Shape();
    outline.moveTo(-HALF, -HALF);
    outline.lineTo(HALF, -HALF);
    outline.lineTo(HALF, HALF);
    outline.lineTo(-HALF, HALF);
    outline.closePath();

    for (const p of CAMPUS_POOLS) {
      const corners = rectCorners(p);
      const hole = new Path();
      // Reversed: a hole must wind opposite to the outline it is cut from.
      const [c0, c1, c2, c3] = corners;
      hole.moveTo(c0[0], -c0[1]);
      hole.lineTo(c3[0], -c3[1]);
      hole.lineTo(c2[0], -c2[1]);
      hole.lineTo(c1[0], -c1[1]);
      hole.closePath();
      outline.holes.push(hole);
    }

    const geo = new ShapeGeometry(outline);
    const pos = geo.attributes.position;
    const uv: number[] = [];
    for (let i = 0; i < pos.count; i++) {
      uv.push((pos.getX(i) + HALF) / (HALF * 2), (pos.getY(i) + HALF) / (HALF * 2));
    }
    geo.setAttribute("uv", new Float32BufferAttribute(uv, 2));
    return geo;
  }, []);
  const pave = useMemo(() => paveTexture(metresRepeat(104, 104, PAVER_M)[0]), []);
  const road = useMemo(() => roadTexture(metresRepeat(120, 120, PAVER_M)[0]), []);
  const hedge = useMemo(() => hedgeTexture(), []);
  const ultra = mode === "ultra";

  const { mangoTrees, bananaTrees } = useMemo(() => {
    const mangoes: MangoDef[] = [];
    const bananas: BananaDef[] = [];
    let s = 12;
    const rnd = (min: number, max: number) => {
      s = (s * 1103515245 + 12345) & 0x7fffffff;
      return min + (s / 0x7fffffff) * (max - min);
    };

    const addTree = (x: number, z: number) => {
      if (rnd(0, 1) < 0.3) {
        bananas.push({ x, z });
      } else {
        mangoes.push({ x, z });
      }
    };

    const SPACING = 18;
    for (const r of ROADS) {
      if (r.kind === "walkway") continue;
      const vx = r.to[0] - r.from[0], vz = r.to[1] - r.from[1];
      const len = Math.hypot(vx, vz);
      if (len < 1) continue;
      const ux = vx / len, uz = vz / len;
      const nx = -uz, nz = ux;
      const off = r.widthM / 2 + 5;
      for (let t = SPACING / 2; t < len; t += SPACING) {
        for (const side of [-1, 1]) {
          const x = r.from[0] + ux * t + nx * off * side + rnd(-1.5, 1.5);
          const z = r.from[1] + uz * t + nz * off * side + rnd(-1.5, 1.5);
          if (isObstructed(x, z)) continue;
          addTree(x, z);
        }
      }
    }
    return { mangoTrees: mangoes, bananaTrees: bananas };
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
        const rot = rnd() > 0.5 ? 0 : Math.PI / 2;
        const scale = 0.85 + rnd() * 0.5;

        // Skip if the jittered position (plus the house's own footprint) lands
        // on a road or wall — the house body is ~9x11m, so clear by its half-diagonal.
        if (isObstructed(px, pz, 6.5 * scale)) continue;

        out.push({ pos: [px, 0, pz], rot, scale });
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

      {/* ground: lawn everywhere, then paving laid over it. The lawn carries a
          hole per pool — without one the grass plane, being solid, would draw
          straight across the top of the basin and you would never see into it. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, GROUND.lawn, 0]} geometry={lawnGeo} receiveShadow>
        <meshStandardMaterial map={grass} roughness={1} />
      </mesh>

      {/* --- Ground works (see the arrays above — edit visually in public/campus-editor.html) --- */}
      {ROADS.map((r) => (
        <RoadSegment key={r.id} {...r} roadTex={road} walkTex={pave} />
      ))}
      {POOLS.map((p) => (
        <Tappable key={p.id} id="pool" onOpen={onOpenBuilding}>
          <CampusPool {...p} />
        </Tappable>
      ))}
      {WALLS.map((w) => (
        <WallSegment key={w.id} {...w} />
      ))}

      {/* --- the buildings: tapping one opens its own page --- */}
      <Tappable id="gate" onOpen={onOpenBuilding}>
        <MainGate position={[-3, 0, 249]} rotation={3.07} />
      </Tappable>
      {/* The NUM Monument sign where the avenue meets the campus */}
      <Tappable id="monument" onOpen={onOpenBuilding}>
        <EntranceMonument position={[-12, 0, 126.5]} rotation={3.142} />
      </Tappable>
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
      {/* Added in the editor and since registered in src/buildings.ts, so these
          have their own pages and landmark buttons like everything else. The
          bathroom borrows the TeachingBlock component — the closest thing that
          exists — at single-storey scale. */}
      <Tappable id="sport-bathroom" onOpen={onOpenBuilding}>
        <TeachingBlock position={[-56.2, 0, 158]} w={38.6} d={8} floors={1} tower={false} />
      </Tappable>
      {/* A second gate, where the middle road meets the western boundary. */}
      <Tappable id="west-gate" onOpen={onOpenBuilding}>
        <MainGate position={[-128.5, 0, 34.6]} rotation={-1.58} />
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
