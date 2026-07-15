import { useEffect, useMemo, useRef, useState } from "react";
import { GLYPH_PATHS } from "../glyphPaths";
import { STROKE_ORDER } from "../strokeOrder";
import { KHMER_FONTS, type KhmerLetter, type KhmerShape } from "../khmer";

/**
 * Animate "how to write" a Khmer letter. If stroke-order data exists (Normal
 * shape), it draws the strokes in sequence, numbered, over a faint outline — a
 * true stroke-order animation. Otherwise it traces the letter's outline (a
 * write-on). Stroke order is currently a community draft (see the ✎ badge).
 */
const TRACE_MS = 2400;
const MS_PER_UNIT = 9; // stroke drawing speed
const GAP_MS = 280; // pause between strokes

export function WriteAnimation({
  letter,
  initialShape,
  onClose,
}: {
  letter: KhmerLetter;
  initialShape: KhmerShape;
  onClose: () => void;
}) {
  const glyph = GLYPH_PATHS[letter.char];
  const [shape, setShape] = useState<KhmerShape>(glyph ? initialShape : "normal");
  const [runId, setRunId] = useState(0);
  const [filled, setFilled] = useState(false);

  const strokeData = shape === "normal" ? STROKE_ORDER[letter.char] : undefined;
  const mode: "strokes" | "trace" | "none" = strokeData ? "strokes" : glyph ? "trace" : "none";

  // Build "M x y L x y…" for each stroke median.
  const strokePaths = useMemo(
    () => (strokeData ? strokeData.strokes.map((s) => "M" + s.map((p) => p.join(" ")).join("L")) : []),
    [strokeData],
  );

  const traceRef = useRef<SVGPathElement>(null);
  const penRef = useRef<SVGCircleElement>(null);
  const strokeRefs = useRef<(SVGPathElement | null)[]>([]);

  // --- Trace (outline write-on) ---
  useEffect(() => {
    if (mode !== "trace") return;
    const path = traceRef.current;
    const pen = penRef.current;
    if (!path) return;
    setFilled(false);
    const len = path.getTotalLength();
    path.style.strokeDasharray = String(len);
    path.style.strokeDashoffset = String(len);
    let raf = 0;
    let start = 0;
    const step = (ts: number) => {
      if (!start) start = ts;
      const t = Math.min(1, (ts - start) / TRACE_MS);
      path.style.strokeDashoffset = String(len * (1 - t));
      const pt = path.getPointAtLength(len * t);
      if (pen) {
        pen.setAttribute("cx", String(pt.x));
        pen.setAttribute("cy", String(pt.y));
        pen.style.opacity = t < 1 ? "1" : "0";
      }
      if (t < 1) raf = requestAnimationFrame(step);
      else setFilled(true);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [mode, shape, runId]);

  // --- True stroke order (sequenced strokes) ---
  useEffect(() => {
    if (mode !== "strokes") return;
    const paths = strokeRefs.current.filter(Boolean) as SVGPathElement[];
    const pen = penRef.current;
    if (!paths.length) return;
    const lens = paths.map((p) => p.getTotalLength());
    const drawMs = lens.map((l) => Math.max(180, l * MS_PER_UNIT));
    const startAt: number[] = [];
    let acc = 0;
    for (let i = 0; i < paths.length; i++) {
      startAt[i] = acc;
      acc += drawMs[i] + GAP_MS;
    }
    paths.forEach((p, i) => {
      p.style.strokeDasharray = String(lens[i]);
      p.style.strokeDashoffset = String(lens[i]);
    });
    const total = acc;
    let raf = 0;
    let t0 = 0;
    const step = (ts: number) => {
      if (!t0) t0 = ts;
      const e = ts - t0;
      for (let i = 0; i < paths.length; i++) {
        if (e >= startAt[i] + drawMs[i]) {
          paths[i].style.strokeDashoffset = "0";
        } else if (e >= startAt[i]) {
          const frac = (e - startAt[i]) / drawMs[i];
          paths[i].style.strokeDashoffset = String(lens[i] * (1 - frac));
          if (pen) {
            const pt = paths[i].getPointAtLength(lens[i] * frac);
            pen.setAttribute("cx", String(pt.x));
            pen.setAttribute("cy", String(pt.y));
            pen.style.opacity = "1";
          }
        } else {
          paths[i].style.strokeDashoffset = String(lens[i]);
        }
      }
      if (e < total) raf = requestAnimationFrame(step);
      else if (pen) pen.style.opacity = "0";
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [mode, strokePaths, runId]);

  const d = glyph ? glyph[shape] : "";

  return (
    <div className="write">
      <div className="write-card">
        <div className="write-top">
          <span className="write-title">
            How to write · <b>{letter.roman}</b>
            {mode === "strokes" && <span className="write-draft" title="Community draft — help verify">✎ draft</span>}
          </span>
          <button className="write-x" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div className="write-stage">
          {mode === "none" ? (
            <div className="write-none" style={{ fontFamily: `'${KHMER_FONTS.normal.family}', serif` }}>
              {letter.display}
            </div>
          ) : (
            <svg viewBox="0 0 100 100" className="write-svg">
              {/* faint outline guide */}
              <path d={glyph![shape]} fill={mode === "strokes" ? "#ddd0ad" : "#241606"} className={mode === "trace" && filled ? "write-fill on" : mode === "trace" ? "write-fill" : ""} />
              {mode === "trace" && (
                <path
                  ref={traceRef}
                  d={d}
                  fill="none"
                  stroke="#241606"
                  strokeWidth={2.4}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}
              {mode === "strokes" &&
                strokePaths.map((sp, i) => (
                  <path
                    key={i}
                    ref={(el) => {
                      strokeRefs.current[i] = el;
                    }}
                    d={sp}
                    fill="none"
                    stroke="#241606"
                    strokeWidth={4.2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                ))}
              {mode === "strokes" &&
                strokeData!.strokes.map((s, i) => (
                  <g key={"n" + i}>
                    <circle cx={s[0][0]} cy={s[0][1]} r={4} fill="#c8912e" />
                    <text x={s[0][0]} y={s[0][1]} dy={1.4} fontSize={4.6} fill="#10140b" textAnchor="middle">
                      {i + 1}
                    </text>
                  </g>
                ))}
              <circle ref={penRef} r={2.8} fill="#c8912e" className="write-pen" style={{ opacity: 0 }} />
            </svg>
          )}
        </div>

        <div className="write-actions">
          {glyph && (
            <div className="write-shape">
              {(Object.keys(KHMER_FONTS) as KhmerShape[]).map((s) => (
                <button key={s} className={s === shape ? "cls-seg on" : "cls-seg"} onClick={() => setShape(s)}>
                  {KHMER_FONTS[s].label}
                </button>
              ))}
            </div>
          )}
          <button className="write-replay" onClick={() => setRunId((v) => v + 1)} disabled={mode === "none"}>
            ↻ Replay
          </button>
        </div>
        {mode === "strokes" ? (
          <p className="write-hint">Numbered strokes in order — a community draft. Help verify it (see the task board).</p>
        ) : mode === "trace" ? (
          <p className="write-hint">Outline trace (stroke order for this letter isn't authored yet).</p>
        ) : (
          <p className="write-hint">A written animation for this letter isn't available yet.</p>
        )}
      </div>
    </div>
  );
}
