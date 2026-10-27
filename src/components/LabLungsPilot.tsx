import { Suspense, useEffect, useMemo, useState, type ReactNode } from "react";
import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { DoubleSide, type Mesh, type MeshStandardMaterial } from "three";
import type { Detail } from "./LabOrgans";
import type { LabLayer } from "../lab";
import { ModelErrorBoundary } from "./ModelErrorBoundary";

const ids = ["right-lung", "left-lung", "notch", "trachea", "bronchi", "tree"];
const partId = (name: string) => ids.find((id) => name === `part-${id}` || name.startsWith(`part-${id}-`));
const isSurface = (id?: string) => id === "right-lung" || id === "left-lung" || id === "notch";
type Props = { detail: Detail; layer: LabLayer; selected: string | null;
  onPick: (id: string) => void; fallback: ReactNode };

export function LabLungsPilot(props: Props) {
  const url = `/models/local/lab-lungs-${props.detail}.glb?v=6`;
  return <ModelErrorBoundary key={url} fallback={props.fallback}>
    <Suspense fallback={props.fallback}><LoadedLungs key={url} {...props} url={url} /></Suspense>
  </ModelErrorBoundary>;
}

function LoadedLungs({ url, detail, layer, selected, onPick }: Props & { url: string }) {
  const { scene } = useGLTF(url, false, false);
  const [hovered, setHovered] = useState<string | null>(null);
  const model = useMemo(() => {
    const clone = scene.clone(true);
    clone.traverse((node) => {
      const mesh = node as Mesh;
      if (!mesh.isMesh) return;
      mesh.material = (mesh.material as MeshStandardMaterial).clone();
      (mesh.material as MeshStandardMaterial).side = DoubleSide;
      const raycast = mesh.raycast;
      mesh.raycast = (raycaster, hits) => {
        if (mesh.visible && !(mesh.userData.seeThrough && isSurface(partId(mesh.name)))) raycast.call(mesh, raycaster, hits);
      };
    });
    return clone;
  }, [scene]);
  useEffect(() => () => model.traverse((node) => {
    const mesh = node as Mesh;
    if (mesh.isMesh) (mesh.material as MeshStandardMaterial).dispose();
  }), [model]);
  useEffect(() => {
    model.traverse((node) => {
      const mesh = node as Mesh;
      if (!mesh.isMesh) return;
      const id = partId(mesh.name);
      const surface = isSurface(id);
      mesh.visible = layer !== "frame" || !surface;
      mesh.userData.seeThrough = layer === "cutaway";
      mesh.castShadow = detail === "ultra" && layer === "whole";
      mesh.receiveShadow = detail === "ultra";
      const mat = mesh.material as MeshStandardMaterial;
      const picked = selected === id || (id === "notch" && selected === "left-lung");
      mat.opacity = surface && layer === "cutaway" ? 0.14 : selected && !picked ? 0.25 : 1;
      mat.transparent = mat.opacity < 1;
      mat.depthWrite = !mat.transparent;
      mat.emissive.set(picked ? "#ffd9a0" : hovered === id ? "#613528" : "#000000");
      mat.emissiveIntensity = picked ? 0.3 : 0.12;
      mat.needsUpdate = true;
      mesh.renderOrder = mat.transparent ? 1 : 0;
    });
  }, [model, detail, layer, selected, hovered]);
  useFrame((state) => {
    const breath = (Math.sin(state.clock.elapsedTime * Math.PI * .5) + 1) / 2;
    model.traverse((node) => {
      const mesh = node as Mesh;
      if (mesh.morphTargetInfluences) mesh.morphTargetInfluences[0] = breath;
    });
  });
  return <group name="lab-lungs-blender-pilot" onClick={(event) => {
    const id = partId(event.object.name);
    if (id) { event.stopPropagation(); onPick(id); }
  }} onPointerOver={(event) => {
    const id = partId(event.object.name);
    if (id) { event.stopPropagation(); setHovered(id); }
  }} onPointerOut={() => setHovered(null)}>
    <primitive object={model} dispose={null} />
  </group>;
}
