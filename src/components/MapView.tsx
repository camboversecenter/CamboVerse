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
  onEnterProvince,
  onOpenTools,
  onOpenClassroom,
  onOpenKunKhmer,
  onOpenGames,
  onOpenFarm,
  onOpenMeditation,
}: {
  onEnter: (id: string) => void;
  onEnterProvince: (name: string) => void;
  onOpenTools: () => void;
  onOpenClassroom: () => void;
  onOpenKunKhmer: () => void;
  onOpenGames: () => void;
  onOpenFarm: () => void;
  onOpenMeditation: () => void;
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
            <CambodiaMap onSelectProvince={onEnterProvince} />
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
        <h1>Tap a province or a site</h1>
        <p>
          Tap a <b>province</b> to open its map and its heritage sites, or tap a
          <b> pin</b> to teleport straight into a temple or spot. Green pins are
          live; others are coming soon.
        </p>
      </div>

      <nav className="map-nav" aria-label="CamboVerse features">
        <button className="tools-btn" onClick={onOpenTools}>🏺 Khmer Life</button>
        <button className="alphabet-btn" onClick={onOpenClassroom}>🔤 Khmer Alphabet</button>
        <button className="kun-btn" onClick={onOpenKunKhmer}>🥊 Kun Khmer</button>
        <button className="games-btn" onClick={onOpenGames}>🎪 Khmer Games</button>
        <button className="farm-btn" onClick={onOpenFarm}>🌾 Virtual Farm</button>
        <button className="med-btn" onClick={onOpenMeditation}>🧘 Meditation</button>
        <button className="passport-btn" onClick={() => setPassportOpen(true)}>🛂 Passport</button>
      </nav>

      {passportOpen && <Passport onClose={() => setPassportOpen(false)} />}
    </>
  );
}
