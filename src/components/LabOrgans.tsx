import { useMemo } from "react";
import {
  BufferGeometry, CatmullRomCurve3, DoubleSide, SphereGeometry, TubeGeometry, Vector3,
} from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { LabLayer } from "../lab";

/**
 * Procedural anatomy for the 🔬 Learning Lab.
 *
 * Organs are soft, lumpy and continuous — the opposite of the rectilinear
 * architecture elsewhere in this repo — so the vocabulary is different: a
 * displaced sphere for a mass, a swept tube for a vessel or an airway, and
 * recursion for anything that branches.
 *
 * **Nothing here is traced from a scan or an atlas figure.** Every form is
 * written from anatomical description, which is why it can ship under an open
 * licence, and why it is honest to call these schematic teaching models rather
 * than anatomy. Proportions and topology are right; surface detail is not.
 *
 * Units: **1 unit ≈ 1 cm**, so an adult heart is about 12 units tall. Keeping
 * organs at centimetre scale (rather than metres, like the buildings) means the
 * numbers in these functions read as the measurements they are.
 */

/* -------------------------------------------------------------- palette --- */

export const ORGAN = {
  /** Heart muscle: dark, brownish red. Not the pillar-box red of a diagram. */
  myocardium: "#9c3a34",
  /** Oxygen-rich blood: bright red. The didactic convention, kept on purpose. */
  artery: "#c0392b",
  /** Oxygen-poor blood: blue-purple. Also convention — real veins are dark red. */
  vein: "#5566a6",
  chamberOxy: "#d05a4e",
  chamberDeoxy: "#6e7fbe",
  lung: "#c98f92",
  lungDeep: "#a86e74",
  airway: "#e6dcc8",
  fat: "#e0c98a",
} as const;

/* ------------------------------------------------------------- geometry --- */

/** Deterministic value noise — no Math.random, so a render is reproducible. */
function wobble(seed: number, a: number, b: number, c: number): number {
  const s = Math.sin(a * 1.7 + seed * 12.9898) * Math.sin(b * 2.3 + seed * 4.1414)
    * Math.sin(c * 1.3 + seed * 7.233);
  return s;
}

type BlobOpts = {
  /** Radii along x, y, z, in units. */
  r: [number, number, number];
  /** How much the bottom converges — 1 keeps it round, 0.1 draws it to a point. */
  taper?: number;
  /** Sideways drift of the bottom, for an organ that leans (the heart's apex). */
  lean?: number;
  /** Depth of the surface lumpiness, as a fraction of radius. */
  lumps?: number;
  seed?: number;
  /** Segment counts. Normal mode halves these; see `detail`. */
  seg?: number;
  /**
   * Carve a scoop out of one side — the left lung's cardiac notch. Given as
   * centre (unit-sphere space), radius and depth.
   */
  notch?: { at: [number, number, number]; radius: number; depth: number };
  /** Flatten one face, for the lung surface that lies against the mediastinum. */
  flatten?: { axis: "x" | "z"; sign: 1 | -1; amount: number };
};

/**
 * An organic mass: a sphere pushed around until it stops looking like a sphere.
 *
 * A soft organ has no flat faces and no seams, so it starts from the one
 * primitive that has neither, and every characteristic — the heart's apex, the
 * lung's notch — is applied as a displacement rather than modelled as its own
 * piece. That keeps the whole organ a single watertight mesh, which is one draw
 * call and behaves properly when it is made translucent.
 */
export function organBlob(o: BlobOpts): BufferGeometry {
  const seg = o.seg ?? 32;
  const g = new SphereGeometry(1, seg, Math.max(8, Math.round(seg * 0.75)));
  const pos = g.attributes.position;
  const taper = o.taper ?? 1;
  const lumps = o.lumps ?? 0.06;
  const seed = o.seed ?? 1;
  const v = new Vector3();

  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const t = (v.y + 1) / 2;                       // 0 at the bottom, 1 at the top

    // taper: squeeze the lower half toward a point, easing so the join is smooth
    const e = t * t * (3 - 2 * t);                 // smoothstep
    const s = taper + (1 - taper) * e;
    v.x *= s; v.z *= s;

    // lean: slide the bottom sideways, which is what gives the heart its tilt
    if (o.lean) v.x += o.lean * (1 - e);

    // surface lumpiness, low frequency so it reads as tissue not as noise
    const w = 1 + lumps * wobble(seed, v.x * 2.1, v.y * 1.8, v.z * 2.4);
    v.multiplyScalar(w);

    if (o.flatten) {
      const comp = o.flatten.axis === "x" ? v.x : v.z;
      const facing = comp * o.flatten.sign;
      if (facing > 0) {
        const k = 1 - o.flatten.amount * facing;
        if (o.flatten.axis === "x") v.x *= k; else v.z *= k;
      }
    }

    if (o.notch) {
      const c = new Vector3(...o.notch.at);
      const d = v.distanceTo(c);
      if (d < o.notch.radius) {
        const bite = (1 - d / o.notch.radius) ** 2 * o.notch.depth;
        v.addScaledVector(v.clone().sub(c).normalize(), -bite);
      }
    }

    pos.setXYZ(i, v.x * o.r[0], v.y * o.r[1], v.z * o.r[2]);
  }
  g.computeVertexNormals();
  return g;
}

/** A vessel or airway: a tube swept along a smooth curve through the points. */
export function vessel(
  points: [number, number, number][], radius: number, seg = 12, radial = 10,
): BufferGeometry {
  const curve = new CatmullRomCurve3(points.map((p) => new Vector3(...p)));
  return new TubeGeometry(curve, seg, radius, radial, false);
}

/**
 * A branching tree of tubes — the bronchial tree, and the same recursion that
 * would draw a vascular bed.
 *
 * Real airways branch about twenty times. Twenty is around a million tubes,
 * which is not going on a $150 phone, so this stops at `levels` and the
 * specimen page says plainly that it is showing the first few generations.
 */
export function branchTree(o: {
  from: [number, number, number];
  dir: [number, number, number];
  length: number;
  radius: number;
  levels: number;
  /** Radians each child turns away from its parent. */
  spread?: number;
  /** Sideways drift so the tree fills a volume instead of staying planar. */
  twist?: number;
  seed?: number;
}): BufferGeometry {
  const parts: BufferGeometry[] = [];
  const spread = o.spread ?? 0.55;
  const twist = o.twist ?? 0.9;
  const seed = o.seed ?? 3;

  const grow = (
    from: Vector3, dir: Vector3, length: number, radius: number, level: number, n: number,
  ) => {
    if (level <= 0 || radius < 0.045) return;
    const mid = from.clone().addScaledVector(dir, length * 0.5);
    // a slight sag in the middle, so a branch is not a straight rod
    mid.y -= length * 0.06;
    const end = from.clone().addScaledVector(dir, length);
    const radial = level > 2 ? 8 : 5;
    parts.push(vessel(
      [[from.x, from.y, from.z], [mid.x, mid.y, mid.z], [end.x, end.y, end.z]],
      radius, 4, radial,
    ));

    // two children, turned apart in a plane that itself rotates each level, so
    // the tree occupies a volume rather than a fan
    const up = Math.abs(dir.y) > 0.9 ? new Vector3(1, 0, 0) : new Vector3(0, 1, 0);
    const side = new Vector3().crossVectors(dir, up).normalize();
    const roll = twist * n + wobble(seed, n, level, 0.5);
    const axis = side.clone().applyAxisAngle(dir, roll);
    for (const s of [1, -1]) {
      const d = dir.clone().applyAxisAngle(axis, spread * s).normalize();
      d.y -= 0.06;                                   // airways trend downward
      grow(end, d.normalize(), length * 0.78, radius * 0.72, level - 1, n * 2 + (s > 0 ? 1 : 2));
    }
  };

  grow(new Vector3(...o.from), new Vector3(...o.dir).normalize(), o.length, o.radius, o.levels, 1);
  const merged = mergeGeometries(parts, false);
  return merged ?? new BufferGeometry();
}

/* ---------------------------------------------------------------- heart --- */

export type Detail = "normal" | "ultra";

/** Segment count per detail tier — Normal is the low-end-phone baseline. */
const SEG = { normal: 20, ultra: 40 } as const;

/**
 * The heart: a ventricular mass leaning to its apex, two atria sitting on top
 * of it, and the great vessels leaving in the directions they actually leave.
 *
 * The chambers are modelled as their own volumes rather than as cavities inside
 * a shell. A hollowed shell is the anatomically truer description, but it reads
 * as a dark hole the moment you make it translucent; separate volumes let a
 * student see four chambers and their relative wall thicknesses, which is the
 * thing being taught.
 */
export function Heart({
  layer = "whole", detail = "ultra", onPick, selected,
}: {
  layer?: LabLayer; detail?: Detail;
  onPick?: (partId: string) => void;
  selected?: string | null;
}) {
  const seg = SEG[detail];

  const ventricles = useMemo(() => organBlob({
    r: [4.6, 5.6, 4.2], taper: 0.16, lean: -0.55, lumps: 0.05, seed: 2, seg,
  }), [seg]);
  const atriumL = useMemo(() => organBlob({ r: [2.5, 2.1, 2.3], lumps: 0.1, seed: 5, seg }), [seg]);
  const atriumR = useMemo(() => organBlob({ r: [2.7, 2.2, 2.4], lumps: 0.1, seed: 8, seg }), [seg]);

  // chamber volumes, inside the muscle. The left ventricle's cavity is smaller
  // relative to its mass than the right's — that difference IS the lesson.
  const lv = useMemo(() => organBlob({ r: [1.9, 4.0, 2.0], taper: 0.2, lean: -0.35, seed: 11, seg }), [seg]);
  const rv = useMemo(() => organBlob({ r: [2.4, 3.6, 2.2], taper: 0.3, lean: 0.1, seed: 13, seg }), [seg]);
  const la = useMemo(() => organBlob({ r: [1.7, 1.4, 1.6], seed: 17, seg }), [seg]);
  const ra = useMemo(() => organBlob({ r: [1.9, 1.5, 1.7], seed: 19, seg }), [seg]);

  const aorta = useMemo(() => vessel([
    [-1.2, 2.6, 0.4], [-1.0, 5.4, 0.0], [-0.4, 7.8, -0.6],
    [1.6, 8.8, -1.2], [3.4, 7.6, -1.6], [3.6, 4.6, -2.0], [3.4, 1.0, -2.2],
  ], 1.05, 22, detail === "ultra" ? 14 : 8), [detail]);

  const pulmTrunk = useMemo(() => vessel([
    [1.4, 2.8, 1.8], [1.0, 5.0, 1.4], [0.2, 6.8, 0.8],
  ], 0.95, 12, detail === "ultra" ? 14 : 8), [detail]);
  const pulmL = useMemo(() => vessel([
    [0.2, 6.8, 0.8], [-2.0, 7.2, 0.2], [-4.2, 7.0, -0.4],
  ], 0.6, 10, 8), []);
  const pulmR = useMemo(() => vessel([
    [0.2, 6.8, 0.8], [2.2, 7.4, 0.6], [4.4, 7.2, 0.2],
  ], 0.6, 10, 8), []);

  const svc = useMemo(() => vessel([
    [4.0, 3.4, -0.2], [4.6, 6.0, -0.6], [4.6, 9.2, -0.8],
  ], 0.85, 10, 8), []);
  const ivc = useMemo(() => vessel([
    [3.8, 2.6, 0.2], [4.4, 0.2, 0.4], [4.4, -2.4, 0.4],
  ], 0.85, 10, 8), []);

  // four pulmonary veins into the left atrium
  const pv = useMemo(() => {
    const runs: [number, number, number][][] = [
      [[-2.6, 3.6, -1.0], [-4.4, 4.6, -1.8], [-6.2, 4.8, -2.4]],
      [[-2.6, 3.0, -1.4], [-4.4, 3.0, -2.2], [-6.2, 2.6, -2.8]],
      [[-1.6, 4.0, -1.6], [-2.4, 5.6, -2.6], [-3.2, 6.8, -3.2]],
      [[-1.2, 2.6, -1.8], [-1.6, 1.4, -2.8], [-2.0, 0.2, -3.4]],
    ];
    return mergeGeometries(runs.map((r) => vessel(r, 0.42, 8, 7)), false) ?? new BufferGeometry();
  }, []);

  // coronary arteries, lying in the grooves on the surface
  const coronary = useMemo(() => mergeGeometries([
    vessel([[0.4, 2.2, 3.2], [-1.4, 0.2, 3.4], [-2.6, -2.4, 2.6], [-3.0, -4.6, 1.4]], 0.3, 12, 7),
    vessel([[1.6, 2.4, 2.6], [3.4, 1.0, 2.0], [4.2, -1.2, 0.8]], 0.28, 10, 7),
    vessel([[0.2, 2.4, -2.6], [-1.2, 0.4, -3.0], [-2.2, -2.2, -2.4]], 0.26, 10, 7),
  ], false) ?? new BufferGeometry(), []);

  const showMuscle = layer !== "frame";
  const muscleOpacity = layer === "whole" ? 1 : 0.22;
  const showChambers = layer !== "whole";

  const pick = (id: string) => (e: { stopPropagation: () => void }) => {
    if (!onPick) return;
    e.stopPropagation();
    onPick(id);
  };
  const lift = (id: string) => (selected === id ? 1.35 : 1);

  return (
    <group>
      {showMuscle && (
        <group onClick={pick("myocardium")}>
          {[ventricles, atriumL, atriumR].map((g, i) => (
            <mesh
              key={i}
              geometry={g}
              position={i === 0 ? [0, 0, 0] : i === 1 ? [-2.4, 3.4, -0.8] : [3.0, 3.4, 0.2]}
              castShadow={layer === "whole"}
            >
              <meshStandardMaterial
                color={ORGAN.myocardium}
                roughness={0.52}
                metalness={0.02}
                transparent={muscleOpacity < 1}
                opacity={muscleOpacity}
                depthWrite={muscleOpacity === 1}
                side={muscleOpacity < 1 ? DoubleSide : undefined}
                emissive={selected === "myocardium" ? "#5a1512" : "#000000"}
              />
            </mesh>
          ))}
        </group>
      )}

      {showChambers && (
        <>
          <mesh geometry={lv} position={[-1.5, -0.6, 0.2]} onClick={pick("lv")} scale={lift("lv")}>
            <meshStandardMaterial color={ORGAN.chamberOxy} roughness={0.35}
              emissive={selected === "lv" ? "#7a2018" : "#000000"} />
          </mesh>
          <mesh geometry={rv} position={[1.9, -0.8, 0.6]} onClick={pick("rv")} scale={lift("rv")}>
            <meshStandardMaterial color={ORGAN.chamberDeoxy} roughness={0.35}
              emissive={selected === "rv" ? "#26305e" : "#000000"} />
          </mesh>
          <mesh geometry={la} position={[-2.4, 3.4, -0.8]} onClick={pick("la")} scale={lift("la")}>
            <meshStandardMaterial color={ORGAN.chamberOxy} roughness={0.35}
              emissive={selected === "la" ? "#7a2018" : "#000000"} />
          </mesh>
          <mesh geometry={ra} position={[3.0, 3.4, 0.2]} onClick={pick("ra")} scale={lift("ra")}>
            <meshStandardMaterial color={ORGAN.chamberDeoxy} roughness={0.35}
              emissive={selected === "ra" ? "#26305e" : "#000000"} />
          </mesh>
        </>
      )}

      {/* great vessels — always drawn, they are the map of where blood goes */}
      <mesh geometry={aorta} onClick={pick("aorta")} castShadow>
        <meshStandardMaterial color={ORGAN.artery} roughness={0.42}
          emissive={selected === "aorta" ? "#6d1a12" : "#000000"} />
      </mesh>
      <group onClick={pick("pulmonary-trunk")}>
        {[pulmTrunk, pulmL, pulmR].map((g, i) => (
          <mesh key={i} geometry={g} castShadow>
            <meshStandardMaterial color={ORGAN.vein} roughness={0.42}
              emissive={selected === "pulmonary-trunk" ? "#222a56" : "#000000"} />
          </mesh>
        ))}
      </group>
      <group onClick={pick("vena-cava")}>
        {[svc, ivc].map((g, i) => (
          <mesh key={i} geometry={g} castShadow>
            <meshStandardMaterial color={ORGAN.vein} roughness={0.42}
              emissive={selected === "vena-cava" ? "#222a56" : "#000000"} />
          </mesh>
        ))}
      </group>
      <mesh geometry={pv}>
        <meshStandardMaterial color={ORGAN.artery} roughness={0.45} />
      </mesh>

      {layer !== "frame" && (
        <mesh geometry={coronary} onClick={pick("coronary")}>
          <meshStandardMaterial color="#d4483a" roughness={0.4}
            emissive={selected === "coronary" ? "#6d1a12" : "#000000"} />
        </mesh>
      )}
    </group>
  );
}

/* ---------------------------------------------------------------- lungs --- */

/**
 * The lungs: two lobed masses either side of a bronchial tree, with the right
 * lung in three lobes and the left in two and carrying the cardiac notch.
 *
 * The tree is the same recursion that draws a plant in `GrovePlants` — a
 * branching structure is a branching structure — stopped after five generations
 * because twenty is about a million tubes.
 */
export function Lungs({
  layer = "whole", detail = "ultra", onPick, selected,
}: {
  layer?: LabLayer; detail?: Detail;
  onPick?: (partId: string) => void;
  selected?: string | null;
}) {
  const seg = SEG[detail];

  // right lung: three lobes, stacked with fissures between them
  const rUpper = useMemo(() => organBlob({
    r: [4.2, 4.4, 3.9], lumps: 0.05, seed: 21, seg, flatten: { axis: "x", sign: -1, amount: 0.34 },
  }), [seg]);
  const rMiddle = useMemo(() => organBlob({
    r: [4.0, 2.6, 3.7], lumps: 0.05, seed: 23, seg, flatten: { axis: "x", sign: -1, amount: 0.34 },
  }), [seg]);
  const rLower = useMemo(() => organBlob({
    r: [4.3, 4.8, 4.0], taper: 0.55, lumps: 0.05, seed: 27, seg,
    flatten: { axis: "x", sign: -1, amount: 0.34 },
  }), [seg]);

  // left lung: two lobes, and the heart's bite out of the front-medial edge
  const lUpper = useMemo(() => organBlob({
    r: [3.9, 4.8, 3.8], lumps: 0.05, seed: 31, seg,
    flatten: { axis: "x", sign: 1, amount: 0.34 },
    notch: { at: [0.75, -0.5, 0.7], radius: 1.05, depth: 0.6 },
  }), [seg]);
  const lLower = useMemo(() => organBlob({
    r: [4.0, 4.6, 3.9], taper: 0.55, lumps: 0.05, seed: 37, seg,
    flatten: { axis: "x", sign: 1, amount: 0.34 },
  }), [seg]);

  const trachea = useMemo(() => vessel([
    [0, 14.5, 0], [0, 11.0, 0], [0, 8.6, 0],
  ], 0.85, 10, detail === "ultra" ? 14 : 8), [detail]);

  // the right main bronchus is wider and more upright than the left — the
  // reason an inhaled object usually ends up in the right lung
  const mainR = useMemo(() => vessel([[0, 8.6, 0], [1.8, 7.7, 0.1], [3.6, 7.0, 0.2]], 0.62, 10, 9), []);
  const mainL = useMemo(() => vessel([[0, 8.6, 0], [-2.0, 7.9, 0.1], [-4.0, 7.4, 0.2]], 0.5, 10, 9), []);

  // Six generations fills the lung volume and still costs only a few thousand
  // triangles per side, because every tube is merged into one geometry. Real
  // airways manage about twenty; the page says so rather than pretending.
  const treeR = useMemo(() => branchTree({
    from: [3.6, 7.0, 0.2], dir: [0.5, -0.85, 0.08], length: 3.4, radius: 0.44,
    levels: detail === "ultra" ? 6 : 5, spread: 0.62, twist: 1.1, seed: 5,
  }), [detail]);
  const treeL = useMemo(() => branchTree({
    from: [-4.0, 7.4, 0.2], dir: [-0.45, -0.88, 0.08], length: 3.3, radius: 0.38,
    levels: detail === "ultra" ? 6 : 5, spread: 0.62, twist: 1.3, seed: 9,
  }), [detail]);

  const showLung = layer !== "frame";
  const lungOpacity = layer === "whole" ? 1 : 0.2;

  const pick = (id: string) => (e: { stopPropagation: () => void }) => {
    if (!onPick) return;
    e.stopPropagation();
    onPick(id);
  };

  const tissue = (id: string, deep = false) => (
    <meshStandardMaterial
      color={deep ? ORGAN.lungDeep : ORGAN.lung}
      roughness={0.72}
      transparent={lungOpacity < 1}
      opacity={lungOpacity}
      depthWrite={lungOpacity === 1}
      side={lungOpacity < 1 ? DoubleSide : undefined}
      emissive={selected === id ? "#5c2b2f" : "#000000"}
    />
  );

  return (
    <group>
      {showLung && (
        <>
          <group onClick={pick("right-lung")}>
            <mesh geometry={rUpper} position={[6.6, 6.2, 0]} castShadow={layer === "whole"}>
              {tissue("right-lung")}
            </mesh>
            <mesh geometry={rMiddle} position={[6.9, 1.6, 0.6]} castShadow={layer === "whole"}>
              {tissue("right-lung", true)}
            </mesh>
            <mesh geometry={rLower} position={[6.8, -2.8, -0.3]} castShadow={layer === "whole"}>
              {tissue("right-lung")}
            </mesh>
          </group>
          <group onClick={pick("left-lung")}>
            <mesh geometry={lUpper} position={[-6.6, 5.4, 0]} castShadow={layer === "whole"}>
              {tissue("left-lung")}
            </mesh>
            <mesh geometry={lLower} position={[-6.8, -2.4, -0.3]} castShadow={layer === "whole"}>
              {tissue("left-lung", true)}
            </mesh>
          </group>
          {/* the notch is part of the left lung's surface, so it gets a marker
              rather than a mesh — a hotspot on a shape, which is what it is */}
          <mesh position={[-3.4, 0.2, 3.4]} onClick={pick("notch")} visible={layer === "whole"}>
            <sphereGeometry args={[0.55, 12, 10]} />
            <meshStandardMaterial
              color={selected === "notch" ? "#ffd27a" : "#e8b978"}
              roughness={0.5} transparent opacity={0.85}
            />
          </mesh>
        </>
      )}

      <mesh geometry={trachea} onClick={pick("trachea")} castShadow>
        <meshStandardMaterial color={ORGAN.airway} roughness={0.62}
          emissive={selected === "trachea" ? "#6b5f42" : "#000000"} />
      </mesh>
      <group onClick={pick("bronchi")}>
        {[mainR, mainL].map((g, i) => (
          <mesh key={i} geometry={g} castShadow>
            <meshStandardMaterial color={ORGAN.airway} roughness={0.62}
              emissive={selected === "bronchi" ? "#6b5f42" : "#000000"} />
          </mesh>
        ))}
      </group>
      <group onClick={pick("tree")}>
        {[treeR, treeL].map((g, i) => (
          <mesh key={i} geometry={g}>
            <meshStandardMaterial color="#d9cdb4" roughness={0.68}
              emissive={selected === "tree" ? "#5f553c" : "#000000"} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

/* --------------------------------------------------------------- picker --- */

/** Draw whichever specimen this is. One place to add the next organ. */
export function TheSpecimen({
  id, layer, detail, onPick, selected,
}: {
  id: string; layer: LabLayer; detail: Detail;
  onPick: (partId: string) => void; selected: string | null;
}) {
  switch (id) {
    case "heart": return <Heart layer={layer} detail={detail} onPick={onPick} selected={selected} />;
    case "lungs": return <Lungs layer={layer} detail={detail} onPick={onPick} selected={selected} />;
    default: return null;
  }
}

/** Exported so the next organ can reuse the same deterministic noise. */
export { wobble as labNoise };
export type { BlobOpts };
