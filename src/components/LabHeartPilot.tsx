import { Suspense, useEffect, useMemo, useRef, type ReactNode } from "react";
import { useAnimations, useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import type { Group, Mesh, Object3D } from "three";
import type { Detail } from "./LabOrgans";
import { ModelErrorBoundary } from "./ModelErrorBoundary";

const LOCAL_HEART = {
  normal: "/models/local/lab-heart-normal.glb",
  ultra: "/models/local/lab-heart-ultra.glb",
} as const;

const PART_IDS = [
  "myocardium", "lv", "rv", "la", "ra", "aorta", "pulmonary-trunk", "vena-cava", "coronary",
] as const;

function labPartId(nodeName: string): string | null {
  return PART_IDS.find((id) => nodeName === `part-${id}` || nodeName.startsWith(`part-${id}-`)) ?? null;
}

type Props = {
  detail: Detail;
  onPick: (id: string) => void;
  fallback: ReactNode;
};

/**
 * Development-only Blender pilot. It intentionally covers only the assembled
 * heart: procedural geometry still supplies the existing cutaway and frame
 * lessons until a reviewed source asset includes those representations too.
 */
export function LabHeartPilot({ detail, onPick, fallback }: Props) {
  const url = LOCAL_HEART[detail];
  return (
    <ModelErrorBoundary fallback={fallback}>
      <Suspense fallback={fallback}>
        <LoadedHeart key={url} url={url} detail={detail} onPick={onPick} />
      </Suspense>
    </ModelErrorBoundary>
  );
}

function LoadedHeart({ url, detail, onPick }: { url: string; detail: Detail; onPick: (id: string) => void }) {
  const root = useRef<Group>(null);
  const { scene, animations } = useGLTF(url, false, false);
  const model = useMemo(() => scene.clone(true), [scene]);
  const { actions } = useAnimations(animations, root);

  useMemo(() => {
    model.traverse((node) => {
      const mesh = node as Mesh;
      if (mesh.isMesh) {
        mesh.castShadow = detail === 'ultra';
        mesh.receiveShadow = detail === 'ultra';
      }
    });
  }, [model, detail]);

  useEffect(() => {
    Object.values(actions).forEach((action) => action?.reset().play());
    return () => Object.values(actions).forEach((action) => action?.stop());
  }, [actions]);

  // A group pulse keeps the model alive even if a Blender export omits clips.
  useFrame((state) => {
    if (!root.current) return;
    const beat = Math.max(0, Math.sin(state.clock.elapsedTime * Math.PI * 2 * 1.16));
    root.current.scale.setScalar(1 + beat * 0.018);
  });

  return (
    <group
      ref={root}
      name="lab-heart-blender-pilot"
      onClick={(event) => {
        event.stopPropagation();
        let node: Object3D | null = event.object;
        while (node) {
          const id = labPartId(node.name);
          if (id) { onPick(id); return; }
          node = node.parent;
        }
      }}
    >
      <group rotation={[Math.PI / 2, 0, 0]}><primitive object={model} /></group>
    </group>
  );
}
