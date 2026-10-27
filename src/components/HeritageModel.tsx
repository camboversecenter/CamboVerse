import { useMemo, useRef } from "react";
import { Bvh, useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import type { Mesh, Group } from "three";

const MODEL_URL = "/models/heritage-sample.glb";

export function HeritageModel({ url = MODEL_URL, float = false }: { url?: string; float?: boolean }) {
  // These local review pairs use open meshopt compression. Drei bundles its
  // decoder, so no third-party decoder download is needed; other assets keep
  // their existing loading path.
  const meshopt = ['/models/local/banteay-chhmar-refined-v4/', '/models/local/sambor-prei-kuk-refined-v2/', '/models/local/wat-phnom-refined-v4/', '/models/local/royal-palace-refined-v2/', '/models/local/oudong-refined-v2/', '/models/local/bayon-refined-v2/', '/models/local/angkor-wat-refined-v3/', '/models/local/ta-prohm-refined-v2/', '/models/local/banteay-srei-refined-v2/', '/models/local/preah-khan-refined-v2/', '/models/local/beng-mealea-refined-v2/', '/models/local/phnom-kulen-refined-v2/', '/models/local/phnom-kulen-region-v3/', '/models/local/phnom-kulen-waterfall-v3/', '/models/local/pre-rup-refined-v2/'].some(prefix => url.startsWith(prefix));
  const { scene } = useGLTF(url, false, meshopt || url.startsWith('/models/heritage/'));
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
  return ['/models/local/bayon-refined-v2/', '/models/local/angkor-wat-refined-v3/', '/models/local/ta-prohm-refined-v2/', '/models/local/banteay-srei-refined-v2/', '/models/local/preah-khan-refined-v2/', '/models/local/beng-mealea-refined-v2/', '/models/local/phnom-kulen-refined-v2/', '/models/local/phnom-kulen-region-v3/', '/models/local/phnom-kulen-waterfall-v3/', '/models/local/pre-rup-refined-v2/'].some(prefix => url.startsWith(prefix))
    ? <Bvh key={url} firstHitOnly={false} indirect>{model}</Bvh>
    : model;
}

useGLTF.preload(MODEL_URL, false, false);
