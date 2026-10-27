import { Canvas, useFrame } from "@react-three/fiber";
import { ExploreControls as OrbitControls } from './ExploreControls';
import { createXRStore, XR, XROrigin, useXR } from "@react-three/xr";
import { Suspense, useEffect, useLayoutEffect, useMemo, useReducer, useRef, useState } from "react";
import { Object3D, type InstancedMesh, type Group } from "three";
import { FARM_STAGES, FARM_CREDENTIAL } from "../farm";
import { claimCredential, getIdentity, earnedAchievements } from "../lib/identity";
import { registerPlot, shareCheckin, listPlots, getPlot, type SharedPlot } from "../lib/farmShare";
import { CAMBODIA_PROVINCES } from "../cambodia-provinces";
import { prettyProvince } from "../spots";
import { FARM_ACTIVITIES, FARM_JOURNEY_KEY, farmDoneCount, farmJourneyReducer, farmPatch, farmQuality, farmRiceHeight, farmStageDone, nextFarmStage, parseFarmJourney } from '../farmJourney';
import { FarmActivity } from './FarmActivity';
import { FarmModels, FarmModelBoundary } from './FarmModels';
import { riceLook } from '../farmAppearance';
import './FarmExperience.css';

/**
 * The Virtual Farm the Khmer rice year, two ways:
 *
 *  • Learn a guided walk through the growing cycle (ploughing → seedbed →
 *    transplanting → tending water → harvest → threshing → granary), earning a
 *    Heritage Passport credential.
 *
 *  • My Farm (the Living Farm) a farmer photographs their real paddy over the
 *    season and tags each photo with its stage; the virtual paddy then *grows to
 *    match*, and anyone can scrub the timeline to watch a real field come to
 *    life. This offline prototype keeps the diary on the device (localStorage);
 *    the concept and the path to a shared, consented photo commons are written
 *    up in docs/LIVING_FARM.md.
 *
 * Explorable in 3D and VR. Small self-hosted Blender assets with a procedural
 * loading/error fallback keep the lesson available in either quality mode.
 */
const NO_TASKS: number[] = [];
const DIARY_KEY = "camboverse.farm.diary.v1";
const PLOT_KEY = "camboverse.farm.plot.v1"; // the shared plot id, once created

interface CheckIn {
  id: string;
  date: string; // YYYY-MM-DD
  stageId: string;
  growth: number;
  photo: string; // downscaled data URL
  note?: string;
  shared?: boolean;
}

type Mode = "learn" | "diary" | "community";

export function FarmView({ onBackToMap }: { onBackToMap: () => void }) {
  const store = useMemo(() => createXRStore({ emulate: false }), []);
  const [vrSupported, setVrSupported] = useState(false);
  const [mode, setMode] = useState<Mode>("learn");

  // Learn-mode journey.
  const [journey, dispatch] = useReducer(farmJourneyReducer, null, () => {
    try { return parseFarmJourney(localStorage.getItem(FARM_JOURNEY_KEY)); } catch { return parseFarmJourney(null); }
  });
  const index = FARM_STAGES.findIndex(s => s.id === journey.stageId);
  const done = new Set(FARM_STAGES.filter(s => farmStageDone(journey, s.id)).map(s => s.id));
  const [collapsed, setCollapsed] = useState(false);
  const [resetPending, setResetPending] = useState(false);
  const [saveWarning, setSaveWarning] = useState(false);
  const [feedback, setFeedback] = useState('Choose a patch to begin. You can return to any stage.');
  const [celebrationDismissed, setCelebrationDismissed] = useState(false);
  const [quality, setQuality] = useState<'normal' | 'ultra'>(() => typeof navigator === 'undefined' ? 'normal' : farmQuality(navigator.hardwareConcurrency, (navigator as Navigator & {deviceMemory?: number}).deviceMemory, typeof window === 'undefined' || Math.min(window.innerWidth, window.innerHeight) < 500));
  const [inVR, setInVR] = useState(false);
  const detailed = inVR || quality === 'ultra';
  const [motion, setMotion] = useState(() => typeof window !== 'undefined' && !window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [vrError, setVrError] = useState('');
  const [modelUnavailable, setModelUnavailable] = useState(false);
  const [pulse, setPulse] = useState(0);
  const [claimed, setClaimed] = useState(false);
  const [claimFailed, setClaimFailed] = useState(false);
  const [alreadyDone, setAlreadyDone] = useState(false);

  // Diary (Living Farm) persisted on the device.
  const [checks, setChecks] = useState<CheckIn[]>(() => loadChecks());
  const [sel, setSel] = useState(0);
  const [adding, setAdding] = useState<string | null>(null); // pending photo data URL
  const fileRef = useRef<HTMLInputElement>(null);

  // Sharing to the commons (Phase 2).
  const [plotId, setPlotId] = useState<string | null>(() => {
    try { return localStorage.getItem(PLOT_KEY); } catch { return null; }
  });
  const [sharing, setSharing] = useState(false); // share modal open
  const [shareBusy, setShareBusy] = useState(false);

  // Community public shared farms.
  const [communityPlot, setCommunityPlot] = useState<SharedPlot | null>(null);
  const [communitySel, setCommunitySel] = useState(0);

  const stage = FARM_STAGES[index];
  const allDone = done.size === FARM_STAGES.length;
  const stageDone = done.has(stage.id);
  const stageTasks = journey.tasks[stage.id] ?? NO_TASKS;

  useEffect(() => {
    try { localStorage.setItem(FARM_JOURNEY_KEY, JSON.stringify(journey)); setSaveWarning(false); }
    catch { setSaveWarning(true); }
  }, [journey]);

  // Growth that drives the 3D paddy depends on the mode.
  const selCheck = checks[Math.min(sel, checks.length - 1)];
  const communityCheck = communityPlot?.checkins?.[communitySel];
  const growth =
    mode === "learn"
      ? stage.growth
      : mode === "community"
        ? (communityCheck?.growth ?? -1)
        : (selCheck?.growth ?? -1);

  useEffect(() => {
    const xr = (navigator as Navigator & { xr?: { isSessionSupported(m: string): Promise<boolean> } }).xr;
    xr?.isSessionSupported("immersive-vr").then(setVrSupported).catch(() => setVrSupported(false));
  }, []);

  useEffect(() => {
    let live = true;
    (async () => {
      const set = await earnedAchievements(await getIdentity(false));
      if (live) setAlreadyDone(set.has(FARM_CREDENTIAL));
    })();
    return () => {
      live = false;
    };
  }, []);

  useEffect(() => {
    if (allDone && !claimed && !alreadyDone) {
      setClaimed(true);
      setClaimFailed(false);
      claimCredential(FARM_CREDENTIAL, `cycle:${FARM_STAGES.length}`).then((ok) => {
        if (ok) setAlreadyDone(true);
        else setClaimFailed(true);
      }).catch(() => setClaimFailed(true));
    }
  }, [allDone, claimed, alreadyDone]);

  useEffect(() => setSel(Math.max(0, checks.length - 1)), [checks.length]);

  const act = (task: number) => {
    if (stageDone || stageTasks.includes(task)) return;
    if (!FARM_ACTIVITIES[stage.id].valid.includes(task)) {
      setFeedback('That is light chaff. Leave it behind and keep the grain bundles.'); return;
    }
    dispatch({ type: 'task', stageId: stage.id, task });
    setPulse(p => p + 1);
    setFeedback(`${FARM_ACTIVITIES[stage.id].labels[task]} complete.`);
  };
  const goto = (i: number) => {
    dispatch({ type: 'select', stageId: FARM_STAGES[i].id });
    setFeedback(''); setResetPending(false);
  };
  const next = () => { dispatch({ type: 'select', stageId: nextFarmStage(journey) }); setFeedback(''); };
  const restart = () => {
    dispatch({ type: 'reset' }); setResetPending(false); setCelebrationDismissed(false);
    setClaimed(false); setClaimFailed(false); setFeedback('A new practice season is ready. Your photos and Passport are unchanged.');
  };

  const onPickFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-picking the same file
    if (!file) return;
    try {
      setAdding(await downscaleImage(file));
    } catch {
      /* ignore an unreadable image */
    }
  };
  const saveCheck = (stageId: string, note: string) => {
    const st = FARM_STAGES.find((s) => s.id === stageId)!;
    const c: CheckIn = {
      id: `${Date.now()}`,
      date: new Date().toISOString().slice(0, 10),
      stageId,
      growth: st.growth,
      photo: adding!,
      note: note.trim() || undefined,
    };
    const nextChecks = [...checks, c];
    setChecks(nextChecks);
    saveChecks(nextChecks);
    setAdding(null);
    setMode("diary");
  };
  const removeCheck = (id: string) => {
    const nextChecks = checks.filter((c) => c.id !== id);
    setChecks(nextChecks);
    saveChecks(nextChecks);
  };

  // Share this season to the commons: register a plot (once), then push each
  // not-yet-shared check-in. Everything goes up pending, for moderation.
  const shareSeason = async (name: string, province: string, variety: string, consentOwner: string) => {
    setShareBusy(true);
    try {
      let id = plotId;
      if (!id) {
        const res = await registerPlot({ name, province, variety: variety || undefined, consentOwner });
        if (!res) return;
        id = res.id;
        setPlotId(id);
        try { localStorage.setItem(PLOT_KEY, id); } catch { /* ignore */ }
      }
      const updated: CheckIn[] = [];
      for (const c of checks) {
        if (c.shared) { updated.push(c); continue; }
        const ok = await shareCheckin(id, {
          stageId: c.stageId, growth: c.growth, note: c.note, photo: c.photo, takenOn: c.date,
        });
        updated.push(ok ? { ...c, shared: true } : c);
      }
      setChecks(updated);
      saveChecks(updated);
      setSharing(false);
    } finally {
      setShareBusy(false);
    }
  };

  const openCommunityPlot = async (id: string) => {
    const pl = await getPlot(id);
    if (pl) {
      setCommunityPlot(pl);
      setCommunitySel(Math.max(0, (pl.checkins?.length ?? 1) - 1));
    }
  };

  return (
    <div className="farm">
      <Canvas dpr={detailed ? [1, 1.75] : [1, 1.25]} camera={{ position: [9, 7.5, 11], fov: 45 }} gl={{ antialias: true }} shadows={detailed}>
        <XR store={store}>
          <color attach="background" args={["#d2e2df"]} />
          <fog attach="fog" args={["#d2e2df", 19, 42]} />
          <ambientLight intensity={0.65} />
          <directionalLight position={[6, 12, 8]} intensity={2.1} color="#ffe1ac" castShadow={detailed} shadow-mapSize={[1024, 1024]}
            shadow-camera-left={-12} shadow-camera-right={12} shadow-camera-top={12} shadow-camera-bottom={-12}
            shadow-camera-near={.5} shadow-camera-far={40} shadow-normalBias={.025} />
          <hemisphereLight args={["#dcecff", "#716545", 0.8]} />
          <FarmScene growth={growth} pulse={pulse} accent={mode === "learn" ? stage.color : "#4c8a3f"}
            stageId={mode === 'learn' ? stage.id : undefined} tasks={mode === 'learn' ? stageTasks : NO_TASKS}
            water={mode === 'learn' && stage.id === 'water' ? journey.water : 50} detailed={detailed} motion={motion && detailed} onTask={act} onUnavailable={() => setModelUnavailable(true)} />
          <XROrigin position={[0, 0, 5]} />
          <FarmXRState onChange={setInVR} />
          <Nav />
        </XR>
      </Canvas>

      {/* ---- HUD ---- */}
      <div className="cls-top">
        <button className="backbtn" onClick={onBackToMap}>
          ← Map
        </button>
        <span className="cls-title">🌾 Virtual Farm</span>
        <button className="farm-quality" disabled={inVR} onClick={() => setQuality(q => q === 'normal' ? 'ultra' : 'normal')}
          aria-label={`View quality: ${detailed ? 'Ultra' : 'Normal'}. Switch quality`}>
          {detailed ? '✨ Ultra' : '🍃 Normal'}
        </button>
        {vrSupported && (
          <button className="vr-btn cls-vr" onClick={() => {
            setVrError(''); setInVR(true);
            store.enterVR().then(session => { if (!session) setInVR(false); }).catch(() => {
              setInVR(false); setVrError('VR could not start. You can still explore on this screen.');
            });
          }}>
            🥽 VR
          </button>
        )}
      </div>
      {vrError && <p className="farm-notice" role="status">{vrError}</p>}
      {modelUnavailable && <p className="farm-notice" role="status">Detailed farm assets could not load. The simple farm and all lessons still work. Refresh to retry.</p>}

      <div className="farm-modes">
        <button className={mode === "learn" ? "farm-seg on" : "farm-seg"} onClick={() => setMode("learn")}>
          📖 Learn
        </button>
        <button className={mode === "diary" ? "farm-seg on" : "farm-seg"} onClick={() => setMode("diary")}>
          🌱 My Farm{checks.length ? ` · ${checks.length}` : ""}
        </button>
        <button
          className={mode === "community" ? "farm-seg on" : "farm-seg"}
          onClick={() => { setMode("community"); setCommunityPlot(null); }}
        >
          🌏 Community
        </button>
      </div>

      {mode === "learn" ? (
        <>
          <div className="farm-steps">
            {FARM_STAGES.map((s, i) => (
              <button
                key={s.id}
                className={`farm-step${i === index ? " on" : ""}${done.has(s.id) ? " done" : ""}`}
                style={i === index ? { borderColor: s.color } : undefined}
                onClick={() => goto(i)}
                aria-label={s.english}
                aria-current={i === index ? 'step' : undefined}
                title={s.english}
              >
                <span className="farm-step-emoji">{s.emoji}</span>
                {done.has(s.id) && <span className="farm-step-tick">✓</span>}
              </button>
            ))}
          </div>

          <div className={`farm-info farm-learning${collapsed ? ' is-collapsed' : ''}`} style={{ borderColor: stage.color }}>
            <div className="farm-info-head">
              <span className="farm-emoji" aria-hidden="true">{stage.emoji}</span>
              <div>
                <span className="farm-en">THE RICE JOURNEY · {farmDoneCount(journey)} / {FARM_STAGES.length} stages</span>
                <h2>{stage.english}</h2>
              </div>
              <button className="farm-fold" onClick={() => setCollapsed(c => !c)} aria-expanded={!collapsed} aria-controls="farm-learning-content">
                {collapsed ? 'Show lesson' : 'Hide'}
              </button>
            </div>
            {!collapsed && <div id="farm-learning-content">
              <div className="farm-lesson-nav">
                <button disabled={index === 0} onClick={() => goto(index - 1)}>← Previous</button>
                <span>{index + 1} / {FARM_STAGES.length}</span>
                <button disabled={index === FARM_STAGES.length - 1} onClick={() => goto(index + 1)}>Next →</button>
              </div>
              <FarmActivity journey={journey} onTask={act} onWater={value => dispatch({ type: 'water', value })} />
              <p className="farm-feedback" role="status">{feedback || (stageDone ? 'Stage complete. You can revisit any stage.' : 'Use the activity buttons or the matching field markers.')}</p>
              {stageDone && !allDone && <button className="farm-next" onClick={next}>Continue to unfinished stage →</button>}
              <details className="farm-story">
                <summary>Story &amp; traditional tools</summary>
                <p><span className="khmer">{stage.khmer}</span> · {stage.name}</p>
                <p>🛠️ <span className="khmer">{stage.tool.khmer}</span> · {stage.tool.roman} · {stage.tool.english}</p>
                <p>{stage.fact}</p>
                <small>A simplified transplanted-rice journey. Practices vary; direct seeding and mechanised methods also exist. Khmer text and cultural details await local editorial review.</small>
                <a href="https://dsrc.irri.org/our-work/what-is-dsr" target="_blank" rel="noreferrer">IRRI: direct seeding and transplanting</a>
              </details>
              {allDone && !celebrationDismissed && <section className="farm-complete" aria-label="Rice journey complete">
                <h3>🌾 The harvest is in!</h3>
                <p>You completed all seven stages. Explore the farm or start another practice season.</p>
                <p role="status">{alreadyDone ? 'Your Virtual Farm credential is saved in your Heritage Passport.'
                  : claimFailed ? 'Your lesson is complete. The Passport could not be reached—retry when connected.'
                  : 'Saving your Passport credential…'}</p>
                {claimFailed && !alreadyDone && <button onClick={() => setClaimed(false)}>Retry Passport save</button>}
                <button onClick={() => setCelebrationDismissed(true)}>Keep exploring</button>
              </section>}
              <div className="farm-lesson-footer">
                <span>{saveWarning ? 'Progress cannot be saved on this device. Keep this page open.' : 'Progress saved on this device'}</span>
                <button aria-pressed={motion} onClick={() => setMotion(m => !m)}>{motion ? 'Pause motion' : 'Enable motion'}</button>
                <button onClick={() => setResetPending(p => !p)}>New practice season</button>
              </div>
              {resetPending && <div className="farm-reset" role="group" aria-label="Confirm new practice season">
                <p>Reset only the lesson activities? Your photo diary and Passport will stay unchanged.</p>
                <button onClick={restart}>Start new season</button>
                <button onClick={() => setResetPending(false)}>Cancel</button>
              </div>}
            </div>}
          </div>
        </>
      ) : mode === "diary" ? (
        <DiaryPanel
          checks={checks}
          sel={Math.min(sel, checks.length - 1)}
          onScrub={setSel}
          onAdd={() => fileRef.current?.click()}
          onRemove={removeCheck}
          shared={!!plotId}
          unsharedCount={checks.filter((c) => !c.shared).length}
          onShare={() => setSharing(true)}
        />
      ) : (
        <CommunityPanel
          plot={communityPlot}
          sel={communitySel}
          onOpen={openCommunityPlot}
          onScrub={setCommunitySel}
          onClose={() => setCommunityPlot(null)}
        />
      )}

      {/* Hidden picker uses the device camera on mobile. */}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: "none" }}
        onChange={onPickFile}
      />

      {adding && <AddCheckModal photo={adding} onSave={saveCheck} onCancel={() => setAdding(null)} />}
      {sharing && (
        <ShareModal busy={shareBusy} alreadyPlot={!!plotId} onShare={shareSeason} onCancel={() => setSharing(false)} />
      )}
    </div>
  );
}

/* ---------- Living-Farm diary UI ---------- */

function DiaryPanel({
  checks,
  sel,
  onScrub,
  onAdd,
  onRemove,
  shared,
  unsharedCount,
  onShare,
}: {
  checks: CheckIn[];
  sel: number;
  onScrub: (i: number) => void;
  onAdd: () => void;
  onRemove: (id: string) => void;
  shared: boolean;
  unsharedCount: number;
  onShare: () => void;
}) {
  if (checks.length === 0) {
    return (
      <div className="farm-diary farm-diary-empty">
        <p className="farm-diary-lead">
          <b>Your Living Farm.</b> Photograph your real paddy through the season and tag each photo with its
          stage the virtual field grows to match, and you can watch the whole season play back.
        </p>
        <button className="farm-add" onClick={onAdd}>
          📷 Add the first photo
        </button>
        <p className="farm-diary-note">Kept on this device for now see docs/LIVING_FARM.md for the plan to share it.</p>
      </div>
    );
  }
  const c = checks[sel];
  const st = FARM_STAGES.find((s) => s.id === c.stageId);
  return (
    <div className="farm-diary">
      <div className="farm-diary-top">
        <img className="farm-photo" src={c.photo} alt={`Paddy on ${c.date}`} />
        <div className="farm-diary-meta">
          <div className="farm-diary-date">
            {st?.emoji} {c.date}
          </div>
          <div className="farm-diary-stage" style={{ color: st?.color }}>
            <span className="khmer">{st?.khmer}</span> · {st?.english}
          </div>
          {c.note && <div className="farm-diary-noteline">“{c.note}”</div>}
          <button className="farm-remove" onClick={() => onRemove(c.id)}>
            Remove
          </button>
        </div>
      </div>

      {checks.length > 1 && (
        <div className="farm-scrub">
          <span className="farm-scrub-cap">
            {sel + 1} / {checks.length}
          </span>
          <input
            type="range"
            min={0}
            max={checks.length - 1}
            value={sel}
            onChange={(e) => onScrub(Number(e.target.value))}
            aria-label="Scrub the season"
          />
        </div>
      )}

      <div className="farm-diary-actions">
        <button className="farm-add" onClick={onAdd}>
          📷 Add a photo
        </button>
        <button className="farm-share" onClick={onShare}>
          {shared ? (unsharedCount ? `🌏 Share ${unsharedCount} new` : "🌏 Shared ✓") : "🌏 Share this season"}
        </button>
      </div>
      <p className="farm-diary-note">
        Sharing sends your photos to the CamboVerse commons (CC-BY) held for review before they appear.
        See docs/LIVING_FARM.md.
      </p>
    </div>
  );
}

/* ---------- Share to the commons ---------- */

function ShareModal({
  busy,
  alreadyPlot,
  onShare,
  onCancel,
}: {
  busy: boolean;
  alreadyPlot: boolean;
  onShare: (name: string, province: string, variety: string, consentOwner: string) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [province, setProvince] = useState(CAMBODIA_PROVINCES[0].name);
  const [variety, setVariety] = useState("");
  const [owner, setOwner] = useState("");
  const [consent, setConsent] = useState(false);
  const canShare = consent && (alreadyPlot || name.trim().length > 0);
  return (
    <div className="farm-modal" onClick={onCancel}>
      <div className="farm-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="farm-modal-top">
          <span className="farm-modal-title">🌏 Share to CamboVerse</span>
          <button className="cls-close" onClick={onCancel} aria-label="Close">
            ✕
          </button>
        </div>
        {alreadyPlot ? (
          <p className="farm-modal-q">Share your new photos to your farm. They’re held for review first.</p>
        ) : (
          <>
            <p className="farm-modal-q">Tell us about your farm. Only a coarse (village-level) location is ever stored.</p>
            <input
              className="farm-modal-note"
              placeholder="Farm / plot name e.g. Sok family paddy"
              value={name}
              maxLength={60}
              onChange={(e) => setName(e.target.value)}
            />
            <select className="farm-modal-note" value={province} onChange={(e) => setProvince(e.target.value)}>
              {CAMBODIA_PROVINCES.map((p) => (
                <option key={p.pcode} value={p.name}>
                  {prettyProvince(p.name)}
                </option>
              ))}
            </select>
            <input
              className="farm-modal-note"
              placeholder="Rice variety (optional) e.g. Phka Rumduol"
              value={variety}
              maxLength={40}
              onChange={(e) => setVariety(e.target.value)}
            />
            <input
              className="farm-modal-note"
              placeholder="Your name to credit (optional)"
              value={owner}
              maxLength={40}
              onChange={(e) => setOwner(e.target.value)}
            />
          </>
        )}
        <label className="farm-consent">
          <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
          <span>
            I took these photos and agree to share them as an open (CC-BY) contribution to the CamboVerse
            heritage commons.
          </span>
        </label>
        <button className="farm-modal-save" disabled={!canShare || busy} onClick={() => onShare(name.trim(), province, variety.trim(), owner.trim())}>
          {busy ? "Sharing…" : "Share to the commons"}
        </button>
      </div>
    </div>
  );
}

/* ---------- Community: browse shared farms ---------- */

function CommunityPanel({
  plot,
  sel,
  onOpen,
  onScrub,
  onClose,
}: {
  plot: SharedPlot | null;
  sel: number;
  onOpen: (id: string) => void;
  onScrub: (i: number) => void;
  onClose: () => void;
}) {
  const [province, setProvince] = useState("");
  const [plots, setPlots] = useState<SharedPlot[] | null>(null);

  useEffect(() => {
    let live = true;
    setPlots(null);
    listPlots(province || undefined).then((ps) => live && setPlots(ps));
    return () => {
      live = false;
    };
  }, [province]);

  if (plot) {
    const c = plot.checkins?.[sel];
    const st = c ? FARM_STAGES.find((s) => s.id === c.stageId) : undefined;
    return (
      <div className="farm-diary">
        <div className="farm-diary-top">
          {c?.photo ? (
            <img className="farm-photo" src={c.photo} alt={`${plot.name} on ${c.takenOn}`} />
          ) : (
            <div className="farm-photo farm-photo-empty">No photos yet</div>
          )}
          <div className="farm-diary-meta">
            <div className="farm-diary-date">
              {st?.emoji} {plot.name}
            </div>
            <div className="farm-community-where">
              {prettyProvince(plot.province)}
              {plot.variety ? ` · ${plot.variety}` : ""}
            </div>
            {c && (
              <div className="farm-diary-stage" style={{ color: st?.color }}>
                <span className="khmer">{st?.khmer}</span> · {st?.english} · {c.takenOn}
              </div>
            )}
            {c?.note && <div className="farm-diary-noteline">“{c.note}”</div>}
            <button className="farm-remove" onClick={onClose}>
              ← All farms
            </button>
          </div>
        </div>
        {(plot.checkins?.length ?? 0) > 1 && (
          <div className="farm-scrub">
            <span className="farm-scrub-cap">
              {sel + 1} / {plot.checkins!.length}
            </span>
            <input
              type="range"
              min={0}
              max={plot.checkins!.length - 1}
              value={sel}
              onChange={(e) => onScrub(Number(e.target.value))}
              aria-label="Scrub this farm's season"
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="farm-diary">
      <div className="farm-community-head">
        <b>Living farms</b>
        <select className="farm-community-filter" value={province} onChange={(e) => setProvince(e.target.value)}>
          <option value="">All provinces</option>
          {CAMBODIA_PROVINCES.map((p) => (
            <option key={p.pcode} value={p.name}>
              {prettyProvince(p.name)}
            </option>
          ))}
        </select>
      </div>
      {plots === null ? (
        <p className="farm-diary-note">Loading…</p>
      ) : plots.length === 0 ? (
        <p className="farm-diary-note">
          No shared farms yet{province ? ` in ${prettyProvince(province)}` : ""}. Be the first open{" "}
          <b>My Farm</b> and share your season.
        </p>
      ) : (
        <ul className="farm-community-list">
          {plots.map((p) => (
            <li key={p.id}>
              <button className="farm-community-card" onClick={() => onOpen(p.id)}>
                <span className="farm-community-name">{p.name}</span>
                <span className="farm-community-sub">
                  {prettyProvince(p.province)} · {p.approvedCheckins} photo{p.approvedCheckins === 1 ? "" : "s"}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function AddCheckModal({
  photo,
  onSave,
  onCancel,
}: {
  photo: string;
  onSave: (stageId: string, note: string) => void;
  onCancel: () => void;
}) {
  const [stageId, setStageId] = useState("transplant"); // a sensible mid-cycle default
  const [note, setNote] = useState("");
  return (
    <div className="farm-modal" onClick={onCancel}>
      <div className="farm-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="farm-modal-top">
          <span className="farm-modal-title">Tag this photo</span>
          <button className="cls-close" onClick={onCancel} aria-label="Close">
            ✕
          </button>
        </div>
        <img className="farm-modal-photo" src={photo} alt="Your paddy" />
        <p className="farm-modal-q">Which stage is your paddy at?</p>
        <div className="farm-modal-stages">
          {FARM_STAGES.map((s) => (
            <button
              key={s.id}
              className={s.id === stageId ? "farm-chip on" : "farm-chip"}
              style={s.id === stageId ? { background: s.color, borderColor: s.color } : { borderColor: s.color }}
              onClick={() => setStageId(s.id)}
            >
              {s.emoji} {s.english}
            </button>
          ))}
        </div>
        <input
          className="farm-modal-note"
          placeholder="A note (optional) e.g. first rain, transplanting day…"
          value={note}
          maxLength={80}
          onChange={(e) => setNote(e.target.value)}
        />
        <button className="farm-modal-save" onClick={() => onSave(stageId, note)}>
          Save to my farm
        </button>
      </div>
    </div>
  );
}

/* ---------- storage + image helpers ---------- */

function loadChecks(): CheckIn[] {
  try {
    const raw = localStorage.getItem(DIARY_KEY);
    return raw ? (JSON.parse(raw) as CheckIn[]) : [];
  } catch {
    return [];
  }
}
function saveChecks(checks: CheckIn[]) {
  try {
    localStorage.setItem(DIARY_KEY, JSON.stringify(checks));
  } catch {
    /* quota / private mode the diary just won't persist */
  }
}

/** Downscale a photo on-device before storing small enough for a $150 phone
 * and, later, a 4G upload. */
function downscaleImage(file: File, max = 1024, quality = 0.72): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const w = Math.max(1, Math.round(img.width * scale));
      const h = Math.max(1, Math.round(img.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        URL.revokeObjectURL(url);
        reject(new Error("no 2d context"));
        return;
      }
      ctx.drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("image load failed"));
    };
    img.src = url;
  });
}

/* ---------- 3D scene (growth-driven) ---------- */

interface FarmSceneProps {
  growth: number; pulse: number; accent: string; stageId?: string; tasks: number[]; water: number;
  detailed: boolean; motion: boolean; onTask: (task: number) => void;
}
function FarmScene(props: FarmSceneProps & {onUnavailable: () => void}) {
  const fallback = <FarmFallbackScene {...props} />;
  return <FarmModelBoundary fallback={fallback} onUnavailable={props.onUnavailable}>
    <Suspense fallback={fallback}>
      <FarmModels {...props} />
      <Paddy flooded={props.growth >= 0 && props.growth < .75} water={props.water} detailed={props.detailed} refined />
      <FarmWork stageId={props.stageId} tasks={props.tasks} onTask={props.onTask} detailed={props.detailed} />
    </Suspense>
  </FarmModelBoundary>;
}
function FarmFallbackScene({ growth, pulse, accent, stageId, tasks, water, detailed, motion, onTask }: FarmSceneProps) {
  return (
    <>
      <Paddy flooded={growth >= 0 && growth < 0.75} water={water} detailed={detailed} />
      <RicePaddy growth={growth} pulse={pulse} stageId={stageId} tasks={tasks} detailed={detailed} motion={motion} />
      {growth >= 0 && growth < 0.06 && <Buffalo pulse={pulse} motion={motion} />}
      <FarmWork stageId={stageId} tasks={tasks} onTask={onTask} detailed={detailed} />
      {growth >= 0.1 && growth <= 0.9 && <Person position={[1.6, 0, 1.9]} rotation={-0.7} color={accent} />}
      <StiltHouse position={[-3.4, 0, -2.6]} />
      <Granary sacks={stageId === 'store' ? tasks.length : 0} detailed={detailed} />
      <Palm position={[3.5, 0, -2.2]} h={3.2} />
      <Palm position={[4.2, 0, -0.6]} h={2.6} />
    </>
  );
}

/** The paddy: dirt ground, a water field (when flooded), and earthen dikes. */
function Paddy({ flooded, water, detailed, refined = false }: { flooded: boolean; water: number; detailed: boolean; refined?: boolean }) {
  return (
    <group>
      {!refined && <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[16, detailed ? 64 : 24]} />
        <meshStandardMaterial color="#6d803d" roughness={1} />
      </mesh>}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]} receiveShadow>
        <planeGeometry args={[5.2, 5.2]} />
        <meshStandardMaterial color={flooded ? "#6b7f52" : "#8a6a3a"} roughness={0.9} />
      </mesh>
      {flooded && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.025 + water * .0007, 0]}>
          <planeGeometry args={[5, 5]} />
          <meshStandardMaterial color="#5a86a8" transparent opacity={0.55} roughness={0.3} metalness={0.1} />
        </mesh>
      )}
      {[
        [0, 2.6, 4.96, 0.24],
        [0, -2.6, 4.96, 0.24],
        [2.6, 0, 0.24, 5.44],
        [-2.6, 0, 0.24, 5.44],
        [0, 0, 4.96, 0.14],
      ].map(([x, z, w, d], i) => (
        <mesh key={i} position={[x, 0.09, z]} castShadow>
          <boxGeometry args={[w, 0.18, d]} />
          <meshStandardMaterial color="#6b4f2c" roughness={1} />
        </mesh>
      ))}
    </group>
  );
}


/** Rice stalks as one InstancedMesh hundreds of stalks, one draw call. */
function RicePaddy({ growth, pulse, stageId, tasks, detailed, motion }: {
  growth: number; pulse: number; stageId?: string; tasks: number[]; detailed: boolean; motion: boolean;
}) {
  const ref = useRef<InstancedMesh>(null);
  const dummy = useMemo(() => new Object3D(), []);
  const COLS = 22;
  const look = riceLook(growth);

  const cells = useMemo(() => {
    const out: [number, number][] = [];
    for (let r = 0; r < COLS; r++) {
      for (let c = 0; c < COLS; c++) {
        const x = (c / (COLS - 1) - 0.5) * 4.4;
        const z = (r / (COLS - 1) - 0.5) * 4.4;
        out.push([x, z]);
      }
    }
    return out;
  }, []);

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    if (!look.show) {
      mesh.count = 0;
      mesh.instanceMatrix.needsUpdate = true;
      return;
    }
    let i = 0;
    cells.forEach(([x, z], idx) => {
      if (look.seedbed && !(x < -0.9 && z < -0.9)) return; // nursery corner only
      const jx = (((idx * 37) % 20) / 20 - 0.5) * 0.14;
      const jz = (((idx * 53) % 20) / 20 - 0.5) * 0.14;
      // Nursery has its own four patches inside the far-left corner.
      const patch = look.seedbed ? farmPatch(x + 1.6, z + 1.6) : farmPatch(x, z);
      const h = farmRiceHeight(stageId, tasks, patch, look.height) * (0.82 + ((idx * 13) % 10) / 28);
      if (!h) return;
      dummy.position.set(x + jx, h / 2 + 0.05, z + jz);
      dummy.scale.set(1, h, 1);
      dummy.rotation.set(0, (idx % 7) * 0.4, 0);
      dummy.updateMatrix();
      mesh.setMatrixAt(i++, dummy.matrix);
    });
    mesh.count = i;
    mesh.instanceMatrix.needsUpdate = true;
    // A field starts empty: refresh its bounds after planting so frustum culling
    // and picking do not reuse the empty field's cached bounding sphere.
    mesh.computeBoundingSphere();
  }, [cells, dummy, look.show, look.height, look.seedbed, pulse, stageId, tasks]);

  useFrame((state) => {
    // Do not rotate the whole field: that lifted roots out of the water.
    if (ref.current) ref.current.rotation.z = 0;
    if (ref.current && motion) ref.current.scale.y = 1 + Math.sin(state.clock.elapsedTime * 1.4) * .008;
    else if (ref.current) ref.current.scale.y = 1;
  });

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, COLS * COLS]} castShadow>
      <coneGeometry args={[0.05, 1, detailed ? 7 : 3]} />
      <meshStandardMaterial color={look.color} roughness={0.9} />
    </instancedMesh>
  );
}

function Buffalo({ pulse, motion }: { pulse: number; motion: boolean }) {
  const ref = useRef<Group>(null);
  const lurch = useRef(0);
  useEffect(() => {
    lurch.current = 0.35;
  }, [pulse]);
  useFrame((state, dt) => {
    if (!ref.current) return;
    lurch.current = Math.max(0, lurch.current - dt);
    ref.current.position.x = -1.6 + (motion ? lurch.current * 0.6 : 0);
    ref.current.position.y = motion ? Math.sin(state.clock.elapsedTime * 2) * 0.02 : 0;
  });
  return (
    <group ref={ref} position={[-1.6, 0, 0.6]} rotation={[0, -0.3, 0]}>
      <mesh position={[0, 0.62, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <capsuleGeometry args={[0.34, 0.9, 6, 10]} />
        <meshStandardMaterial color="#4a4a52" roughness={0.85} />
      </mesh>
      {[[-0.4, 0.3], [-0.4, -0.3], [0.4, 0.3], [0.4, -0.3]].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.22, z]} castShadow>
          <cylinderGeometry args={[0.07, 0.07, 0.44, 6]} />
          <meshStandardMaterial color="#3c3c44" />
        </mesh>
      ))}
      <group position={[0.7, 0.72, 0]}>
        <mesh castShadow>
          <boxGeometry args={[0.34, 0.28, 0.3]} />
          <meshStandardMaterial color="#43434c" roughness={0.85} />
        </mesh>
        {[-1, 1].map((s) => (
          <mesh key={s} position={[0.02, 0.18, s * 0.16]} rotation={[0, 0, 0.5]} castShadow>
            <torusGeometry args={[0.16, 0.028, 6, 10, Math.PI]} />
            <meshStandardMaterial color="#d8d2c4" />
          </mesh>
        ))}
      </group>
      <mesh position={[-0.7, 0.3, 0]} rotation={[0, 0, 0.5]} castShadow>
        <cylinderGeometry args={[0.03, 0.03, 1.1, 6]} />
        <meshStandardMaterial color="#6b4a2a" />
      </mesh>
    </group>
  );
}

function Person({
  position,
  rotation = 0,
  color,
}: {
  position: [number, number, number];
  rotation?: number;
  color: string;
}) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh position={[0, 0.28, 0]} castShadow>
        <cylinderGeometry args={[0.17, 0.2, 0.52, 10]} />
        <meshStandardMaterial color={color} roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.66, 0]} castShadow>
        <capsuleGeometry args={[0.12, 0.24, 4, 8]} />
        <meshStandardMaterial color="#7c5b3a" roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.95, 0]} castShadow>
        <sphereGeometry args={[0.13, 14, 14]} />
        <meshStandardMaterial color="#c98a5a" roughness={0.7} />
      </mesh>
      <mesh position={[0, 1.06, 0]} castShadow>
        <coneGeometry args={[0.22, 0.16, 16]} />
        <meshStandardMaterial color="#c9a24a" roughness={0.85} />
      </mesh>
    </group>
  );
}

function StiltHouse({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {[[-0.5, -0.4], [0.5, -0.4], [-0.5, 0.4], [0.5, 0.4]].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.5, z]} castShadow>
          <cylinderGeometry args={[0.06, 0.06, 1, 6]} />
          <meshStandardMaterial color="#6b4a2a" />
        </mesh>
      ))}
      <mesh position={[0, 1.1, 0]} castShadow>
        <boxGeometry args={[1.4, 0.5, 1.1]} />
        <meshStandardMaterial color="#8a6a3a" roughness={0.9} />
      </mesh>
      <mesh position={[0, 1.55, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
        <coneGeometry args={[1.15, 0.6, 4]} />
        <meshStandardMaterial color="#9c3f2e" roughness={0.9} />
      </mesh>
    </group>
  );
}

function Palm({ position, h = 3 }: { position: [number, number, number]; h?: number }) {
  return (
    <group position={position}>
      <mesh position={[0, h / 2, 0]} castShadow>
        <cylinderGeometry args={[0.09, 0.13, h, 7]} />
        <meshStandardMaterial color="#7c6242" roughness={1} />
      </mesh>
      {Array.from({ length: 7 }, (_, i) => {
        const a = (i / 7) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.cos(a) * 0.4, h, Math.sin(a) * 0.4]} rotation={[0.5, -a, 0]} castShadow>
            <boxGeometry args={[0.1, 0.03, 1.1]} />
            <meshStandardMaterial color="#3f7a34" roughness={0.9} />
          </mesh>
        );
      })}
    </group>
  );
}

function FarmXRState({ onChange }: { onChange: (active: boolean) => void }) {
  const active = useXR(s => s.session != null);
  useEffect(() => { onChange(active); }, [active, onChange]);
  return null;
}

function FarmWork({ stageId, tasks, onTask, detailed }: { stageId?: string; tasks: number[]; onTask: (task: number) => void; detailed: boolean }) {
  const interactive = ['plough', 'seedbed', 'transplant', 'harvest'].includes(stageId ?? '');
  const nursery = stageId === 'seedbed';
  return <group>
    {interactive && [0, 1, 2, 3].map(patch => {
      const x = nursery ? -1.95 + (patch % 2) * .65 : (patch % 2 ? 1.3 : -1.3);
      const z = nursery ? -1.95 + Math.floor(patch / 2) * .65 : (patch < 2 ? -1.3 : 1.3);
      const complete = tasks.includes(patch);
      return <group key={patch}>
        <mesh position={[x, nursery ? .30 : .13, z]} rotation={[-Math.PI / 2, 0, 0]}
          onClick={e => { e.stopPropagation(); if (e.delta <= 5 && !complete) onTask(patch); }}>
          <ringGeometry args={[nursery ? .16 : .36, nursery ? .22 : .44, detailed ? 32 : 12]} />
          <meshBasicMaterial color={complete ? '#9ab98a' : '#eac56a'} transparent opacity={complete ? .4 : .8} side={2} depthWrite={false} />
        </mesh>
        {stageId === 'plough' && complete && [0, 1, 2, 3, 4].map(row => <mesh key={row} position={[x - .8 + row * .4, .11, z]}>
          <boxGeometry args={[.08, .08, 1.85]} /><meshStandardMaterial color="#493623" roughness={1} />
        </mesh>)}
        {stageId === 'harvest' && complete && <mesh position={[3.2, .34, -.9 + patch * .55]} castShadow={detailed}>
          <coneGeometry args={[.25, .65, detailed ? 10 : 5]} /><meshStandardMaterial color="#c5a34e" roughness={1} />
        </mesh>}
      </group>;
    })}
    {stageId === 'thresh' && [0, 1, 2, 3, 4, 5].map(task => <mesh key={task} position={[3.3 + task % 2 * .45, .12, -.9 + Math.floor(task / 2) * .6]}
      scale={tasks.includes(task) ? [.05, .05, .05] : [1, 1, 1]} castShadow={detailed}>
      <sphereGeometry args={[.20, detailed ? 10 : 6, detailed ? 8 : 4]} />
      <meshStandardMaterial color={FARM_ACTIVITIES.thresh.valid.includes(task) ? '#d1aa4b' : '#8c7859'} />
    </mesh>)}
  </group>;
}

function Granary({ sacks, detailed }: { sacks: number; detailed: boolean }) {
  return <group position={[-3.8, 0, 1.6]}>
    {[-.6, .6].flatMap(x => [-.45, .45].map(z => <mesh key={`${x}-${z}`} position={[x, .35, z]} castShadow={detailed}>
      <boxGeometry args={[.10, .7, .10]} /><meshStandardMaterial color="#62442b" />
    </mesh>))}
    <mesh position={[0, .7, 0]} receiveShadow={detailed}><boxGeometry args={[1.6, .15, 1.25]} /><meshStandardMaterial color="#96734a" /></mesh>
    <mesh position={[0, 1.15, -.55]} castShadow={detailed}><boxGeometry args={[1.6, .85, .10]} /><meshStandardMaterial color="#a28457" /></mesh>
    {[-.78, .78].map(x => <mesh key={x} position={[x, 1.15, 0]} castShadow={detailed}><boxGeometry args={[.10, .85, 1.2]} /><meshStandardMaterial color="#947247" /></mesh>)}
    <mesh position={[0, 1.72, 0]} rotation={[0, Math.PI / 4, 0]} castShadow={detailed}><coneGeometry args={[1.30, .55, 4]} /><meshStandardMaterial color="#705039" /></mesh>
    {[0, 1, 2, 3].filter(n => n < sacks).map(n => <mesh key={n} position={[-.36 + n % 2 * .7, .98, -.28 + Math.floor(n / 2) * .55]} castShadow={detailed}>
      <capsuleGeometry args={[.18, .16, detailed ? 6 : 3, detailed ? 10 : 5]} /><meshStandardMaterial color="#d3bd84" roughness={1} />
    </mesh>)}
  </group>;
}

function Nav() {
  const inXR = useXR((s) => s.session != null);
  if (inXR) return null;
  return (
    <OrbitControls
      makeDefault
      enablePan
      minDistance={3.5}
      maxDistance={22}
      maxPolarAngle={Math.PI / 2.15}
      enableDamping
      dampingFactor={0.08}
      target={[-.7, 1, -.9]}
    />
  );
}
