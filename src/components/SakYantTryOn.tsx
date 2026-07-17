import { useEffect, useMemo, useRef, useState } from "react";
import { drawYantra, YANTRAS } from "../sakyant";
import { claimCredential } from "../lib/identity";
import { makePostcard } from "../lib/postcard";

/**
 * Preview a yant on your own skin. The front camera runs a live feed and the
 * chosen yant is composited on top as "ink" (multiply blend) — drag to place it,
 * and use the sliders to size and rotate. No camera? A faux-skin panel stands in
 * so the preview still works. Everything runs on-device: nothing is uploaded,
 * and the snapshot is yours to keep. A preview is not a real Sak Yant — the hub
 * points you to a genuine master to receive a blessed one.
 */
const INKS = [
  { id: "black", label: "Black", color: "#1a1512" },
  { id: "red", label: "Red", color: "#7c1f16" },
];

export function SakYantTryOn({ yantraId, onClose }: { yantraId: string; onClose: () => void }) {
  const [inkI, setInkI] = useState(0);
  const [scale, setScale] = useState(0.5);
  const [rot, setRot] = useState(0);
  const [hasCam, setHasCam] = useState<boolean | null>(null);
  const [postcard, setPostcard] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const posRef = useRef({ x: 0.5, y: 0.5 });
  const scaleRef = useRef(scale);
  const rotRef = useRef(rot);
  const draggingRef = useRef(false);
  const claimedRef = useRef(false);
  scaleRef.current = scale;
  rotRef.current = rot;

  const ink = INKS[inkI].color;

  // Pre-render the yant to a transparent decal canvas (re-made when it changes).
  const decal = useMemo(() => {
    const d = document.createElement("canvas");
    d.width = 512;
    d.height = 512;
    const ctx = d.getContext("2d");
    if (ctx) {
      ctx.translate(256, 256);
      drawYantra(ctx, yantraId, 470, ink);
    }
    return d;
  }, [yantraId, ink]);
  const decalRef = useRef(decal);
  decalRef.current = decal;

  // Camera + render loop (the loop also drives the faux-skin fallback).
  useEffect(() => {
    let live = true;

    (async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error("no camera");
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 720 }, height: { ideal: 960 } },
          audio: false,
        });
        if (!live) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        const v = videoRef.current!;
        v.srcObject = stream;
        await v.play().catch(() => {});
        setHasCam(true);
      } catch {
        if (live) setHasCam(false);
      }
    })();

    const loop = () => {
      if (!live) return;
      const canvas = canvasRef.current;
      const video = videoRef.current;
      if (canvas) {
        const ctx = canvas.getContext("2d");
        const live2d = ctx != null;
        const camReady = video && video.readyState >= 2 && video.videoWidth > 0;
        const w = camReady ? video!.videoWidth : 720;
        const h = camReady ? video!.videoHeight : 960;
        if (canvas.width !== w) canvas.width = w;
        if (canvas.height !== h) canvas.height = h;
        if (live2d) {
          if (camReady) {
            // mirrored selfie background
            ctx.save();
            ctx.translate(w, 0);
            ctx.scale(-1, 1);
            ctx.drawImage(video!, 0, 0, w, h);
            ctx.restore();
          } else {
            // faux-skin gradient stand-in
            const g = ctx.createLinearGradient(0, 0, w, h);
            g.addColorStop(0, "#e7b98f");
            g.addColorStop(1, "#c98a5a");
            ctx.fillStyle = g;
            ctx.fillRect(0, 0, w, h);
          }
          // the ink, composited like a tattoo
          const p = posRef.current;
          const size = Math.min(w, h) * scaleRef.current;
          ctx.save();
          ctx.globalAlpha = 0.9;
          ctx.globalCompositeOperation = "multiply";
          ctx.translate(p.x * w, p.y * h);
          ctx.rotate(rotRef.current);
          ctx.drawImage(decalRef.current, -size / 2, -size / 2, size, size);
          ctx.restore();
        }
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      live = false;
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, []);

  // Drag to place the yant.
  const moveTo = (clientX: number, clientY: number) => {
    const c = canvasRef.current;
    if (!c) return;
    const r = c.getBoundingClientRect();
    posRef.current = {
      x: Math.min(1, Math.max(0, (clientX - r.left) / r.width)),
      y: Math.min(1, Math.max(0, (clientY - r.top) / r.height)),
    };
  };
  const onDown = (e: React.PointerEvent) => {
    draggingRef.current = true;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    moveTo(e.clientX, e.clientY);
  };
  const onMove = (e: React.PointerEvent) => {
    if (draggingRef.current) moveTo(e.clientX, e.clientY);
  };
  const onUp = () => { draggingRef.current = false; };

  const snap = () => {
    const src = canvasRef.current;
    if (!src) return;
    setPostcard(makePostcard(src, "សាក់យ័ន្ត", "My Sak Yant preview · CamboVerse"));
    if (!claimedRef.current) {
      claimedRef.current = true;
      claimCredential("sakyant:tried-it-on", `yant:${yantraId}`).catch(() => {});
    }
  };

  const name = YANTRAS.find((y) => y.id === yantraId)?.name ?? "yant";

  return (
    <div className="sy-tryon">
      <video ref={videoRef} playsInline muted style={{ display: "none" }} />
      <canvas
        ref={canvasRef}
        className="sy-canvas"
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
      />

      <div className="tryon-top">
        <button className="backbtn" onClick={onClose}>✕ Close</button>
        <span className="tryon-title">🪷 {name} — preview</span>
      </div>

      {hasCam === false && (
        <div className="sy-cam-note">Camera off — previewing on a skin swatch. Drag the yant to place it.</div>
      )}
      {hasCam !== false && (
        <div className="sy-cam-note">Drag the yant onto your skin. Runs on your phone — nothing is uploaded.</div>
      )}

      <div className="tryon-controls">
        <div className="sy-inks">
          {INKS.map((k, i) => (
            <button
              key={k.id}
              className={`sy-ink${i === inkI ? " on" : ""}`}
              style={{ background: k.color }}
              onClick={() => setInkI(i)}
              aria-label={`${k.label} ink`}
              title={`${k.label} ink`}
            />
          ))}
        </div>
        <label className="sy-slider">
          <span>Size</span>
          <input type="range" min={0.2} max={1.1} step={0.01} value={scale} onChange={(e) => setScale(+e.target.value)} />
        </label>
        <label className="sy-slider">
          <span>Rotate</span>
          <input type="range" min={-3.14} max={3.14} step={0.01} value={rot} onChange={(e) => setRot(+e.target.value)} />
        </label>
        <div className="tryon-actions">
          <button className="tryon-snap" onClick={snap}>📸 Snapshot</button>
        </div>
        <p className="tryon-note">
          A preview only — a real Sak Yant is applied and blessed by a Khmer master. Find one under
          “Get one for real”.
        </p>
      </div>

      {postcard && (
        <div className="tryon-postcard" onClick={() => setPostcard(null)}>
          <div className="pc-card" onClick={(e) => e.stopPropagation()}>
            <img src={postcard} alt="Your Sak Yant preview postcard" />
            <div className="pc-actions">
              <a className="pc-save" href={postcard} download="camboverse-sakyant.png">💾 Save</a>
              <button className="pc-close" onClick={() => setPostcard(null)}>Done</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
