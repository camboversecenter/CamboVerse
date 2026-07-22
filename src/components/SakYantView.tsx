import { useEffect, useRef, useState } from "react";
import {
  YANTRAS, PRECEPTS, ABOUT, REFERRAL, SAKYANT_CREDENTIAL, drawYantra,
} from "../sakyant";
import { claimCredential, getIdentity, earnedAchievements } from "../lib/identity";
import { SakYantTryOn } from "./SakYantTryOn";

/**
 * Sak Yant (សាក់យ័ន្ត) — the Khmer sacred tattoo. Learn what it is and who
 * applies it, browse the best-known yant (each drawn procedurally), preview one
 * on your own skin with the on-device camera, and — the point of it all — find
 * your way to a genuine Khmer master to receive a real, blessed one.
 */
type Mode = "about" | "designs" | "shops";
const INK = "#2b2018";

export function SakYantView({ onBackToMap }: { onBackToMap: () => void }) {
  const [mode, setMode] = useState<Mode>("designs");
  const [yi, setYi] = useState(0);
  const [tryOn, setTryOn] = useState(false);
  const [earned, setEarned] = useState(false);

  const yant = YANTRAS[yi];

  useEffect(() => {
    let live = true;
    (async () => {
      const set = await earnedAchievements(await getIdentity(false));
      if (live) setEarned(set.has(SAKYANT_CREDENTIAL));
    })();
    return () => { live = false; };
  }, []);

  // Reading the "about" panel earns a gentle "learned about Sak Yant" stamp.
  useEffect(() => {
    if (mode === "about" && !earned) {
      setEarned(true);
      claimCredential(SAKYANT_CREDENTIAL, "read:about").catch(() => {});
    }
  }, [mode, earned]);

  return (
    <div className="sakyant">
      <div className="sy-scroll">
        <div className="cls-top sy-top">
          <button className="backbtn" onClick={onBackToMap}>← Map</button>
          <span className="cls-title">🪷 Sak Yant · សាក់យ័ន្ត</span>
        </div>

        <div className="sy-tabs">
          <button className={mode === "designs" ? "sy-tab on" : "sy-tab"} onClick={() => setMode("designs")}>🖋️ Designs</button>
          <button className={mode === "about" ? "sy-tab on" : "sy-tab"} onClick={() => setMode("about")}>ℹ️ About</button>
          <button className={mode === "shops" ? "sy-tab on" : "sy-tab"} onClick={() => setMode("shops")}>🪡 Get one for real</button>
        </div>

        {mode === "designs" && (
          <div className="sy-designs">
            <YantraCanvas id={yant.id} size={300} />
            <div className="sy-picker">
              {YANTRAS.map((y, i) => (
                <button
                  key={y.id}
                  className={`sy-thumb${i === yi ? " on" : ""}`}
                  onClick={() => setYi(i)}
                  aria-label={y.name}
                  title={y.name}
                >
                  <YantraCanvas id={y.id} size={58} thumb />
                </button>
              ))}
            </div>
            <div className="sy-info">
              <div className="sy-info-head">
                <span className="khmer">{yant.khmer}</span> <b>{yant.name}</b>
              </div>
              <div className="sy-en">{yant.english}</div>
              <p className="sy-desc">{yant.meaning}</p>
              <p className="sy-place">📍 Traditionally placed: {yant.placement}</p>
            </div>
            <button className="sy-try" onClick={() => setTryOn(true)}>🤳 Preview it on my skin</button>
          </div>
        )}

        {mode === "about" && (
          <div className="sy-about">
            {ABOUT.map((a) => (
              <div key={a.title} className="sy-card">
                <div className="sy-info-head"><span className="khmer">{a.khmer}</span> <b>{a.title}</b></div>
                <p className="sy-desc">{a.text}</p>
              </div>
            ))}
            <div className="sy-card sy-precepts">
              <div className="sy-info-head"><span className="khmer">សីលប្រាំ</span> <b>The Five Precepts</b></div>
              <p className="sy-desc">A yant's power is kept by living these — break them and the blessing is said to fade:</p>
              <ol className="sy-plist">
                {PRECEPTS.map((p) => (
                  <li key={p.text}><span className="khmer">{p.khmer}</span> {p.text}</li>
                ))}
              </ol>
            </div>
            <p className="sy-note">
              A respectful, community-verifiable guide — Sak Yant is sacred and its meanings vary by
              lineage. Confirm with a Khmer master.
            </p>
          </div>
        )}

        {mode === "shops" && (
          <div className="sy-shops">
            <div className="sy-card sy-cta">
              <div className="sy-info-head"><span className="khmer">សាក់យ័ន្តពិត</span> <b>Receive a real Sak Yant</b></div>
              <p className="sy-desc">{REFERRAL.note}</p>
              <a className="sy-cta-btn" href={REFERRAL.url} target="_blank" rel="noopener noreferrer">
                {REFERRAL.org} ↗
              </a>
            </div>
            {REFERRAL.studios.length > 0 ? (
              <ul className="sy-studios">
                {REFERRAL.studios.map((st) => (
                  <li key={st.name} className="sy-studio">
                    <b>{st.name}</b> <span className="sy-city">· {st.city}</span>
                    {st.url && <a href={st.url} target="_blank" rel="noopener noreferrer">↗</a>}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="sy-note">
                A directory of vetted masters is being gathered with the Federation and the Khmer
                community. Are you a master or studio? Help build it — see the contributor board.
              </p>
            )}
            <p className="sy-note">
              CamboVerse does not sell tattoos or take a fee — this is a bridge to Cambodia's living
              practitioners, so the tradition (and the artists) are supported at the source.
            </p>
          </div>
        )}
      </div>

      {tryOn && <SakYantTryOn yantraId={yant.id} onClose={() => setTryOn(false)} />}
    </div>
  );
}

/** Draws a yant to a canvas at logical `size` px. `thumb` uses lighter framing. */
function YantraCanvas({ id, size, thumb = false }: { id: string; size: number; thumb?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    c.width = size * dpr;
    c.height = size * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = thumb ? "#efe3c8" : "#f2e7cf";
    ctx.fillRect(0, 0, size, size);
    ctx.save();
    ctx.translate(size / 2, size / 2 + size * 0.04);
    drawYantra(ctx, id, size * (thumb ? 0.96 : 0.92), INK);
    ctx.restore();
  }, [id, size, thumb]);
  return <canvas ref={ref} className={thumb ? "yant-canvas thumb" : "yant-canvas"} style={{ width: size, height: size }} />;
}
