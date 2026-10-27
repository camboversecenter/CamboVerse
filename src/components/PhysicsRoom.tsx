import { useCallback, useMemo, useRef, useState, useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import { XR } from '@react-three/xr';
import { useLabVR, LabVRButton, LabVRRig } from './LabVR';
import { ACESFilmicToneMapping } from "three";
import { PhysicsRoomScene, STATIONS } from "./PhysicsRoomScene";
import { WalkControls } from "./WalkControls";
import type { WalkInput } from "./FirstPersonControls";
import {
  SIMPLE_MACHINES, type SimpleMachine,
  NEWTON_LAWS,
  PROJECTILE_PRESETS, projectileTrajectory, projectileRange, projectileMaxHeight, projectileFlightTime,
  CIRCUIT_PRESETS, type CellType, analyzeCircuitGrid, presetToGrid,
  PENDULUM_PRESETS, pendulumPeriod, pendulumFrequency,
  ENERGY_SCENARIOS, type EnergyScenario, kineticEnergy, potentialEnergy, totalEnergy, fallSpeed,
  WAVE_PRESETS, type WavePreset, waveSpeed,
  SLOPE_PRESETS, type SlopePreset, slopeForces,
  COLLISION_PRESETS, type CollisionPreset, elasticCollision, inelasticCollision, momentum,
  SAFETY_QUIZ, MACHINES_QUIZ, NEWTON_QUIZ, PROJECTILE_QUIZ, CIRCUIT_QUIZ,
  ENERGY_QUIZ, WAVE_QUIZ, PENDULUM_QUIZ, SLOPE_QUIZ, MOMENTUM_QUIZ,
  PHYSICS_ACHIEVEMENTS, type PhysicsAchievementCtx, type PhysicsAchievement,
  type QuizQuestion,
} from "../physics";
import { playSuccess, playError, setChemMuted } from "../lib/chemSound";
import "./PhysicsRoom.css";

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

export function PhysicsRoom({
  onBack,
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

  const [quizPassed, setQuizPassed] = useState(true);
  const [quizStep, setQuizStep] = useState(0);
  const [quizScore, setQuizScore] = useState(0);
  const [quizAnswer, setQuizAnswer] = useState<number | null>(null);

  const [reading, setReading] = useState<string | null>(null);
  const [promptDismissed, setPromptDismissed] = useState<string | null>(null);
  const [visited, setVisited] = useState<Set<string>>(new Set());
  const markVisited = useCallback((id: string) => setVisited((s) => (s.has(id) ? s : new Set([...s, id]))), []);

  const [dockTab, setDockTab] = useState<"core" | "experiments" | "analysis">("core");
  const [expQuiz, setExpQuiz] = useState<Record<string, Record<number, number>>>({});

  // Panel open states
  const [machinesOpen, setMachinesOpen] = useState(false);
  const [selectedMachine, setSelectedMachine] = useState<SimpleMachine>(SIMPLE_MACHINES[0]);
  const [maEffort, setMaEffort] = useState(100);

  const [newtonOpen, setNewtonOpen] = useState(false);

  const [projectileOpen, setProjectileOpen] = useState(false);
  const [projAngle, setProjAngle] = useState(45);
  const [projSpeed, setProjSpeed] = useState(15);

  const [circuitOpen, setCircuitOpen] = useState(false);
  const [circuitGrid, setCircuitGrid] = useState<CellType[][]>(() => presetToGrid(CIRCUIT_PRESETS[0]));
  const [circuitTool, setCircuitTool] = useState<CellType>(null);

  const [energyOpen, setEnergyOpen] = useState(false);
  const [energyScenario, setEnergyScenario] = useState<EnergyScenario>(ENERGY_SCENARIOS[0]);
  const [energyHeight, setEnergyHeight] = useState(ENERGY_SCENARIOS[0].height);

  const [waveOpen, setWaveOpen] = useState(false);
  const [wavePreset, setWavePreset] = useState<WavePreset>(WAVE_PRESETS[0]);
  const [waveFreq, setWaveFreq] = useState(WAVE_PRESETS[0].frequency);
  const [waveAmp, setWaveAmp] = useState(WAVE_PRESETS[0].amplitude);
  const [waveLambda, setWaveLambda] = useState(WAVE_PRESETS[0].wavelength);

  const [pendulumOpen, setPendulumOpen] = useState(false);
  const [pendLength, setPendLength] = useState(1.0);
  const [pendAngle, setPendAngle] = useState(30);

  const [slopeOpen, setSlopeOpen] = useState(false);
  const [slopePreset, setSlopePreset] = useState<SlopePreset>(SLOPE_PRESETS[0]);
  const [slopeMass, setSlopeMass] = useState(SLOPE_PRESETS[0].mass);
  const [slopeAngle, setSlopeAngle] = useState(SLOPE_PRESETS[0].angle);
  const [slopeMu, setSlopeMu] = useState(SLOPE_PRESETS[0].mu);

  const [badgesOpen, setBadgesOpen] = useState(false);

  // Collision simulator
  const [collisionOpen, setCollisionOpen] = useState(false);
  const [collPreset, setCollPreset] = useState<CollisionPreset>(COLLISION_PRESETS[0]);
  const [collMassA, setCollMassA] = useState(COLLISION_PRESETS[0].massA);
  const [collMassB, setCollMassB] = useState(COLLISION_PRESETS[0].massB);
  const [collSpeedA, setCollSpeedA] = useState(COLLISION_PRESETS[0].speedA);
  const [collSpeedB, setCollSpeedB] = useState(COLLISION_PRESETS[0].speedB);
  const [collType, setCollType] = useState<"elastic" | "inelastic">(COLLISION_PRESETS[0].type);
  const [collResult, setCollResult] = useState<{ v1f: number; v2f?: number; vf?: number } | null>(null);

  // Experiment notebook
  interface PhysicsLogEntry { id: number; station: string; icon: string; label: string; params: Record<string, string>; result: string; time: number; }
  const [logOpen, setLogOpen] = useState(false);
  const [log, setLog] = useState<PhysicsLogEntry[]>([]);
  const logIdRef = useRef(0);
  const addLog = useCallback((station: string, icon: string, label: string, params: Record<string, string>, result: string) => {
    setLog((prev) => [{ id: ++logIdRef.current, station, icon, label, params, result, time: Date.now() }, ...prev].slice(0, 50));
  }, []);

  // Achievement tracking
  const [totalExperiments, setTotalExperiments] = useState(0);
  const [collisionsDone, setCollisionsDone] = useState(0);
  const [quizzesPerfect, setQuizzesPerfect] = useState(0);
  const [allPresetsUsed, setAllPresetsUsed] = useState<Set<string>>(new Set());
  const [newBadge, setNewBadge] = useState<PhysicsAchievement | null>(null);
  const markPreset = useCallback((presetId: string) => setAllPresetsUsed((s) => s.has(presetId) ? s : new Set([...s, presetId])), []);

  // Sound
  const [soundOn, setSoundOn] = useState(false);
  useEffect(() => { setChemMuted(true); }, []);

  // Ambient lab sounds (Web Audio)
  const ambientCtxRef = useRef<AudioContext | null>(null);
  const ambientIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    if (!soundOn) {
      if (ambientIntervalRef.current) { clearInterval(ambientIntervalRef.current); ambientIntervalRef.current = null; }
      if (ambientCtxRef.current) { ambientCtxRef.current.close(); ambientCtxRef.current = null; }
      return;
    }
    const ctx = new AudioContext();
    ambientCtxRef.current = ctx;

    // Continuous electrical hum (60Hz + harmonics, very quiet)
    const humGain = ctx.createGain(); humGain.gain.value = 0.03; humGain.connect(ctx.destination);
    const hum = ctx.createOscillator(); hum.type = "sine"; hum.frequency.value = 60; hum.connect(humGain); hum.start();
    const hum2 = ctx.createOscillator(); hum2.type = "sine"; hum2.frequency.value = 120;
    const hum2Gain = ctx.createGain(); hum2Gain.gain.value = 0.015; hum2.connect(hum2Gain); hum2Gain.connect(ctx.destination); hum2.start();

    // Clock tick every second
    ambientIntervalRef.current = setInterval(() => {
      if (!ambientCtxRef.current) return;
      const c = ambientCtxRef.current;
      const g = c.createGain(); g.gain.setValueAtTime(0.08, c.currentTime); g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.08); g.connect(c.destination);
      const o = c.createOscillator(); o.type = "square"; o.frequency.value = 1800; o.connect(g); o.start(c.currentTime); o.stop(c.currentTime + 0.03);
      // Water drip every 3rd tick
      if (Math.random() < 0.33) {
        const wg = c.createGain(); wg.gain.setValueAtTime(0.04, c.currentTime + 0.1); wg.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.4); wg.connect(c.destination);
        const wo = c.createOscillator(); wo.type = "sine"; wo.frequency.setValueAtTime(800 + Math.random() * 400, c.currentTime + 0.1);
        wo.frequency.exponentialRampToValueAtTime(200, c.currentTime + 0.35); wo.connect(wg); wo.start(c.currentTime + 0.1); wo.stop(c.currentTime + 0.4);
      }
    }, 1000);

    return () => {
      hum.stop(); hum2.stop();
      if (ambientIntervalRef.current) { clearInterval(ambientIntervalRef.current); ambientIntervalRef.current = null; }
      ctx.close(); ambientCtxRef.current = null;
    };
  }, [soundOn]);

  // Animation infrastructure
  const animFrameIds = useRef<Record<string, number>>({});
  const stopAnim = useCallback((key: string) => {
    if (animFrameIds.current[key]) {
      cancelAnimationFrame(animFrameIds.current[key]);
      delete animFrameIds.current[key];
    }
  }, []);
  const stopAllAnims = useCallback(() => {
    Object.keys(animFrameIds.current).forEach(stopAnim);
  }, [stopAnim]);
  useEffect(() => () => { Object.values(animFrameIds.current).forEach(cancelAnimationFrame); }, []);

  // Animation playing states
  const [projPlaying, setProjPlaying] = useState(false);
  const [wavePlaying, setWavePlaying] = useState(true);
  const [pendSwinging, setPendSwinging] = useState(false);
  const [collAnimating, setCollAnimating] = useState(false);
  const [slopePlaying, setSlopePlaying] = useState(false);

  // Animation refs (timing state - not useState to avoid per-frame re-renders)
  const projAnimRef = useRef({ running: false, startTime: 0 });
  const waveAnimRef = useRef({ running: false });
  const pendAnimRef = useRef({ running: false, startTime: 0, theta0: 0 });
  const collAnimRef = useRef({ running: false, startTime: 0, phase: "idle" as "approach" | "impact" | "separate" | "idle" });
  const slopeAnimRef = useRef({ running: false, startTime: 0 });

  // SVG element refs for direct DOM manipulation
  const projBallRef = useRef<SVGCircleElement>(null);
  const projTrailRef = useRef<SVGPathElement>(null);
  const waveSvgRef = useRef<SVGPathElement>(null);
  const waveParamsRef = useRef({ freq: waveFreq, amp: waveAmp });
  const pendBobRef = useRef<SVGCircleElement>(null);
  const pendRodRef = useRef<SVGLineElement>(null);
  const slopeBlockRef = useRef<SVGRectElement>(null);
  const collBlockARef = useRef<SVGRectElement>(null);
  const collBlockBRef = useRef<SVGRectElement>(null);
  const collFlashRef = useRef<SVGCircleElement>(null);

  const anyPanelOpen = machinesOpen || newtonOpen || projectileOpen || circuitOpen ||
    energyOpen || waveOpen || pendulumOpen || slopeOpen || collisionOpen || badgesOpen || logOpen || !!reading;

  useEffect(() => {
    if (showHelp) {
      const t = setTimeout(() => setShowHelp(false), 6000);
      return () => clearTimeout(t);
    }
  }, [showHelp]);

  const station = nearStation ? STATIONS.find((s) => s.id === nearStation) ?? null : null;
  const readingStation = reading ? STATIONS.find((s) => s.id === reading) ?? null : null;

  // Achievements
  const achCtx = useMemo<PhysicsAchievementCtx>(() => ({
    stationsVisited: visited,
    quizPassed,
    quizzesPerfect,
    totalExperiments,
    collisionsDone,
    allPresetsUsed,
  }), [visited, quizPassed, quizzesPerfect, totalExperiments, collisionsDone, allPresetsUsed]);

  const earnedBadges = useMemo(() => PHYSICS_ACHIEVEMENTS.filter((a) => a.check(achCtx)), [achCtx]);

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
    stopAllAnims();
    setProjPlaying(false); setWavePlaying(true); setPendSwinging(false); setCollAnimating(false); setSlopePlaying(false);
    setMachinesOpen(false);
    setNewtonOpen(false);
    setProjectileOpen(false);
    setCircuitOpen(false); setCircuitTool(null);
    setEnergyOpen(false);
    setWaveOpen(false);
    setPendulumOpen(false);
    setSlopeOpen(false);
    setCollisionOpen(false);
    setBadgesOpen(false);
    setLogOpen(false);
    setReading(null);
  }, [stopAllAnims]);

  const openStation = useCallback((id: string) => {
    closeAll();
    markVisited(id);
    switch (id) {
      case "machines-bench": setMachinesOpen(true); break;
      case "newton-bench": setNewtonOpen(true); break;
      case "projectile-bench": setProjectileOpen(true); break;
      case "circuit-table": setCircuitOpen(true); break;
      case "energy-table": setEnergyOpen(true); break;
      case "wave-wall": setWaveOpen(true); break;
      case "pendulum-corner": setPendulumOpen(true); break;
      case "slope-corner": setSlopeOpen(true); break;
      case "collision-bench": setCollisionOpen(true); break;
      case "whiteboard": setReading("whiteboard"); break;
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
      if ((e.target as HTMLElement).closest(".phys-top, .phys-dock, .phys-prompt, .phys-panel, .phys-scrim")) return;
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
      <div className="phys-quiz">
        <h4>Test yourself</h4>
        {questions.map((item, qi) => {
          const given = answers[qi];
          const answered = given !== undefined;
          return (
            <div key={qi} className="phys-quiz-q">
              <p><b>{qi + 1}.</b> {item.q}</p>
              <div className="phys-quiz-opts">
                {item.options.map((opt, oi) => {
                  const cls = !answered ? "" : oi === item.answer ? "right" : oi === given ? "wrong" : "";
                  return (
                    <button key={oi} className={cls} disabled={answered}
                      onClick={() => {
                        const correct = oi === item.answer;
                        if (soundOn) (correct ? playSuccess : playError)();
                        setExpQuiz((prev) => {
                          const next = { ...prev, [key]: { ...prev[key], [qi]: oi } };
                          const a = next[key];
                          const allDone = questions.every((_, i) => a[i] !== undefined);
                          if (allDone && !perfectQuizzesRef.current.has(key)) {
                            const allCorrect = questions.every((q, i) => a[i] === q.answer);
                            if (allCorrect) {
                              perfectQuizzesRef.current.add(key);
                              setQuizzesPerfect(perfectQuizzesRef.current.size);
                            }
                          }
                          return next;
                        });
                        setTotalExperiments((n) => n + 1);
                      }}
                    >{opt}</button>
                  );
                })}
              </div>
              {answered && <p className="phys-quiz-why">{item.why}</p>}
            </div>
          );
        })}
      </div>
    );
  };

  // Computed values
  const projTraj = useMemo(() => projectileTrajectory(projAngle, projSpeed), [projAngle, projSpeed]);
  const projR = useMemo(() => projectileRange(projAngle, projSpeed), [projAngle, projSpeed]);
  const projH = useMemo(() => projectileMaxHeight(projAngle, projSpeed), [projAngle, projSpeed]);
  const projT = useMemo(() => projectileFlightTime(projAngle, projSpeed), [projAngle, projSpeed]);

  const circAnalysis = useMemo(() => analyzeCircuitGrid(circuitGrid), [circuitGrid]);

  const eKE = kineticEnergy(energyScenario.mass, fallSpeed(energyHeight));
  const ePE = potentialEnergy(energyScenario.mass, energyHeight);
  const eTotal = totalEnergy(energyScenario.mass, energyScenario.height, 0);

  const wSpeed = waveSpeed(waveFreq, waveLambda);
  const pPeriod = pendulumPeriod(pendLength);
  const pFreq = pendulumFrequency(pendLength);
  const sForces = slopeForces(slopeMass, slopeAngle, slopeMu);

  const totalStations = STATIONS.length;
  const visitedCount = visited.size;

  // Keep wave params ref in sync for rAF callback
  waveParamsRef.current = { freq: waveFreq, amp: waveAmp };

  // ── Animation: Projectile ball tracing arc ──
  const startProjAnim = useCallback(() => {
    stopAnim("proj");
    projAnimRef.current = { running: true, startTime: performance.now() };
    setProjPlaying(true);
    if (projBallRef.current) { projBallRef.current.setAttribute("cx", "30"); projBallRef.current.setAttribute("cy", "150"); projBallRef.current.style.opacity = "1"; }
    if (projTrailRef.current) projTrailRef.current.setAttribute("d", "");
    const traj = projTraj;
    const maxX = Math.max(...traj.map((p) => p.x), 1);
    const maxY = Math.max(...traj.map((p) => p.y), 1);
    const sx = 440 / maxX;
    const sy = 140 / maxY;
    const duration = Math.max(projT * 1000, 800);
    const tick = (now: number) => {
      const elapsed = now - projAnimRef.current.startTime;
      const progress = Math.min(elapsed / duration, 1);
      const idx = Math.min(Math.floor(progress * (traj.length - 1)), traj.length - 1);
      const px = traj[idx].x * sx + 30;
      const py = 150 - traj[idx].y * sy;
      if (projBallRef.current) { projBallRef.current.setAttribute("cx", px.toFixed(1)); projBallRef.current.setAttribute("cy", py.toFixed(1)); }
      const trailD = traj.slice(0, idx + 1).map((p, i) => `${i === 0 ? "M" : "L"}${(p.x * sx + 30).toFixed(1)},${(150 - p.y * sy).toFixed(1)}`).join(" ");
      if (projTrailRef.current) projTrailRef.current.setAttribute("d", trailD);
      if (progress < 1) {
        animFrameIds.current["proj"] = requestAnimationFrame(tick);
      } else {
        projAnimRef.current.running = false;
        setProjPlaying(false);
      }
    };
    animFrameIds.current["proj"] = requestAnimationFrame(tick);
  }, [projTraj, projT, stopAnim]);

  const resetProjAnim = useCallback(() => {
    stopAnim("proj");
    projAnimRef.current.running = false;
    setProjPlaying(false);
    if (projBallRef.current) projBallRef.current.style.opacity = "0";
    if (projTrailRef.current) projTrailRef.current.setAttribute("d", "");
  }, [stopAnim]);

  // ── Animation: Wave scrolling ──
  const startWaveAnim = useCallback(() => {
    waveAnimRef.current.running = true;
    setWavePlaying(true);
    const tick = (now: number) => {
      if (!waveAnimRef.current.running) return;
      const { freq, amp } = waveParamsRef.current;
      const phase = now * 0.003 * freq;
      const w = 440, h = 120;
      const pts: string[] = [];
      for (let x = 0; x <= w; x += 2) {
        const y = h / 2 - (amp * 0.8) * Math.sin((x / w) * freq * 2 * Math.PI - phase);
        pts.push(`${x === 0 ? "M" : "L"}${(x + 20).toFixed(1)},${y.toFixed(1)}`);
      }
      if (waveSvgRef.current) waveSvgRef.current.setAttribute("d", pts.join(" "));
      animFrameIds.current["wave"] = requestAnimationFrame(tick);
    };
    animFrameIds.current["wave"] = requestAnimationFrame(tick);
  }, []);

  const stopWaveAnim = useCallback(() => {
    waveAnimRef.current.running = false;
    setWavePlaying(false);
    stopAnim("wave");
  }, [stopAnim]);

  // Auto-start/stop wave animation when panel opens/closes
  useEffect(() => {
    if (waveOpen && wavePlaying) startWaveAnim();
    else stopWaveAnim();
    return () => stopWaveAnim();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [waveOpen]);

  // ── Animation: Pendulum swing ──
  const startPendAnim = useCallback(() => {
    stopAnim("pend");
    const theta0 = (pendAngle * Math.PI) / 180;
    const T = pendulumPeriod(pendLength);
    const omega = (2 * Math.PI) / T;
    const gamma = 0.3;
    pendAnimRef.current = { running: true, startTime: performance.now(), theta0 };
    setPendSwinging(true);
    const tick = (now: number) => {
      const t = (now - pendAnimRef.current.startTime) / 1000;
      const decay = Math.exp(-gamma * t);
      if (decay < 0.01 || t > 15) {
        pendAnimRef.current.running = false;
        setPendSwinging(false);
        const cx = 100, cy = 10 + 120;
        if (pendBobRef.current) { pendBobRef.current.setAttribute("cx", String(cx)); pendBobRef.current.setAttribute("cy", String(cy)); }
        if (pendRodRef.current) { pendRodRef.current.setAttribute("x2", String(cx)); pendRodRef.current.setAttribute("y2", String(cy)); }
        return;
      }
      const theta = theta0 * Math.cos(omega * t) * decay;
      const cx = 100 + Math.sin(theta) * 120;
      const cy = 10 + Math.cos(theta) * 120;
      if (pendBobRef.current) { pendBobRef.current.setAttribute("cx", cx.toFixed(1)); pendBobRef.current.setAttribute("cy", cy.toFixed(1)); }
      if (pendRodRef.current) { pendRodRef.current.setAttribute("x2", cx.toFixed(1)); pendRodRef.current.setAttribute("y2", cy.toFixed(1)); }
      animFrameIds.current["pend"] = requestAnimationFrame(tick);
    };
    animFrameIds.current["pend"] = requestAnimationFrame(tick);
  }, [pendAngle, pendLength, stopAnim]);

  // ── Animation: Slope block sliding ──
  const startSlopeAnim = useCallback(() => {
    stopAnim("slope");
    slopeAnimRef.current = { running: true, startTime: performance.now() };
    setSlopePlaying(true);
    const rad = (slopeAngle * Math.PI) / 180;
    const baseLen = 300;
    const h = baseLen * Math.tan(rad);
    const clampH = Math.min(h, 180);
    const sx = clampH / (Math.tan(rad) || 1);
    const duration = 1200;
    const tick = (now: number) => {
      const elapsed = now - slopeAnimRef.current.startTime;
      const t = Math.min(elapsed / duration, 1);
      const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      const pos = 0.35 + eased * 0.65;
      const bx = 50 + sx * pos - 8;
      const by = 190 - clampH * pos - 20;
      if (slopeBlockRef.current) {
        slopeBlockRef.current.setAttribute("x", bx.toFixed(1));
        slopeBlockRef.current.setAttribute("y", by.toFixed(1));
      }
      if (t < 1) {
        animFrameIds.current["slope"] = requestAnimationFrame(tick);
      } else {
        slopeAnimRef.current.running = false;
        setTimeout(() => {
          if (slopeBlockRef.current) {
            slopeBlockRef.current.setAttribute("x", String(50 + sx * 0.35 - 8));
            slopeBlockRef.current.setAttribute("y", String(190 - clampH * 0.35 - 20));
          }
          setSlopePlaying(false);
        }, 500);
      }
    };
    animFrameIds.current["slope"] = requestAnimationFrame(tick);
  }, [slopeAngle, stopAnim]);

  // ── Animation: Collision blocks ──
  const startCollAnim = useCallback((result: { v1f: number; v2f?: number; vf?: number }) => {
    stopAnim("coll");
    collAnimRef.current = { running: true, startTime: performance.now(), phase: "approach" };
    setCollAnimating(true);
    if (collFlashRef.current) collFlashRef.current.style.opacity = "0";
    const isInelastic = result.vf !== undefined;
    const tick = (now: number) => {
      const elapsed = now - collAnimRef.current.startTime;
      const { phase } = collAnimRef.current;
      if (phase === "approach" && elapsed < 600) {
        const t = elapsed / 600;
        const axPos = 40 + t * 120;
        const bxPos = 320 - t * 120;
        if (collBlockARef.current) collBlockARef.current.setAttribute("x", axPos.toFixed(0));
        if (collBlockBRef.current) collBlockBRef.current.setAttribute("x", bxPos.toFixed(0));
      } else if (phase === "approach") {
        collAnimRef.current.phase = "impact";
        collAnimRef.current.startTime = now;
        if (collFlashRef.current) { collFlashRef.current.style.opacity = "1"; collFlashRef.current.style.transition = "opacity 0.2s"; }
      } else if (phase === "impact" && elapsed < 200) {
        // flash visible
      } else if (phase === "impact") {
        collAnimRef.current.phase = "separate";
        collAnimRef.current.startTime = now;
        if (collFlashRef.current) collFlashRef.current.style.opacity = "0";
        if (isInelastic && collBlockBRef.current) collBlockBRef.current.style.opacity = "0";
      } else if (phase === "separate" && elapsed < 800) {
        const t = elapsed / 800;
        if (isInelastic) {
          const dir = (result.vf ?? 0) >= 0 ? 1 : -1;
          const pos = 180 + dir * t * 60;
          if (collBlockARef.current) collBlockARef.current.setAttribute("x", pos.toFixed(0));
        } else {
          const v1dir = result.v1f >= 0 ? 1 : -1;
          const v2dir = (result.v2f ?? 0) >= 0 ? 1 : -1;
          const aPos = 160 + v1dir * t * 100;
          const bPos = 200 + v2dir * t * 100;
          if (collBlockARef.current) collBlockARef.current.setAttribute("x", aPos.toFixed(0));
          if (collBlockBRef.current) collBlockBRef.current.setAttribute("x", bPos.toFixed(0));
        }
      } else {
        collAnimRef.current.running = false;
        collAnimRef.current.phase = "idle";
        setCollAnimating(false);
        if (collBlockBRef.current) collBlockBRef.current.style.opacity = "1";
        return;
      }
      animFrameIds.current["coll"] = requestAnimationFrame(tick);
    };
    animFrameIds.current["coll"] = requestAnimationFrame(tick);
  }, [stopAnim]);

  // ── Safety quiz gate ──
  if (!quizPassed) {
    const q = SAFETY_QUIZ[quizStep];
    return (
      <div className="phys-safety">
        <div className="phys-safety-card">
          <h2>Physics Lab Safety Check</h2>
          <p>Answer {SAFETY_QUIZ.length} safety questions to enter the lab.</p>
          <p style={{ margin: "12px 0 6px", fontSize: 13, color: "#6090b0" }}>
            Question {quizStep + 1} of {SAFETY_QUIZ.length}
          </p>
          <p style={{ fontSize: 15, color: "#a0d0ff", marginBottom: 12 }}>{q.q}</p>
          <div className="phys-quiz-opts">
            {q.options.map((opt, i) => {
              const cls = quizAnswer === null ? "" : i === q.answer ? "right" : i === quizAnswer ? "wrong" : "";
              return (
                <button key={i} className={cls} disabled={quizAnswer !== null}
                  onClick={() => {
                    setQuizAnswer(i);
                    const correct = i === q.answer;
                    if (correct) setQuizScore((s) => s + 1);
                    setTimeout(() => {
                      if (quizStep + 1 >= SAFETY_QUIZ.length) {
                        if (quizScore + (correct ? 1 : 0) >= 4) setQuizPassed(true);
                        else { setQuizStep(0); setQuizScore(0); }
                      } else setQuizStep((s) => s + 1);
                      setQuizAnswer(null);
                    }, 1200);
                  }}
                >{opt}</button>
              );
            })}
          </div>
          {quizAnswer !== null && <p className="phys-quiz-why">{q.why}</p>}
          <button className="phys-back" style={{ marginTop: 16 }} onClick={onBack}>Cancel</button>
        </div>
      </div>
    );
  }

  // ── Dock categories ──
  const dockButtons: Record<string, { id: string; icon: string; label: string }[]> = {
    core: [
      { id: "machines-bench", icon: "⚙️", label: "Machines" },
      { id: "newton-bench", icon: "🍎", label: "Newton" },
      { id: "projectile-bench", icon: "🎯", label: "Projectile" },
    ],
    experiments: [
      { id: "circuit-table", icon: "⚡", label: "Circuits" },
      { id: "energy-table", icon: "⚡", label: "Energy" },
      { id: "wave-wall", icon: "🌊", label: "Waves" },
      { id: "collision-bench", icon: "💥", label: "Collision" },
    ],
    analysis: [
      { id: "pendulum-corner", icon: "🕐", label: "Pendulum" },
      { id: "slope-corner", icon: "📐", label: "Slopes" },
      { id: "whiteboard", icon: "📋", label: "Formulas" },
    ],
  };

  // ── SVG trajectory ──
  const trajSvg = (() => {
    if (projTraj.length < 2) return null;
    const maxX = Math.max(...projTraj.map((p) => p.x), 1);
    const maxY = Math.max(...projTraj.map((p) => p.y), 1);
    const sx = 440 / maxX;
    const sy = 140 / maxY;
    const d = projTraj.map((p, i) => `${i === 0 ? "M" : "L"}${(p.x * sx + 30).toFixed(1)},${(150 - p.y * sy).toFixed(1)}`).join(" ");
    return (
      <svg viewBox="0 0 480 170" xmlns="http://www.w3.org/2000/svg">
        <line x1="30" y1="150" x2="470" y2="150" stroke="rgba(100,150,220,.3)" strokeWidth="1" />
        <line x1="30" y1="150" x2="30" y2="10" stroke="rgba(100,150,220,.3)" strokeWidth="1" />
        <path d={d} fill="none" stroke="rgba(96,160,255,.3)" strokeWidth="2" />
        <path ref={projTrailRef} d="" fill="none" stroke="#ff8060" strokeWidth="2.5" />
        <circle cx={30 + projTraj[projTraj.length - 1].x * sx} cy={150} r="4" fill="#ff8060" opacity={0.4} />
        <circle ref={projBallRef} cx="30" cy="150" r="6" fill="#ff8060" style={{ opacity: 0, filter: "drop-shadow(0 0 4px rgba(255,128,96,.6))" }} />
        <text x="35" y="165" fill="#6090b0" fontSize="10">{maxX.toFixed(1)} m</text>
        <text x="2" y="15" fill="#6090b0" fontSize="10">{maxY.toFixed(1)} m</text>
      </svg>
    );
  })();

  // ── Wave SVG ──
  const waveSvg = (() => {
    const w = 440;
    const h = 120;
    const pts: string[] = [];
    for (let x = 0; x <= w; x += 2) {
      const y = h / 2 - (waveAmp * 0.8) * Math.sin((x / w) * waveFreq * 2 * Math.PI);
      pts.push(`${x === 0 ? "M" : "L"}${(x + 20).toFixed(1)},${y.toFixed(1)}`);
    }
    return (
      <svg viewBox="0 0 480 130" xmlns="http://www.w3.org/2000/svg">
        <line x1="20" y1={h / 2} x2="460" y2={h / 2} stroke="rgba(100,150,220,.2)" strokeWidth="1" strokeDasharray="4" />
        <path ref={waveSvgRef} d={pts.join(" ")} fill="none" stroke="#60d0ff" strokeWidth="2" />
      </svg>
    );
  })();

  // ── Slope SVG ──
  const slopeSvg = (() => {
    const rad = (slopeAngle * Math.PI) / 180;
    const baseLen = 300;
    const h = baseLen * Math.tan(rad);
    const clampH = Math.min(h, 180);
    const sx = clampH / (Math.tan(rad) || 1);
    return (
      <svg viewBox="0 0 400 200" xmlns="http://www.w3.org/2000/svg">
        <polygon points={`50,190 ${(50 + sx).toFixed(0)},190 50,${(190 - clampH).toFixed(0)}`} fill="rgba(60,100,160,.2)" stroke="#6090c0" strokeWidth="2" />
        <rect ref={slopeBlockRef} x={50 + sx * 0.35 - 8} y={190 - clampH * 0.35 - 20} width="16" height="16"
          fill={sForces.slides ? "#ff8060" : "#60e0a0"} stroke="none"
          transform={`rotate(${-slopeAngle}, ${50 + sx * 0.35}, ${190 - clampH * 0.35 - 12})`} />
        <text x="200" y="16" fill="#6090b0" fontSize="11" textAnchor="middle">{slopeAngle} degrees</text>
      </svg>
    );
  })();

  // ── Energy bar chart SVG ──
  const energyBarSvg = (() => {
    const maxE = eTotal || 1;
    const barW = 60;
    const maxBarH = 120;
    const peH = (ePE / maxE) * maxBarH;
    const keH = (eKE / maxE) * maxBarH;
    const totH = ((ePE + eKE) / maxE) * maxBarH;
    return (
      <svg viewBox="0 0 320 170" xmlns="http://www.w3.org/2000/svg">
        <rect x={40} y={150 - peH} width={barW} height={Math.max(peH, 0)} fill="rgba(60,160,255,.5)" rx="4" style={{ transition: "y 0.4s ease-out, height 0.4s ease-out" }} />
        <text x={70} y={165} fill="#6090b0" fontSize="10" textAnchor="middle">PE</text>
        <text x={70} y={145 - peH} fill="#80c0ff" fontSize="11" textAnchor="middle">{ePE.toFixed(0)} J</text>
        <rect x={130} y={150 - keH} width={barW} height={Math.max(keH, 0)} fill="rgba(255,120,60,.5)" rx="4" style={{ transition: "y 0.4s ease-out, height 0.4s ease-out" }} />
        <text x={160} y={165} fill="#6090b0" fontSize="10" textAnchor="middle">KE</text>
        <text x={160} y={145 - keH} fill="#ffa070" fontSize="11" textAnchor="middle">{eKE.toFixed(0)} J</text>
        <rect x={220} y={150 - totH} width={barW} height={Math.max(totH, 0)} fill="rgba(100,220,140,.4)" rx="4" style={{ transition: "y 0.4s ease-out, height 0.4s ease-out" }} />
        <text x={250} y={165} fill="#6090b0" fontSize="10" textAnchor="middle">Total</text>
        <text x={250} y={145 - totH} fill="#70e0a0" fontSize="11" textAnchor="middle">{(ePE + eKE).toFixed(0)} J</text>
      </svg>
    );
  })();

  return (
    <div className="phys-room" ref={roomRef}>
      {/* 3D canvas */}
      <Canvas
        shadows={ultra}
        gl={{ antialias: ultra, toneMapping: ACESFilmicToneMapping, toneMappingExposure: 1.1 }}
        camera={{ fov: 70, near: 0.1, far: 100 }}
        style={{ touchAction: "none" }}
        onPointerDown={() => {
          if (!vr.active && !isTouch && !locked && roomRef.current) {
            try { roomRef.current.requestPointerLock?.(); } catch {}
          }
        }}
        onKeyDown={(e) => {
          const k = e.key.toLowerCase();
          const m = walkInput.current.move;
          if (k === "w") m.y = -1;
          else if (k === "s") m.y = 1;
          else if (k === "a") m.x = -1;
          else if (k === "d") m.x = 1;
        }}
        onKeyUp={(e) => {
          const k = e.key.toLowerCase();
          const m = walkInput.current.move;
          if (k === "w" || k === "s") m.y = 0;
          if (k === "a" || k === "d") m.x = 0;
        }}
        tabIndex={0}
      >
        <XR store={vr.store}>
          <PhysicsRoomScene walkInput={walkInput} ultra={ultra} onNear={setNearStation} />
          <LabVRRig start={[0, 0, 2.5]} bounds={[-5.4, 5.4, -4.4, 4.4]} stations={STATIONS} />
        </XR>
      </Canvas>

      {isTouch && <WalkControls input={walkInput} />}
      {!isTouch && <div className="phys-crosshair" />}

      {/* Top bar */}
      <div className="phys-top">
        <button className="phys-back" onClick={onBack}>← Back</button>
        <span className="phys-title">Physics & Machines Lab</span>
        <button className={`phys-toggle${soundOn ? " on" : ""}`} onClick={() => { setSoundOn((s) => !s); setChemMuted(soundOn); }}>
          {soundOn ? "Sound on" : "Sound off"}
        </button>
        <LabVRButton vr={vr} />
        <button disabled={vr.active} className={`phys-toggle${ultra ? " on" : ""}`} onClick={() => setUltra((u) => !u)}>
          {ultra ? "Ultra" : "Normal"}
        </button>
      </div>

      {/* Help overlay */}
      {showHelp && !anyPanelOpen && (
        <div className="phys-help">
          <p style={{ fontWeight: 600, color: "#80c0ff", marginBottom: 8 }}>Physics Lab Controls</p>
          {isTouch ? (
            <p>Use the joystick to walk. Tap stations to interact.</p>
          ) : (
            <div className="phys-help-grid">
              <span className="phys-key">W A S D</span><span>Walk around</span>
              <span className="phys-key">Mouse</span><span>Look (click to lock)</span>
              <span className="phys-key">E</span><span>Interact with station</span>
              <span className="phys-key">Esc</span><span>Close panel</span>
            </div>
          )}
        </div>
      )}

      {/* Proximity prompt */}
      {station && !anyPanelOpen && promptDismissed !== nearStation && (
        <div className="phys-prompt">
          <button className="phys-prompt-dismiss" onClick={() => setPromptDismissed(nearStation)}>x</button>
          <span className="phys-prompt-icon">{station.icon}</span>
          <div className="phys-prompt-text">
            <b>{station.label}</b>
            <span>{station.description}</span>
          </div>
          <button className="phys-interact" onClick={() => openStation(station.id)}>
            {isTouch ? "Open" : "E"}
          </button>
        </div>
      )}

      {/* Scrim */}
      {anyPanelOpen && <div className="phys-scrim" onClick={closeAll} />}

      {/* ══ Reading panel (whiteboard detail) ══ */}
      {readingStation && reading === "whiteboard" && (
        <div className="phys-read phys-ui" onClick={(e) => e.stopPropagation()}>
          <div className="phys-read-bar">
            <b>{readingStation.icon} {readingStation.label}</b>
            <button className="phys-x" onClick={() => setReading(null)}>x</button>
          </div>
          <div className="phys-read-body">
            <p>{readingStation.detail}</p>
            <div className="phys-result" style={{ gridTemplateColumns: "1fr 1fr" }}>
              <div className="phys-result-item"><label>Force</label><b>N = kg m/s2</b></div>
              <div className="phys-result-item"><label>Energy</label><b>J = N m</b></div>
              <div className="phys-result-item"><label>Power</label><b>W = J/s</b></div>
              <div className="phys-result-item"><label>Pressure</label><b>Pa = N/m2</b></div>
            </div>
            <p style={{ fontSize: 12, color: "#6080a0", marginTop: 8 }}>
              F = ma / W = Fd / P = W/t / V = IR / KE = 0.5mv2 / PE = mgh / T = 2pi sqrt(L/g)
            </p>
          </div>
        </div>
      )}

      {/* ══ Simple Machines ══ */}
      {machinesOpen && (
        <div className="phys-machines phys-ui" onClick={(e) => e.stopPropagation()}>
          <div className="phys-machines-bar">
            <b>⚙️ Simple Machines</b>
            <button className="phys-x" onClick={() => setMachinesOpen(false)}>x</button>
          </div>
          <div className="phys-machines-tabs">
            {SIMPLE_MACHINES.map((m) => (
              <button key={m.id} className={`phys-chip${selectedMachine.id === m.id ? " on" : ""}`}
                onClick={() => { setSelectedMachine(m); markPreset(m.id); setTotalExperiments((n) => n + 1); }}>
                {m.icon} {m.name}
              </button>
            ))}
          </div>
          <div className="phys-machine-detail">
            <h3>{selectedMachine.icon} {selectedMachine.name}</h3>
            <p>{selectedMachine.description}</p>
            <div className="phys-machine-info">
              <div className="phys-info-card">
                <label>Principle</label>
                <b style={{ fontSize: 12 }}>{selectedMachine.principle}</b>
              </div>
              <div className="phys-info-card">
                <label>Formula</label>
                <b style={{ fontSize: 12 }}>{selectedMachine.formula}</b>
              </div>
              <div className="phys-info-card">
                <label>Mechanical advantage</label>
                <b>{selectedMachine.maRatio}x</b>
              </div>
              <div className="phys-info-card">
                <label>Examples</label>
                <b style={{ fontSize: 12 }}>{selectedMachine.example}</b>
              </div>
            </div>
            <div className="phys-ma-demo">
              <label>Effort force: {maEffort} N</label>
              <input type="range" min={10} max={500} value={maEffort} onChange={(e) => setMaEffort(+e.target.value)} />
              <div className="phys-ma-result">
                <span>Input: <b>{maEffort} N</b></span>
                <span>Output: <b>{(maEffort * selectedMachine.maRatio).toFixed(0)} N</b></span>
                <span>MA: <b>{selectedMachine.maRatio}x</b></span>
              </div>
            </div>
          </div>
          {renderQuiz("machines", MACHINES_QUIZ)}
        </div>
      )}

      {/* ══ Newton's Laws ══ */}
      {newtonOpen && (
        <div className="phys-panel phys-ui" onClick={(e) => e.stopPropagation()}>
          <div className="phys-panel-bar">
            <b>🍎 Newton's Laws of Motion</b>
            <button className="phys-x" onClick={() => setNewtonOpen(false)}>x</button>
          </div>
          <div className="phys-panel-body">
            {NEWTON_LAWS.map((law) => (
              <div key={law.id} className="phys-law-card">
                <h4>Law {law.number}: {law.name}</h4>
                <p className="statement">"{law.statement}"</p>
                <p>{law.explanation}</p>
                {law.formula && <p><code>{law.formula}</code></p>}
                <p style={{ color: "#6090b0", fontSize: 12 }}>Example: {law.example}</p>
              </div>
            ))}
          </div>
          {renderQuiz("newton", NEWTON_QUIZ)}
        </div>
      )}

      {/* ══ Projectile Launcher ══ */}
      {projectileOpen && (
        <div className="phys-panel phys-ui" onClick={(e) => e.stopPropagation()}>
          <div className="phys-panel-bar">
            <b>🎯 Projectile Launcher</b>
            <button className="phys-x" onClick={() => setProjectileOpen(false)}>x</button>
          </div>
          <div className="phys-panel-body">
            <div className="phys-machines-tabs">
              {PROJECTILE_PRESETS.map((p) => (
                <button key={p.id} className={`phys-chip${projAngle === p.angle && projSpeed === p.speed ? " on" : ""}`}
                  onClick={() => { setProjAngle(p.angle); setProjSpeed(p.speed); markPreset(p.id); setTotalExperiments((n) => n + 1);
                    addLog("projectile-bench", "🎯", p.name, { angle: `${p.angle} deg`, speed: `${p.speed} m/s` }, `Range ${projectileRange(p.angle, p.speed).toFixed(1)} m`); }}>
                  {p.name}
                </button>
              ))}
            </div>
            <div className="phys-controls">
              <label>
                Angle: <b>{projAngle} degrees</b>
                <input type="range" min={5} max={85} value={projAngle} onChange={(e) => setProjAngle(+e.target.value)} />
              </label>
              <label>
                Speed: <b>{projSpeed} m/s</b>
                <input type="range" min={5} max={50} value={projSpeed} onChange={(e) => setProjSpeed(+e.target.value)} />
              </label>
            </div>
            <div className="phys-graph">{trajSvg}</div>
            <div style={{ display: "flex", justifyContent: "center", margin: "6px 0" }}>
              <button className="phys-interact" onClick={projPlaying ? resetProjAnim : startProjAnim}>
                {projPlaying ? "Reset" : "Launch!"}
              </button>
            </div>
            <div className="phys-result">
              <div className="phys-result-item"><label>Range</label><b>{projR.toFixed(1)} m</b></div>
              <div className="phys-result-item"><label>Max height</label><b>{projH.toFixed(1)} m</b></div>
              <div className="phys-result-item"><label>Flight time</label><b>{projT.toFixed(2)} s</b></div>
            </div>
          </div>
          {renderQuiz("projectile", PROJECTILE_QUIZ)}
        </div>
      )}

      {/* ══ Circuit Builder ══ */}
      {circuitOpen && (
        <div className="phys-panel phys-ui" onClick={(e) => e.stopPropagation()}>
          <div className="phys-panel-bar">
            <b>⚡ Circuit Builder</b>
            <button className="phys-x" onClick={() => setCircuitOpen(false)}>x</button>
          </div>
          <div className="phys-panel-body">
            {/* Tool tray */}
            <div className="circuit-tray">
              {([["battery", "🔋 Battery"], ["resistor", "⊟ Resistor"], ["bulb", "💡 Bulb"]] as [CellType, string][]).map(([t, lbl]) => (
                <button key={t!} className={`phys-chip${circuitTool === t ? " on" : ""}`}
                  onClick={() => setCircuitTool(circuitTool === t ? null : t)}>
                  {lbl}
                </button>
              ))}
              <button className="phys-chip" onClick={() => setCircuitTool(null)} style={{ opacity: circuitTool ? 1 : 0.4 }}>
                🧹 Eraser
              </button>
            </div>
            <p style={{ fontSize: 11, color: "#6090b0", margin: "4px 0 8px" }}>
              {circuitTool ? `Click a cell to place ${circuitTool}` : "Select a component above, then click cells"}
            </p>

            {/* SVG Grid */}
            <div className="circuit-grid">
              <svg viewBox="0 0 360 240" xmlns="http://www.w3.org/2000/svg">
                {circuitGrid.map((row, r) => row.map((cell, c) => {
                  const x = c * 60; const y = r * 60;
                  return (
                    <g key={`${r}-${c}`} onClick={() => {
                      setCircuitGrid(prev => {
                        const g = prev.map(rr => [...rr]);
                        if (cell && !circuitTool) { g[r][c] = null; }
                        else if (circuitTool) { g[r][c] = cell === circuitTool ? null : circuitTool; }
                        return g;
                      });
                      setTotalExperiments(n => n + 1);
                    }} style={{ cursor: "pointer" }}>
                      <rect x={x + 2} y={y + 2} width={56} height={56} rx={4}
                        fill={cell ? "rgba(60,100,160,.2)" : "rgba(40,60,90,.1)"}
                        stroke={cell ? "#4080c0" : "rgba(80,120,160,.2)"}
                        strokeWidth={cell ? 1.5 : 1}
                        strokeDasharray={cell ? "none" : "4 3"} />
                      {/* Battery */}
                      {cell === "battery" && <>
                        <line x1={x + 22} y1={y + 15} x2={x + 22} y2={y + 45} stroke="#e0a040" strokeWidth={3} />
                        <line x1={x + 34} y1={y + 20} x2={x + 34} y2={y + 40} stroke="#e0a040" strokeWidth={1.5} />
                        <text x={x + 16} y={y + 13} fill="#e0a040" fontSize={8}>+</text>
                        <text x={x + 36} y={y + 13} fill="#e0a040" fontSize={8}>-</text>
                        <text x={x + 30} y={y + 54} fill="#8090a0" fontSize={7} textAnchor="middle">9V</text>
                      </>}
                      {/* Resistor */}
                      {cell === "resistor" && <>
                        <path d={`M${x + 10},${y + 30} l6,-12 l6,12 l6,-12 l6,12 l6,-12 l6,12 l6,-12 l6,12`}
                          fill="none" stroke="#60a0e0" strokeWidth={1.8} />
                        <text x={x + 30} y={y + 52} fill="#8090a0" fontSize={7} textAnchor="middle">100Ω</text>
                      </>}
                      {/* Bulb */}
                      {cell === "bulb" && <>
                        <circle cx={x + 30} cy={y + 28} r={12}
                          fill={circAnalysis.hasBattery && circAnalysis.bulbBrightness > 0
                            ? `rgba(255,240,100,${0.2 + circAnalysis.bulbBrightness * 0.6})` : "rgba(60,80,100,.2)"}
                          stroke={circAnalysis.bulbBrightness > 0 ? "#ffe060" : "#6090b0"} strokeWidth={1.5} />
                        <line x1={x + 22} y1={y + 20} x2={x + 38} y2={y + 36} stroke={circAnalysis.bulbBrightness > 0 ? "#ffe060" : "#6090b0"} strokeWidth={1} />
                        <line x1={x + 38} y1={y + 20} x2={x + 22} y2={y + 36} stroke={circAnalysis.bulbBrightness > 0 ? "#ffe060" : "#6090b0"} strokeWidth={1} />
                        <text x={x + 30} y={y + 52} fill="#8090a0" fontSize={7} textAnchor="middle">
                          {circAnalysis.bulbBrightness > 0 ? "ON" : "OFF"}
                        </text>
                      </>}
                    </g>
                  );
                }))}
                {/* Wires between adjacent occupied cells in same row */}
                {circuitGrid.map((row, r) => row.map((cell, c) => {
                  if (!cell || c >= 5 || !row[c + 1]) return null;
                  return <line key={`w${r}-${c}`} x1={c * 60 + 55} y1={r * 60 + 30} x2={(c + 1) * 60 + 5} y2={r * 60 + 30}
                    stroke="#4080c0" strokeWidth={1.5} />;
                }))}
              </svg>
            </div>

            {/* Actions */}
            <div className="circuit-tray" style={{ marginTop: 8 }}>
              <button className="phys-chip" onClick={() => {
                setCircuitGrid(Array.from({ length: 4 }, () => Array(6).fill(null)));
              }}>Clear All</button>
              {CIRCUIT_PRESETS.map(p => (
                <button key={p.id} className="phys-chip" onClick={() => {
                  setCircuitGrid(presetToGrid(p)); markPreset(p.id);
                  addLog("circuit-table", "⚡", p.name, { V: `${p.voltage}V`, type: p.type },
                    `Loaded preset: ${p.name}`);
                }}>{p.name}</button>
              ))}
            </div>

            {/* Results */}
            {circAnalysis.hasBattery && (
              <div className="phys-result" style={{ marginTop: 10 }}>
                <div className="phys-result-item"><label>Voltage</label><b>{circAnalysis.voltage} V</b></div>
                <div className="phys-result-item"><label>Total R</label><b>{circAnalysis.totalResistance < 1 ? "short!" : `${circAnalysis.totalResistance.toFixed(1)} Ω`}</b></div>
                <div className="phys-result-item"><label>Current</label><b>{(circAnalysis.current * 1000).toFixed(1)} mA</b></div>
                <div className="phys-result-item"><label>Power</label><b>{(circAnalysis.power * 1000).toFixed(1)} mW</b></div>
                {circAnalysis.hasBulb && (
                  <div className="phys-result-item"><label>Bulb</label>
                    <b style={{ color: circAnalysis.bulbBrightness > 0 ? "#ffe060" : "#6080a0" }}>
                      {circAnalysis.bulbBrightness > 0 ? `ON (${(circAnalysis.bulbBrightness * 100).toFixed(0)}%)` : "OFF"}
                    </b>
                  </div>
                )}
                {circAnalysis.paths > 1 && (
                  <div className="phys-result-item"><label>Paths</label><b>{circAnalysis.paths} parallel</b></div>
                )}
              </div>
            )}
            {!circAnalysis.hasBattery && (
              <p style={{ fontSize: 12, color: "#6080a0", textAlign: "center", margin: "12px 0" }}>
                Place a battery to power the circuit
              </p>
            )}
            <p style={{ fontSize: 11, color: "#5a7a9a", margin: "6px 0 0" }}>
              Ohm's law: V = IR. Resistors in one row = series. Resistors across rows = parallel paths.
            </p>
          </div>
          {renderQuiz("circuit", CIRCUIT_QUIZ)}
        </div>
      )}

      {/* ══ Energy Station ══ */}
      {energyOpen && (
        <div className="phys-panel phys-ui" onClick={(e) => e.stopPropagation()}>
          <div className="phys-panel-bar">
            <b>⚡ Energy Conservation</b>
            <button className="phys-x" onClick={() => setEnergyOpen(false)}>x</button>
          </div>
          <div className="phys-panel-body">
            <div className="phys-machines-tabs">
              {ENERGY_SCENARIOS.map((s) => (
                <button key={s.id} className={`phys-chip${energyScenario.id === s.id ? " on" : ""}`}
                  onClick={() => { setEnergyScenario(s); setEnergyHeight(s.height); markPreset(s.id); setTotalExperiments((n) => n + 1);
                    addLog("energy-table", "⚡", s.name, { mass: `${s.mass} kg`, height: `${s.height} m` }, `Total E = ${totalEnergy(s.mass, s.height, s.speed).toFixed(0)} J`); }}>
                  {s.name}
                </button>
              ))}
            </div>
            <p>{energyScenario.description}</p>
            <div className="phys-controls">
              <label>
                Height: <b>{energyHeight.toFixed(1)} m</b>
                <input type="range" min={0} max={energyScenario.height} step={0.1} value={energyHeight}
                  onChange={(e) => setEnergyHeight(+e.target.value)} />
              </label>
            </div>
            <div className="phys-graph">{energyBarSvg}</div>
            <p style={{ fontSize: 12, color: "#6080a0" }}>
              As the object falls from {energyScenario.height} m, potential energy converts to kinetic energy.
              Speed at this height: {fallSpeed(energyScenario.height - energyHeight).toFixed(1)} m/s
            </p>
          </div>
          {renderQuiz("energy", ENERGY_QUIZ)}
        </div>
      )}

      {/* ══ Wave Tank ══ */}
      {waveOpen && (
        <div className="phys-panel phys-ui" onClick={(e) => e.stopPropagation()}>
          <div className="phys-panel-bar">
            <b>🌊 Wave Tank</b>
            <button className="phys-x" onClick={() => setWaveOpen(false)}>x</button>
          </div>
          <div className="phys-panel-body">
            <div className="phys-machines-tabs">
              {WAVE_PRESETS.map((w) => (
                <button key={w.id} className={`phys-chip${wavePreset.id === w.id ? " on" : ""}`}
                  onClick={() => { setWavePreset(w); setWaveFreq(w.frequency); setWaveAmp(w.amplitude); setWaveLambda(w.wavelength); markPreset(w.id); setTotalExperiments((n) => n + 1);
                    addLog("wave-wall", "🌊", w.name, { f: `${w.frequency} Hz`, lambda: `${w.wavelength}` }, `v = ${waveSpeed(w.frequency, w.wavelength).toFixed(0)} units/s`); }}>
                  {w.name}
                </button>
              ))}
            </div>
            <div className="phys-controls">
              <label>Frequency: <b>{waveFreq} Hz</b>
                <input type="range" min={0.5} max={15} step={0.5} value={waveFreq} onChange={(e) => setWaveFreq(+e.target.value)} />
              </label>
              <label>Amplitude: <b>{waveAmp} px</b>
                <input type="range" min={5} max={60} value={waveAmp} onChange={(e) => setWaveAmp(+e.target.value)} />
              </label>
              <label>Wavelength: <b>{waveLambda} units</b>
                <input type="range" min={20} max={300} value={waveLambda} onChange={(e) => setWaveLambda(+e.target.value)} />
              </label>
            </div>
            <div className="phys-wave-box">{waveSvg}</div>
            <div style={{ display: "flex", justifyContent: "center", margin: "6px 0" }}>
              <button className="phys-interact" onClick={() => { if (wavePlaying) stopWaveAnim(); else startWaveAnim(); }}>
                {wavePlaying ? "Pause" : "Play"}
              </button>
            </div>
            <div className="phys-result">
              <div className="phys-result-item"><label>Speed (v = f x lambda)</label><b>{wSpeed.toFixed(0)} units/s</b></div>
              <div className="phys-result-item"><label>Period (1/f)</label><b>{(1 / waveFreq).toFixed(2)} s</b></div>
            </div>
          </div>
          {renderQuiz("wave", WAVE_QUIZ)}
        </div>
      )}

      {/* ══ Pendulum Lab ══ */}
      {pendulumOpen && (
        <div className="phys-panel phys-ui" onClick={(e) => e.stopPropagation()}>
          <div className="phys-panel-bar">
            <b>🕐 Pendulum Lab</b>
            <button className="phys-x" onClick={() => setPendulumOpen(false)}>x</button>
          </div>
          <div className="phys-panel-body">
            <div className="phys-machines-tabs">
              {PENDULUM_PRESETS.map((p) => (
                <button key={p.id} className={`phys-chip${pendLength === p.length && pendAngle === p.angle ? " on" : ""}`}
                  onClick={() => { setPendLength(p.length); setPendAngle(p.angle); markPreset(p.id); setTotalExperiments((n) => n + 1);
                    addLog("pendulum-corner", "🕐", p.name, { L: `${p.length} m`, angle: `${p.angle} deg` }, `T = ${pendulumPeriod(p.length).toFixed(3)} s`); }}>
                  {p.name}
                </button>
              ))}
            </div>
            <div className="phys-controls">
              <label>Length: <b>{pendLength.toFixed(1)} m</b>
                <input type="range" min={0.1} max={5} step={0.1} value={pendLength} onChange={(e) => setPendLength(+e.target.value)} />
              </label>
              <label>Initial angle: <b>{pendAngle} degrees</b>
                <input type="range" min={5} max={80} value={pendAngle} onChange={(e) => setPendAngle(+e.target.value)} />
              </label>
            </div>
            <div className="phys-pendulum-box">
              <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
                <line x1="100" y1="10" x2="100" y2="10" stroke="#6090c0" strokeWidth="4" />
                <line ref={pendRodRef} x1="100" y1="10" x2={100 + Math.sin((pendAngle * Math.PI) / 180) * 120}
                  y2={10 + Math.cos((pendAngle * Math.PI) / 180) * 120}
                  stroke="#a0c0e0" strokeWidth="2" />
                <circle ref={pendBobRef} cx={100 + Math.sin((pendAngle * Math.PI) / 180) * 120}
                  cy={10 + Math.cos((pendAngle * Math.PI) / 180) * 120}
                  r="12" fill="#4090e0" />
                <line x1="100" y1="10" x2="100" y2={10 + 120} stroke="rgba(100,150,220,.2)" strokeWidth="1" strokeDasharray="4" />
                <rect x="80" y="6" width="40" height="8" fill="#6080a0" rx="2" />
              </svg>
            </div>
            <div style={{ display: "flex", justifyContent: "center", margin: "6px 0" }}>
              <button className="phys-interact" onClick={() => { if (pendSwinging) { stopAnim("pend"); setPendSwinging(false); } else startPendAnim(); }}>
                {pendSwinging ? "Stop" : "Swing!"}
              </button>
            </div>
            <div className="phys-result">
              <div className="phys-result-item"><label>Period</label><b>{pPeriod.toFixed(3)} s</b></div>
              <div className="phys-result-item"><label>Frequency</label><b>{pFreq.toFixed(3)} Hz</b></div>
            </div>
            <p style={{ fontSize: 12, color: "#6080a0" }}>
              T = 2pi sqrt(L/g). Period depends only on length and gravity, not mass or amplitude (for small angles).
            </p>
          </div>
          {renderQuiz("pendulum", PENDULUM_QUIZ)}
        </div>
      )}

      {/* ══ Friction Ramp ══ */}
      {slopeOpen && (
        <div className="phys-panel phys-ui" onClick={(e) => e.stopPropagation()}>
          <div className="phys-panel-bar">
            <b>📐 Friction Ramp</b>
            <button className="phys-x" onClick={() => setSlopeOpen(false)}>x</button>
          </div>
          <div className="phys-panel-body">
            <div className="phys-machines-tabs">
              {SLOPE_PRESETS.map((s) => (
                <button key={s.id} className={`phys-chip${slopePreset.id === s.id ? " on" : ""}`}
                  onClick={() => { setSlopePreset(s); setSlopeMass(s.mass); setSlopeAngle(s.angle); setSlopeMu(s.mu); markPreset(s.id); setTotalExperiments((n) => n + 1);
                    const f = slopeForces(s.mass, s.angle, s.mu);
                    addLog("slope-corner", "📐", s.name, { mass: `${s.mass} kg`, angle: `${s.angle} deg`, mu: `${s.mu}` }, f.slides ? `Slides! a=${f.accel.toFixed(2)} m/s2` : "Stays put"); }}>
                  {s.name}
                </button>
              ))}
            </div>
            <div className="phys-controls">
              <label>Mass: <b>{slopeMass} kg</b>
                <input type="range" min={1} max={20} value={slopeMass} onChange={(e) => setSlopeMass(+e.target.value)} />
              </label>
              <label>Angle: <b>{slopeAngle} degrees</b>
                <input type="range" min={5} max={80} value={slopeAngle} onChange={(e) => setSlopeAngle(+e.target.value)} />
              </label>
              <label>Friction (mu): <b>{slopeMu.toFixed(2)}</b>
                <input type="range" min={0} max={1} step={0.01} value={slopeMu} onChange={(e) => setSlopeMu(+e.target.value)} />
              </label>
            </div>
            <div className="phys-slope-box">{slopeSvg}</div>
            {sForces.slides && (
              <div style={{ display: "flex", justifyContent: "center", margin: "6px 0" }}>
                <button className="phys-interact" onClick={startSlopeAnim} disabled={slopePlaying}>
                  {slopePlaying ? "Sliding..." : "Release!"}
                </button>
              </div>
            )}
            <div className="phys-force-list">
              <span>Weight:</span><b>{sForces.weight.toFixed(1)} N</b>
              <span>Normal force:</span><b>{sForces.normal.toFixed(1)} N</b>
              <span>Gravity along slope:</span><b>{sForces.parallel.toFixed(1)} N</b>
              <span>Friction force:</span><b>{sForces.friction.toFixed(1)} N</b>
              <span>Net force:</span><b>{sForces.net.toFixed(1)} N</b>
              <span>Acceleration:</span><b>{sForces.accel.toFixed(2)} m/s2</b>
            </div>
            <div className={`phys-verdict ${sForces.slides ? "slides" : "stays"}`}>
              {sForces.slides ? "The object slides!" : "Friction holds it in place."}
            </div>
          </div>
          {renderQuiz("slope", SLOPE_QUIZ)}
        </div>
      )}

      {/* ══ Collision Lab ══ */}
      {collisionOpen && (
        <div className="phys-panel phys-ui" onClick={(e) => e.stopPropagation()}>
          <div className="phys-panel-bar">
            <b>💥 Collision Lab</b>
            <button className="phys-x" onClick={() => setCollisionOpen(false)}>x</button>
          </div>
          <div className="phys-panel-body">
            <div className="phys-machines-tabs">
              {COLLISION_PRESETS.map((p) => (
                <button key={p.id} className={`phys-chip${collPreset.id === p.id ? " on" : ""}`}
                  onClick={() => {
                    setCollPreset(p); setCollMassA(p.massA); setCollMassB(p.massB);
                    setCollSpeedA(p.speedA); setCollSpeedB(p.speedB); setCollType(p.type);
                    setCollResult(null); markPreset(p.id);
                  }}>
                  {p.name}
                </button>
              ))}
            </div>
            <p style={{ fontSize: 13, color: "#90b0c8" }}>{collPreset.description}</p>
            <div className="phys-controls">
              <label>Mass A: <b>{collMassA} kg</b>
                <input type="range" min={1} max={20} value={collMassA} onChange={(e) => setCollMassA(+e.target.value)} />
              </label>
              <label>Speed A: <b>{collSpeedA} m/s</b>
                <input type="range" min={-10} max={10} value={collSpeedA} onChange={(e) => setCollSpeedA(+e.target.value)} />
              </label>
              <label>Mass B: <b>{collMassB} kg</b>
                <input type="range" min={1} max={20} value={collMassB} onChange={(e) => setCollMassB(+e.target.value)} />
              </label>
              <label>Speed B: <b>{collSpeedB} m/s</b>
                <input type="range" min={-10} max={10} value={collSpeedB} onChange={(e) => setCollSpeedB(+e.target.value)} />
              </label>
            </div>
            <div style={{ display: "flex", gap: 8, margin: "10px 0" }}>
              <button className={`phys-chip${collType === "elastic" ? " on" : ""}`} onClick={() => { setCollType("elastic"); setCollResult(null); }}>Elastic</button>
              <button className={`phys-chip${collType === "inelastic" ? " on" : ""}`} onClick={() => { setCollType("inelastic"); setCollResult(null); }}>Inelastic</button>
            </div>
            <button className="phys-interact" disabled={collAnimating} onClick={() => {
              const res = collType === "elastic"
                ? elasticCollision(collMassA, collSpeedA, collMassB, collSpeedB)
                : inelasticCollision(collMassA, collSpeedA, collMassB, collSpeedB);
              const result = "v1f" in res ? res : { v1f: 0, vf: res.vf };
              setCollResult(result);
              setCollisionsDone((n) => n + 1);
              setTotalExperiments((n) => n + 1);
              const pBefore = momentum(collMassA, collSpeedA) + momentum(collMassB, collSpeedB);
              addLog("collision-bench", "💥", `${collType} collision`,
                { "mA": `${collMassA} kg`, "vA": `${collSpeedA} m/s`, "mB": `${collMassB} kg`, "vB": `${collSpeedB} m/s` },
                `p = ${pBefore.toFixed(1)} kg m/s`);
              if (soundOn) playSuccess();
              startCollAnim(result);
            }}>{collAnimating ? "Colliding..." : "Collide!"}</button>
            {collResult && (
              <div className="phys-result" style={{ marginTop: 10 }}>
                <div className="phys-result-item"><label>p before</label><b>{(momentum(collMassA, collSpeedA) + momentum(collMassB, collSpeedB)).toFixed(1)} kg m/s</b></div>
                {collResult.vf !== undefined ? (
                  <>
                    <div className="phys-result-item"><label>Combined speed</label><b>{collResult.vf.toFixed(2)} m/s</b></div>
                    <div className="phys-result-item"><label>p after</label><b>{((collMassA + collMassB) * collResult.vf).toFixed(1)} kg m/s</b></div>
                  </>
                ) : (
                  <>
                    <div className="phys-result-item"><label>A final</label><b>{collResult.v1f.toFixed(2)} m/s</b></div>
                    {collResult.v2f !== undefined && <div className="phys-result-item"><label>B final</label><b>{collResult.v2f.toFixed(2)} m/s</b></div>}
                    <div className="phys-result-item"><label>p after</label><b>{(collMassA * collResult.v1f + collMassB * (collResult.v2f ?? 0)).toFixed(1)} kg m/s</b></div>
                  </>
                )}
              </div>
            )}
            {/* Animated collision scene */}
            <div className="phys-graph" style={{ marginTop: 10 }}>
              <svg viewBox="0 0 400 60" xmlns="http://www.w3.org/2000/svg">
                <line x1="0" y1="50" x2="400" y2="50" stroke="rgba(100,150,220,.15)" strokeWidth="1" />
                <rect ref={collBlockARef} x={40} y={20} width={40} height={28} fill="#4090e0" rx="4" />
                <text x={60} y={38} fill="#fff" fontSize="9" textAnchor="middle" pointerEvents="none">{collMassA}kg</text>
                <rect ref={collBlockBRef} x={320} y={20} width={40} height={28} fill="#e08060" rx="4" />
                <text x={340} y={38} fill="#fff" fontSize="9" textAnchor="middle" pointerEvents="none">{collMassB}kg</text>
                <circle ref={collFlashRef} cx="200" cy="34" r="12" fill="#fff" style={{ opacity: 0 }} />
              </svg>
            </div>
            {collResult && !collAnimating && (
              <div className="phys-result" style={{ marginTop: 4, fontSize: 11, color: "#6090b0", textAlign: "center" }}>
                {collResult.vf !== undefined
                  ? <span>Merged at {collResult.vf.toFixed(1)} m/s</span>
                  : <span>A: {collResult.v1f.toFixed(1)} m/s, B: {(collResult.v2f ?? 0).toFixed(1)} m/s</span>}
              </div>
            )}
          </div>
          {renderQuiz("momentum", MOMENTUM_QUIZ)}
        </div>
      )}

      {/* ══ Experiment Notebook ══ */}
      {logOpen && (
        <div className="phys-panel phys-ui" onClick={(e) => e.stopPropagation()}>
          <div className="phys-panel-bar">
            <b>📓 Experiment Notebook</b>
            <button className="phys-x" onClick={() => setLogOpen(false)}>x</button>
          </div>
          <div className="phys-panel-body">
            {log.length === 0 ? (
              <p style={{ color: "#5070a0", textAlign: "center", padding: "20px 0" }}>No experiments recorded yet. Interact with stations to fill your notebook.</p>
            ) : (
              log.map((entry) => (
                <div key={entry.id} className="phys-law-card" style={{ marginBottom: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 18 }}>{entry.icon}</span>
                    <b style={{ flex: 1, fontSize: 13 }}>{entry.label}</b>
                    <span style={{ fontSize: 11, color: "#5070a0" }}>{new Date(entry.time).toLocaleTimeString()}</span>
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 6 }}>
                    {Object.entries(entry.params).map(([k, v]) => (
                      <span key={k} className="phys-chip" style={{ fontSize: 11, padding: "3px 8px", cursor: "default" }}>{k}: {v}</span>
                    ))}
                  </div>
                  <p style={{ margin: "4px 0 0", fontSize: 12, color: "#80c0ff" }}>{entry.result}</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ══ Badges ══ */}
      {badgesOpen && (
        <div className="phys-panel phys-ui" onClick={(e) => e.stopPropagation()}>
          <div className="phys-panel-bar">
            <b>🏅 Badges & Progress</b>
            <button className="phys-x" onClick={() => setBadgesOpen(false)}>x</button>
          </div>
          <div className="phys-panel-body">
            <p style={{ fontSize: 13 }}>Stations: {visitedCount}/{totalStations} visited &middot; Experiments: {totalExperiments} &middot; Badges: {earnedBadges.length}/{PHYSICS_ACHIEVEMENTS.length}</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 10 }}>
              {PHYSICS_ACHIEVEMENTS.map((a) => {
                const earned = a.check(achCtx);
                return (
                  <div key={a.id} className="phys-info-card" style={{ opacity: earned ? 1 : 0.5, textAlign: "center" }}>
                    <span style={{ fontSize: 24 }}>{earned ? a.icon : "🔒"}</span>
                    <b style={{ display: "block", fontSize: 12, marginTop: 4, color: earned ? "#a0d0ff" : "#5070a0" }}>{a.title}</b>
                    <span style={{ fontSize: 11, color: "#6080a0" }}>{a.description}</span>
                    {!earned && a.progress && <span style={{ display: "block", fontSize: 11, color: "#4070a0", marginTop: 2 }}>{a.progress(achCtx)}</span>}
                  </div>
                );
              })}
            </div>
            <h4 style={{ margin: "16px 0 8px", fontSize: 13, color: "#6090b0" }}>Stations</h4>
            <div className="phys-result" style={{ gridTemplateColumns: "1fr" }}>
              {STATIONS.map((s) => (
                <div key={s.id} className="phys-result-item" style={{ textAlign: "left", display: "flex", gap: 8, alignItems: "center" }}>
                  <span style={{ fontSize: 18 }}>{s.icon}</span>
                  <span style={{ flex: 1, color: visited.has(s.id) ? "#a0d0ff" : "#5070a0" }}>{s.label}</span>
                  {visited.has(s.id) && <span style={{ color: "#60c0ff" }}>done</span>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Badge toast */}
      {newBadge && (
        <div className="phys-badge-toast">
          <span style={{ fontSize: 28 }}>{newBadge.icon}</span>
          <div>
            <b style={{ color: "#80c0ff", fontSize: 14 }}>Badge earned!</b>
            <span style={{ display: "block", fontSize: 13, color: "#a0d0ff" }}>{newBadge.title}</span>
          </div>
        </div>
      )}

      {/* ── Dock ── */}
      <div className="phys-dock">
        <div className="phys-dock-tabs">
          {(["core", "experiments", "analysis"] as const).map((tab) => (
            <button key={tab} className={`phys-dock-tab${dockTab === tab ? " active" : ""}`}
              onClick={() => setDockTab(tab)}>
              {tab === "core" ? "Core" : tab === "experiments" ? "Experiments" : "Analysis"}
            </button>
          ))}
        </div>
        <div className="phys-dock-row">
          {dockButtons[dockTab].map((btn) => (
            <button key={btn.id}
              className={`phys-station${(machinesOpen && btn.id === "machines-bench") || (newtonOpen && btn.id === "newton-bench") || (projectileOpen && btn.id === "projectile-bench") || (circuitOpen && btn.id === "circuit-table") || (energyOpen && btn.id === "energy-table") || (waveOpen && btn.id === "wave-wall") || (pendulumOpen && btn.id === "pendulum-corner") || (slopeOpen && btn.id === "slope-corner") || (collisionOpen && btn.id === "collision-bench") || (reading === btn.id) ? " active" : ""}`}
              onClick={() => openStation(btn.id)}>
              {btn.icon} {btn.label}
              {visited.has(btn.id) && <span className="check">done</span>}
            </button>
          ))}
          <button className={`phys-station${logOpen ? " active" : ""}`} onClick={() => { closeAll(); setLogOpen(true); }}>
            📓 Notebook {log.length > 0 && <span className="check">{log.length}</span>}
          </button>
          <button className={`phys-station${badgesOpen ? " active" : ""}`} onClick={() => { closeAll(); setBadgesOpen(true); }}>
            🏅 Badges {earnedBadges.length > 0 && <span className="check">{earnedBadges.length}</span>}
          </button>
        </div>
      </div>
    </div>
  );
}
