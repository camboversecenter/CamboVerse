import { useState } from "react";
import { Html } from "@react-three/drei";
import type { Poi } from "../spots";

/** A tappable point-of-interest marker inside a site. */
export function PoiMarker({
  poi,
  active,
  onSelect,
  compact = false,
  index,
}: {
  poi: Poi;
  active: boolean;
  onSelect: (id: string) => void;
  compact?: boolean;
  index?: number;
}) {
  const [hover, setHover] = useState(false);
  const color = active ? "#ffd98a" : "#4c8a3f";
  return (
    <group position={poi.target}>
      <mesh
        onClick={(e) => {
          e.stopPropagation();
          onSelect(poi.id);
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHover(true);
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          setHover(false);
          document.body.style.cursor = "auto";
        }}
        scale={hover || active ? 1.3 : 1}
      >
        <sphereGeometry args={[0.09, 16, 16]} />
        <meshBasicMaterial color={color} />
      </mesh>

      <Html position={[0, 0.22, 0]} center distanceFactor={compact ? undefined : 9} occlude={false}>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onSelect(poi.id);
          }}
          aria-label={poi.title}
          title={poi.title}
          style={{
            transform: "translateY(-50%)",
            padding: compact ? '10px' : '3px 9px',
            minWidth: compact ? 44 : undefined,
            minHeight: compact ? 44 : undefined,
            borderRadius: 8,
            background: active ? "rgba(76,138,63,0.92)" : "rgba(20,16,10,0.82)",
            color: "#f4ece0",
            font: "600 11px system-ui, sans-serif",
            whiteSpace: "nowrap",
            border: `1px solid ${active ? "#ffd98a" : "rgba(76,138,63,0.7)"}`,
            cursor: "pointer",
          }}
        >
          {compact ? index : poi.title}
        </button>
      </Html>
    </group>
  );
}
