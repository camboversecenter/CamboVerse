import { useMemo, useRef } from "react";
import { Sky, OrbitControls, Html, Instances, Instance } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { Vector3 } from "three";
import { Kiosk } from "./Kiosk";
import { Palm } from "./Palm";
import { FirstPersonControls, type WalkInput } from "./FirstPersonControls";
import type { Market } from "../shops";
import type { MutableRefObject } from "react";

/**
 * The virtual market — a paved clearing set inside the forest near the site,
 * ringed by brand kiosks, with a central fountain and an entrance arch. Orbit
 * and tap a stall to browse, or switch to Walk and stroll up to one (a prompt
 * appears when you're near). The forest is a single instanced draw (mobile-cheap).
 */
const CLEARING_R = 13; // paved market radius
const GREENS = ["#3f6f2f", "#49772f", "#356329", "#547f37", "#2f5b26"];

export function ShopScene({
  market,
  activeKiosk,
  onSelectKiosk,
  mode,
  walkInput,
  onNear,
}: {
  market: Market;
  activeKiosk: string | null;
  onSelectKiosk: (id: string) => void;
  mode: "orbit" | "walk";
  walkInput: MutableRefObject<WalkInput>;
  onNear: (id: string | null) => void;
}) {
  // Deterministic forest ringing the clearing (kept off the entrance path).
  const trees = useMemo(() => {
    const out: { x: number; z: number; s: number; c: string }[] = [];
    let i = 0;
    const rand = () => {
      i++;
      const v = Math.sin(i * 127.1) * 43758.5453;
      return v - Math.floor(v);
    };
    let guard = 0;
    while (out.length < 190 && guard++ < 4000) {
      const ang = rand() * Math.PI * 2;
      const r = CLEARING_R + 0.5 + rand() * 17;
      const x = Math.cos(ang) * r;
      const z = Math.sin(ang) * r;
      if (Math.abs(x) < 3.2 && z > 8) continue; // keep the entrance (+z) open
      out.push({ x, z, s: 0.8 + rand() * 0.9, c: GREENS[out.length % GREENS.length] });
    }
    return out;
  }, []);

  return (
    <>
      <Sky sunPosition={[12, 6, 8]} turbidity={6} rayleigh={1.2} mieCoefficient={0.006} mieDirectionalG={0.9} />
      <fog attach="fog" args={["#dbe4d2", 34, 120]} />
      <ambientLight intensity={0.4} />
      <hemisphereLight args={["#cfe0ff", "#5c6b39", 0.6]} />
      <directionalLight
        position={[16, 18, 10]}
        intensity={1.9}
        color="#ffe9cf"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0004}
        shadow-camera-left={-26}
        shadow-camera-right={26}
        shadow-camera-top={26}
        shadow-camera-bottom={-26}
      />

      {/* Forest floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[140, 140]} />
        <meshStandardMaterial color="#4f6a30" roughness={1} />
      </mesh>
      {/* Paved market clearing */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]} receiveShadow>
        <circleGeometry args={[CLEARING_R, 56]} />
        <meshStandardMaterial color="#b8ae97" roughness={1} />
      </mesh>
      {/* Central medallion + entrance path */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
        <circleGeometry args={[5, 48]} />
        <meshStandardMaterial color="#a89c81" roughness={1} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 11]}>
        <planeGeometry args={[3.4, 12]} />
        <meshStandardMaterial color="#a89c81" roughness={1} />
      </mesh>

      {/* Central fountain */}
      <group position={[0, 0, 0]}>
        <mesh position={[0, 0.25, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[1.9, 2.1, 0.5, 28]} />
          <meshStandardMaterial color="#8c8069" roughness={0.9} />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.52, 0]}>
          <circleGeometry args={[1.7, 28]} />
          <meshStandardMaterial color="#4c7d90" roughness={0.3} metalness={0.4} />
        </mesh>
        <mesh position={[0, 0.9, 0]} castShadow>
          <cylinderGeometry args={[0.3, 0.5, 0.9, 16]} />
          <meshStandardMaterial color="#9a8e75" roughness={0.9} />
        </mesh>
      </group>

      {/* Entrance arch (front, +z) */}
      <group position={[0, 0, 14]}>
        {[-3.4, 3.4].map((x) => (
          <mesh key={x} position={[x, 1.8, 0]} castShadow>
            <boxGeometry args={[0.6, 3.6, 0.6]} />
            <meshStandardMaterial color="#7a3b2e" roughness={0.9} />
          </mesh>
        ))}
        <mesh position={[0, 3.75, 0]} castShadow>
          <boxGeometry args={[8.0, 0.8, 0.7]} />
          <meshStandardMaterial color="#7a3b2e" roughness={0.9} />
        </mesh>
        <Html position={[0, 3.75, 0.4]} center distanceFactor={15} occlude zIndexRange={[8, 0]}>
          <div className="market-arch">🛍️ {market.title}</div>
        </Html>
      </group>

      {/* Palms around the clearing edge */}
      {Array.from({ length: 8 }, (_, i) => {
        const a = (i / 8) * Math.PI * 2 + 0.4;
        return (
          <Palm key={i} position={[Math.cos(a) * (CLEARING_R - 1), 0, Math.sin(a) * (CLEARING_R - 1)]} scale={0.95} spin={i * 1.7} />
        );
      })}

      {/* Kiosks */}
      {market.kiosks.map((k) => (
        <Kiosk key={k.id} kiosk={k} active={activeKiosk === k.id} onSelect={onSelectKiosk} />
      ))}

      {/* Forest — two instanced draws (trunks + canopies) */}
      <Instances limit={trees.length} castShadow>
        <cylinderGeometry args={[0.06, 0.11, 0.7, 6]} />
        <meshStandardMaterial color="#6b573d" roughness={1} />
        {trees.map((t, i) => (
          <Instance key={i} position={[t.x, 0.4 * t.s, t.z]} scale={[t.s, t.s, t.s]} />
        ))}
      </Instances>
      <Instances limit={trees.length} castShadow>
        <sphereGeometry args={[0.65, 8, 7]} />
        <meshStandardMaterial roughness={1} />
        {trees.map((t, i) => (
          <Instance key={i} color={t.c} position={[t.x, 0.75 * t.s + 0.4, t.z]} scale={[t.s, t.s * 0.85, t.s]} />
        ))}
      </Instances>

      {/* Navigation */}
      {mode === "walk" ? (
        <>
          <FirstPersonControls input={walkInput} start={[0, 1.5, 10]} />
          <NearWatcher market={market} onNear={onNear} />
        </>
      ) : (
        <OrbitControls
          makeDefault
          enablePan={false}
          minDistance={5}
          maxDistance={40}
          maxPolarAngle={Math.PI / 2.15}
          enableDamping
          dampingFactor={0.08}
          target={[0, 1.4, 0]}
        />
      )}
    </>
  );
}

/** In walk mode, reports the nearest kiosk within reach so the UI can prompt. */
function NearWatcher({ market, onNear }: { market: Market; onNear: (id: string | null) => void }) {
  const camera = useThree((s) => s.camera);
  const last = useRef<string | null>(null);
  const tmp = useRef(new Vector3());
  useFrame(() => {
    let best: string | null = null;
    let bestD = 4.2; // reach radius
    for (const k of market.kiosks) {
      tmp.current.set(k.pos[0], 1, k.pos[1]);
      const d = camera.position.distanceTo(tmp.current);
      if (d < bestD) {
        bestD = d;
        best = k.id;
      }
    }
    if (best !== last.current) {
      last.current = best;
      onNear(best);
    }
  });
  return null;
}
