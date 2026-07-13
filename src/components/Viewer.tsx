import { Canvas, useFrame } from "@react-three/fiber";
import { Html, OrbitControls } from "@react-three/drei";
import { Suspense, useRef, useState, type ReactNode } from "react";
import type { Group } from "three";
import { HeritageModel } from "./HeritageModel";
import { HeritagePlaceholder } from "./HeritagePlaceholder";
import { ModelErrorBoundary } from "./ModelErrorBoundary";
import { Loader } from "./Loader";
import { Scenery } from "./Scenery";
import { SplatModel } from "./SplatModel";

/**
 * The 3D viewer surface.
 *
 * A canvas with touch-tuned orbit controls set in an outdoor daytime scene
 * (procedural sky, grass, palms, warm sun, optional reflecting pool). It loads
 * a real glTF heritage model (streamed, with a loading indicator); if that
 * fails it falls back to a primitive placeholder so the canvas never breaks.
 */
export function Viewer({
  modelUrl,
  blurb,
  water = false,
  splatUrl,
  splat = false,
}: {
  modelUrl: string;
  blurb: string;
  water?: boolean;
  splatUrl?: string;
  splat?: boolean;
}) {
  return (
    <div className="viewer">
      <Canvas
        // Cap DPR so we don't over-render on high-density phone screens.
        dpr={[1, 2]}
        shadows
        camera={{ position: [5, 2.8, 14], fov: 50 }}
        gl={{ antialias: true, powerPreference: "high-performance" }}
      >
        <Scenery water={water} />

        {/* Load the real glTF model; fall back to the placeholder on error,
            show a spinner while it streams. Materialize scales/rises it into
            place on arrival, completing the teleport. */}
        <Materialize>
          {splat && splatUrl ? (
            <Suspense fallback={<Loader />}>
              <SplatModel url={splatUrl} />
            </Suspense>
          ) : (
            <ModelErrorBoundary fallback={<HeritagePlaceholder />}>
              <Suspense fallback={<Loader />}>
                <HeritageModel url={modelUrl} />
              </Suspense>
            </ModelErrorBoundary>
          )}
        </Materialize>
        <Hotspot blurb={blurb} />

        <OrbitControls
          enablePan={false}
          minDistance={5}
          maxDistance={20}
          maxPolarAngle={Math.PI / 2.15}
          enableDamping
          dampingFactor={0.08}
          target={[0, 1.2, 0]}
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
