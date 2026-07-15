import { useEffect, useRef, useState } from "react";
import { Viewer } from "./Viewer";
import { WalkControls } from "./WalkControls";
import { TourGuide } from "./TourGuide";
import { GuideMascot } from "./GuideMascot";
import { ShopView } from "./ShopView";
import { TimeTravel } from "./TimeTravel";
import { Credits } from "./Credits";
import type { WalkInput } from "./FirstPersonControls";
import type { Spot } from "../spots";
import { marketForSpot } from "../shops";

/** How long the guided tour lingers at each stop before moving on (ms). */
const TOUR_DWELL = 8000;

/** An individual heritage site: orbit or walk it, visit its points of interest. */
export function SpotView({ spot, onBack }: { spot: Spot; onBack: () => void }) {
  const [splat, setSplat] = useState(false);
  const [poiId, setPoiId] = useState<string | null>(null);
  const [mode, setMode] = useState<"orbit" | "walk">("orbit");
  const [touring, setTouring] = useState(false);
  const [paused, setPaused] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [shopOpen, setShopOpen] = useState(false);
  const [pastOpen, setPastOpen] = useState(false);
  const [creditsOpen, setCreditsOpen] = useState(false);
  const walkInput = useRef<WalkInput>({ move: { x: 0, y: 0 }, look: { dx: 0, dy: 0 } });
  const market = marketForSpot(spot.id);

  const pois = spot.pois;
  const idx = pois ? pois.findIndex((p) => p.id === poiId) : -1;
  const activePoi = idx >= 0 && pois ? pois[idx] : null;
  const step = (d: number) => {
    if (!pois || pois.length === 0) return;
    const base = idx < 0 ? 0 : (idx + d + pois.length) % pois.length;
    setPoiId(pois[base].id);
  };
  const toggleMode = () => {
    setPoiId(null);
    setTouring(false);
    setGuideOpen(false);
    setMode((m) => (m === "orbit" ? "walk" : "orbit"));
  };

  const startTour = () => {
    if (!pois || pois.length === 0) return;
    setPaused(false);
    setTouring(true);
    setPoiId(pois[0].id);
  };
  const endTour = () => {
    setTouring(false);
    setPaused(false);
    setPoiId(null);
  };

  // Guided tour: dwell at each stop, then advance; end after the last one.
  useEffect(() => {
    if (!touring || paused || !pois || idx < 0) return;
    const t = setTimeout(() => {
      if (idx >= pois.length - 1) {
        setTouring(false);
        setPaused(false);
        setPoiId(null);
      } else {
        setPoiId(pois[idx + 1].id);
      }
    }, TOUR_DWELL);
    return () => clearTimeout(t);
  }, [touring, paused, poiId, idx, pois]);

  const walking = mode === "walk";

  // Teleport into the virtual market for this site (digital-economy PoC).
  if (shopOpen && market) {
    return <ShopView market={market} onBack={() => setShopOpen(false)} />;
  }

  return (
    <>
      <Viewer
        modelUrl={spot.model}
        blurb={spot.blurb}
        water={spot.water}
        splatUrl={spot.splat}
        splat={splat && !!spot.splat}
        pois={pois}
        activePoi={activePoi}
        onSelectPoi={(id) => {
          setTouring(false);
          setPoiId(id);
        }}
        mode={mode}
        walkInput={walkInput}
        aerial={spot.aerial}
        landscape={spot.landscape}
        modelScale={spot.landscape === "angkor" ? 1.4 : 1}
        modelY={spot.landscape === "wat-phnom" ? 1.4 : 0}
      />

      {walking && <WalkControls input={walkInput} />}

      <button className="backbtn" onClick={onBack}>
        ← Map
      </button>

      {spot.splat && !walking && (
        <button className="mode-toggle" onClick={() => setSplat((s) => !s)}>
          {splat ? "◼ Model" : "◍ Photoreal"}
        </button>
      )}

      {!guideOpen && (
        <button className="walk-toggle" onClick={toggleMode}>
          {walking ? "⟳ Orbit" : "🚶 Walk in"}
        </button>
      )}

      {/* Kiri the monkey guide — tap to open the AI tour guide. */}
      {!walking && spot.live && !guideOpen && (
        <button className="guide-fab" onClick={() => setGuideOpen(true)} aria-label="Ask Kiri, the tour guide">
          <GuideMascot state="idle" size={56} />
          <span>Ask Kiri</span>
        </button>
      )}

      {!walking && guideOpen && (
        <TourGuide
          spot={spot}
          activePoi={activePoi}
          count={pois?.length ?? 0}
          index={idx}
          onPrev={() => step(-1)}
          onNext={() => step(1)}
          onClose={() => setGuideOpen(false)}
        />
      )}

      {/* Back in Time — a journey through Cambodia's ages, over this site. */}
      {!walking && pastOpen && <TimeTravel spot={spot} onClose={() => setPastOpen(false)} />}

      {/* Attribution & provenance for this site's heritage data (CC-BY commons). */}
      {creditsOpen && <Credits spotId={spot.id} onClose={() => setCreditsOpen(false)} />}

      {!walking &&
        !guideOpen &&
        !pastOpen &&
        (activePoi && pois ? (
          <div className={touring ? "poi-panel touring" : "poi-panel"}>
            {touring && (
              <div className="tour-progress" aria-hidden>
                {pois.map((p, i) => (
                  <span
                    key={p.id}
                    className={i === idx ? `dot on${paused ? " paused" : ""}` : i < idx ? "dot done" : "dot"}
                  />
                ))}
              </div>
            )}
            <div className="poi-panel-head">
              <span className="poi-count">
                {touring && <span className="tour-badge">Guided tour</span>}
                {idx + 1} / {pois.length}
              </span>
              <div className="poi-head-actions">
                {!touring && (
                  <button className="shop-icon" onClick={() => setPastOpen(true)} aria-label="Back in time">
                    ⏳ Past
                  </button>
                )}
                {market && !touring && (
                  <button className="shop-icon" onClick={() => setShopOpen(true)} aria-label="Open the market">
                    🛍️ Shop
                  </button>
                )}
                {touring && (
                  <button className="tour-pause" onClick={() => setPaused((p) => !p)}>
                    {paused ? "▶ Resume" : "⏸ Pause"}
                  </button>
                )}
                <button className="poi-close" onClick={touring ? endTour : () => setPoiId(null)}>
                  {touring ? "✕ End tour" : "✕ Explore freely"}
                </button>
              </div>
            </div>
            <h2>
              {activePoi.title}
              {activePoi.khmer && <span className="khmer"> {activePoi.khmer}</span>}
            </h2>
            <p>{activePoi.info}</p>
            <div className="poi-nav">
              <button onClick={() => step(-1)}>◂ Prev</button>
              <button onClick={() => step(1)}>Next ▸</button>
            </div>
          </div>
        ) : (
          <div className="hud">
            {!spot.live && <span className="tag">Coming soon · preview model</span>}
            {splat && spot.splat && <span className="tag">Gaussian splat · prototype</span>}
            <h1>
              {spot.name} <span className="khmer">{spot.khmer}</span>
            </h1>
            <p>
              {spot.province} · {spot.blurb}
            </p>
            <button className="credits-link" onClick={() => setCreditsOpen(true)}>
              ⓘ Credits &amp; licence
            </button>
            {pois && pois.length > 0 && (
              <>
                <div className="hud-actions">
                  <button className="tour-start" onClick={startTour}>
                    ▶ Start guided tour
                  </button>
                  <button className="shop-cta" onClick={() => setPastOpen(true)}>
                    ⏳ Past
                  </button>
                  {market && (
                    <button className="shop-cta" onClick={() => setShopOpen(true)}>
                      🛍️ Market
                    </button>
                  )}
                </div>
                <p className="poi-hint">
                  {spot.aerial
                    ? "◍ Tap a location to teleport down to it, or 🚶 walk in."
                    : "◍ Tap a marker to visit, or 🚶 walk in to explore freely."}
                </p>
              </>
            )}
          </div>
        ))}
    </>
  );
}
