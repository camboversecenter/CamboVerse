import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Group } from "three";

/**
 * A low-poly stand-in for a real heritage capture — a stepped tower evoking a
 * Khmer prasat, on a ground plane. Built from primitives so the scaffold has no
 * binary asset dependency. Replace this component with a <primitive> loaded from
 * glTF or a Gaussian-splat viewer once we have a real scan.
 */
export function HeritagePlaceholder() {
  const group = useRef<Group>(null);

  // Gentle idle rotation so the prototype reads as "alive" on first load.
  useFrame((_, delta) => {
    if (group.current) group.current.rotation.y += delta * 0.15;
  });

  // Four receding tiers -> a stupa/prasat silhouette.
  const tiers = [
    { y: 0.5, size: 3.0, h: 1.0 },
    { y: 1.5, size: 2.2, h: 1.0 },
    { y: 2.4, size: 1.5, h: 0.8 },
    { y: 3.05, size: 0.8, h: 0.6 },
  ];

  return (
    <group ref={group}>
      {/* Ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <circleGeometry args={[9, 48]} />
        <meshStandardMaterial color="#2b2118" roughness={1} />
      </mesh>

      {tiers.map((t, i) => (
        <mesh key={i} position={[0, t.y, 0]} castShadow receiveShadow>
          <boxGeometry args={[t.size, t.h, t.size]} />
          <meshStandardMaterial color="#8a7355" roughness={0.85} metalness={0.05} />
        </mesh>
      ))}

      {/* Finial */}
      <mesh position={[0, 3.75, 0]} castShadow>
        <coneGeometry args={[0.35, 0.7, 6]} />
        <meshStandardMaterial color="#4c8a3f" roughness={0.5} metalness={0.2} />
      </mesh>
    </group>
  );
}
