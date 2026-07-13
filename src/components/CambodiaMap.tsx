import { useMemo } from "react";
import { Shape } from "three";
import { CAMBODIA_OUTLINE, projectLatLng } from "../cambodia-outline";

/**
 * Flat map of Cambodia lying in the XZ plane (-z is north), built from a real
 * (low-resolution, 17-point) border GeoJSON projected in `cambodia-outline.ts`.
 * The Tonlé Sap lake is placed at its true location as a recognizable landmark.
 */
export function CambodiaMap() {
  const shape = useMemo(() => {
    const s = new Shape();
    CAMBODIA_OUTLINE.forEach(([x, z], i) => {
      // mesh is rotated -PI/2 about X, mapping shape (x, y) -> world (x, 0, -y)
      i === 0 ? s.moveTo(x, -z) : s.lineTo(x, -z);
    });
    s.closePath();
    return s;
  }, []);

  const [lx, lz] = projectLatLng(12.9, 104.05); // Tonlé Sap, approx center

  return (
    <group>
      {/* Landmass */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <shapeGeometry args={[shape]} />
        <meshStandardMaterial color="#74854e" roughness={1} />
      </mesh>

      {/* Tonlé Sap lake */}
      <mesh position={[lx, 0.02, lz]} rotation={[-Math.PI / 2, 0, -0.7]} scale={[1.35, 0.7, 1]}>
        <circleGeometry args={[1, 40]} />
        <meshStandardMaterial color="#2f5d84" roughness={0.8} />
      </mesh>
    </group>
  );
}
