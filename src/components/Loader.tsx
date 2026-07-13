import { Html, useProgress } from "@react-three/drei";

/** In-scene loading indicator shown while the heritage model streams in. */
export function Loader() {
  const { progress, active } = useProgress();
  return (
    <Html center>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 10,
          color: "#f4ece0",
          font: "500 13px system-ui, sans-serif",
          userSelect: "none",
        }}
      >
        <div
          style={{
            width: 34,
            height: 34,
            borderRadius: "50%",
            border: "3px solid rgba(255,255,255,0.15)",
            borderTopColor: "#4c8a3f",
            animation: "cv-spin 0.8s linear infinite",
          }}
        />
        <span style={{ opacity: 0.85 }}>
          {active ? `Loading heritage… ${Math.round(progress)}%` : "Preparing…"}
        </span>
        <style>{"@keyframes cv-spin{to{transform:rotate(360deg)}}"}</style>
      </div>
    </Html>
  );
}
