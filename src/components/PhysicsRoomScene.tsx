import { useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import {
  MeshStandardMaterial, MeshBasicMaterial, CanvasTexture, RepeatWrapping,
  SRGBColorSpace, DoubleSide, Vector3, Group,
} from "three";
import type { MutableRefObject } from "react";
import { FirstPersonControls, type WalkInput } from "./FirstPersonControls";

const W = 12;
const D = 10;
const H = 3.6;
const WALL_T = 0.15;
const BENCH_H = 0.95;

export interface Station {
  id: string;
  label: string;
  icon: string;
  kind: "interact" | "info";
  at: [number, number, number];
  description: string;
  detail?: string;
}

export const STATIONS: Station[] = [
  {
    id: "machines-bench", label: "Simple machines", icon: "⚙️", kind: "interact",
    at: [0, BENCH_H + 0.45, -D / 2 + 1.75],
    description: "Levers, pulleys, inclined planes, and more",
    detail:
      "Every complex machine is built from six simple machines. Each one trades force for distance - you put in less force, but move it over a longer path. The total work (force times distance) stays the same, but the job becomes possible with the strength you have.",
  },
  {
    id: "newton-bench", label: "Newton's Laws", icon: "🍎", kind: "info",
    at: [-3.2, BENCH_H + 0.45, -D / 2 + 1.75],
    description: "The three laws that govern all motion",
    detail:
      "Isaac Newton wrote three laws in 1687 that explain how everything moves, from a dropped ball to a planet in orbit. The first says things keep doing what they are doing unless a force acts. The second says force equals mass times acceleration. The third says every push has an equal push back.",
  },
  {
    id: "projectile-bench", label: "Projectile launcher", icon: "🎯", kind: "info",
    at: [3.2, BENCH_H + 0.45, -D / 2 + 1.75],
    description: "Launch objects and study their parabolic paths",
    detail:
      "A projectile follows a parabola because gravity pulls it down at a constant rate while it moves forward at a constant speed. The two motions are independent - horizontal speed never changes, and vertical speed increases by 9.81 m/s every second downward.",
  },
  {
    id: "circuit-table", label: "Circuit board", icon: "⚡", kind: "info",
    at: [-4.2, BENCH_H + 0.45, 0],
    description: "Build circuits and measure voltage, current, resistance",
    detail:
      "Ohm's law (V = IR) is the foundation of every circuit. Voltage is the push, current is the flow, resistance is the opposition. In series, resistances add because the current must push through each one. In parallel, the total resistance drops because the current can take multiple paths.",
  },
  {
    id: "energy-table", label: "Energy station", icon: "⚡", kind: "info",
    at: [4.2, BENCH_H + 0.45, 0],
    description: "Potential and kinetic energy, conservation of energy",
    detail:
      "Energy cannot be created or destroyed, only converted. A ball held high has potential energy (mgh). Drop it and that energy converts to kinetic energy (0.5mv2). At the bottom, all PE has become KE. The total never changes - this is the law of conservation of energy.",
  },
  {
    id: "collision-bench", label: "Collision lab", icon: "💥", kind: "interact",
    at: [2.0, BENCH_H + 0.45, D / 2 - 1.2],
    description: "Elastic and inelastic collisions, conservation of momentum",
    detail:
      "Momentum (mass times velocity) is always conserved in a collision. In an elastic collision, kinetic energy is also conserved - both objects bounce off. In a perfectly inelastic collision, the objects stick together and some energy is converted to heat and sound.",
  },
  {
    id: "wave-wall", label: "Wave tank", icon: "🌊", kind: "info",
    at: [-2.0, BENCH_H + 0.45, D / 2 - 1.2],
    description: "Frequency, wavelength, amplitude, and wave speed",
    detail:
      "A wave carries energy without carrying matter. The water molecules move up and down, but the wave pattern moves sideways. Speed equals frequency times wavelength (v = f x lambda). Double the frequency and each wave is half as long, but the speed stays the same.",
  },
  {
    id: "pendulum-corner", label: "Pendulum lab", icon: "🕐", kind: "info",
    at: [-4.2, BENCH_H + 0.45, 3.0],
    description: "Period, frequency, and what really affects the swing",
    detail:
      "Galileo noticed that a swinging chandelier always took the same time per swing, no matter how far it swung. The period depends only on the length of the string and the strength of gravity. Mass does not matter. This discovery led to the first accurate clocks.",
  },
  {
    id: "slope-corner", label: "Friction ramp", icon: "📐", kind: "info",
    at: [4.2, BENCH_H + 0.45, 3.0],
    description: "Forces on a slope - gravity, friction, normal force",
    detail:
      "On a slope, gravity splits into two parts: one pushing the object into the surface (balanced by the normal force) and one pulling it downhill. Friction opposes the downhill pull. If gravity wins, the object slides. Steeper angles make gravity stronger along the slope and friction weaker.",
  },
  {
    id: "whiteboard", label: "Units and formulas", icon: "📋", kind: "info",
    at: [0, 2.2, -D / 2 + 0.6],
    description: "Reference board with key physics formulas",
    detail:
      "Force is measured in Newtons (N = kg m/s2). Energy and work in Joules (J = N m). Power in Watts (W = J/s). Pressure in Pascals (Pa = N/m2). Every physics formula is just a relationship between these measured quantities.",
  },
];

const mFloor = new MeshStandardMaterial({ color: "#4a5e70", roughness: 0.85 });
const mWall = new MeshStandardMaterial({ color: "#5a6e87", roughness: 0.75 });
const mBackWall = new MeshStandardMaterial({ color: "#4a5872", roughness: 0.7 });
const mCeiling = new MeshStandardMaterial({ color: "#8a96a6", roughness: 0.6 });
const mBench = new MeshStandardMaterial({ color: "#d4dce9", roughness: 0.35, metalness: 0.05 });
const mBenchLeg = new MeshStandardMaterial({ color: "#7a848e", roughness: 0.5, metalness: 0.4 });
const mDoor = new MeshStandardMaterial({ color: "#3e4c5c", roughness: 0.6 });
const mWindow = new MeshStandardMaterial({ color: "#a5c8e8", roughness: 0.1, metalness: 0.3, transparent: true, opacity: 0.35, side: DoubleSide });
const mFrame = new MeshStandardMaterial({ color: "#6e7f96", roughness: 0.5, metalness: 0.3 });
const mBoard = new MeshStandardMaterial({ color: "#2a2d3a", roughness: 0.9 });
const mBoardFrame = new MeshStandardMaterial({ color: "#6a6a5c", roughness: 0.65 });
const mPipe = new MeshStandardMaterial({ color: "#889898", roughness: 0.4, metalness: 0.6 });
const mSteel = new MeshStandardMaterial({ color: "#9aa8ac", roughness: 0.32, metalness: 0.75 });
const mStoolSeat = new MeshStandardMaterial({ color: "#3a3e48", roughness: 0.5 });
const mEmissive = new MeshBasicMaterial({ color: "#f0f0ff" });
const mGlowIdle = new MeshBasicMaterial({ color: "#c0ccff", transparent: true, opacity: 0.28 });
const mGlowActive = new MeshBasicMaterial({ color: "#80a0ff", transparent: true, opacity: 0.7 });
const mOrange = new MeshStandardMaterial({ color: "#e08040", roughness: 0.4 });
const mRed = new MeshStandardMaterial({ color: "#cc4444", roughness: 0.45 });
const mBlue = new MeshStandardMaterial({ color: "#4488cc", roughness: 0.45 });
const mGreen = new MeshStandardMaterial({ color: "#2a7a3a", roughness: 0.6 });
const mWater = new MeshStandardMaterial({ color: "#4090d0", roughness: 0.1, transparent: true, opacity: 0.45 });
const mWood = new MeshStandardMaterial({ color: "#8a6a40", roughness: 0.7 });
const mDarkMetal = new MeshStandardMaterial({ color: "#3a3e48", roughness: 0.4, metalness: 0.6 });
const mChrome = new MeshStandardMaterial({ color: "#c0c8d0", roughness: 0.15, metalness: 0.9 });
const mGlass = new MeshStandardMaterial({ color: "#a0c0d8", roughness: 0.05, transparent: true, opacity: 0.25 });
const mYellow = new MeshStandardMaterial({ color: "#ccaa30", roughness: 0.5 });
const mPurple = new MeshStandardMaterial({ color: "#7744aa", roughness: 0.5 });

function useCheckerTexture() {
  return useMemo(() => {
    const c = document.createElement("canvas");
    c.width = c.height = 128;
    const ctx = c.getContext("2d");
    if (!ctx) return null;
    ctx.fillStyle = "#546878"; ctx.fillRect(0, 0, 128, 128);
    ctx.fillStyle = "#3f4d60"; ctx.fillRect(0, 0, 64, 64); ctx.fillRect(64, 64, 64, 64);
    ctx.strokeStyle = "rgba(0,0,0,0.22)"; ctx.lineWidth = 3;
    for (const [x, y] of [[0, 0], [64, 0], [0, 64], [64, 64]]) ctx.strokeRect(x, y, 64, 64);
    const t = new CanvasTexture(c);
    t.wrapS = t.wrapT = RepeatWrapping;
    t.repeat.set(W / 2, D / 2);
    t.colorSpace = SRGBColorSpace;
    t.anisotropy = 4;
    return t;
  }, []);
}

function RoomShell() {
  const checker = useCheckerTexture();
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[W, D]} />
        {checker ? <meshStandardMaterial map={checker} roughness={0.82} /> : <primitive object={mFloor} attach="material" />}
      </mesh>
      <mesh position={[0, H, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[W, D]} /><primitive object={mCeiling} attach="material" />
      </mesh>
      <mesh position={[0, H / 2, -D / 2]}>
        <boxGeometry args={[W, H, WALL_T]} /><primitive object={mBackWall} attach="material" />
      </mesh>
      <mesh position={[0, H / 2, D / 2]}>
        <boxGeometry args={[W, H, WALL_T]} /><primitive object={mWall} attach="material" />
      </mesh>
      <mesh position={[-W / 2, H / 2, 0]}>
        <boxGeometry args={[WALL_T, H, D]} /><primitive object={mWall} attach="material" />
      </mesh>
      <mesh position={[W / 2, H / 2, 0]}>
        <boxGeometry args={[WALL_T, H, D]} /><primitive object={mWall} attach="material" />
      </mesh>
    </>
  );
}

function Bench({ position, width = 1.8 }: { position: [number, number, number]; width?: number }) {
  const legs: [number, number][] = [[-width / 2 + 0.08, -0.28], [width / 2 - 0.08, -0.28], [-width / 2 + 0.08, 0.28], [width / 2 - 0.08, 0.28]];
  return (
    <group position={position}>
      <mesh position={[0, BENCH_H, 0]} castShadow receiveShadow>
        <boxGeometry args={[width, 0.06, 0.7]} /><primitive object={mBench} attach="material" />
      </mesh>
      {legs.map(([x, z], i) => (
        <mesh key={i} position={[x, BENCH_H / 2 - 0.03, z]}>
          <boxGeometry args={[0.06, BENCH_H - 0.06, 0.06]} /><primitive object={mBenchLeg} attach="material" />
        </mesh>
      ))}
    </group>
  );
}

function SideTable({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, BENCH_H, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.2, 0.05, 0.8]} /><primitive object={mBench} attach="material" />
      </mesh>
      {[[-0.5, -0.3], [0.5, -0.3], [-0.5, 0.3], [0.5, 0.3]].map(([x, z], i) => (
        <mesh key={i} position={[x, BENCH_H / 2 - 0.02, z]}>
          <cylinderGeometry args={[0.025, 0.025, BENCH_H - 0.05, 6]} /><primitive object={mBenchLeg} attach="material" />
        </mesh>
      ))}
    </group>
  );
}

function Stool({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.55, 0]} castShadow>
        <cylinderGeometry args={[0.17, 0.17, 0.03, 12]} /><primitive object={mStoolSeat} attach="material" />
      </mesh>
      <mesh position={[0, 0.28, 0]}>
        <cylinderGeometry args={[0.025, 0.03, 0.55, 6]} /><primitive object={mSteel} attach="material" />
      </mesh>
    </group>
  );
}

function Windows() {
  return (
    <>
      {[-2.5, 0, 2.5].map((z) => (
        <group key={z} position={[W / 2 - 0.06, 2.0, z]}>
          <mesh><boxGeometry args={[0.02, 1.4, 1.2]} /><primitive object={mWindow} attach="material" /></mesh>
          <mesh><boxGeometry args={[0.04, 1.5, 0.06]} /><primitive object={mFrame} attach="material" /></mesh>
          <mesh><boxGeometry args={[0.04, 0.06, 1.3]} /><primitive object={mFrame} attach="material" /></mesh>
          <mesh position={[0, 0.75, 0]}><boxGeometry args={[0.04, 0.06, 1.3]} /><primitive object={mFrame} attach="material" /></mesh>
          <mesh position={[0, -0.75, 0]}><boxGeometry args={[0.04, 0.06, 1.3]} /><primitive object={mFrame} attach="material" /></mesh>
        </group>
      ))}
    </>
  );
}

function Door() {
  return (
    <group position={[-W / 2 + 0.08, 1.1, 0]}>
      <mesh><boxGeometry args={[0.06, 2.2, 1.0]} /><primitive object={mDoor} attach="material" /></mesh>
      <mesh position={[0.02, 0, 0.36]}><sphereGeometry args={[0.04, 8, 8]} /><primitive object={mSteel} attach="material" /></mesh>
    </group>
  );
}

// --- Station Props ---

function GearProp({ position }: { position: [number, number, number] }) {
  const gearA = useRef<Group>(null);
  const gearB = useRef<Group>(null);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime * 0.8;
    if (gearA.current) gearA.current.rotation.y = t;
    if (gearB.current) gearB.current.rotation.y = -t * (0.12 / 0.15);
  });
  return (
    <group position={position}>
      <group ref={gearA} position={[-0.1, 0.06, 0]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.12, 0.025, 8, 20]} /><primitive object={mSteel} attach="material" />
        </mesh>
        <mesh>
          <cylinderGeometry args={[0.025, 0.025, 0.06, 8]} /><primitive object={mDarkMetal} attach="material" />
        </mesh>
      </group>
      <group ref={gearB} position={[0.12, 0.06, 0]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.15, 0.025, 8, 24]} /><primitive object={mSteel} attach="material" />
        </mesh>
        <mesh>
          <cylinderGeometry args={[0.025, 0.025, 0.06, 8]} /><primitive object={mDarkMetal} attach="material" />
        </mesh>
      </group>
    </group>
  );
}

function NewtonCradleProp({ position }: { position: [number, number, number] }) {
  const ballRefs = useRef<(Group | null)[]>([null, null, null, null]);
  const L = 0.24;
  const pivotY = 0.34;
  const ballXs = [-0.08, -0.027, 0.027, 0.08];

  useFrame(({ clock }) => {
    const t = clock.elapsedTime * 2.5;
    const swing = Math.sin(t);
    const leftAngle = swing > 0 ? swing * 0.6 : 0;
    const rightAngle = swing < 0 ? swing * 0.6 : 0;

    ballRefs.current.forEach((ref, i) => {
      if (!ref) return;
      const angle = i === 0 ? -leftAngle : i === 3 ? -rightAngle : 0;
      const bx = ballXs[i] + Math.sin(angle) * L;
      const by = pivotY - Math.cos(angle) * L;
      ref.position.set(bx, by, 0);
      ref.userData.angle = angle;
    });
  });

  return (
    <group position={position}>
      {/* Frame */}
      <mesh position={[-0.12, 0.18, 0]}>
        <cylinderGeometry args={[0.008, 0.008, 0.32, 6]} /><primitive object={mSteel} attach="material" />
      </mesh>
      <mesh position={[0.12, 0.18, 0]}>
        <cylinderGeometry args={[0.008, 0.008, 0.32, 6]} /><primitive object={mSteel} attach="material" />
      </mesh>
      <mesh position={[0, 0.34, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.006, 0.006, 0.26, 6]} /><primitive object={mSteel} attach="material" />
      </mesh>
      {/* Base */}
      <mesh position={[0, 0.02, 0]}>
        <boxGeometry args={[0.3, 0.03, 0.1]} /><primitive object={mDarkMetal} attach="material" />
      </mesh>
      {/* Balls on strings */}
      {ballXs.map((x, i) => (
        <group key={i} ref={(el) => { ballRefs.current[i] = el; }} position={[x, pivotY - L, 0]}>
          <mesh>
            <sphereGeometry args={[0.025, 10, 10]} /><primitive object={mChrome} attach="material" />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function LauncherProp({ position }: { position: [number, number, number] }) {
  const ballRef = useRef<Group>(null);
  useFrame(({ clock }) => {
    if (!ballRef.current) return;
    const cycle = clock.elapsedTime % 3;
    const launchT = cycle < 0.8 ? cycle / 0.8 : 1;
    const h = launchT < 1 ? Math.sin(launchT * Math.PI) * 0.25 : 0;
    ballRef.current.position.set(0.14, 0.22 + h, 0);
  });
  return (
    <group position={position}>
      <mesh position={[0, 0.03, 0]}>
        <boxGeometry args={[0.2, 0.05, 0.12]} /><primitive object={mDarkMetal} attach="material" />
      </mesh>
      <mesh position={[0.04, 0.12, 0]} rotation={[0, 0, Math.PI * 0.22]}>
        <cylinderGeometry args={[0.035, 0.04, 0.2, 10]} /><primitive object={mDarkMetal} attach="material" />
      </mesh>
      <group ref={ballRef} position={[0.14, 0.22, 0]}>
        <mesh>
          <sphereGeometry args={[0.03, 10, 10]} /><primitive object={mOrange} attach="material" />
        </mesh>
      </group>
    </group>
  );
}

function CircuitBoardProp({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.015, 0]}>
        <boxGeometry args={[0.35, 0.02, 0.25]} /><primitive object={mGreen} attach="material" />
      </mesh>
      {/* Components */}
      <mesh position={[-0.08, 0.04, 0.04]}>
        <cylinderGeometry args={[0.015, 0.015, 0.04, 6]} /><primitive object={mRed} attach="material" />
      </mesh>
      <mesh position={[0.06, 0.04, -0.04]}>
        <cylinderGeometry args={[0.015, 0.015, 0.04, 6]} /><primitive object={mBlue} attach="material" />
      </mesh>
      <mesh position={[0.1, 0.04, 0.06]}>
        <cylinderGeometry args={[0.012, 0.012, 0.035, 6]} /><primitive object={mYellow} attach="material" />
      </mesh>
      {/* Chip */}
      <mesh position={[-0.04, 0.035, -0.05]}>
        <boxGeometry args={[0.06, 0.02, 0.04]} /><primitive object={mDarkMetal} attach="material" />
      </mesh>
      {/* Wires */}
      <mesh position={[0, 0.028, 0]} rotation={[0, 0.4, 0]}>
        <boxGeometry args={[0.25, 0.003, 0.003]} /><primitive object={mSteel} attach="material" />
      </mesh>
      <mesh position={[0.02, 0.028, 0.02]} rotation={[0, -0.6, 0]}>
        <boxGeometry args={[0.18, 0.003, 0.003]} /><primitive object={mSteel} attach="material" />
      </mesh>
    </group>
  );
}

function EnergyRampProp({ position }: { position: [number, number, number] }) {
  const ballRef = useRef<Group>(null);
  const rampAngle = 0.35;
  const rampLen = 0.3;
  useFrame(({ clock }) => {
    if (!ballRef.current) return;
    const cycle = (clock.elapsedTime * 0.6) % 1;
    const t = cycle < 0.7 ? cycle / 0.7 : 1 - (cycle - 0.7) / 0.3;
    const along = (1 - t) * rampLen * 0.4;
    ballRef.current.position.set(
      -0.12 + Math.cos(rampAngle) * along,
      0.14 - Math.sin(rampAngle) * along,
      0
    );
  });
  return (
    <group position={position}>
      <mesh position={[0, 0.08, 0]} rotation={[0, 0, -rampAngle]}>
        <boxGeometry args={[0.3, 0.02, 0.12]} /><primitive object={mSteel} attach="material" />
      </mesh>
      <group ref={ballRef} position={[-0.12, 0.14, 0]}>
        <mesh>
          <sphereGeometry args={[0.025, 10, 10]} /><primitive object={mOrange} attach="material" />
        </mesh>
      </group>
      <mesh position={[-0.14, 0.06, 0]}>
        <boxGeometry args={[0.02, 0.12, 0.08]} /><primitive object={mDarkMetal} attach="material" />
      </mesh>
    </group>
  );
}

function CollisionTrackProp({ position }: { position: [number, number, number] }) {
  const blockA = useRef<Group>(null);
  const blockB = useRef<Group>(null);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime * 1.2;
    const cycle = t % 3;
    let ax = -0.14, bx = 0.14;
    if (cycle < 1) {
      ax = -0.14 + cycle * 0.14;
      bx = 0.14 - cycle * 0.14;
    } else if (cycle < 1.3) {
      const bounce = (cycle - 1) / 0.3;
      ax = bounce * -0.08;
      bx = bounce * 0.08;
    } else if (cycle < 2.3) {
      const drift = (cycle - 1.3) / 1;
      ax = -0.08 - drift * 0.06;
      bx = 0.08 + drift * 0.06;
    } else {
      ax = -0.14;
      bx = 0.14;
    }
    if (blockA.current) blockA.current.position.x = ax;
    if (blockB.current) blockB.current.position.x = bx;
  });
  return (
    <group position={position}>
      <mesh position={[0, BENCH_H + 0.02, 0]}>
        <boxGeometry args={[0.5, 0.015, 0.06]} /><primitive object={mSteel} attach="material" />
      </mesh>
      <group ref={blockA} position={[-0.14, BENCH_H + 0.055, 0]}>
        <mesh>
          <boxGeometry args={[0.06, 0.05, 0.05]} /><primitive object={mBlue} attach="material" />
        </mesh>
      </group>
      <group ref={blockB} position={[0.14, BENCH_H + 0.055, 0]}>
        <mesh>
          <boxGeometry args={[0.06, 0.05, 0.05]} /><primitive object={mRed} attach="material" />
        </mesh>
      </group>
    </group>
  );
}

function WaveTankProp({ position }: { position: [number, number, number] }) {
  const waterRef = useRef<Group>(null);
  useFrame(({ clock }) => {
    if (!waterRef.current) return;
    const t = clock.elapsedTime;
    waterRef.current.position.y = BENCH_H + 0.05 + Math.sin(t * 2) * 0.008;
    waterRef.current.rotation.x = -Math.PI / 2 + Math.sin(t * 1.5) * 0.04;
    waterRef.current.rotation.z = Math.sin(t * 1.8 + 1) * 0.03;
  });
  return (
    <group position={position}>
      <mesh position={[0, BENCH_H + 0.06, -0.08]}>
        <boxGeometry args={[0.4, 0.12, 0.01]} /><primitive object={mGlass} attach="material" />
      </mesh>
      <mesh position={[0, BENCH_H + 0.06, 0.08]}>
        <boxGeometry args={[0.4, 0.12, 0.01]} /><primitive object={mGlass} attach="material" />
      </mesh>
      <mesh position={[-0.2, BENCH_H + 0.06, 0]}>
        <boxGeometry args={[0.01, 0.12, 0.17]} /><primitive object={mGlass} attach="material" />
      </mesh>
      <mesh position={[0.2, BENCH_H + 0.06, 0]}>
        <boxGeometry args={[0.01, 0.12, 0.17]} /><primitive object={mGlass} attach="material" />
      </mesh>
      <group ref={waterRef} position={[0, BENCH_H + 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <mesh>
          <planeGeometry args={[0.38, 0.15]} /><primitive object={mWater} attach="material" />
        </mesh>
      </group>
      <mesh position={[0, BENCH_H + 0.005, 0]}>
        <boxGeometry args={[0.42, 0.01, 0.18]} /><primitive object={mDarkMetal} attach="material" />
      </mesh>
    </group>
  );
}

function PendulumStandProp({ position }: { position: [number, number, number] }) {
  const rodRef = useRef<Group>(null);
  const bobRef = useRef<Group>(null);
  const L = 0.5;
  const pivotY = 0.78;
  useFrame(({ clock }) => {
    const angle = Math.sin(clock.elapsedTime * 1.6) * 0.45;
    const bobX = Math.sin(angle) * L;
    const bobY = -Math.cos(angle) * L;
    if (bobRef.current) bobRef.current.position.set(bobX, pivotY + bobY, 0);
    if (rodRef.current) {
      rodRef.current.position.set(bobX / 2, pivotY + bobY / 2, 0);
      rodRef.current.rotation.set(0, 0, angle);
    }
  });
  return (
    <group position={position}>
      <mesh position={[0, 0.02, 0]}>
        <boxGeometry args={[0.3, 0.03, 0.15]} /><primitive object={mDarkMetal} attach="material" />
      </mesh>
      <mesh position={[0, 0.4, 0]}>
        <cylinderGeometry args={[0.015, 0.018, 0.75, 8]} /><primitive object={mSteel} attach="material" />
      </mesh>
      <mesh position={[0, pivotY, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.01, 0.01, 0.18, 6]} /><primitive object={mSteel} attach="material" />
      </mesh>
      <group ref={rodRef} position={[0, pivotY - L / 2, 0]}>
        <mesh>
          <cylinderGeometry args={[0.005, 0.005, L, 4]} /><primitive object={mSteel} attach="material" />
        </mesh>
      </group>
      <group ref={bobRef} position={[0, pivotY - L, 0]}>
        <mesh>
          <sphereGeometry args={[0.04, 12, 12]} /><primitive object={mChrome} attach="material" />
        </mesh>
      </group>
    </group>
  );
}

function FrictionRampProp({ position }: { position: [number, number, number] }) {
  const angle = 0.45;
  const blockRef = useRef<Group>(null);
  useFrame(({ clock }) => {
    if (!blockRef.current) return;
    const cycle = (clock.elapsedTime * 0.4) % 1;
    const t = cycle < 0.8 ? cycle / 0.8 : 0;
    const along = t * 0.15;
    blockRef.current.position.set(
      -0.02 + Math.cos(angle) * along,
      0.24 - Math.sin(angle) * along,
      0
    );
  });
  return (
    <group position={position}>
      <mesh position={[0, 0.18, 0]} rotation={[0, 0, -angle]}>
        <boxGeometry args={[0.5, 0.025, 0.2]} /><primitive object={mWood} attach="material" />
      </mesh>
      <mesh position={[-0.2, 0.1, 0]}>
        <boxGeometry args={[0.025, 0.22, 0.18]} /><primitive object={mWood} attach="material" />
      </mesh>
      <mesh position={[0, 0.01, 0]}>
        <boxGeometry args={[0.5, 0.02, 0.2]} /><primitive object={mWood} attach="material" />
      </mesh>
      <group ref={blockRef} position={[-0.02, 0.24, 0]} rotation={[0, 0, -angle]}>
        <mesh>
          <boxGeometry args={[0.06, 0.04, 0.05]} /><primitive object={mPurple} attach="material" />
        </mesh>
      </group>
    </group>
  );
}

function SmallTable({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, BENCH_H, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.8, 0.04, 0.5]} /><primitive object={mBench} attach="material" />
      </mesh>
      {[[-0.32, -0.18], [0.32, -0.18], [-0.32, 0.18], [0.32, 0.18]].map(([x, z], i) => (
        <mesh key={i} position={[x, BENCH_H / 2 - 0.02, z]}>
          <cylinderGeometry args={[0.02, 0.02, BENCH_H - 0.04, 6]} /><primitive object={mBenchLeg} attach="material" />
        </mesh>
      ))}
    </group>
  );
}

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

function DustParticles() {
  const ref = useRef<Group>(null);
  const particles = useMemo(() => Array.from({ length: 30 }, () => ({
    x: (Math.random() - 0.5) * W * 0.8,
    y: 0.5 + Math.random() * (H - 1),
    z: (Math.random() - 0.5) * D * 0.8,
    speed: 0.1 + Math.random() * 0.2,
    phase: Math.random() * Math.PI * 2,
  })), []);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    ref.current.children.forEach((c, i) => {
      const p = particles[i];
      c.position.x = p.x + Math.sin(clock.elapsedTime * p.speed + p.phase) * 0.3;
      c.position.y = p.y + Math.sin(clock.elapsedTime * p.speed * 0.7) * 0.15;
    });
  });
  return (
    <group ref={ref}>
      {particles.map((p, i) => (
        <mesh key={i} position={[p.x, p.y, p.z]}>
          <sphereGeometry args={[0.008, 4, 4]} />
          <meshBasicMaterial color="#e0e8ff" transparent opacity={0.35} />
        </mesh>
      ))}
    </group>
  );
}

/* ── Safety equipment ─────────────────────────────────────────── */

function FireExtinguisher({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.3, 0]}>
        <cylinderGeometry args={[0.07, 0.08, 0.55, 10]} />
        <meshStandardMaterial color="#cc2222" roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.6, 0]}>
        <cylinderGeometry args={[0.04, 0.05, 0.06, 8]} />
        <primitive object={mDarkMetal} attach="material" />
      </mesh>
      <mesh position={[0.04, 0.64, 0]} rotation={[0, 0, -0.4]}>
        <boxGeometry args={[0.08, 0.015, 0.02]} />
        <primitive object={mDarkMetal} attach="material" />
      </mesh>
      <mesh position={[0.02, 0.52, 0.06]} rotation={[0.3, 0, 0]}>
        <cylinderGeometry args={[0.012, 0.012, 0.18, 6]} />
        <primitive object={mDarkMetal} attach="material" />
      </mesh>
    </group>
  );
}

function FirstAidKit({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh>
        <boxGeometry args={[0.3, 0.22, 0.12]} />
        <meshStandardMaterial color="#e8e8e8" roughness={0.4} />
      </mesh>
      {/* Red cross */}
      <mesh position={[0, 0, 0.061]}>
        <boxGeometry args={[0.08, 0.02, 0.002]} />
        <meshStandardMaterial color="#cc2222" roughness={0.5} />
      </mesh>
      <mesh position={[0, 0, 0.061]}>
        <boxGeometry args={[0.02, 0.08, 0.002]} />
        <meshStandardMaterial color="#cc2222" roughness={0.5} />
      </mesh>
      <mesh position={[0.12, -0.02, 0]}>
        <boxGeometry args={[0.025, 0.04, 0.06]} />
        <primitive object={mDarkMetal} attach="material" />
      </mesh>
    </group>
  );
}

function GogglesRack({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Wall bracket */}
      <mesh><boxGeometry args={[0.5, 0.04, 0.08]} /><primitive object={mSteel} attach="material" /></mesh>
      {/* Hooks + goggles */}
      {[-0.18, -0.06, 0.06, 0.18].map((x, i) => (
        <group key={i} position={[x, -0.06, 0]}>
          <mesh><cylinderGeometry args={[0.008, 0.008, 0.08, 4]} /><primitive object={mSteel} attach="material" /></mesh>
          <mesh position={[0, -0.06, 0]}>
            <torusGeometry args={[0.03, 0.008, 6, 12]} />
            <meshStandardMaterial color={i % 2 === 0 ? "#4488cc" : "#44aa66"} roughness={0.3} transparent opacity={0.7} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function LabCoatHooks({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh><boxGeometry args={[0.6, 0.06, 0.04]} /><primitive object={mWood} attach="material" /></mesh>
      {[-0.2, 0, 0.2].map((x, i) => (
        <group key={i} position={[x, 0, 0]}>
          <mesh position={[0, -0.04, 0.03]} rotation={[0.5, 0, 0]}>
            <cylinderGeometry args={[0.008, 0.008, 0.06, 4]} /><primitive object={mSteel} attach="material" />
          </mesh>
          {/* Coat shape */}
          <mesh position={[0, -0.3, 0.02]}>
            <boxGeometry args={[0.14, 0.4, 0.02]} />
            <meshStandardMaterial color="#f0f0f0" roughness={0.8} />
          </mesh>
          <mesh position={[0, -0.12, 0.02]}>
            <boxGeometry args={[0.2, 0.06, 0.015]} />
            <meshStandardMaterial color="#f0f0f0" roughness={0.8} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function SafetySign({ position, text }: { position: [number, number, number]; text: string }) {
  const tex = useMemo(() => {
    const c = document.createElement("canvas"); c.width = 256; c.height = 128;
    const ctx = c.getContext("2d");
    if (!ctx) return null;
    ctx.fillStyle = "#22aa44"; ctx.fillRect(0, 0, 256, 128);
    ctx.fillStyle = "#ffffff"; ctx.font = "bold 22px sans-serif"; ctx.textAlign = "center";
    text.split("\n").forEach((line, i) => ctx.fillText(line, 128, 50 + i * 30));
    const t = new CanvasTexture(c); t.colorSpace = SRGBColorSpace; return t;
  }, [text]);
  return (
    <mesh position={position}>
      <planeGeometry args={[0.4, 0.2]} />
      {tex ? <meshBasicMaterial map={tex} /> : <meshBasicMaterial color="#22aa44" />}
    </mesh>
  );
}

/* ── Measurement instruments ─────────────────────────────────── */

function Ruler({ position, rotation }: { position: [number, number, number]; rotation?: [number, number, number] }) {
  return (
    <mesh position={position} rotation={rotation}>
      <boxGeometry args={[0.3, 0.003, 0.03]} />
      <meshStandardMaterial color="#e8d880" roughness={0.6} />
    </mesh>
  );
}

function Protractor({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.06, 16, 0, Math.PI]} />
        <meshStandardMaterial color="#88bbdd" roughness={0.3} transparent opacity={0.7} side={DoubleSide} />
      </mesh>
    </group>
  );
}

function Stopwatch({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.025, 0.025, 0.008, 12]} />
        <primitive object={mChrome} attach="material" />
      </mesh>
      <mesh position={[0, 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.022, 12]} />
        <meshBasicMaterial color="#f8f8f0" />
      </mesh>
      <mesh position={[0, 0.012, -0.025]}>
        <boxGeometry args={[0.008, 0.008, 0.015]} />
        <primitive object={mChrome} attach="material" />
      </mesh>
    </group>
  );
}

function SpringScale({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.12, 0]}>
        <cylinderGeometry args={[0.02, 0.02, 0.2, 8]} />
        <meshStandardMaterial color="#cccc44" roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.02, 0]}>
        <cylinderGeometry args={[0.004, 0.004, 0.04, 4]} />
        <primitive object={mSteel} attach="material" />
      </mesh>
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[0.015, 6, 6]} />
        <primitive object={mDarkMetal} attach="material" />
      </mesh>
      <mesh position={[0, 0.22, 0]}>
        <torusGeometry args={[0.012, 0.003, 4, 8]} />
        <primitive object={mSteel} attach="material" />
      </mesh>
    </group>
  );
}

function Calipers({ position, rotation }: { position: [number, number, number]; rotation?: [number, number, number] }) {
  return (
    <group position={position} rotation={rotation}>
      <mesh><boxGeometry args={[0.18, 0.003, 0.025]} /><primitive object={mSteel} attach="material" /></mesh>
      <mesh position={[-0.06, 0, 0.018]}><boxGeometry args={[0.003, 0.003, 0.035]} /><primitive object={mSteel} attach="material" /></mesh>
      <mesh position={[0.02, 0, 0.018]}><boxGeometry args={[0.003, 0.003, 0.035]} /><primitive object={mSteel} attach="material" /></mesh>
    </group>
  );
}

function Multimeter({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh><boxGeometry args={[0.08, 0.025, 0.12]} /><meshStandardMaterial color="#222222" roughness={0.6} /></mesh>
      <mesh position={[0, 0.013, -0.02]}>
        <boxGeometry args={[0.06, 0.002, 0.04]} />
        <meshBasicMaterial color="#335533" />
      </mesh>
      <mesh position={[-0.025, 0.014, 0.03]}>
        <cylinderGeometry args={[0.006, 0.006, 0.004, 8]} />
        <meshStandardMaterial color="#cc2222" roughness={0.4} />
      </mesh>
      <mesh position={[0.025, 0.014, 0.03]}>
        <cylinderGeometry args={[0.006, 0.006, 0.004, 8]} />
        <meshStandardMaterial color="#222222" roughness={0.4} />
      </mesh>
    </group>
  );
}

/* ── Environment details ─────────────────────────────────────── */

function VentDuct({ position, length = 3 }: { position: [number, number, number]; length?: number }) {
  return (
    <group position={position}>
      <mesh><boxGeometry args={[length, 0.2, 0.25]} /><primitive object={mPipe} attach="material" /></mesh>
      {Array.from({ length: Math.floor(length / 0.5) }, (_, i) => (
        <mesh key={i} position={[-length / 2 + 0.25 + i * 0.5, -0.11, 0]}>
          <boxGeometry args={[0.08, 0.005, 0.2]} /><primitive object={mPipe} attach="material" />
        </mesh>
      ))}
    </group>
  );
}

function PowerOutlet({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh><boxGeometry args={[0.07, 0.1, 0.015]} /><meshStandardMaterial color="#e8e4dc" roughness={0.6} /></mesh>
      <mesh position={[0, 0.02, 0.008]}>
        <boxGeometry args={[0.04, 0.02, 0.003]} /><meshStandardMaterial color="#2a2a2a" roughness={0.4} />
      </mesh>
      <mesh position={[0, -0.02, 0.008]}>
        <boxGeometry args={[0.04, 0.02, 0.003]} /><meshStandardMaterial color="#2a2a2a" roughness={0.4} />
      </mesh>
    </group>
  );
}

function WallClock({ position }: { position: [number, number, number] }) {
  const handRef = useRef<Group>(null);
  useFrame(({ clock }) => {
    if (handRef.current) handRef.current.rotation.z = -clock.elapsedTime * 0.1;
  });
  return (
    <group position={position}>
      <mesh rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.15, 0.15, 0.03, 20]} /><meshStandardMaterial color="#e8e4dc" roughness={0.4} /></mesh>
      <mesh position={[0, 0, 0.016]}><circleGeometry args={[0.13, 20]} /><meshBasicMaterial color="#f8f8f0" /></mesh>
      <group ref={handRef} position={[0, 0, 0.02]}>
        <mesh position={[0, 0.04, 0]}><boxGeometry args={[0.005, 0.08, 0.003]} /><meshBasicMaterial color="#222" /></mesh>
      </group>
      <mesh position={[0, 0, 0.02]}>
        <mesh position={[0, 0.05, 0]}><boxGeometry args={[0.003, 0.1, 0.003]} /><meshBasicMaterial color="#cc2222" /></mesh>
      </mesh>
    </group>
  );
}

function WallPoster({ position, title, color }: { position: [number, number, number]; title: string; color: string }) {
  const tex = useMemo(() => {
    const c = document.createElement("canvas"); c.width = 256; c.height = 384;
    const ctx = c.getContext("2d");
    if (!ctx) return null;
    ctx.fillStyle = color; ctx.fillRect(0, 0, 256, 384);
    ctx.fillStyle = "#ffffff"; ctx.font = "bold 20px sans-serif"; ctx.textAlign = "center";
    ctx.fillText(title, 128, 30);
    ctx.strokeStyle = "rgba(255,255,255,0.3)"; ctx.lineWidth = 1;
    for (let r = 0; r < 7; r++) for (let col = 0; col < 9; col++) {
      const hue = (r * 9 + col) * 3;
      ctx.fillStyle = `hsl(${hue}, 60%, 50%)`;
      ctx.fillRect(8 + col * 27, 45 + r * 46, 24, 38);
      ctx.strokeRect(8 + col * 27, 45 + r * 46, 24, 38);
    }
    const t = new CanvasTexture(c); t.colorSpace = SRGBColorSpace; return t;
  }, [title, color]);
  return (
    <mesh position={position}>
      <planeGeometry args={[0.5, 0.75]} />
      {tex ? <meshBasicMaterial map={tex} /> : <meshBasicMaterial color={color} />}
    </mesh>
  );
}

function PortraitFrame({ position, label, bgColor }: { position: [number, number, number]; label: string; bgColor: string }) {
  const tex = useMemo(() => {
    const c = document.createElement("canvas"); c.width = 128; c.height = 160;
    const ctx = c.getContext("2d");
    if (!ctx) return null;
    ctx.fillStyle = bgColor; ctx.fillRect(0, 0, 128, 160);
    ctx.fillStyle = "rgba(255,255,255,0.15)";
    ctx.beginPath(); ctx.arc(64, 55, 30, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(64, 110, 25, 20, 0, Math.PI, 0); ctx.fill();
    ctx.fillStyle = "#ffffff"; ctx.font = "bold 12px sans-serif"; ctx.textAlign = "center";
    ctx.fillText(label, 64, 150);
    const t = new CanvasTexture(c); t.colorSpace = SRGBColorSpace; return t;
  }, [label, bgColor]);
  return (
    <group position={position}>
      <mesh><boxGeometry args={[0.28, 0.36, 0.02]} /><primitive object={mBoardFrame} attach="material" /></mesh>
      <mesh position={[0, 0, 0.011]}>
        <planeGeometry args={[0.24, 0.32]} />
        {tex ? <meshBasicMaterial map={tex} /> : <meshBasicMaterial color={bgColor} />}
      </mesh>
    </group>
  );
}

/* ── Whiteboard with formulas ────────────────────────────────── */

function WhiteboardWithFormulas() {
  const tex = useMemo(() => {
    const c = document.createElement("canvas"); c.width = 512; c.height = 256;
    const ctx = c.getContext("2d");
    if (!ctx) return null;
    ctx.fillStyle = "#1a1d2a"; ctx.fillRect(0, 0, 512, 256);
    ctx.fillStyle = "rgba(220,220,255,0.85)"; ctx.font = "italic 26px Georgia, serif";
    ctx.fillText("F = m × a", 30, 45);
    ctx.fillText("E = ½ mv²", 30, 90);
    ctx.fillText("V = I × R", 30, 135);
    ctx.fillText("W = F × d", 30, 180);
    ctx.fillStyle = "rgba(255,220,140,0.8)"; ctx.font = "italic 24px Georgia, serif";
    ctx.fillText("PE = mgh", 280, 45);
    ctx.fillText("T = 2π√(L/g)", 280, 90);
    ctx.fillText("p = mv", 280, 135);
    ctx.fillText("v = fλ", 280, 180);
    ctx.fillStyle = "rgba(180,220,255,0.5)"; ctx.font = "16px sans-serif";
    ctx.fillText("Physics & Machines Lab", 150, 235);
    const t = new CanvasTexture(c); t.colorSpace = SRGBColorSpace; return t;
  }, []);
  return (
    <group position={[0, 2.0, -D / 2 + 0.08]}>
      <mesh><boxGeometry args={[3.8, 1.72, 0.04]} /><primitive object={mBoardFrame} attach="material" /></mesh>
      <mesh position={[0, 0, 0.021]}>
        <planeGeometry args={[3.6, 1.6]} />
        {tex ? <meshBasicMaterial map={tex} /> : <primitive object={mBoard} attach="material" />}
      </mesh>
      {/* Chalk tray */}
      <mesh position={[0, -0.86, 0.06]}>
        <boxGeometry args={[1.2, 0.03, 0.06]} /><primitive object={mBoardFrame} attach="material" />
      </mesh>
      {/* Chalk pieces */}
      <mesh position={[-0.2, -0.83, 0.06]} rotation={[0, 0, 0.1 + Math.PI / 2]}>
        <cylinderGeometry args={[0.008, 0.008, 0.06, 6]} />
        <meshStandardMaterial color="#e8e8e8" roughness={0.9} />
      </mesh>
      <mesh position={[0.1, -0.83, 0.06]} rotation={[0, 0, -0.05 + Math.PI / 2]}>
        <cylinderGeometry args={[0.008, 0.008, 0.05, 6]} />
        <meshStandardMaterial color="#eedd66" roughness={0.9} />
      </mesh>
      {/* Eraser */}
      <mesh position={[0.35, -0.82, 0.06]}>
        <boxGeometry args={[0.08, 0.03, 0.04]} /><meshStandardMaterial color="#555555" roughness={0.8} />
      </mesh>
    </group>
  );
}

const BENCH_Z = -D / 2 + 0.8;
const bounds = { minX: -W / 2 + 0.6, maxX: W / 2 - 0.6, minZ: -D / 2 + 0.6, maxZ: D / 2 - 0.6 };
const start: [number, number, number] = [0, 1.55, 2.5];

export function PhysicsRoomScene({
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
      <ambientLight intensity={0.45} />
      <directionalLight position={[4, H + 2, 2]} intensity={0.6} castShadow={ultra}
        shadow-mapSize-width={1024} shadow-mapSize-height={1024} />
      <hemisphereLight args={["#c0d0e8", "#404858", 0.4]} />

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
        <Bench position={[-3.2, 0, BENCH_Z]} />
        <Bench position={[0, 0, BENCH_Z]} width={2.6} />
        <Bench position={[3.2, 0, BENCH_Z]} />
        <SideTable position={[-4.2, 0, 0]} />
        <SideTable position={[4.2, 0, 0]} />
        <SmallTable position={[-2.0, 0, D / 2 - 1.2]} />
        <SmallTable position={[2.0, 0, D / 2 - 1.2]} />
      </group>

      <Windows />
      <Door />
      <WhiteboardWithFormulas />

      {[-3.2, 0, 3.2].map((x) => <Stool key={x} position={[x, 0, BENCH_Z + 1.5]} />)}
      <Stool position={[-4.2, 0, 1.0]} />
      <Stool position={[4.2, 0, 1.0]} />

      {/* Station props on back benches */}
      <GearProp position={[0, BENCH_H, BENCH_Z]} />
      <NewtonCradleProp position={[-3.2, BENCH_H, BENCH_Z]} />
      <LauncherProp position={[3.2, BENCH_H, BENCH_Z]} />

      {/* Station props on side tables */}
      <CircuitBoardProp position={[-4.2, BENCH_H, 0]} />
      <EnergyRampProp position={[4.2, BENCH_H, 0]} />

      {/* Front-area props on small tables */}
      <WaveTankProp position={[-2.0, 0, D / 2 - 1.2]} />
      <CollisionTrackProp position={[2.0, 0, D / 2 - 1.2]} />

      {/* Floor-standing props */}
      <PendulumStandProp position={[-4.2, 0, 3.0]} />
      <FrictionRampProp position={[4.2, 0, 3.0]} />

      {/* Measurement instruments scattered on benches */}
      <Ruler position={[-2.6, BENCH_H + 0.03, BENCH_Z + 0.15]} rotation={[0, 0.3, 0]} />
      <Ruler position={[3.8, BENCH_H + 0.03, BENCH_Z - 0.1]} rotation={[0, -0.2, 0]} />
      <Protractor position={[0.8, BENCH_H + 0.03, BENCH_Z + 0.2]} />
      <Stopwatch position={[-3.8, BENCH_H + 0.03, BENCH_Z + 0.2]} />
      <Stopwatch position={[1.5, BENCH_H + 0.03, BENCH_Z - 0.15]} />
      <SpringScale position={[-4.2, BENCH_H + 0.03, 0.25]} />
      <Calipers position={[4.6, BENCH_H + 0.03, -0.2]} rotation={[0, 0.5, 0]} />
      <Multimeter position={[-4.5, BENCH_H + 0.03, -0.15]} />

      {/* Safety equipment */}
      <FireExtinguisher position={[-W / 2 + 0.25, 0, -1.5]} />
      <FirstAidKit position={[-W / 2 + 0.08, 1.6, -2.5]} />
      <GogglesRack position={[-W / 2 + 0.08, 1.8, 1.0]} />
      <LabCoatHooks position={[-W / 2 + 0.08, 2.0, 2.5]} />
      <SafetySign position={[-W / 2 + 0.08, 2.8, -1.0]} text={"SAFETY FIRST\nWear goggles"} />
      <SafetySign position={[-W / 2 + 0.08, 2.8, 0]} text={"EMERGENCY\nEXIT →"} />

      {/* Environment details */}
      <VentDuct position={[-3, H - 0.02, -2]} length={4} />
      <VentDuct position={[3, H - 0.02, 2]} length={3} />
      <PowerOutlet position={[W / 2 - 0.08, 0.6, -3]} />
      <PowerOutlet position={[W / 2 - 0.08, 0.6, 1]} />
      <PowerOutlet position={[-W / 2 + 0.08, 0.6, -3.5]} />
      <PowerOutlet position={[-W / 2 + 0.08, 0.6, 2]} />
      <WallClock position={[0, H - 0.4, D / 2 - 0.08]} />
      <WallPoster position={[W / 2 - 0.08, 2.0, -2.5]} title="Periodic Table" color="#1a3366" />
      <PortraitFrame position={[2.5, 2.6, -D / 2 + 0.08]} label="Newton" bgColor="#3a2a1a" />
      <PortraitFrame position={[-2.5, 2.6, -D / 2 + 0.08]} label="Einstein" bgColor="#1a2a3a" />

      {/* Ceiling lights */}
      {[-3.2, 0, 3.2].map((z, i) => (
        <group key={i} position={[0, H - 0.12, z]}>
          <mesh><boxGeometry args={[2.4, 0.06, 0.3]} /><primitive object={mPipe} attach="material" /></mesh>
          <mesh position={[0, -0.04, 0]}><boxGeometry args={[2.2, 0.02, 0.22]} /><primitive object={mEmissive} attach="material" /></mesh>
        </group>
      ))}

      <ProximityTrigger onNear={handleNear} />
      {STATIONS.map((s) => (
        <StationMarker key={s.id} station={s} active={near.current === s.id} />
      ))}
      {ultra && <DustParticles />}
    </>
  );
}
