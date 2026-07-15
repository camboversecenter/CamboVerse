import { useState } from "react";
import { ARTIFACTS } from "../artifacts";
import { ArtifactView } from "./ArtifactView";

/**
 * "Khmer Traditional Tools" — a small gallery of everyday Khmer objects you can
 * open and inspect in 3D (and VR). Educational: each teaches what the object is,
 * how it works, and how it's used. Grows as more artifacts are contributed.
 */
export function ToolsView({ onBackToMap }: { onBackToMap: () => void }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const open = ARTIFACTS.find((a) => a.id === openId) ?? null;

  if (open) return <ArtifactView artifact={open} onBack={() => setOpenId(null)} />;

  return (
    <div className="tools">
      <div className="tools-top">
        <button className="backbtn" onClick={onBackToMap}>
          ← Map
        </button>
        <span className="tools-title">🏺 Khmer Traditional Tools</span>
      </div>
      <p className="tools-intro">
        Everyday Khmer objects, in 3D. Tap one to explore it up close — orbit it, learn its parts,
        and see how it's used. View in VR with a headset.
      </p>
      <div className="tools-grid">
        {ARTIFACTS.map((a) => (
          <button key={a.id} className="tool-card" onClick={() => setOpenId(a.id)}>
            <span className="tool-card-km">{a.khmer}</span>
            <span className="tool-card-name">{a.name}</span>
            <span className="tool-card-en">{a.english}</span>
            <span className="tool-card-blurb">{a.blurb}</span>
            <span className="tool-card-cta">Explore in 3D →</span>
          </button>
        ))}
      </div>
    </div>
  );
}
