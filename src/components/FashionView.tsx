import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { createXRStore, XR, XROrigin, useXR } from "@react-three/xr";
import { useEffect, useMemo, useState } from "react";
import {
  DAY_COLORS, VARIETIES, FASHION_ERAS, FASHION_CREDENTIAL, type Outfit,
} from "../fashion";
import { claimCredential, getIdentity, earnedAchievements } from "../lib/identity";

/**
 * Khmer Traditional Fashion (សម្លៀកបំពាក់ខ្មែរ) — dress a procedural figure and
 * learn Khmer clothing three ways: the seven-day colour custom, the varieties of
 * garment, and how dress changed through the ages. Explorable in 3D and VR.
 */
type Mode = "day" | "variety" | "ages";
const SKIN = "#c98a5a";

export function FashionView({ onBackToMap }: { onBackToMap: () => void }) {
  const store = useMemo(() => createXRStore({ emulate: false }), []);
  const [vrSupported, setVrSupported] = useState(false);
  const [mode, setMode] = useState<Mode>("day");

  const today = new Date().getDay(); // 0=Sun … 6=Sat
  const [dayI, setDayI] = useState(today);
  const [varI, setVarI] = useState(0);
  const [eraI, setEraI] = useState(FASHION_ERAS.length - 1); // start in the modern day
  const [seenEras, setSeenEras] = useState<Set<string>>(new Set([FASHION_ERAS[FASHION_ERAS.length - 1].id]));
  const [earned, setEarned] = useState(false);

  useEffect(() => {
    const xr = (navigator as Navigator & { xr?: { isSessionSupported(m: string): Promise<boolean> } }).xr;
    xr?.isSessionSupported("immersive-vr").then(setVrSupported).catch(() => setVrSupported(false));
  }, []);
  useEffect(() => {
    let live = true;
    (async () => {
      const set = await earnedAchievements(await getIdentity(false));
      if (live) setEarned(set.has(FASHION_CREDENTIAL));
    })();
    return () => { live = false; };
  }, []);

  // Touring every era earns a gentle "through the ages" credential.
  useEffect(() => {
    if (seenEras.size === FASHION_ERAS.length && !earned) {
      setEarned(true);
      claimCredential(FASHION_CREDENTIAL, `eras:${seenEras.size}`);
    }
  }, [seenEras, earned]);

  const day = DAY_COLORS[dayI];
  const variety = VARIETIES[varI];
  const era = FASHION_ERAS[eraI];

  const outfit: Outfit =
    mode === "day"
      ? { skirt: day.color, top: "sbai", topColor: day.color, gold: true, skirtStyle: "skirt" }
      : mode === "variety"
        ? variety.outfit
        : era.outfit;

  const pickEra = (i: number) => {
    setEraI(i);
    setSeenEras((s) => new Set(s).add(FASHION_ERAS[i].id));
  };

  return (
    <div className="fashion">
      <Canvas dpr={[1, 2]} camera={{ position: [0, 1.4, 3.4], fov: 45 }} gl={{ antialias: true }} shadows>
        <XR store={store}>
          <color attach="background" args={["#efe7dc"]} />
          <ambientLight intensity={0.9} />
          <hemisphereLight args={["#fff6e6", "#8a7a5a", 0.5]} />
          <directionalLight position={[3, 6, 4]} intensity={1.1} castShadow shadow-mapSize={[1024, 1024]} />
          {/* pedestal */}
          <mesh position={[0, 0.05, 0]} receiveShadow>
            <cylinderGeometry args={[0.8, 0.9, 0.1, 32]} />
            <meshStandardMaterial color="#d8cbb0" roughness={1} />
          </mesh>
          <FashionFigure outfit={outfit} />
          <XROrigin position={[0, 1.1, 2.6]} />
          <Nav />
        </XR>
      </Canvas>

      <div className="cls-top">
        <button className="backbtn" onClick={onBackToMap}>← Map</button>
        <span className="cls-title">👗 Khmer Fashion</span>
        {vrSupported && <button className="vr-btn cls-vr" onClick={() => store.enterVR()}>🥽 VR</button>}
      </div>

      <div className="fash-modes">
        <button className={mode === "day" ? "fash-seg on" : "fash-seg"} onClick={() => setMode("day")}>🎨 Colour by day</button>
        <button className={mode === "variety" ? "fash-seg on" : "fash-seg"} onClick={() => setMode("variety")}>👚 Varieties</button>
        <button className={mode === "ages" ? "fash-seg on" : "fash-seg"} onClick={() => setMode("ages")}>⏳ Through the ages</button>
      </div>

      {mode === "day" && (
        <div className="fash-panel" style={{ borderColor: day.color }}>
          <div className="fash-swatches">
            {DAY_COLORS.map((d, i) => (
              <button
                key={d.day}
                className={`fash-swatch${i === dayI ? " on" : ""}${i === today ? " today" : ""}`}
                style={{ background: d.color }}
                onClick={() => setDayI(i)}
                aria-label={d.day}
                title={`${d.day}${i === today ? " (today)" : ""}`}
              />
            ))}
          </div>
          <div className="fash-info-head">
            <span className="khmer">{day.khmer}</span>
            <b>{day.day}</b>
            {dayI === today && <span className="fash-today">today</span>}
          </div>
          <div className="fash-daycolor" style={{ color: day.color }}>{day.colorName}</div>
          <p className="fash-desc">
            By Khmer custom each day of the week has its colour (ពណ៌ប្រចាំថ្ងៃ). Dressing in the day's
            colour — in a sbai and sampot — brings good fortune; you'll still see it at weddings, at the
            palace, and on holy days.
          </p>
          <p className="fash-note">Traditional seven-day colours · variations exist — verify with Khmer elders.</p>
        </div>
      )}

      {mode === "variety" && (
        <div className="fash-panel" style={{ borderColor: "#c8912e" }}>
          <div className="fash-chips">
            {VARIETIES.map((v, i) => (
              <button key={v.id} className={i === varI ? "fash-chip on" : "fash-chip"} onClick={() => setVarI(i)}>
                <span className="khmer">{v.khmer}</span>
              </button>
            ))}
          </div>
          <div className="fash-info-head">
            <span className="khmer">{variety.khmer}</span> <b>{variety.name}</b>
          </div>
          <div className="fash-en">{variety.english}</div>
          <p className="fash-desc">{variety.desc}</p>
          <p className="fash-note">A starting set — many more garments to add (see TODO.md).</p>
        </div>
      )}

      {mode === "ages" && (
        <div className="fash-panel" style={{ borderColor: "#8a5a3a" }}>
          <div className="fash-eras">
            {FASHION_ERAS.map((e, i) => (
              <button key={e.id} className={i === eraI ? "fash-era on" : "fash-era"} onClick={() => pickEra(i)}>
                {e.years.split("–")[0]}
              </button>
            ))}
          </div>
          <div className="fash-info-head">
            <span className="khmer">{era.khmer}</span> <b>{era.name}</b>
            <span className="fash-years">{era.years}</span>
          </div>
          <p className="fash-desc">{era.desc}</p>
          <p className="fash-note">
            {earned
              ? "You've toured Khmer fashion through the ages — a stamp is in your Heritage Passport."
              : `Visit every era to earn a Heritage Passport stamp · ${seenEras.size}/${FASHION_ERAS.length}`}
          </p>
        </div>
      )}
    </div>
  );
}

/* ---------- the dressed figure ---------- */

function FashionFigure({ outfit }: { outfit: Outfit }) {
  const tone = outfit.tone ?? SKIN;
  const covered = outfit.top === "blouse" || outfit.top === "shirt";
  const sleeve = covered ? outfit.topColor : tone;
  const legColor = outfit.legs ?? tone;
  const kben = outfit.skirtStyle === "kben";

  return (
    <group position={[0, 0.1, 0]}>
      {/* legs */}
      {[-0.13, 0.13].map((x) => (
        <group key={x}>
          <mesh position={[x, 0.32, 0]} castShadow>
            <capsuleGeometry args={[0.085, 0.6, 4, 8]} />
            <meshStandardMaterial color={legColor} roughness={0.9} />
          </mesh>
          <mesh position={[x, 0.02, 0.05]} castShadow>
            <boxGeometry args={[0.14, 0.06, 0.24]} />
            <meshStandardMaterial color="#5b4630" roughness={1} />
          </mesh>
        </group>
      ))}

      {/* sampot — a wrap skirt, or a shorter chang-kben */}
      <mesh position={[0, kben ? 0.72 : 0.5, 0]} castShadow>
        <coneGeometry args={[kben ? 0.28 : 0.42, kben ? 0.46 : 0.92, 20, 1, true]} />
        <meshStandardMaterial color={outfit.skirt} roughness={0.85} side={2} />
      </mesh>

      {/* hips */}
      <mesh position={[0, 0.92, 0]} castShadow>
        <capsuleGeometry args={[0.16, 0.1, 4, 10]} />
        <meshStandardMaterial color={covered ? outfit.topColor : tone} roughness={0.85} />
      </mesh>

      {/* torso */}
      <mesh position={[0, 1.22, 0]} castShadow>
        <capsuleGeometry args={[0.17, 0.44, 6, 12]} />
        <meshStandardMaterial color={covered ? outfit.topColor : tone} roughness={0.85} />
      </mesh>

      {/* arms */}
      {[-0.26, 0.26].map((x) => (
        <mesh key={x} position={[x, 1.16, 0]} rotation={[0, 0, x < 0 ? 0.12 : -0.12]} castShadow>
          <capsuleGeometry args={[0.055, 0.5, 4, 8]} />
          <meshStandardMaterial color={sleeve} roughness={0.85} />
        </mesh>
      ))}

      {/* sbai — a diagonal sash across the torso */}
      {outfit.top === "sbai" && (
        <mesh position={[0, 1.24, 0.12]} rotation={[0, 0, 0.9]} castShadow>
          <boxGeometry args={[0.7, 0.22, 0.14]} />
          <meshStandardMaterial color={outfit.topColor} roughness={0.7} />
        </mesh>
      )}

      {/* krama — a checkered scarf around the neck */}
      {outfit.krama && (
        <group position={[0, 1.5, 0.02]}>
          <mesh castShadow>
            <torusGeometry args={[0.17, 0.05, 8, 20]} />
            <meshStandardMaterial color={outfit.krama} roughness={0.9} />
          </mesh>
          {[0, 1, 2].map((i) => (
            <mesh key={i} position={[0, -0.06 - i * 0.12, 0.16]} castShadow>
              <boxGeometry args={[0.14, 0.09, 0.03]} />
              <meshStandardMaterial color={i % 2 ? "#efe7dc" : outfit.krama!} roughness={0.9} />
            </mesh>
          ))}
        </group>
      )}

      {/* head + hair */}
      <mesh position={[0, 1.62, 0]} castShadow>
        <sphereGeometry args={[0.145, 18, 18]} />
        <meshStandardMaterial color={tone} roughness={0.75} />
      </mesh>
      <mesh position={[0, 1.68, -0.03]} castShadow>
        <sphereGeometry args={[0.16, 16, 16]} />
        <meshStandardMaterial color="#221a12" roughness={0.9} />
      </mesh>

      {/* ceremonial gold — belt, crown (mkot), bracelets */}
      {outfit.gold && (
        <group>
          <mesh position={[0, 0.98, 0]}>
            <torusGeometry args={[0.18, 0.028, 8, 24]} />
            <meshStandardMaterial color="#d9b44a" metalness={0.4} roughness={0.4} />
          </mesh>
          {/* mkot crown */}
          <group position={[0, 1.8, 0]}>
            <mesh castShadow>
              <coneGeometry args={[0.14, 0.26, 10]} />
              <meshStandardMaterial color="#d9b44a" metalness={0.4} roughness={0.4} />
            </mesh>
            <mesh position={[0, 0.22, 0]}>
              <coneGeometry args={[0.04, 0.18, 8]} />
              <meshStandardMaterial color="#e6c65a" metalness={0.4} roughness={0.35} />
            </mesh>
          </group>
          {/* wrist bangles */}
          {[-0.31, 0.31].map((x) => (
            <mesh key={x} position={[x, 0.92, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[0.06, 0.016, 6, 16]} />
              <meshStandardMaterial color="#d9b44a" metalness={0.4} roughness={0.4} />
            </mesh>
          ))}
        </group>
      )}
    </group>
  );
}

function Nav() {
  const inXR = useXR((s) => s.session != null);
  if (inXR) return null;
  return (
    <OrbitControls
      enablePan={false}
      minDistance={1.8}
      maxDistance={6}
      maxPolarAngle={Math.PI / 1.9}
      enableDamping
      dampingFactor={0.08}
      target={[0, 1, 0]}
      autoRotate
      autoRotateSpeed={0.8}
    />
  );
}
