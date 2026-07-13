import { Canvas } from "@react-three/fiber";
import { Html, OrbitControls } from "@react-three/drei";
import { Suspense, useState } from "react";
import { HeritagePlaceholder } from "./HeritagePlaceholder";

/**
 * The 3D viewer surface.
 *
 * Deliberately minimal: a canvas, orbit controls tuned for touch, soft lighting
 * and a single placeholder model with one information hotspot. This exercises
 * the whole render path (React → r3f → Three.js → WebGL) so we can measure it on
 * a low-end Android before swapping in real capture data.
 */
export function Viewer() {
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

        <Suspense fallback={null}>
          <HeritagePlaceholder />
          <Hotspot />
        </Suspense>

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

/** Example information hotspot — the core v1 interaction ("explore + info"). */
function Hotspot() {
  const [open, setOpen] = useState(false);
  return (
    <Html position={[0, 3.4, 0]} center distanceFactor={10} occlude>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          all: "unset",
          cursor: "pointer",
          padding: "6px 12px",
          borderRadius: 999,
          background: open ? "#d9a441" : "rgba(217,164,65,0.85)",
          color: "#1a1410",
          font: "600 12px system-ui, sans-serif",
          whiteSpace: "nowrap",
          boxShadow: "0 2px 10px rgba(0,0,0,0.4)",
        }}
      >
        {open ? "A stepped temple tower (prasat)" : "ⓘ Info"}
      </button>
    </Html>
  );
}
