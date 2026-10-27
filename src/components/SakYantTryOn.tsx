import { useEffect, useMemo, useRef, useState } from "react";
import { drawYantra, YANTRAS } from "../sakyant";
import { claimCredential } from "../lib/identity";
import { makePostcard } from "../lib/postcard";
import { useYantraArtwork } from "./useYantraArtwork";

/**
 * Preview a yant on your own skin. The front camera runs a live feed and the
 * chosen yant is composited on top as "ink" (multiply blend) drag to place it,
 * and use the sliders to size and rotate. No camera? A faux-skin panel stands in
 * so the preview still works. Everything runs on-device: nothing is uploaded,
 * and the snapshot is yours to keep. A preview is not a real Sak Yant the hub
 * points you to a genuine master to receive a blessed one.
 */
const INKS = [
  { id: "black", label: "Black", color: "#1a1512" },
  { id: "red", label: "Red", color: "#7c1f16" },
];

export function SakYantTryOn({ yantraId, onClose, initialInk = 0 }: { yantraId: string; onClose: () => void; initialInk?: number }) {
  const [inkI, setInkI] = useState(initialInk);
  const [scale, setScale] = useState(0.5);
  const [rot, setRot] = useState(0);
  const [hasCam, setHasCam] = useState<boolean | null>(false);
  const [cameraRequested, setCameraRequested] = useState(false);
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
  const {ready:artReady,error:artError,retry:retryArt}=useYantraArtwork(yantraId);

  // Pre-render the yant to a transparent decal canvas (re-made when it changes).
  const decal = useMemo(() => {
    const d = document.createElement("canvas");
    d.width = 512;
    d.height = 512;
    const ctx = d.getContext("2d");
    if (ctx && artReady) {
      ctx.translate(256, 256);
      drawYantra(ctx, yantraId, 470, ink);
    }
    return d;
  }, [yantraId, ink, artReady]);
  const decalRef = useRef(decal);
  decalRef.current = decal;

  // Camera is opt-in. Stop tracks on close, denial, or switching back to swatch.
  useEffect(() => {
    if (!cameraRequested) return;
    let live = true;
    setHasCam(null);
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
        await v.play();
        if (live) setHasCam(true);
      } catch {
        if (live) {
          streamRef.current?.getTracks().forEach(t=>t.stop());
          streamRef.current=null;
          setHasCam(false);
          setCameraRequested(false);
        }
      }
    })();
    return () => {
      live=false;
      streamRef.current?.getTracks().forEach(t=>t.stop());
      streamRef.current=null;
      if(videoRef.current) videoRef.current.srcObject=null;
    };
  },[cameraRequested]);

  useEffect(() => {
    let live = true;
    const loop = () => {
      if (!live) return;
      const canvas = canvasRef.current;
      const video = videoRef.current;
      if (canvas) {
        const ctx = canvas.getContext("2d");
        const live2d = ctx != null;
        const camReady = streamRef.current && video && video.readyState >= 2 && video.videoWidth > 0;
        // Match visible aspect ratio so a dragged mark stays under the pointer.
        const rect=canvas.getBoundingClientRect();
        const resolution=Math.min(1.5,960/Math.max(rect.width,rect.height,1));
        const w=Math.max(1,Math.round(rect.width*resolution));
        const h=Math.max(1,Math.round(rect.height*resolution));
        if (canvas.width !== w) canvas.width = w;
        if (canvas.height !== h) canvas.height = h;
        if (live2d) {
          if (camReady) {
            // mirrored selfie background
            ctx.save();
            ctx.translate(w, 0);
            ctx.scale(-1, 1);
            const zoom=Math.max(w/video!.videoWidth,h/video!.videoHeight);
            const vw=video!.videoWidth*zoom,vh=video!.videoHeight*zoom;
            ctx.drawImage(video!, (w-vw)/2, (h-vh)/2, vw, vh);
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
    setPostcard(makePostcard(src, "សាក់យ័ន្ត", "Illustrative study · inscriptions omitted · CamboVerse"));
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
        role="img"
        aria-label={`${name} placement preview`}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
      />

      <div className="tryon-top">
        <button className="backbtn" onClick={onClose}>✕ Close</button>
        <span className="tryon-title">🪷 {name} preview</span>
      </div>

      {hasCam === false && (
        <div className="sy-cam-note">Camera off previewing on a skin swatch. Drag the yant to place it.</div>
      )}
      {hasCam === null && <div className="sy-cam-note">Waiting for camera permission. The swatch stays available.</div>}
      {hasCam === true && (
        <div className="sy-cam-note">Drag the yant onto your skin. Runs on your phone nothing is uploaded.</div>
      )}

      <div className="tryon-controls">
        {!artReady && <p role="status" className="tryon-note">{artError ? <button className="pc-close" onClick={retryArt}>Retry loading drawing</button> : 'Loading drawing…'}</p>}
        <div className="sy-inks">
          {INKS.map((k, i) => (
            <button
              key={k.id}
              className={`sy-ink${i === inkI ? " on" : ""}`}
              style={{ background: k.color }}
              onClick={() => setInkI(i)}
              aria-label={`${k.label} ink`}
              aria-pressed={i === inkI}
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
          <button className="pc-close" onClick={()=>{posRef.current={x:0.5,y:0.5};setScale(0.5);setRot(0);}}>Reset placement</button>
          <button className="pc-close" onClick={()=>{setCameraRequested(v=>!v);setHasCam(false);}}>{cameraRequested ? 'Use swatch' : 'Use camera'}</button>
          <button className="tryon-snap" disabled={!artReady} onClick={snap}>📸 Snapshot</button>
        </div>
        <p className="tryon-note">
          Original illustration with sacred inscriptions omitted. This flat preview does not track your body.
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
