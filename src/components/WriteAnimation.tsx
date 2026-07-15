import { useEffect, useRef, useState } from "react";
import { GLYPH_PATHS } from "../glyphPaths";
import { KHMER_FONTS, type KhmerLetter, type KhmerShape } from "../khmer";

/**
 * Animate "how to write" a Khmer letter: a pen traces the letter's outline
 * (extracted from the font) and then fills it in. Shown in either the Normal or
 * Moul shape. A write-on animation — a foundation for true stroke-order later
 * (see the task board).
 */
const DRAW_MS = 2400;

export function WriteAnimation({
  letter,
  initialShape,
  onClose,
}: {
  letter: KhmerLetter;
  initialShape: KhmerShape;
  onClose: () => void;
}) {
  const paths = GLYPH_PATHS[letter.char];
  const [shape, setShape] = useState<KhmerShape>(paths ? initialShape : "normal");
  const [runId, setRunId] = useState(0);
  const [filled, setFilled] = useState(false);

  const strokeRef = useRef<SVGPathElement>(null);
  const penRef = useRef<SVGCircleElement>(null);

  const d = paths ? paths[shape] : "";

  useEffect(() => {
    const path = strokeRef.current;
    const pen = penRef.current;
    if (!path || !d) return;
    setFilled(false);
    const len = path.getTotalLength();
    path.style.strokeDasharray = String(len);
    path.style.strokeDashoffset = String(len);

    let raf = 0;
    let start = 0;
    const step = (ts: number) => {
      if (!start) start = ts;
      const t = Math.min(1, (ts - start) / DRAW_MS);
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
  }, [d, runId]);

  return (
    <div className="write">
      <div className="write-card">
        <div className="write-top">
          <span className="write-title">
            How to write · <b>{letter.roman}</b>
          </span>
          <button className="write-x" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div className="write-stage">
          {paths ? (
            <svg viewBox="0 0 100 100" className="write-svg">
              <path d={d} fill="#241606" className={filled ? "write-fill on" : "write-fill"} />
              <path
                ref={strokeRef}
                d={d}
                fill="none"
                stroke="#241606"
                strokeWidth={2.4}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle ref={penRef} r={2.8} fill="#c8912e" className="write-pen" />
            </svg>
          ) : (
            <div className="write-none" style={{ fontFamily: `'${KHMER_FONTS.normal.family}', serif` }}>
              {letter.display}
            </div>
          )}
        </div>

        <div className="write-actions">
          {paths && (
            <div className="write-shape">
              {(Object.keys(KHMER_FONTS) as KhmerShape[]).map((s) => (
                <button key={s} className={s === shape ? "cls-seg on" : "cls-seg"} onClick={() => setShape(s)}>
                  {KHMER_FONTS[s].label}
                </button>
              ))}
            </div>
          )}
          <button className="write-replay" onClick={() => setRunId((v) => v + 1)} disabled={!paths}>
            ↻ Replay
          </button>
        </div>
        {!paths && <p className="write-hint">A written animation for this letter isn't available yet.</p>}
      </div>
    </div>
  );
}
