import { Instances, Instance } from "@react-three/drei";
import { useMemo } from "react";
import { BoxGeometry } from "three";

export interface BananaDef {
  x: number;
  z: number;
  y?: number;
}

export interface BananaProps {
  trees: BananaDef[];
  height_m: number;
  dbh_cm: number;
}

// Banana leaves sprout from the top, spread outwards, and droop downwards.
// We define the base rotation around Y (spread) and Z (droop).
const LEAVES = [
  { yRot: 0, droop: 0.4 },
  { yRot: Math.PI / 2, droop: 0.5 },
  { yRot: Math.PI, droop: 0.3 },
  { yRot: -Math.PI / 2, droop: 0.6 },
  { yRot: Math.PI / 4, droop: 0.45 },
  { yRot: -Math.PI / 4 + Math.PI, droop: 0.35 },
  { yRot: Math.PI / 3, droop: -0.1 }, // newer leaf pointing slightly up
  { yRot: -Math.PI / 3, droop: 0.2 },
];

function darken(hex: string, f: number): string {
  const n = parseInt(hex.replace("#", ""), 16);
  const r = Math.min(255, Math.round(((n >> 16) & 255) * f));
  const g = Math.min(255, Math.round(((n >> 8) & 255) * f));
  const b = Math.min(255, Math.round((n & 255) * f));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

// A leaf geometry offset so its origin (pivot point) is at one end
const leafGeo = new BoxGeometry(1, 0.05, 1);
leafGeo.translate(0.5, 0, 0);

export function BananaForest({ trees, height_m, dbh_cm }: BananaProps) {
  const isMeters = dbh_cm < 2;
  const dbhMeters = isMeters ? dbh_cm : dbh_cm / 100;
  
  // Banana pseudostems are fairly thick relative to their height
  const baseRadius = (dbhMeters / 2) * 1.5; 
  
  // Banana leaves are massive
  const baseLeafLength = height_m * 0.65;
  const baseLeafWidth = baseLeafLength * 0.25;
  const leafColor = "#77a637"; // Vibrant yellow-green
  
  const instances = useMemo(() => {
    return trees.map((t, i) => {
      // +/- 25% scale variance
      const vary = 0.75 + ((i * 137) % 50) / 100;
      return {
        t,
        vary,
        h: height_m * vary,
        r: baseRadius * vary,
        lL: baseLeafLength * vary,
        lW: baseLeafWidth * vary,
        rot: (i * 1.7) % 6.28
      };
    });
  }, [trees, height_m, baseRadius, baseLeafLength, baseLeafWidth]);

  return (
    <group>
      {/* Pseudostems (Trunks) */}
      <Instances limit={trees.length} castShadow receiveShadow>
        <cylinderGeometry args={[1, 1, 1, 6]} />
        <meshStandardMaterial color="#889e63" roughness={0.9} />
        {instances.map(({ t, h, r, rot }, i) => (
          <Instance
            key={i}
            position={[t.x, (t.y ?? 0) + h / 2, t.z]}
            scale={[r * 0.8, h, r]} // slightly oval trunk
            rotation={[0, rot, 0]}
          />
        ))}
      </Instances>

      {/* Long Broad Leaves */}
      <Instances limit={trees.length * LEAVES.length} castShadow>
        <primitive object={leafGeo} attach="geometry" />
        <meshStandardMaterial roughness={0.8} />
        {instances.flatMap(({ t, h, lL, lW, rot }, i) => {
          // Leaves sprout from near the very top of the pseudostem
          const cy = (t.y ?? 0) + h * 0.95;
          return LEAVES.map((l, j) => {
            // Add a little randomness to the droop and spread
            const droop = l.droop + ((i * j * 17) % 15) / 100;
            const spread = l.yRot + rot;
            return (
              <Instance
                key={`${i}-${j}`}
                color={darken(leafColor, j % 2 === 0 ? 1 : 0.88)}
                position={[t.x, cy, t.z]}
                // Negative Z rotation pushes the +X length down
                rotation={[0, spread, -droop]} 
                scale={[lL, 1, lW]}
              />
            );
          });
        })}
      </Instances>
    </group>
  );
}
