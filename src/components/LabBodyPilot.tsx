import { Suspense, useEffect, useMemo, useRef, type ReactNode } from "react";
import { useAnimations, useGLTF } from "@react-three/drei";
import type { Group, Mesh, MeshStandardMaterial } from "three";
import type { Detail } from "./LabOrgans";
import { ModelErrorBoundary } from "./ModelErrorBoundary";

const LOCAL_BODY = {
  normal: "/models/local/lab-body-face-v2-normal.glb",
  ultra: "/models/local/lab-body-face-v2-ultra.glb",
} as const;

/** Development-only Blender external-body pilot; cutaways stay procedural. */
export function LabBodyPilot({ detail, onPick, fallback, selected }: {
  detail: Detail; onPick: (id: string) => void; fallback: ReactNode; selected: string | null;
}) {
  const url = LOCAL_BODY[detail];
  return <ModelErrorBoundary key={url} fallback={fallback}>
    <Suspense fallback={fallback}><LoadedBody key={url} url={url} detail={detail} selected={selected} onPick={onPick} /></Suspense>
  </ModelErrorBoundary>;
}

function LoadedBody({ url, detail, selected, onPick }: { url: string; detail: Detail; selected: string | null; onPick: (id: string) => void }) {
  const root = useRef<Group>(null);
  const { scene, animations } = useGLTF(url, false, false);
  const model = useMemo(() => {
    const clone = scene.clone(true);
    clone.traverse((node) => {
      const mesh = node as Mesh;
      if (!mesh.isMesh) return;
      mesh.castShadow = detail === "ultra";
      mesh.receiveShadow = detail === "ultra";
      mesh.material = Array.isArray(mesh.material)
        ? mesh.material.map((material) => material.clone()) : mesh.material.clone();
    });
    return clone;
  }, [scene, detail]);
  const { actions } = useAnimations(animations, root);

  useEffect(() => model.traverse((node) => {
    const mesh = node as Mesh;
    if (!mesh.isMesh) return;
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    materials.forEach((material) => {
      const standard = material as MeshStandardMaterial;
      standard.emissive?.set(selected === "skin" ? "#ffd9a0" : "#000000");
      standard.emissiveIntensity = selected === "skin" ? 0.15 : 0;
    });
  }), [model, selected]);
  useEffect(() => () => model.traverse((node) => {
    const mesh = node as Mesh;
    if (mesh.isMesh) (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).forEach((material) => material.dispose());
  }), [model]);
  useEffect(() => {
    Object.values(actions).forEach((action) => action?.reset().play());
    return () => Object.values(actions).forEach((action) => action?.stop());
  }, [actions]);

  return <group ref={root} name="lab-body-blender-pilot" onClick={(event) => {
    event.stopPropagation();
    onPick("skin");
  }}><primitive object={model} dispose={null} /></group>;
}
