import { Viewer } from "./components/Viewer";

export function App() {
  return (
    <>
      <Viewer />
      <div className="hud">
        <span className="tag">Prototype · v0.1</span>
        <h1>CamboVerse</h1>
        <p>
          Rendering-stack prototype. Drag to orbit, pinch to zoom. This
          placeholder stands in for a photoreal heritage capture — the next step
          is loading a real glTF / Gaussian-splat scan.
        </p>
      </div>
    </>
  );
}
