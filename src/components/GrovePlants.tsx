import { useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
  BufferGeometry, Color, CylinderGeometry, DoubleSide, Float32BufferAttribute,
  Euler, Group, IcosahedronGeometry, InstancedMesh, Matrix4, Quaternion, Vector3,
} from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { barkTexture } from "../lib/groundTexture";

/**
 * Procedurally grown plants for the Grove Garden.
 *
 * Every plant is generated from its species and its measured growth stage — a
 * recursively branched skeleton merged into a single mesh, a canopy of instanced
 * leaf clumps, folded-ribbon fronds for palms and bananas. All of it is built at
 * runtime from primitives: no model files, no textures to download, and a whole
 * tree costs about three draw calls, so a plot still runs on a low-end phone.
 *
 * Generation is seeded, so a given plant looks the same on every device and
 * every reload — but no two trees in a garden are identical.
 */

/* ------------------------------------------------------------------ util --- */

/** Deterministic PRNG — same tree, every device, every reload. */
function rng(seed: number) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let x = Math.imul(t ^ (t >>> 15), 1 | t);
    x ^= x + Math.imul(x ^ (x >>> 7), 61 | x);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

const UP = new Vector3(0, 1, 0);

/**
 * A folded ribbon along a curve — the shape of a palm frond or a banana leaf.
 * Each rib gets a raised centre so the blade reads as a V-section catching light
 * on one side, not a flat card.
 */
function ribbonGeometry(points: Vector3[], halfWidths: number[], fold = 0.35): BufferGeometry {
  const pos: number[] = [];
  const idx: number[] = [];
  const n = points.length;
  const side = new Vector3();
  const tangent = new Vector3();
  const normal = new Vector3();

  for (let i = 0; i < n; i++) {
    const p = points[i];
    const a = points[Math.max(0, i - 1)];
    const b = points[Math.min(n - 1, i + 1)];
    tangent.subVectors(b, a).normalize();
    side.crossVectors(tangent, UP);
    if (side.lengthSq() < 1e-6) side.set(1, 0, 0);
    side.normalize();
    normal.crossVectors(side, tangent).normalize();
    const w = halfWidths[i];
    pos.push(p.x - side.x * w, p.y - side.y * w, p.z - side.z * w);
    pos.push(p.x + normal.x * w * fold, p.y + normal.y * w * fold, p.z + normal.z * w * fold);
    pos.push(p.x + side.x * w, p.y + side.y * w, p.z + side.z * w);
  }
  for (let i = 0; i < n - 1; i++) {
    const r = i * 3;
    const s = (i + 1) * 3;
    idx.push(r, s, r + 1, r + 1, s, s + 1); // left half
    idx.push(r + 1, s + 1, r + 2, r + 2, s + 1, s + 2); // right half
  }
  const g = new BufferGeometry();
  g.setAttribute("position", new Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/* ------------------------------------------------------- branch skeleton --- */

export interface TreeShape {
  /** How wide branches swing away from their parent (radians). */
  spread: number;
  /** Branch generations below the trunk. More = denser, costlier. */
  levels: number;
  /** Children per branch. */
  children: number;
  /** Trunk height as a fraction of the whole tree. */
  trunkFrac: number;
  /** Trunk radius multiplier. */
  girth: number;
  /** Leaf-clump radius multiplier. */
  clump: number;
}

interface Tip { pos: Vector3; scale: number }

/**
 * Grow a branch skeleton: tapered limbs merged into one geometry, plus the tip
 * positions where the canopy hangs. Recursion is bounded by `levels`.
 */
function buildTree(shape: TreeShape, height: number, seed: number) {
  const rand = rng(seed);
  const limbs: BufferGeometry[] = [];
  const tips: Tip[] = [];

  const grow = (
    origin: Vector3, dir: Vector3, len: number, r0: number, depth: number,
  ) => {
    const end = origin.clone().addScaledVector(dir, len);
    const r1 = r0 * (depth === 0 ? 0.35 : 0.62);

    // One tapered limb, oriented along `dir`.
    const g = new CylinderGeometry(r1, r0, len, depth > shape.levels - 2 ? 7 : 5, 1);
    g.translate(0, len / 2, 0);
    const q = new Quaternion().setFromUnitVectors(UP, dir);
    g.applyQuaternion(q);
    g.translate(origin.x, origin.y, origin.z);
    limbs.push(g);

    if (depth <= 0) {
      tips.push({ pos: end, scale: 0.85 + rand() * 0.5 });
      return;
    }

    // Children fan around the parent, tilted out by `spread` with some jitter.
    const kids = Math.max(2, Math.round(shape.children + (rand() - 0.5)));
    const roll = rand() * Math.PI * 2;
    for (let i = 0; i < kids; i++) {
      const az = roll + (i / kids) * Math.PI * 2 + (rand() - 0.5) * 0.7;
      const tilt = shape.spread * (0.65 + rand() * 0.7);
      // Rotate `dir` out by `tilt` around an axis perpendicular to it.
      const axis = new Vector3(Math.cos(az), 0, Math.sin(az)).cross(dir).normalize();
      const nd = dir.clone().applyAxisAngle(axis.lengthSq() < 1e-6 ? UP : axis, tilt).normalize();
      // Branches keep some upward bias — real limbs reach for the light.
      nd.y += 0.18;
      nd.normalize();
      grow(end, nd, len * (0.62 + rand() * 0.16), r1, depth - 1);
    }
  };

  const trunkLen = height * shape.trunkFrac;
  const trunkDir = new Vector3((rand() - 0.5) * 0.06, 1, (rand() - 0.5) * 0.06).normalize();
  grow(new Vector3(0, 0, 0), trunkDir, trunkLen, height * 0.032 * shape.girth, shape.levels);

  const geometry = mergeGeometries(limbs, false) ?? new BufferGeometry();
  limbs.forEach((g) => g.dispose());
  return { geometry, tips };
}

/* ------------------------------------------------------------- the canopy --- */

/** Leaf clumps as instanced blobs — one draw call for a whole crown. */
function Canopy({
  tips, radius, colorA, colorB, seed, detail = 1, flatten = 1,
}: {
  tips: Tip[]; radius: number; colorA: string; colorB: string; seed: number;
  detail?: number; flatten?: number;
}) {
  const ref = useRef<InstancedMesh>(null);
  // detail 1 rounds the clumps into real foliage masses; detail 0 is the cheap
  // faceted fallback for a low-end phone.
  const geo = useMemo(() => new IcosahedronGeometry(1, detail), [detail]);

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const rand = rng(seed + 99);
    const m = new Matrix4();
    const q = new Quaternion();
    const e = new Euler();
    const s = new Vector3();
    const a = new Color(colorA);
    const b = new Color(colorB);
    const c = new Color();
    tips.forEach((tip, i) => {
      q.setFromEuler(e.set(rand() * 3, rand() * 3, rand() * 3));
      const r = radius * tip.scale;
      s.set(r * (0.8 + rand() * 0.5), r * flatten * (0.8 + rand() * 0.4), r * (0.8 + rand() * 0.5));
      m.compose(tip.pos, q, s);
      mesh.setMatrixAt(i, m);
      c.copy(a).lerp(b, rand());
      mesh.setColorAt(i, c);
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [tips, radius, colorA, colorB, seed, flatten]);

  return (
    <instancedMesh ref={ref} args={[geo, undefined, Math.max(1, tips.length)]} castShadow receiveShadow>
      <meshStandardMaterial roughness={0.9} flatShading={detail === 0} />
    </instancedMesh>
  );
}

/** Fruit as one instanced batch — a tree's whole crop costs a single draw call. */
function Fruits({
  at, radius, color, stretch = 1,
}: {
  at: Vector3[]; radius: number; color: string; stretch?: number;
}) {
  const ref = useRef<InstancedMesh>(null);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh || !at.length) return;
    const m = new Matrix4();
    const q = new Quaternion();
    const s = new Vector3(1, stretch, 1);
    at.forEach((p, i) => {
      m.compose(p, q, s);
      mesh.setMatrixAt(i, m);
    });
    mesh.instanceMatrix.needsUpdate = true;
  }, [at, stretch]);
  if (!at.length) return null;
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, at.length]} castShadow>
      <sphereGeometry args={[radius, 8, 8]} />
      <meshStandardMaterial color={color} roughness={0.6} />
    </instancedMesh>
  );
}

/**
 * Merge a plant's blades into one geometry per colour — a palm crown goes from
 * nine draw calls to two, which is what keeps this affordable on a cheap phone.
 */
function mergedBlades(
  count: number, seed: number,
  blade: (i: number) => { geo: BufferGeometry; pitch: number; az: number },
): [BufferGeometry | null, BufferGeometry | null] {
  const groups: BufferGeometry[][] = [[], []];
  for (let i = 0; i < count; i++) {
    const { geo, pitch, az } = blade(i);
    const g = geo.clone();
    geo.dispose();
    const q = new Quaternion().setFromEuler(new Euler(pitch, -az, 0));
    g.applyQuaternion(q);
    groups[i % 2].push(g);
  }
  const out = groups.map((set) => {
    if (!set.length) return null;
    const merged = mergeGeometries(set, false);
    set.forEach((g) => g.dispose());
    return merged;
  });
  void seed;
  return [out[0], out[1]];
}

const palmPitch = (i: number) => 0.35 + (i % 3) * 0.22;
const bananaPitch = (i: number) => -0.25 + (i % 3) * 0.3;
const papayaPitch = (i: number) => 0.15 + (i % 3) * 0.2;
const seedlingPitch = () => 0.5;

/** Where a palm's coconuts and a papaya's fruit sit, given the plant's height. */
const coconutAt = (h: number) =>
  [0, 1, 2, 3].map((i) => new Vector3(Math.cos(i * 1.9) * h * 0.03, -h * 0.02, Math.sin(i * 1.9) * h * 0.03));
const papayaFruitAt = (h: number) =>
  Array.from({ length: 6 }, (_, i) => {
    const a = (i / 6) * Math.PI * 2;
    return new Vector3(Math.cos(a) * h * 0.045, h * (0.72 + (i % 2) * 0.06), Math.sin(a) * h * 0.045);
  });

/* --------------------------------------------------------------- species --- */

export interface PlantLook {
  form: "broadleaf" | "palm" | "banana" | "papaya";
  leaf: string;
  leaf2: string;
  bark: string;
  shape?: TreeShape;
  fruit?: { color: string; size: number; where: "canopy" | "trunk"; count: number };
}

/** Gentle wind — the whole plant leans and recovers, phase-offset per plant. */
function useWind(ref: React.RefObject<Group | null>, amount: number, seed: number) {
  useFrame(({ clock }) => {
    const g = ref.current;
    if (!g || amount <= 0) return;
    const t = clock.elapsedTime;
    const p = seed * 1.7;
    g.rotation.z = Math.sin(t * 0.7 + p) * amount + Math.sin(t * 1.9 + p) * amount * 0.3;
    g.rotation.x = Math.cos(t * 0.55 + p) * amount * 0.6;
  });
}

export function BroadleafPlant({
  look, height, seed, opacity, wind, detail = 1,
}: {
  look: PlantLook; height: number; seed: number; opacity: number; wind: number; detail?: number;
}) {
  const ref = useRef<Group>(null);
  useWind(ref, wind * 0.012, seed);
  const shape = look.shape!;
  const { geometry, tips } = useMemo(() => buildTree(shape, height, seed), [shape, height, seed]);
  const bark = useMemo(() => barkTexture(look.bark), [look.bark]);
  const clumpR = height * 0.1 * shape.clump;

  const fruit = look.fruit;
  const fruitAt = useMemo(() => {
    if (!fruit) return [] as Vector3[];
    const rand = rng(seed + 5);
    const out: Vector3[] = [];
    for (let i = 0; i < fruit.count; i++) {
      if (fruit.where === "trunk") {
        // Cauliflory — jackfruit hangs its fruit straight off the trunk.
        const a = rand() * Math.PI * 2;
        const r = height * 0.028 * shape.girth;
        out.push(new Vector3(Math.cos(a) * r, height * (0.12 + rand() * 0.3), Math.sin(a) * r));
      } else if (tips.length) {
        const t = tips[(rand() * tips.length) | 0];
        out.push(t.pos.clone().add(new Vector3((rand() - 0.5) * clumpR, -clumpR * 0.5, (rand() - 0.5) * clumpR)));
      }
    }
    return out;
  }, [fruit, tips, seed, height, shape.girth, clumpR]);

  return (
    <group ref={ref}>
      <mesh geometry={geometry} castShadow receiveShadow>
        <meshStandardMaterial map={bark} roughness={0.95} transparent={opacity < 1} opacity={opacity} />
      </mesh>
      <Canopy tips={tips} radius={clumpR} colorA={look.leaf} colorB={look.leaf2} seed={seed} detail={detail} />
      {fruit && (
        <Fruits
          at={fruitAt} radius={fruit.size * height * 0.06} color={fruit.color}
          stretch={fruit.where === "trunk" ? 1.45 : 1}
        />
      )}
    </group>
  );
}

/** Geometry for one arching blade — a folded ribbon along a rising, drooping curve. */
function bladeGeometry(length: number, width: number, droop: number, taper = 0.25): BufferGeometry {
  const n = 8;
  const pts: Vector3[] = [];
  const widths: number[] = [];
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    pts.push(new Vector3(0, Math.sin(t * 1.1) * length * 0.28 - droop * t * t * length, t * length));
    widths.push(width * (1 - taper * t) * Math.sin(Math.min(1, 0.25 + t * 1.6) * Math.PI * 0.5));
  }
  return ribbonGeometry(pts, widths, 0.5);
}

/** A crown of blades, merged down to two draw calls (one per leaf tone). */
function Crown({
  count, length, width, droop, taper, seed, leaf, leaf2, opacity, pitch,
}: {
  count: number; length: number; width: number; droop: number; taper?: number;
  seed: number; leaf: string; leaf2: string; opacity: number; pitch: (i: number) => number;
}) {
  const [a, b] = useMemo(
    () => mergedBlades(count, seed, (i) => ({
      geo: bladeGeometry(length, width, droop, taper),
      pitch: pitch(i),
      az: (i / count) * Math.PI * 2 + seed,
    })),
    [count, length, width, droop, taper, seed, pitch],
  );
  return (
    <>
      {[a, b].map((g, i) => g && (
        <mesh key={i} geometry={g} castShadow>
          <meshStandardMaterial
            color={i ? leaf2 : leaf} roughness={0.8} side={DoubleSide}
            transparent={opacity < 1} opacity={opacity} flatShading
          />
        </mesh>
      ))}
    </>
  );
}

export function PalmPlant({
  look, height, seed, opacity, wind,
}: {
  look: PlantLook; height: number; seed: number; opacity: number; wind: number;
}) {
  const ref = useRef<Group>(null);
  useWind(ref, wind * 0.008, seed);
  const rand = useMemo(() => rng(seed), [seed]);
  const bark = useMemo(() => barkTexture(look.bark), [look.bark]);

  // A palm leans; its trunk is a stack of slightly offset rings.
  const trunk = useMemo(() => {
    const segs = 8;
    const parts: BufferGeometry[] = [];
    const lean = (rand() - 0.5) * height * 0.1;
    const pts: Vector3[] = [];
    for (let i = 0; i < segs; i++) {
      const t = i / (segs - 1);
      pts.push(new Vector3(lean * t * t, t * height, 0));
    }
    for (let i = 0; i < segs - 1; i++) {
      const a = pts[i];
      const b = pts[i + 1];
      const len = a.distanceTo(b);
      const r = height * 0.026 * (1 - 0.35 * (i / segs));
      const g = new CylinderGeometry(r * 0.94, r, len * 1.06, 8, 1);
      g.translate(0, len / 2, 0);
      g.applyQuaternion(new Quaternion().setFromUnitVectors(UP, b.clone().sub(a).normalize()));
      g.translate(a.x, a.y, a.z);
      parts.push(g);
    }
    const merged = mergeGeometries(parts, false) ?? new BufferGeometry();
    parts.forEach((g) => g.dispose());
    return { geometry: merged, crown: pts[segs - 1] };
  }, [height, rand]);

  const fronds = 9;
  return (
    <group ref={ref}>
      <mesh geometry={trunk.geometry} castShadow receiveShadow>
        <meshStandardMaterial map={bark} roughness={0.95} transparent={opacity < 1} opacity={opacity} />
      </mesh>
      <group position={trunk.crown}>
        <Crown
          count={fronds} length={height * 0.5} width={height * 0.055} droop={0.75}
          seed={seed} leaf={look.leaf} leaf2={look.leaf2} opacity={opacity}
          pitch={palmPitch}
        />
        {/* coconuts nestled under the crown */}
        <Fruits at={coconutAt(height)} radius={height * 0.022} color="#7a5a2a" />
      </group>
    </group>
  );
}

export function BananaPlant({
  look, height, seed, opacity, wind,
}: {
  look: PlantLook; height: number; seed: number; opacity: number; wind: number;
}) {
  const ref = useRef<Group>(null);
  useWind(ref, wind * 0.016, seed);
  const leaves = 7;
  return (
    <group ref={ref}>
      {/* pseudostem — sheathed leaf bases, not wood */}
      <mesh position={[0, height * 0.32, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[height * 0.045, height * 0.07, height * 0.64, 9]} />
        <meshStandardMaterial color={look.bark} roughness={0.85} transparent={opacity < 1} opacity={opacity} />
      </mesh>
      <group position={[0, height * 0.62, 0]}>
        <Crown
          count={leaves} length={height * 0.62} width={height * 0.17} droop={0.55} taper={0.1}
          seed={seed} leaf={look.leaf} leaf2={look.leaf2} opacity={opacity}
          pitch={bananaPitch}
        />
      </group>
    </group>
  );
}

export function PapayaPlant({
  look, height, seed, opacity, wind,
}: {
  look: PlantLook; height: number; seed: number; opacity: number; wind: number;
}) {
  const ref = useRef<Group>(null);
  useWind(ref, wind * 0.01, seed);
  const leaves = 8;
  return (
    <group ref={ref}>
      <mesh position={[0, height * 0.45, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[height * 0.025, height * 0.045, height * 0.9, 9]} />
        <meshStandardMaterial color={look.bark} roughness={0.9} transparent={opacity < 1} opacity={opacity} />
      </mesh>
      {/* fruit clustered tight against the stem, just under the crown */}
      <Fruits at={papayaFruitAt(height)} radius={height * 0.036} color="#c9b23a" stretch={1.3} />
      <group position={[0, height * 0.9, 0]}>
        <Crown
          count={leaves} length={height * 0.34} width={height * 0.13} droop={0.9} taper={-0.15}
          seed={seed} leaf={look.leaf} leaf2={look.leaf2} opacity={opacity}
          pitch={papayaPitch}
        />
      </group>
    </group>
  );
}

/** A young plant that hasn't made a trunk yet — a few leaves out of the soil. */
export function Seedling({ look, height, seed, opacity }: { look: PlantLook; height: number; seed: number; opacity: number }) {
  const n = 5;
  return (
    <group>
      <mesh position={[0, height * 0.3, 0]} castShadow>
        <cylinderGeometry args={[height * 0.03, height * 0.05, height * 0.6, 6]} />
        <meshStandardMaterial color={look.bark} roughness={0.9} transparent={opacity < 1} opacity={opacity} />
      </mesh>
      <group position={[0, height * 0.55, 0]}>
        <Crown
          count={n} length={height * 0.4} width={height * 0.1} droop={0.3}
          seed={seed} leaf={look.leaf} leaf2={look.leaf2} opacity={opacity}
          pitch={seedlingPitch}
        />
      </group>
    </group>
  );
}
