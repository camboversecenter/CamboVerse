import { useEffect, useRef, useState } from "react";
import {
  YANTRAS, PRECEPTS, ABOUT, REFERRAL, SAKYANT_CREDENTIAL, drawYantra,
} from "../sakyant";
import { claimCredential, getIdentity, earnedAchievements } from "../lib/identity";
import { SakYantTryOn } from "./SakYantTryOn";
import { prepareYantra, YANTRA_BITMAP, yantraSvg } from "../sakyantArtwork";
import { useYantraArtwork } from "./useYantraArtwork";

/**
 * Sak Yant (សាក់យ័ន្ត) the Khmer sacred tattoo. Learn what it is and who
 * applies it, browse the best-known yant (each drawn procedurally), preview one
 * on your own skin with the on-device camera, and the point of it all find
 * your way to a genuine Khmer master to receive a real, blessed one.
 */
type Mode = "about" | "designs" | "shops";
const INK = "#2b2018";

export function SakYantView({ onBackToMap }: { onBackToMap: () => void }) {
  const [mode, setMode] = useState<Mode>("designs");
  const [yi, setYi] = useState(0);
  const [tryOn, setTryOn] = useState(false);
  const [earned, setEarned] = useState(false);
  const [ink, setInk] = useState(INK);
  const [enlarged, setEnlarged] = useState(false);
  const [saving,setSaving]=useState(false);
  const [saveError,setSaveError]=useState(false);

  const yant = YANTRAS[yi];
  const saveDrawing=async()=>{
    setSaving(true);setSaveError(false);
    try {
      await prepareYantra(yant.id);
      const url=URL.createObjectURL(new Blob([yantraSvg(yant.id,yant.name,ink)],{type:'image/svg+xml'}));
      const link=document.createElement('a');
      link.href=url;link.download=`camboverse-${yant.id}-study.svg`;
      link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
    } catch {setSaveError(true);} finally {setSaving(false);}
  };

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
          <div className={`sy-designs${enlarged ? ' enlarged' : ''}`}>
            <div className="sy-gallery-intro"><span>THE MOTIF COLLECTION</span><h1>Lines with a living tradition</h1><p>Explore six original studies inspired by regional Sak Yant forms.</p></div>
            <div className={`sy-artboard${enlarged ? ' enlarged' : ''}`}>
              <div className="sy-art-label"><span>{String(yi+1).padStart(2,'0')} / 06</span><span>{YANTRA_BITMAP[yant.id] ? 'Tattoo illustration' : 'Original line study'}</span></div>
              <YantraCanvas id={yant.id} size={enlarged ? 760 : 420} ink={ink} />
              <p className="sy-art-caption">Sacred inscriptions omitted · illustrative artwork</p>
            </div>
            <div className="sy-art-tools" aria-label="Artwork controls">
              <button aria-pressed={ink === INK} onClick={()=>setInk(INK)}>Black ink</button>
              <button aria-pressed={ink !== INK} onClick={()=>setInk('#7c1f16')}>Red ink</button>
              <button aria-pressed={enlarged} onClick={()=>setEnlarged(v=>!v)}>{enlarged ? 'Fit artwork' : 'Enlarge artwork'}</button>
              <button disabled={saving} onClick={saveDrawing}>{saving ? 'Preparing…' : 'Save drawing ↓'}</button>
              {saveError && <span role="alert">Could not load the drawing. Please try again.</span>}
            </div>
            <div className="sy-picker">
              {YANTRAS.map((y, i) => (
                <button
                  key={y.id}
                  className={`sy-thumb${i === yi ? " on" : ""}`}
                  onClick={() => setYi(i)}
                  aria-label={y.name}
                  aria-pressed={i === yi}
                  title={y.name}
                >
                  <YantraCanvas id={y.id} size={58} thumb />
                  <span>{y.english.replace('The ', '')}</span>
                </button>
              ))}
            </div>
            <div className="sy-info">
              <div className="sy-info-head">
                <span className="khmer">{yant.khmer}</span> <b>{yant.name}</b>
              </div>
              <div className="sy-en">{yant.english}</div>
              <p className="sy-desc">{yant.meaning}</p>
              <details className="sy-details" key={yant.id}>
                <summary>Learn more about this drawing</summary>
                <p><b>Look closely.</b> {yant.form}</p>
                <p><b>Context.</b> {yant.context}</p>
                <p><b>Placement.</b> {yant.placement}</p>
                <p>These studies are not tattoo stencils. Khmer labels remain drafts for native review; no master has approved these drawings.</p>
                <a href={yant.reference} target="_blank" rel="noopener noreferrer">View the reference ↗</a>
              </details>
            </div>
            <button className="sy-try" onClick={() => setTryOn(true)}>Preview on a skin swatch</button>
            <p className="sy-note">Camera preview is optional. Nothing is uploaded.</p>
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
              <p className="sy-desc">These Buddhist ethical commitments are important to some Sak Yant teachers. A teacher's additional rules may differ:</p>
              <ol className="sy-plist">
                {PRECEPTS.map((p) => (
                  <li key={p.text}><span className="khmer">{p.khmer}</span> {p.text}</li>
                ))}
              </ol>
            </div>
            <p className="sy-note">
              A respectful, community-verifiable guide Sak Yant is sacred and its meanings vary by
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
                No verified practitioner directory is available yet. This external link does not imply a partnership with the Federation.
              </p>
            )}
            <p className="sy-note">
              CamboVerse does not sell tattoos or take a fee this is a bridge to Cambodia's living
              practitioners, so the tradition (and the artists) are supported at the source.
            </p>
          </div>
        )}
      </div>

      {tryOn && <SakYantTryOn yantraId={yant.id} initialInk={ink === INK ? 0 : 1} onClose={() => setTryOn(false)} />}
    </div>
  );
}

/** Draws a yant to a canvas at logical `size` px. `thumb` uses lighter framing. */
function YantraCanvas({ id, size, thumb = false, ink = INK }: { id: string; size: number; thumb?: boolean; ink?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const {ready,error,retry}=useYantraArtwork(id);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    c.width = size * dpr;
    c.height = size * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = thumb ? "#efe3c8" : "#f8f1df";
    ctx.fillRect(0, 0, size, size);
    ctx.save();
    ctx.translate(size / 2, size / 2);
    if(ready) drawYantra(ctx, id, size * (thumb ? 1 : YANTRA_BITMAP[id] ? 0.9 : 0.96), ink);
    ctx.restore();
  }, [id, size, thumb, ink, ready]);
  return <><canvas ref={ref} role={thumb ? undefined : 'img'} aria-hidden={thumb || undefined} aria-label={thumb ? undefined : `${YANTRAS.find(y=>y.id===id)?.name} — illustrative line study, sacred inscriptions omitted`} className={thumb ? "yant-canvas thumb" : "yant-canvas"} style={{ width: size, height: 'auto', aspectRatio: '1' }} />{!thumb && !ready && <p role="status">{error ? <button onClick={retry}>Retry loading drawing</button> : 'Loading drawing…'}</p>}</>;
}
