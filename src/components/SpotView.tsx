import { useRef, useState } from "react";
import { Viewer } from "./Viewer";
import { WalkControls } from "./WalkControls";
import type { WalkInput } from "./FirstPersonControls";
import type { Spot } from "../spots";

/** An individual heritage site: orbit or walk it, visit its points of interest. */
export function SpotView({ spot, onBack }: { spot: Spot; onBack: () => void }) {
  const [splat, setSplat] = useState(false);
  const [poiId, setPoiId] = useState<string | null>(null);
  const [mode, setMode] = useState<"orbit" | "walk">("orbit");
  const walkInput = useRef<WalkInput>({ move: { x: 0, y: 0 }, look: { dx: 0, dy: 0 } });

  const pois = spot.pois;
  const idx = pois ? pois.findIndex((p) => p.id === poiId) : -1;
  const activePoi = idx >= 0 && pois ? pois[idx] : null;
  const step = (d: number) => {
    if (!pois || pois.length === 0) return;
    const base = idx < 0 ? 0 : (idx + d + pois.length) % pois.length;
    setPoiId(pois[base].id);
  };
  const toggleMode = () => {
    setPoiId(null);
    setMode((m) => (m === "orbit" ? "walk" : "orbit"));
  };

  const walking = mode === "walk";

  return (
    <>
      <Viewer
        modelUrl={spot.model}
        blurb={spot.blurb}
        water={spot.water}
        splatUrl={spot.splat}
        splat={splat && !!spot.splat}
        pois={pois}
        activePoi={activePoi}
        onSelectPoi={setPoiId}
        mode={mode}
        walkInput={walkInput}
      />

      {walking && <WalkControls input={walkInput} />}

      <button className="backbtn" onClick={onBack}>
        ← Map
      </button>

      {spot.splat && !walking && (
        <button className="mode-toggle" onClick={() => setSplat((s) => !s)}>
          {splat ? "◼ Model" : "◍ Photoreal"}
        </button>
      )}

      <button className="walk-toggle" onClick={toggleMode}>
        {walking ? "⟳ Orbit" : "🚶 Walk in"}
      </button>

      {!walking &&
        (activePoi && pois ? (
          <div className="poi-panel">
            <div className="poi-panel-head">
              <span className="poi-count">
                {idx + 1} / {pois.length}
              </span>
              <button className="poi-close" onClick={() => setPoiId(null)}>
                ✕ Explore freely
              </button>
            </div>
            <h2>
              {activePoi.title}
              {activePoi.khmer && <span className="khmer"> {activePoi.khmer}</span>}
            </h2>
            <p>{activePoi.info}</p>
            <div className="poi-nav">
              <button onClick={() => step(-1)}>◂ Prev</button>
              <button onClick={() => step(1)}>Next ▸</button>
            </div>
          </div>
        ) : (
          <div className="hud">
            {!spot.live && <span className="tag">Coming soon · preview model</span>}
            {splat && spot.splat && <span className="tag">Gaussian splat · prototype</span>}
            <h1>
              {spot.name} <span className="khmer">{spot.khmer}</span>
            </h1>
            <p>
              {spot.province} · {spot.blurb}
            </p>
            {pois && pois.length > 0 && (
              <p className="poi-hint">◍ Tap a marker to visit, or 🚶 walk in to explore freely.</p>
            )}
          </div>
        ))}
    </>
  );
}
