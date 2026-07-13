import { Canvas } from "@react-three/fiber";
import { Html, OrbitControls } from "@react-three/drei";
import { Suspense, useState } from "react";
import { HeritageModel } from "./HeritageModel";
import { HeritagePlaceholder } from "./HeritagePlaceholder";
import { ModelErrorBoundary } from "./ModelErrorBoundary";
import { Loader } from "./Loader";

/**
 * The 3D viewer surface.
 *
 * A canvas with touch-tuned orbit controls and soft, self-contained lighting.
 * It loads a real glTF heritage model (streamed, with a loading indicator);
 * if that fails it falls back to a primitive placeholder so the canvas never
 * breaks. This exercises the whole render path (React → r3f → Three.js → WebGL
 * → glTF) so we can measure it on a low-end Android before real capture data.
 */
export function Viewer({ modelUrl, blurb }: { modelUrl: string; blurb: string }) {
  return (
    <div className="viewer">
      <Canvas
        // Cap DPR so we don't over-render on high-density phone screens.
        dpr={[1, 2]}
        camera={{ position: [6, 4.5, 9], fov: 50 }}
        gl={{ antialias: true, powerPreference: "high-performance" }}
      >
        <color attach="background" args={["#1a1410"]} />
        <fog attach="fog" args={["#1a1410", 12, 28]} />

        <Ground />

        {/* Load the real glTF model; fall back to the placeholder on error,
            show a spinner while it streams. */}
        <ModelErrorBoundary fallback={<HeritagePlaceholder />}>
          <Suspense fallback={<Loader />}>
            <HeritageModel url={modelUrl} />
          </Suspense>
        </ModelErrorBoundary>
        <Hotspot blurb={blurb} />

        {/* Self-contained lighting — no remote HDRI, keeps the prototype
            fully offline-capable and light on bandwidth. */}
        <ambientLight intensity={0.5} />
        <hemisphereLight args={["#c9b48f", "#2b2118", 0.6]} />
        <directionalLight position={[5, 8, 3]} intensity={1.3} castShadow />

        <OrbitControls
          enablePan={false}
          minDistance={4}
          maxDistance={14}
          maxPolarAngle={Math.PI / 2.05}
          enableDamping
          dampingFactor={0.08}
        />
      </Canvas>
    </div>
  );
}

/** Shared ground plane so both the model and the fallback sit on a surface. */
function Ground() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
      <circleGeometry args={[9, 48]} />
      <meshStandardMaterial color="#2b2118" roughness={1} />
    </mesh>
  );
}

/** Example information hotspot — the core v1 interaction ("explore + info"). */
function Hotspot({ blurb }: { blurb: string }) {
  const [open, setOpen] = useState(false);
  return (
    <Html position={[0, 3.4, 0]} center distanceFactor={10} occlude>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          all: "unset",
          cursor: "pointer",
          padding: open ? "10px 14px" : "6px 12px",
          maxWidth: open ? 240 : "none",
          borderRadius: open ? 12 : 999,
          background: open ? "#4c8a3f" : "rgba(76,138,63,0.9)",
          color: "#ffffff",
          font: open ? "500 12px/1.4 system-ui, sans-serif" : "600 12px system-ui, sans-serif",
          whiteSpace: open ? "normal" : "nowrap",
          textAlign: "center",
          boxShadow: "0 2px 10px rgba(0,0,0,0.4)",
        }}
      >
        {open ? blurb : "ⓘ Info"}
      </button>
    </Html>
  );
}
