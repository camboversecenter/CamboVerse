import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { createXRStore, XR, XROrigin, useXR } from "@react-three/xr";
import { useEffect, useMemo, useRef, useState } from "react";
import { Object3D, type InstancedMesh, type Group } from "three";

/**
 * The Khmer Village (ភូមិខ្មែរ) — a procedural, explorable Cambodian village:
 * red-dirt roads, stilt houses (ផ្ទះខ្មែរ) on their posts, sugar palms, a pond,
 * rice paddies at the edge, and the village wat (វត្ត) as its landmark. Built
 * entirely from primitives with a deterministic layout — nothing to download,
 * runs on a low-end phone, explorable in 3D and VR. A reusable kit: the same
 * pieces can dress the Farm and Meditation scenes later.
 */

/** A tiny seeded PRNG so the village is the same every time (no reshuffle). */
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function VillageView({ onBackToMap }: { onBackToMap: () => void }) {
  const store = useMemo(() => createXRStore({ emulate: false }), []);
  const [vrSupported, setVrSupported] = useState(false);

  useEffect(() => {
    const xr = (navigator as Navigator & { xr?: { isSessionSupported(m: string): Promise<boolean> } }).xr;
    xr?.isSessionSupported("immersive-vr").then(setVrSupported).catch(() => setVrSupported(false));
  }, []);

  return (
    <div className="village">
      <Canvas dpr={[1, 2]} camera={{ position: [0, 7, 17], fov: 50 }} gl={{ antialias: true }} shadows>
        <XR store={store}>
          <color attach="background" args={["#bcd4e6"]} />
          <fog attach="fog" args={["#bcd4e6", 26, 60]} />
          <ambientLight intensity={0.8} />
          <hemisphereLight args={["#dceaff", "#5a6a3a", 0.5]} />
          <directionalLight position={[10, 16, 8]} intensity={1.1} castShadow shadow-mapSize={[2048, 2048]} />

          <Village />

          <XROrigin position={[0, 1.2, 8]} />
          <Nav />
        </XR>
      </Canvas>

      <div className="cls-top">
        <button className="backbtn" onClick={onBackToMap}>← Map</button>
        <span className="cls-title">🏡 Khmer Village · ភូមិខ្មែរ</span>
        {vrSupported && (
          <button className="vr-btn cls-vr" onClick={() => store.enterVR()}>🥽 VR</button>
        )}
      </div>

      <div className="cls-hint">
        <p>
          <b>A Khmer village.</b> Drag to wander the red-dirt roads past the stilt houses, the pond, and the
          paddies — the wat (វត្ត) watches over it all. 🥽 or step inside in VR.
        </p>
      </div>
    </div>
  );
}

/* ---------- the village ---------- */

function Village() {
  // Deterministic layout.
  const layout = useMemo(() => {
    const rnd = mulberry32(7);
    // Houses along the main road (z = ±3.8), facing it.
    const houses: { pos: [number, number, number]; rot: number; seed: number }[] = [];
    const northX = [-12, -8, -4, 4, 9, 13];
    const southX = [-10, -6, 3, 7, 12];
    northX.forEach((x) => houses.push({ pos: [x, 0, -4], rot: 0, seed: rnd() * 1000 }));
    southX.forEach((x) => houses.push({ pos: [x, 0, 4], rot: Math.PI, seed: rnd() * 1000 }));

    // Sugar palms + leafy trees scattered, avoiding the roads and house plots.
    const nearRoad = (x: number, z: number) => Math.abs(z) < 1.7 || (Math.abs(x - 2) < 1.7 && Math.abs(z) < 9.5);
    const nearHouse = (x: number, z: number) => houses.some((h) => Math.abs(h.pos[0] - x) < 2.4 && Math.abs(h.pos[2] - z) < 2.4);
    const palms: [number, number, number][] = [];
    const trees: [number, number, number][] = [];
    let guard = 0;
    while (palms.length < 24 && guard < 400) {
      guard++;
      const x = (rnd() * 2 - 1) * 17;
      const z = (rnd() * 2 - 1) * 9.5;
      if (nearRoad(x, z) || nearHouse(x, z)) continue;
      (rnd() < 0.7 ? palms : trees).push([x, 0, z]);
    }
    return { houses, palms, trees };
  }, []);

  return (
    <group>
      <Ground />
      <Roads />
      {layout.houses.map((h, i) => (
        <StiltHouse key={i} position={h.pos} rotation={h.rot} seed={h.seed} />
      ))}
      <PalmField positions={layout.palms} />
      {layout.trees.map((p, i) => (
        <LeafyTree key={i} position={p} />
      ))}
      <Wat position={[2, 0, -10]} />
      <Pond position={[8, 0, 7]} />
      <Paddy position={[-16, 0, 8]} />
      <Paddy position={[15, 0, -9]} />
      <Buffalo position={[-3, 0, 8.5]} />
    </group>
  );
}

function Ground() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <circleGeometry args={[42, 56]} />
      <meshStandardMaterial color="#7c8a4f" roughness={1} />
    </mesh>
  );
}

/** Red-dirt roads: a main road along x and a branch to the wat. */
function Roads() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]} receiveShadow>
        <planeGeometry args={[42, 2.4]} />
        <meshStandardMaterial color="#9c6b3f" roughness={1} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[2, 0.02, -5]} receiveShadow>
        <planeGeometry args={[2.1, 12]} />
        <meshStandardMaterial color="#9c6b3f" roughness={1} />
      </mesh>
    </group>
  );
}

/** A raised Khmer stilt house — posts, a floor, walls, a steep roof, a ladder. */
function StiltHouse({ position, rotation, seed = 0 }: { position: [number, number, number]; rotation: number; seed?: number }) {
  const rnd = mulberry32(Math.floor(seed) + 1);
  const wall = ["#c9a86a", "#b98f5a", "#caa878"][Math.floor(rnd() * 3)];
  const roof = ["#8a3f2c", "#7a4a2a", "#9c6b3f"][Math.floor(rnd() * 3)];
  const posts: [number, number][] = [[-1.1, -0.8], [1.1, -0.8], [-1.1, 0.8], [1.1, 0.8]];
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {posts.map(([x, z], i) => (
        <mesh key={i} position={[x, 0.6, z]} castShadow>
          <cylinderGeometry args={[0.09, 0.11, 1.2, 6]} />
          <meshStandardMaterial color="#6b4a2a" roughness={1} />
        </mesh>
      ))}
      {/* raised floor */}
      <mesh position={[0, 1.22, 0]} castShadow receiveShadow>
        <boxGeometry args={[2.7, 0.16, 2.1]} />
        <meshStandardMaterial color="#7c5b38" roughness={1} />
      </mesh>
      {/* walls */}
      <mesh position={[0, 1.9, 0]} castShadow>
        <boxGeometry args={[2.4, 1.15, 1.8]} />
        <meshStandardMaterial color={wall} roughness={0.95} />
      </mesh>
      {/* steep two-slope roof */}
      <mesh position={[0, 2.72, -0.52]} rotation={[0.72, 0, 0]} castShadow>
        <boxGeometry args={[2.95, 0.09, 1.5]} />
        <meshStandardMaterial color={roof} roughness={0.9} />
      </mesh>
      <mesh position={[0, 2.72, 0.52]} rotation={[-0.72, 0, 0]} castShadow>
        <boxGeometry args={[2.95, 0.09, 1.5]} />
        <meshStandardMaterial color={roof} roughness={0.9} />
      </mesh>
      {/* ridge finial */}
      <mesh position={[1.5, 3.05, 0]} rotation={[0, 0, 0.3]}>
        <coneGeometry args={[0.05, 0.4, 4]} />
        <meshStandardMaterial color="#caa14a" />
      </mesh>
      {/* front ladder */}
      <mesh position={[0, 0.7, 1.15]} rotation={[0.5, 0, 0]}>
        <boxGeometry args={[0.7, 0.05, 1.3]} />
        <meshStandardMaterial color="#6b4a2a" roughness={1} />
      </mesh>
    </group>
  );
}

/** Many sugar palms as one InstancedMesh trunk + one InstancedMesh crown. */
function PalmField({ positions }: { positions: [number, number, number][] }) {
  const trunks = useRef<InstancedMesh>(null);
  const dummy = useMemo(() => new Object3D(), []);
  const heights = useMemo(() => positions.map((_, i) => 3.4 + ((i * 7) % 10) / 6), [positions]);

  useEffect(() => {
    const m = trunks.current;
    if (!m) return;
    positions.forEach((p, i) => {
      dummy.position.set(p[0], heights[i] / 2, p[2]);
      dummy.scale.set(1, heights[i], 1);
      dummy.rotation.set(0, (i * 1.3) % 6, 0);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
  }, [positions, heights, dummy]);

  return (
    <group>
      <instancedMesh ref={trunks} args={[undefined, undefined, positions.length]} castShadow>
        <cylinderGeometry args={[0.09, 0.13, 1, 6]} />
        <meshStandardMaterial color="#7c6242" roughness={1} />
      </instancedMesh>
      {/* fan crowns (a small group per palm — few enough to be cheap) */}
      {positions.map((p, i) => (
        <group key={i} position={[p[0], heights[i], p[2]]}>
          {Array.from({ length: 7 }, (_, k) => {
            const a = (k / 7) * Math.PI * 2;
            return (
              <mesh key={k} position={[Math.cos(a) * 0.45, 0, Math.sin(a) * 0.45]} rotation={[0.5, -a, 0]} castShadow>
                <boxGeometry args={[0.11, 0.03, 1.25]} />
                <meshStandardMaterial color="#3f7a34" roughness={0.9} />
              </mesh>
            );
          })}
        </group>
      ))}
    </group>
  );
}

function LeafyTree({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 1.1, 0]} castShadow>
        <cylinderGeometry args={[0.14, 0.2, 2.2, 6]} />
        <meshStandardMaterial color="#5b4630" roughness={1} />
      </mesh>
      {[0, 1, 2].map((i) => (
        <mesh key={i} position={[0, 2.1 + i * 0.5, 0]} castShadow>
          <sphereGeometry args={[1.1 - i * 0.22, 10, 10]} />
          <meshStandardMaterial color={i % 2 ? "#3f6a34" : "#4c7a3a"} roughness={1} />
        </mesh>
      ))}
    </group>
  );
}

/** The village wat — a whitewashed stupa + a tiered-roof vihara, gold accents. */
function Wat({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* platform */}
      <mesh position={[0, 0.15, 0]} receiveShadow>
        <boxGeometry args={[7, 0.3, 5]} />
        <meshStandardMaterial color="#cbb78a" roughness={1} />
      </mesh>
      {/* vihara hall */}
      <group position={[-1.6, 0, 0]}>
        <mesh position={[0, 1.1, 0]} castShadow>
          <boxGeometry args={[3, 1.8, 3.2]} />
          <meshStandardMaterial color="#e8e0cf" roughness={0.9} />
        </mesh>
        {[0, 1, 2].map((i) => (
          <mesh key={i} position={[0, 2.1 + i * 0.42, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
            <coneGeometry args={[2.9 - i * 0.7, 0.5, 4]} />
            <meshStandardMaterial color="#b23a2c" roughness={0.85} />
          </mesh>
        ))}
        <mesh position={[0, 3.5, 0]}>
          <coneGeometry args={[0.12, 0.8, 4]} />
          <meshStandardMaterial color="#d9b44a" metalness={0.3} roughness={0.4} />
        </mesh>
      </group>
      {/* stupa (chedei) */}
      <group position={[2.1, 0, 0]}>
        {[0, 1, 2].map((i) => (
          <mesh key={i} position={[0, 0.5 + i * 0.55, 0]} castShadow>
            <cylinderGeometry args={[0.9 - i * 0.22, 1.05 - i * 0.22, 0.55, 12]} />
            <meshStandardMaterial color="#f2ede0" roughness={0.9} />
          </mesh>
        ))}
        <mesh position={[0, 2.2, 0]} castShadow>
          <coneGeometry args={[0.55, 1.6, 12]} />
          <meshStandardMaterial color="#f2ede0" roughness={0.9} />
        </mesh>
        <mesh position={[0, 3.2, 0]}>
          <coneGeometry args={[0.12, 0.9, 8]} />
          <meshStandardMaterial color="#d9b44a" metalness={0.3} roughness={0.4} />
        </mesh>
      </group>
    </group>
  );
}

function Pond({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]} scale={[1.5, 1, 1]}>
        <circleGeometry args={[3, 32]} />
        <meshStandardMaterial color="#4f7fa0" transparent opacity={0.85} roughness={0.25} metalness={0.15} />
      </mesh>
      {Array.from({ length: 9 }, (_, i) => {
        const a = (i / 9) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.cos(a) * 4.3, 0.4, Math.sin(a) * 2.9]} rotation={[0, 0, Math.sin(i) * 0.2]}>
            <cylinderGeometry args={[0.02, 0.03, 0.9, 5]} />
            <meshStandardMaterial color="#5a7a45" roughness={1} />
          </mesh>
        );
      })}
    </group>
  );
}

/** A small rice paddy at the village edge (instanced stalks in a diked plot). */
function Paddy({ position }: { position: [number, number, number] }) {
  const ref = useRef<InstancedMesh>(null);
  const dummy = useMemo(() => new Object3D(), []);
  const cells = useMemo(() => {
    const out: [number, number][] = [];
    for (let r = 0; r < 12; r++) for (let c = 0; c < 12; c++) out.push([(c / 11 - 0.5) * 5, (r / 11 - 0.5) * 5]);
    return out;
  }, []);
  useEffect(() => {
    const m = ref.current;
    if (!m) return;
    cells.forEach(([x, z], i) => {
      const h = 0.7 + ((i * 13) % 10) / 30;
      dummy.position.set(x, h / 2 + 0.05, z);
      dummy.scale.set(1, h, 1);
      dummy.rotation.set(0, (i % 5) * 0.5, 0);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
  }, [cells, dummy]);
  return (
    <group position={position}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <planeGeometry args={[5.4, 5.4]} />
        <meshStandardMaterial color="#6b7f52" roughness={0.9} />
      </mesh>
      <instancedMesh ref={ref} args={[undefined, undefined, cells.length]}>
        <coneGeometry args={[0.05, 1, 5]} />
        <meshStandardMaterial color="#5aa03a" roughness={0.9} />
      </instancedMesh>
    </group>
  );
}

function Buffalo({ position }: { position: [number, number, number] }) {
  const ref = useRef<Group>(null);
  useFrame((s) => {
    if (ref.current) ref.current.position.y = position[1] + Math.sin(s.clock.elapsedTime * 1.4) * 0.015;
  });
  return (
    <group ref={ref} position={position} rotation={[0, -0.5, 0]}>
      <mesh position={[0, 0.62, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <capsuleGeometry args={[0.32, 0.85, 6, 10]} />
        <meshStandardMaterial color="#4a4a52" roughness={0.85} />
      </mesh>
      {[[-0.38, 0.28], [-0.38, -0.28], [0.38, 0.28], [0.38, -0.28]].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.22, z]} castShadow>
          <cylinderGeometry args={[0.07, 0.07, 0.44, 6]} />
          <meshStandardMaterial color="#3c3c44" />
        </mesh>
      ))}
      <mesh position={[0.66, 0.72, 0]} castShadow>
        <boxGeometry args={[0.32, 0.26, 0.28]} />
        <meshStandardMaterial color="#43434c" />
      </mesh>
    </group>
  );
}

function Nav() {
  const inXR = useXR((s) => s.session != null);
  if (inXR) return null;
  return (
    <OrbitControls
      enablePan={false}
      minDistance={4}
      maxDistance={30}
      maxPolarAngle={Math.PI / 2.15}
      enableDamping
      dampingFactor={0.08}
      target={[0, 1, 0]}
    />
  );
}
