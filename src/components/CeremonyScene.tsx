import { useMemo } from "react";
import { Instances, Instance } from "@react-three/drei";
import { Color } from "three";
import type { SceneTheme, TimeOfDay } from "../ceremony";
import type { Detail } from "./LabOrgans";

/**
 * The **settings** a ceremony can be staged in.
 *
 * This file exists because of one fact about Cambodian ceremonial life that the
 * Buildings registry would have quietly got wrong: **most of it does not happen
 * in a building.** A wedding is under a marquee in the yard in front of the
 * house. An ordination is on pagoda ground under the trees. A boat blessing is
 * at the water's edge. The hired function hall is one option among several, and
 * a recent one.
 *
 * So a `Venue` always carries a `theme` — a setting built procedurally, here —
 * and a real building from the registry is an optional addition on top. A client
 * that has never downloaded a single building model can still stage every
 * ceremony in the catalogue.
 *
 * ## Deliberately behind the ceremony
 *
 * Everything in this file is background. It is built to be recognisable in
 * peripheral vision and then ignored: the ground colour, the massing of a house,
 * the silhouette of a vihear roof. Detail belongs on the props and, later, on the
 * family's own photographs. A yard that out-competes the ceremony standing in it
 * is a bug.
 */

/* ----------------------------------------------------------------- light --- */

/**
 * The light, by hour.
 *
 * Time of day is a required field on a venue rather than a nicety, because for
 * some ceremonies it *is* the ceremony. Pchum Ben is families walking to the
 * pagoda in the dark before dawn; rendering that at noon loses the whole point
 * of it.
 */
const LIGHT: Record<TimeOfDay, {
  sky: string; ground: string; sun: string; sunPos: [number, number, number];
  sunI: number; ambient: number; fog: string; fogNear: number; fogFar: number;
}> = {
  // Low-light hours carry more ambient than a physical model would give them.
  // Pchum Ben happens before dawn and a reception runs past dusk, so those two
  // settings have to stay *readable* on a phone held outdoors — a correctly
  // black pre-dawn yard is a blank screen, which loses the ceremony entirely.
  dawn: {
    sky: "#3a5075", ground: "#3a3a42", sun: "#ffb178", sunPos: [-30, 8, 22],
    sunI: 1.6, ambient: 0.68, fog: "#4e6288", fogNear: 24, fogFar: 100,
  },
  morning: {
    sky: "#8fc3e8", ground: "#6f6550", sun: "#fff2d8", sunPos: [-24, 34, 20],
    sunI: 2.5, ambient: 0.62, fog: "#bcd7ea", fogNear: 34, fogFar: 130,
  },
  midday: {
    sky: "#a8d4f0", ground: "#7a7058", sun: "#ffffff", sunPos: [6, 52, 10],
    sunI: 3.0, ambient: 0.72, fog: "#cfe4f2", fogNear: 40, fogFar: 150,
  },
  afternoon: {
    sky: "#9cc8e4", ground: "#736548", sun: "#ffe8bc", sunPos: [28, 24, -14],
    sunI: 2.3, ambient: 0.6, fog: "#c6dae8", fogNear: 32, fogFar: 130,
  },
  dusk: {
    sky: "#4e4870", ground: "#4a3b2c", sun: "#ffab72", sunPos: [34, 9, -18],
    sunI: 2.0, ambient: 0.72, fog: "#6b5c7a", fogNear: 22, fogFar: 95,
  },
  night: {
    sky: "#1c2740", ground: "#22252e", sun: "#a8c0ea", sunPos: [-14, 26, -18],
    sunI: 0.9, ambient: 0.54, fog: "#28324a", fogNear: 18, fogFar: 78,
  },
};

export function SceneLight({ time, detail }: { time: TimeOfDay; detail: Detail }) {
  const L = LIGHT[time];
  return (
    <>
      <color attach="background" args={[L.sky]} />
      <fog attach="fog" args={[L.fog, L.fogNear, L.fogFar]} />
      <hemisphereLight args={[L.sky, L.ground, L.ambient]} />
      <directionalLight
        position={L.sunPos}
        intensity={L.sunI}
        color={L.sun}
        castShadow={detail === "ultra"}
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0009}
        shadow-camera-left={-24}
        shadow-camera-right={24}
        shadow-camera-top={24}
        shadow-camera-bottom={-24}
      />
      {/* A cool bounce opposite the sun, so nothing in shadow goes pure black on
          a phone screen in daylight. */}
      <directionalLight position={[-L.sunPos[0], 10, -L.sunPos[2]]} intensity={0.35} color="#a8c4e8" />
    </>
  );
}

export const skyOf = (time: TimeOfDay) => LIGHT[time].sky;

/* ---------------------------------------------------------------- pieces --- */

/** Deterministic scatter — the same yard every time you open it. */
function scatter(n: number, seed: number, spread: number, inner = 0) {
  const out: [number, number][] = [];
  let s = seed;
  for (let i = 0; i < n; i++) {
    s = (s * 1664525 + 1013904223) % 4294967296;
    const a = (s / 4294967296) * Math.PI * 2;
    s = (s * 1664525 + 1013904223) % 4294967296;
    const r = inner + (s / 4294967296) * (spread - inner);
    out.push([Math.cos(a) * r, Math.sin(a) * r]);
  }
  return out;
}

function Ground({ color, size = 120, detail }: { color: string; size?: number; detail: Detail }) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow={detail === "ultra"}>
      <circleGeometry args={[size / 2, detail === "normal" ? 24 : 48]} />
      <meshStandardMaterial color={color} roughness={0.98} />
    </mesh>
  );
}

/** A sugar palm, which is what the horizon of rural Cambodia is made of. */
function Palms({ at, detail }: { at: [number, number][]; detail: Detail }) {
  return (
    <group>
      {at.map(([x, z], i) => {
        const h = 8 + ((i * 37) % 5);
        return (
          <group key={i} position={[x, 0, z]}>
            <mesh position={[0, h / 2, 0]} castShadow={detail === "ultra"}>
              <cylinderGeometry args={[0.18, 0.28, h, seg(detail)]} />
              <meshStandardMaterial color="#6a5a48" roughness={0.95} />
            </mesh>
            {Array.from({ length: detail === "normal" ? 5 : 8 }, (_, f) => {
              const a = (f / (detail === "normal" ? 5 : 8)) * Math.PI * 2;
              return (
                <mesh
                  key={f}
                  position={[Math.cos(a) * 1.1, h + 0.3, Math.sin(a) * 1.1]}
                  rotation={[0.5, -a, 0]}
                >
                  <coneGeometry args={[0.5, 2.6, 4]} />
                  <meshStandardMaterial color="#3f5c2e" roughness={0.9} side={2} />
                </mesh>
              );
            })}
          </group>
        );
      })}
    </group>
  );
}

const seg = (d: Detail) => (d === "normal" ? 6 : 10);

/** A Khmer house on stilts — the thing the yard belongs to. */
function StiltHouse({ detail, position = [0, 0, -11] as [number, number, number] }: {
  detail: Detail; position?: [number, number, number];
}) {
  return (
    <group position={position}>
      {/* Stilts */}
      {[[-3, -2.4], [3, -2.4], [3, 2.4], [-3, 2.4], [0, -2.4], [0, 2.4]].map(([x, z], i) => (
        <mesh key={i} position={[x, 1.1, z]} castShadow={detail === "ultra"}>
          <cylinderGeometry args={[0.16, 0.18, 2.2, seg(detail)]} />
          <meshStandardMaterial color="#5f4630" roughness={0.95} />
        </mesh>
      ))}
      {/* The floor and the walls */}
      <mesh position={[0, 2.3, 0]} castShadow={detail === "ultra"} receiveShadow>
        <boxGeometry args={[7.2, 0.3, 5.6]} />
        <meshStandardMaterial color="#7a5a3c" roughness={0.9} />
      </mesh>
      <mesh position={[0, 3.6, 0]} castShadow={detail === "ultra"}>
        <boxGeometry args={[6.8, 2.4, 5.2]} />
        <meshStandardMaterial color="#a8845c" roughness={0.88} />
      </mesh>
      {/* A steep gable, which is what makes it read as Khmer rather than as a
          shed: the pitch is the identity of the building. */}
      <mesh position={[0, 5.5, 0]} rotation={[0, Math.PI / 4, 0]} castShadow={detail === "ultra"}>
        <coneGeometry args={[5.4, 2.6, 4]} />
        <meshStandardMaterial color="#8a3a2c" roughness={0.85} />
      </mesh>
      {/* Steps down to the yard */}
      <mesh position={[0, 1.1, 3.4]} rotation={[-0.72, 0, 0]}>
        <boxGeometry args={[1.4, 0.14, 3.2]} />
        <meshStandardMaterial color="#6b4f36" roughness={0.95} />
      </mesh>
    </group>
  );
}

/** A vihear, in silhouette: tiered roof, gold trim, columns along the front. */
function Vihear({ detail, position = [0, 0, -18] as [number, number, number] }: {
  detail: Detail; position?: [number, number, number];
}) {
  return (
    <group position={position}>
      <mesh position={[0, 0.5, 0]} receiveShadow>
        <boxGeometry args={[16, 1, 11]} />
        <meshStandardMaterial color="#d8cdb8" roughness={0.92} />
      </mesh>
      <mesh position={[0, 3.6, 0]} castShadow={detail === "ultra"}>
        <boxGeometry args={[13, 5.2, 8.6]} />
        <meshStandardMaterial color="#efe6d2" roughness={0.9} />
      </mesh>
      {[0, 1, 2].map((i) => (
        <mesh key={i} position={[0, 6.6 + i * 1.35, 0]} rotation={[0, Math.PI / 4, 0]} castShadow={detail === "ultra"}>
          <coneGeometry args={[10.2 - i * 2.1, 1.6, 4]} />
          <meshStandardMaterial color={i === 2 ? "#c8a234" : "#a83a2e"} roughness={0.7} metalness={i === 2 ? 0.4 : 0} />
        </mesh>
      ))}
      {[-5.2, -2.6, 0, 2.6, 5.2].map((x) => (
        <mesh key={x} position={[x, 3.2, 4.6]} castShadow={detail === "ultra"}>
          <cylinderGeometry args={[0.34, 0.38, 5.4, seg(detail)]} />
          <meshStandardMaterial color="#d8b040" roughness={0.55} metalness={0.35} />
        </mesh>
      ))}
    </group>
  );
}

/** Whitewashed stupas, in a row the way a pagoda's boundary always has them. */
function Stupas({ detail, at }: { detail: Detail; at: [number, number][] }) {
  return (
    <group>
      {at.map(([x, z], i) => (
        <group key={i} position={[x, 0, z]}>
          <mesh position={[0, 0.5, 0]} castShadow={detail === "ultra"}>
            <boxGeometry args={[1.8, 1, 1.8]} />
            <meshStandardMaterial color="#e8e2d4" roughness={0.9} />
          </mesh>
          <mesh position={[0, 1.9, 0]} castShadow={detail === "ultra"}>
            <cylinderGeometry args={[0.28, 0.85, 1.8, seg(detail)]} />
            <meshStandardMaterial color="#efe9dc" roughness={0.88} />
          </mesh>
          <mesh position={[0, 3.2, 0]}>
            <coneGeometry args={[0.26, 1, seg(detail)]} />
            <meshStandardMaterial color="#d8b040" roughness={0.5} metalness={0.4} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/** Standing rice, instanced. Thousands of blades is the wrong idea on a phone. */
function Paddy({ detail, season }: { detail: Detail; season: "dry" | "wet" }) {
  const clumps = useMemo(
    () => scatter(detail === "normal" ? 90 : 220, 8171, 46, 9),
    [detail],
  );
  const color = season === "wet" ? "#6f9c3c" : "#c8a848";
  return (
    <Instances limit={clumps.length} range={clumps.length} castShadow={false}>
      <coneGeometry args={[0.34, 1.05, 4]} />
      <meshStandardMaterial color={color} roughness={0.95} />
      {clumps.map(([x, z], i) => (
        <Instance key={i} position={[x, 0.52, z]} rotation={[0, i * 1.7, 0]} />
      ))}
    </Instances>
  );
}

/** Water, flat and slightly reflective. Enough for a bank or a paddy sheet. */
function Water({ y = -0.02, at = [0, -26] as [number, number], size = 90 }) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[at[0], y, at[1]]}>
      <planeGeometry args={[size, size]} />
      <meshStandardMaterial color="#3f6a80" roughness={0.16} metalness={0.35} />
    </mesh>
  );
}

/* ---------------------------------------------------------------- themes --- */

/**
 * One setting. Everything is placed clear of the middle: the ceremony stands at
 * the origin, and a scene that puts a tree where the couple go is worse than no
 * scene at all.
 */
export function Scene({
  theme, detail, season = "dry",
}: {
  theme: SceneTheme;
  detail: Detail;
  season?: "dry" | "wet";
}) {
  const palms = useMemo(() => scatter(detail === "normal" ? 6 : 12, 4242, 40, 16), [detail]);
  const stupas = useMemo(() => scatter(detail === "normal" ? 3 : 6, 991, 30, 18), [detail]);

  switch (theme) {
    case "home-yard":
      return (
        <group>
          <Ground color="#9a8258" detail={detail} />
          <StiltHouse detail={detail} />
          <Palms at={palms} detail={detail} />
          {/* The neighbour's fence, which is where the yard actually ends. */}
          {detail === "ultra" && [-14, 14].map((x) => (
            <mesh key={x} position={[x, 0.6, 2]} castShadow>
              <boxGeometry args={[0.1, 1.2, 22]} />
              <meshStandardMaterial color="#7d6a4e" roughness={0.95} />
            </mesh>
          ))}
        </group>
      );

    case "pagoda-ground":
      return (
        <group>
          <Ground color="#b0a284" detail={detail} />
          {/* Well back and turned to a three-quarter view. Square-on at 18 m an
              11 m vihear is a wall directly behind the offering, which reads as
              being pressed up against a building rather than standing on open
              pagoda ground with the vihear over there. */}
          <group position={[-8, 0, -34]} rotation={[0, 0.42, 0]}>
            <Vihear detail={detail} position={[0, 0, 0]} />
          </group>
          <Stupas detail={detail} at={stupas} />
          <Palms at={palms} detail={detail} />
        </group>
      );

    case "garden":
      return (
        <group>
          <Ground color="#5d7a3e" detail={detail} />
          <Palms at={palms} detail={detail} />
          {/* Clipped hedges, set back to frame rather than crowd. */}
          {[[-9, -6], [9, -6], [-9, 6], [9, 6]].map(([x, z], i) => (
            <mesh key={i} position={[x, 0.6, z]} castShadow={detail === "ultra"}>
              <boxGeometry args={[5, 1.2, 1.1]} />
              <meshStandardMaterial color="#3f6030" roughness={0.95} />
            </mesh>
          ))}
        </group>
      );

    case "riverside":
      return (
        <group>
          <Ground color="#8f7d5a" size={80} detail={detail} />
          <Water at={[0, -30]} size={110} />
          <Palms at={palms.filter(([, z]) => z > -18)} detail={detail} />
          {/* A moored longboat, because a river bank without one looks like a lake. */}
          <mesh position={[7, 0.3, -22]} rotation={[0, 0.3, 0]} castShadow={detail === "ultra"}>
            <capsuleGeometry args={[0.5, 7, 4, seg(detail)]} />
            <meshStandardMaterial color="#5a4630" roughness={0.9} />
          </mesh>
        </group>
      );

    case "paddy":
      return (
        <group>
          <Ground color={season === "wet" ? "#5c7a3a" : "#a89460"} detail={detail} />
          {season === "wet" && <Water y={0.03} at={[0, 0]} size={100} />}
          <Paddy detail={detail} season={season} />
          <Palms at={palms} detail={detail} />
          {/* The dike you walk in on. */}
          <mesh position={[0, 0.16, 8]} receiveShadow>
            <boxGeometry args={[60, 0.32, 1.4]} />
            <meshStandardMaterial color="#8a7550" roughness={0.98} />
          </mesh>
        </group>
      );

    case "street":
      return (
        <group>
          <Ground color="#7a705f" detail={detail} />
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]} receiveShadow>
            <planeGeometry args={[9, 120]} />
            <meshStandardMaterial color="#4a4644" roughness={0.96} />
          </mesh>
          {/* Shophouses either side, kept as massing only. */}
          {[-1, 1].map((s) => (
            <group key={s}>
              {[-16, -6, 4, 14].map((z) => (
                <mesh key={z} position={[s * 9.5, 3.2, z]} castShadow={detail === "ultra"}>
                  <boxGeometry args={[6, 6.4, 8]} />
                  <meshStandardMaterial color={z % 20 === 4 ? "#c8b89a" : "#d8cbb2"} roughness={0.92} />
                </mesh>
              ))}
            </group>
          ))}
          <Palms at={palms.filter(([x]) => Math.abs(x) > 16)} detail={detail} />
        </group>
      );

    case "hall":
      return (
        <group>
          <Ground color="#6a4a3c" size={44} detail={detail} />
          {/* An interior is a room you are inside: walls facing in, a ceiling,
              and no sky. Backface-rendered so the camera can sit outside it. */}
          <mesh position={[0, 4, 0]}>
            <boxGeometry args={[30, 8, 30]} />
            <meshStandardMaterial color="#efe4d2" roughness={0.94} side={1} />
          </mesh>
          {[-12, -4, 4, 12].map((x) => [-12, 12].map((z) => (
            <mesh key={`${x},${z}`} position={[x, 4, z]} castShadow={detail === "ultra"}>
              <cylinderGeometry args={[0.4, 0.44, 8, seg(detail)]} />
              <meshStandardMaterial color="#e8d8b8" roughness={0.8} />
            </mesh>
          )))}
          <pointLight position={[0, 6.5, 0]} intensity={38} distance={40} decay={2} color="#ffe8c8" />
        </group>
      );

    case "temple-interior":
      return (
        <group>
          <Ground color="#7a6a4a" size={40} detail={detail} />
          <mesh position={[0, 5, 0]}>
            <boxGeometry args={[24, 10, 34]} />
            <meshStandardMaterial color="#c8a878" roughness={0.95} side={1} />
          </mesh>
          {[-7, 7].map((x) => [-10, -2, 6, 13].map((z) => (
            <mesh key={`${x},${z}`} position={[x, 5, z]} castShadow={detail === "ultra"}>
              <cylinderGeometry args={[0.55, 0.6, 10, seg(detail)]} />
              <meshStandardMaterial color="#a8202c" roughness={0.7} />
            </mesh>
          )))}
          {/* The dais at the far end, gold, unmistakable in silhouette. */}
          <mesh position={[0, 1.1, -14]} castShadow={detail === "ultra"}>
            <boxGeometry args={[8, 2.2, 3]} />
            <meshStandardMaterial color="#c8a234" roughness={0.5} metalness={0.45} />
          </mesh>
          <pointLight position={[0, 5, -10]} intensity={30} distance={34} decay={2} color="#ffd9a0" />
        </group>
      );

    default:
      return <Ground color="#8a7d60" detail={detail} />;
  }
}

/** What each setting is called, and what it means. Shown in the venue picker. */
export const THEME_INFO: Record<SceneTheme, { label: string; icon: string; note: string }> = {
  "home-yard": {
    label: "Home yard", icon: "🏠",
    note: "A marquee in the yard in front of the house. Where most Khmer weddings actually happen.",
  },
  "pagoda-ground": {
    label: "Pagoda ground", icon: "🛕",
    note: "Under the trees on pagoda land, near the vihear. Ordinations, Pchum Ben, robe offerings.",
  },
  "garden": {
    label: "Garden", icon: "🌺",
    note: "A laid-out garden — increasingly common for a wedding with the space for it.",
  },
  "riverside": {
    label: "Riverside", icon: "🛶",
    note: "At the water's edge. Boat blessings, and anything tied to the river's year.",
  },
  "paddy": {
    label: "Rice field", icon: "🌾",
    note: "Standing rice. The ceremonies of the farming year happen where the work does.",
  },
  "street": {
    label: "Street", icon: "🛣️",
    note: "A procession, moving rather than fixed. The whole neighbourhood is the venue.",
  },
  "hall": {
    label: "Function hall", icon: "🏢",
    note: "A hired hall. One option among several, and a recent one.",
  },
  "temple-interior": {
    label: "Inside the vihear", icon: "🕯️",
    note: "Within the temple building itself, before the dais.",
  },
};

export const TIME_LABEL: Record<TimeOfDay, string> = {
  dawn: "Before dawn",
  morning: "Morning",
  midday: "Midday",
  afternoon: "Afternoon",
  dusk: "Dusk",
  night: "Night",
};

/** A soft ground shadow so props do not float when shadows are off in Normal. */
export function GroundDisc({ time }: { time: TimeOfDay }) {
  const c = useMemo(() => new Color(LIGHT[time].ground).multiplyScalar(0.7), [time]);
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.008, 0]}>
      <circleGeometry args={[6.5, 32]} />
      <meshBasicMaterial color={c} transparent opacity={0.22} depthWrite={false} />
    </mesh>
  );
}
