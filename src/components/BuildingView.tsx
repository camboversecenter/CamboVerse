import { useEffect, useMemo, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Sky } from "@react-three/drei";
import { createXRStore, XR, XROrigin, useXR } from "@react-three/xr";
import { ACESFilmicToneMapping } from "three";
import {
  GreatHall, TeachingBlock, EntranceMonument, Shrine, ParkingCanopy, SportsField,
  ConstructionBlock,
} from "./CampusBuildings";
import { PalmPlant, type PlantLook } from "./GrovePlants";
import { grassTexture, metresRepeat } from "../lib/groundTexture";
import { paveTexture } from "../lib/campusTexture";
import type { Building } from "../buildings";

/**
 * A single **building's page** — the building on its own, turning slowly on a
 * paved apron, with its name, what it is for, and how it is built. Opened by
 * tapping the building in the site scene.
 *
 * Same three view modes as everywhere else: Normal for a low-end phone, Ultra
 * for a capable one, and VR (which always presents Ultra).
 */
type ViewMode = "normal" | "ultra";

function detectViewMode(): ViewMode {
  if (typeof navigator === "undefined") return "ultra";
  const cores = navigator.hardwareConcurrency ?? 4;
  const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 4;
  const small = typeof window !== "undefined" && Math.min(window.screen.width, window.screen.height) < 500;
  return cores <= 4 || mem <= 3 || small ? "normal" : "ultra";
}

/** One paving tile-set per 8 m of ground → roughly 1 m slabs. */
const PAVER_M = 8;

const PALM_LOOK: PlantLook = { form: "palm", leaf: "#3f8a44", leaf2: "#57a052", bark: "#9a7b4a" };

/** Draw just this building, centred on the origin. */
function TheBuilding({ id }: { id: string }) {
  switch (id) {
    case "hall": return <GreatHall position={[0, 0, 0]} />;
    case "teaching": return <TeachingBlock position={[0, 0, 0]} w={86} d={15} floors={4} />;
    case "gate": return <EntranceMonument position={[0, 0, 0]} rotation={Math.PI} />;
    case "shrine": return <Shrine position={[0, 0, 0]} />;
    case "construction": return <ConstructionBlock position={[0, 0, 0]} w={46} d={18} floors={5} />;
    case "parking":
      return (
        <>
          {[-1, 0, 1].map((i) => (
            <ParkingCanopy key={i} position={[i * 19, 0, 0]} rotation={Math.PI / 2} length={64} width={13} />
          ))}
        </>
      );
    case "field": return <SportsField position={[0, 0, 0]} rx={42} rz={34} />;
    default: return null;
  }
}

export function BuildingView({
  building, onBack, onBackToMap,
}: {
  building: Building;
  onBack: () => void;
  onBackToMap: () => void;
}) {
  const store = useMemo(() => createXRStore({ emulate: false }), []);
  const [vrSupported, setVrSupported] = useState(false);
  const [mode, setMode] = useState<ViewMode>(detectViewMode);
  const [spin, setSpin] = useState(true);

  useEffect(() => {
    const xr = (navigator as Navigator & { xr?: { isSessionSupported(m: string): Promise<boolean> } }).xr;
    xr?.isSessionSupported("immersive-vr").then(setVrSupported).catch(() => setVrSupported(false));
  }, []);

  // Frame from the footprint, not just the height — a long low block needs far
  // more room than a tall narrow one. Keep the eye low so we read the facade
  // rather than the roof, and aim high so the info sheet doesn't cover it.
  const dist = Math.max(building.spanM * 1.25, building.heightM * 3, 26);
  const eye = Math.max(4, building.heightM * 0.5);
  const aim = Math.max(2.5, building.heightM * 0.7);

  return (
    <div className="building">
      <Canvas
        dpr={mode === "normal" ? [1, 1.5] : [1, 2]}
        camera={{ position: [dist * 0.5, eye, dist], fov: 45, near: 0.5, far: 900 }}
        gl={{ antialias: mode === "ultra", powerPreference: "high-performance" }}
        shadows={mode === "ultra"}
        onCreated={({ gl }) => {
          gl.toneMapping = ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.15;
        }}
      >
        <XR store={store}>
          <Sky sunPosition={[120, 70, 60]} turbidity={5} rayleigh={1} mieCoefficient={0.005} mieDirectionalG={0.92} />
          <fog attach="fog" args={["#cfe0e8", 200, 700]} />
          <ambientLight intensity={0.55} />
          <hemisphereLight args={["#cfe2ff", "#6b8a45", 0.8]} />
          <directionalLight
            position={[80, 70, 50]}
            intensity={2.3}
            color="#fff1d6"
            castShadow={mode === "ultra"}
            shadow-mapSize={[2048, 2048]}
            shadow-bias={-0.0006}
            shadow-camera-far={300}
            shadow-camera-left={-90}
            shadow-camera-right={90}
            shadow-camera-top={90}
            shadow-camera-bottom={-90}
          />
          <Ground />
          <TheBuilding id={building.id} />
          {/* a pair of palms for scale */}
          {[-1, 1].map((s) => (
            <group key={s} position={[s * (dist * 0.42), 0, dist * 0.18]}>
              <PalmPlant look={PALM_LOOK} height={11} seed={s + 3} opacity={1} wind={mode === "ultra" ? 1 : 0} />
            </group>
          ))}
          <XROrigin position={[0, 0, dist * 0.8]} />
          <VrImpliesUltra onEnter={() => setMode("ultra")} />
          <OrbitControls
            enablePan={false}
            minDistance={Math.max(12, building.spanM * 0.5)}
            maxDistance={dist * 2.6}
            maxPolarAngle={Math.PI / 2.12}
            enableDamping
            target={[0, aim, 0]}
            autoRotate={spin}
            autoRotateSpeed={0.5}
          />
        </XR>
      </Canvas>

      <div className="cls-top">
        <button className="backbtn" onClick={onBack}>← Site</button>
        <span className="cls-title">🏛️ {building.name}</span>
        <button
          className="grove-quality"
          onClick={() => setMode((m) => (m === "ultra" ? "normal" : "ultra"))}
          title="View mode — Normal is the low-end baseline, Ultra is the full 3D scene"
        >
          {mode === "ultra" ? "✨ Ultra" : "🍃 Normal"}
        </button>
        {vrSupported && (
          <button className="vr-btn cls-vr" onClick={() => { setMode("ultra"); store.enterVR(); }}>🥽 VR</button>
        )}
      </div>

      <button className="bld-spin" onClick={() => setSpin((v) => !v)}>
        {spin ? "⏸ Stop turning" : "▶ Turn"}
      </button>

      <div className="bld-panel">
        <div className="bld-head">
          <b>{building.name}</b>
          <span className="khmer">{building.khmer}</span>
        </div>
        <div className="bld-sub">{building.english} · {building.site}</div>
        {building.about.map((p) => (
          <p key={p.slice(0, 24)} className="bld-about">{p}</p>
        ))}
        <ul className="bld-facts">
          {building.facts.map((f) => (
            <li key={f.label}><span>{f.label}</span><b>{f.value}</b></li>
          ))}
        </ul>
        <p className="bld-note">
          Modelled from photographs of the real building — the massing is an informed
          approximation, not survey data. Corrections welcome.
        </p>
        <button className="bld-map" onClick={onBackToMap}>← Back to the map</button>
      </div>
    </div>
  );
}

function Ground() {
  const grass = useMemo(() => grassTexture(30), []);
  const pave = useMemo(() => paveTexture(metresRepeat(156, 156, PAVER_M)[0]), []);
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.06, 0]} receiveShadow>
        <planeGeometry args={[900, 900]} />
        <meshStandardMaterial map={grass} roughness={1} />
      </mesh>
      {/* the apron sits over the lawn — offset so the two can't fight for depth */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]} receiveShadow>
        <circleGeometry args={[78, 48]} />
        <meshStandardMaterial
          map={pave} roughness={1}
          polygonOffset polygonOffsetFactor={-2} polygonOffsetUnits={-2}
        />
      </mesh>
    </>
  );
}

function VrImpliesUltra({ onEnter }: { onEnter: () => void }) {
  const inXR = useXR((s) => s.session != null);
  useEffect(() => { if (inXR) onEnter(); }, [inXR, onEnter]);
  return null;
}
