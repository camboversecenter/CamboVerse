import { useEffect, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import type { FaceLandmarker } from "@mediapipe/tasks-vision";
import { DAY_COLORS, type Outfit } from "../fashion";
import { FashionFigure, SKIN_TONES, SKIN } from "./FashionFigure";
import { claimCredential } from "../lib/identity";

/**
 * "Try it on" — let a visitor wear Khmer dress virtually, two ways:
 *
 *  • Mirror (camera): the device's front camera plus MediaPipe FaceLandmarker
 *    (Apache-2.0, WASM + model vendored locally under /public/mediapipe) tracks
 *    the head *entirely on-device* and paints an apsara mkot crown, earrings, a
 *    gold collar, and a sbai onto the live selfie. Nothing is ever uploaded.
 *  • Avatar (no camera): dress a procedural figure — pick a skin tone and a
 *    colour — for phones without a camera, or for full privacy.
 *
 * Either way you can snap a postcard to keep. No AI server, no account, no data
 * leaving the phone — the try-on fits the $150-phone / 4G, self-contained,
 * consent-first brief.
 */
type Sub = "mirror" | "avatar";
type Status = "loading" | "ready" | "denied" | "unsupported";

const GOLD = "#d9b44a";
const GOLD_HI = "#f0d879";

export function FashionTryOn({
  onClose,
  initialColor = "#d23b30",
}: {
  onClose: () => void;
  initialColor?: string;
}) {
  const [sub, setSub] = useState<Sub>("mirror");
  const [status, setStatus] = useState<Status>("loading");
  const [color, setColor] = useState(initialColor);
  const [tone, setTone] = useState(SKIN);
  const [postcard, setPostcard] = useState<string | null>(null);

  const claimedRef = useRef(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const landmarkerRef = useRef<FaceLandmarker | null>(null);
  const rafRef = useRef<number | null>(null);
  const colorRef = useRef(color);
  colorRef.current = color;

  // ---- Mirror lifecycle: camera + on-device face tracking ----
  useEffect(() => {
    if (sub !== "mirror") return;
    let live = true;
    let lastTs = -1;
    setStatus("loading");

    const loop = () => {
      if (!live) return;
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const lm = landmarkerRef.current;
      if (video && canvas && lm && video.readyState >= 2) {
        const w = video.videoWidth || 640;
        const h = video.videoHeight || 480;
        if (canvas.width !== w) canvas.width = w;
        if (canvas.height !== h) canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          const ts = performance.now();
          // Mirror the whole frame so it reads like a looking-glass.
          ctx.save();
          ctx.translate(w, 0);
          ctx.scale(-1, 1);
          ctx.drawImage(video, 0, 0, w, h);
          let res = null;
          try {
            const stamp = ts > lastTs ? ts : lastTs + 1;
            lastTs = stamp;
            res = lm.detectForVideo(video, stamp);
          } catch {
            /* transient frame errors are ignored */
          }
          const pts = res?.faceLandmarks?.[0];
          if (pts) drawAdornments(ctx, pts, w, h, colorRef.current);
          ctx.restore();
        }
      }
      rafRef.current = requestAnimationFrame(loop);
    };

    (async () => {
      // Camera must be available and permitted.
      if (!navigator.mediaDevices?.getUserMedia) {
        if (live) setStatus("unsupported");
        return;
      }
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
          audio: false,
        });
      } catch {
        if (live) setStatus("denied");
        return;
      }
      if (!live) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      streamRef.current = stream;
      const video = videoRef.current!;
      video.srcObject = stream;
      await video.play().catch(() => {});

      // Load the tracker lazily (WASM + model are only fetched when a visitor
      // actually opens the mirror — protects the 4G budget).
      try {
        const { FilesetResolver, FaceLandmarker } = await import("@mediapipe/tasks-vision");
        const fileset = await FilesetResolver.forVisionTasks("/mediapipe/wasm");
        const lm = await FaceLandmarker.createFromOptions(fileset, {
          baseOptions: { modelAssetPath: "/mediapipe/face_landmarker.task" },
          runningMode: "VIDEO",
          numFaces: 1,
        });
        if (!live) {
          lm.close();
          return;
        }
        landmarkerRef.current = lm;
        setStatus("ready");
        loop();
      } catch {
        if (live) setStatus("unsupported");
      }
    })();

    return () => {
      live = false;
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      landmarkerRef.current?.close();
      landmarkerRef.current = null;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [sub]);

  // ---- Snapshot a postcard ----
  // Snapping your first look earns a gentle Heritage Passport stamp.
  const rewardOnce = () => {
    if (claimedRef.current) return;
    claimedRef.current = true;
    claimCredential("fashion:tried-it-on", `sub:${sub}`).catch(() => {});
  };
  const snapMirror = () => {
    const src = canvasRef.current;
    if (!src) return;
    setPostcard(makePostcard(src));
    rewardOnce();
  };
  const snapAvatar = () => {
    const src = document.querySelector<HTMLCanvasElement>(".fash-tryon .avatar-canvas canvas");
    if (!src) return;
    setPostcard(makePostcard(src));
    rewardOnce();
  };

  const outfit: Outfit = {
    skirt: color,
    top: "sbai",
    topColor: color,
    gold: true,
    skirtStyle: "skirt",
    tone,
  };

  return (
    <div className="fash-tryon">
      <video ref={videoRef} playsInline muted style={{ display: "none" }} />

      <div className="tryon-stage">
        {sub === "mirror" ? (
          <>
            <canvas ref={canvasRef} className="tryon-canvas" />
            {status !== "ready" && (
              <div className="tryon-msg">
                {status === "loading" && <p>Opening the mirror… allow camera access to try it on.</p>}
                {status === "denied" && (
                  <p>
                    Camera access was declined. Nothing is ever uploaded — the mirror runs on your
                    phone. You can dress an avatar instead.
                  </p>
                )}
                {status === "unsupported" && (
                  <p>This device can't open the camera mirror. You can dress an avatar instead.</p>
                )}
                {status !== "loading" && (
                  <button className="tryon-alt" onClick={() => setSub("avatar")}>
                    🧍 Dress an avatar
                  </button>
                )}
              </div>
            )}
          </>
        ) : (
          <div className="avatar-canvas">
            <Canvas
              dpr={[1, 2]}
              camera={{ position: [0, 1.15, 3.2], fov: 45 }}
              gl={{ antialias: true, preserveDrawingBuffer: true }}
            >
              <color attach="background" args={["#efe7dc"]} />
              <ambientLight intensity={0.95} />
              <hemisphereLight args={["#fff6e6", "#8a7a5a", 0.5]} />
              <directionalLight position={[3, 6, 4]} intensity={1.1} />
              <mesh position={[0, 0.05, 0]}>
                <cylinderGeometry args={[0.8, 0.9, 0.1, 32]} />
                <meshStandardMaterial color="#d8cbb0" roughness={1} />
              </mesh>
              <FashionFigure outfit={outfit} />
              <OrbitControls
                enablePan={false}
                minDistance={1.8}
                maxDistance={5}
                maxPolarAngle={Math.PI / 1.9}
                enableDamping
                target={[0, 1, 0]}
                autoRotate
                autoRotateSpeed={0.8}
              />
            </Canvas>
          </div>
        )}
      </div>

      {/* top bar */}
      <div className="tryon-top">
        <button className="backbtn" onClick={onClose}>✕ Close</button>
        <span className="tryon-title">🤳 Try it on</span>
      </div>

      {/* mode toggle */}
      <div className="tryon-tabs">
        <button className={sub === "mirror" ? "tryon-tab on" : "tryon-tab"} onClick={() => setSub("mirror")}>
          🪞 Mirror
        </button>
        <button className={sub === "avatar" ? "tryon-tab on" : "tryon-tab"} onClick={() => setSub("avatar")}>
          🧍 Avatar
        </button>
      </div>

      {/* controls */}
      <div className="tryon-controls">
        {sub === "avatar" && (
          <div className="tryon-tones">
            {SKIN_TONES.map((t) => (
              <button
                key={t}
                className={`tryon-tone${t === tone ? " on" : ""}`}
                style={{ background: t }}
                onClick={() => setTone(t)}
                aria-label="skin tone"
              />
            ))}
          </div>
        )}
        <div className="tryon-swatches">
          {DAY_COLORS.map((d) => (
            <button
              key={d.day}
              className={`fash-swatch${d.color === color ? " on" : ""}`}
              style={{ background: d.color }}
              onClick={() => setColor(d.color)}
              aria-label={`${d.day} colour`}
              title={d.colorName}
            />
          ))}
        </div>
        <div className="tryon-actions">
          <button className="tryon-snap" onClick={sub === "mirror" ? snapMirror : snapAvatar}>
            📸 Snapshot
          </button>
        </div>
        <p className="tryon-note">
          {sub === "mirror"
            ? "The mirror runs entirely on your phone — no photo is uploaded."
            : "A private avatar — no camera used."}{" "}
          Head-tracking by MediaPipe (Apache-2.0).
        </p>
      </div>

      {/* postcard result */}
      {postcard && (
        <div className="tryon-postcard" onClick={() => setPostcard(null)}>
          <div className="pc-card" onClick={(e) => e.stopPropagation()}>
            <img src={postcard} alt="Your Khmer dress postcard" />
            <div className="pc-actions">
              <a className="pc-save" href={postcard} download="camboverse-khmer-dress.png">
                💾 Save
              </a>
              <button className="pc-close" onClick={() => setPostcard(null)}>Done</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- draw the gold adornments onto the mirrored frame ---------- */

type Pt = { x: number; y: number; z: number };

function drawAdornments(
  ctx: CanvasRenderingContext2D,
  pts: Pt[],
  w: number,
  h: number,
  sashColor: string,
) {
  const p = (i: number) => ({ x: pts[i].x * w, y: pts[i].y * h });
  const right = p(234); // subject's right cheek edge
  const left = p(454); // subject's left cheek edge
  const foreheadTop = p(10);
  const chin = p(152);
  const eyeR = p(33);
  const eyeL = p(263);

  // face width & head roll
  const fw = Math.hypot(left.x - right.x, left.y - right.y) || w * 0.25;
  let dx = eyeL.x - eyeR.x;
  let dy = eyeL.y - eyeR.y;
  if (dx < 0) { dx = -dx; dy = -dy; } // keep the crown upright
  const roll = Math.atan2(dy, dx);
  const cx = (left.x + right.x) / 2;

  // ---- sbai: a sash over the (real) shoulders below the face ----
  ctx.save();
  ctx.globalAlpha = 0.82;
  ctx.fillStyle = sashColor;
  const shoulderY = chin.y + fw * 0.35;
  ctx.beginPath();
  ctx.moveTo(cx - fw * 1.05, shoulderY);
  ctx.lineTo(cx - fw * 0.55, shoulderY);
  ctx.lineTo(cx + fw * 0.85, shoulderY + fw * 2.1);
  ctx.lineTo(cx + fw * 0.35, shoulderY + fw * 2.1);
  ctx.closePath();
  ctx.fill();
  // gold trim
  ctx.globalAlpha = 1;
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = Math.max(2, fw * 0.05);
  ctx.stroke();
  ctx.restore();

  // ---- gold collar (sruong kor) at the neck ----
  ctx.save();
  ctx.translate(cx, chin.y + fw * 0.22);
  ctx.rotate(roll);
  const collar = ctx.createLinearGradient(0, -fw * 0.1, 0, fw * 0.2);
  collar.addColorStop(0, GOLD_HI);
  collar.addColorStop(1, GOLD);
  ctx.fillStyle = collar;
  ctx.beginPath();
  ctx.ellipse(0, 0, fw * 0.62, fw * 0.28, 0, 0.15 * Math.PI, 0.85 * Math.PI);
  ctx.lineTo(-fw * 0.5, fw * 0.02);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // ---- earrings ----
  for (const [pt, s] of [[right, -1], [left, 1]] as const) {
    ctx.save();
    ctx.translate(pt.x + s * fw * 0.06, pt.y + fw * 0.28);
    ctx.fillStyle = GOLD;
    ctx.strokeStyle = GOLD;
    ctx.lineWidth = Math.max(1.5, fw * 0.02);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, fw * 0.12);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(0, fw * 0.17, fw * 0.05, fw * 0.07, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // ---- mkot crown above the forehead ----
  ctx.save();
  ctx.translate(foreheadTop.x, foreheadTop.y);
  ctx.rotate(roll);
  drawMkot(ctx, fw);
  ctx.restore();
}

/** A stylised golden apsara crown (មកុដ) drawn upward from the origin. */
function drawMkot(ctx: CanvasRenderingContext2D, fw: number) {
  const grad = ctx.createLinearGradient(0, -fw * 1.1, 0, 0);
  grad.addColorStop(0, GOLD_HI);
  grad.addColorStop(1, GOLD);
  ctx.fillStyle = grad;
  ctx.strokeStyle = "#b8912f";
  ctx.lineWidth = Math.max(1, fw * 0.015);

  // headband
  ctx.beginPath();
  ctx.moveTo(-fw * 0.6, 0);
  ctx.quadraticCurveTo(0, -fw * 0.18, fw * 0.6, 0);
  ctx.lineTo(fw * 0.6, -fw * 0.12);
  ctx.quadraticCurveTo(0, -fw * 0.3, -fw * 0.6, -fw * 0.12);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // tiered spires: a tall centre with shorter ones each side
  const spires = [
    { x: 0, base: fw * 0.16, top: -fw * 1.15 },
    { x: -fw * 0.32, base: fw * 0.13, top: -fw * 0.78 },
    { x: fw * 0.32, base: fw * 0.13, top: -fw * 0.78 },
    { x: -fw * 0.55, base: fw * 0.1, top: -fw * 0.5 },
    { x: fw * 0.55, base: fw * 0.1, top: -fw * 0.5 },
  ];
  for (const s of spires) {
    ctx.beginPath();
    ctx.moveTo(s.x - s.base, -fw * 0.1);
    ctx.quadraticCurveTo(s.x, s.top * 0.55, s.x, s.top);
    ctx.quadraticCurveTo(s.x, s.top * 0.55, s.x + s.base, -fw * 0.1);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  // a red jewel on the band
  ctx.fillStyle = "#c0392b";
  ctx.beginPath();
  ctx.arc(0, -fw * 0.13, fw * 0.06, 0, Math.PI * 2);
  ctx.fill();
}

/* ---------- compose a keepsake postcard from a source canvas ---------- */

function makePostcard(src: HTMLCanvasElement): string {
  const W = 1080;
  const pad = 36;
  const banner = 132;
  const iw = src.width || 640;
  const ih = src.height || 480;
  const scale = (W - pad * 2) / iw;
  const dh = ih * scale;
  const H = Math.round(pad * 2 + dh + banner);

  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const ctx = c.getContext("2d")!;

  // warm silk background
  ctx.fillStyle = "#efe7dc";
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "#c8912e";
  ctx.fillRect(0, 0, W, 10);
  ctx.fillRect(0, H - 10, W, 10);

  // photo
  ctx.drawImage(src, pad, pad, W - pad * 2, dh);
  ctx.strokeStyle = "#c8912e";
  ctx.lineWidth = 4;
  ctx.strokeRect(pad, pad, W - pad * 2, dh);

  // caption banner
  const by = pad + dh;
  ctx.fillStyle = "#3a2c1e";
  ctx.textAlign = "center";
  ctx.font = "700 46px system-ui, sans-serif";
  ctx.fillText("សម្លៀកបំពាក់ខ្មែរ", W / 2, by + 56);
  ctx.font = "600 30px system-ui, sans-serif";
  ctx.fillStyle = "#8a6a4a";
  ctx.fillText("I tried Khmer dress · CamboVerse", W / 2, by + 100);

  return c.toDataURL("image/png");
}
