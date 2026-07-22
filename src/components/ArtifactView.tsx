import { useState } from "react";
import { Viewer } from "./Viewer";
import { METHOD_LABEL, DEFAULT_PROVENANCE, type Artifact } from "../artifacts";

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
        onSelectPoi={(id) => {
          setPoiId(id);
          playInstrumentSound(artifact.id);
        }}
        mode="orbit"
        float={true}
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
              <h3>Good to know</h3>
              <ul className="artifact-uses">
                {artifact.utilities.map((u) => (
                  <li key={u}>{u}</li>
                ))}
              </ul>
              <p className="artifact-origin">
                <b>Where it's from:</b> {artifact.origin}
              </p>
              {(() => {
                const prov = artifact.provenance ?? DEFAULT_PROVENANCE;
                const ai = prov.method === "ai-image";
                return (
                  <>
                    <p className="artifact-credit">
                      <span className={`artifact-prov ${prov.method}`}>
                        {ai ? "🤖 " : ""}
                        {METHOD_LABEL[prov.method]}
                      </span>
                      {prov.tool ? ` · ${prov.tool}` : ""}
                      {prov.by ? ` · ${prov.by}` : ""} · {prov.license ?? "CC-BY-4.0"}
                      {prov.sourcePhoto ? ` · source photo: ${prov.sourcePhoto}` : ""}
                    </p>
                    {ai && (
                      <p className="artifact-ainote">
                        A plausible 3D reconstruction generated from a single photo — engaging to explore,
                        but <b>not a measured record</b> of the real object.
                      </p>
                    )}
                    {prov.method === "procedural" && (
                      <p className="artifact-ainote">
                        A stylised stand-in — pending a real capture from an artisan or museum.
                      </p>
                    )}
                  </>
                );
              })()}
            </>
          ) : (
            <p className="artifact-blurb">{artifact.blurb}</p>
          )}

          <p className="artifact-hint">◍ Tap a part to learn about it · 🥽 or view it in VR</p>
        </div>
      )}
    </>
  );
}

function playInstrumentSound(artifactId: string) {
  const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioContext) return;
  const ctx = new AudioContext();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  
  if (artifactId === "roneat") {
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.5);
  } else if (artifactId === "skor") {
    osc.type = "triangle";
    osc.frequency.setValueAtTime(150, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.3);
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.8, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.3);
  } else {
    // Generic UI pop for non-musical artifacts
    osc.type = "sine";
    osc.frequency.setValueAtTime(600, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.1);
  }
}
