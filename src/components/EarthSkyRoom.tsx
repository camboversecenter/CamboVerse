import { useCallback, useMemo, useRef, useState, useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import { XR } from '@react-three/xr';
import { useLabVR, LabVRButton, LabVRRig } from './LabVR';
import { ACESFilmicToneMapping } from "three";
import { EarthSkyRoomScene, STATIONS } from "./EarthSkyRoomScene";
import { WalkControls } from "./WalkControls";
import type { WalkInput } from "./FirstPersonControls";
import {
  PLANETS, type Planet, EARTH_LAYERS, type EarthLayer,
  MOON_PHASES, SEASONS,
  orbitalPosition, moonIllumination, tideHeight,
  SOLAR_QUIZ, LAYERS_QUIZ, DAYNIGHT_QUIZ, MOON_QUIZ, SEASONS_QUIZ, TIDES_QUIZ,
  EARTHSKY_ACHIEVEMENTS, type EarthSkyAchievement, type EarthSkyAchievementCtx,
} from "../earthsky";
import type { QuizQuestion } from "../physics";
import { playSuccess, playError, setChemMuted } from "../lib/chemSound";
import "./EarthSkyRoom.css";

function detectUltra(): boolean {
  if (typeof navigator === "undefined") return true;
  const cores = navigator.hardwareConcurrency ?? 4;
  const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 4;
  const small = typeof window !== "undefined" && Math.min(window.screen.width, window.screen.height) < 500;
  return cores > 4 && mem > 3 && !small;
}

type ControlMode = "phone" | "pc";
function detectControlMode(): ControlMode {
  if (typeof window === "undefined") return "pc";
  const small = Math.min(window.screen.width, window.screen.height) < 600;
  const touch = "ontouchstart" in window || navigator.maxTouchPoints > 0;
  return small && touch ? "phone" : "pc";
}

export function EarthSkyRoom({
  onBack,
  onOpenSpecimen: _onOpenSpecimen,
}: {
  onBack: () => void;
  onOpenSpecimen: (id: string) => void;
}) {
  const walkInput = useRef<WalkInput>({ move: { x: 0, y: 0 }, look: { dx: 0, dy: 0 } });
  const [preferredUltra, setUltra] = useState(detectUltra);
  const vr = useLabVR();
  const ultra = preferredUltra || vr.active;
  const [nearStation, setNearStation] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(true);
  const [locked, setLocked] = useState(false);
  const roomRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const [controlMode] = useState<ControlMode>(detectControlMode);
  const isTouch = controlMode === "phone";

  const [promptDismissed, setPromptDismissed] = useState<string | null>(null);
  const [visited, setVisited] = useState<Set<string>>(new Set());
  const markVisited = useCallback((id: string) => setVisited((s) => (s.has(id) ? s : new Set([...s, id]))), []);

  const [dockTab, setDockTab] = useState<"explore" | "cycles">("explore");
  const [expQuiz, setExpQuiz] = useState<Record<string, Record<number, number>>>({});

  // Panel open states
  const [solarOpen, setSolarOpen] = useState(false);
  const [selectedPlanet, setSelectedPlanet] = useState<Planet | null>(null);

  const [layersOpen, setLayersOpen] = useState(false);
  const [selectedLayer, setSelectedLayer] = useState<EarthLayer | null>(null);

  const [dayNightOpen, setDayNightOpen] = useState(false);
  const [rotation, setRotation] = useState(0);

  const [moonOpen, setMoonOpen] = useState(false);
  const [moonAngle, setMoonAngle] = useState(0);

  const [seasonsOpen, setSeasonsOpen] = useState(false);
  const [seasonIndex, setSeasonIndex] = useState(0);

  const [tidesOpen, setTidesOpen] = useState(false);
  const [tideAngle, setTideAngle] = useState(0);

  const [badgesOpen, setBadgesOpen] = useState(false);
  const [logOpen, setLogOpen] = useState(false);

  // Notebook
  interface LogEntry { id: number; station: string; icon: string; label: string; params: Record<string, string>; result: string; time: number; }
  const [log, setLog] = useState<LogEntry[]>([]);
  const logIdRef = useRef(0);
  const addLog = useCallback((station: string, icon: string, label: string, params: Record<string, string>, result: string) => {
    setLog((prev) => [{ id: ++logIdRef.current, station, icon, label, params, result, time: Date.now() }, ...prev].slice(0, 50));
  }, []);

  // Achievement tracking
  const [totalInteractions, setTotalInteractions] = useState(0);
  const [quizzesPassed, setQuizzesPassed] = useState<Set<string>>(new Set());
  const [quizzesPerfect, setQuizzesPerfect] = useState<Set<string>>(new Set());
  const [newBadge, setNewBadge] = useState<EarthSkyAchievement | null>(null);

  // Sound
  const [soundOn, setSoundOn] = useState(false);
  useEffect(() => { setChemMuted(true); }, []);

  // Ambient space sounds
  const ambientCtxRef = useRef<AudioContext | null>(null);
  const ambientIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    if (!soundOn) {
      if (ambientIntervalRef.current) { clearInterval(ambientIntervalRef.current); ambientIntervalRef.current = null; }
      if (ambientCtxRef.current) { ambientCtxRef.current.close().catch(() => {}); ambientCtxRef.current = null; }
      return;
    }
    const ctx = new AudioContext();
    ambientCtxRef.current = ctx;

    // Deep space drone - low frequency hum
    const drone = ctx.createOscillator();
    drone.type = "sine"; drone.frequency.value = 42;
    const droneGain = ctx.createGain(); droneGain.gain.value = 0.025;
    drone.connect(droneGain).connect(ctx.destination); drone.start();

    // Sub-harmonic layer
    const sub = ctx.createOscillator();
    sub.type = "sine"; sub.frequency.value = 28;
    const subGain = ctx.createGain(); subGain.gain.value = 0.015;
    sub.connect(subGain).connect(ctx.destination); sub.start();

    // Gentle cosmic "shimmer" - high frequency filtered noise effect
    const shimmer = ctx.createOscillator();
    shimmer.type = "sine"; shimmer.frequency.value = 880;
    const shimmerGain = ctx.createGain(); shimmerGain.gain.value = 0.008;
    shimmer.connect(shimmerGain).connect(ctx.destination); shimmer.start();
    const lfo = ctx.createOscillator();
    lfo.type = "sine"; lfo.frequency.value = 0.15;
    const lfoGain = ctx.createGain(); lfoGain.gain.value = 400;
    lfo.connect(lfoGain).connect(shimmer.frequency); lfo.start();

    // Random radio blip every ~4 seconds
    ambientIntervalRef.current = setInterval(() => {
      if (Math.random() < 0.3) {
        const blip = ctx.createOscillator();
        blip.type = "square"; blip.frequency.value = 1200 + Math.random() * 800;
        const bGain = ctx.createGain();
        bGain.gain.setValueAtTime(0.02, ctx.currentTime);
        bGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
        blip.connect(bGain).connect(ctx.destination);
        blip.start(); blip.stop(ctx.currentTime + 0.08);
      }
    }, 4000);

    return () => {
      [drone, sub, shimmer, lfo].forEach((o) => { try { o.stop(); } catch {} });
      if (ambientIntervalRef.current) { clearInterval(ambientIntervalRef.current); ambientIntervalRef.current = null; }
      ctx.close().catch(() => {}); ambientCtxRef.current = null;
    };
  }, [soundOn]);

  const anyPanelOpen = solarOpen || layersOpen || dayNightOpen || moonOpen || seasonsOpen || tidesOpen || badgesOpen || logOpen;

  useEffect(() => {
    if (showHelp) {
      const t = setTimeout(() => setShowHelp(false), 6000);
      return () => clearTimeout(t);
    }
  }, [showHelp]);

  const station = nearStation ? STATIONS.find((s) => s.id === nearStation) ?? null : null;

  // Achievements
  const achCtx = useMemo<EarthSkyAchievementCtx>(() => ({
    stationsVisited: visited,
    quizzesPassed,
    quizzesPerfect,
    totalInteractions,
  }), [visited, quizzesPassed, quizzesPerfect, totalInteractions]);

  const earnedBadges = useMemo(() => EARTHSKY_ACHIEVEMENTS.filter((a) => a.check(achCtx)), [achCtx]);

  const prevBadgesRef = useRef(earnedBadges.length);
  useEffect(() => {
    if (earnedBadges.length > prevBadgesRef.current) {
      const newest = earnedBadges[earnedBadges.length - 1];
      setNewBadge(newest);
      if (soundOn) playSuccess();
      const t = setTimeout(() => setNewBadge(null), 3500);
      prevBadgesRef.current = earnedBadges.length;
      return () => clearTimeout(t);
    }
    prevBadgesRef.current = earnedBadges.length;
  }, [earnedBadges, soundOn]);

  const closeAll = useCallback(() => {
    setSolarOpen(false); setSelectedPlanet(null);
    setLayersOpen(false); setSelectedLayer(null);
    setDayNightOpen(false);
    setMoonOpen(false);
    setSeasonsOpen(false);
    setTidesOpen(false);
    setBadgesOpen(false);
    setLogOpen(false);
  }, []);

  const openStation = useCallback((id: string) => {
    closeAll();
    markVisited(id);
    switch (id) {
      case "solar-system": setSolarOpen(true); break;
      case "earth-layers": setLayersOpen(true); break;
      case "day-night": setDayNightOpen(true); break;
      case "moon-phases": setMoonOpen(true); break;
      case "seasons": setSeasonsOpen(true); break;
      case "tides": setTidesOpen(true); break;
    }
  }, [closeAll, markVisited]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === "e" || e.key === "E") {
      if (nearStation && !anyPanelOpen) openStation(nearStation);
    }
    if (e.key === "Escape") {
      if (anyPanelOpen) closeAll();
      else if (nearStation) setPromptDismissed(nearStation);
    }
  }, [nearStation, anyPanelOpen, openStation, closeAll]);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  // Drag-to-look fallback
  useEffect(() => {
    if (isTouch) return;
    const onLockChange = () => setLocked(!!document.pointerLockElement);
    const onMove = (e: MouseEvent) => {
      if (document.pointerLockElement || dragging.current) {
        walkInput.current.look.dx += e.movementX;
        walkInput.current.look.dy += e.movementY;
      }
    };
    const onDown = (e: MouseEvent) => {
      if ((e.target as HTMLElement).closest(".es-top, .es-dock, .es-prompt, .es-panel, .es-scrim, .es-notebook")) return;
      if (!document.pointerLockElement) dragging.current = true;
    };
    const onUp = () => { dragging.current = false; };
    document.addEventListener("pointerlockchange", onLockChange);
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("mouseup", onUp);
    return () => {
      document.removeEventListener("pointerlockchange", onLockChange);
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("mouseup", onUp);
    };
  }, [isTouch]);

  const perfectQuizzesRef = useRef<Set<string>>(new Set());

  const renderQuiz = (key: string, questions: QuizQuestion[]) => {
    const answers = expQuiz[key] ?? {};
    return (
      <div className="es-quiz">
        <h3>Test yourself</h3>
        {questions.map((item, qi) => {
          const given = answers[qi];
          const answered = given !== undefined;
          return (
            <div key={qi}>
              <p className="es-quiz-q"><b>{qi + 1}.</b> {item.q}</p>
              <div className="es-quiz-opts">
                {item.options.map((opt, oi) => {
                  const cls = !answered ? "" : oi === item.answer ? " correct" : oi === given ? " wrong" : "";
                  return (
                    <button key={oi} className={`es-quiz-opt${cls}`} disabled={answered}
                      onClick={() => {
                        const correct = oi === item.answer;
                        if (soundOn) (correct ? playSuccess : playError)();
                        setExpQuiz((prev) => {
                          const next = { ...prev, [key]: { ...prev[key], [qi]: oi } };
                          const a = next[key];
                          const allDone = questions.every((_, i) => a[i] !== undefined);
                          if (allDone) {
                            setQuizzesPassed((s) => s.has(key) ? s : new Set([...s, key]));
                            const allCorrect = questions.every((q, i) => a[i] === q.answer);
                            if (allCorrect && !perfectQuizzesRef.current.has(key)) {
                              perfectQuizzesRef.current.add(key);
                              setQuizzesPerfect(new Set(perfectQuizzesRef.current));
                            }
                          }
                          return next;
                        });
                        setTotalInteractions((n) => n + 1);
                      }}
                    >{opt}</button>
                  );
                })}
              </div>
              {answered && <p className="es-quiz-why">{item.why}</p>}
            </div>
          );
        })}
      </div>
    );
  };

  // Dock buttons
  const dockButtons: Record<string, { id: string; icon: string; label: string }[]> = {
    explore: [
      { id: "solar-system", icon: "☀️", label: "Solar System" },
      { id: "earth-layers", icon: "🌍", label: "Earth Layers" },
      { id: "day-night", icon: "🌗", label: "Day & Night" },
    ],
    cycles: [
      { id: "moon-phases", icon: "🌙", label: "Moon Phases" },
      { id: "seasons", icon: "🍂", label: "Seasons" },
      { id: "tides", icon: "🌊", label: "Tides" },
    ],
  };

  // Moon phase computation
  const currentPhase = MOON_PHASES.reduce((best, p) => {
    const diff = Math.abs(((moonAngle - p.angle + 180) % 360) - 180);
    const bestDiff = Math.abs(((moonAngle - best.angle + 180) % 360) - 180);
    return diff < bestDiff ? p : best;
  }, MOON_PHASES[0]);

  const currentIllumination = moonIllumination(moonAngle);

  return (
    <div className="es-room" ref={roomRef}>
      <Canvas
        shadows={ultra}
        gl={{ antialias: ultra, toneMapping: ACESFilmicToneMapping, toneMappingExposure: 0.9 }}
        camera={{ fov: 70, near: 0.1, far: 100 }}
        style={{ touchAction: "none" }}
        onPointerDown={() => {
          if (!vr.active && !isTouch && !locked && roomRef.current) {
            try { roomRef.current.requestPointerLock?.(); } catch {}
          }
        }}
        tabIndex={0}
      >
        <XR store={vr.store}>
          <EarthSkyRoomScene walkInput={walkInput} ultra={ultra} onNear={setNearStation} />
          <LabVRRig start={[0, 0, 3.5]} bounds={[-6.4, 6.4, -5.4, 5.4]} stations={STATIONS} />
        </XR>
      </Canvas>

      {isTouch && <WalkControls input={walkInput} />}
      {!isTouch && <div className="es-crosshair" />}

      {/* Top bar */}
      <div className="es-top">
        <button className="es-back" onClick={onBack}>← Back</button>
        <span className="es-title">Earth & Sky</span>
        <button className="es-sound" onClick={() => { setSoundOn((s) => !s); setChemMuted(soundOn); }}>
          {soundOn ? "Sound on" : "Sound off"}
        </button>
        <LabVRButton vr={vr} />
        <button disabled={vr.active} className={`es-ultra${ultra ? " on" : ""}`} onClick={() => setUltra((u) => !u)}>
          {ultra ? "Ultra" : "Normal"}
        </button>
      </div>

      {/* Help overlay */}
      {showHelp && !anyPanelOpen && (
        <div className="es-prompt" style={{ bottom: 200 }}>
          <span className="es-prompt-icon">🚀</span>
          <div className="es-prompt-text">
            <b>Earth & Sky Controls</b>
            {isTouch ? (
              <span>Use the joystick to walk. Tap stations to interact.</span>
            ) : (
              <span>WASD to walk, Mouse to look, E to interact, Esc to close</span>
            )}
          </div>
        </div>
      )}

      {/* Proximity prompt */}
      {station && !anyPanelOpen && promptDismissed !== nearStation && (
        <div className="es-prompt">
          <button className="es-prompt-dismiss" onClick={() => setPromptDismissed(nearStation)}>x</button>
          <span className="es-prompt-icon">{station.icon}</span>
          <div className="es-prompt-text">
            <b>{station.label}</b>
            <span>{station.description}</span>
          </div>
          <button className="es-interact" onClick={() => openStation(station.id)}>
            {isTouch ? "Open" : "E"}
          </button>
        </div>
      )}

      {/* Scrim */}
      {anyPanelOpen && <div className="es-scrim" onClick={closeAll} />}

      {/* ══ Solar System Panel ══ */}
      {solarOpen && (
        <div className="es-panel es-ui" onClick={(e) => e.stopPropagation()}>
          <div className="es-panel-bar">
            <b>☀️ Solar System</b>
            <button className="es-x" onClick={() => setSolarOpen(false)}>x</button>
          </div>
          <div className="es-panel-body">
            <div className="es-sim">
              <svg viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg">
                {/* Sun */}
                <circle cx={200} cy={200} r={18} fill="#ffcc40" />
                <circle cx={200} cy={200} r={22} fill="none" stroke="rgba(255,200,60,.2)" strokeWidth={2} />
                {/* Orbit rings and planets */}
                {PLANETS.map((p, i) => {
                  const orbitR = 35 + i * 20;
                  const pos = orbitalPosition(Date.now() / (p.periodDays * 10) % 360, orbitR);
                  const planetR = Math.max(3, Math.min(8, Math.log(p.radiusKm / 1000) * 2));
                  return (
                    <g key={p.id} onClick={() => { setSelectedPlanet(p); setTotalInteractions((n) => n + 1); addLog("solar-system", "☀️", p.name, { distance: `${p.distanceAU} AU` }, `${p.moons} moons, ${p.periodDays} day orbit`); }} style={{ cursor: "pointer" }}>
                      <circle cx={200} cy={200} r={orbitR} fill="none" stroke="rgba(80,120,180,.15)" strokeWidth={0.5} />
                      <circle cx={200 + pos.x} cy={200 + pos.y} r={planetR} fill={p.color}
                        stroke={selectedPlanet?.id === p.id ? "#80c0ff" : "none"} strokeWidth={1.5} />
                      <text x={200 + pos.x} y={200 + pos.y + planetR + 10} fill="#6090b0" fontSize="7" textAnchor="middle">{p.name}</text>
                    </g>
                  );
                })}
              </svg>
            </div>

            {/* Planet cards */}
            <div className="es-planet-grid">
              {PLANETS.map((p) => (
                <div key={p.id} className={`es-planet-card${selectedPlanet?.id === p.id ? " selected" : ""}`}
                  onClick={() => { setSelectedPlanet(p); setTotalInteractions((n) => n + 1); }}>
                  <span className="es-planet-dot" style={{ background: p.color }} />
                  <span className="es-planet-name">{p.name}</span>
                </div>
              ))}
            </div>

            {/* Selected planet info */}
            {selectedPlanet && (
              <div className="es-result">
                <div className="es-result-item"><label>Radius</label><b>{selectedPlanet.radiusKm.toLocaleString()} km</b></div>
                <div className="es-result-item"><label>Distance</label><b>{selectedPlanet.distanceAU} AU</b></div>
                <div className="es-result-item"><label>Year</label><b>{selectedPlanet.periodDays.toLocaleString()} days</b></div>
                <div className="es-result-item"><label>Moons</label><b>{selectedPlanet.moons}</b></div>
              </div>
            )}
            {selectedPlanet && (
              <p style={{ fontSize: 12, color: "#6090b0", margin: "6px 0" }}>{selectedPlanet.facts}</p>
            )}
          </div>
          {renderQuiz("solar", SOLAR_QUIZ)}
        </div>
      )}

      {/* ══ Earth Layers Panel ══ */}
      {layersOpen && (
        <div className="es-panel es-ui" onClick={(e) => e.stopPropagation()}>
          <div className="es-panel-bar">
            <b>🌍 Earth Layers</b>
            <button className="es-x" onClick={() => setLayersOpen(false)}>x</button>
          </div>
          <div className="es-panel-body">
            <div className="es-sim">
              <svg viewBox="0 0 300 300" xmlns="http://www.w3.org/2000/svg">
                {/* Cross-section arcs - draw from outside in */}
                {[...EARTH_LAYERS].reverse().map((layer, i) => {
                  const radii = [140, 120, 90, 50, 25];
                  const r = radii[i];
                  return (
                    <g key={layer.name} onClick={() => { setSelectedLayer(layer); setTotalInteractions((n) => n + 1); addLog("earth-layers", "🌍", layer.name, { depth: `${layer.depthKm} km` }, `${layer.tempC}C, ${layer.state}`); }} style={{ cursor: "pointer" }}>
                      <circle cx={150} cy={160} r={r} fill={layer.color}
                        stroke={selectedLayer?.name === layer.name ? "#80c0ff" : "rgba(0,0,0,.2)"} strokeWidth={selectedLayer?.name === layer.name ? 2 : 0.5} />
                    </g>
                  );
                })}
                {/* Labels */}
                <text x={150} y={30} fill="#8090a0" fontSize="10" textAnchor="middle">Earth Cross-Section</text>
                <text x={150} y={162} fill="#1a1a1a" fontSize="8" textAnchor="middle">Inner Core</text>
              </svg>
            </div>

            {/* Layer cards */}
            {EARTH_LAYERS.map((layer) => (
              <div key={layer.name} className={`es-layer-card${selectedLayer?.name === layer.name ? " selected" : ""}`}
                onClick={() => { setSelectedLayer(layer); setTotalInteractions((n) => n + 1); }}>
                <span className="es-layer-swatch" style={{ background: layer.color }} />
                <div>
                  <b style={{ fontSize: 13, color: "#a0c0e0" }}>{layer.name}</b>
                  <span style={{ fontSize: 11, color: "#6090b0", marginLeft: 8 }}>{layer.depthKm} km deep</span>
                </div>
              </div>
            ))}

            {selectedLayer && (
              <>
                <div className="es-result" style={{ marginTop: 8 }}>
                  <div className="es-result-item"><label>Thickness</label><b>{selectedLayer.thicknessKm} km</b></div>
                  <div className="es-result-item"><label>Temp</label><b>{selectedLayer.tempC}C</b></div>
                  <div className="es-result-item"><label>State</label><b>{selectedLayer.state}</b></div>
                </div>
                <p className="es-layer-info">{selectedLayer.composition}</p>
              </>
            )}
          </div>
          {renderQuiz("layers", LAYERS_QUIZ)}
        </div>
      )}

      {/* ══ Day & Night Panel ══ */}
      {dayNightOpen && (
        <div className="es-panel es-ui" onClick={(e) => e.stopPropagation()}>
          <div className="es-panel-bar">
            <b>🌗 Day & Night</b>
            <button className="es-x" onClick={() => setDayNightOpen(false)}>x</button>
          </div>
          <div className="es-panel-body">
            <div className="es-sim">
              <svg viewBox="0 0 400 250" xmlns="http://www.w3.org/2000/svg">
                {/* Sun */}
                <circle cx={50} cy={125} r={22} fill="#ffcc40" />
                <text x={50} y={160} fill="#a09040" fontSize="9" textAnchor="middle">Sun</text>
                {/* Sunlight rays */}
                {[-40, -20, 0, 20, 40].map((a, i) => {
                  const rad = (a * Math.PI) / 180;
                  return <line key={i} x1={72} y1={125 + Math.sin(rad) * 20} x2={180} y2={125 + Math.sin(rad) * 60} stroke="rgba(255,200,60,.15)" strokeWidth={1} />;
                })}
                {/* Earth */}
                <g transform={`translate(250,125) rotate(${rotation})`}>
                  {/* Night side */}
                  <circle r={55} fill="#1a2040" />
                  {/* Day side - clip to left half */}
                  <clipPath id="day-clip"><rect x={-55} y={-55} width={55} height={110} /></clipPath>
                  <circle r={55} fill="#4080d0" clipPath="url(#day-clip)" />
                  {/* Terminator line */}
                  <line x1={0} y1={-55} x2={0} y2={55} stroke="rgba(255,200,60,.3)" strokeWidth={1} />
                  {/* Labels */}
                  <text x={-25} y={5} fill="#a0d0ff" fontSize="10" textAnchor="middle">Day</text>
                  <text x={25} y={5} fill="#405070" fontSize="10" textAnchor="middle">Night</text>
                </g>
                {/* Arrow showing rotation */}
                <path d="M 250 60 A 20 20 0 0 1 275 70" fill="none" stroke="#6090b0" strokeWidth={1} markerEnd="url(#es-arrow)" />
                <defs><marker id="es-arrow" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6" fill="#6090b0" /></marker></defs>
                <text x={275} y={55} fill="#5080a0" fontSize="8">rotation</text>
              </svg>
            </div>

            <div className="es-slider-row">
              <label>Rotation</label>
              <input type="range" min={0} max={360} value={rotation}
                onChange={(e) => { setRotation(+e.target.value); setTotalInteractions((n) => n + 1); }} />
              <span className="es-slider-val">{rotation}</span>
            </div>

            <div className="es-result">
              <div className="es-result-item"><label>Rotation period</label><b>24 hours</b></div>
              <div className="es-result-item"><label>Speed at equator</label><b>1670 km/h</b></div>
              <div className="es-result-item"><label>Tilt</label><b>23.5 degrees</b></div>
            </div>

            <p style={{ fontSize: 12, color: "#5080a0", margin: "6px 0" }}>
              Earth spins on its axis once every 24 hours. The side facing the Sun has daytime, while the side facing away has nighttime.
              {rotation > 90 && rotation < 270 && " Cambodia would be in nighttime at this rotation angle."}
            </p>
          </div>
          {renderQuiz("daynight", DAYNIGHT_QUIZ)}
        </div>
      )}

      {/* ══ Moon Phases Panel ══ */}
      {moonOpen && (
        <div className="es-panel es-ui" onClick={(e) => e.stopPropagation()}>
          <div className="es-panel-bar">
            <b>🌙 Moon Phases</b>
            <button className="es-x" onClick={() => setMoonOpen(false)}>x</button>
          </div>
          <div className="es-panel-body">
            <div className="es-sim">
              <svg viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg">
                {/* Sunlight direction */}
                <text x={20} y={20} fill="#a09040" fontSize="9">Sunlight from left</text>
                {[60, 120, 180, 240].map((y, i) => (
                  <line key={i} x1={0} y1={y} x2={400} y2={y} stroke="rgba(255,200,60,.04)" strokeWidth={1} />
                ))}

                {/* Earth center */}
                <circle cx={200} cy={150} r={25} fill="#4080d0" />
                <text x={200} y={155} fill="#1a3060" fontSize="8" textAnchor="middle">Earth</text>

                {/* Moon orbit */}
                <circle cx={200} cy={150} r={90} fill="none" stroke="rgba(80,120,180,.15)" strokeWidth={0.5} strokeDasharray="4 4" />

                {/* Moon */}
                {(() => {
                  const pos = orbitalPosition(moonAngle - 90, 90);
                  const mx = 200 + pos.x;
                  const my = 150 + pos.y;
                  const ill = currentIllumination / 100;
                  return (
                    <g>
                      <circle cx={mx} cy={my} r={12} fill="#2a2a2a" />
                      <clipPath id="moon-lit">
                        <rect x={mx - 12} y={my - 12} width={12 + ill * 12} height={24} />
                      </clipPath>
                      <circle cx={mx} cy={my} r={12} fill="#d0d0c0" clipPath="url(#moon-lit)" />
                      <text x={mx} y={my + 22} fill="#6090b0" fontSize="8" textAnchor="middle">Moon</text>
                    </g>
                  );
                })()}
              </svg>
            </div>

            <div className="es-slider-row">
              <label>Moon orbit</label>
              <input type="range" min={0} max={360} value={moonAngle}
                onChange={(e) => { setMoonAngle(+e.target.value); setTotalInteractions((n) => n + 1); addLog("moon-phases", "🌙", currentPhase.name, { angle: `${moonAngle}deg` }, `${currentIllumination}% illuminated`); }} />
              <span className="es-slider-val">{moonAngle}</span>
            </div>

            <div className="es-result">
              <div className="es-result-item"><label>Phase</label><b>{currentPhase.name}</b></div>
              <div className="es-result-item"><label>Illumination</label><b>{currentIllumination}%</b></div>
              <div className="es-result-item"><label>Cycle</label><b>29.5 days</b></div>
            </div>

            <p style={{ fontSize: 12, color: "#5080a0", margin: "6px 0" }}>{currentPhase.description}</p>

            {/* Phase quick-select buttons */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 6 }}>
              {MOON_PHASES.map((p) => (
                <button key={p.name} className={`es-chip${currentPhase.name === p.name ? " on" : ""}`}
                  onClick={() => { setMoonAngle(p.angle); setTotalInteractions((n) => n + 1); }}>
                  {p.name}
                </button>
              ))}
            </div>
          </div>
          {renderQuiz("moon", MOON_QUIZ)}
        </div>
      )}

      {/* ══ Seasons Panel ══ */}
      {seasonsOpen && (
        <div className="es-panel es-ui" onClick={(e) => e.stopPropagation()}>
          <div className="es-panel-bar">
            <b>🍂 Seasons</b>
            <button className="es-x" onClick={() => setSeasonsOpen(false)}>x</button>
          </div>
          <div className="es-panel-body">
            <div className="es-sim">
              <svg viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg">
                {/* Sun center */}
                <circle cx={200} cy={150} r={20} fill="#ffcc40" />
                <text x={200} y={155} fill="#806020" fontSize="8" textAnchor="middle">Sun</text>

                {/* Orbit */}
                <ellipse cx={200} cy={150} rx={130} ry={100} fill="none" stroke="rgba(80,120,180,.15)" strokeWidth={0.5} />

                {/* 4 Earth positions */}
                {SEASONS.map((s, i) => {
                  const angles = [0, 90, 180, 270];
                  const pos = orbitalPosition(angles[i], 1);
                  const ex = 200 + pos.x * 130;
                  const ey = 150 + pos.y * 100;
                  const selected = seasonIndex === i;
                  const tilt = i === 1 ? -15 : i === 3 ? 15 : 0;
                  return (
                    <g key={s.name} onClick={() => { setSeasonIndex(i); setTotalInteractions((n) => n + 1); addLog("seasons", "🍂", s.name, { month: s.month }, `NH: ${s.nhSeason}, Cambodia: ${s.cambodiaSeason}`); }} style={{ cursor: "pointer" }}>
                      <circle cx={ex} cy={ey} r={14} fill="#4080d0" stroke={selected ? "#80c0ff" : "none"} strokeWidth={2} />
                      {/* Tilt indicator */}
                      <line x1={ex} y1={ey - 18} x2={ex + tilt * 0.5} y2={ey + 18} stroke="#a0c0e0" strokeWidth={1} />
                      <text x={ex} y={ey + 28} fill="#6090b0" fontSize="8" textAnchor="middle">{s.month}</text>
                    </g>
                  );
                })}
              </svg>
            </div>

            {/* Season selector buttons */}
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 8 }}>
              {SEASONS.map((s, i) => (
                <button key={s.name} className={`es-chip${seasonIndex === i ? " on" : ""}`}
                  onClick={() => { setSeasonIndex(i); setTotalInteractions((n) => n + 1); }}>
                  {s.name}
                </button>
              ))}
            </div>

            <div className="es-result">
              <div className="es-result-item"><label>NH Season</label><b>{SEASONS[seasonIndex].nhSeason}</b></div>
              <div className="es-result-item"><label>Cambodia</label><b>{SEASONS[seasonIndex].cambodiaSeason}</b></div>
              <div className="es-result-item"><label>Tilt</label><b>{SEASONS[seasonIndex].tiltDirection}</b></div>
            </div>

            <p style={{ fontSize: 12, color: "#5080a0", margin: "6px 0" }}>{SEASONS[seasonIndex].description}</p>
            <p style={{ fontSize: 11, color: "#405870" }}>
              Cambodia is at about 12 degrees N latitude, close to the equator. It experiences wet and dry seasons rather than the hot/cold seasons of higher latitudes.
            </p>
          </div>
          {renderQuiz("seasons", SEASONS_QUIZ)}
        </div>
      )}

      {/* ══ Tides Panel ══ */}
      {tidesOpen && (
        <div className="es-panel es-ui" onClick={(e) => e.stopPropagation()}>
          <div className="es-panel-bar">
            <b>🌊 Tides</b>
            <button className="es-x" onClick={() => setTidesOpen(false)}>x</button>
          </div>
          <div className="es-panel-body">
            <div className="es-sim">
              <svg viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg">
                {/* Earth */}
                <circle cx={200} cy={150} r={40} fill="#4080d0" />

                {/* Water bulges */}
                {(() => {
                  const tRad = (tideAngle * Math.PI) / 180;
                  const bx1 = Math.cos(tRad) * 15;
                  const by1 = Math.sin(tRad) * 15;
                  return (
                    <>
                      <ellipse cx={200 + bx1} cy={150 + by1} rx={50} ry={44}
                        fill="none" stroke="rgba(80,180,255,.3)" strokeWidth={2}
                        transform={`rotate(${tideAngle},${200 + bx1},${150 + by1})`} />
                      <text x={200 + Math.cos(tRad) * 60} y={150 + Math.sin(tRad) * 60} fill="#60b0e0" fontSize="8" textAnchor="middle">High Tide</text>
                      <text x={200 - Math.cos(tRad) * 60} y={150 - Math.sin(tRad) * 60} fill="#60b0e0" fontSize="8" textAnchor="middle">High Tide</text>
                    </>
                  );
                })()}

                {/* Moon */}
                {(() => {
                  const pos = orbitalPosition(tideAngle, 110);
                  return (
                    <>
                      <circle cx={200} cy={150} r={110} fill="none" stroke="rgba(80,120,180,.1)" strokeWidth={0.5} strokeDasharray="4 4" />
                      <circle cx={200 + pos.x} cy={150 + pos.y} r={10} fill="#c0c0b0" />
                      <text x={200 + pos.x} y={150 + pos.y + 18} fill="#6090b0" fontSize="8" textAnchor="middle">Moon</text>
                      {/* Gravity arrow */}
                      <line x1={200 + pos.x * 0.7} y1={150 + pos.y * 0.7} x2={200 + pos.x * 0.4} y2={150 + pos.y * 0.4}
                        stroke="rgba(255,200,60,.3)" strokeWidth={1.5} markerEnd="url(#es-arrow)" />
                    </>
                  );
                })()}
              </svg>
            </div>

            <div className="es-slider-row">
              <label>Moon position</label>
              <input type="range" min={0} max={360} value={tideAngle}
                onChange={(e) => { setTideAngle(+e.target.value); setTotalInteractions((n) => n + 1); }} />
              <span className="es-slider-val">{tideAngle}</span>
            </div>

            <div className="es-result">
              <div className="es-result-item"><label>Near tide</label><b>{(tideHeight(tideAngle, 0) * 100).toFixed(0)}%</b></div>
              <div className="es-result-item"><label>Far tide</label><b>{(tideHeight(tideAngle, 180) * 100).toFixed(0)}%</b></div>
              <div className="es-result-item"><label>Tides/day</label><b>2 high, 2 low</b></div>
            </div>

            <p style={{ fontSize: 12, color: "#5080a0", margin: "6px 0" }}>
              The Moon's gravity pulls on Earth's oceans, creating a bulge of water on the side facing the Moon and another on the opposite side.
              As Earth rotates, coastal areas pass through these bulges, experiencing high and low tides twice a day.
            </p>
          </div>
          {renderQuiz("tides", TIDES_QUIZ)}
        </div>
      )}

      {/* ══ Badges Panel ══ */}
      {badgesOpen && (
        <div className="es-panel es-ui" onClick={(e) => e.stopPropagation()}>
          <div className="es-panel-bar">
            <b>🏅 Badges</b>
            <button className="es-x" onClick={() => setBadgesOpen(false)}>x</button>
          </div>
          <div className="es-panel-body">
            {EARTHSKY_ACHIEVEMENTS.map((a) => {
              const earned = earnedBadges.some((b) => b.id === a.id);
              return (
                <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid rgba(60,100,180,.1)", opacity: earned ? 1 : 0.4 }}>
                  <span style={{ fontSize: 24 }}>{a.icon}</span>
                  <div>
                    <b style={{ fontSize: 13, color: earned ? "#90c0ff" : "#506880" }}>{a.name}</b>
                    <span style={{ display: "block", fontSize: 11, color: "#5080a0" }}>{a.description}</span>
                  </div>
                  {earned && <span style={{ marginLeft: "auto", color: "#50a080", fontSize: 11 }}>Earned</span>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ══ Notebook Panel ══ */}
      {logOpen && (
        <div className="es-notebook es-ui" onClick={(e) => e.stopPropagation()}>
          <div className="es-notebook-bar">
            <b>📓 Notebook</b>
            <button className="es-x" onClick={() => setLogOpen(false)}>x</button>
          </div>
          <div className="es-notebook-body">
            {log.length === 0 && <p style={{ fontSize: 12, color: "#506080", textAlign: "center", padding: 20 }}>Interact with stations to record observations.</p>}
            {log.map((entry) => (
              <div key={entry.id} className="es-log">
                <span className="es-log-icon">{entry.icon}</span>
                <div className="es-log-text">
                  <b>{entry.label}</b>
                  {Object.entries(entry.params).map(([k, v]) => (
                    <span key={k} style={{ display: "block" }}>{k}: {v}</span>
                  ))}
                  <span>{entry.result}</span>
                </div>
                <span className="es-log-time">{new Date(entry.time).toLocaleTimeString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Badge toast */}
      {newBadge && (
        <div className="es-badge-toast">
          <span style={{ fontSize: 28 }}>{newBadge.icon}</span>
          <div>
            <b style={{ color: "#80c0ff", fontSize: 14 }}>Badge earned!</b>
            <span style={{ display: "block", fontSize: 13, color: "#a0d0ff" }}>{newBadge.name}</span>
          </div>
        </div>
      )}

      {/* ── Dock ── */}
      <div className="es-dock">
        <div className="es-dock-tabs">
          {(["explore", "cycles"] as const).map((tab) => (
            <button key={tab} className={dockTab === tab ? "on" : ""}
              onClick={() => setDockTab(tab)}>
              {tab === "explore" ? "Explore" : "Cycles"}
            </button>
          ))}
        </div>
        <div className="es-dock-btns">
          {dockButtons[dockTab].map((btn) => (
            <button key={btn.id}
              className={`es-chip${(solarOpen && btn.id === "solar-system") || (layersOpen && btn.id === "earth-layers") || (dayNightOpen && btn.id === "day-night") || (moonOpen && btn.id === "moon-phases") || (seasonsOpen && btn.id === "seasons") || (tidesOpen && btn.id === "tides") ? " on" : ""}${visited.has(btn.id) ? " done" : ""}`}
              onClick={() => openStation(btn.id)}>
              {btn.icon} {btn.label}
            </button>
          ))}
          <button className={`es-chip${logOpen ? " on" : ""}`} onClick={() => { closeAll(); setLogOpen(true); }}>
            📓 Notebook {log.length > 0 && <span style={{ fontSize: 9, color: "#50a080", marginLeft: 4 }}>{log.length}</span>}
          </button>
          <button className={`es-chip${badgesOpen ? " on" : ""}`} onClick={() => { closeAll(); setBadgesOpen(true); }}>
            🏅 Badges {earnedBadges.length > 0 && <span style={{ fontSize: 9, color: "#50a080", marginLeft: 4 }}>{earnedBadges.length}</span>}
          </button>
        </div>
      </div>
    </div>
  );
}
