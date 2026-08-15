import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Instances, Instance } from "@react-three/drei";
import type { Group } from "three";
import { LatheGeometry, Vector2 } from "three";
import type { PropKind, PropPlacement } from "../ceremony";
import type { Detail } from "./LabOrgans";

/**
 * The **ceremony prop kit** — everything the app supplies so that a family only
 * has to bring photographs.
 *
 * These recur across almost every Khmer ceremony, which is exactly why they are
 * a shared kit rather than per-event geometry: the same pedestal trays appear at
 * a wedding, a housewarming and a robe-offering, and the same marquee goes up in
 * the yard for all three. Modelling them once means a new template is data.
 *
 * ## Metres, and the floor is y = 0
 *
 * `PropPlacement.at` is documented as metres in the venue's own frame, so every
 * prop here is built at its real size with its base on the ground plane. A tray
 * is 34 cm tall because a tray is 34 cm tall. That matters more than it sounds:
 * the moment two props are invented at different scales the whole yard stops
 * reading as a place and starts reading as a diagram.
 *
 * ## Schematic, and openly so
 *
 * These are recognisable rather than accurate. Real ceremonial trays are
 * silverwork with detail no procedural mesh is going to reach, and the folded
 * banana-leaf work is an art form in itself. What is right here is the size, the
 * arrangement and the count — which is what a scene needs in order to read as
 * the right ceremony rather than a generic party.
 */

const seg = (d: Detail, lo: number, hi: number) => (d === "normal" ? lo : hi);

/** Gold that reads as gold under an outdoor sky rather than going grey. */
const GOLD = { color: "#d8a63c", metalness: 0.75, roughness: 0.34 };
const SILVER = { color: "#c8ccd2", metalness: 0.8, roughness: 0.3 };

/* ------------------------------------------------------------ the marquee --- */

/**
 * The marquee, and the reason the Buildings registry is not the entry point for
 * any of this: a Khmer wedding happens under one of these in the yard in front
 * of the house, not inside a building. Pink and gold because that is what the
 * hire company brings.
 */
export function Pavilion({ detail, w = 8, d = 8 }: { detail: Detail; w?: number; d?: number }) {
  /** Eave height. Everything about the shot depends on this: a camera above it
   *  sees an opaque roof and none of the ceremony underneath. */
  const post = 2.75;
  const peak = 1.25;
  const hw = w / 2;
  const hd = d / 2;
  return (
    <group>
      {/* Four posts, wrapped in fabric the way hired ones always are. */}
      {[[-hw, -hd], [hw, -hd], [hw, hd], [-hw, hd]].map(([x, z], i) => (
        <mesh key={i} position={[x, post / 2, z]} castShadow={detail === "ultra"}>
          <cylinderGeometry args={[0.07, 0.08, post, seg(detail, 6, 12)]} />
          <meshStandardMaterial color="#e8dcc8" roughness={0.85} />
        </mesh>
      ))}

      {/* One four-sided cone is the hipped canopy: a square pyramid with its
          base on the eave line. Two things here were wrong the first time and
          both are easy to repeat — a cone is centred on its own origin, so it
          has to be lifted by half its height or the eave hangs below the posts
          it is supposed to sit on; and a 4-gon cone puts a *corner* on the +X
          axis, so without the 45° turn the marquee stands diagonally to its own
          posts. */}
      <mesh
        position={[0, post + peak / 2, 0]}
        rotation={[0, Math.PI / 4, 0]}
        castShadow={detail === "ultra"}
      >
        <coneGeometry args={[Math.max(hw, hd) * 1.415, peak, 4]} />
        {/* Emissive, because the underside is what you actually stand under and
            a lit-from-above cone renders it pure black. Real marquee fabric
            transmits a good deal of the light hitting it, so this is closer to
            right than a correctly-shaded slab of shadow. */}
        <meshStandardMaterial
          color="#f2d9e4" roughness={0.72} side={2}
          emissive="#e8c8d6" emissiveIntensity={0.34}
        />
      </mesh>

      {/* The valance hanging from the eave — the detail that says "hired
          marquee" rather than "carport" at a glance. */}
      {([[0, -hd, 0], [0, hd, 0], [-hw, 0, Math.PI / 2], [hw, 0, Math.PI / 2]] as const).map(
        ([x, z, r], i) => (
          <mesh key={i} position={[x, post - 0.17, z]} rotation={[0, r, 0]}>
            <planeGeometry args={[i < 2 ? w : d, 0.34]} />
            <meshStandardMaterial color="#c9447c" roughness={0.7} side={2} />
          </mesh>
        ),
      )}
    </group>
  );
}

/* ------------------------------------------------------------ the offering --- */

/**
 * A pedestal tray. The single most recurrent object in Khmer ceremonial life —
 * food, flowers, betel, folded leaves, all raised off the ground on a footed
 * stand because offerings are not set down flat.
 */
function OfferingTray({ detail }: { detail: Detail }) {
  const stand = useMemo(() => {
    // Lathed from a profile: foot, waisted stem, flared dish. One draw call and
    // it silhouettes correctly from every angle, which a stack of cylinders does
    // not.
    const pts = [
      [0, 0], [0.15, 0], [0.15, 0.02], [0.06, 0.05], [0.045, 0.16],
      [0.07, 0.2], [0.19, 0.26], [0.2, 0.3], [0.185, 0.3], [0.175, 0.26], [0, 0.24],
    ].map(([x, y]) => new Vector2(x, y));
    return new LatheGeometry(pts, seg(detail, 10, 22));
  }, [detail]);

  return (
    <group>
      <mesh geometry={stand} castShadow={detail === "ultra"}>
        <meshStandardMaterial {...SILVER} />
      </mesh>
      {/* What is on it: a mound of fruit and rice, then flowers on top. */}
      <mesh position={[0, 0.33, 0]} castShadow={detail === "ultra"}>
        <sphereGeometry args={[0.13, seg(detail, 8, 16), seg(detail, 6, 12), 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#e6c98a" roughness={0.85} />
      </mesh>
      {detail === "ultra" && [0, 1, 2, 3, 4].map((i) => {
        const a = (i / 5) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.cos(a) * 0.09, 0.36, Math.sin(a) * 0.09]}>
            <sphereGeometry args={[0.035, 8, 6]} />
            <meshStandardMaterial color={i % 2 ? "#e8536b" : "#f6e9b0"} roughness={0.6} />
          </mesh>
        );
      })}
    </group>
  );
}

/* --------------------------------------------------------------- the fire --- */

/**
 * A candle, with a flame that actually gives off light in Ultra.
 *
 * The blessing-candle moment is the one where this matters: the whole point of
 * it is elders passing light around a couple, and an unlit candle turns the
 * scene into a set of props on a mat.
 */
function Candle({ detail, lit = true }: { detail: Detail; lit?: boolean }) {
  const flame = useRef<Group>(null);
  const t = useRef(0);
  useFrame((_, dt) => {
    t.current += dt;
    if (flame.current) {
      // Frame-rate independent flicker, driven on a ref. A candle that set React
      // state every frame would re-render the whole yard sixty times a second.
      const f = 1 + Math.sin(t.current * 11) * 0.08 + Math.sin(t.current * 27) * 0.04;
      flame.current.scale.set(1, f, 1);
    }
  });
  return (
    <group>
      <mesh position={[0, 0.11, 0]} castShadow={detail === "ultra"}>
        <cylinderGeometry args={[0.014, 0.017, 0.22, seg(detail, 5, 10)]} />
        <meshStandardMaterial color="#f4e9cf" roughness={0.6} />
      </mesh>
      {lit && (
        <group ref={flame} position={[0, 0.23, 0]}>
          <mesh position={[0, 0.018, 0]}>
            <coneGeometry args={[0.011, 0.05, 6]} />
            <meshBasicMaterial color="#ffd98a" transparent opacity={0.95} depthWrite={false} />
          </mesh>
          {detail === "ultra" && <pointLight color="#ffb45a" intensity={0.9} distance={2.4} decay={2} />}
        </group>
      )}
    </group>
  );
}

/** A pot of incense sticks, smoke going straight up in still morning air. */
function Incense({ detail }: { detail: Detail }) {
  const sticks = seg(detail, 5, 11);
  return (
    <group>
      <mesh position={[0, 0.05, 0]} castShadow={detail === "ultra"}>
        <cylinderGeometry args={[0.08, 0.07, 0.1, seg(detail, 8, 16)]} />
        <meshStandardMaterial color="#8f6a4a" roughness={0.9} />
      </mesh>
      {Array.from({ length: sticks }, (_, i) => {
        const a = (i / sticks) * Math.PI * 2;
        const r = 0.03;
        return (
          <group key={i} position={[Math.cos(a) * r, 0.1, Math.sin(a) * r]} rotation={[Math.cos(a) * 0.1, 0, -Math.sin(a) * 0.1]}>
            <mesh position={[0, 0.14, 0]}>
              <cylinderGeometry args={[0.0035, 0.0035, 0.28, 4]} />
              <meshStandardMaterial color="#b23b3b" roughness={0.8} />
            </mesh>
          </group>
        );
      })}
      {detail === "ultra" && (
        <mesh position={[0, 0.42, 0]}>
          <sphereGeometry args={[0.07, 8, 6]} />
          <meshBasicMaterial color="#e8e4dc" transparent opacity={0.1} depthWrite={false} />
        </mesh>
      )}
    </group>
  );
}

/* ------------------------------------------------------------- the seating --- */

/** The monks' dais: raised, matted, with cushions and upright backrests. */
function MonkSeating({ detail, seats = 4 }: { detail: Detail; seats?: number }) {
  const w = 0.72 * seats + 0.5;
  return (
    <group>
      <mesh position={[0, 0.17, 0]} castShadow={detail === "ultra"} receiveShadow>
        <boxGeometry args={[w, 0.34, 1.2]} />
        <meshStandardMaterial color="#8a5a34" roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.35, 0]} receiveShadow>
        <boxGeometry args={[w - 0.1, 0.02, 1.1]} />
        <meshStandardMaterial color="#d8c79a" roughness={0.9} />
      </mesh>
      {Array.from({ length: seats }, (_, i) => {
        const x = (i - (seats - 1) / 2) * 0.72;
        return (
          <group key={i} position={[x, 0.36, 0]}>
            <mesh position={[0, 0.06, 0.05]} castShadow={detail === "ultra"}>
              <boxGeometry args={[0.56, 0.12, 0.56]} />
              <meshStandardMaterial color="#e0a02c" roughness={0.7} />
            </mesh>
            <mesh position={[0, 0.28, -0.28]} castShadow={detail === "ultra"}>
              <boxGeometry args={[0.5, 0.44, 0.1]} />
              <meshStandardMaterial color="#e0a02c" roughness={0.7} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

/** A woven floor mat — where most of a Khmer ceremony actually takes place. */
function FloorMat({ detail }: { detail: Detail }) {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0]} receiveShadow>
        <planeGeometry args={[2.6, 1.9]} />
        <meshStandardMaterial color="#cbb684" roughness={0.95} />
      </mesh>
      {detail === "ultra" && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.014, 0]}>
          <ringGeometry args={[0.9, 1.0, 4, 1]} />
          <meshStandardMaterial color="#a8905e" roughness={0.95} />
        </mesh>
      )}
    </group>
  );
}

/** A round cloth-covered table. Ten of them and you have the reception. */
function LowTable({ detail }: { detail: Detail }) {
  return (
    <group>
      <mesh position={[0, 0.21, 0]} castShadow={detail === "ultra"}>
        <cylinderGeometry args={[0.48, 0.44, 0.42, seg(detail, 8, 18)]} />
        <meshStandardMaterial color="#f2e6d8" roughness={0.85} />
      </mesh>
      <mesh position={[0, 0.43, 0]} receiveShadow>
        <cylinderGeometry args={[0.5, 0.5, 0.03, seg(detail, 8, 18)]} />
        <meshStandardMaterial color="#e8dccb" roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.47, 0]}>
        <sphereGeometry args={[0.07, seg(detail, 6, 12), seg(detail, 5, 8)]} />
        <meshStandardMaterial color="#d8546a" roughness={0.6} />
      </mesh>
    </group>
  );
}

/** The ceremonial parasol carried in the procession. */
function Parasol({ detail }: { detail: Detail }) {
  return (
    <group>
      <mesh position={[0, 1.1, 0]}>
        <cylinderGeometry args={[0.022, 0.022, 2.2, seg(detail, 5, 10)]} />
        <meshStandardMaterial color="#7a5230" roughness={0.85} />
      </mesh>
      <mesh position={[0, 2.06, 0]} castShadow={detail === "ultra"}>
        <coneGeometry args={[0.82, 0.4, seg(detail, 8, 20)]} />
        <meshStandardMaterial {...GOLD} side={2} />
      </mesh>
      <mesh position={[0, 1.85, 0]}>
        <cylinderGeometry args={[0.8, 0.8, 0.16, seg(detail, 8, 20), 1, true]} />
        <meshStandardMaterial color="#c9992e" roughness={0.5} side={2} />
      </mesh>
    </group>
  );
}

/** A skor — the barrel drum that leads the procession. */
function Drum({ detail }: { detail: Detail }) {
  return (
    <group>
      <mesh position={[0, 0.62, 0]} rotation={[0, 0, Math.PI / 2]} castShadow={detail === "ultra"}>
        <cylinderGeometry args={[0.26, 0.26, 0.66, seg(detail, 10, 20)]} />
        <meshStandardMaterial color="#6b3f24" roughness={0.75} />
      </mesh>
      {[-0.33, 0.33].map((x) => (
        <mesh key={x} position={[x, 0.62, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.265, 0.265, 0.02, seg(detail, 10, 20)]} />
          <meshStandardMaterial color="#e4d3b0" roughness={0.85} />
        </mesh>
      ))}
      {[-0.3, 0.3].map((x) => (
        <mesh key={x} position={[x, 0.3, 0]} rotation={[0.2, 0, x > 0 ? -0.3 : 0.3]}>
          <cylinderGeometry args={[0.03, 0.035, 0.62, 6]} />
          <meshStandardMaterial color="#5c3a22" roughness={0.9} />
        </mesh>
      ))}
    </group>
  );
}

/** Wrapped gifts, carried in pairs in the procession. */
function GiftBox({ detail }: { detail: Detail }) {
  return (
    <group>
      <mesh position={[0, 0.16, 0]} castShadow={detail === "ultra"}>
        <boxGeometry args={[0.34, 0.32, 0.34]} />
        <meshStandardMaterial color="#d94f7a" roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.16, 0]}>
        <boxGeometry args={[0.36, 0.06, 0.36]} />
        <meshStandardMaterial {...GOLD} />
      </mesh>
      {detail === "ultra" && (
        <mesh position={[0, 0.34, 0]}>
          <torusGeometry args={[0.06, 0.022, 6, 12]} />
          <meshStandardMaterial {...GOLD} />
        </mesh>
      )}
    </group>
  );
}

/** The kettle of blessed water, sprinkled through a new house. */
function WaterVessel({ detail }: { detail: Detail }) {
  return (
    <group>
      <mesh position={[0, 0.13, 0]} castShadow={detail === "ultra"}>
        <sphereGeometry args={[0.14, seg(detail, 10, 18), seg(detail, 8, 14)]} />
        <meshStandardMaterial {...SILVER} />
      </mesh>
      <mesh position={[0.14, 0.18, 0]} rotation={[0, 0, -0.7]}>
        <cylinderGeometry args={[0.018, 0.03, 0.2, seg(detail, 6, 10)]} />
        <meshStandardMaterial {...SILVER} />
      </mesh>
      <mesh position={[0, 0.28, 0]}>
        <sphereGeometry args={[0.035, 8, 6]} />
        <meshStandardMaterial {...GOLD} />
      </mesh>
    </group>
  );
}

/** A jasmine garland, hung or laid over a tray. */
function Garland({ detail }: { detail: Detail }) {
  const beads = seg(detail, 14, 26);
  return (
    <Instances limit={beads} range={beads}>
      <sphereGeometry args={[0.028, 6, 5]} />
      <meshStandardMaterial color="#f6f2e2" roughness={0.5} />
      {Array.from({ length: beads }, (_, i) => {
        const a = (i / beads) * Math.PI * 2;
        return <Instance key={i} position={[Math.cos(a) * 0.17, Math.sin(a) * 0.17 * 0.55, 0]} />;
      })}
    </Instances>
  );
}

/**
 * A cut banana stem, standing.
 *
 * Not the tree: the trunk section, used as the base that candles and folded
 * leaf-work are pinned into. It turns up wherever there is an altar to build.
 */
function BananaStem({ detail }: { detail: Detail }) {
  const points = seg(detail, 6, 10);
  return (
    <group>
      <mesh position={[0, 0.34, 0]} castShadow={detail === "ultra"}>
        <cylinderGeometry args={[0.13, 0.16, 0.68, seg(detail, 8, 16)]} />
        <meshStandardMaterial color="#8fa860" roughness={0.85} />
      </mesh>
      {/* Folded leaf points around the rim — the sluk chek work, schematically. */}
      {Array.from({ length: points }, (_, i) => {
        const a = (i / points) * Math.PI * 2;
        return (
          <mesh
            key={i}
            position={[Math.cos(a) * 0.12, 0.74, Math.sin(a) * 0.12]}
            rotation={[0.35, -a, 0]}
          >
            <coneGeometry args={[0.05, 0.22, 4]} />
            <meshStandardMaterial color="#4f7a34" roughness={0.8} side={2} />
          </mesh>
        );
      })}
    </group>
  );
}

/* -------------------------------------------------------------- the kit --- */

/** One prop, by kind. The single place a new `PropKind` is plugged in. */
export function Prop({ kind, detail }: { kind: PropKind; detail: Detail }) {
  switch (kind) {
    case "pavilion": return <Pavilion detail={detail} />;
    case "offering-tray": return <OfferingTray detail={detail} />;
    case "banana-stem": return <BananaStem detail={detail} />;
    case "flower-garland": return <Garland detail={detail} />;
    case "candle": return <Candle detail={detail} />;
    case "incense": return <Incense detail={detail} />;
    case "monk-seating": return <MonkSeating detail={detail} />;
    case "floor-mat": return <FloorMat detail={detail} />;
    case "low-table": return <LowTable detail={detail} />;
    case "parasol": return <Parasol detail={detail} />;
    case "drum": return <Drum detail={detail} />;
    case "gift-box": return <GiftBox detail={detail} />;
    case "water-vessel": return <WaterVessel detail={detail} />;
    default: return null;
  }
}

/**
 * Where the `count` copies of a prop go.
 *
 * Not a straight row. Ten reception tables in a line is a bus queue; candles in
 * a line is a birthday cake. Real arrangements are arcs around whoever the
 * ceremony is centred on, so a count above three fans out, and the fan grows
 * with the prop's own footprint rather than being one hard-coded gap.
 */
const gapOf = (kind: PropKind) =>
  kind === "low-table" ? 1.5 : kind === "gift-box" ? 0.55 : kind === "candle" ? 0.42 : 0.62;

function fan(i: number, count: number, kind: PropKind): [number, number, number] {
  if (count <= 1) return [0, 0, 0];
  const gap = gapOf(kind);
  if (count <= 3) return [(i - (count - 1) / 2) * gap, 0, 0];
  const radius = (gap * count) / (Math.PI * 0.9);
  const spread = Math.min(Math.PI * 1.5, (gap * count) / radius);
  const a = -spread / 2 + (i / (count - 1)) * spread;
  return [Math.sin(a) * radius, 0, radius - Math.cos(a) * radius];
}

/**
 * Roughly how wide each prop is on the ground, in metres.
 *
 * Only used for framing. It exists because a moment staging seven 22 cm candles
 * and a moment staging an 8 m marquee cannot share one camera distance: shot
 * from far enough back to hold the marquee, the candles are four pixels of
 * nothing at the bottom of the screen.
 */
const PROP_SIZE: Record<PropKind, number> = {
  "pavilion": 8, "offering-tray": 0.42, "banana-stem": 0.36, "flower-garland": 0.38,
  "candle": 0.05, "incense": 0.22, "monk-seating": 3.4, "floor-mat": 2.6,
  "low-table": 1.02, "parasol": 1.7, "drum": 0.8, "gift-box": 0.38, "water-vessel": 0.32,
};

/** How far a moment's staging reaches from the centre — the radius to frame. */
export function stagingRadius(staging: PropPlacement[]): number {
  let r = 0;
  for (const p of staging) {
    const count = Math.max(1, p.count ?? 1);
    const from = Math.hypot(p.at[0], p.at[2]);
    r = Math.max(r, from + fanExtent(count, p.kind) + PROP_SIZE[p.kind] / 2);
  }
  return r;
}

/**
 * Everything one moment puts on the ground.
 *
 * Staging is per-moment rather than per-ceremony because that is what a ceremony
 * *is*: the trays come out, then the monks are seated, then the mat is cleared
 * for the candles. Re-dressing the yard between moments is the animation.
 */
export function Staging({
  staging, detail, highlight,
}: {
  staging: PropPlacement[];
  detail: Detail;
  /** Fade everything except the prop kind being explained, if any. */
  highlight?: PropKind | null;
}) {
  return (
    <group>
      {staging.map((p, pi) => {
        const count = Math.max(1, p.count ?? 1);
        const dim = highlight != null && p.kind !== highlight;
        const lift = p.at[1];
        return (
          <group key={`${p.kind}-${pi}`}>
            {/* Anything staged above the ground is staged on *something*. The
                templates place trays at 0.8 m and blessing candles at 0.5 m —
                waist and table height, because in life a person is holding them
                or a table is under them. With no people modelled yet, that
                height reads as a bug: a row of candles hanging in mid-air. So
                the renderer supplies the surface the data implies. */}
            {lift > 0.2 && (
              <Trestle
                at={[p.at[0], 0, p.at[2]]}
                top={lift}
                radius={fanExtent(count, p.kind) + PROP_SIZE[p.kind] * 0.7}
                detail={detail}
              />
            )}
            <group
              position={p.at}
              rotation={[0, p.rotation ?? 0, 0]}
              // Dimming is opacity-free: scaling a de-emphasised prop down very
              // slightly reads as "behind" without the sorting problems that
              // transparency brings to a scene with this many small objects.
              scale={dim ? 0.94 : 1}
            >
              {Array.from({ length: count }, (_, i) => (
                <group key={i} position={fan(i, count, p.kind)}>
                  <Prop kind={p.kind} detail={detail} />
                </group>
              ))}
            </group>
          </group>
        );
      })}
    </group>
  );
}

/** The cloth-covered surface implied by a raised placement. */
function Trestle({
  at, top, radius, detail,
}: {
  at: [number, number, number]; top: number; radius: number; detail: Detail;
}) {
  return (
    <group position={at}>
      <mesh position={[0, top / 2, 0]} receiveShadow castShadow={detail === "ultra"}>
        <cylinderGeometry args={[radius * 0.86, radius * 0.8, top, seg(detail, 8, 20)]} />
        <meshStandardMaterial color="#e4d6c2" roughness={0.9} />
      </mesh>
      <mesh position={[0, top, 0]} receiveShadow>
        <cylinderGeometry args={[radius, radius, 0.03, seg(detail, 8, 20)]} />
        <meshStandardMaterial color="#f2e8da" roughness={0.85} />
      </mesh>
    </group>
  );
}

/** Half the width the fan reaches, for sizing whatever has to sit under it. */
function fanExtent(count: number, kind: PropKind): number {
  if (count <= 1) return 0;
  const gap = gapOf(kind);
  if (count <= 3) return (gap * (count - 1)) / 2;
  return ((gap * count) / (Math.PI * 0.9)) * Math.sin(Math.min(Math.PI * 1.5, Math.PI * 0.9) / 2);
}

/** Human-readable names for the kit, for the moment's prop list. */
export const PROP_NAME: Record<PropKind, string> = {
  "pavilion": "Marquee",
  "offering-tray": "Offering trays",
  "banana-stem": "Banana stem",
  "flower-garland": "Flower garlands",
  "candle": "Candles",
  "incense": "Incense",
  "monk-seating": "Monks' dais",
  "floor-mat": "Floor mats",
  "low-table": "Tables",
  "parasol": "Parasol",
  "drum": "Drum",
  "gift-box": "Gifts",
  "water-vessel": "Water vessel",
};
