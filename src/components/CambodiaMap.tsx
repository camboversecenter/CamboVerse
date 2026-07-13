import { useMemo } from "react";
import { Shape } from "three";
import { Line } from "@react-three/drei";
import { CAMBODIA_OUTLINE, projectLatLng } from "../cambodia-outline";

/**
 * A cartographic map of Cambodia in the XZ plane (-z is north), built from a
 * real border GeoJSON (simplified in `cambodia-outline.ts`): filled landmass,
 * a coastline/border stroke, the Tonlé Sap lake, and the Mekong + Tonlé Sap
 * rivers — all placed by true lat/lng via `projectLatLng`.
 */

// River courses as real [lat, lng] waypoints.
const MEKONG: [number, number][] = [
  [14.15, 105.95], [13.53, 105.97], [12.48, 106.02],
  [12.0, 105.46], [11.57, 104.93], [11.03, 105.1],
];
const TONLE_SAP_RIVER: [number, number][] = [
  [12.55, 104.45], [11.98, 104.68], [11.57, 104.93],
];

const toWorld = (pts: [number, number][], y: number) =>
  pts.map(([lat, lng]) => {
    const [x, z] = projectLatLng(lat, lng);
    return [x, y, z] as [number, number, number];
  });

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

  const coast = useMemo(
    () => [...CAMBODIA_OUTLINE, CAMBODIA_OUTLINE[0]].map(([x, z]) => [x, 0.04, z] as [number, number, number]),
    [],
  );

  const [lx, lz] = projectLatLng(12.85, 104.08); // Tonlé Sap, approx center

  return (
    <group>
      {/* Landmass */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <shapeGeometry args={[shape]} />
        <meshStandardMaterial color="#7c8a55" roughness={1} />
      </mesh>

      {/* Coastline / border */}
      <Line points={coast} color="#e9e2c8" lineWidth={2} transparent opacity={0.85} />

      {/* Tonlé Sap lake */}
      <mesh position={[lx, 0.02, lz]} rotation={[-Math.PI / 2, 0, -0.7]} scale={[1.45, 0.78, 1]}>
        <circleGeometry args={[1, 48]} />
        <meshStandardMaterial color="#2f5d84" roughness={0.8} />
      </mesh>

      {/* Rivers */}
      <Line points={toWorld(MEKONG, 0.05)} color="#3b7bb0" lineWidth={2.5} />
      <Line points={toWorld(TONLE_SAP_RIVER, 0.05)} color="#3b7bb0" lineWidth={2} />
    </group>
  );
}
