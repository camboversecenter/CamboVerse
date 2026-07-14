import { Html } from "@react-three/drei";
import type { Kiosk as KioskData } from "../shops";

/**
 * A market stall for one brand: a coloured counter under a slanted awning with a
 * back panel and a floating sign. Tapping the stall (or its sign) opens the
 * brand's menu. Procedural — no textures, cheap on mobile.
 */
export function Kiosk({
  kiosk,
  active,
  onSelect,
}: {
  kiosk: KioskData;
  active: boolean;
  onSelect: (id: string) => void;
}) {
  const open = () => onSelect(kiosk.id);
  return (
    <group position={[kiosk.pos[0], 0, kiosk.pos[1]]} rotation={[0, kiosk.rot, 0]}>
      {/* Counter body (tappable) */}
      <mesh
        position={[0, 0.5, 0]}
        castShadow
        receiveShadow
        onClick={(e) => {
          e.stopPropagation();
          open();
        }}
      >
        <boxGeometry args={[2.8, 1.0, 1.0]} />
        <meshStandardMaterial color={kiosk.color} roughness={0.8} />
      </mesh>
      {/* Counter top */}
      <mesh position={[0, 1.03, 0.05]} castShadow>
        <boxGeometry args={[3.0, 0.1, 1.2]} />
        <meshStandardMaterial color="#efe6d3" roughness={0.7} />
      </mesh>
      {/* Back panel */}
      <mesh position={[0, 1.5, -0.62]} castShadow receiveShadow>
        <boxGeometry args={[3.0, 2.4, 0.14]} />
        <meshStandardMaterial color={kiosk.accent} roughness={0.85} />
      </mesh>
      {/* Posts */}
      {[-1.35, 1.35].map((x) => (
        <mesh key={x} position={[x, 1.5, 0.5]} castShadow>
          <boxGeometry args={[0.12, 3.0, 0.12]} />
          <meshStandardMaterial color="#5b4a36" roughness={1} />
        </mesh>
      ))}
      {/* Slanted awning */}
      <mesh position={[0, 2.75, 0.0]} rotation={[-0.32, 0, 0]} castShadow>
        <boxGeometry args={[3.3, 0.12, 1.7]} />
        <meshStandardMaterial color={kiosk.color} roughness={0.7} />
      </mesh>
      {/* Awning valance stripes */}
      <mesh position={[0, 2.52, 0.78]} rotation={[-0.32, 0, 0]}>
        <boxGeometry args={[3.3, 0.28, 0.04]} />
        <meshStandardMaterial color={kiosk.accent} roughness={0.8} />
      </mesh>

      {/* Floating sign / open button (kept below the UI sheets, z < 25) */}
      <Html position={[0, 3.35, -0.2]} center distanceFactor={11} occlude zIndexRange={[24, 0]}>
        <button className={active ? "kiosk-sign active" : "kiosk-sign"} onClick={open}>
          <span className="kiosk-emoji">{kiosk.emoji}</span> {kiosk.brand}
        </button>
      </Html>
    </group>
  );
}
