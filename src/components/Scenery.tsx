import { Sky, MeshReflectorMaterial } from "@react-three/drei";
import { Palm } from "./Palm";

/**
 * Outdoor daytime environment for a heritage site: a procedural sky, warm
 * late-afternoon sun casting long shadows, grass, scattered sugar palms, and —
 * for sites with `water` — a reflecting pool (the iconic Angkor Wat view).
 * Fully self-contained: no HDRI, no external textures.
 */
// Palms flank and stand behind the temple (never in the camera's foreground,
// which is the reflecting pool).
const PALMS: { pos: [number, number, number]; s: number; r: number }[] = [
  { pos: [-7, 0, -6], s: 1.1, r: 0.4 },
  { pos: [7, 0, -7], s: 1.05, r: 1.1 },
  { pos: [-10, 0, -2], s: 1.0, r: 2.0 },
  { pos: [10, 0, -3], s: 1.15, r: 0.7 },
  { pos: [-9, 0, 3.5], s: 0.95, r: 2.6 },
  { pos: [9.5, 0, 3.5], s: 1.05, r: 1.5 },
  { pos: [-5, 0, -11], s: 1.1, r: 0.2 },
  { pos: [5, 0, -11], s: 1.0, r: 3.0 },
  { pos: [-13, 0, -8], s: 1.15, r: 1.8 },
  { pos: [13, 0, -7], s: 1.1, r: 0.9 },
];

export function Scenery({ water = false }: { water?: boolean }) {
  return (
    <>
      <Sky sunPosition={[16, 5, 10]} turbidity={7} rayleigh={1.4} mieCoefficient={0.007} mieDirectionalG={0.9} />
      <fog attach="fog" args={["#d7e2ec", 30, 80]} />

      {/* Lighting: warm sun + cool sky fill. */}
      <ambientLight intensity={0.28} />
      <hemisphereLight args={["#bcd6ff", "#5c6b39", 0.6]} />
      <directionalLight
        position={[16, 12, 10]}
        intensity={2.1}
        color="#ffe6c0"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0004}
        shadow-camera-near={0.5}
        shadow-camera-far={70}
        shadow-camera-left={-18}
        shadow-camera-right={18}
        shadow-camera-top={18}
        shadow-camera-bottom={-18}
      />

      {/* Grass */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[400, 400]} />
        <meshStandardMaterial color="#6f8b3d" roughness={1} />
      </mesh>

      {/* Reflecting pool */}
      {water && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 9]}>
          <planeGeometry args={[34, 16]} />
          <MeshReflectorMaterial
            resolution={512}
            mirror={1}
            blur={[80, 30]}
            mixBlur={1.5}
            mixStrength={5}
            roughness={0.3}
            depthScale={0}
            color="#5a7486"
            metalness={0.6}
          />
        </mesh>
      )}

      {PALMS.map((p, i) => (
        <Palm key={i} position={p.pos} scale={p.s} spin={p.r} />
      ))}
    </>
  );
}
