import { useState } from "react";
import { Viewer } from "./Viewer";
import type { Spot } from "../spots";

/** An individual heritage site: the immersive viewer plus a way back to the map. */
export function SpotView({ spot, onBack }: { spot: Spot; onBack: () => void }) {
  const [splat, setSplat] = useState(false);

  return (
    <>
      <Viewer
        modelUrl={spot.model}
        blurb={spot.blurb}
        water={spot.water}
        splatUrl={spot.splat}
        splat={splat && !!spot.splat}
      />

      <button className="backbtn" onClick={onBack}>
        ← Map
      </button>

      {spot.splat && (
        <button className="mode-toggle" onClick={() => setSplat((s) => !s)}>
          {splat ? "◼ Model" : "◍ Photoreal"}
        </button>
      )}

      <div className="hud">
        {!spot.live && <span className="tag">Coming soon · preview model</span>}
        {splat && spot.splat && <span className="tag">Gaussian splat · prototype</span>}
        <h1>
          {spot.name} <span className="khmer">{spot.khmer}</span>
        </h1>
        <p>
          {spot.province} · {spot.blurb}
        </p>
      </div>
    </>
  );
}
