import { useMemo } from "react";
import { Shape } from "three";

/**
 * A stylized, flat map of Cambodia lying in the XZ plane (-z is north).
 *
 * The outline is an approximate silhouette, NOT a survey-accurate border — a
 * placeholder to be replaced with a real simplified GeoJSON boundary. The
 * Tonlé Sap lake is included as a recognizable landmark.
 */
export function CambodiaMap() {
  // Outline in world (x, z); shape uses (x, -z) so a +PI/2... see below.
  const shape = useMemo(() => {
    const outline: [number, number][] = [
      [-5.5, -1.5], [-4, -3], [-1.5, -4.2], [1, -4.4], [3.5, -3.5],
      [5, -2], [5.8, 0], [5, 2], [3, 3.5], [0.5, 4.4],
      [-2, 4], [-4, 2.8], [-5.6, 0.8],
    ];
    const s = new Shape();
    outline.forEach(([x, z], i) => {
      // mesh is rotated -PI/2 about X, mapping shape (x, y) -> world (x, 0, -y)
      const sx = x;
      const sy = -z;
      i === 0 ? s.moveTo(sx, sy) : s.lineTo(sx, sy);
    });
    s.closePath();
    return s;
  }, []);

  return (
    <group>
      {/* Landmass */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <shapeGeometry args={[shape]} />
        <meshStandardMaterial color="#74854e" roughness={1} />
      </mesh>

      {/* Tonlé Sap lake */}
      <mesh position={[-2, 0.02, -1]} rotation={[-Math.PI / 2, 0, -0.6]} scale={[1.8, 0.95, 1]}>
        <circleGeometry args={[1, 40]} />
        <meshStandardMaterial color="#2f5d84" roughness={0.8} />
      </mesh>
    </group>
  );
}
