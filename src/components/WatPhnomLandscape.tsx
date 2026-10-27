import { useMemo } from "react";
import { Instances, Instance } from "@react-three/drei";
import { Palm } from "./Palm";
import { Forest } from "./Forest";

/**
 * The Wat Phnom setting, modelled on the aerial photos: a wooded man-made hill
 * (the *phnom*) crowned by the temple, ringed at its foot by the flower-clock
 * garden and, beyond, the low skyline of modern Phnom Penh. Front is +z (the
 * naga-staircase side). Fully procedural, mobile-cheap: the forest and the city
 * are each a single instanced draw.
 */

// Hill (truncated cone): flat top at y=TOP_Y radius TOP_R, skirt to BOT_R.
const TOP_R = 3.2;
const BOT_R = 13;
const TOP_Y = 1.4;
const hillY = (r: number) => (r <= TOP_R ? TOP_Y : r >= BOT_R ? 0 : (TOP_Y * (BOT_R - r)) / (BOT_R - TOP_R));

const GREENS = ["#3f6f2f", "#49772f", "#356329", "#547f37", "#2f5b26"];
const CITY = ["#9098a0", "#aab0b6", "#c3bdb0", "#8b929a", "#b8b2a6"];
const ROOFS = ["#b5623a", "#a8552f"];

export function WatPhnomLandscape({ authoredHill = false }: { authoredHill?: boolean }) {
  const rand = useMemo(() => {
    let i = 0;
    return () => {
      i++;
      const v = Math.sin(i * 127.1) * 43758.5453;
      return v - Math.floor(v);
    };
  }, []);

  // Trees clothe the hill slopes and the ground around it kept off the temple
  // terrace, the staircase axis (+z) and the flower-clock plaza.
  const trees = useMemo(() => {
    const out: { x: number; z: number; y: number; s: number; c: string }[] = [];
    let guard = 0;
    while (out.length < 150 && guard++ < 3000) {
      const ang = rand() * Math.PI * 2;
      const r = 5.4 + rand() * 12;
      const x = Math.cos(ang) * r;
      const z = Math.sin(ang) * r;
      if (Math.abs(x) < 5 && z > 3 && z < 18) continue; // keep the stair approach and its camera sightline open
      out.push({ x, z, y: hillY(r), s: 0.7 + rand() * 0.8, c: GREENS[out.length % GREENS.length] });
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // A ring of buildings evoking the city around the hill.
  const city = useMemo(() => {
    const out: { x: number; z: number; w: number; h: number; d: number; c: string }[] = [];
    for (let i = 0; i < 30; i++) {
      const ang = (i / 30) * Math.PI * 2 + rand() * 0.15;
      const r = 26 + rand() * 7;
      const h = 1.4 + rand() * (rand() > 0.82 ? 8 : 3); // a few towers
      out.push({
        x: Math.cos(ang) * r,
        z: Math.sin(ang) * r,
        w: 1.4 + rand() * 2,
        h,
        d: 1.4 + rand() * 2,
        c: rand() > 0.8 ? ROOFS[i % 2] : CITY[i % CITY.length],
      });
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const clockMarks = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) => {
        const a = (i / 12) * Math.PI * 2;
        return [Math.sin(a) * 1.7, Math.cos(a) * 1.7] as [number, number];
      }),
    [],
  );

  return (
    <group>
      {/* The hill (truncated cone) + a darker earth skirt */}
      {!authoredHill && <>
      <mesh position={[0, TOP_Y / 2, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[TOP_R, BOT_R, TOP_Y, 44]} />
        <meshStandardMaterial color="#5f7d3a" roughness={1} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]} receiveShadow>
        <circleGeometry args={[BOT_R + 1.5, 44]} />
        <meshStandardMaterial color="#6f7c4a" roughness={1} />
      </mesh>
      </>}

      {/* Flower clock garden at the foot of the hill (front, +z) */}
      <group position={[0, 0.05, 13.2]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]} receiveShadow>
          <circleGeometry args={[2.1, 40]} />
          <meshStandardMaterial color="#4f7d33" roughness={1} />
        </mesh>
        {/* red curb ring */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
          <ringGeometry args={[2.05, 2.25, 40]} />
          <meshStandardMaterial color="#7d2a22" roughness={1} />
        </mesh>
        {/* hour markers */}
        <Instances limit={12}>
          <boxGeometry args={[0.16, 0.06, 0.28]} />
          <meshStandardMaterial color="#f0ece0" roughness={1} />
          {clockMarks.map(([mx, mz], i) => (
            <Instance key={i} position={[mx, 0.06, mz]} />
          ))}
        </Instances>
        {/* hands */}
        <mesh position={[0.0, 0.08, -0.5]} rotation={[0, 0.4, 0]}>
          <boxGeometry args={[0.08, 0.04, 1.3]} />
          <meshStandardMaterial color="#e8b23a" roughness={0.8} />
        </mesh>
        <mesh position={[0.3, 0.08, 0.1]} rotation={[0, 1.7, 0]}>
          <boxGeometry args={[0.07, 0.04, 0.9]} />
          <meshStandardMaterial color="#e8b23a" roughness={0.8} />
        </mesh>
      </group>

      {/* City skyline ring (single instanced draw) */}
      <Instances limit={city.length} castShadow>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial roughness={0.9} />
        {city.map((bd, i) => (
          <Instance key={i} position={[bd.x, bd.h / 2, bd.z]} scale={[bd.w, bd.h, bd.d]} color={bd.c} />
        ))}
      </Instances>

      {/* Sugar palms among the hill trees */}
      {!authoredHill && [
        [6.3, 0, 5.5],
        [-6.4, 0, 5.0],
        [4.5, 0, 2.0],
        [-4.6, 0, 1.5],
        [6.2, 0, -5.8],
        [-6.0, 0, -5.5],
      ].map(([x, , z], i) => {
        const r = Math.hypot(x, z);
        return <Palm key={i} position={[x, hillY(r), z]} scale={0.9} spin={i * 1.7} />;
      })}

      {/* Hill forest */}
      {!authoredHill && <Forest trees={trees} />}
    </group>
  );
}
