import type { Outfit } from "../fashion";

/** A neutral default skin tone; the avatar dress-up lets a visitor change it. */
export const SKIN = "#c98a5a";

/** Some warm/neutral skin tones a visitor can pick for their avatar. */
export const SKIN_TONES = ["#f2c9a0", "#e0aa7c", "#c98a5a", "#a56a3e", "#7c4a28"];

/**
 * A procedural standing figure that "wears" an {@link Outfit} — sampot (wrap
 * skirt or shorter chang-kben), sbai sash, krama scarf, and ceremonial gold
 * (mkot crown, belt, bangles). Built entirely from primitives: self-contained,
 * low-poly, and light enough for a $150 phone or VR.
 */
export function FashionFigure({ outfit }: { outfit: Outfit }) {
  const tone = outfit.tone ?? SKIN;
  const covered = outfit.top === "blouse" || outfit.top === "shirt";
  const sleeve = covered ? outfit.topColor : tone;
  const legColor = outfit.legs ?? tone;
  const kben = outfit.skirtStyle === "kben";

  return (
    <group position={[0, 0.1, 0]}>
      {/* legs */}
      {[-0.13, 0.13].map((x) => (
        <group key={x}>
          <mesh position={[x, 0.32, 0]} castShadow>
            <capsuleGeometry args={[0.085, 0.6, 4, 8]} />
            <meshStandardMaterial color={legColor} roughness={0.9} />
          </mesh>
          <mesh position={[x, 0.02, 0.05]} castShadow>
            <boxGeometry args={[0.14, 0.06, 0.24]} />
            <meshStandardMaterial color="#5b4630" roughness={1} />
          </mesh>
        </group>
      ))}

      {/* sampot — a wrap skirt, or a shorter chang-kben */}
      <mesh position={[0, kben ? 0.72 : 0.5, 0]} castShadow>
        <coneGeometry args={[kben ? 0.28 : 0.42, kben ? 0.46 : 0.92, 20, 1, true]} />
        <meshStandardMaterial color={outfit.skirt} roughness={0.85} side={2} />
      </mesh>

      {/* hips */}
      <mesh position={[0, 0.92, 0]} castShadow>
        <capsuleGeometry args={[0.16, 0.1, 4, 10]} />
        <meshStandardMaterial color={covered ? outfit.topColor : tone} roughness={0.85} />
      </mesh>

      {/* torso */}
      <mesh position={[0, 1.22, 0]} castShadow>
        <capsuleGeometry args={[0.17, 0.44, 6, 12]} />
        <meshStandardMaterial color={covered ? outfit.topColor : tone} roughness={0.85} />
      </mesh>

      {/* arms */}
      {[-0.26, 0.26].map((x) => (
        <mesh key={x} position={[x, 1.16, 0]} rotation={[0, 0, x < 0 ? 0.12 : -0.12]} castShadow>
          <capsuleGeometry args={[0.055, 0.5, 4, 8]} />
          <meshStandardMaterial color={sleeve} roughness={0.85} />
        </mesh>
      ))}

      {/* sbai — a diagonal sash across the torso */}
      {outfit.top === "sbai" && (
        <mesh position={[0, 1.24, 0.12]} rotation={[0, 0, 0.9]} castShadow>
          <boxGeometry args={[0.7, 0.22, 0.14]} />
          <meshStandardMaterial color={outfit.topColor} roughness={0.7} />
        </mesh>
      )}

      {/* krama — a checkered scarf around the neck */}
      {outfit.krama && (
        <group position={[0, 1.5, 0.02]}>
          <mesh castShadow>
            <torusGeometry args={[0.17, 0.05, 8, 20]} />
            <meshStandardMaterial color={outfit.krama} roughness={0.9} />
          </mesh>
          {[0, 1, 2].map((i) => (
            <mesh key={i} position={[0, -0.06 - i * 0.12, 0.16]} castShadow>
              <boxGeometry args={[0.14, 0.09, 0.03]} />
              <meshStandardMaterial color={i % 2 ? "#efe7dc" : outfit.krama!} roughness={0.9} />
            </mesh>
          ))}
        </group>
      )}

      {/* head + hair */}
      <mesh position={[0, 1.62, 0]} castShadow>
        <sphereGeometry args={[0.145, 18, 18]} />
        <meshStandardMaterial color={tone} roughness={0.75} />
      </mesh>
      <mesh position={[0, 1.68, -0.03]} castShadow>
        <sphereGeometry args={[0.16, 16, 16]} />
        <meshStandardMaterial color="#221a12" roughness={0.9} />
      </mesh>

      {/* ceremonial gold — belt, crown (mkot), bracelets */}
      {outfit.gold && (
        <group>
          <mesh position={[0, 0.98, 0]}>
            <torusGeometry args={[0.18, 0.028, 8, 24]} />
            <meshStandardMaterial color="#d9b44a" metalness={0.4} roughness={0.4} />
          </mesh>
          {/* mkot crown */}
          <group position={[0, 1.8, 0]}>
            <mesh castShadow>
              <coneGeometry args={[0.14, 0.26, 10]} />
              <meshStandardMaterial color="#d9b44a" metalness={0.4} roughness={0.4} />
            </mesh>
            <mesh position={[0, 0.22, 0]}>
              <coneGeometry args={[0.04, 0.18, 8]} />
              <meshStandardMaterial color="#e6c65a" metalness={0.4} roughness={0.35} />
            </mesh>
          </group>
          {/* wrist bangles */}
          {[-0.31, 0.31].map((x) => (
            <mesh key={x} position={[x, 0.92, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[0.06, 0.016, 6, 16]} />
              <meshStandardMaterial color="#d9b44a" metalness={0.4} roughness={0.4} />
            </mesh>
          ))}
        </group>
      )}
    </group>
  );
}
