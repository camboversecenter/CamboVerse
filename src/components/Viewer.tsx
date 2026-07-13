import { Canvas, useFrame } from "@react-three/fiber";
import { ContactShadows, Html, OrbitControls } from "@react-three/drei";
import { Suspense, useRef, useState, type ReactNode } from "react";
import type { Group } from "three";
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
        shadows
        camera={{ position: [6, 4.5, 9], fov: 50 }}
        gl={{ antialias: true, powerPreference: "high-performance" }}
      >
        <color attach="background" args={["#1a1410"]} />
        <fog attach="fog" args={["#1a1410", 14, 30]} />

        <Ground />

        {/* Load the real glTF model; fall back to the placeholder on error,
            show a spinner while it streams. Materialize scales/rises it into
            place on arrival, completing the teleport. */}
        <Materialize>
          <ModelErrorBoundary fallback={<HeritagePlaceholder />}>
            <Suspense fallback={<Loader />}>
              <HeritageModel url={modelUrl} />
            </Suspense>
          </ModelErrorBoundary>
        </Materialize>
        {/* Soft contact shadow grounds the model. */}
        <ContactShadows position={[0, 0.02, 0]} scale={16} far={9} blur={2.6} opacity={0.55} color="#0a0803" />
        <Hotspot blurb={blurb} />

        {/* Self-contained lighting — no remote HDRI, keeps it offline-capable.
            A warm key light casts real shadows; sky/fill lift the form. */}
        <ambientLight intensity={0.28} />
        <hemisphereLight args={["#bcd0ff", "#2b2118", 0.55]} />
        <directionalLight
          position={[6, 9, 4]}
          intensity={1.7}
          color="#fff2d8"
          castShadow
          shadow-mapSize={[1024, 1024]}
          shadow-bias={-0.0005}
          shadow-camera-near={0.5}
          shadow-camera-far={30}
          shadow-camera-left={-8}
          shadow-camera-right={8}
          shadow-camera-top={8}
          shadow-camera-bottom={-8}
        />
        <directionalLight position={[-5, 3, -4]} intensity={0.3} color="#8fb0ff" />

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

/** Entrance animation: the site scales up and rises into place on teleport-in. */
function Materialize({ children }: { children: ReactNode }) {
  const ref = useRef<Group>(null);
  const t = useRef(0);
  useFrame((_, dt) => {
    const g = ref.current;
    if (!g || t.current >= 1) return;
    t.current = Math.min(1, t.current + dt / 0.6);
    const e = 1 - Math.pow(1 - t.current, 3); // easeOutCubic
    g.scale.setScalar(0.9 + 0.1 * e);
    g.position.y = (1 - e) * -0.25;
  });
  return (
    <group ref={ref} scale={0.9} position={[0, -0.25, 0]}>
      {children}
    </group>
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
