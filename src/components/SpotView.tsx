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
import { KULEN_REGION_NOTE } from '../kulenRegion';
import { LocationGuide } from './LocationGuide';
import { ObjectInfoCard } from './ObjectHotspots';
import { objectInfoFor } from '../objectHotspots';
import { CaptureFlightButtons } from './CaptureFlightButtons';
import type { CaptureFlightMode } from '../captureFlight';

/** How long the guided tour lingers at each stop before moving on (ms). */
const TOUR_DWELL = 8000;

/** An individual heritage site: orbit or walk it, visit its points of interest. */
export function SpotView({ spot, onBack, backLabel = '← Map', enterPlace, initialPoiId = null }: {
  spot: Spot; onBack: () => void; backLabel?: string;
  enterPlace?: { id: string; label: string; onEnter: () => void };
  initialPoiId?: string | null;
}) {
  const [splat, setSplat] = useState(false);
  const [poiId, setPoiId] = useState<string | null>(initialPoiId);
  const [mode, setMode] = useState<"orbit" | "walk">("orbit");
  const [touring, setTouring] = useState(false);
  const [paused, setPaused] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [shopOpen, setShopOpen] = useState(false);
  const [pastOpen, setPastOpen] = useState(false);
  const [creditsOpen, setCreditsOpen] = useState(false);
  const [stopsOpen, setStopsOpen] = useState(!!spot.overviewOnly);
  const [captureOpen, setCaptureOpen] = useState(false);
  const [cleanCapture, setCleanCapture] = useState(true);
  const [flightMode,setFlightMode]=useState<CaptureFlightMode>('walking');
  const [selectedObject,setSelectedObject]=useState<string|null>(null);
  const [guideObject,setGuideObject]=useState<string|undefined>();
  const [guideRequest,setGuideRequest]=useState(0);
  const [poiCollapsed, setPoiCollapsed] = useState(false);
  const walkInput = useRef<WalkInput>({ move: { x: 0, y: 0 }, look: { dx: 0, dy: 0 } });
  const requestedVRCapture=useRef<string|null>(null);
  const market = marketForSpot(spot.id);

  const pois = spot.pois;
  const idx = pois ? pois.findIndex((p) => p.id === poiId) : -1;
  const activePoi = idx >= 0 && pois ? pois[idx] : null;
  const capture = captureOpen ? activePoi?.capture : undefined;
  useEffect(() => {
    const requested=requestedVRCapture.current===poiId&&poiId!==null;
    requestedVRCapture.current=null;
    setCaptureOpen(requested);
    if(requested){setMode('walk');setCleanCapture(true);}
    setPoiCollapsed(false);
    setFlightMode('walking');
    setSelectedObject(null);setGuideObject(undefined);
  }, [poiId]);
  const selectVRCapture=(id:string)=>{
    if(!pois?.some(p=>p.id===id&&p.capture))return;
    setTouring(false);setGuideOpen(false);setSelectedObject(null);setPoiCollapsed(true);
    walkInput.current={move:{x:0,y:0},look:{dx:0,dy:0}};
    setMode('walk');setCleanCapture(true);
    if(id===poiId)setCaptureOpen(true);
    else{requestedVRCapture.current=id;setPoiId(id);}
  };
  const step = (d: number) => {
    if (!pois || pois.length === 0) return;
    const base = idx < 0 ? 0 : (idx + d + pois.length) % pois.length;
    setPoiId(pois[base].id);
  };
  const toggleMode = () => {
    setPoiId(null);
    setTouring(false);
    setGuideOpen(false);
    setCleanCapture(true);
    setMode((m) => (m === "orbit" ? "walk" : "orbit"));
  };
  const toggleCaptureMode = () => {
    setTouring(false);
    setMode((current) => current === "orbit" ? "walk" : "orbit");
  };
  const closeCapture = () => {
    setMode("orbit");
    setCaptureOpen(false);
    setSelectedObject(null);setGuideObject(undefined);
    walkInput.current.move = { x: 0, y: 0 };
    walkInput.current.look = { dx: 0, dy: 0 };
    walkInput.current.jump = false;
    walkInput.current.flyToggle=false;walkInput.current.flyVertical=0;walkInput.current.flyStep=0;setFlightMode('walking');
  };
  const enterCapture = () => {
    setTouring(false);
    setGuideOpen(false);
    setCleanCapture(true);
    setMode(activePoi?.capture?.walk || activePoi?.capture?.walkAround ? "walk" : "orbit");
    setCaptureOpen(true);
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
        heritageUltraUrl={spot.heritageUltraModel}
        overview={spot.overview}
        blurb={spot.blurb}
        water={spot.water}
        splatUrl={spot.splat}
        splat={splat && !!spot.splat}
        capture={capture}
        cleanCapture={cleanCapture}
        onCaptureFlightChange={setFlightMode}
        vrTour={spot.id==='wat-phnom'?{title:spot.name,stops:pois?.filter(p=>!!p.capture)??[],activeId:capture?activePoi?.id:undefined,onSelect:selectVRCapture}:undefined}
        onSelectCaptureObject={capture && activePoi?.id==='naga-staircase'?setSelectedObject:undefined}
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
        sceneryGroundY={spot.sceneryGroundY}
        sceneryShadowNormalBias={spot.sceneryShadowNormalBias}
        terrainWalking={spot.terrainWalking}
        walkStart={spot.walkStart}
        overviewOnly={spot.overviewOnly}
        modelScale={spot.landscape === "angkor" ? 1.4 : 1}
        modelY={spot.landscape === "wat-phnom" ? 1.4 : 0}
      />

      {walking && <WalkControls
        input={walkInput}
        hint={capture ? "" : undefined}
      />}

      {capture && walking && <div className={`capture-step-nav${flightMode==='flying'?' flight-active':''}`}>
        {flightMode==='walking'&&<button title="Jump (Space)" onPointerDown={e=>e.preventDefault()} onClick={() => { walkInput.current.jump = true; }}>↑ Jump</button>}
        {(capture.walkAround||capture.walk)&&<CaptureFlightButtons input={walkInput} mode={flightMode}/>}
      </div>}

      {capture?.cleanup && <div className="capture-quality" role="group" aria-label="Capture view">
        <button aria-pressed={cleanCapture} title="Cropped capture with full 360° turning" onClick={() => setCleanCapture(true)}>Clean view</button>
        <button aria-pressed={!cleanCapture} title="Original capture with unrestricted looking, including incomplete areas" onClick={() => setCleanCapture(false)}>Full scan</button>
      </div>}

      {capture && activePoi?.id === 'naga-staircase' && <LocationGuide
        experienceId="staircase-3dgs" locationId={activePoi.id}
        objectId={guideObject} openRequest={guideRequest} hidden={!!selectedObject}
        onOpenChange={open => { if(open) { walkInput.current.move={x:0,y:0}; walkInput.current.look={dx:0,dy:0}; } }}
      />}

      {capture && selectedObject && objectInfoFor('staircase-3dgs','naga-staircase',selectedObject) && <ObjectInfoCard
        key={selectedObject} object={objectInfoFor('staircase-3dgs','naga-staircase',selectedObject)!}
        onClose={()=>setSelectedObject(null)} onAsk={()=>{setGuideObject(selectedObject);setGuideRequest(n=>n+1);setSelectedObject(null);}}
      />}

      <button className="backbtn" onClick={capture ? closeCapture : onBack}>
        {capture ? "← Temple model" : backLabel}
      </button>
      {spot.heritageUltraModel && !!pois?.length && !walking && !guideOpen && <div className="heritage-stops">
        <button aria-expanded={stopsOpen} aria-controls="heritage-stop-list" onClick={() => setStopsOpen(v => !v)}>Places to explore · {pois?.length ?? 0}</button>
        {stopsOpen && <nav id="heritage-stop-list" aria-label={`${spot.name} locations`}>
          {pois?.map((p, i) => <button key={p.id} aria-current={p.id === poiId ? "location" : undefined} onClick={() => { setTouring(false); setPoiId(p.id); setStopsOpen(false); }}>{i + 1}. {p.title}</button>)}
        </nav>}
      </div>}

      {spot.splat && !walking && (
        <button className="mode-toggle" onClick={() => setSplat((s) => !s)}>
          {splat ? "◼ Model" : "◍ Photoreal"}
        </button>
      )}

      {!spot.overviewOnly && !guideOpen && (!activePoi || !!capture) && (
        <button className="walk-toggle" onClick={capture ? toggleCaptureMode : toggleMode}>
          {walking
            ? (capture ? "⟳ Inspect capture" : "⟳ Inspect")
            : (capture?.walkAround ? "🚶 Walk around the clock" : capture ? "🚶 Walk staircase" : "🚶 Walk in")}
        </button>
      )}


      {/* Kiri the monkey guide tap to open the AI tour guide. */}
      {!walking && spot.live && !guideOpen && !activePoi && (
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

      {/* Back in Time a journey through Cambodia's ages, over this site. */}
      {!walking && pastOpen && <TimeTravel spot={spot} onClose={() => setPastOpen(false)} />}

      {/* Attribution & provenance for this site's heritage data (CC-BY commons). */}
      {creditsOpen && <Credits spotId={spot.id} onClose={() => setCreditsOpen(false)} />}

      {!walking &&
        !guideOpen &&
        !pastOpen &&
        (activePoi && pois ? (
          <div className={`poi-panel${touring ? " touring" : ""}${poiCollapsed ? " collapsed" : ""}`}>
            {poiCollapsed ? (
              <button
                className="poi-restore"
                onClick={() => setPoiCollapsed(false)}
                aria-label={`Show details for ${activePoi.title}`}
              >
                <span>{idx + 1} / {pois.length}</span>
                <strong>{activePoi.title}</strong>
                <span>▴ Show</span>
              </button>
            ) : <>
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
                <button
                  className="poi-minimize"
                  onClick={() => setPoiCollapsed(true)}
                  aria-label="Minimize place information"
                >
                  ▾ Hide
                </button>
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
            {enterPlace?.id === activePoi.id && <button className="capture-action" onClick={() => {
              setTouring(false); enterPlace.onEnter();
            }}>{enterPlace.label}</button>}
            {spot.overviewOnly && <p className="region-note">{KULEN_REGION_NOTE}</p>}
            {capture ? <small>Photo capture of {activePoi.title}. Some edges and unphotographed areas may be incomplete.</small>
              : spot.heritageUltraModel && <small>Illustrative Blender model. Layout and ornament are simplified, not a surveyed reconstruction.</small>}
            {activePoi.capture && <button className="capture-action" onClick={capture ? closeCapture : enterCapture}>
              {capture ? '← Back to temple model' : activePoi.capture.walkAround ? '🚶 Walk around the real clock' : activePoi.capture.walk ? '🚶 Walk the real staircase' : 'View 3D capture'}
            </button>}
            <div className="poi-nav">
              <button onClick={() => step(-1)}>◂ Prev</button>
              <button onClick={() => step(1)}>Next ▸</button>
            </div>
            </>}
          </div>
        ) : (
          <div className="hud">
            {!spot.live && <span className="tag">Coming soon · preview model</span>}
            {splat && spot.splat && <span className="tag">Gaussian splat · prototype</span>}
            {spot.heritageUltraModel && <span className="tag heritage-model-note">{spot.overviewOnly ? 'Mountain overview · selected landmarks' : 'Blender model · illustrative'}</span>}
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
                  {spot.overviewOnly ? 'Choose a landmark to inspect it. Open the waterfall study for ground-level exploration.' : spot.aerial
                    ? "◍ Tap a location to teleport down to it, or 🚶 walk in."
                    : "◍ Tap a marker to visit, or 🚶 walk in to explore freely."}
                </p>
                {spot.overviewOnly && <p className="region-note">{KULEN_REGION_NOTE}</p>}
              </>
            )}
          </div>
        ))}
    </>
  );
}
