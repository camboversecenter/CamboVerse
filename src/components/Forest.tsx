import { Instances, Instance } from "@react-three/drei";

/**
 * A shared, mobile-cheap forest. Each tree is a tapered trunk under a *billowy*
 * broadleaf crown built from several overlapping blobs (not a single ball), so
 * it reads as a real tropical tree. Everything is just two instanced draws
 * (trunks + canopy blobs) no matter how many trees.
 */
export interface TreeDef {
  x: number;
  z: number;
  /** Ground height under the tree (e.g. a hill slope). Default 0. */
  y?: number;
  /** Overall scale. */
  s: number;
  /** Canopy colour (hex). */
  c: string;
}

// Overlapping crown blobs (unit tree): offset + non-uniform scale + shade.
const BLOBS: { o: [number, number, number]; s: [number, number, number]; d: number }[] = [
  { o: [0, 0.15, 0], s: [1.0, 0.95, 1.0], d: 1.0 },
  { o: [-0.45, -0.15, 0.15], s: [0.66, 0.62, 0.66], d: 0.82 },
  { o: [0.42, 0.0, -0.2], s: [0.72, 0.78, 0.72], d: 0.9 },
  { o: [0.1, 0.5, 0.05], s: [0.6, 0.6, 0.6], d: 1.12 },
  { o: [-0.15, -0.35, -0.3], s: [0.5, 0.46, 0.5], d: 0.72 },
];

function darken(hex: string, f: number): string {
  const n = parseInt(hex.replace("#", ""), 16);
  const r = Math.min(255, Math.round(((n >> 16) & 255) * f));
  const g = Math.min(255, Math.round(((n >> 8) & 255) * f));
  const b = Math.min(255, Math.round((n & 255) * f));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

export function Forest({ trees }: { trees: TreeDef[] }) {
  return (
    <group>
      {/* Trunks — tapered, slightly rotated for variety */}
      <Instances limit={trees.length} castShadow receiveShadow>
        <cylinderGeometry args={[0.06, 0.14, 1.0, 6]} />
        <meshStandardMaterial color="#6a563c" roughness={1} />
        {trees.map((t, i) => (
          <Instance
            key={i}
            position={[t.x, (t.y ?? 0) + 0.48 * t.s, t.z]}
            scale={[t.s, t.s * 1.15, t.s]}
            rotation={[0.04 * Math.sin(i * 2.3), (i * 1.7) % 6.28, 0.04 * Math.cos(i * 1.9)]}
          />
        ))}
      </Instances>

      {/* Billowy canopy — several blobs per tree, one instanced draw */}
      <Instances limit={trees.length * BLOBS.length} castShadow>
        <sphereGeometry args={[0.5, 7, 6]} />
        <meshStandardMaterial roughness={1} flatShading />
        {trees.flatMap((t, i) => {
          const cy = (t.y ?? 0) + 1.15 * t.s;
          return BLOBS.map((b, j) => (
            <Instance
              key={`${i}-${j}`}
              color={darken(t.c, b.d)}
              position={[t.x + b.o[0] * t.s, cy + b.o[1] * t.s, t.z + b.o[2] * t.s]}
              scale={[b.s[0] * t.s, b.s[1] * t.s, b.s[2] * t.s]}
            />
          ));
        })}
      </Instances>
    </group>
  );
}
