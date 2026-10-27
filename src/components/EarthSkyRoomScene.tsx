import { useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import {
  MeshStandardMaterial, MeshBasicMaterial, CanvasTexture,
  DoubleSide, Group, SRGBColorSpace, Vector3,
} from "three";
import type { MutableRefObject } from "react";
import { FirstPersonControls, type WalkInput } from "./FirstPersonControls";
import { EarthSkyBlenderProp } from './EarthSkyBlenderProp';

const W = 14;
const D = 12;
const H = 4;
const WALL_T = 0.15;
const TABLE_H = 0.85;

export interface Station {
  id: string;
  label: string;
  icon: string;
  kind: "interact" | "info";
  at: [number, number, number];
  description: string;
}

export const STATIONS: Station[] = [
  { id: "solar-system", label: "Solar System", icon: "☀️", kind: "interact", at: [0, TABLE_H + 0.5, -D / 2 + 1.8], description: "Explore the planets orbiting our Sun" },
  { id: "earth-layers", label: "Earth Layers", icon: "🌍", kind: "interact", at: [-4.5, TABLE_H + 0.5, -D / 2 + 1.8], description: "See inside the Earth from crust to core" },
  { id: "day-night", label: "Day & Night", icon: "🌗", kind: "interact", at: [4.5, TABLE_H + 0.5, -D / 2 + 1.8], description: "How Earth's rotation creates day and night" },
  { id: "moon-phases", label: "Moon Phases", icon: "🌙", kind: "interact", at: [-5.5, TABLE_H + 0.5, 0], description: "Why the Moon changes shape each month" },
  { id: "seasons", label: "Seasons", icon: "🍂", kind: "interact", at: [5.5, TABLE_H + 0.5, 0], description: "How axial tilt creates the seasons" },
  { id: "tides", label: "Tides", icon: "🌊", kind: "interact", at: [0, TABLE_H + 0.5, D / 2 - 1.8], description: "How the Moon pulls on our oceans" },
];

// ── Materials (module-scope, shared) ─────────────────────────

const mFloor = new MeshStandardMaterial({ color: "#1a1e28", roughness: 0.8 });
const mCeiling = new MeshStandardMaterial({ color: "#0a0e18", roughness: 0.9 });
const mWall = new MeshStandardMaterial({ color: "#0e1424", roughness: 0.7, side: DoubleSide });
const mTable = new MeshStandardMaterial({ color: "#2a3040", roughness: 0.4, metalness: 0.5 });
const mTableLeg = new MeshStandardMaterial({ color: "#222830", roughness: 0.5, metalness: 0.4 });
const mGlowIdle = new MeshBasicMaterial({ color: "#4080ff", transparent: true, opacity: 0.5 });
const mGlowActive = new MeshBasicMaterial({ color: "#60c0ff", transparent: true, opacity: 0.85 });

// Planet materials
const mSun = new MeshBasicMaterial({ color: "#ffcc40" });
const mMercury = new MeshStandardMaterial({ color: "#a0a0a0", roughness: 0.6 });
const mVenus = new MeshStandardMaterial({ color: "#e8c060", roughness: 0.5 });
const mEarth = new MeshStandardMaterial({ color: "#4080d0", roughness: 0.4 });
const mMars = new MeshStandardMaterial({ color: "#c06030", roughness: 0.5 });
const mSaturn = new MeshStandardMaterial({ color: "#e0c880", roughness: 0.5 });
const mMoon = new MeshStandardMaterial({ color: "#c0c0b0", roughness: 0.7 });
const mRing = new MeshStandardMaterial({ color: "#d0c888", roughness: 0.3, transparent: true, opacity: 0.6, side: DoubleSide });

// Prop materials
const mCrust = new MeshStandardMaterial({ color: "#8a7a60", roughness: 0.6 });
const mMantle = new MeshStandardMaterial({ color: "#c06830", roughness: 0.5 });
const mCore = new MeshStandardMaterial({ color: "#f0c040", roughness: 0.4 });
const mWater = new MeshStandardMaterial({ color: "#3060c0", roughness: 0.2, transparent: true, opacity: 0.5 });
const mStand = new MeshStandardMaterial({ color: "#3a3e48", roughness: 0.4, metalness: 0.6 });

// ── Room shell ───────────────────────────────────────────────

function RoomShell() {
  return (
    <group>
      {/* Floor */}
      <mesh rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[W, D]} />
        <primitive object={mFloor} attach="material" />
      </mesh>
      {/* Ceiling */}
      <mesh rotation-x={Math.PI / 2} position-y={H}>
        <planeGeometry args={[W, D]} />
        <primitive object={mCeiling} attach="material" />
      </mesh>
      {/* Back wall */}
      <mesh position={[0, H / 2, -D / 2]}>
        <boxGeometry args={[W, H, WALL_T]} />
        <primitive object={mWall} attach="material" />
      </mesh>
      {/* Front wall */}
      <mesh position={[0, H / 2, D / 2]}>
        <boxGeometry args={[W, H, WALL_T]} />
        <primitive object={mWall} attach="material" />
      </mesh>
      {/* Left wall */}
      <mesh position={[-W / 2, H / 2, 0]}>
        <boxGeometry args={[WALL_T, H, D]} />
        <primitive object={mWall} attach="material" />
      </mesh>
      {/* Right wall */}
      <mesh position={[W / 2, H / 2, 0]}>
        <boxGeometry args={[WALL_T, H, D]} />
        <primitive object={mWall} attach="material" />
      </mesh>
    </group>
  );
}

// ── Furniture ────────────────────────────────────────────────

function DisplayTable({ position, width = 2.2 }: { position: [number, number, number]; width?: number }) {
  return (
    <group position={position}>
      <mesh position={[0, TABLE_H, 0]} castShadow>
        <boxGeometry args={[width, 0.06, 1.0]} />
        <primitive object={mTable} attach="material" />
      </mesh>
      {[[-width / 2 + 0.1, 0, -0.4], [width / 2 - 0.1, 0, -0.4], [-width / 2 + 0.1, 0, 0.4], [width / 2 - 0.1, 0, 0.4]].map((p, i) => (
        <mesh key={i} position={[p[0], TABLE_H / 2, p[2]]} castShadow>
          <boxGeometry args={[0.06, TABLE_H, 0.06]} />
          <primitive object={mTableLeg} attach="material" />
        </mesh>
      ))}
    </group>
  );
}

function SideTable({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, TABLE_H, 0]} castShadow>
        <boxGeometry args={[1.6, 0.06, 0.9]} />
        <primitive object={mTable} attach="material" />
      </mesh>
      {[[-0.65, 0, -0.35], [0.65, 0, -0.35], [-0.65, 0, 0.35], [0.65, 0, 0.35]].map((p, i) => (
        <mesh key={i} position={[p[0], TABLE_H / 2, p[2]]}>
          <boxGeometry args={[0.05, TABLE_H, 0.05]} />
          <primitive object={mTableLeg} attach="material" />
        </mesh>
      ))}
    </group>
  );
}

// ── 3D Station Props ─────────────────────────────────────────

function OrreryProp({ position }: { position: [number, number, number] }) {
  const ref = useRef<Group>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    ref.current.children.forEach((c, i) => {
      if (i > 0) c.rotation.y = clock.elapsedTime * (0.5 / (i * 0.7));
    });
  });
  return (
    <group ref={ref} position={position}>
      {/* Sun */}
      <mesh><sphereGeometry args={[0.15, 12, 12]} /><primitive object={mSun} attach="material" /></mesh>
      {/* Orbiting planets */}
      {[0.35, 0.5, 0.65, 0.85].map((r, i) => (
        <group key={i}>
          <mesh position={[r, 0, 0]}>
            <sphereGeometry args={[0.04 + i * 0.015, 8, 8]} />
            <primitive object={[mMercury, mVenus, mEarth, mMars][i]} attach="material" />
          </mesh>
        </group>
      ))}
      {/* Stand */}
      <mesh position={[0, -0.2, 0]}><cylinderGeometry args={[0.04, 0.04, 0.4, 8]} /><primitive object={mStand} attach="material" /></mesh>
      <mesh position={[0, -0.4, 0]}><cylinderGeometry args={[0.2, 0.2, 0.02, 16]} /><primitive object={mStand} attach="material" /></mesh>
    </group>
  );
}

function EarthCrossSectionProp({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh><sphereGeometry args={[0.22, 16, 16, 0, Math.PI]} /><primitive object={mCrust} attach="material" /></mesh>
      <mesh><sphereGeometry args={[0.17, 16, 16, 0, Math.PI]} /><primitive object={mMantle} attach="material" /></mesh>
      <mesh><sphereGeometry args={[0.08, 12, 12]} /><primitive object={mCore} attach="material" /></mesh>
      <mesh position={[0, -0.15, 0]}><cylinderGeometry args={[0.03, 0.03, 0.3, 8]} /><primitive object={mStand} attach="material" /></mesh>
      <mesh position={[0, -0.3, 0]}><cylinderGeometry args={[0.15, 0.15, 0.02, 12]} /><primitive object={mStand} attach="material" /></mesh>
    </group>
  );
}

function GlobeProp({ position }: { position: [number, number, number] }) {
  const ref = useRef<Group>(null);
  useFrame(({ clock }) => {
    if (ref.current) ref.current.rotation.y = clock.elapsedTime * 0.3;
  });
  return (
    <group position={position}>
      <group ref={ref} rotation-z={0.41}>
        <mesh><sphereGeometry args={[0.18, 16, 16]} /><primitive object={mEarth} attach="material" /></mesh>
        <mesh><sphereGeometry args={[0.185, 16, 16]} /><primitive object={mWater} attach="material" /></mesh>
      </group>
      <mesh rotation-z={0.41}><torusGeometry args={[0.22, 0.008, 8, 32]} /><primitive object={mStand} attach="material" /></mesh>
      <mesh position={[0, -0.18, 0]}><cylinderGeometry args={[0.03, 0.03, 0.36, 8]} /><primitive object={mStand} attach="material" /></mesh>
      <mesh position={[0, -0.36, 0]}><cylinderGeometry args={[0.12, 0.12, 0.02, 12]} /><primitive object={mStand} attach="material" /></mesh>
    </group>
  );
}

function MoonModelProp({ position }: { position: [number, number, number] }) {
  const ref = useRef<Group>(null);
  useFrame(({ clock }) => {
    if (ref.current) {
      const a = clock.elapsedTime * 0.4;
      ref.current.children[1].position.set(Math.cos(a) * 0.35, 0, Math.sin(a) * 0.35);
    }
  });
  return (
    <group ref={ref} position={position}>
      <mesh><sphereGeometry args={[0.12, 12, 12]} /><primitive object={mEarth} attach="material" /></mesh>
      <mesh position={[0.35, 0, 0]}><sphereGeometry args={[0.05, 8, 8]} /><primitive object={mMoon} attach="material" /></mesh>
      <mesh position={[0, -0.15, 0]}><cylinderGeometry args={[0.03, 0.03, 0.3, 8]} /><primitive object={mStand} attach="material" /></mesh>
      <mesh position={[0, -0.3, 0]}><cylinderGeometry args={[0.18, 0.18, 0.02, 12]} /><primitive object={mStand} attach="material" /></mesh>
    </group>
  );
}

function SaturnProp({ position }: { position: [number, number, number] }) {
  const ref = useRef<Group>(null);
  useFrame(({ clock }) => {
    if (ref.current) ref.current.rotation.y = clock.elapsedTime * 0.2;
  });
  return (
    <group ref={ref} position={position}>
      <mesh><sphereGeometry args={[0.16, 12, 12]} /><primitive object={mSaturn} attach="material" /></mesh>
      <mesh rotation-x={Math.PI / 2 - 0.3}><torusGeometry args={[0.28, 0.03, 4, 24]} /><primitive object={mRing} attach="material" /></mesh>
      <mesh position={[0, -0.18, 0]}><cylinderGeometry args={[0.03, 0.03, 0.36, 8]} /><primitive object={mStand} attach="material" /></mesh>
      <mesh position={[0, -0.36, 0]}><cylinderGeometry args={[0.14, 0.14, 0.02, 12]} /><primitive object={mStand} attach="material" /></mesh>
    </group>
  );
}

function TideProp({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh><sphereGeometry args={[0.14, 12, 12]} /><primitive object={mEarth} attach="material" /></mesh>
      <mesh scale={[1.2, 1, 1]}><sphereGeometry args={[0.16, 12, 12]} /><primitive object={mWater} attach="material" /></mesh>
      <mesh position={[0.4, 0, 0]}><sphereGeometry args={[0.05, 8, 8]} /><primitive object={mMoon} attach="material" /></mesh>
      <mesh position={[0, -0.18, 0]}><cylinderGeometry args={[0.03, 0.03, 0.36, 8]} /><primitive object={mStand} attach="material" /></mesh>
      <mesh position={[0, -0.36, 0]}><cylinderGeometry args={[0.18, 0.18, 0.02, 12]} /><primitive object={mStand} attach="material" /></mesh>
    </group>
  );
}

// ── Observation equipment ────────────────────────────────────

function TelescopeProp({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Tripod */}
      {[0, 120, 240].map((a) => {
        const rad = (a * Math.PI) / 180;
        return (
          <mesh key={a} position={[Math.sin(rad) * 0.2, 0.35, Math.cos(rad) * 0.2]}
            rotation={[Math.cos(rad) * 0.25, 0, -Math.sin(rad) * 0.25]}>
            <cylinderGeometry args={[0.015, 0.015, 0.7, 6]} />
            <meshStandardMaterial color="#3a3e48" metalness={0.5} roughness={0.4} />
          </mesh>
        );
      })}
      {/* Tube */}
      <group position={[0, 0.72, 0]} rotation={[0.3, 0.4, 0]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.04, 0.06, 0.5, 12]} />
          <meshStandardMaterial color="#1a2840" metalness={0.6} roughness={0.3} />
        </mesh>
        {/* Lens cap */}
        <mesh position={[0, 0, 0.26]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.06, 0.06, 0.01, 12]} />
          <meshStandardMaterial color="#4080d0" metalness={0.3} roughness={0.2} transparent opacity={0.6} />
        </mesh>
        {/* Eyepiece */}
        <mesh position={[0, 0, -0.28]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.025, 0.02, 0.08, 8]} />
          <meshStandardMaterial color="#2a3048" metalness={0.5} roughness={0.3} />
        </mesh>
      </group>
    </group>
  );
}

function MeteoriteSample({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Display case */}
      <mesh position={[0, 0.02, 0]}>
        <boxGeometry args={[0.18, 0.04, 0.18]} />
        <meshStandardMaterial color="#2a3040" metalness={0.5} roughness={0.3} />
      </mesh>
      {/* Glass dome */}
      <mesh position={[0, 0.1, 0]}>
        <sphereGeometry args={[0.07, 12, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#6090c0" transparent opacity={0.15} roughness={0.1} />
      </mesh>
      {/* Meteorite rock */}
      <mesh position={[0, 0.06, 0]}>
        <dodecahedronGeometry args={[0.04, 0]} />
        <meshStandardMaterial color="#4a3830" roughness={0.8} metalness={0.2} />
      </mesh>
    </group>
  );
}

function AstrolabeProp({ position }: { position: [number, number, number] }) {
  const ref = useRef<Group>(null);
  useFrame(({ clock }) => {
    if (ref.current) ref.current.rotation.z = Math.sin(clock.elapsedTime * 0.3) * 0.1;
  });
  return (
    <group position={position}>
      <group ref={ref}>
        {/* Outer ring */}
        <mesh><torusGeometry args={[0.12, 0.008, 8, 32]} /><meshStandardMaterial color="#c0a050" metalness={0.7} roughness={0.3} /></mesh>
        {/* Inner ring */}
        <mesh rotation-y={Math.PI / 4}><torusGeometry args={[0.09, 0.006, 8, 24]} /><meshStandardMaterial color="#d0b060" metalness={0.6} roughness={0.3} /></mesh>
        {/* Cross bars */}
        <mesh><boxGeometry args={[0.24, 0.005, 0.005]} /><meshStandardMaterial color="#c0a050" metalness={0.6} roughness={0.3} /></mesh>
        <mesh><boxGeometry args={[0.005, 0.24, 0.005]} /><meshStandardMaterial color="#c0a050" metalness={0.6} roughness={0.3} /></mesh>
        {/* Center pivot */}
        <mesh><sphereGeometry args={[0.015, 8, 8]} /><meshStandardMaterial color="#e0c060" metalness={0.7} roughness={0.2} /></mesh>
      </group>
      {/* Stand */}
      <mesh position={[0, -0.06, 0]}>
        <cylinderGeometry args={[0.02, 0.02, 0.12, 8]} />
        <meshStandardMaterial color="#3a3e48" metalness={0.5} roughness={0.4} />
      </mesh>
      <mesh position={[0, -0.12, 0]}>
        <cylinderGeometry args={[0.06, 0.06, 0.01, 12]} />
        <meshStandardMaterial color="#3a3e48" metalness={0.5} roughness={0.4} />
      </mesh>
    </group>
  );
}

// ── Wall art & posters ──────────────────────────────────────

function SolarSystemPoster({ position }: { position: [number, number, number] }) {
  const tex = useMemo(() => {
    const c = document.createElement("canvas"); c.width = 384; c.height = 256;
    const ctx = c.getContext("2d");
    if (!ctx) return null;
    ctx.fillStyle = "#080c1a"; ctx.fillRect(0, 0, 384, 256);
    ctx.fillStyle = "#ffcc40"; ctx.beginPath(); ctx.arc(30, 128, 18, 0, Math.PI * 2); ctx.fill();
    const planets = [
      { x: 65, r: 3, c: "#a0a0a0" }, { x: 85, r: 5, c: "#e8c060" }, { x: 110, r: 5, c: "#4080d0" },
      { x: 135, r: 4, c: "#c06030" }, { x: 180, r: 12, c: "#d0a060" }, { x: 230, r: 10, c: "#e0c880" },
      { x: 290, r: 7, c: "#80c8d8" }, { x: 340, r: 7, c: "#3060c0" },
    ];
    planets.forEach((p) => {
      ctx.strokeStyle = "rgba(60,100,180,.15)"; ctx.lineWidth = 0.5;
      ctx.beginPath(); ctx.arc(30, 128, p.x - 30, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = p.c; ctx.beginPath(); ctx.arc(p.x, 128, p.r, 0, Math.PI * 2); ctx.fill();
    });
    ctx.fillStyle = "#ffffff"; ctx.font = "bold 12px sans-serif"; ctx.textAlign = "center";
    ctx.fillText("THE SOLAR SYSTEM", 192, 20);
    ctx.font = "8px sans-serif"; ctx.fillStyle = "#6090b0";
    ["Mercury", "Venus", "Earth", "Mars", "Jupiter", "Saturn", "Uranus", "Neptune"].forEach((n, i) => {
      ctx.fillText(n, planets[i].x, 128 + planets[i].r + 14);
    });
    const t = new CanvasTexture(c); t.colorSpace = SRGBColorSpace; return t;
  }, []);
  return (
    <mesh position={position}>
      <planeGeometry args={[0.8, 0.55]} />
      {tex ? <meshBasicMaterial map={tex} /> : <meshBasicMaterial color="#080c1a" />}
    </mesh>
  );
}

function ConstellationPoster({ position, rotation }: { position: [number, number, number]; rotation?: [number, number, number] }) {
  const tex = useMemo(() => {
    const c = document.createElement("canvas"); c.width = 256; c.height = 384;
    const ctx = c.getContext("2d");
    if (!ctx) return null;
    ctx.fillStyle = "#060a14"; ctx.fillRect(0, 0, 256, 384);
    ctx.fillStyle = "#ffffff"; ctx.font = "bold 12px sans-serif"; ctx.textAlign = "center";
    ctx.fillText("CONSTELLATIONS", 128, 22);
    const constellations = [
      { name: "Orion", stars: [[100,60],[128,50],[156,60],[128,80],[115,100],[141,100],[128,130],[120,160],[136,160]], lines: [[0,1],[1,2],[1,3],[3,4],[3,5],[3,6],[6,7],[6,8]] },
      { name: "Big Dipper", stars: [[60,210],[90,205],[115,215],[140,220],[145,250],[170,255],[175,230]], lines: [[0,1],[1,2],[2,3],[3,4],[4,5],[5,6]] },
      { name: "Cassiopeia", stars: [[60,310],[90,290],[120,310],[150,290],[180,310]], lines: [[0,1],[1,2],[2,3],[3,4]] },
    ];
    constellations.forEach((con) => {
      ctx.strokeStyle = "rgba(100,160,255,.25)"; ctx.lineWidth = 1;
      con.lines.forEach(([a, b]) => {
        ctx.beginPath(); ctx.moveTo(con.stars[a][0], con.stars[a][1]); ctx.lineTo(con.stars[b][0], con.stars[b][1]); ctx.stroke();
      });
      ctx.fillStyle = "#d0e0ff";
      con.stars.forEach(([x, y]) => { ctx.beginPath(); ctx.arc(x, y, 2, 0, Math.PI * 2); ctx.fill(); });
      ctx.fillStyle = "#6090b0"; ctx.font = "9px sans-serif";
      ctx.fillText(con.name, con.stars[Math.floor(con.stars.length / 2)][0] + 20, con.stars[0][1] - 10);
    });
    const t = new CanvasTexture(c); t.colorSpace = SRGBColorSpace; return t;
  }, []);
  return (
    <mesh position={position} rotation={rotation}>
      <planeGeometry args={[0.5, 0.75]} />
      {tex ? <meshBasicMaterial map={tex} /> : <meshBasicMaterial color="#060a14" />}
    </mesh>
  );
}

function SpaceTimelinePoster({ position, rotation }: { position: [number, number, number]; rotation?: [number, number, number] }) {
  const tex = useMemo(() => {
    const c = document.createElement("canvas"); c.width = 256; c.height = 384;
    const ctx = c.getContext("2d");
    if (!ctx) return null;
    ctx.fillStyle = "#0a0e1a"; ctx.fillRect(0, 0, 256, 384);
    ctx.fillStyle = "#ffffff"; ctx.font = "bold 11px sans-serif"; ctx.textAlign = "center";
    ctx.fillText("SPACE EXPLORATION", 128, 20);
    const events = [
      { y: 50, year: "1957", text: "Sputnik launched" },
      { y: 95, year: "1961", text: "First human in space" },
      { y: 140, year: "1969", text: "Moon landing" },
      { y: 185, year: "1971", text: "First space station" },
      { y: 230, year: "1990", text: "Hubble telescope" },
      { y: 275, year: "2012", text: "Curiosity on Mars" },
      { y: 320, year: "2021", text: "James Webb launched" },
    ];
    ctx.strokeStyle = "rgba(60,100,180,.3)"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(40, 40); ctx.lineTo(40, 350); ctx.stroke();
    events.forEach((e) => {
      ctx.fillStyle = "#4080d0"; ctx.beginPath(); ctx.arc(40, e.y, 4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#a0c0e0"; ctx.font = "bold 9px sans-serif"; ctx.textAlign = "left";
      ctx.fillText(e.year, 52, e.y - 4);
      ctx.fillStyle = "#6090b0"; ctx.font = "8px sans-serif";
      ctx.fillText(e.text, 52, e.y + 8);
    });
    const t = new CanvasTexture(c); t.colorSpace = SRGBColorSpace; return t;
  }, []);
  return (
    <mesh position={position} rotation={rotation}>
      <planeGeometry args={[0.5, 0.75]} />
      {tex ? <meshBasicMaterial map={tex} /> : <meshBasicMaterial color="#0a0e1a" />}
    </mesh>
  );
}

// ── Whiteboard with astronomy formulas ──────────────────────

function AstronomyBoard() {
  const tex = useMemo(() => {
    const c = document.createElement("canvas"); c.width = 512; c.height = 256;
    const ctx = c.getContext("2d");
    if (!ctx) return null;
    ctx.fillStyle = "#0a1020"; ctx.fillRect(0, 0, 512, 256);
    ctx.fillStyle = "rgba(180,200,255,0.85)"; ctx.font = "italic 24px Georgia, serif";
    ctx.fillText("F = Gm₁m₂/r²", 30, 42);
    ctx.fillText("v = √(GM/r)", 30, 84);
    ctx.fillText("T² = (4π²/GM)r³", 30, 126);
    ctx.fillText("E = -GMm/2r", 30, 168);
    ctx.fillStyle = "rgba(255,200,120,0.8)"; ctx.font = "italic 22px Georgia, serif";
    ctx.fillText("g = 9.81 m/s²", 290, 42);
    ctx.fillText("v_esc = √(2GM/R)", 290, 84);
    ctx.fillText("L = mvr", 290, 126);
    ctx.fillText("a³/T² = const", 290, 168);
    ctx.fillStyle = "rgba(140,180,255,0.4)"; ctx.font = "14px sans-serif";
    ctx.fillText("Earth & Sky -- Astronomy & Orbital Mechanics", 100, 230);
    const t = new CanvasTexture(c); t.colorSpace = SRGBColorSpace; return t;
  }, []);
  return (
    <group position={[0, 2.2, -D / 2 + 0.08]}>
      <mesh><boxGeometry args={[3.8, 1.72, 0.04]} /><meshStandardMaterial color="#1a2040" metalness={0.3} roughness={0.5} /></mesh>
      <mesh position={[0, 0, 0.021]}>
        <planeGeometry args={[3.6, 1.6]} />
        {tex ? <meshBasicMaterial map={tex} /> : <meshBasicMaterial color="#0a1020" />}
      </mesh>
      {/* Chalk tray */}
      <mesh position={[0, -0.86, 0.06]}>
        <boxGeometry args={[1.2, 0.03, 0.06]} /><meshStandardMaterial color="#1a2040" metalness={0.3} roughness={0.5} />
      </mesh>
      <mesh position={[-0.15, -0.83, 0.06]} rotation={[0, 0, 0.08 + Math.PI / 2]}>
        <cylinderGeometry args={[0.008, 0.008, 0.06, 6]} />
        <meshStandardMaterial color="#8090c0" roughness={0.9} />
      </mesh>
      <mesh position={[0.1, -0.83, 0.06]} rotation={[0, 0, -0.04 + Math.PI / 2]}>
        <cylinderGeometry args={[0.008, 0.008, 0.05, 6]} />
        <meshStandardMaterial color="#ffcc60" roughness={0.9} />
      </mesh>
    </group>
  );
}

// ── Environment details ─────────────────────────────────────

function ObservatoryDome({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh><sphereGeometry args={[0.5, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshStandardMaterial color="#1a2040" metalness={0.4} roughness={0.5} transparent opacity={0.6} /></mesh>
      {/* Slit */}
      <mesh position={[0, 0.25, 0.35]} rotation={[-0.3, 0, 0]}>
        <boxGeometry args={[0.08, 0.4, 0.02]} /><meshStandardMaterial color="#0a0e18" />
      </mesh>
    </group>
  );
}

function SpaceWallClock({ position }: { position: [number, number, number] }) {
  const handRef = useRef<Group>(null);
  useFrame(({ clock }) => {
    if (handRef.current) handRef.current.rotation.z = -clock.elapsedTime * 0.5;
  });
  return (
    <group position={position}>
      <mesh rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.18, 0.18, 0.03, 24]} /><meshStandardMaterial color="#1a2840" metalness={0.4} roughness={0.4} /></mesh>
      <mesh position={[0, 0, 0.016]}>
        <circleGeometry args={[0.16, 24]} />
        <meshStandardMaterial color="#0a1020" />
      </mesh>
      {/* Hour marks */}
      {Array.from({ length: 12 }, (_, i) => {
        const a = (i * Math.PI * 2) / 12;
        return (
          <mesh key={i} position={[Math.sin(a) * 0.13, Math.cos(a) * 0.13, 0.018]}>
            <sphereGeometry args={[0.006, 4, 4]} /><meshBasicMaterial color="#4080c0" />
          </mesh>
        );
      })}
      <group ref={handRef} position={[0, 0, 0.02]}>
        <mesh position={[0, 0.05, 0]}><boxGeometry args={[0.004, 0.1, 0.004]} /><meshBasicMaterial color="#6090d0" /></mesh>
      </group>
    </group>
  );
}

function NebulaPoster({ position, rotation }: { position: [number, number, number]; rotation?: [number, number, number] }) {
  const tex = useMemo(() => {
    const c = document.createElement("canvas"); c.width = 200; c.height = 200;
    const ctx = c.getContext("2d");
    if (!ctx) return null;
    ctx.fillStyle = "#080c1a"; ctx.fillRect(0, 0, 200, 200);
    const gradient = ctx.createRadialGradient(100, 100, 10, 100, 100, 80);
    gradient.addColorStop(0, "rgba(180,60,200,0.5)");
    gradient.addColorStop(0.4, "rgba(60,80,200,0.3)");
    gradient.addColorStop(0.7, "rgba(40,150,200,0.15)");
    gradient.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = gradient; ctx.fillRect(0, 0, 200, 200);
    ctx.fillStyle = "#ffffff";
    for (let i = 0; i < 40; i++) {
      const x = Math.random() * 200, y = Math.random() * 200;
      ctx.beginPath(); ctx.arc(x, y, 0.5 + Math.random(), 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = "#6090b0"; ctx.font = "9px sans-serif"; ctx.textAlign = "center";
    ctx.fillText("Orion Nebula", 100, 190);
    const t = new CanvasTexture(c); t.colorSpace = SRGBColorSpace; return t;
  }, []);
  return (
    <mesh position={position} rotation={rotation}>
      <planeGeometry args={[0.4, 0.4]} />
      {tex ? <meshBasicMaterial map={tex} /> : <meshBasicMaterial color="#080c1a" />}
    </mesh>
  );
}

function ScientistPortrait({ position, label, bgColor }: { position: [number, number, number]; label: string; bgColor: string }) {
  const tex = useMemo(() => {
    const c = document.createElement("canvas"); c.width = 128; c.height = 160;
    const ctx = c.getContext("2d");
    if (!ctx) return null;
    ctx.fillStyle = bgColor; ctx.fillRect(0, 0, 128, 160);
    ctx.fillStyle = "rgba(200,210,240,0.15)";
    ctx.beginPath(); ctx.arc(64, 55, 30, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(64, 110, 25, 20, 0, Math.PI, 0); ctx.fill();
    ctx.fillStyle = "#a0c0e0"; ctx.font = "bold 11px sans-serif"; ctx.textAlign = "center";
    ctx.fillText(label, 64, 150);
    const t = new CanvasTexture(c); t.colorSpace = SRGBColorSpace; return t;
  }, [label, bgColor]);
  return (
    <group position={position}>
      <mesh><boxGeometry args={[0.28, 0.36, 0.02]} /><meshStandardMaterial color="#2a3050" metalness={0.3} roughness={0.5} /></mesh>
      <mesh position={[0, 0, 0.011]}>
        <planeGeometry args={[0.24, 0.32]} />
        {tex ? <meshBasicMaterial map={tex} /> : <meshBasicMaterial color={bgColor} />}
      </mesh>
    </group>
  );
}

function ConstellationProjection() {
  const dots = useMemo(() => Array.from({ length: 30 }, () => ({
    x: (Math.random() - 0.5) * W * 0.8,
    z: (Math.random() - 0.5) * D * 0.8,
    s: 0.02 + Math.random() * 0.03,
    brightness: 0.4 + Math.random() * 0.6,
  })), []);
  return (
    <group>
      {dots.map((d, i) => (
        <mesh key={i} position={[d.x, H - 0.04, d.z]}>
          <circleGeometry args={[d.s, 6]} />
          <meshBasicMaterial color="#3050a0" transparent opacity={d.brightness * 0.3} />
        </mesh>
      ))}
    </group>
  );
}

// ── Stars on ceiling ─────────────────────────────────────────

function StarField() {
  const stars = useMemo(() => Array.from({ length: 120 }, () => ({
    x: (Math.random() - 0.5) * W * 0.95,
    y: H - 0.05 - Math.random() * 0.3,
    z: (Math.random() - 0.5) * D * 0.95,
    s: 0.008 + Math.random() * 0.015,
  })), []);
  return (
    <group>
      {stars.map((st, i) => (
        <mesh key={i} position={[st.x, st.y, st.z]}>
          <sphereGeometry args={[st.s, 4, 4]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.3 + Math.random() * 0.5} />
        </mesh>
      ))}
    </group>
  );
}

// ── Proximity & Markers ──────────────────────────────────────

function StationMarker({ station, active }: { station: Station; active: boolean }) {
  const ref = useRef<Group>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    ref.current.position.y = station.at[1] + Math.sin(clock.elapsedTime * 1.2) * 0.08;
  });
  return (
    <group ref={ref} position={station.at}>
      <mesh>
        <sphereGeometry args={[0.12, 12, 12]} />
        <primitive object={active ? mGlowActive : mGlowIdle} attach="material" />
      </mesh>
    </group>
  );
}

function ProximityTrigger({ onNear }: { onNear: (id: string | null) => void }) {
  const { camera } = useThree();
  const worldPosition = useRef(new Vector3());
  const lastRef = useRef<string | null>(null);
  useFrame(() => {
    const pos = camera.getWorldPosition(worldPosition.current);
    let closest: string | null = null;
    let best = 2.8;
    for (const s of STATIONS) {
      const dx = pos.x - s.at[0], dz = pos.z - s.at[2];
      const d = Math.sqrt(dx * dx + dz * dz);
      if (d < best) { best = d; closest = s.id; }
    }
    if (closest !== lastRef.current) {
      lastRef.current = closest;
      onNear(closest);
    }
  });
  return null;
}

// ── Main scene ───────────────────────────────────────────────

const bounds = { minX: -W / 2 + 0.6, maxX: W / 2 - 0.6, minZ: -D / 2 + 0.6, maxZ: D / 2 - 0.6 };
const start: [number, number, number] = [0, 1.55, 3.5];

export function EarthSkyRoomScene({
  walkInput, ultra, onNear,
}: {
  walkInput: MutableRefObject<WalkInput>;
  ultra: boolean;
  onNear: (id: string | null) => void;
}) {
  const solid = useRef<Group>(null);
  const near = useRef<string | null>(null);
  const handleNear = (id: string | null) => { near.current = id; onNear(id); };

  return (
    <>
      <ambientLight intensity={0.85} />
      <directionalLight position={[3, H - 0.5, 2]} intensity={1.8} castShadow={ultra}
        shadow-mapSize-width={1024} shadow-mapSize-height={1024} />
      <hemisphereLight args={["#dce8ff", "#303848", 0.8]} />
      <pointLight position={[0, 2.5, -D / 2 + 2]} intensity={0.6} color="#6090d0" distance={8} />
      <pointLight position={[-5, 2, 0]} intensity={0.3} color="#4080c0" distance={6} />
      <pointLight position={[5, 2, 0]} intensity={0.3} color="#4080c0" distance={6} />

      <FirstPersonControls
        input={walkInput}
        start={start}
        startYaw={0}
        speed={2.8}
        eyeHeight={1.55}
        collision={solid}
        bounds={bounds}
        headBob
      />

      <group ref={solid} name="solid">
        <RoomShell />
        {/* Back wall tables */}
        <DisplayTable position={[0, 0, -D / 2 + 1.2]} width={3.0} />
        <DisplayTable position={[-4.5, 0, -D / 2 + 1.2]} />
        <DisplayTable position={[4.5, 0, -D / 2 + 1.2]} />
        {/* Side tables */}
        <SideTable position={[-5.5, 0, 0]} />
        <SideTable position={[5.5, 0, 0]} />
        {/* Front table */}
        <DisplayTable position={[0, 0, D / 2 - 1.2]} width={2.6} />
      </group>

      {/* 3D props on tables */}
      <EarthSkyBlenderProp kind="orrery" ultra={ultra} position={[0,TABLE_H+.43,-D/2+1.2]} fallback={<OrreryProp position={[0,TABLE_H+.1,-D/2+1.2]}/>}/>
      <EarthSkyBlenderProp kind="layers" ultra={ultra} position={[-4.5,TABLE_H+.43,-D/2+1.2]} fallback={<EarthCrossSectionProp position={[-4.5,TABLE_H+.25,-D/2+1.2]}/>}/>
      <EarthSkyBlenderProp kind="globe" ultra={ultra} position={[4.5,TABLE_H+.43,-D/2+1.2]} fallback={<GlobeProp position={[4.5,TABLE_H+.25,-D/2+1.2]}/>}/>
      <EarthSkyBlenderProp kind="moon" ultra={ultra} position={[-5.5,TABLE_H+.43,0]} fallback={<MoonModelProp position={[-5.5,TABLE_H+.2,0]}/>}/>
      <EarthSkyBlenderProp kind="seasons" ultra={ultra} position={[5.5,TABLE_H+.43,0]} fallback={<SaturnProp position={[5.5,TABLE_H+.25,0]}/>}/>
      <EarthSkyBlenderProp kind="tides" ultra={ultra} position={[0,TABLE_H+.43,D/2-1.2]} fallback={<TideProp position={[0,TABLE_H+.25,D/2-1.2]}/>}/>

      <StarField />
      <ConstellationProjection />

      {/* Observation equipment */}
      <TelescopeProp position={[-3, 0, D / 2 - 2]} />
      <MeteoriteSample position={[4.5, TABLE_H + 0.04, -D / 2 + 1.4]} />
      <MeteoriteSample position={[-4.5, TABLE_H + 0.04, -D / 2 + 1.5]} />
      <AstrolabeProp position={[5.5, TABLE_H + 0.15, 0.3]} />

      {/* Astronomy board with formulas */}
      <AstronomyBoard />

      {/* Wall art & posters */}
      <SolarSystemPoster position={[W / 2 - 0.08, 2.2, -2.5]} />
      <ConstellationPoster position={[-W / 2 + 0.08, 2.0, -2]} rotation={[0, Math.PI / 2, 0]} />
      <SpaceTimelinePoster position={[-W / 2 + 0.08, 2.0, 2]} rotation={[0, Math.PI / 2, 0]} />
      <NebulaPoster position={[W / 2 - 0.08, 2.4, 2]} rotation={[0, -Math.PI / 2, 0]} />

      {/* Scientist portraits on back wall */}
      <ScientistPortrait position={[3, 2.8, -D / 2 + 0.08]} label="Copernicus" bgColor="#1a2040" />
      <ScientistPortrait position={[-3, 2.8, -D / 2 + 0.08]} label="Galileo" bgColor="#0a1830" />

      {/* Environment details */}
      <ObservatoryDome position={[0, H - 0.02, 0]} />
      <SpaceWallClock position={[0, H - 0.5, D / 2 - 0.08]} />

      {/* Ceiling lights (dim, blue-tinted) */}
      {[-3, 0, 3].map((z, i) => (
        <group key={i} position={[0, H - 0.12, z]}>
          <mesh><boxGeometry args={[2.4, 0.06, 0.3]} /><meshStandardMaterial color="#1a2030" roughness={0.5} metalness={0.4} /></mesh>
          <mesh position={[0, -0.04, 0]}><boxGeometry args={[2.2, 0.02, 0.22]} /><meshBasicMaterial color="#304060" /></mesh>
        </group>
      ))}

      <ProximityTrigger onNear={handleNear} />
      {STATIONS.map((s) => (
        <StationMarker key={s.id} station={s} active={near.current === s.id} />
      ))}
    </>
  );
}
