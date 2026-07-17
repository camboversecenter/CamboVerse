import { useMemo, useRef } from "react";
import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import type { Mesh, Group } from "three";

const MODEL_URL = "/models/heritage-sample.glb";

export function HeritageModel({ url = MODEL_URL, float = false }: { url?: string; float?: boolean }) {
  const { scene } = useGLTF(url, false, false);
  const ref = useRef<Group>(null);
  // Enable shadows on the model's meshes (once per loaded scene).
  useMemo(() => {
    scene.traverse((o) => {
      const m = o as Mesh;
      if (m.isMesh) {
        m.castShadow = true;
        m.receiveShadow = true;
      }
    });
  }, [scene]);

  useFrame((state) => {
    if (float && ref.current) {
      ref.current.position.y = Math.sin(state.clock.elapsedTime * 2) * 0.05;
    }
  });

  return (
    <group ref={ref}>
      <primitive object={scene} />
    </group>
  );
}

useGLTF.preload(MODEL_URL, false, false);
