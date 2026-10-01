import { useEffect, useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import {
  Box3, Color, DoubleSide, FrontSide, Group, Mesh, MeshPhysicalMaterial, Plane, Vector3,
  type Object3D,
} from "three";
import type { LabLayer, Specimen } from "../lab";
import { ORGAN } from "./LabOrgans";
import { BODY, BODY_STAGE } from "./LabBody";

/**
 * **Real anatomy** for the Lab's Ultra and VR modes — every biology exhibit.
 *
 * The procedural organs in `LabOrgans` and `LabBody` stay: they are the
 * **Normal** tier, light enough for a $150 Android over 4G, with exactly the
 * same parts, labels and questions. Ultra swaps in real geometry from
 * Z-Anatomy, built by `scripts/lab/build-organs.mjs`. Degrade the detail,
 * never the content.
 *
 * ## One component, rules as data
 *
 * Every model is rendered by `RealSpecimen`. What differs between the heart,
 * the lungs, an organ on its own and the whole body — which parts are tappable
 * in which layer, what fades, what is cut open — is a small `Behaviour` object,
 * not a separate component. Adding an exhibit is a config entry here and one in
 * `scripts/lab/organs.config.mjs`.
 *
 * ## Coordinates
 *
 * The files are in Z-Anatomy's own frame (centimetres, Y up), so organs, skin
 * and skeleton line up for free. Each page scales and centres its model to the
 * exhibit's own `sizeU` / `spanU` / `centreU`, the same numbers the camera
 * frames by — so the real model and the procedural one sit in the same place.
 *
 * ## Licence — and why it has to be shown
 *
 * Z-Anatomy is **CC BY-SA 4.0**; these meshes adapt it, so they are CC BY-SA
 * 4.0 too and must carry attribution wherever they are shown. `credit` is
 * rendered on the page whenever a real model is on screen. See
 * `public/models/lab/LICENSE.md`.
 *
 * ## No CDN
 *
 * drei's `useGLTF` defaults to a Draco decoder hosted on gstatic.com — a
 * third-party fetch CamboVerse does not make. Draco is switched off explicitly;
 * the files use meshopt, whose decoder is bundled in `three-stdlib`.
 */

/* ------------------------------------------------------------------ colour --- */

/**
 * Colours by teaching role — taken from the procedural models' own palettes, so
 * switching between Normal and Ultra changes the detail and never the colour.
 */
const ROLE: Record<string, string> = {
  myocardium: ORGAN.myocardium,
  "chamber-oxy": ORGAN.chamberOxy,
  "chamber-deoxy": ORGAN.chamberDeoxy,
  artery: ORGAN.artery,
  vein: ORGAN.vein,
  lung: ORGAN.lung,
  airway: ORGAN.airway,
  brain: BODY.brain,
  spinal: BODY.nerve,
  gland: BODY.gland,
  muscle: BODY.muscle,
  oesophagus: BODY.gut,
  liver: BODY.liver,
  gallbladder: BODY.bile,
  stomach: BODY.stomach,
  pancreas: BODY.gland,
  spleen: BODY.spleen,
  intestine: BODY.gut,
  colon: BODY.gutDeep,
  kidney: BODY.kidney,
  ureter: BODY.bladder,
  bladder: BODY.bladder,
  bone: BODY.bone,
  skin: BODY.skin,
};

/* --------------------------------------------------------------- behaviour --- */

type Show = "solid" | "faint" | "ghost" | "hidden";

interface Behaviour {
  /** What a tap reports for this part in this layer; null means not tappable. */
  pickAs(part: string, role: string, layer: LabLayer): string | null;
  /** How the part is drawn in this layer. */
  show(part: string, role: string, layer: LabLayer): Show;
  /** Its colour; defaults to the role's. */
  colour?(role: string, layer: LabLayer): string;
  /** Cut the model open in this layer — see `SECTION`. */
  section?(layer: LabLayer): boolean;
  /** A selection that should light up a different part (a notch lights its lung). */
  litAs?: Record<string, string>;
  /** Parts that can be pulled out of the model, with how much to enlarge them. */
  extract?: Record<string, number>;
}

const HEART_NEVER = new Set(["cardiac-veins", "pulmonary-veins"]);
const isChamber = (role: string) => role.startsWith("chamber-");

/**
 * The heart. From outside it is one muscle; cut open, each chamber is itself.
 * Cardiac and pulmonary veins are drawn but never tappable — there is no part
 * in the exhibit they honestly belong to, and a tap must not name them as
 * something they are not.
 */
const HEART: Behaviour = {
  pickAs: (part, role, layer) => {
    if (HEART_NEVER.has(part)) return null;
    if (isChamber(role)) return layer === "whole" ? "myocardium" : layer === "frame" ? null : part;
    return part;
  },
  show: (part, role, layer) => {
    if (layer !== "frame") return "solid";
    if (isChamber(role)) return "ghost";
    return part === "coronary" || part === "cardiac-veins" ? "hidden" : "solid";
  },
  colour: (role, layer) => (isChamber(role) && layer === "whole" ? ORGAN.myocardium : ROLE[role]),
  section: (layer) => layer === "cutaway",
};

const LUNG_PARTS = new Set(["right-lung", "left-lung"]);
/**
 * The lungs. Lobes are tappable from outside; once they go see-through the
 * taps pass through them to the airways inside, which is the point of looking.
 */
const LUNGS: Behaviour = {
  pickAs: (part, _role, layer) => (LUNG_PARTS.has(part) ? (layer === "whole" ? part : null) : part),
  show: (part, _role, layer) => {
    if (!LUNG_PARTS.has(part)) return "solid";
    return layer === "whole" ? "solid" : layer === "cutaway" ? "ghost" : "hidden";
  },
  litAs: { notch: "left-lung" },
};

/** An organ on its own: one layer, nothing to tap. */
const ORGAN_ALONE: Behaviour = {
  pickAs: () => null,
  show: () => "solid",
};

/**
 * The whole body, matching the procedural one layer for layer: the skin from
 * outside; inside, a ghost of the skin with the organs tappable and the
 * skeleton faint behind them; and the skeleton on its own.
 */
const BODY_RULES: Behaviour = {
  pickAs: (part, _role, layer) => {
    if (part === "skin") return layer === "whole" ? "skin" : null;
    if (part === "skeleton") return layer === "frame" ? "skeleton" : null;
    return layer === "cutaway" ? part : null;
  },
  show: (part, _role, layer) => {
    if (part === "skin") return layer === "whole" ? "solid" : "ghost";
    if (part === "skeleton") return layer === "whole" ? "hidden" : layer === "frame" ? "solid" : "faint";
    return layer === "cutaway" ? "solid" : "hidden";
  },
  // The procedural body's own enlargement for each organ when it is pulled out.
  extract: {
    brain: 2.4, "spinal-cord": 1.2, thyroid: 5, heart: 2.6, "great-vessels": 1.2, lungs: 1.6,
    airways: 2, diaphragm: 1.5, oesophagus: 1.3, liver: 1.9, gallbladder: 5, stomach: 2.2,
    pancreas: 2.4, spleen: 3.4, "small-intestine": 1.6, "large-intestine": 1.6, kidneys: 3.2,
    ureters: 1.4, bladder: 3.4,
  },
};

/* ---------------------------------------------------------------- registry --- */

export interface RealModel {
  url: string;
  behaviour: Behaviour;
  credit: { text: string; href: string; licence: string; licenceHref: string };
}

const Z_ANATOMY = {
  text: "Anatomy: Z-Anatomy, simplified for phones",
  href: "https://github.com/LluisV/z-anatomy",
  licence: "CC BY-SA 4.0",
  licenceHref: "https://creativecommons.org/licenses/by-sa/4.0/",
};

const ORGANS = [
  "brain", "spinal-cord", "thyroid", "great-vessels", "airways", "diaphragm", "oesophagus", "liver",
  "gallbladder", "stomach", "pancreas", "spleen", "small-intestine", "large-intestine", "kidneys",
  "ureters", "bladder", "skeleton",
];

const REAL_MODELS: Record<string, RealModel> = {
  "human-body": { url: "/models/lab/body.glb", behaviour: BODY_RULES, credit: Z_ANATOMY },
  heart: { url: "/models/lab/heart.glb", behaviour: HEART, credit: Z_ANATOMY },
  lungs: { url: "/models/lab/lungs.glb", behaviour: LUNGS, credit: Z_ANATOMY },
  ...Object.fromEntries(ORGANS.map((o) => [
    `organ-${o}`, { url: `/models/lab/organ-${o}.glb`, behaviour: ORGAN_ALONE, credit: Z_ANATOMY },
  ])),
};

/** The real model for an exhibit, if it has one. Every biology exhibit does. */
export const realModelFor = (specimenId: string): RealModel | null => REAL_MODELS[specimenId] ?? null;

export type Anchors = Record<string, [number, number, number]>;

/* ---------------------------------------------------------------- section --- */

/**
 * The heart's "Chambers" layer is a coronal section. Real chambers are walls,
 * not volumes, and a see-through wall over another see-through wall is a mess
 * of sorting artefacts — so the front is cut away and the inside drawn, the
 * way an anatomy class shows it. World space; models are centred on x = z = 0.
 */
const SECTION = new Plane(new Vector3(0, 0, -1), 0.35);

/** The part a mesh belongs to: the nearest ancestor that is a direct child of the model root. */
function partOf(o: Object3D | null, top: Object3D): Object3D | null {
  for (let x = o; x && x.parent; x = x.parent) if (x.parent === top) return x;
  return null;
}

interface Piece { mesh: Mesh; part: string; role: string; mat: MeshPhysicalMaterial }

export function RealSpecimen({
  model, specimen, layer, onPick, selected, extracted = null, onAnchors,
}: {
  model: RealModel;
  specimen: Specimen;
  layer: LabLayer;
  onPick: (partId: string) => void;
  selected: string | null;
  extracted?: string | null;
  onAnchors?: (a: Anchors) => void;
}) {
  // Draco off (its default decoder lives on a CDN); meshopt on (bundled).
  const { scene } = useGLTF(model.url, false, true);
  const gl = useThree((s) => s.gl);
  const rules = model.behaviour;

  /**
   * A private copy (the loader's cache is shared and these materials are
   * mutated), its pieces, a pivot per part so a part can be pulled out and
   * turned about its own centre, and the transform that fits it to the page.
   */
  const built = useMemo(() => {
    const root = scene.clone(true);
    const top = root.getObjectByName("model") ?? root;
    const pieces: Piece[] = [];
    root.traverse((o) => {
      const m = o as Mesh;
      if (!m.isMesh) return;
      const partNode = partOf(m, top);
      if (!partNode) return;
      // Wet tissue reads as real almost entirely through its specular
      // highlight — the clearcoat is what catches the studio environment.
      const mat = new MeshPhysicalMaterial({
        roughness: 0.46, metalness: 0, clearcoat: 0.5, clearcoatRoughness: 0.3,
        sheen: 0.25, sheenColor: new Color("#ffd2c8"), sheenRoughness: 0.6,
      });
      m.material = mat;
      m.castShadow = true;
      m.receiveShadow = true;
      pieces.push({ mesh: m, part: partNode.name, role: (m.userData.role as string) ?? "", mat });
    });

    // Each part on a pivot at its own centre.
    const pivots = new Map<string, { pivot: Group; home: Vector3 }>();
    for (const partNode of [...top.children]) {
      const centre = new Box3().setFromObject(partNode).getCenter(new Vector3());
      const pivot = new Group();
      pivot.position.copy(centre);
      top.add(pivot);
      pivot.add(partNode);
      partNode.position.sub(centre);
      pivots.set(partNode.name, { pivot, home: centre.clone() });
    }

    // Fit to the exhibit: height to its `sizeU`, width capped by its `spanU`,
    // mass centred where the camera aims.
    const box = new Box3().setFromObject(root);
    const size = box.getSize(new Vector3());
    const mid = box.getCenter(new Vector3());
    const scale = Math.min(
      (specimen.sizeU * 0.94) / size.y,
      (specimen.spanU * 1.05) / Math.max(size.x, size.z),
    );
    const lift = specimen.centreU ?? specimen.sizeU * 0.15;
    const toWorld = (p: [number, number, number]): [number, number, number] => [
      (p[0] - mid.x) * scale, (p[1] - mid.y) * scale + lift, (p[2] - mid.z) * scale,
    ];
    const toModel = (p: [number, number, number]) =>
      new Vector3(p[0] / scale + mid.x, (p[1] - lift) / scale + mid.y, p[2] / scale + mid.z);
    const anchors = (top.userData.anchors ?? {}) as Anchors;
    return { root, pieces, pivots, scale, mid, lift, toWorld, toModel, anchors };
  }, [scene, specimen.sizeU, specimen.spanU, specimen.centreU]);

  // Label anchors in page space: points on each part's actual surface,
  // written by the build script.
  useEffect(() => {
    if (!onAnchors) return;
    const a: Anchors = {};
    for (const [id, at] of Object.entries(built.anchors)) a[id] = built.toWorld(at);
    // From outside, "the heart muscle" is what you are pointing at; the right
    // ventricle forms most of the front of the heart.
    if (a.rv && !a.myocardium) a.myocardium = a.rv;
    onAnchors(a);
  }, [built, onAnchors]);

  useEffect(() => {
    const prev = gl.localClippingEnabled;
    gl.localClippingEnabled = true;
    return () => { gl.localClippingEnabled = prev; };
  }, [gl]);

  // Apply layer, selection and extraction. On change only; nothing per frame.
  useEffect(() => {
    const cut = rules.section?.(layer) ?? false;
    const lit = selected ? rules.litAs?.[selected] ?? selected : null;
    for (const { mesh, part, role, mat } of built.pieces) {
      const show = rules.show(part, role, layer);
      mesh.visible = show !== "hidden";
      const pickAs = show === "solid" ? rules.pickAs(part, role, layer) : null;
      mesh.userData.pickAs = pickAs;
      mesh.raycast = pickAs ? Mesh.prototype.raycast : () => null;

      const isLit = lit != null && (lit === part || lit === pickAs);
      const out = extracted === part;
      const dim = (selected != null && !isLit) || (extracted != null && !out);
      const base = show === "ghost" ? 0.1 : show === "faint" ? 0.85 : 1;
      const opacity = dim ? Math.min(base, 0.28) : base;

      mat.color.set(rules.colour?.(role, layer) ?? ROLE[role] ?? "#c9a090");
      mat.emissive.set(isLit ? "#ffd9a0" : "#000000");
      mat.emissiveIntensity = isLit ? 0.36 : 0;
      mat.transparent = opacity < 1;
      mat.opacity = opacity;
      mat.depthWrite = opacity >= 1;
      // Real organs are open where they join the rest of the body — the
      // stomach at its two ends, every vessel where it was cut free — and with
      // back faces culled, looking into an opening shows a hole straight
      // through. Solid parts draw both sides; see-through ones keep to the
      // front, where two sides would only sort against each other. Cut open,
      // the inside surfaces are the point.
      mat.side = cut || opacity >= 1 ? DoubleSide : FrontSide;
      mat.clippingPlanes = cut ? [SECTION] : [];
      mat.clipShadows = cut;
      mesh.castShadow = opacity >= 1;
      mat.needsUpdate = true;
    }
  }, [built, rules, layer, selected, extracted]);

  // Pulling a part out: it eases to the stage beside the body, grows, and
  // turns slowly so every side is seen without dragging. Frame-rate
  // independent, so it feels the same at 30 fps and at 90 in VR.
  const stage = useMemo(() => built.toModel(BODY_STAGE), [built]);
  useFrame((_, dt) => {
    if (!rules.extract) return;
    const k = 1 - Math.exp(-dt * 7);
    for (const [part, { pivot, home }] of built.pivots) {
      const out = extracted === part;
      const target = out ? stage : home;
      pivot.position.lerp(target, k);
      const s = out ? rules.extract[part] ?? 2 : 1;
      pivot.scale.setScalar(pivot.scale.x + (s - pivot.scale.x) * k);
      if (out) pivot.rotation.y += dt * 0.5;
      else pivot.rotation.y += (0 - pivot.rotation.y) * k;
    }
  });

  const pick = (e: ThreeEvent<MouseEvent>) => {
    const id = e.object.userData.pickAs as string | null | undefined;
    if (!id) return;
    e.stopPropagation();
    onPick(id);
  };

  return (
    <group
      position={[-built.mid.x * built.scale, -built.mid.y * built.scale + built.lift, -built.mid.z * built.scale]}
      scale={built.scale}
    >
      <primitive object={built.root} onClick={pick} />
    </group>
  );
}

/** Start fetching while the student is still reading the hub. */
export function preloadRealModel(specimenId: string) {
  const m = realModelFor(specimenId);
  if (m) useGLTF.preload(m.url, false, true);
}
