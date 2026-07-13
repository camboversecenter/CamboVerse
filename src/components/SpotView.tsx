import { Viewer } from "./Viewer";
import type { Spot } from "../spots";

/** An individual heritage site: the immersive viewer plus a way back to the map. */
export function SpotView({ spot, onBack }: { spot: Spot; onBack: () => void }) {
  return (
    <>
      <Viewer modelUrl={spot.model} blurb={spot.blurb} water={spot.water} />

      <button className="backbtn" onClick={onBack}>
        ← Map
      </button>

      <div className="hud">
        {!spot.live && <span className="tag">Coming soon · preview model</span>}
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
