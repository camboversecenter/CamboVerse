import { useEffect, useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import { useThree, type ThreeEvent } from "@react-three/fiber";
import {
  Color, DoubleSide, FrontSide, Mesh, MeshPhysicalMaterial, Plane, Vector3,
  type Object3D,
} from "three";
import type { LabLayer } from "../lab";
import { ORGAN } from "./LabOrgans";

/**
 * **Real anatomy** for the Lab's Ultra and VR modes.
 *
 * The procedural organs in `LabOrgans` and `LabBody` are clear diagrams and they
 * stay: they are the **Normal** tier, light enough for a $150 Android over 4G,
 * and they carry exactly the same parts, labels and questions. What Ultra adds
 * is real geometry — anatomy from Z-Anatomy, decimated and compressed by
 * `scripts/lab/build-heart.mjs`. Degrade the detail, never the content.
 *
 * ## Licence — and why it has to be shown
 *
 * Z-Anatomy is **CC BY-SA 4.0**, and the meshes here are adaptations of it, so
 * they are CC BY-SA 4.0 too and must carry attribution wherever they are shown.
 * `credit` is rendered on the exhibit's page whenever a real model is on screen.
 * See `public/models/lab/LICENSE.md`.
 *
 * ## No CDN
 *
 * drei's `useGLTF` defaults to a Draco decoder hosted on **gstatic.com**. That
 * would be a runtime fetch from a third party, which CamboVerse does not do, so
 * Draco is switched off explicitly below. The files use meshopt compression
 * instead, and its decoder is bundled inside `three-stdlib` — nothing leaves the
 * page's own origin.
 */

export interface RealModel {
  url: string;
  credit: { text: string; href: string; licence: string; licenceHref: string };
}

const Z_ANATOMY = {
  text: "Anatomy: Z-Anatomy, simplified for phones",
  href: "https://github.com/LluisV/z-anatomy",
  licence: "CC BY-SA 4.0",
  licenceHref: "https://creativecommons.org/licenses/by-sa/4.0/",
};

/** Exhibits that have a real model. Everything else stays procedural in every mode. */
const REAL_MODELS: Record<string, RealModel> = {
  heart: { url: "/models/lab/heart.glb", credit: Z_ANATOMY },
};

export const realModelFor = (specimenId: string): RealModel | null => REAL_MODELS[specimenId] ?? null;

export type Anchors = Record<string, [number, number, number]>;

/* ------------------------------------------------------------- the heart --- */

const CHAMBERS = new Set(["lv", "rv", "la", "ra"]);
const OXYGENATED = new Set(["lv", "la", "aorta", "coronary", "pulmonary-veins"]);
/** Drawn but never pickable: tapping one must not name it as something it is not. */
const NEVER_PICK = new Set(["cardiac-veins", "pulmonary-veins"]);
const PARTS = new Set([
  "lv", "rv", "la", "ra", "aorta", "pulmonary-trunk", "vena-cava", "coronary",
  "cardiac-veins", "pulmonary-veins",
]);

/** The part a mesh belongs to: its own name, or the nearest ancestor's. */
function partOf(o: Object3D | null): string | null {
  for (let x = o; x; x = x.parent) if (PARTS.has(x.name)) return x.name;
  return null;
}

/**
 * The "Chambers" layer cuts the heart open.
 *
 * The procedural heart showed its chambers as separate volumes inside a
 * see-through shell. Real anatomy has no such volumes — a chamber *is* its wall
 * — and a see-through wall over another see-through wall is a mess of sorting
 * artefacts. So this does what an anatomy class does: a **coronal section**.
 * The front of the heart is cut away and the inside surfaces are drawn, so a
 * student looks into the four chambers and sees the valves and the papillary
 * muscles where they actually are.
 *
 * Keeps everything behind `z = SECTION_Z` (world space; the model is centred on
 * the origin by the build script).
 */
const SECTION_Z = 0.35;
const SECTION = new Plane(new Vector3(0, 0, -1), SECTION_Z);

/** What every part looks like in the heart's own, un-highlighted state. */
function baseColour(part: string, layer: LabLayer): string {
  if (CHAMBERS.has(part)) {
    // From outside the heart is all one muscle. Cut open, the left and right
    // sides take the teaching convention: red oxygen-rich, blue oxygen-poor.
    if (layer === "whole") return ORGAN.myocardium;
    return OXYGENATED.has(part) ? ORGAN.chamberOxy : ORGAN.chamberDeoxy;
  }
  if (part === "cardiac-veins") return ORGAN.vein;
  return OXYGENATED.has(part) ? ORGAN.artery : ORGAN.vein;
}

export function RealHeart({
  model, layer, onPick, selected, onAnchors,
}: {
  model: RealModel;
  layer: LabLayer;
  onPick: (partId: string) => void;
  selected: string | null;
  onAnchors?: (a: Anchors) => void;
}) {
  // Draco off (the default decoder lives on a CDN); meshopt on (bundled).
  const { scene } = useGLTF(model.url, false, true);
  const gl = useThree((s) => s.gl);

  // A private copy: the loader's cache is shared, and these materials are
  // mutated per layer and per selection.
  const { root, meshes } = useMemo(() => {
    const root = scene.clone(true);
    const meshes: { mesh: Mesh; part: string; mat: MeshPhysicalMaterial }[] = [];
    root.traverse((o) => {
      const m = o as Mesh;
      if (!m.isMesh) return;
      const part = partOf(m);
      if (!part) return;
      // Wet tissue reads as real almost entirely through its specular highlight
      // — the clearcoat is what catches the studio environment.
      const mat = new MeshPhysicalMaterial({
        roughness: 0.48, metalness: 0, clearcoat: 0.55, clearcoatRoughness: 0.32,
        sheen: 0.25, sheenColor: new Color("#ffd2c8"), sheenRoughness: 0.6,
      });
      m.material = mat;
      m.castShadow = true;
      m.receiveShadow = true;
      m.userData.part = part;
      meshes.push({ mesh: m, part, mat });
    });
    return { root, meshes };
  }, [scene]);

  // Anchors for label pins: a point on each part's actual surface, written by
  // the build script into the node's extras (which the loader puts in userData).
  useEffect(() => {
    if (!onAnchors) return;
    const a: Anchors = {};
    root.traverse((o) => {
      const at = o.userData?.anchor as [number, number, number] | undefined;
      if (at && PARTS.has(o.name)) a[o.name] = at;
    });
    // From outside, "the heart muscle" is what you are pointing at. The right
    // ventricle forms most of the front of the heart, so its anchor is the one
    // a student would expect the label to sit on.
    if (a.rv) a.myocardium = a.rv;
    onAnchors(a);
  }, [root, onAnchors]);

  useEffect(() => {
    const prev = gl.localClippingEnabled;
    gl.localClippingEnabled = true;
    return () => { gl.localClippingEnabled = prev; };
  }, [gl]);

  // Apply the layer and the selection. Runs on change only; nothing per frame.
  useEffect(() => {
    const cut = layer === "cutaway";
    for (const { mesh, part, mat } of meshes) {
      const chamber = CHAMBERS.has(part);
      // "Vessels": the muscle steps back to a ghost, the surface vessels go
      // with it, and only the great vessels stay solid.
      const hidden = layer === "frame" && (part === "coronary" || part === "cardiac-veins");
      const ghost = layer === "frame" && chamber;
      mesh.visible = !hidden;

      // From outside, any chamber is "the heart muscle"; cut open, each is itself.
      const pickAs = chamber && layer === "whole" ? "myocardium" : part;
      mesh.userData.pickAs = pickAs;
      const pickable = !ghost && !NEVER_PICK.has(part);
      mesh.raycast = pickable ? Mesh.prototype.raycast : () => null;

      const isSel = selected != null && selected === pickAs;
      const dim = selected != null && !isSel;
      mat.color.set(baseColour(part, layer));
      mat.emissive.set(isSel ? "#ffd9a0" : "#000000");
      mat.emissiveIntensity = isSel ? 0.38 : 0;
      mat.transparent = ghost || dim;
      mat.opacity = ghost ? 0.14 : dim ? 0.32 : 1;
      mat.depthWrite = !(ghost || dim);
      // Cut open, the inside surfaces are the point — draw both sides.
      mat.side = cut ? DoubleSide : FrontSide;
      mat.clippingPlanes = cut ? [SECTION] : [];
      mat.clipShadows = cut;
      mat.needsUpdate = true;
    }
  }, [meshes, layer, selected]);

  const pick = (e: ThreeEvent<MouseEvent>) => {
    const id = e.object.userData.pickAs as string | undefined;
    if (!id) return;
    e.stopPropagation();
    onPick(id);
  };

  return <primitive object={root} onClick={pick} />;
}

/** Start fetching while the student is still reading the hub. */
export function preloadRealModel(specimenId: string) {
  const m = realModelFor(specimenId);
  if (m) useGLTF.preload(m.url, false, true);
}
