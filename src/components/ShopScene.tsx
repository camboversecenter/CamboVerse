import { useRef } from "react";
import { Sky, OrbitControls, Html } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { Vector3 } from "three";
import { Kiosk } from "./Kiosk";
import { Palm } from "./Palm";
import { FirstPersonControls, type WalkInput } from "./FirstPersonControls";
import type { Market } from "../shops";
import type { MutableRefObject } from "react";

/**
 * The virtual market plaza: a paved square ringed by brand kiosks, with a
 * central fountain and an entrance arch. Orbit and tap a stall to browse, or
 * switch to Walk and stroll up to a stall (a prompt appears when you're near).
 */
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
  return (
    <>
      <Sky sunPosition={[12, 6, 8]} turbidity={6} rayleigh={1.2} mieCoefficient={0.006} mieDirectionalG={0.9} />
      <fog attach="fog" args={["#e6e0d0", 26, 70]} />
      <ambientLight intensity={0.42} />
      <hemisphereLight args={["#cfe0ff", "#6b6048", 0.6]} />
      <directionalLight
        position={[12, 14, 8]}
        intensity={1.9}
        color="#ffe9cf"
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0004}
        shadow-camera-left={-18}
        shadow-camera-right={18}
        shadow-camera-top={18}
        shadow-camera-bottom={-18}
      />

      {/* Paved plaza */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[70, 70]} />
        <meshStandardMaterial color="#b8ae97" roughness={1} />
      </mesh>
      {/* Central medallion */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, -1]}>
        <circleGeometry args={[6.5, 48]} />
        <meshStandardMaterial color="#a89c81" roughness={1} />
      </mesh>

      {/* Central fountain */}
      <group position={[0, 0, -1]}>
        <mesh position={[0, 0.2, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[1.5, 1.7, 0.4, 24]} />
          <meshStandardMaterial color="#8c8069" roughness={0.9} />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.42, 0]}>
          <circleGeometry args={[1.35, 24]} />
          <meshStandardMaterial color="#4c7d90" roughness={0.3} metalness={0.4} />
        </mesh>
        <mesh position={[0, 0.7, 0]} castShadow>
          <cylinderGeometry args={[0.25, 0.4, 0.7, 16]} />
          <meshStandardMaterial color="#9a8e75" roughness={0.9} />
        </mesh>
      </group>

      {/* Entrance arch (front, +z) */}
      <group position={[0, 0, 8]}>
        {[-3.2, 3.2].map((x) => (
          <mesh key={x} position={[x, 1.6, 0]} castShadow>
            <boxGeometry args={[0.5, 3.2, 0.5]} />
            <meshStandardMaterial color="#7a3b2e" roughness={0.9} />
          </mesh>
        ))}
        <mesh position={[0, 3.35, 0]} castShadow>
          <boxGeometry args={[7.4, 0.7, 0.6]} />
          <meshStandardMaterial color="#7a3b2e" roughness={0.9} />
        </mesh>
        <Html position={[0, 3.35, 0.35]} center distanceFactor={13} occlude zIndexRange={[8, 0]}>
          <div className="market-arch">🛍️ {market.title}</div>
        </Html>
      </group>

      {/* Planters with palms at the corners */}
      {[[-12, -10], [12, -10], [-12, 6], [12, 6]].map(([x, z], i) => (
        <group key={i} position={[x, 0, z]}>
          <mesh position={[0, 0.3, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[0.9, 1.0, 0.6, 12]} />
            <meshStandardMaterial color="#6b5a41" roughness={1} />
          </mesh>
          <Palm position={[0, 0.55, 0]} scale={0.85} spin={i * 1.7} />
        </group>
      ))}

      {/* Kiosks */}
      {market.kiosks.map((k) => (
        <Kiosk key={k.id} kiosk={k} active={activeKiosk === k.id} onSelect={onSelectKiosk} />
      ))}

      {/* Navigation */}
      {mode === "walk" ? (
        <>
          <FirstPersonControls input={walkInput} start={[0, 1.5, 4]} />
          <NearWatcher market={market} onNear={onNear} />
        </>
      ) : (
        <OrbitControls
          makeDefault
          enablePan={false}
          minDistance={4}
          maxDistance={24}
          maxPolarAngle={Math.PI / 2.15}
          enableDamping
          dampingFactor={0.08}
          target={[0, 1.4, -2]}
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
    let bestD = 3.6; // reach radius
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
