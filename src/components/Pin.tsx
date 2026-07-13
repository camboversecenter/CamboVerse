import { useState } from "react";
import { Html } from "@react-three/drei";
import type { Spot } from "../spots";
import { projectLatLng } from "../cambodia-outline";

/** A clickable map marker for a heritage site. Tapping it teleports in. */
export function Pin({ spot, onEnter }: { spot: Spot; onEnter: (id: string) => void }) {
  const [hovered, setHovered] = useState(false);
  const [px, pz] = projectLatLng(spot.lat, spot.lng);
  const [nx, nz] = spot.nudge ?? [0, 0];
  const x = px + nx;
  const z = pz + nz;
  const color = spot.live ? "#4c8a3f" : "#8b9099";

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
      scale={hovered ? 1.18 : 1}
      onClick={(e) => {
        e.stopPropagation();
        onEnter(spot.id);
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        over();
      }}
      onPointerOut={out}
    >
      {/* larger invisible hit target for easy tapping on phones */}
      <mesh position={[0, 0.6, 0]}>
        <cylinderGeometry args={[0.4, 0.4, 1.4, 8]} />
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
        <sphereGeometry args={[0.17, 20, 20]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={spot.live && hovered ? 0.5 : 0.15}
          roughness={0.4}
        />
      </mesh>

      <Html position={[0, 1.35, 0]} center distanceFactor={11} occlude={false}>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onEnter(spot.id);
          }}
          onPointerOver={over}
          onPointerOut={out}
          style={{
            transform: "translateY(-50%)",
            padding: "3px 9px",
            borderRadius: 8,
            background: "rgba(20,16,10,0.82)",
            color: "#f4ece0",
            font: "600 12px system-ui, sans-serif",
            whiteSpace: "nowrap",
            border: `1px solid ${spot.live ? "rgba(76,138,63,0.7)" : "rgba(139,144,153,0.5)"}`,
            cursor: "pointer",
          }}
        >
          {spot.name}
          {!spot.live && (
            <span style={{ opacity: 0.6, fontWeight: 500 }}> · soon</span>
          )}
        </button>
      </Html>
    </group>
  );
}
