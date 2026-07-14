import { useMemo } from "react";
import { Instances, Instance, MeshReflectorMaterial } from "@react-three/drei";
import { Shape, Path } from "three";
import { Palm } from "./Palm";

/**
 * The Angkor Wat landscape, modelled on the Apsara Authority aerial photos and
 * the temple's true cruciform plan (west-facing, front = +z):
 *
 *   moat (outer water ring) → western bridge → entrance gopura (the "gate")
 *   → long processional causeway → two rectangular reflecting ponds flanking
 *   it → libraries → the central temple (rendered separately at the origin).
 *
 * Everything here sits WEST (+z) of the temple model, which occupies roughly
 * |x| < 3.6, z ∈ [-3.6, 4]. Fully procedural — no textures; the forest is two
 * instanced draws and only the ponds use a reflection pass, to stay mobile-cheap.
 */

// World-space plan. x spreads north–south; +z is west (the entrance side).
const ISLE = { x0: -14, x1: 14, z0: -11, z1: 15 }; // land inside the moat
const MOAT = { x0: -18, x1: 18, z0: -14.5, z1: 19.5 }; // outer water edge
const GOPURA_Z = 13.4; // western entrance gopura
const POND_Z = 7.6; // centre of the two reflecting ponds

const GREENS = ["#3f6f2f", "#49772f", "#356329", "#547f37", "#2f5b26"];
const SAND = "#b9a878";
const DARK_SAND = "#8f7f57";
const LATERITE = "#6d5a41";

// A shape drawn in XY becomes world XZ after a -90° X rotation: (x, y) -> (x, -y).
const w2s = (x: number, z: number): [number, number] => [x, -z];

export function AngkorLandscape() {
  // Moat = outer rectangle with the island punched out as a hole.
  const moatShape = useMemo(() => {
    const s = new Shape();
    s.moveTo(...w2s(MOAT.x0, MOAT.z0));
    s.lineTo(...w2s(MOAT.x1, MOAT.z0));
    s.lineTo(...w2s(MOAT.x1, MOAT.z1));
    s.lineTo(...w2s(MOAT.x0, MOAT.z1));
    s.closePath();
    const hole = new Path();
    hole.moveTo(...w2s(ISLE.x0, ISLE.z0));
    hole.lineTo(...w2s(ISLE.x1, ISLE.z0));
    hole.lineTo(...w2s(ISLE.x1, ISLE.z1));
    hole.lineTo(...w2s(ISLE.x0, ISLE.z1));
    hole.closePath();
    s.holes.push(hole);
    return s;
  }, []);

  // Deterministic forest, dense on the sides and behind the temple but kept out
  // of the open western courtyard (causeway, ponds, gopura) as in the photos.
  const trees = useMemo(() => {
    const out: { x: number; z: number; s: number; c: string }[] = [];
    let i = 0;
    const rand = () => {
      i++;
      const v = Math.sin(i * 127.1) * 43758.5453;
      return v - Math.floor(v);
    };
    let guard = 0;
    while (out.length < 150 && guard++ < 3000) {
      const x = -13.5 + rand() * 27;
      const z = -10.5 + rand() * 25;
      if (Math.abs(x) < 4.5 && z > -5 && z < 4.6) continue; // temple compound
      if (Math.abs(x) < 11.5 && z > 3.3 && z < 14.8) continue; // open courtyard + gopura
      out.push({ x, z, s: 0.7 + rand() * 0.85, c: GREENS[out.length % GREENS.length] });
    }
    return out;
  }, []);

  return (
    <group>
      {/* Island lawn (brighter than the outer forest floor) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 2]} receiveShadow>
        <planeGeometry args={[ISLE.x1 - ISLE.x0 + 0.6, ISLE.z1 - ISLE.z0 + 0.6]} />
        <meshStandardMaterial color="#79953f" roughness={1} />
      </mesh>

      {/* Moat canal ring (flat water — large area, so no reflection pass) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.045, 0]}>
        <shapeGeometry args={[moatShape]} />
        <meshStandardMaterial color="#3d5a66" roughness={0.35} metalness={0.4} />
      </mesh>

      {/* Laterite enclosure wall along the N, S and E island edges */}
      {[
        { p: [0, 0.2, ISLE.z0 + 0.15], s: [ISLE.x1 - ISLE.x0, 0.4, 0.18] },
        { p: [ISLE.x1 - 0.15, 0.2, 2], s: [0.18, 0.4, ISLE.z1 - ISLE.z0] },
        { p: [ISLE.x0 + 0.15, 0.2, 2], s: [0.18, 0.4, ISLE.z1 - ISLE.z0] },
      ].map((wl, i) => (
        <mesh key={i} position={wl.p as [number, number, number]} castShadow receiveShadow>
          <boxGeometry args={wl.s as [number, number, number]} />
          <meshStandardMaterial color={LATERITE} roughness={1} />
        </mesh>
      ))}

      {/* Western entrance gopura — the long galleried gate with a towered
          central portal and flanking towers, split to leave the gate opening. */}
      <group position={[0, 0, GOPURA_Z]}>
        {[6, -6].map((cx) => (
          <group key={cx}>
            <mesh position={[cx, 0.6, 0]} castShadow receiveShadow>
              <boxGeometry args={[10, 1.2, 1.1]} />
              <meshStandardMaterial color={SAND} roughness={0.95} />
            </mesh>
            <mesh position={[cx, 1.28, 0]} castShadow>
              <boxGeometry args={[10.3, 0.16, 1.3]} />
              <meshStandardMaterial color={DARK_SAND} roughness={1} />
            </mesh>
          </group>
        ))}
        {/* Central gate tower over the portal */}
        <mesh position={[0, 1.5, 0]} castShadow>
          <boxGeometry args={[2.6, 3.0, 1.7]} />
          <meshStandardMaterial color={SAND} roughness={0.95} />
        </mesh>
        <mesh position={[0, 3.4, 0]} castShadow>
          <coneGeometry args={[1.1, 1.6, 4]} />
          <meshStandardMaterial color={DARK_SAND} roughness={1} />
        </mesh>
        {/* Flanking towers and end pavilions */}
        {[5.4, -5.4].map((x) => (
          <mesh key={x} position={[x, 1.15, 0]} castShadow>
            <boxGeometry args={[1.8, 2.3, 1.4]} />
            <meshStandardMaterial color={SAND} roughness={0.95} />
          </mesh>
        ))}
        {[10.6, -10.6].map((x) => (
          <mesh key={x} position={[x, 0.95, 0]} castShadow>
            <boxGeometry args={[2.0, 1.9, 1.5]} />
            <meshStandardMaterial color={SAND} roughness={0.95} />
          </mesh>
        ))}
      </group>

      {/* Long raised processional causeway: temple front (z≈4) → gopura (z≈13) */}
      <mesh position={[0, 0.2, 8.6]} castShadow receiveShadow>
        <boxGeometry args={[1.6, 0.36, 9.2]} />
        <meshStandardMaterial color="#a2916a" roughness={0.95} />
      </mesh>
      {[0.86, -0.86].map((x) => (
        <mesh key={x} position={[x, 0.42, 8.6]} castShadow>
          <boxGeometry args={[0.14, 0.2, 9.2]} />
          <meshStandardMaterial color={DARK_SAND} roughness={1} />
        </mesh>
      ))}

      {/* Western bridge across the moat to the gopura */}
      <mesh position={[0, 0.25, 17.2]} castShadow receiveShadow>
        <boxGeometry args={[2.0, 0.5, 5.0]} />
        <meshStandardMaterial color="#9c8a63" roughness={0.95} />
      </mesh>

      {/* Two rectangular reflecting ponds flanking the causeway (the iconic
          mirror pools). Each: a laterite bank + a reflective water plane. */}
      {[5.3, -5.3].map((x) => (
        <group key={x}>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.04, POND_Z]} receiveShadow>
            <planeGeometry args={[7.6, 6.6]} />
            <meshStandardMaterial color="#5c4a34" roughness={1} />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.07, POND_Z]}>
            <planeGeometry args={[7.0, 6.0]} />
            <MeshReflectorMaterial
              resolution={128}
              mirror={0.85}
              blur={[60, 24]}
              mixBlur={2}
              mixStrength={2}
              roughness={0.4}
              depthScale={0}
              color="#516d78"
              metalness={0.4}
            />
          </mesh>
        </group>
      ))}

      {/* Two libraries flanking the causeway between the ponds and the gopura */}
      {[3.4, -3.4].map((x) => (
        <group key={x} position={[x, 0, 11]}>
          <mesh position={[0, 0.5, 0]} castShadow receiveShadow>
            <boxGeometry args={[1.5, 1.0, 2.4]} />
            <meshStandardMaterial color={SAND} roughness={0.95} />
          </mesh>
          <mesh position={[0, 1.15, 0]} castShadow>
            <boxGeometry args={[1.7, 0.35, 2.6]} />
            <meshStandardMaterial color={DARK_SAND} roughness={1} />
          </mesh>
        </group>
      ))}

      {/* Sugar palms lining the causeway, as in the photos */}
      {[5.5, 8.0, 10.5].map((z, i) => (
        <group key={z}>
          <Palm position={[2.1, 0, z]} scale={0.95} spin={i * 1.7} />
          <Palm position={[-2.1, 0, z]} scale={0.95} spin={i * 2.3 + 1} />
        </group>
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
