import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
  BufferGeometry, DoubleSide, Float32BufferAttribute, Group, LatheGeometry, Vector2,
} from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { organBlob, vessel, branchTree, type Detail } from "./LabOrgans";
import type { LabLayer } from "../lab";

/**
 * The **whole human body** — a figure you can peel from skin to organs to
 * skeleton, and pull any organ out of to look at on its own.
 *
 * ## Frame of reference
 *
 * Origin at the navel, so the model runs roughly y −88 … +87 (a 175 cm adult),
 * at the Lab's usual 1 unit ≈ 1 cm. The figure **faces +z**, which fixes the
 * handedness the rest of the file depends on: seen from the front, the body's
 * **right** side is on the viewer's **left**, at −x. That is the convention
 * every anatomical atlas uses, and getting it backwards would teach a student
 * their liver is on the wrong side.
 *
 * ## What it is not
 *
 * A schematic teaching model. Recognisable, correctly arranged, right
 * proportions — and nowhere near an anatomical atlas. There is no muscle layer,
 * no fascia, no vasculature beyond the great vessels, and the surfaces are
 * smooth where real tissue is not. Building it from code rather than from a scan
 * is what lets it ship under an open licence at all; the cost is this ceiling,
 * and the page says so.
 */

const SEG = { normal: 18, ultra: 34 } as const;

export const BODY = {
  skin: "#c99b7d",
  bone: "#e8e2d2",
  boneDeep: "#cfc6b0",
  brain: "#d8b0a8",
  heart: "#9c3a34",
  lung: "#c98f92",
  liver: "#8a4038",
  stomach: "#c98a63",
  gut: "#c58a70",
  kidney: "#8f4a44",
  bladder: "#d6c07a",
  airway: "#e6dcc8",
  gutDeep: "#b07458",
  nerve: "#e4dfc4",
  gland: "#c98f6a",
  spleen: "#7a3a48",
  muscle: "#b45c52",
  bile: "#7d9a52",
  artery: "#c0392b",
  vein: "#5566a6",
} as const;

/* --------------------------------------------------------------- helpers --- */

type Ring = {
  /** Height of this cross-section. */
  y: number;
  /** Half-width and half-depth — a body is an ellipse in section, never a circle. */
  rx: number;
  rz: number;
  /** Centre offset, for a limb that is not on the midline. */
  cx?: number;
  cz?: number;
};

/**
 * Loft a surface through a stack of elliptical cross-sections.
 *
 * This is the primitive a body actually wants. The first attempt stacked
 * separate blobs for chest, belly and hips, and it read as a wooden artist's
 * mannequin: every join was a visible seam and the arms hung off the shoulders
 * as detached sausages. One continuous surface through a set of rings has no
 * seams to show, because there are no joins.
 *
 * `cap` closes the ends; leave it off where another form continues (the neck
 * into the head).
 */
function loft(rings: Ring[], seg = 24, cap: { top?: boolean; bottom?: boolean } = {}): BufferGeometry {
  const pos: number[] = [];
  const idx: number[] = [];
  const uv: number[] = [];
  const rows = rings.length;

  for (let r = 0; r < rows; r++) {
    const ring = rings[r];
    for (let i = 0; i <= seg; i++) {
      const a = (i / seg) * Math.PI * 2;
      pos.push(
        (ring.cx ?? 0) + Math.cos(a) * ring.rx,
        ring.y,
        (ring.cz ?? 0) + Math.sin(a) * ring.rz,
      );
      uv.push(i / seg, r / (rows - 1));
    }
  }
  const w = seg + 1;
  for (let r = 0; r < rows - 1; r++) {
    for (let i = 0; i < seg; i++) {
      const a = r * w + i, b = a + 1, c = a + w, d = c + 1;
      idx.push(a, b, c, b, d, c);
    }
  }

  const capRing = (r: number, up: boolean) => {
    const ring = rings[r];
    const centre = pos.length / 3;
    pos.push(ring.cx ?? 0, ring.y, ring.cz ?? 0);
    uv.push(0.5, 0.5);
    for (let i = 0; i < seg; i++) {
      const a = r * w + i, b = a + 1;
      if (up) idx.push(centre, b, a); else idx.push(centre, a, b);
    }
  };
  if (cap.bottom) capRing(0, false);
  if (cap.top) capRing(rows - 1, true);

  const g = new BufferGeometry();
  g.setAttribute("position", new Float32BufferAttribute(pos, 3));
  g.setAttribute("uv", new Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/**
 * Rings along a limb: a path of centres with a radius at each, resampled so the
 * surface is smooth rather than kinked at every control point.
 */
function limb(
  path: [number, number, number, number][], steps: number, seg: number,
): BufferGeometry {
  const rings: Ring[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * (path.length - 1);
    const k = Math.min(path.length - 2, Math.floor(t));
    const f = t - k;
    const e = f * f * (3 - 2 * f);
    const a = path[k], b = path[k + 1];
    rings.push({
      y: a[1] + (b[1] - a[1]) * e,
      cx: a[0] + (b[0] - a[0]) * e,
      cz: a[2] + (b[2] - a[2]) * e,
      rx: a[3] + (b[3] - a[3]) * e,
      rz: a[3] + (b[3] - a[3]) * e,
    });
  }
  return loft(rings, seg, { top: true, bottom: true });
}

/** A long bone: a shaft that swells into a knuckle at each end. */
function longBone(length: number, shaft: number, head: number, seg = 14): BufferGeometry {
  const pts: Vector2[] = [];
  const n = 16;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    // fat at both ends, narrow through the middle — the classic dumbbell profile
    const bulge = Math.abs(t - 0.5) * 2;           // 1 at the ends, 0 mid-shaft
    const r = shaft + (head - shaft) * bulge ** 3;
    pts.push(new Vector2(r, (t - 0.5) * length));
  }
  return new LatheGeometry(pts, seg);
}

/** One rib: an arc sweeping forward and down from the spine. */
function rib(y: number, spread: number, drop: number, reach: number, side: 1 | -1): BufferGeometry {
  const p: [number, number, number][] = [];
  const steps = 7;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const a = t * Math.PI * 0.78;
    p.push([
      side * Math.sin(a) * spread,
      y - t * drop,
      -6 + (1 - Math.cos(a)) * reach,
    ]);
  }
  return vessel(p, 0.55, 12, 6);
}

/* ------------------------------------------------------------- skeleton --- */

function useSkeleton(detail: Detail) {
  const seg = SEG[detail];
  return useMemo(() => {
    const parts: BufferGeometry[] = [];

    // spine: stacked vertebrae from the base of the skull to the pelvis, with
    // the real double curve — forward at the neck, back at the chest
    for (let i = 0; i < 24; i++) {
      const t = i / 23;
      const y = 54 - t * 68;
      const z = Math.sin(t * Math.PI * 2.1) * 2.4 - 5.5;
      const r = 1.5 + t * 1.1;
      const v = longBone(2.0, r * 0.62, r, 10);
      v.translate(0, y, z);
      parts.push(v);
    }

    // ribcage: ten pairs, each a little wider and lower than the last, then
    // narrowing again toward the floating ribs
    for (let i = 0; i < 10; i++) {
      const t = i / 9;
      const y = 44 - i * 3.4;
      const spread = 9 + Math.sin(t * Math.PI) * 8.5;
      for (const side of [1, -1] as const) parts.push(rib(y, spread, 4 + t * 3, 11 + t * 2, side));
    }
    // sternum
    const st = longBone(17, 1.9, 2.6, 8);
    st.translate(0, 34, 8.5);
    parts.push(st);

    // clavicles
    for (const side of [1, -1] as const) {
      parts.push(vessel([[0.5 * side, 47, 6], [8 * side, 47.5, 4.5], [15 * side, 46, 1.5]], 0.75, 8, 6));
    }

    // pelvis: two wings and a ring, sketched rather than sculpted
    for (const side of [1, -1] as const) {
      const wing = organBlob({ r: [7.5, 8, 3.2], lumps: 0.04, seed: 41 + side, seg: 16 });
      wing.translate(side * 8, -14, -2);
      parts.push(wing);
    }
    const ring = vessel([
      [-9, -20, -3], [-5, -22, 3], [0, -22.5, 4.5], [5, -22, 3], [9, -20, -3],
    ], 1.5, 12, 7);
    parts.push(ring);

    // limbs
    const bones: [number, number, number, number, number][] = [
      // [length, shaft, head, x, y]
      [30, 1.9, 3.1, 20, 32],    // humerus
      [26, 1.4, 2.3, 23, 2],     // radius/ulna, as one
      [44, 2.6, 4.4, 9, -36],    // femur
      [40, 2.0, 3.3, 8, -70],    // tibia
    ];
    for (const [len, sh, hd, x, y] of bones) {
      for (const side of [1, -1] as const) {
        const b = longBone(len, sh, hd, seg > 24 ? 12 : 8);
        b.translate(side * x, y, side === 1 ? 0 : 0);
        parts.push(b);
      }
    }

    const merged = mergeGeometries(parts, false) ?? new BufferGeometry();
    for (const p of parts) p.dispose();

    const skull = organBlob({
      r: [8.2, 9.6, 9.2], lumps: 0.04, seed: 3, seg,
      flatten: { axis: "z", sign: -1, amount: 0.16 },
    });
    const jaw = organBlob({ r: [6.2, 3.4, 6.0], taper: 0.55, lumps: 0.05, seed: 7, seg: 16 });
    return { merged, skull, jaw };
  }, [seg, detail]);
}

/* --------------------------------------------------------------- organs --- */

export type OrganDef = {
  /** Matches a `LabPart.id`, and a specimen id for the organ's own screen. */
  id: string;
  geo: BufferGeometry;
  /** Where it sits in the body. */
  at: [number, number, number];
  color: string;
  /** How much to enlarge it when it is pulled out of the body. */
  stageScale?: number;
  /** Roughly how big it is on its own, so its detail screen can frame it. */
  ownSize?: [number, number];
};

/**
 * Every organ, built once and used twice: arranged inside the figure here, and
 * rendered alone on its own detail screen. One source, so an organ can never
 * look like two different things depending on which screen you are on.
 *
 * Deliberately not modelled: the reproductive organs. Whether and how they
 * appear in a school tool is a decision for Cambodian educators and the
 * Ministry, not for whoever happens to be writing the geometry.
 */
export function useOrgans(detail: Detail): OrganDef[] {
  const seg = SEG[detail];
  return useMemo(() => {
    const blob = (o: Parameters<typeof organBlob>[0]) => organBlob({ ...o, seg });

    const brain = blob({ r: [7.4, 6.2, 8.4], lumps: 0.16, seed: 61 });
    const cord = vessel([[0, 56, -5], [0, 30, -6.5], [0, 6, -6], [0, -12, -5]], 0.9, 20, 8);
    const thyroid = blob({ r: [3.4, 2.0, 1.8], lumps: 0.08, seed: 63 });
    const heart = blob({ r: [5.0, 6.0, 4.4], taper: 0.18, lean: 0.5, lumps: 0.05, seed: 2 });

    // The great vessels: the aorta arching over the heart and down the back of
    // the abdomen, and the vena cava running beside it.
    const aorta = vessel([
      [1, 36, 1], [0, 43, -1], [-3, 46, -3], [-5, 42, -5],
      [-4, 30, -6], [-3, 10, -6], [-2, -8, -6], [-3, -16, -5],
    ], 1.3, 26, detail === "ultra" ? 12 : 8);
    const cava = vessel([
      [4, 44, -3], [4, 34, -4], [4, 16, -5], [4, -4, -5], [4, -14, -4],
    ], 1.2, 18, detail === "ultra" ? 12 : 8);

    // right lung sits at −x, because the figure faces +z (see the file header)
    const lungR = blob({
      r: [5.8, 11.5, 5.0], taper: 0.5, lumps: 0.05, seed: 21,
      flatten: { axis: "x", sign: 1, amount: 0.34 },
    });
    const lungL = blob({
      r: [5.4, 11.2, 4.8], taper: 0.5, lumps: 0.05, seed: 31,
      flatten: { axis: "x", sign: -1, amount: 0.34 },
      notch: { at: [-0.75, -0.2, 0.7], radius: 1.0, depth: 0.55 },
    });

    // the diaphragm: a shallow dome, the sheet of muscle that does the breathing
    const diaphragm = blob({ r: [14.5, 3.4, 9.8], taper: 0.85, lumps: 0.04, seed: 65 });

    const oesophagus = vessel([[0, 52, -3], [0, 40, -3.5], [1, 30, -3], [3, 22, -1]], 1.1, 16, 9);
    const liver = blob({
      r: [8.8, 4.8, 6.2], lumps: 0.05, seed: 71,
      flatten: { axis: "x", sign: 1, amount: 0.5 },
    });
    const gallbladder = blob({ r: [1.5, 2.6, 1.5], taper: 0.5, lumps: 0.05, seed: 72 });
    const stomach = blob({ r: [5.4, 7.2, 4.2], taper: 0.42, lean: -0.4, lumps: 0.09, seed: 73 });
    const pancreas = blob({
      r: [7.5, 1.7, 1.9], lumps: 0.1, seed: 74,
      flatten: { axis: "z", sign: -1, amount: 0.2 },
    });
    const spleen = blob({ r: [2.4, 4.2, 3.0], lumps: 0.06, seed: 75 });
    const kidney = blob({
      r: [3.0, 5.2, 2.8], lumps: 0.05, seed: 79,
      notch: { at: [-0.95, 0, 0], radius: 0.8, depth: 0.55 },
    });
    const ureters = mergeGeometries([
      vessel([[-6.5, 1, -5], [-5, -6, -3], [-3, -14, -1]], 0.42, 12, 7),
      vessel([[6.5, -1, -5], [5, -7, -3], [3, -14, -1]], 0.42, 12, 7),
    ], false) ?? new BufferGeometry();
    const bladder = blob({ r: [4.2, 3.6, 3.6], lumps: 0.05, seed: 83 });

    // the small intestine: one long coiled tube, which is exactly what it is
    const coil: [number, number, number][] = [];
    for (let i = 0; i <= 64; i++) {
      const t = i / 64;
      const a = t * Math.PI * 6.4;
      const r = 6.4 - t * 1.6;
      coil.push([Math.cos(a) * r, 0 - t * 11, Math.sin(a) * r * 0.55 + 1]);
    }
    const smallGut = vessel(coil, 1.7, detail === "ultra" ? 96 : 52, detail === "ultra" ? 10 : 7);

    // the large intestine frames it: up the right, across, down the left
    const largeGut = vessel([
      [-8.5, -13, 1], [-9.5, -4, 1], [-9.5, 6, 1],
      [-4, 9, 1], [4, 9, 1],
      [9.5, 6, 1], [9.5, -4, 1], [8, -12, 1],
      [3, -15, 1], [0, -17, 1],
    ], 2.4, detail === "ultra" ? 60 : 34, detail === "ultra" ? 12 : 8);

    return [
      { id: "brain", geo: brain, at: [0, 72, -1], color: BODY.brain, stageScale: 2.4, ownSize: [14, 18] },
      { id: "spinal-cord", geo: cord, at: [0, 0, 0], color: BODY.nerve, stageScale: 1.2, ownSize: [70, 8] },
      { id: "thyroid", geo: thyroid, at: [0, 51, 4], color: BODY.gland, stageScale: 5, ownSize: [5, 8] },
      { id: "heart", geo: heart, at: [2.5, 32, 2], color: BODY.heart, stageScale: 2.6, ownSize: [14, 12] },
      { id: "great-vessels", geo: aorta, at: [0, 0, 0], color: BODY.artery, stageScale: 1.2, ownSize: [64, 16] },
      { id: "great-vessels", geo: cava, at: [0, 0, 0], color: BODY.vein, stageScale: 1.2, ownSize: [64, 16] },
      { id: "lungs", geo: lungR, at: [-8.5, 34, 0], color: BODY.lung, stageScale: 1.6, ownSize: [26, 24] },
      { id: "lungs", geo: lungL, at: [8.5, 34, 0], color: BODY.lung, stageScale: 1.6, ownSize: [26, 24] },
      { id: "diaphragm", geo: diaphragm, at: [0, 24, -1], color: BODY.muscle, stageScale: 1.5, ownSize: [12, 30] },
      { id: "oesophagus", geo: oesophagus, at: [0, 0, 0], color: BODY.gut, stageScale: 1.3, ownSize: [36, 10] },
      { id: "liver", geo: liver, at: [-4.5, 17, 2], color: BODY.liver, stageScale: 1.9, ownSize: [12, 20] },
      { id: "gallbladder", geo: gallbladder, at: [-4, 12, 4], color: BODY.bile, stageScale: 5, ownSize: [7, 5] },
      { id: "stomach", geo: stomach, at: [5.5, 15, 1], color: BODY.stomach, stageScale: 2.2, ownSize: [16, 13] },
      { id: "pancreas", geo: pancreas, at: [1, 10, -2], color: BODY.gland, stageScale: 2.4, ownSize: [6, 18] },
      { id: "spleen", geo: spleen, at: [9, 15, -3], color: BODY.spleen, stageScale: 3.4, ownSize: [10, 8] },
      { id: "kidneys", geo: kidney, at: [-6.5, 5, -5.5], color: BODY.kidney, stageScale: 3.2, ownSize: [12, 8] },
      { id: "kidneys", geo: kidney, at: [6.5, 3, -5.5], color: BODY.kidney, stageScale: 3.2, ownSize: [12, 8] },
      { id: "ureters", geo: ureters, at: [0, 0, 0], color: BODY.bile, stageScale: 1.4, ownSize: [22, 18] },
      { id: "small-intestine", geo: smallGut, at: [0, 4, 1], color: BODY.gut, stageScale: 1.6, ownSize: [16, 16] },
      { id: "large-intestine", geo: largeGut, at: [0, 4, 0], color: BODY.gutDeep, stageScale: 1.6, ownSize: [30, 24] },
      { id: "bladder", geo: bladder, at: [0, -16, 3], color: BODY.bladder, stageScale: 3.4, ownSize: [9, 10] },
    ];
  }, [seg, detail]);
}

/* ----------------------------------------------------------------- skin --- */

function useFigure(detail: Detail) {
  const seg = SEG[detail];
  return useMemo(() => {
    const parts: BufferGeometry[] = [];

    // One continuous surface from the base of the neck to the crotch. The
    // numbers are an average adult in centimetres, half-widths.
    parts.push(loft([
      { y: 60, rx: 5.4, rz: 5.0 },
      { y: 54, rx: 6.6, rz: 6.0 },
      { y: 49, rx: 13.0, rz: 8.2 },
      { y: 46, rx: 19.5, rz: 9.8 },
      { y: 43, rx: 19.0, rz: 10.2 },
      { y: 38, rx: 17.6, rz: 10.8 },
      { y: 30, rx: 16.4, rz: 11.0 },
      { y: 22, rx: 15.0, rz: 10.4 },
      { y: 12, rx: 13.4, rz: 9.8 },
      { y: 4, rx: 13.2, rz: 10.0 },
      { y: -6, rx: 15.2, rz: 10.8 },
      { y: -14, rx: 16.4, rz: 11.4 },
      // The torso stops between the thighs rather than below them: its end cap
      // showed as a flap in the crotch when it hung lower than the legs' tops.
      { y: -18, rx: 15.0, rz: 10.6 },
      { y: -20, rx: 11.5, rz: 9.4 },
    ], seg, { top: true, bottom: true }));

    // Everything that joins the torso starts INSIDE it. A limb whose first ring
    // sits on the surface leaves a visible notch where the two meshes meet;
    // pushing it a few centimetres in makes the junction read as one body.
    const head = organBlob({ r: [8.8, 11.0, 9.8], lumps: 0.03, seed: 3, seg });
    head.translate(0, 68, 0);
    parts.push(head);

    for (const side of [1, -1] as const) {
      // arm: shoulder → elbow → wrist, thinning as it goes
      parts.push(limb([
        [side * 13, 46, 0, 6.4],
        [side * 19, 40, 0, 5.6],
        [side * 22, 30, 0, 4.9],
        [side * 23.5, 18, 0.8, 4.2],
        [side * 24.5, 6, 1.6, 3.5],
        [side * 25, -4, 2, 3.0],
      ], 26, seg));
      const hand = organBlob({ r: [3.2, 5.4, 1.9], lumps: 0.05, seed: 97 + side, seg: 16 });
      hand.translate(side * 25.2, -8, 2);
      parts.push(hand);

      // leg: hip → knee → ankle
      parts.push(limb([
        [side * 7, -14, 0, 9.2],
        [side * 8.5, -24, 0, 8.6],
        [side * 9, -36, 0, 7.2],
        [side * 9, -50, 0, 5.6],
        [side * 8.6, -57, 0, 5.3],
        [side * 8.4, -70, -0.5, 4.6],
        [side * 8.2, -82, 0, 3.8],
      ], 30, seg));
      const foot = organBlob({ r: [3.9, 2.6, 7.2], lumps: 0.04, seed: 101 + side, seg: 16 });
      foot.translate(side * 8.2, -83.5, 3.2);
      parts.push(foot);
    }

    const merged = mergeGeometries(parts, false) ?? new BufferGeometry();
    for (const p of parts) p.dispose();
    return merged;
  }, [seg, detail]);
}

/* ----------------------------------------------------------------- body --- */

/**
 * The extraction stage: where a pulled-out organ goes to be looked at. Off to
 * the figure's left and forward, at chest height, so it never overlaps the body
 * it came from and the empty socket stays visible.
 */
export const BODY_STAGE: [number, number, number] = [44, 22, 26];

/**
 * An organ that eases out of the body and back again.
 *
 * The movement is the explanation: a student watches the liver leave the space
 * under the ribs and knows where it lives. Snapping it to the stage would show
 * the same two states and teach neither, so this lerps every frame — cheap, and
 * it survives being interrupted halfway by a different organ being picked.
 */
function Extractable({
  home, stage, scale, out, children,
}: {
  home: [number, number, number];
  stage: [number, number, number];
  scale: number;
  out: boolean;
  children: React.ReactNode;
}) {
  const ref = useRef<Group>(null);
  useFrame((_, dt) => {
    const g = ref.current;
    if (!g) return;
    // frame-rate independent easing: the same feel at 30 fps and at 90 in VR
    const k = 1 - Math.exp(-dt * 7);
    const [tx, ty, tz] = out ? stage : home;
    g.position.x += (tx - g.position.x) * k;
    g.position.y += (ty - g.position.y) * k;
    g.position.z += (tz - g.position.z) * k;
    const s = out ? scale : 1;
    const ds = (s - g.scale.x) * k;
    g.scale.set(g.scale.x + ds, g.scale.y + ds, g.scale.z + ds);
    // a slow turn while it is out, so you see every side without dragging
    if (out) g.rotation.y += dt * 0.5;
    else g.rotation.y += (0 - g.rotation.y) * k;
  });
  return <group ref={ref} position={home}>{children}</group>;
}

export function Body({
  layer = "whole", detail = "ultra", onPick, selected, extracted,
}: {
  layer?: LabLayer;
  detail?: Detail;
  onPick?: (partId: string) => void;
  selected?: string | null;
  /** The organ currently pulled out of the body, if any. */
  extracted?: string | null;
}) {
  const skeleton = useSkeleton(detail);
  const organs = useOrgans(detail);
  const figure = useFigure(detail);

  const trachea = useMemo(() => vessel([[0, 52, 0], [0, 44, 0], [0, 39, 0]], 1.5, 8, 9), []);
  const bronchi = useMemo(() => mergeGeometries([
    vessel([[0, 39, 0], [-3, 36.5, 0], [-6, 35, 0]], 1.0, 6, 8),
    vessel([[0, 39, 0], [3.2, 36, 0], [6.5, 34.5, 0]], 0.9, 6, 8),
    branchTree({ from: [-6, 35, 0], dir: [-0.4, -0.9, 0], length: 5, radius: 0.75,
      levels: detail === "ultra" ? 4 : 3, spread: 0.6, twist: 1.1, seed: 5 }),
    branchTree({ from: [6.5, 34.5, 0], dir: [0.4, -0.9, 0], length: 4.8, radius: 0.7,
      levels: detail === "ultra" ? 4 : 3, spread: 0.6, twist: 1.3, seed: 9 }),
  ], false) ?? new BufferGeometry(), [detail]);

  const showSkin = layer === "whole";
  const showOrgans = layer === "cutaway";
  const showBones = layer !== "whole";
  const boneOpacity = layer === "frame" ? 1 : 0.85;

  const pick = (id: string) => (e: { stopPropagation: () => void }) => {
    if (!onPick) return;
    e.stopPropagation();
    onPick(id);
  };

  return (
    <group>
      {/* SKIN — a single merged figure, translucent the moment you look inside */}
      {showSkin && (
        <mesh geometry={figure} onClick={pick("skin")} castShadow receiveShadow>
          <meshPhysicalMaterial
            color={BODY.skin}
            roughness={0.62}
            clearcoat={0.25}
            clearcoatRoughness={0.6}
            sheen={0.5}
            sheenColor="#e8b49a"
            sheenRoughness={0.7}
            emissive={selected === "skin" ? "#4a2b1e" : "#000000"}
          />
        </mesh>
      )}

      {/* the outline of the figure stays as a ghost once you go inside, so the
          organs never float in a void with nothing to place them against */}
      {!showSkin && (
        <mesh geometry={figure}>
          <meshPhysicalMaterial
            color={BODY.skin}
            roughness={0.8}
            transparent
            opacity={0.09}
            depthWrite={false}
            side={DoubleSide}
          />
        </mesh>
      )}

      {showBones && (
        <group onClick={pick("skeleton")}>
          {[skeleton.merged, skeleton.skull, skeleton.jaw].map((g, i) => (
            <mesh
              key={i}
              geometry={g}
              position={i === 1 ? [0, 73, 0] : i === 2 ? [0, 66, 3.5] : [0, 0, 0]}
              castShadow={layer === "frame"}
            >
              <meshPhysicalMaterial
                color={i === 0 ? BODY.bone : BODY.boneDeep}
                roughness={0.55}
                clearcoat={0.2}
                transparent={boneOpacity < 1}
                opacity={boneOpacity}
                emissive={selected === "skeleton" ? "#4a4436" : "#000000"}
              />
            </mesh>
          ))}
        </group>
      )}

      {showOrgans && (
        <>
          {organs.map((o, i) => {
            const out = extracted === o.id;
            // A paired organ (lungs, kidneys) splits either side of the stage so
            // both halves stay visible instead of sitting inside each other.
            const stage: [number, number, number] = o.at[0] < 0
              ? [BODY_STAGE[0] - 7, BODY_STAGE[1], BODY_STAGE[2]]
              : o.at[0] > 0
                ? [BODY_STAGE[0] + 7, BODY_STAGE[1], BODY_STAGE[2]]
                : BODY_STAGE;
            return (
              <Extractable
                key={`${o.id}-${i}`}
                home={o.at}
                stage={stage}
                scale={o.stageScale ?? 2}
                out={out}
              >
                <mesh geometry={o.geo} castShadow onClick={pick(o.id)}>
                  <meshPhysicalMaterial
                    color={o.color}
                    roughness={0.34}
                    clearcoat={0.55}
                    clearcoatRoughness={0.28}
                    sheen={0.3}
                    sheenColor="#ffd9cf"
                    transparent={!out && extracted !== null}
                    opacity={!out && extracted !== null ? 0.25 : 1}
                    emissive={selected === o.id ? "#3a1210" : "#000000"}
                  />
                </mesh>
              </Extractable>
            );
          })}

          <group onClick={pick("airways")}>
            {[trachea, bronchi].map((g, i) => (
              <mesh key={i} geometry={g}>
                <meshPhysicalMaterial
                  color={BODY.airway}
                  roughness={0.6}
                  clearcoat={0.2}
                  transparent={extracted !== null}
                  opacity={extracted !== null ? 0.25 : 1}
                  emissive={selected === "airways" ? "#5b5340" : "#000000"}
                />
              </mesh>
            ))}
          </group>
        </>
      )}
    </group>
  );
}

/* ------------------------------------------------------- one organ alone --- */

/**
 * One organ on its own screen, centred and standing still.
 *
 * It is the *same geometry* the body uses, not a second model of the same
 * thing — an organ that looked different depending on which screen you reached
 * it from would quietly teach that there are two of them.
 *
 * Paired organs (lungs, kidneys) keep both halves and their real separation,
 * because "there are two, and they are not identical" is most of the lesson.
 */
export function SingleOrgan({
  organId, detail = "ultra", onPick, selected,
}: {
  organId: string;
  detail?: Detail;
  onPick?: (partId: string) => void;
  selected?: string | null;
}) {
  const organs = useOrgans(detail);
  const skeleton = useSkeleton(detail);
  const mine = organs.filter((o) => o.id === organId);

  // Centre the set on its own bounding box rather than the body's origin, so a
  // kidney does not appear off in the corner where it lives in the abdomen.
  const centre = useMemo(() => {
    if (!mine.length) return [0, 0, 0] as [number, number, number];
    const b = { x: 0, y: 0, z: 0 };
    for (const o of mine) { b.x += o.at[0]; b.y += o.at[1]; b.z += o.at[2]; }
    return [b.x / mine.length, b.y / mine.length, b.z / mine.length] as [number, number, number];
  }, [mine]);

  const airways = organId === "airways";
  const trachea = useMemo(
    () => (airways ? vessel([[0, 52, 0], [0, 44, 0], [0, 39, 0]], 1.5, 8, 10) : null), [airways]);
  const tree = useMemo(() => (airways ? mergeGeometries([
    vessel([[0, 39, 0], [-3, 36.5, 0], [-6, 35, 0]], 1.0, 6, 9),
    vessel([[0, 39, 0], [3.2, 36, 0], [6.5, 34.5, 0]], 0.9, 6, 9),
    branchTree({ from: [-6, 35, 0], dir: [-0.4, -0.9, 0], length: 5, radius: 0.75,
      levels: detail === "ultra" ? 5 : 4, spread: 0.6, twist: 1.1, seed: 5 }),
    branchTree({ from: [6.5, 34.5, 0], dir: [0.4, -0.9, 0], length: 4.8, radius: 0.7,
      levels: detail === "ultra" ? 5 : 4, spread: 0.6, twist: 1.3, seed: 9 }),
  ], false) : null), [airways, detail]);

  const pick = (e: { stopPropagation: () => void }) => {
    if (!onPick) return;
    e.stopPropagation();
    onPick(organId);
  };
  const glow = selected === organId ? "#3a1210" : "#000000";

  if (organId === "skeleton") {
    return (
      <group position={[0, 0, 0]} onClick={pick}>
        {[skeleton.merged, skeleton.skull, skeleton.jaw].map((g, i) => (
          <mesh
            key={i}
            geometry={g}
            position={i === 1 ? [0, 73, 0] : i === 2 ? [0, 66, 3.5] : [0, 0, 0]}
            castShadow
          >
            <meshPhysicalMaterial
              color={i === 0 ? BODY.bone : BODY.boneDeep}
              roughness={0.5} clearcoat={0.25} emissive={selected === organId ? "#4a4436" : "#000000"}
            />
          </mesh>
        ))}
      </group>
    );
  }

  if (airways) {
    return (
      <group position={[0, -44, 0]} onClick={pick}>
        {[trachea, tree].filter(Boolean).map((g, i) => (
          <mesh key={i} geometry={g as BufferGeometry} castShadow>
            <meshPhysicalMaterial color={BODY.airway} roughness={0.55} clearcoat={0.3} emissive={glow} />
          </mesh>
        ))}
      </group>
    );
  }

  return (
    <group position={[-centre[0], -centre[1], -centre[2]]} onClick={pick}>
      {mine.map((o, i) => (
        <mesh key={i} geometry={o.geo} position={o.at} castShadow receiveShadow>
          <meshPhysicalMaterial
            color={o.color}
            roughness={0.32}
            clearcoat={0.6}
            clearcoatRoughness={0.26}
            sheen={0.3}
            sheenColor="#ffd9cf"
            emissive={glow}
          />
        </mesh>
      ))}
    </group>
  );
}
