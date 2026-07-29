import { useEffect, useMemo, useRef, useState } from "react";
import { GLYPH_PATHS } from "../glyphPaths";
import { STROKE_ORDER } from "../strokeOrder";
import { KHMER_FONTS, type KhmerLetter } from "../khmer";

/**
 * Some dependent vowels visually wrap around a consonant via OpenType shaping
 * (a piece before, a piece after — e.g. ើ, ោ). A single codepoint's extracted
 * glyph outline (glyphPaths.ts) can't capture that and is wrong/incomplete
 * for these, so they render via the browser's own font shaping instead,
 * using `letter.display` (which already includes the dotted-circle
 * placeholder — see the `dv()` helper in khmer.ts).
 */
export const NEEDS_SHAPED_RENDER = new Set(["ើ", "ឿ", "ៀ", "ោ", "ៅ", "ុំ", "ាំ"]);

/**
 * Rasterizes shaped text (e.g. "◌" + a wrap-around vowel) to a data URL,
 * fit to a size×size box without clipping. These composed glyphs can rise
 * far above a normal ascent (e.g. "◌ឿ" needs ~1.56em of height), so a fixed
 * font-size/baseline guess clips them — this measures the real ink bounding
 * box first and sizes/centers to it.
 */
function renderShapedGlyph(text: string, family: string): string {
  const size = 800;
  const avail = size * 0.84; // leaves an 8% margin on each side
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.font = `${size}px ${family}`;
  const m0 = ctx.measureText(text);
  const w0 = m0.actualBoundingBoxLeft + m0.actualBoundingBoxRight;
  const h0 = m0.actualBoundingBoxAscent + m0.actualBoundingBoxDescent;
  const fontSize = size * Math.min(avail / w0, avail / h0);
  ctx.font = `${fontSize}px ${family}`;
  const m = ctx.measureText(text);
  const x = (size - (m.actualBoundingBoxLeft + m.actualBoundingBoxRight)) / 2 + m.actualBoundingBoxLeft;
  const y = (size - (m.actualBoundingBoxAscent + m.actualBoundingBoxDescent)) / 2 + m.actualBoundingBoxAscent;
  ctx.fillStyle = "#241606";
  ctx.fillText(text, x, y);
  return canvas.toDataURL();
}

/**
 * Animate "how to write" a Khmer letter, in the Normal shape only — Moul is a
 * ceremonial/decorative script, not a handwriting form, so stroke order isn't
 * taught for it. If stroke-order data exists, it draws the strokes in
 * sequence, numbered, over a faint outline — a true stroke-order animation.
 * Otherwise it traces the letter's outline (a write-on). Stroke order is
 * currently a community draft (see the ✎ badge).
 */
const TRACE_MS = 2400;
const MS_PER_UNIT = 9; // stroke drawing speed
const GAP_MS = 280; // pause between strokes

export function WriteAnimation({
  letter,
  onClose,
}: {
  letter: KhmerLetter;
  onClose: () => void;
}) {
  const useShaped = NEEDS_SHAPED_RENDER.has(letter.char);
  const glyph = useShaped ? undefined : GLYPH_PATHS[letter.char];
  const [runId, setRunId] = useState(0);
  const [filled, setFilled] = useState(false);

  const shapedSrc = useMemo(
    () => (useShaped ? renderShapedGlyph(letter.display, KHMER_FONTS.normal.family) : null),
    [useShaped, letter.display],
  );

  const strokeData = STROKE_ORDER[letter.char];
  const mode: "strokes" | "trace" | "none" = strokeData ? "strokes" : glyph || useShaped ? "trace" : "none";

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
    if (mode !== "trace" || useShaped) return;
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
  }, [mode, runId, useShaped]);

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

  const d = glyph ? glyph.normal : "";

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

        <div className="write-stagerow">
          <div className="write-model" title="Finished letter">
            {glyph ? (
              <svg viewBox="0 0 100 100" className="write-model-svg">
                <path d={glyph.normal} fill="#241606" />
              </svg>
            ) : (
              <div className="write-none write-model-none" style={{ fontFamily: `'${KHMER_FONTS.normal.family}', serif` }}>
                {letter.display}
              </div>
            )}
          </div>
          <div className="write-stage">
            {mode === "none" ? (
              <div className="write-none" style={{ fontFamily: `'${KHMER_FONTS.normal.family}', serif` }}>
                {letter.display}
              </div>
            ) : (
              <svg viewBox="0 0 100 100" className="write-svg">
                {/* faint outline guide */}
                {useShaped ? (
                  <image x="0" y="0" width="100" height="100" href={shapedSrc!} opacity={mode === "strokes" ? 0.4 : 1} />
                ) : (
                  <path d={glyph!.normal} fill={mode === "strokes" ? "#ddd0ad" : "#241606"} className={mode === "trace" && filled ? "write-fill on" : mode === "trace" ? "write-fill" : ""} />
                )}
                {mode === "trace" && !useShaped && (
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
        </div>

        <div className="write-actions">
          <button className="write-replay" onClick={() => setRunId((v) => v + 1)} disabled={mode === "none"}>
            ↻ Replay
          </button>
        </div>
        {mode === "strokes" ? (
          <p className="write-hint">Numbered strokes in order — a community draft. Help verify it (see the task board).</p>
        ) : mode === "trace" && useShaped ? (
          <p className="write-hint">Reference shown (stroke order for this vowel isn't authored yet).</p>
        ) : mode === "trace" ? (
          <p className="write-hint">Outline trace (stroke order for this letter isn't authored yet).</p>
        ) : (
          <p className="write-hint">A written animation for this letter isn't available yet.</p>
        )}
      </div>
    </div>
  );
}
