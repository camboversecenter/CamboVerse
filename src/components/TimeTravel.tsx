import { useState } from "react";
import { ERAS } from "../history";
import type { Spot } from "../spots";

/**
 * "Back in Time" — a journey through the ages of Cambodia, laid over the site so
 * it feels like the place itself is time-shifting. Scrub the timeline, and each
 * era tints the scene and tells the story of that generation.
 */
export function TimeTravel({ spot, onClose }: { spot: Spot; onClose: () => void }) {
  const [i, setI] = useState(2); // start at the Angkor golden age
  const era = ERAS[i];
  const go = (d: number) => setI((v) => Math.min(ERAS.length - 1, Math.max(0, v + d)));

  return (
    <div className="timetravel">
      {/* Era-coloured veil over the 3D scene */}
      <div
        className="tt-veil"
        style={{
          background: `radial-gradient(120% 90% at 50% 0%, transparent 30%, ${era.mood}66 100%)`,
        }}
      />

      <div className="tt-top">
        <span className="tt-title">⏳ Back in Time · {spot.name}</span>
        <button className="tt-close" onClick={onClose} aria-label="Leave the time journey">
          ✕
        </button>
      </div>

      <div className="tt-panel" style={{ borderColor: era.mood }}>
        {/* Timeline rail */}
        <div className="tt-rail">
          {ERAS.map((e, j) => (
            <button
              key={e.id}
              className={j === i ? "tt-chip on" : "tt-chip"}
              style={j === i ? { background: e.mood, borderColor: e.mood, color: "#10140b" } : undefined}
              onClick={() => setI(j)}
            >
              {e.years.split("–")[0]}
            </button>
          ))}
        </div>

        <div className="tt-head">
          <span className="tt-age" style={{ color: era.mood }}>
            {era.age}
          </span>
          <span className="tt-years">{era.years}</span>
        </div>
        <h2>
          {era.name} <span className="khmer">{era.khmer}</span>
        </h2>
        <p className="tt-blurb">{era.blurb}</p>
        <p className="tt-story">{era.story}</p>
        <ul className="tt-highlights">
          {era.highlights.map((h) => (
            <li key={h} style={{ borderColor: era.mood }}>
              {h}
            </li>
          ))}
        </ul>

        <div className="tt-nav">
          <button onClick={() => go(-1)} disabled={i === 0}>
            ◂ Earlier
          </button>
          <span className="tt-count">
            {i + 1} / {ERAS.length}
          </span>
          <button onClick={() => go(1)} disabled={i === ERAS.length - 1}>
            Later ▸
          </button>
        </div>
      </div>
    </div>
  );
}
