import { useMemo } from "react";
import { Instances, Instance, MeshReflectorMaterial } from "@react-three/drei";
import { Shape, Path } from "three";

/**
 * The Angkor Wat landscape, modelled on the aerial reference photos: the temple
 * stands on a green rectangular island wrapped in a wide moat (canal), the
 * island is thick with forest, a laterite enclosure wall runs the island edge,
 * twin ponds flank the approach, and the long causeway crosses the moat from
 * the west (+z). Fully procedural — no textures, mobile-cheap (forest is two
 * instanced draws).
 */

// Half-extents: island and moat ring.
const ISLAND_W = 10.3;
const ISLAND_H = 7.8;
const MOAT_W = 13.8;
const MOAT_H = 11;

const GREENS = ["#3f6f2f", "#49772f", "#356329", "#547f37"];

export function AngkorLandscape() {
  const moatShape = useMemo(() => {
    const s = new Shape();
    s.moveTo(-MOAT_W, -MOAT_H);
    s.lineTo(MOAT_W, -MOAT_H);
    s.lineTo(MOAT_W, MOAT_H);
    s.lineTo(-MOAT_W, MOAT_H);
    s.closePath();
    const hole = new Path();
    hole.moveTo(-ISLAND_W, -ISLAND_H);
    hole.lineTo(ISLAND_W, -ISLAND_H);
    hole.lineTo(ISLAND_W, ISLAND_H);
    hole.lineTo(-ISLAND_W, ISLAND_H);
    hole.closePath();
    s.holes.push(hole);
    return s;
  }, []);

  // Deterministic forest on the island, kept clear of the temple compound and
  // the causeway axis (so the approach view stays open, like the photos).
  const trees = useMemo(() => {
    const out: { x: number; z: number; s: number; c: string }[] = [];
    let i = 0;
    const rand = () => {
      i++;
      const v = Math.sin(i * 127.1) * 43758.5453;
      return v - Math.floor(v);
    };
    let guard = 0;
    while (out.length < 120 && guard++ < 2000) {
      const x = (rand() * 2 - 1) * (ISLAND_W - 0.8);
      const z = (rand() * 2 - 1) * (ISLAND_H - 0.7);
      if (Math.abs(x) < 3.6 && z > -3.6 && z < 3.4) continue; // temple compound
      if (Math.abs(x) < 1.9 && z >= 3.0) continue; // causeway axis
      out.push({ x, z, s: 0.75 + rand() * 0.75, c: GREENS[out.length % GREENS.length] });
    }
    return out;
  }, []);

  return (
    <group>
      {/* Island lawn (slightly brighter than the outer land) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]} receiveShadow>
        <planeGeometry args={[ISLAND_W * 2 + 0.6, ISLAND_H * 2 + 0.6]} />
        <meshStandardMaterial color="#79953f" roughness={1} />
      </mesh>

      {/* Moat canal ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.045, 0]}>
        <shapeGeometry args={[moatShape]} />
        <MeshReflectorMaterial
          resolution={256}
          mirror={0.55}
          blur={[140, 45]}
          mixBlur={4}
          mixStrength={2.2}
          roughness={0.6}
          depthScale={0}
          color="#48707c"
          metalness={0.35}
        />
      </mesh>

      {/* Laterite enclosure wall along the island edge (gap at the west causeway) */}
      {[
        { p: [5.65, 0.15, ISLAND_H - 0.15], s: [9.1, 0.26, 0.14] },
        { p: [-5.65, 0.15, ISLAND_H - 0.15], s: [9.1, 0.26, 0.14] },
        { p: [0, 0.15, -(ISLAND_H - 0.15)], s: [20.3, 0.26, 0.14] },
        { p: [ISLAND_W - 0.15, 0.15, 0], s: [0.14, 0.26, 15.3] },
        { p: [-(ISLAND_W - 0.15), 0.15, 0], s: [0.14, 0.26, 15.3] },
      ].map((w, i) => (
        <mesh key={i} position={w.p as [number, number, number]} castShadow receiveShadow>
          <boxGeometry args={w.s as [number, number, number]} />
          <meshStandardMaterial color="#6d5a41" roughness={1} />
        </mesh>
      ))}

      {/* Long causeway crossing the lawn and the moat from the west */}
      <mesh position={[0, 0.12, 8.2]} castShadow receiveShadow>
        <boxGeometry args={[1.05, 0.2, 8.6]} />
        <meshStandardMaterial color="#9c8a63" roughness={0.95} />
      </mesh>
      <mesh position={[0.58, 0.26, 8.2]} castShadow>
        <boxGeometry args={[0.1, 0.14, 8.6]} />
        <meshStandardMaterial color="#7d6c4c" roughness={1} />
      </mesh>
      <mesh position={[-0.58, 0.26, 8.2]} castShadow>
        <boxGeometry args={[0.1, 0.14, 8.6]} />
        <meshStandardMaterial color="#7d6c4c" roughness={1} />
      </mesh>

      {/* Twin ponds flanking the approach (as in the aerial photos) */}
      {[2.7, -2.7].map((x) => (
        <mesh key={x} rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.055, 5.2]}>
          <circleGeometry args={[0.85, 28]} />
          <meshStandardMaterial color="#4c7d90" roughness={0.4} metalness={0.3} />
        </mesh>
      ))}

      {/* Island forest — two instanced draws (trunks + canopies) */}
      <Instances limit={trees.length} castShadow>
        <cylinderGeometry args={[0.05, 0.09, 0.55, 6]} />
        <meshStandardMaterial color="#6b573d" roughness={1} />
        {trees.map((t, i) => (
          <Instance key={i} position={[t.x, 0.3 * t.s, t.z]} scale={[t.s, t.s, t.s]} />
        ))}
      </Instances>
      <Instances limit={trees.length} castShadow>
        <sphereGeometry args={[0.5, 8, 7]} />
        <meshStandardMaterial roughness={1} />
        {trees.map((t, i) => (
          <Instance
            key={i}
            color={t.c}
            position={[t.x, 0.55 * t.s + 0.35, t.z]}
            scale={[t.s, t.s * 0.8, t.s]}
          />
        ))}
      </Instances>
    </group>
  );
}
