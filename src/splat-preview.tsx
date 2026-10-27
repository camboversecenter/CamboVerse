import { Suspense } from "react";
import { createRoot } from "react-dom/client";
import { Canvas } from "@react-three/fiber";
import { ExploreControls as OrbitControls } from './components/ExploreControls';
import { SplatModel } from "./components/SplatModel";

// Dev tool (splat-preview.html): orbit a raw .splat capture with the same
// renderer the app uses, to check quality and orientation before adding a spot.
//   ?src=/models/<site>.splat   file to load
//   &rx=-90                     rotate about X in degrees (Nerfstudio exports are Z-up; -90 makes them Y-up)
//   &cam=0,0.5,2&target=0,0,0   camera position and orbit target
const params = new URLSearchParams(location.search);
const src = params.get("src") ?? "/models/num-statue.splat";
const rx = Number(params.get("rx") ?? 0);
const vec = (key: string, fallback: [number, number, number]) =>
  (params.get(key)?.split(",").map(Number) as [number, number, number] | undefined) ?? fallback;
const cam = vec("cam", [0, 1, 6]);
const target = vec("target", [0, 0, 0]);

document.getElementById("hud")!.textContent =
  `${src} · rx ${rx}° · drag to orbit, scroll to zoom, right-drag to pan`;

createRoot(document.getElementById("root")!).render(
  <Canvas camera={{ position: cam, fov: 60, near: 0.01 }}>
    <Suspense fallback={null}>
      <group rotation={[(rx * Math.PI) / 180, 0, 0]}>
        <SplatModel url={src} />
      </group>
    </Suspense>
    <OrbitControls makeDefault target={target} />
  </Canvas>,
);
