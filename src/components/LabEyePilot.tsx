import { Suspense, useEffect, useMemo, useState, type ReactNode } from "react";
import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { DoubleSide, MeshPhysicalMaterial, type Mesh, type MeshStandardMaterial } from "three";
import type { Detail } from "./LabOrgans";
import type { LabLayer } from "../lab";
import { ModelErrorBoundary } from "./ModelErrorBoundary";

const IDS = ["sclera", "cornea", "iris", "lens", "retina", "optic-nerve", "vitreous"];
const partId = (name: string) => IDS.find((id) => name === `part-${id}` || name.startsWith(`part-${id}-`));
type Props = { detail: Detail; layer: LabLayer; selected: string | null;
  onPick: (id: string) => void; knob: number; running: boolean; fallback: ReactNode };

/** Original Blender asset, local-only until educator/device review. */
export function LabEyePilot(props: Props) {
  const url = `/models/local/lab-eye-${props.detail}.glb`;
  return <ModelErrorBoundary key={url} fallback={props.fallback}>
    <Suspense fallback={props.fallback}><LoadedEye key={url} {...props} url={url} /></Suspense>
  </ModelErrorBoundary>;
}

function LoadedEye({ url, detail, layer, selected, onPick, knob, running }: Props & { url: string }) {
  const { scene } = useGLTF(url, false, false);
  const [hovered, setHovered] = useState<string | null>(null);
  const model = useMemo(() => {
    const clone = scene.clone(true);
    clone.traverse((node) => {
      const mesh = node as Mesh;
      if (!mesh.isMesh) return;
      const source = mesh.material as MeshStandardMaterial;
      const mat = mesh.name === "part-cornea-dome" && detail === "ultra"
        ? new MeshPhysicalMaterial({ color: "#ffffff", roughness: 0.04, transmission: 0.97, thickness: 0.08, ior: 1.376, specularIntensity: 0.25 })
        : source.clone();
      mat.side = DoubleSide;
      mesh.material = mat;
      mesh.castShadow = detail === "ultra" && !["cornea", "vitreous", "lens"].includes(partId(mesh.name) ?? "");
      mesh.receiveShadow = detail === "ultra" && partId(mesh.name) !== "cornea";
      // The clear dome must not steal iris/pupil taps; its rim and lesson button select it.
      const raycast = mesh.raycast;
      mesh.raycast = (raycaster, hits) => {
        if (mesh.visible && mesh.name !== "part-cornea-dome" && mesh.name !== "part-vitreous") {
          raycast.call(mesh, raycaster, hits);
        }
      };
    });
    return clone;
  }, [scene, detail]);
  useEffect(() => () => model.traverse((node) => {
    const mesh = node as Mesh;
    if (mesh.isMesh) (mesh.material as MeshStandardMaterial).dispose();
  }), [model]);
  useEffect(() => {
    model.traverse((node) => {
      const mesh = node as Mesh;
      if (!mesh.isMesh) return;
      const name = mesh.name;
      const id = partId(name);
      const cut = layer === "cutaway";
      const optics = layer === "frame";
      mesh.visible = optics ? ["lens", "retina", "optic-nerve"].includes(id ?? "")
        : layer === "whole" ? !["lens", "retina", "vitreous"].includes(id ?? "") : true;
      if (name === "part-retina-front") mesh.visible = false;
      if (cut && name === "part-iris-pupil") mesh.visible = false;
      if (cut && (name === "part-sclera-front" || name === "part-sclera-vessels" || name === "part-cornea-dome")) mesh.visible = false;
      const mat = mesh.material as MeshStandardMaterial;
      const ghost = !!selected && id !== selected;
      const clear = name === "part-cornea-dome";
      const jelly = id === "vitreous";
      const lens = id === "lens";
      mat.opacity = ghost ? 0.18 : jelly ? (selected === id ? 0.38 : 0.1) : lens ? 0.68 : clear && detail === "normal" ? 0.1 : 1;
      mat.transparent = mat.opacity < 1;
      mat.depthWrite = !mat.transparent;
      mat.emissive.set(selected === id ? "#ffd9a0" : hovered === id ? "#55351c" : "#000000");
      mat.emissiveIntensity = selected === id ? 0.22 : 0.12;
      mat.needsUpdate = true;
      mesh.renderOrder = jelly ? 1 : clear ? 2 : 0;
    });
  }, [model, layer, selected, hovered, detail]);
  const iris = useMemo(() => model.getObjectByName("part-iris") as Mesh, [model]);
  const pupil = useMemo(() => model.getObjectByName("part-iris-pupil"), [model]);
  useFrame((_, delta) => {
    if (!iris?.morphTargetInfluences || !pupil || !running) return;
    const target = 1 - Math.max(0, Math.min(100, knob)) / 100;
    const current = iris.morphTargetInfluences[0];
    const next = current + (target - current) * (1 - Math.exp(-delta * 6));
    iris.morphTargetInfluences[0] = next;
    pupil.scale.set(1 + next * 2.3 / 1.5, 1 + next * 2.3 / 1.5, 1);
  });
  return <group name="lab-eye-blender-pilot" onClick={(event) => {
    const id = partId(event.object.name);
    if (id) { event.stopPropagation(); onPick(id); }
  }} onPointerOver={(event) => {
    const id = partId(event.object.name);
    if (id) { event.stopPropagation(); setHovered(id); }
  }} onPointerOut={() => setHovered(null)}>
    <primitive object={model} dispose={null} />
  </group>;
}
