import { useGLTF } from "@react-three/drei";

const MODEL_URL = "/models/heritage-sample.glb";

/**
 * Loads and renders the heritage model (glTF/GLB).
 *
 * Draco and meshopt decoders are disabled here because the sample asset is
 * uncompressed — this keeps the viewer fully self-contained (no decoder is
 * fetched from any CDN). When we ship real, compressed captures, enable the
 * decoder that matches the asset:
 *   - meshopt: `useGLTF(MODEL_URL, false, true)` (decoder is bundled)
 *   - Draco:   `useGLTF(MODEL_URL, true)` + `useGLTF.setDecoderPath('/draco/')`
 *     with the decoder files copied into `public/draco/` (avoid the default CDN).
 */
export function HeritageModel({ url = MODEL_URL }: { url?: string }) {
  const { scene } = useGLTF(url, false, false);
  return <primitive object={scene} />;
}

useGLTF.preload(MODEL_URL, false, false);
