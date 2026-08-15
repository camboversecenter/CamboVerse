import { Instances, Instance } from "@react-three/drei";
import { useMemo } from "react";

export interface MangoDef {
  x: number;
  z: number;
  y?: number;
}

export interface MangoProps {
  trees: MangoDef[];
  height_m: number;
  dbh_cm: number;
}

// Mango trees have dense, rounded, dome-like canopies
const BLOBS = [
  { o: [0, 0.1, 0], s: [1.4, 1.0, 1.4], d: 1.0 },     // Large central dome
  { o: [-0.3, -0.1, 0.3], s: [1.0, 0.8, 1.0], d: 0.85 }, // lower side
  { o: [0.3, -0.05, -0.3], s: [1.1, 0.8, 1.1], d: 0.92 }, // lower side
  { o: [0.15, 0.2, 0.15], s: [1.0, 0.7, 1.0], d: 1.1 },  // upper bulge
  { o: [-0.2, 0.1, -0.2], s: [0.9, 0.7, 0.9], d: 0.95 },
];

function darken(hex: string, f: number): string {
  const n = parseInt(hex.replace("#", ""), 16);
  const r = Math.min(255, Math.round(((n >> 16) & 255) * f));
  const g = Math.min(255, Math.round(((n >> 8) & 255) * f));
  const b = Math.min(255, Math.round((n & 255) * f));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

export function MangoForest({ trees, height_m, dbh_cm }: MangoProps) {
  const isMeters = dbh_cm < 2;
  const dbhMeters = isMeters ? dbh_cm : dbh_cm / 100;
  const baseRadius = dbhMeters / 2;
  
  // Mango trees tend to have wider canopies relative to their height
  const baseCanopyScale = height_m * 0.5;
  const canopyColor = "#2d4a22"; // Mango trees have dense dark green leaves
  
  const instances = useMemo(() => {
    return trees.map((t, i) => {
      // +/- 20% scale variance
      const vary = 0.8 + ((i * 137) % 40) / 100;
      return {
        t,
        vary,
        h: height_m * vary,
        r: baseRadius * vary,
        cScale: baseCanopyScale * vary,
        rot: (i * 1.7) % 6.28
      };
    });
  }, [trees, height_m, baseRadius, baseCanopyScale]);

  return (
    <group>
      {/* Mango trunks are sturdy and shorter before branching */}
      <Instances limit={trees.length} castShadow receiveShadow>
        <cylinderGeometry args={[1, 1, 1, 6]} />
        <meshStandardMaterial color="#544c44" roughness={1} />
        {instances.map(({ t, h, r, rot }, i) => (
          <Instance
            key={i}
            position={[t.x, (t.y ?? 0) + h / 2, t.z]}
            scale={[r, h, r]}
            rotation={[0, rot, 0]}
          />
        ))}
      </Instances>

      {/* Dense rounded canopy */}
      <Instances limit={trees.length * BLOBS.length} castShadow>
        <sphereGeometry args={[1, 7, 6]} />
        <meshStandardMaterial roughness={1} flatShading />
        {instances.flatMap(({ t, h, cScale }, i) => {
          // Mango canopy starts lower than teak
          const cy = (t.y ?? 0) + h * 0.6;
          return BLOBS.map((b, j) => (
            <Instance
              key={`${i}-${j}`}
              color={darken(canopyColor, b.d)}
              position={[t.x + b.o[0] * cScale, cy + b.o[1] * cScale, t.z + b.o[2] * cScale]}
              scale={[b.s[0] * cScale, b.s[1] * cScale, b.s[2] * cScale]}
            />
          ));
        })}
      </Instances>
    </group>
  );
}
