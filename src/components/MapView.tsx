import { useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { CambodiaMap } from "./CambodiaMap";
import { Pin } from "./Pin";
import { Passport } from "./Passport";
import { SPOTS } from "../spots";

/** The hub: an explorable map of Cambodia with a pin per heritage site. */
export function MapView({
  onEnter,
  onOpenTools,
  onOpenClassroom,
}: {
  onEnter: (id: string) => void;
  onOpenTools: () => void;
  onOpenClassroom: () => void;
}) {
  const [passportOpen, setPassportOpen] = useState(false);
  return (
    <>
      <div className="viewer">
        <Canvas
          dpr={[1, 2]}
          camera={{ position: [0, 13, 4.2], fov: 45 }}
          gl={{ antialias: true, powerPreference: "high-performance" }}
        >
          <color attach="background" args={["#16232b"]} />
          <fog attach="fog" args={["#16232b", 18, 34]} />

          {/* Scale the map to fit a portrait phone viewport. */}
          <group scale={0.55}>
            <CambodiaMap />
            {SPOTS.map((s) => (
              <Pin key={s.id} spot={s} onEnter={onEnter} />
            ))}
          </group>

          <ambientLight intensity={0.7} />
          <hemisphereLight args={["#cfe0ff", "#1a2a20", 0.5]} />
          <directionalLight position={[4, 10, 6]} intensity={1.1} />

          <OrbitControls
            enablePan={false}
            minDistance={7}
            maxDistance={16}
            maxPolarAngle={Math.PI / 2.3}
            enableDamping
            dampingFactor={0.08}
            target={[0, 0, 0]}
          />
        </Canvas>
      </div>

      <div className="hud">
        <span className="tag">Explore Cambodia · Prototype</span>
        <h1>Tap a site to teleport</h1>
        <p>
          Drag to look around the map, then tap a pin to travel into that
          temple or spot. Green pins are live; others are coming soon.
        </p>
      </div>

      <button className="passport-btn" onClick={() => setPassportOpen(true)}>
        🛂 Passport
      </button>

      <button className="tools-btn" onClick={onOpenTools}>
        🏺 Khmer Life
      </button>

      <button className="alphabet-btn" onClick={onOpenClassroom}>
        🔤 Khmer Alphabet
      </button>

      {passportOpen && <Passport onClose={() => setPassportOpen(false)} />}
    </>
  );
}
