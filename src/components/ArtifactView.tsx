import { useState } from "react";
import { Viewer } from "./Viewer";
import type { Artifact } from "../artifacts";

/**
 * Inspect a single Khmer artifact in 3D — orbit it, tap its parts to learn how
 * it works, and read what it's for. Viewable in plain view or in VR (the Viewer
 * provides the Enter-VR button and headset locomotion). Educational first.
 */
export function ArtifactView({ artifact, onBack }: { artifact: Artifact; onBack: () => void }) {
  const [poiId, setPoiId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const pois = artifact.pois;
  const activePoi = pois.find((p) => p.id === poiId) ?? null;

  return (
    <>
      <Viewer
        modelUrl={artifact.model}
        blurb={artifact.blurb}
        pois={pois}
        activePoi={activePoi}
        onSelectPoi={(id) => setPoiId(id)}
        mode="orbit"
      />

      <button className="backbtn" onClick={onBack}>
        ← Tools
      </button>

      {activePoi ? (
        <div className="poi-panel">
          <div className="poi-panel-head">
            <span className="poi-count">Part of the {artifact.name}</span>
            <div className="poi-head-actions">
              <button className="poi-close" onClick={() => setPoiId(null)}>
                ✕ Overview
              </button>
            </div>
          </div>
          <h2>
            {activePoi.title}
            {activePoi.khmer && <span className="khmer"> {activePoi.khmer}</span>}
          </h2>
          <p>{activePoi.info}</p>
        </div>
      ) : (
        <div className={expanded ? "artifact-panel expanded" : "artifact-panel"}>
          <div className="artifact-head">
            <div>
              <span className="tag">{artifact.category}</span>
              <h1>
                {artifact.khmer} <span className="artifact-roman">{artifact.name}</span>
              </h1>
              <p className="artifact-en">{artifact.english}</p>
            </div>
            <button className="artifact-toggle" onClick={() => setExpanded((v) => !v)}>
              {expanded ? "▼ Close" : "ⓘ Learn"}
            </button>
          </div>

          {expanded ? (
            <>
              <p className="artifact-story">{artifact.story}</p>
              <h3>What it's used for</h3>
              <ul className="artifact-uses">
                {artifact.utilities.map((u) => (
                  <li key={u}>{u}</li>
                ))}
              </ul>
              <p className="artifact-origin">
                <b>Where it's from:</b> {artifact.origin}
              </p>
              <p className="artifact-credit">
                3D model: stylized stand-in by the CamboVerse Center · CC-BY-4.0 — pending a real
                capture from a village potter.
              </p>
            </>
          ) : (
            <p className="artifact-blurb">{artifact.blurb}</p>
          )}

          <p className="artifact-hint">◍ Tap a part of the pot to learn about it · 🥽 or view it in VR</p>
        </div>
      )}
    </>
  );
}
