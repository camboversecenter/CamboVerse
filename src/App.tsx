import { Viewer } from "./components/Viewer";

export function App() {
  return (
    <>
      <Viewer />
      <div className="hud">
        <span className="tag">Prototype · v0.1</span>
        <h1>CamboVerse</h1>
        <p>
          Rendering-stack prototype. Drag to orbit, pinch to zoom. Now streaming
          an authored glTF model — next up is photoreal Gaussian-splat capture.
        </p>
      </div>
    </>
  );
}
