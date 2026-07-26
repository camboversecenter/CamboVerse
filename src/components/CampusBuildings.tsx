import { useLayoutEffect, useMemo, useRef } from "react";
import {
  BufferGeometry, DoubleSide, Float32BufferAttribute, InstancedMesh,
  Matrix4, Quaternion, Vector3,
} from "three";
import {
  paveTexture, facadeTexture, glazingTexture, roofTexture, signTexture, hedgeTexture,
} from "../lib/campusTexture";

/**
 * The building kit for the NUM International Campus — hipped metal roofs, a
 * glazed great hall under a deep overhang, long white teaching blocks, the
 * entrance monument, a Khmer shrine, and the parking canopies.
 *
 * Everything is procedural: boxes, planes and a few custom roof geometries with
 * canvas-drawn textures. Nothing is downloaded, and the whole campus stays
 * inside the low-end-phone budget.
 */

/* ------------------------------------------------------------- geometry --- */

/**
 * A hipped roof over a `w × d` footprint: two long slopes meeting at a ridge,
 * closed by a triangular hip at each end. When the plan is square the ridge
 * collapses to a point and it becomes a pyramid — which is what the great hall
 * has. `overhang` extends the eaves out past the walls.
 */
export function hippedRoofGeometry(w: number, d: number, h: number, overhang = 0): BufferGeometry {
  const W = w + overhang * 2;
  const D = d + overhang * 2;
  const ridge = Math.max(0, W - D) / 2; // half the ridge length along x
  const hx = W / 2;
  const hz = D / 2;

  // eave corners (y=0) then the two ridge points (y=h)
  const v = [
    [-hx, 0, -hz], [hx, 0, -hz], [hx, 0, hz], [-hx, 0, hz],
    [-ridge, h, 0], [ridge, h, 0],
  ];
  const faces = [
    [0, 1, 5], [0, 5, 4],   // back slope
    [2, 3, 4], [2, 4, 5],   // front slope
    [1, 2, 5],              // right hip
    [3, 0, 4],              // left hip
  ];
  const pos: number[] = [];
  for (const f of faces) for (const i of f) pos.push(v[i][0], v[i][1], v[i][2]);
  const g = new BufferGeometry();
  g.setAttribute("position", new Float32BufferAttribute(pos, 3));
  // simple planar UVs so the ribbed roofing runs down the slope
  const uv: number[] = [];
  for (let i = 0; i < pos.length; i += 3) uv.push(pos[i] / 6, pos[i + 2] / 6);
  g.setAttribute("uv", new Float32BufferAttribute(uv, 2));
  g.computeVertexNormals();
  return g;
}

/** A pitched gable end (the small decorative pediment over an entrance). */
function gableGeometry(w: number, h: number): BufferGeometry {
  const g = new BufferGeometry();
  g.setAttribute("position", new Float32BufferAttribute(
    [-w / 2, 0, 0, w / 2, 0, 0, 0, h, 0], 3,
  ));
  g.setAttribute("uv", new Float32BufferAttribute([0, 0, 1, 0, 0.5, 1], 2));
  g.computeVertexNormals();
  return g;
}

/* --------------------------------------------------------------- pieces --- */

/** The tall slender finial that crowns a Khmer roof. */
function Finial({ height = 4, color = "#f2efe6" }: { height?: number; color?: string }) {
  return (
    <group>
      <mesh castShadow>
        <coneGeometry args={[0.28, height * 0.62, 8]} />
        <meshStandardMaterial color={color} roughness={0.6} />
      </mesh>
      <mesh position={[0, height * 0.45, 0]} castShadow>
        <coneGeometry args={[0.12, height * 0.5, 8]} />
        <meshStandardMaterial color={color} roughness={0.55} />
      </mesh>
      <mesh position={[0, height * 0.72, 0]}>
        <sphereGeometry args={[0.09, 8, 8]} />
        <meshStandardMaterial color="#d8b24a" metalness={0.5} roughness={0.35} />
      </mesh>
    </group>
  );
}

/**
 * The **Great Hall** — the campus's landmark: a glazed hall inside a colonnade,
 * under a very deep hipped roof, with a Khmer gable and spire riding the ridge
 * and a glass canopy over the entrance.
 */
export function GreatHall({
  w = 54, d = 40, wall = 9, roof = 9, position = [0, 0, 0] as [number, number, number], rotation = 0,
}) {
  const glass = useMemo(() => glazingTexture(20), []);
  const roofTex = useMemo(() => roofTexture("#b23a34", 44, [8, 4]), []);
  const roofGeo = useMemo(() => hippedRoofGeometry(w, d, roof, 4.5), [w, d, roof]);
  const gable = useMemo(() => gableGeometry(7, 5.5), []);
  const cols = 14;

  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* plinth */}
      <mesh position={[0, 0.35, 0]} receiveShadow castShadow>
        <boxGeometry args={[w + 9, 0.7, d + 9]} />
        <meshStandardMaterial color="#cdc9c0" roughness={1} />
      </mesh>

      {/* glazed volume */}
      <mesh position={[0, 0.7 + wall / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[w, wall, d]} />
        <meshStandardMaterial map={glass} roughness={0.24} metalness={0.35} />
      </mesh>

      {/* white colonnade carrying the overhang */}
      {Array.from({ length: cols }).map((_, i) => {
        const t = (i / (cols - 1) - 0.5) * (w + 8);
        return (
          <group key={i}>
            {[-1, 1].map((s) => (
              <mesh key={s} position={[t, 0.7 + wall / 2, (s * (d + 8)) / 2]} castShadow>
                <boxGeometry args={[0.34, wall, 0.34]} />
                <meshStandardMaterial color="#f4f2ec" roughness={0.75} />
              </mesh>
            ))}
          </group>
        );
      })}
      {[-1, 1].map((s) => (
        <group key={s}>
          {Array.from({ length: 9 }).map((_, i) => {
            const t = (i / 8 - 0.5) * (d + 8);
            return (
              <mesh key={i} position={[(s * (w + 8)) / 2, 0.7 + wall / 2, t]} castShadow>
                <boxGeometry args={[0.34, wall, 0.34]} />
                <meshStandardMaterial color="#f4f2ec" roughness={0.75} />
              </mesh>
            );
          })}
        </group>
      ))}

      {/* fascia band, then the deep hipped roof */}
      <mesh position={[0, 0.7 + wall + 0.3, 0]} castShadow>
        <boxGeometry args={[w + 9.6, 0.6, d + 9.6]} />
        <meshStandardMaterial color="#f6f4ee" roughness={0.7} />
      </mesh>
      <mesh geometry={roofGeo} position={[0, 0.7 + wall + 0.6, 0]} castShadow receiveShadow>
        <meshStandardMaterial map={roofTex} roughness={0.62} metalness={0.12} side={DoubleSide} />
      </mesh>

      {/* roof-top plant enclosures, as in the photographs */}
      {[-1, 0, 1].map((i) => (
        <mesh key={i} position={[i * 4.2, 0.7 + wall + 2.4, -1.5]} castShadow>
          <boxGeometry args={[3.2, 1.1, 2.6]} />
          <meshStandardMaterial color="#e8e6df" roughness={0.8} />
        </mesh>
      ))}

      {/* Khmer gable + spire on the ridge */}
      <group position={[0, 0.7 + wall + roof - 0.6, 0]}>
        <mesh position={[0, 1.6, 0]} castShadow>
          <boxGeometry args={[8.4, 3.2, 8.4]} />
          <meshStandardMaterial color="#b23a34" roughness={0.6} />
        </mesh>
        {[0, Math.PI / 2].map((r, i) => (
          <group key={i} rotation={[0, r, 0]}>
            {[-1, 1].map((s) => (
              <mesh key={s} geometry={gable} position={[0, 3.2, s * 4.25]} rotation={[0, s > 0 ? 0 : Math.PI, 0]} castShadow>
                <meshStandardMaterial color="#f4f2ec" roughness={0.7} side={DoubleSide} />
              </mesh>
            ))}
          </group>
        ))}
        <mesh position={[0, 5.4, 0]} castShadow>
          <coneGeometry args={[5.2, 4.6, 4]} />
          <meshStandardMaterial color="#b23a34" roughness={0.6} />
        </mesh>
        <group position={[0, 7.4, 0]}><Finial height={5} /></group>
      </group>

      {/* entrance: stone portal, glass canopy, flanking guardian pedestals */}
      <group position={[0, 0, d / 2 + 4.6]}>
        <mesh position={[0, 0.7 + wall * 0.55, 0]} castShadow>
          <boxGeometry args={[8.5, wall * 1.1, 1.2]} />
          <meshStandardMaterial color="#7d6a63" roughness={0.85} />
        </mesh>
        <mesh position={[0, 0.7 + 2.6, 0.1]}>
          <boxGeometry args={[4.6, 5.2, 0.4]} />
          <meshStandardMaterial color="#2f3a40" roughness={0.3} metalness={0.4} />
        </mesh>
        <mesh position={[0, 0.7 + 5.6, 1.9]} castShadow>
          <boxGeometry args={[9, 0.22, 4.2]} />
          <meshStandardMaterial color="#a9c6d4" transparent opacity={0.55} roughness={0.15} metalness={0.5} />
        </mesh>
        {[-1, 1].map((s) => (
          <group key={s} position={[s * 6.2, 0.7, 1.6]}>
            <mesh position={[0, 0.6, 0]} castShadow>
              <boxGeometry args={[1.2, 1.2, 1.2]} />
              <meshStandardMaterial color="#8d8078" roughness={0.9} />
            </mesh>
            <mesh position={[0, 1.9, 0]} castShadow>
              <capsuleGeometry args={[0.42, 1.1, 4, 8]} />
              <meshStandardMaterial color="#9a8d84" roughness={0.9} />
            </mesh>
          </group>
        ))}
        {/* steps down to the plaza */}
        {[0, 1, 2].map((i) => (
          <mesh key={i} position={[0, 0.55 - i * 0.18, 2.4 + i * 0.9]} receiveShadow>
            <boxGeometry args={[12 + i * 1.5, 0.2, 1.1]} />
            <meshStandardMaterial color="#b9b4ab" roughness={1} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

/**
 * A **teaching block** — the long white buildings with red hipped roofs, a
 * central pediment and stair tower.
 */
export function TeachingBlock({
  w = 84, d = 15, floors = 4, position = [0, 0, 0] as [number, number, number], rotation = 0, tower = true,
}) {
  const fh = 3.5;
  const h = floors * fh;
  const facade = useMemo(() => facadeTexture(floors, Math.round(w / 5)), [floors, w]);
  const facadeEnd = useMemo(() => facadeTexture(floors, Math.max(2, Math.round(d / 5))), [floors, d]);
  const roofTex = useMemo(() => roofTexture("#b23a34", 40, [10, 3]), []);
  const roofGeo = useMemo(() => hippedRoofGeometry(w, d, 4.2, 1.4), [w, d]);
  const gable = useMemo(() => gableGeometry(9, 3.2), []);

  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh position={[0, 0.25, 0]} receiveShadow>
        <boxGeometry args={[w + 2.4, 0.5, d + 2.4]} />
        <meshStandardMaterial color="#cfcbc2" roughness={1} />
      </mesh>
      {/* body: long faces carry the window bands, ends a narrower band */}
      <mesh position={[0, 0.5 + h / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial map={facade} roughness={0.85} />
      </mesh>
      <mesh position={[0, 0.5 + h / 2, 0]} castShadow>
        <boxGeometry args={[w - 0.1, h, d + 0.02]} />
        <meshStandardMaterial map={facadeEnd} roughness={0.85} transparent opacity={0} />
      </mesh>
      {/* eave band + hipped roof */}
      <mesh position={[0, 0.5 + h + 0.25, 0]} castShadow>
        <boxGeometry args={[w + 2.8, 0.5, d + 2.8]} />
        <meshStandardMaterial color="#f6f4ee" roughness={0.75} />
      </mesh>
      <mesh geometry={roofGeo} position={[0, 0.5 + h + 0.5, 0]} castShadow receiveShadow>
        <meshStandardMaterial map={roofTex} roughness={0.62} side={DoubleSide} />
      </mesh>

      {/* central pediment + stair tower */}
      {tower && (
        <group position={[0, 0, d / 2]}>
          <mesh position={[0, 0.5 + h * 0.5, 0.5]} castShadow>
            <boxGeometry args={[11, h + 1.6, 1.6]} />
            <meshStandardMaterial color="#f4f2ec" roughness={0.8} />
          </mesh>
          <mesh geometry={gable} position={[0, 0.5 + h + 1.6, 1.35]} castShadow>
            <meshStandardMaterial color="#f4f2ec" roughness={0.75} side={DoubleSide} />
          </mesh>
          <mesh position={[0, 0.5 + h * 0.72, 1.4]}>
            <circleGeometry args={[1.15, 20]} />
            <meshStandardMaterial color="#d8b24a" roughness={0.5} metalness={0.35} />
          </mesh>
        </group>
      )}
    </group>
  );
}

/**
 * The **entrance monument**: gold NUM lettering on a dark plinth, on its curved
 * flight of steps between clipped hedges.
 */
export function EntranceMonument({ position = [0, 0, 0] as [number, number, number], rotation = 0 }) {
  const sign = useMemo(() => signTexture("NUM", "INTERNATIONAL CAMPUS", { fg: "#c8a13c", sub: "#f2f0ea", bg: "#2f3338" }), []);
  const hedge = useMemo(() => hedgeTexture(), []);
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* curved steps */}
      {[0, 1, 2].map((i) => (
        <mesh key={i} position={[0, 0.16 + i * 0.22, 3.4 - i * 0.9]} receiveShadow castShadow>
          <cylinderGeometry args={[9 - i * 1.4, 9 - i * 1.4, 0.22, 28, 1, false, Math.PI * 0.15, Math.PI * 0.7]} />
          <meshStandardMaterial color="#9d6a58" roughness={1} />
        </mesh>
      ))}
      {/* plinth + lettering */}
      <mesh position={[0, 1.2, 0]} castShadow receiveShadow>
        <boxGeometry args={[11.5, 2.4, 1.1]} />
        <meshStandardMaterial color="#2f3338" roughness={0.6} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[0, 1.2, s * 0.57]} rotation={[0, s > 0 ? 0 : Math.PI, 0]}>
          <planeGeometry args={[11, 2.2]} />
          <meshStandardMaterial map={sign} roughness={0.45} metalness={0.25} />
        </mesh>
      ))}
      {/* hedges either side */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 9.5, 0.75, 1.4]} castShadow receiveShadow>
          <boxGeometry args={[6.5, 1.5, 3.2]} />
          <meshStandardMaterial map={hedge} roughness={0.95} />
        </mesh>
      ))}
    </group>
  );
}

/** The small white Khmer shrine standing in the plaza. */
export function Shrine({ position = [0, 0, 0] as [number, number, number] }) {
  const tiers = 5;
  return (
    <group position={position}>
      <mesh position={[0, 0.25, 0]} receiveShadow castShadow>
        <boxGeometry args={[4.6, 0.5, 4.6]} />
        <meshStandardMaterial color="#e9e6de" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.75, 0]} receiveShadow castShadow>
        <boxGeometry args={[3.4, 0.5, 3.4]} />
        <meshStandardMaterial color="#f2efe7" roughness={0.9} />
      </mesh>
      {[-1, 1].map((sx) => [-1, 1].map((sz) => (
        <mesh key={`${sx}${sz}`} position={[sx * 1.2, 2.2, sz * 1.2]} castShadow>
          <boxGeometry args={[0.28, 2.4, 0.28]} />
          <meshStandardMaterial color="#f4f2ec" roughness={0.8} />
        </mesh>
      )))}
      <mesh position={[0, 3.5, 0]} castShadow>
        <boxGeometry args={[3.2, 0.35, 3.2]} />
        <meshStandardMaterial color="#f4f2ec" roughness={0.8} />
      </mesh>
      {/* tiered spire */}
      {Array.from({ length: tiers }).map((_, i) => {
        const t = i / tiers;
        return (
          <mesh key={i} position={[0, 3.9 + i * 0.62, 0]} castShadow>
            <boxGeometry args={[2.7 - t * 1.9, 0.45, 2.7 - t * 1.9]} />
            <meshStandardMaterial color={i % 2 ? "#d8792f" : "#f4f2ec"} roughness={0.75} />
          </mesh>
        );
      })}
      <group position={[0, 3.9 + tiers * 0.62, 0]}><Finial height={2.6} /></group>
    </group>
  );
}

/** A long parking canopy — a single white shed roof on slim posts. */
export function ParkingCanopy({
  length = 60, width = 11, height = 4.2, position = [0, 0, 0] as [number, number, number], rotation = 0,
}) {
  const posts = Math.max(3, Math.round(length / 9));
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {Array.from({ length: posts }).map((_, i) => (
        <mesh key={i} position={[(i / (posts - 1) - 0.5) * (length - 4), height / 2, 0]} castShadow>
          <boxGeometry args={[0.3, height, 0.3]} />
          <meshStandardMaterial color="#d9d7d1" roughness={0.7} />
        </mesh>
      ))}
      <mesh position={[0, height + 0.2, 0]} rotation={[0.06, 0, 0]} castShadow receiveShadow>
        <boxGeometry args={[length, 0.25, width]} />
        <meshStandardMaterial color="#f4f4f1" roughness={0.55} metalness={0.15} />
      </mesh>
    </group>
  );
}

/** The athletics track and its infield. */
export function SportsField({
  position = [0, 0, 0] as [number, number, number], rx = 46, rz = 30,
}) {
  return (
    <group position={position}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]} receiveShadow>
        <ringGeometry args={[Math.min(rx, rz) * 0.72, Math.min(rx, rz), 48]} />
        <meshStandardMaterial color="#b0503a" roughness={1} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.015, 0]} receiveShadow>
        <circleGeometry args={[Math.min(rx, rz) * 0.73, 40]} />
        <meshStandardMaterial color="#5f8f42" roughness={1} />
      </mesh>
      {/* goals */}
      {[-1, 1].map((s) => (
        <group key={s} position={[0, 0, s * Math.min(rx, rz) * 0.55]}>
          <mesh position={[0, 1.2, 0]}>
            <boxGeometry args={[7.4, 0.16, 0.16]} />
            <meshStandardMaterial color="#eceae4" roughness={0.8} />
          </mesh>
          {[-3.6, 3.6].map((x) => (
            <mesh key={x} position={[x, 0.6, 0]}>
              <boxGeometry args={[0.16, 1.2, 0.16]} />
              <meshStandardMaterial color="#eceae4" roughness={0.8} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

/* ------------------------------------------------- instanced site props --- */

type Placement = { pos: [number, number, number]; rot?: number; scale?: number };

/** Many identical props in a single draw call (bollards, lamps, kerbs, houses). */
export function Props({
  items, children,
}: {
  items: Placement[];
  children: React.ReactNode;
}) {
  const ref = useRef<InstancedMesh>(null);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const m = new Matrix4();
    const q = new Quaternion();
    const p = new Vector3();
    const s = new Vector3();
    items.forEach((it, i) => {
      p.set(it.pos[0], it.pos[1], it.pos[2]);
      q.setFromAxisAngle(new Vector3(0, 1, 0), it.rot ?? 0);
      const sc = it.scale ?? 1;
      s.set(sc, sc, sc);
      m.compose(p, q, s);
      mesh.setMatrixAt(i, m);
    });
    mesh.instanceMatrix.needsUpdate = true;
  }, [items]);
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, Math.max(1, items.length)]} castShadow receiveShadow>
      {children}
    </instancedMesh>
  );
}

/** A paved area (plaza, road, car park). */
export function Paving({
  w, d, position = [0, 0, 0] as [number, number, number], rotation = 0, kind = "pave" as "pave" | "road",
  repeat,
}: {
  w: number; d: number; position?: [number, number, number]; rotation?: number;
  kind?: "pave" | "road"; repeat?: number;
}) {
  const t = useMemo(
    () => (kind === "pave" ? paveTexture(repeat ?? Math.round(Math.max(w, d) / 4)) : roofTexture("#8d8d88", 2, [1, 1])),
    [kind, w, d, repeat],
  );
  return (
    <mesh rotation={[-Math.PI / 2, 0, rotation]} position={position} receiveShadow>
      <planeGeometry args={[w, d]} />
      <meshStandardMaterial map={t} roughness={1} color={kind === "road" ? "#9a9a95" : "#ffffff"} />
    </mesh>
  );
}
