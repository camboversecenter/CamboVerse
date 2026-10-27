import { useState } from "react";
import { Html } from "@react-three/drei";
import { projectLatLng } from "../cambodia-outline";
import { LandmarkArt } from "./LandmarkArt";

/** One named province group on the national map; individual sites are in Places. */
export function Pin({ province, siteId, lat, lng, offset = [0, 0], labelOffset = [0, 0], count, selected, onSelect }: {
  province: string;
  siteId: string;
  lat: number;
  lng: number;
  offset?: [number, number];
  labelOffset?: [number, number];
  count: number;
  selected: boolean;
  onSelect: (province: string) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const [px, pz] = projectLatLng(lat, lng);
  const x = px + offset[0];
  const z = pz + offset[1];
  const color = "#4c8a3f";

  const over = () => {
    setHovered(true);
    document.body.style.cursor = "pointer";
  };
  const out = () => {
    setHovered(false);
    document.body.style.cursor = "auto";
  };

  return (
    <group
      position={[x, 0, z]}
      scale={hovered || selected ? 1.18 : 1}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(province);
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        over();
      }}
      onPointerOut={out}
    >
      {/* The province key remains the reliable touch/keyboard route. */}
      <mesh position={[0, 0.6, 0]}>
        <cylinderGeometry args={[0.48, 0.48, 1.4, 8]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>

      {/* base ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <ringGeometry args={[0.14, 0.22, 24]} />
        <meshBasicMaterial color={color} />
      </mesh>
      {/* stem */}
      <mesh position={[0, 0.42, 0]}>
        <cylinderGeometry args={[0.045, 0.045, 0.84, 8]} />
        <meshStandardMaterial color={color} roughness={0.6} />
      </mesh>
      {/* head */}
      <mesh position={[0, 0.92, 0]}>
        <sphereGeometry args={[0.2, 16, 16]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={selected ? 0.65 : hovered ? 0.4 : 0.15}
          roughness={0.4}
        />
      </mesh>
      <Html position={[0, 1.04, 0]} center distanceFactor={12}>
        <button type="button" className={`map-pin-name${selected ? " selected" : ""}`}
          style={{ transform: `translate(${labelOffset[0]}px, ${labelOffset[1]}px)` }}
          aria-label={`${province}: ${count} ${count === 1 ? "place" : "places"}`}
          onClick={(event) => { event.stopPropagation(); onSelect(province); }}>
          <LandmarkArt siteId={siteId} compact /><strong>{province}</strong><small>{count}</small>
        </button>
      </Html>
    </group>
  );
}
