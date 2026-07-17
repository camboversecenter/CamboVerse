import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { createXRStore, XR, XROrigin, useXR } from "@react-three/xr";
import { useEffect, useMemo, useState } from "react";
import {
  DAY_COLORS, VARIETIES, FASHION_ERAS, FASHION_CREDENTIAL, type Outfit,
} from "../fashion";
import { claimCredential, getIdentity, earnedAchievements } from "../lib/identity";
import { FashionFigure } from "./FashionFigure";
import { FashionTryOn } from "./FashionTryOn";

/**
 * Khmer Traditional Fashion (សម្លៀកបំពាក់ខ្មែរ) — dress a procedural figure and
 * learn Khmer clothing three ways: the seven-day colour custom, the varieties of
 * garment, and how dress changed through the ages. Explorable in 3D and VR.
 */
type Mode = "day" | "variety" | "ages";

export function FashionView({ onBackToMap }: { onBackToMap: () => void }) {
  const store = useMemo(() => createXRStore({ emulate: false }), []);
  const [vrSupported, setVrSupported] = useState(false);
  const [mode, setMode] = useState<Mode>("day");
  const [tryOn, setTryOn] = useState(false);

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

      <button className="fash-try" onClick={() => setTryOn(true)}>🤳 Try it on</button>

      {tryOn && <FashionTryOn onClose={() => setTryOn(false)} initialColor={outfit.topColor} />}

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
