import { useState } from "react";
import type { Texture } from "three";
import type { KhmerLetter } from "../khmer";

/**
 * A single 3D letter tile — a card carrying one Khmer letter (rendered into a
 * texture in the current font), that you can look at from any angle or in VR.
 * a-series and o-series consonants get a subtly different card tint so the two
 * series read at a glance.
 */
export function LetterTile({
  letter,
  texture,
  position,
  selected,
  onSelect,
}: {
  letter: KhmerLetter;
  texture: Texture;
  position: [number, number, number];
  selected: boolean;
  onSelect: () => void;
}) {
  const [hover, setHover] = useState(false);
  const active = selected || hover;
  const edge = selected ? "#c8912e" : letter.series === "o" ? "#5a6b7a" : letter.series === "a" ? "#7a6a4a" : "#6b6152";

  return (
    <group
      position={position}
      scale={active ? 1.14 : 1}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHover(true);
      }}
      onPointerOut={() => setHover(false)}
    >
      {/* Card body (gives the tile real thickness for 3D/VR). */}
      <mesh castShadow>
        <boxGeometry args={[1.06, 1.32, 0.12]} />
        <meshStandardMaterial color={edge} roughness={0.8} />
      </mesh>
      {/* The glyph face. */}
      <mesh position={[0, 0, 0.061]}>
        <planeGeometry args={[0.98, 1.24]} />
        <meshBasicMaterial map={texture} toneMapped={false} />
      </mesh>
    </group>
  );
}
