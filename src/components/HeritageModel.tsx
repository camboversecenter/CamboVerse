import { useMemo, useRef } from "react";
import { Bvh, useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import type { Mesh, Group } from "three";
import { MeshoptDecoder } from 'meshoptimizer';

const MODEL_URL = "/models/heritage-sample.glb";

export function HeritageModel({ url = MODEL_URL, float = false }: { url?: string; float?: boolean }) {
  // Published heritage GLBs use open meshopt compression. The bundled
  // meshoptimizer decoder handles both existing exports and the more compact
  // lossless Sambor Ultra stream without a third-party network request.
  const published = url.startsWith('/models/heritage/');
  const { scene } = useGLTF(url, false, !published,
    published ? loader => loader.setMeshoptDecoder(MeshoptDecoder) : undefined);
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

  const model = (
    <group ref={ref}>
      <primitive object={scene} />
    </group>
  );
  // Accelerate refined-temple collision queries without losing
  // later floor hits beneath a roof. Key by URL so switching tiers rebuilds it.
  return ['/models/heritage/bayon-refined-v2/', '/models/heritage/angkor-wat-refined-v3/', '/models/heritage/ta-prohm-refined-v2/', '/models/heritage/banteay-srei-refined-v2/', '/models/heritage/preah-khan-refined-v2/', '/models/heritage/beng-mealea-refined-v2/', '/models/heritage/phnom-kulen-region-v3/', '/models/heritage/phnom-kulen-waterfall-v3/', '/models/heritage/pre-rup-refined-v2/'].some(prefix => url.startsWith(prefix))
    ? <Bvh key={url} firstHitOnly={false} indirect>{model}</Bvh>
    : model;
}

useGLTF.preload(MODEL_URL, false, false);
