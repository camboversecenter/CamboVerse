import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { XR } from "@react-three/xr";
import { useLabVR, LabVRButton, LabVRRig } from './LabVR';
import { ACESFilmicToneMapping } from "three";
import { ExperienceRoomScene, STATIONS } from "./ExperienceRoomScene";
import { WalkControls } from "./WalkControls";
import type { WalkInput } from "./FirstPersonControls";
import {
  REAGENTS, RECIPES, PRODUCT_IDS, findRecipe, partnersOf, recipesFor, reagentById, unitFor,
  computeMix, type Recipe, type MixResult,
  ACHIEVEMENTS, type AchievementCtx, type Achievement,
  SAFETY_QUIZ, type QuizQuestion,
  FLAME_TESTS, type FlameTestEntry,
  ELECTROLYSIS_SETUPS,
  MYSTERY_CHALLENGES,
  PT_ELEMENTS, type PTElement,
  GAS_LAW_PRESETS, R_CONST,
  CHROM_SAMPLES,
  DISTILLATION_MIXES,
  FLAME_QUIZ, ELECTRO_QUIZ, CHROM_QUIZ, DISTILL_QUIZ, MYSTERY_QUIZ, CALO_QUIZ, GAS_QUIZ, COLLISION_QUIZ,
  LAB_PROCEDURES, type LabProcedure,
  SPEED_TRIALS, type SpeedTrial,
  PH_INDICATORS, type PhIndicator, indicatorColor, PH_SCALE_COLORS, PH_QUIZ,
  TITRATION_SETUPS, type TitrationSetup, titrationPH, TITRATION_QUIZ,
  RATE_SCENARIOS, type RateScenario, rateConcentration, RATE_QUIZ,
  MOLARITY_PRESETS, type MolarityPreset, calcMolarity, calcMassNeeded, calcDilution, MOLARITY_QUIZ,
  CALO_EXPERIMENTS, type CaloExperiment, caloTempCurve,
  electronConfiguration, electronConfigString, shellElectrons, ELECTRON_QUIZ,
} from "../chemistry";
import { SPECIMENS, type LabLayer } from "../lab";
import { InRoomDetail } from "./InRoomDetail";
import "./InRoomDetail.css";
import type { Detail } from "./LabOrgans";
import { playPour, playFizz, playFlame, playClink, playBubbles, playDrip, playSuccess, playError, playElectricHum, playFootstep, startAmbient, stopAmbient, setChemMuted } from "../lib/chemSound";

interface LogEntry {
  id: number;
  a: string;
  b: string;
  c?: string;
  d?: string;
  amountA: number;
  amountB: number;
  amountC?: number;
  amountD?: number;
  recipe: Recipe | null;
  mixResult: MixResult | null;
  time: number;
}

export interface ModelView {
  layer: LabLayer;
  knob: number;
  spin: boolean;
}
import "./ExperienceRoom.css";

function detectUltra(): boolean {
  if (typeof navigator === "undefined") return true;
  const cores = navigator.hardwareConcurrency ?? 4;
  const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 4;
  const small = typeof window !== "undefined" && Math.min(window.screen.width, window.screen.height) < 500;
  return cores > 4 && mem > 3 && !small;
}

type ControlMode = 'phone' | 'pc' | 'vr';
function detectControlMode(): ControlMode {
  if (typeof window === 'undefined') return 'pc';
  const small = Math.min(window.screen.width, window.screen.height) < 600;
  const touch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  return small && touch ? 'phone' : 'pc';
}

export function ExperienceRoom({
  onBack, onOpenSpecimen,
}: {
  onBack: () => void;
  onOpenSpecimen: (id: string) => void;
}) {
  const vr = useLabVR();
  const store = vr.store;
  const walkInput = useRef<WalkInput>({ move: { x: 0, y: 0 }, look: { dx: 0, dy: 0 } });
  const [preferredUltra, setUltra] = useState(detectUltra);
  const ultra = preferredUltra || vr.active;
  const [nearStation, setNearStation] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(true);
  const [showPromptDismissed, setShowPromptDismissed] = useState(false);
  const [locked, setLocked] = useState(false);
  const roomRef = useRef<HTMLDivElement>(null);
  const [controlMode, setControlMode] = useState<ControlMode>(detectControlMode);
  const isTouch = controlMode === 'phone';

  /** Bench state: up to four reagents picked, and what is currently reacting. */
  const [slotA, setSlotA] = useState<string | null>(null);
  const [slotB, setSlotB] = useState<string | null>(null);
  const [slotC, setSlotC] = useState<string | null>(null);
  const [slotD, setSlotD] = useState<string | null>(null);
  const [amountA, setAmountA] = useState(10);
  const [amountB, setAmountB] = useState(10);
  const [amountC, setAmountC] = useState(10);
  const [amountD, setAmountD] = useState(10);
  const filledSlots = [slotA, slotB, slotC, slotD].filter(Boolean) as string[];
  const [running, setRunning] = useState<Recipe | null>(null);
  const [result, setResult] = useState<Recipe | "none" | null>(null);
  const [lastMix, setLastMix] = useState<MixResult | null>(null);
  const [benchOpen, setBenchOpen] = useState(false);
  const [benchMinimized, setBenchMinimized] = useState(false);
  const [shelfFilter, setShelfFilter] = useState("");
  const [prediction, setPrediction] = useState<string | null>(null);
  const [predictionRevealed, setPredictionRevealed] = useState(false);
  const [logOpen, setLogOpen] = useState(false);
  const [log, setLog] = useState<LogEntry[]>([]);
  const logIdRef = useRef(0);
  /** Which station's write-up is being read, in-room. */
  const [reading, setReading] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [discovered, setDiscovered] = useState<string[]>([]);
  const [unlocked, setUnlocked] = useState<Set<string>>(new Set());

  /** Phase 1 feature state */
  const [quizPassed, setQuizPassed] = useState(false);
  const [quizOpen, setQuizOpen] = useState(false);
  const [quizStep, setQuizStep] = useState(0);
  const [quizScore, setQuizScore] = useState(0);
  const [quizAnswer, setQuizAnswer] = useState<number | null>(null);
  const [perfectStoich, setPerfectStoich] = useState(0);
  const [precipitateCount, setPrecipitateCount] = useState(0);
  const [combustionCount, setCombustionCount] = useState(0);
  const [endoDone, setEndoDone] = useState(false);
  const [totalMixes, setTotalMixes] = useState(0);
  const [newBadge, setNewBadge] = useState<Achievement | null>(null);
  const [badgesOpen, setBadgesOpen] = useState(false);
  const [sdsOpen, setSdsOpen] = useState<string | null>(null);
  const [phTarget, setPhTarget] = useState<string | null>(null);
  const [phOpen, setPhOpen] = useState(false);
  const [phIndicator, setPhIndicator] = useState<PhIndicator>(PH_INDICATORS[0]);
  const [titOpen, setTitOpen] = useState(false);
  const [titSetup, setTitSetup] = useState<TitrationSetup>(TITRATION_SETUPS[0]);
  const [titAdded, setTitAdded] = useState(0);
  const [titDropping, setTitDropping] = useState(false);
  const [titCurve, setTitCurve] = useState<{ vol: number; pH: number }[]>([]);
  const [rateOpen, setRateOpen] = useState(false);
  const [rateScenario, setRateScenario] = useState<RateScenario>(RATE_SCENARIOS[0]);
  const [rateTime, setRateTime] = useState(0);
  const [ratePlaying, setRatePlaying] = useState(false);
  const [molOpen, setMolOpen] = useState(false);
  const [molPreset, setMolPreset] = useState<MolarityPreset>(MOLARITY_PRESETS[0]);
  const [molMode, setMolMode] = useState<"molarity" | "dilution">("molarity");
  const [molMass, setMolMass] = useState(10);
  const [molVol, setMolVol] = useState(0.5);
  const [dilC1, setDilC1] = useState(2);
  const [dilV1, setDilV1] = useState(25);
  const [dilC2, setDilC2] = useState(0.5);
  const [econfOpen, setEconfOpen] = useState(false);
  const [econfZ, setEconfZ] = useState(1);
  const [caloExp, setCaloExp] = useState<CaloExperiment | null>(null);
  const [caloSimData, setCaloSimData] = useState<number[]>([]);
  const [caloSimStep, setCaloSimStep] = useState(0);
  const [caloSimPlaying, setCaloSimPlaying] = useState(false);
  const [energyOpen, setEnergyOpen] = useState(false);

  /** Phase 2 state */
  const [flameOpen, setFlameOpen] = useState(false);
  const [flameSelected, setFlameSelected] = useState<FlameTestEntry | null>(null);
  const [electroOpen, setElectroOpen] = useState(false);
  const [electroSetup, setElectroSetup] = useState(0);
  const [electroRunning, setElectroRunning] = useState(false);
  const [mysteryOpen, setMysteryOpen] = useState(false);
  const [mysteryIdx, setMysteryIdx] = useState(0);
  const [mysteryGuess, setMysteryGuess] = useState<string | null>(null);
  const [mysterySolved, setMysterySolved] = useState<Set<string>>(new Set());
  const [ptOpen, setPtOpen] = useState(false);
  const [ptSelected, setPtSelected] = useState<PTElement | null>(null);
  const [caloOpen, setCaloOpen] = useState(false);
  const [caloData, setCaloData] = useState<number[]>([]);

  /** Phase 3 state */
  const [gasOpen, setGasOpen] = useState(false);
  const [gasP, setGasP] = useState(1);
  const [gasV, setGasV] = useState(22.4);
  const [gasT, setGasT] = useState(273);
  const [gasN, setGasN] = useState(1);
  const [gasLock, setGasLock] = useState<"P" | "V" | "T">("V");
  const [chromOpen, setChromOpen] = useState(false);
  const [chromSample, setChromSample] = useState(0);
  const [chromRunning, setChromRunning] = useState(false);
  const [chromProgress, setChromProgress] = useState(0);
  const [distOpen, setDistOpen] = useState(false);
  const [distMix, setDistMix] = useState(0);
  const [distTemp, setDistTemp] = useState(20);
  const [distCollected, setDistCollected] = useState<string[]>([]);
  const [collisionOpen, setCollisionOpen] = useState(false);
  const [collisionTemp, setCollisionTemp] = useState(300);
  const [collisionConc, setCollisionConc] = useState(50);

  const gasParticles = useMemo(() => Array.from({ length: 20 }, () => ({ x: 10 + Math.random() * 80, y: 10 + Math.random() * 80 })), []);
  const collisionParticles = useMemo(() => Array.from({ length: 100 }, () => ({ x: 5 + Math.random() * 90, y: 5 + Math.random() * 90, delay: Math.random() * 2 })), []);

  const [expQuiz, setExpQuiz] = useState<Record<string, Record<number, number>>>({});
  const [soundOn, setSoundOn] = useState(false);
  useEffect(() => { setChemMuted(true); }, []);
  const [visited, setVisited] = useState<Set<string>>(new Set());
  const markVisited = useCallback((id: string) => setVisited(s => s.has(id) ? s : new Set([...s, id])), []);

  /** Guided lab procedure */
  const [labOpen, setLabOpen] = useState(false);
  const [labProc, setLabProc] = useState<LabProcedure>(LAB_PROCEDURES[0]);
  const [labStep, setLabStep] = useState(0);
  const [labDone, setLabDone] = useState(false);

  /** Reaction speed comparison */
  const [raceOpen, setRaceOpen] = useState(false);
  const [raceTrial, setRaceTrial] = useState<SpeedTrial>(SPEED_TRIALS[0]);
  const [raceRunning, setRaceRunning] = useState(false);
  const [raceProgressA, setRaceProgressA] = useState(0);
  const [raceProgressB, setRaceProgressB] = useState(0);
  const [raceFinished, setRaceFinished] = useState(false);
  const [raceRevealed, setRaceRevealed] = useState(false);

  /** Station dock category tab */
  const [dockTab, setDockTab] = useState<"core" | "experiments" | "tools">("core");

  const achCtx = useMemo<AchievementCtx>(() => ({
    discovered: new Set(discovered),
    perfectStoich,
    totalMixes,
    quizPassed,
    precipitates: precipitateCount,
    combustions: combustionCount,
    endothermicDone: endoDone,
  }), [discovered, perfectStoich, totalMixes, quizPassed, precipitateCount, combustionCount, endoDone]);

  const earnedBadges = useMemo(
    () => ACHIEVEMENTS.filter((a) => a.check(achCtx)),
    [achCtx]
  );

  /** How each table's exhibit is being viewed. Kept per station - the layer and
   *  knob mean different things from one exhibit to the next, so one shared set
   *  of controls drives the other table's model into nonsense. */
  const [modelViews, setModelViews] = useState<Record<string, ModelView>>({});

  const views = useMemo(() => {
    const out: Record<string, ModelView> = {};
    for (const s of STATIONS) {
      if (!s.model) continue;
      const spec = SPECIMENS.find((x) => x.id === s.model!.id);
      out[s.id] = modelViews[s.id] ?? {
        layer: "whole",
        knob: spec?.knob?.value ?? 1,
        spin: true,
      };
    }
    return out;
  }, [modelViews]);

  const setView = useCallback((stationId: string, patch: Partial<ModelView>) => {
    setModelViews((v) => {
      const spec = SPECIMENS.find(
        (x) => x.id === STATIONS.find((s) => s.id === stationId)?.model?.id
      );
      const base = v[stationId] ?? { layer: "whole" as LabLayer, knob: spec?.knob?.value ?? 1, spin: true };
      return { ...v, [stationId]: { ...base, ...patch } };
    });
  }, []);

  /** Write-only channel into the render loop - starting a mix costs no re-render. */
  const mixCmd = useRef<Recipe | null>(null);

  const nearRef = useRef<string | null>(null);
  nearRef.current = nearStation;
  const station = nearStation ? STATIONS.find((s) => s.id === nearStation) ?? null : null;
  const readingStation = reading ? STATIONS.find((s) => s.id === reading) ?? null : null;

  const pending = findRecipe(...filledSlots);
  const hints = useMemo(
    () => filledSlots.length > 0 && !pending ? partnersOf(...filledSlots) : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [slotA, slotB, slotC, slotD, pending]
  );

  /** Put a reagent into the first free slot, or take it back out if it is
   *  already in one. */
  const pickReagent = useCallback((id: string) => {
    setResult(null);
    if (slotA === id) { setSlotA(null); return; }
    if (slotB === id) { setSlotB(null); return; }
    if (slotC === id) { setSlotC(null); return; }
    if (slotD === id) { setSlotD(null); return; }
    if (slotA === null) setSlotA(id);
    else if (slotB === null) setSlotB(id);
    else if (slotC === null) setSlotC(id);
    else if (slotD === null) setSlotD(id);
    else { setSlotA(id); setSlotB(null); setSlotC(null); setSlotD(null); }
  }, [slotA, slotB, slotC, slotD]);

  const clearBench = useCallback(() => {
    setSlotA(null);
    setSlotB(null);
    setSlotC(null);
    setSlotD(null);
    setAmountA(10);
    setAmountB(10);
    setAmountC(10);
    setAmountD(10);
    setResult(null);
    setLastMix(null);
    setPrediction(null);
    setPredictionRevealed(false);
  }, []);

  const pour = useCallback(() => {
    const r = findRecipe(...filledSlots);
    const entry: LogEntry = {
      id: ++logIdRef.current,
      a: slotA!, b: slotB!,
      ...(slotC ? { c: slotC, amountC } : {}),
      ...(slotD ? { d: slotD, amountD } : {}),
      amountA, amountB,
      recipe: r, mixResult: r ? computeMix(r, amountA, amountB, amountC, amountD) : null,
      time: Date.now(),
    };
    setLog((prev) => [entry, ...prev].slice(0, 50));
    setPredictionRevealed(true);
    if (!r) { setResult("none"); setLastMix(null); playClink(); return; }
    const mix = computeMix(r, amountA, amountB, amountC, amountD);
    setLastMix(mix);
    mixCmd.current = r;
    setResult(r);
    playPour();
    setTimeout(playFizz, 400);
    setTotalMixes((n) => n + 1);
    setDiscovered((d) => (d.includes(r.id) ? d : [...d, r.id]));
    if (r.products?.length) {
      setUnlocked((prev) => {
        const next = new Set(prev);
        for (const p of r.products!) next.add(p);
        return next.size === prev.size ? prev : next;
      });
    }
    if (mix.limiting === -1) setPerfectStoich((n) => n + 1);
    if (r.effect === "precipitate") setPrecipitateCount((n) => n + 1);
    if (r.effect === "combustion") setCombustionCount((n) => n + 1);
    if (r.id === "endothermic") setEndoDone(true);
    if (r.energy) setEnergyOpen(true);
    const startTemp = 25;
    const deltaT = r.heat > 0 ? r.heat * 40 : -20;
    const pts: number[] = [];
    for (let i = 0; i <= 20; i++) {
      const t = i / 20;
      const temp = startTemp + deltaT * (1 - Math.exp(-3 * t)) + (Math.random() - 0.5) * 0.5;
      pts.push(Math.round(temp * 10) / 10);
    }
    setCaloData(pts);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slotA, slotB, slotC, slotD, amountA, amountB, amountC, amountD]);

  const loadPreset = useCallback((p: [string, string]) => {
    setSlotA(p[0]);
    setSlotB(p[1]);
    setResult(null);
    setBenchOpen(true);
  }, []);

  const pickReagent3D = useCallback((id: string) => {
    pickReagent(id);
    setBenchOpen(true);
  }, [pickReagent]);

  const visibleReagents = useMemo(
    () => REAGENTS.filter((r) => !PRODUCT_IDS.has(r.id) || unlocked.has(r.id)),
    [unlocked],
  );


  // ── Pointer lock OR mouse-drag fallback for desktop ──────────
  const pointerLockSupported = useRef(true);
  const dragging = useRef(false);

  useEffect(() => {
    if (isTouch) return;
    const onChange = () => setLocked(!!document.pointerLockElement);
    const onMove = (e: MouseEvent) => {
      if (document.pointerLockElement) {
        walkInput.current.look.dx += e.movementX;
        walkInput.current.look.dy += e.movementY;
      } else if (dragging.current) {
        walkInput.current.look.dx += e.movementX;
        walkInput.current.look.dy += e.movementY;
      }
    };
    const onDown = (e: MouseEvent) => {
      if ((e.target as HTMLElement).closest(".xroom-ui")) return;
      if (!document.pointerLockElement) dragging.current = true;
    };
    const onUp = () => { dragging.current = false; };
    document.addEventListener("pointerlockchange", onChange);
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("mouseup", onUp);
    return () => {
      document.removeEventListener("pointerlockchange", onChange);
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("mouseup", onUp);
    };
  }, [isTouch]);

  const requestLock = useCallback(() => {
    if (isTouch || !pointerLockSupported.current || document.pointerLockElement) return;
    try {
      const p = roomRef.current?.requestPointerLock?.();
      if (p && typeof (p as Promise<void>).catch === "function") {
        (p as Promise<void>).catch(() => { pointerLockSupported.current = false; });
      }
    } catch {
      pointerLockSupported.current = false;
    }
  }, []);

  // ── Keyboard: WASD handled by FirstPersonControls; E = interact, Esc = unlock ──
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Escape") {
        setBenchOpen(false);
        setReading(null);
        return;
      }
      if (e.code !== "KeyE") return;
      const id = nearRef.current;
      if (!id) return;
      const st = STATIONS.find((s) => s.id === id);
      if (!st) return;
      if (st.kind === "mix") setBenchOpen(true);
      else if (st.id === "flame-corner") { setFlameOpen(true); markVisited("flame"); }
      else if (st.id === "distill-corner") { setDistOpen(true); markVisited("distill"); }
      else if (st.id === "analysis-wall") { setPtOpen(true); markVisited("pt"); }
      else setReading(st.id);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // ── Badge notification ───────────────────────────────────────
  const prevBadgesRef = useRef(earnedBadges.length);
  useEffect(() => {
    if (earnedBadges.length > prevBadgesRef.current) {
      const newest = earnedBadges[earnedBadges.length - 1];
      setNewBadge(newest);
      playSuccess();
      const t = setTimeout(() => setNewBadge(null), 3500);
      prevBadgesRef.current = earnedBadges.length;
      return () => clearTimeout(t);
    }
    prevBadgesRef.current = earnedBadges.length;
  }, [earnedBadges]);

  // ── Ambient soundtrack ───────────────────────────────────────
  useEffect(() => {
    if (!soundOn) return;
    startAmbient();
    return () => stopAmbient();
  }, [soundOn]);

  // ── Gas law solver ───────────────────────────────────────────
  const solveGas = useCallback((lock: "P" | "V" | "T", p: number, v: number, n: number, t: number) => {
    if (lock === "V") { setGasV(Math.round((n * R_CONST * t / p) * 100) / 100); }
    else if (lock === "P") { setGasP(Math.round((n * R_CONST * t / v) * 100) / 100); }
    else { setGasT(Math.round((p * v / (n * R_CONST)) * 10) / 10); }
  }, []);

  // ── Chromatography animation ────────────────────────────────
  useEffect(() => {
    if (!chromRunning) return;
    const id = setInterval(() => {
      setChromProgress((p) => {
        if (p >= 100) { setChromRunning(false); return 100; }
        return p + 2;
      });
    }, 100);
    return () => clearInterval(id);
  }, [chromRunning]);

  // ── Dismiss help ─────────────────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => setShowHelp(false), 6000);
    return () => clearTimeout(t);
  }, []);

  // ── Touch drag-to-look (non-joystick area) for mobile ───────
  const lookIdRef = useRef<number | null>(null);
  const lookLast = useRef({ x: 0, y: 0 });
  const onTouchDown = useCallback((e: React.PointerEvent) => {
    if (!isTouch) return;
    // Don't capture on UI buttons
    if ((e.target as HTMLElement).closest(".xroom-ui")) return;
    if (lookIdRef.current !== null) return;
    lookIdRef.current = e.pointerId;
    lookLast.current = { x: e.clientX, y: e.clientY };
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  }, []);
  const onTouchMove = useCallback((e: React.PointerEvent) => {
    if (e.pointerId !== lookIdRef.current) return;
    walkInput.current.look.dx += e.clientX - lookLast.current.x;
    walkInput.current.look.dy += e.clientY - lookLast.current.y;
    lookLast.current = { x: e.clientX, y: e.clientY };
  }, []);
  const onTouchUp = useCallback((e: React.PointerEvent) => {
    if (e.pointerId === lookIdRef.current) lookIdRef.current = null;
  }, []);

  // Prevent context menu inside the room
  useEffect(() => {
    const el = roomRef.current;
    if (!el) return;
    const block = (e: Event) => e.preventDefault();
    el.addEventListener("contextmenu", block);
    return () => el.removeEventListener("contextmenu", block);
  }, []);

  // Rate-of-reaction time animation
  useEffect(() => {
    if (!ratePlaying) return;
    const interval = setInterval(() => {
      setRateTime(t => {
        const next = t + 0.5;
        if (next >= rateScenario.xMax) { setRatePlaying(false); return rateScenario.xMax; }
        return next;
      });
    }, 50);
    return () => clearInterval(interval);
  }, [ratePlaying, rateScenario.xMax]);

  // Standalone calorimetry simulation
  useEffect(() => {
    if (!caloSimPlaying || caloSimData.length === 0) return;
    const interval = setInterval(() => {
      setCaloSimStep(s => {
        const next = s + 1;
        if (next >= caloSimData.length - 1) { setCaloSimPlaying(false); return caloSimData.length - 1; }
        return next;
      });
    }, 80);
    return () => clearInterval(interval);
  }, [caloSimPlaying, caloSimData.length]);

  const startRace = useCallback(() => {
    setRaceRunning(true);
    setRaceFinished(false);
    setRaceRevealed(false);
    setRaceProgressA(0);
    setRaceProgressB(0);
    const recipeA = findRecipe(...raceTrial.reactionA.inputs);
    const recipeB = findRecipe(...raceTrial.reactionB.inputs);
    const durA = recipeA ? recipeA.duration * 1000 : 4000;
    const durB = recipeB ? recipeB.duration * 1000 : 6000;
    const start = performance.now();
    const tick = () => {
      const elapsed = performance.now() - start;
      const pA = Math.min(1, elapsed / durA);
      const pB = Math.min(1, elapsed / durB);
      setRaceProgressA(pA);
      setRaceProgressB(pB);
      if (pA < 1 || pB < 1) {
        requestAnimationFrame(tick);
      } else {
        setRaceRunning(false);
        setRaceFinished(true);
      }
    };
    requestAnimationFrame(tick);
  }, [raceTrial]);

  const renderExpQuiz = (key: string, questions: QuizQuestion[]) => {
    const answers = expQuiz[key] ?? {};
    return <div className="xroom-exp-quiz">
      <b>Test yourself</b>
      {questions.map((item, qi) => {
        const given = answers[qi];
        const answered = given !== undefined;
        return <div key={qi} className="bio-detail-q">
          <p><b>{qi + 1}.</b> {item.question}</p>
          <div className="bio-detail-opts">
            {item.options.map((opt, oi) => {
              const cls = !answered ? '' : oi === item.correct ? 'right' : oi === given ? 'wrong' : '';
              return <button key={oi} className={cls} disabled={answered}
                onClick={() => { setExpQuiz(prev => ({ ...prev, [key]: { ...prev[key], [qi]: oi } })); oi === item.correct ? playSuccess() : playError(); }}>{opt}</button>;
            })}
          </div>
          {answered && <p className="bio-detail-why">{item.explanation}</p>}
        </div>;
      })}
    </div>;
  };

  return (
    <div
      className="xroom"
      ref={roomRef}
      onPointerDown={isTouch ? onTouchDown : undefined}
      onPointerMove={isTouch ? onTouchMove : undefined}
      onPointerUp={isTouch ? onTouchUp : undefined}
      onPointerCancel={isTouch ? onTouchUp : undefined}
    >
      {/* Full-screen canvas - click to lock mouse on desktop */}
      <div
        className="xroom-canvas"
        onClick={vr.active ? undefined : requestLock}
        style={detailId ? { visibility: 'hidden', position: 'absolute', width: 0, height: 0, overflow: 'hidden' } : undefined}
      >
        <Canvas
          dpr={ultra ? [1, 2] : [1, 1.5]}
          shadows={ultra}
          camera={{ fov: 65, near: 0.1, far: 50 }}
          gl={{ antialias: ultra, powerPreference: "high-performance" }}
          frameloop={detailId ? 'never' : 'always'}
          onCreated={({ gl }) => {
            gl.toneMapping = ACESFilmicToneMapping;
            gl.toneMappingExposure = 1.15;
          }}
        >
          <XR store={store}>
            <ExperienceRoomScene
              walkInput={walkInput}
              ultra={ultra}
              onNear={(id) => { setNearStation(id); setShowPromptDismissed(false); }}
              mixCmd={mixCmd}
              onMixChange={setRunning}
              slotA={slotA}
              slotB={slotB}
              slotC={slotC}
              slotD={slotD}
              views={views}
              discovered={discovered}
              onStep={playFootstep}
              onPickReagent={pickReagent3D}
              visibleReagents={visibleReagents}
            />
            <LabVRRig start={[0, 0, 2.5]} bounds={[-5.4, 5.4, -4.4, 4.4]} stations={STATIONS} />
          </XR>
        </Canvas>
      </div>

      {/* ── In-room detail overlay for chemistry specimens ── */}
      {detailId && <InRoomDetail key={detailId} specimenId={detailId}
        detail={(ultra ? 'ultra' : 'normal') as Detail}
        onClose={() => setDetailId(null)}
        onOpenSpecimen={onOpenSpecimen} />}

      {/* Mobile walk joystick */}
      {isTouch && <WalkControls input={walkInput} />}

      {/* ── Top bar (stops click propagation so it won't lock mouse) ── */}
      <div className="xroom-top xroom-ui" onClick={(e) => e.stopPropagation()}>
        <button className="backbtn" onClick={() => {
          if (document.pointerLockElement) document.exitPointerLock?.();
          onBack();
        }}>← Lab</button>
        <span className="xroom-title">🧪 Chemistry Experience Room</span>
        <div className="xroom-top-right">
          <button
            className="grove-quality"
            disabled={vr.active}
            onClick={() => setUltra((u) => !u)}
          >
            {ultra ? "✨ Ultra" : "🍃 Normal"}
          </button>
          <button
            className="grove-quality"
            onClick={() => { const next = !soundOn; setSoundOn(next); setChemMuted(!next); }}
          >
            {soundOn ? "🔊 Sound" : "🔇 Muted"}
          </button>
          <div className="xroom-mode-picker xroom-ui">
            <button className={`xroom-mode-btn${controlMode === 'phone' ? ' active' : ''}`}
              onClick={() => setControlMode('phone')}>📱 Phone</button>
            <button className={`xroom-mode-btn${controlMode === 'pc' ? ' active' : ''}`}
              onClick={() => setControlMode('pc')}>🖥️ PC</button>
            <LabVRButton vr={vr} />
          </div>
        </div>
      </div>

      {/* ── What's happening in the beaker right now ── */}
      {running && (
        <div className="xroom-reaction xroom-ui" onClick={(e) => e.stopPropagation()}>
          <div className="xroom-reaction-head">
            <b>{running.name}</b>
            <code>{running.equation}</code>
          </div>
          <p>{running.observation}</p>
          <div className="xroom-reaction-bar">
            <i style={{ animationDuration: `${running.duration}s` }} />
          </div>
        </div>
      )}

      {/* ── Walk-up prompt ── */}
      {station && !running && !benchOpen && !reading && !showPromptDismissed && (
        <div className="xroom-prompt xroom-ui" onClick={(e) => e.stopPropagation()}>
          <span className="xroom-prompt-icon">{station.icon}</span>
          <div className="xroom-prompt-info">
            <b>{station.label}</b>
            <span>{station.description}</span>
          </div>
          <div className="xroom-prompt-actions">
            <button
              className="xroom-interact"
              onClick={() => station.kind === "mix" ? setBenchOpen(true) : setReading(station.id)}
            >
              {station.kind === "mix"
                ? (isTouch ? "Open bench" : "Open bench (E)")
                : (isTouch ? "Read" : "Read (E)")}
            </button>
            <button className="xroom-interact ghost" onClick={() => setShowPromptDismissed(true)}>✕</button>
          </div>
        </div>
      )}

      {/* ══ THE MIXING BENCH - pick two reagents, pour, watch ══ */}
      {benchOpen && (
        <div className={`xroom-bench xroom-ui${benchMinimized ? " minimized" : ""}`} onClick={(e) => e.stopPropagation()}>
          <div className="xroom-bench-bar">
            <b>⚗️ Mixing station</b>
            <span className="xroom-bench-count">
              {discovered.length} of {RECIPES.length} reactions found
            </span>
            <button
              className="xroom-minimize"
              onClick={() => setBenchMinimized((m) => !m)}
              title={benchMinimized ? "Show panel" : "Hide panel - watch the reaction"}
            >
              {benchMinimized ? "▲ Show" : "▼ Hide"}
            </button>
            <button className="xroom-x" onClick={() => { setBenchOpen(false); setBenchMinimized(false); }}>✕</button>
          </div>

          {!benchMinimized && <>
          <div className="xroom-bench-body">
          {/* Reagent slots (2-4) */}
          <div className="xroom-slots">
            <Slot label="A" id={slotA} onClear={() => setSlotA(null)} />
            <span className="xroom-plus">+</span>
            <Slot label="B" id={slotB} onClear={() => setSlotB(null)} />
            {(slotC || (slotA && slotB)) && <>
              <span className="xroom-plus">+</span>
              <Slot label="C" id={slotC} onClear={() => setSlotC(null)} />
            </>}
            {(slotD || (slotA && slotB && slotC)) && <>
              <span className="xroom-plus">+</span>
              <Slot label="D" id={slotD} onClear={() => setSlotD(null)} />
            </>}
            <span className="xroom-arrow">→</span>
            <div className="xroom-outcome">
              {pending
                ? <code>{pending.equation.split("→")[1]?.trim()}</code>
                : <span className="xroom-outcome-q">?</span>}
            </div>
          </div>

          {/* Amount controls - visible when at least two slots are filled */}
          {slotA && slotB && (
            <div className="xroom-amounts">
              <AmountSlider id={slotA} value={amountA} onChange={setAmountA} />
              <AmountSlider id={slotB} value={amountB} onChange={setAmountB} />
              {slotC && <AmountSlider id={slotC} value={amountC} onChange={setAmountC} />}
              {slotD && <AmountSlider id={slotD} value={amountD} onChange={setAmountD} />}
              {pending && (
                <div className="xroom-ratio-hint">
                  Stoichiometric ratio: {pending.inputs.map((_, i) => (pending.ratio as number[] | undefined)?.[i] ?? 1).join(" : ")}
                </div>
              )}
            </div>
          )}

          {/* The shelf */}
          <div className="xroom-shelf-search">
            <input
              type="text"
              placeholder="Search reagents..."
              value={shelfFilter}
              onChange={(e) => setShelfFilter(e.target.value)}
              className="xroom-shelf-input"
            />
            {shelfFilter && <button className="xroom-shelf-clear" onClick={() => setShelfFilter("")}>x</button>}
          </div>
          <div className="xroom-shelf">
            {REAGENTS.filter((r) => !PRODUCT_IDS.has(r.id) || unlocked.has(r.id))
              .filter((r) => !shelfFilter || r.name.toLowerCase().includes(shelfFilter.toLowerCase()) || r.formula.toLowerCase().includes(shelfFilter.toLowerCase()))
              .map((r) => {
              const chosen = slotA === r.id || slotB === r.id || slotC === r.id || slotD === r.id;
              const hinted = hints?.has(r.id) ?? false;
              const isProduct = PRODUCT_IDS.has(r.id);
              return (
                <button
                  key={r.id}
                  className={`xroom-reagent${chosen ? " chosen" : ""}${hinted ? " hinted" : ""}${isProduct ? " product" : ""}`}
                  onClick={() => pickReagent(r.id)}
                  title={r.name}
                >
                  <i className="xroom-swatch" style={{ background: r.color }} />
                  <b dangerouslySetInnerHTML={{ __html: r.formula }} />
                  <span>{r.name}</span>
                  {isProduct && <i className="xroom-product-tag">New</i>}
                  {r.sds && (
                    <i
                      className="xroom-sds-icon"
                      title="Safety data"
                      onClick={(e) => { e.stopPropagation(); setSdsOpen(r.id); }}
                    >📋</i>
                  )}
                  {r.hazard && <i className="xroom-hazard-tag">{r.hazard}</i>}
                </button>
              );
            })}
          </div>

          {/* Result card - shown after a reaction completes */}
          {result && result !== "none" && !running && lastMix && (
            <div className="xroom-result-card">
              {prediction && predictionRevealed && (
                <div className={`xroom-prediction-feedback${
                  (prediction === "A visible reaction") ||
                  (prediction === "Gas produced" && result.effect === "gas") ||
                  (prediction === "Colour change" && (result.effect === "precipitate" || result.productColor)) ||
                  (prediction === "Heat released" && result.heat > 0)
                    ? " correct" : " partial"
                }`}>
                  <b>{(prediction === "A visible reaction") ||
                    (prediction === "Gas produced" && result.effect === "gas") ||
                    (prediction === "Colour change" && (result.effect === "precipitate" || result.productColor)) ||
                    (prediction === "Heat released" && result.heat > 0)
                      ? "Your prediction was right!" : "Interesting guess!"}</b>
                  <span>You predicted: "{prediction}"</span>
                </div>
              )}
              <div className="xroom-result-head">
                <span className="xroom-result-badge success">Reaction</span>
                <b>{result.name}</b>
              </div>
              <code className="xroom-result-eq">{result.equation}</code>
              <p className="xroom-result-obs">{result.observation}</p>
              <div className="xroom-result-yield">
                <div className="xroom-yield-bar">
                  <div className="xroom-yield-fill" style={{
                    width: `${Math.round(lastMix.yield * 100)}%`,
                    background: lastMix.yield > 0.95 ? "#50ddaa" : lastMix.yield > 0.5 ? "#e8b040" : "#e06050",
                  }} />
                </div>
                <span>{Math.round(lastMix.yield * 100)}% yield</span>
              </div>
              <p className="xroom-result-note">{lastMix.note}</p>
              <p className="xroom-result-explain">{result.explain}</p>
              {result.products && result.products.length > 0 && (() => {
                const nextChains = result.products!.flatMap((pid) => {
                  const pr = reagentById(pid);
                  if (!pr) return [];
                  return recipesFor(pid).map((rx) => ({
                    product: pr,
                    recipe: rx,
                    others: rx.inputs.filter((inp) => inp !== pid).map((inp) => reagentById(inp)),
                  }));
                });
                const loadRecipe = (recipe: { inputs: string[] }) => {
                  const setters = [setSlotA, setSlotB, setSlotC, setSlotD];
                  recipe.inputs.forEach((inp, i) => setters[i](inp));
                  for (let i = recipe.inputs.length; i < 4; i++) setters[i](null);
                  setResult(null); setLastMix(null);
                  setAmountA(10); setAmountB(10); setAmountC(10); setAmountD(10);
                };
                return (
                  <div className="xroom-chain">
                    <div className="xroom-chain-head">
                      <b>Products unlocked</b>
                    </div>
                    <div className="xroom-chain-products">
                      {result.products!.map((pid) => {
                        const pr = reagentById(pid);
                        if (!pr) return null;
                        return (
                          <button key={pid} className="xroom-chain-product" onClick={() => {
                            loadRecipe({ inputs: [pid] });
                          }}>
                            <i className="xroom-swatch" style={{ background: pr.color }} />
                            <span>{pr.name}</span>
                            <span className="xroom-chain-use">Use →</span>
                          </button>
                        );
                      })}
                    </div>
                    {nextChains.length > 0 && (
                      <div className="xroom-chain-next">
                        <b>Continue the chain</b>
                        {nextChains.map(({ product, recipe, others }) => (
                          <button key={recipe.id} className="xroom-chain-recipe" onClick={() => loadRecipe(recipe)}>
                            <span className="xroom-chain-inputs">
                              <i className="xroom-swatch" style={{ background: product.color }} />
                              {others.map((o, i) => o && (
                                <span key={i} style={{ display: 'contents' }}>
                                  <span>+</span>
                                  <i className="xroom-swatch" style={{ background: o.color }} />
                                </span>
                              ))}
                            </span>
                            <span className="xroom-chain-arrow">→</span>
                            <span className="xroom-chain-name">
                              {recipe.name}
                              {recipe.inputs.length > 2 && <i className="xroom-chain-multi">{recipe.inputs.length}-mix</i>}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          )}
          {result === "none" && !running && (() => {
            const parts = filledSlots.map((id) => reagentById(id)).filter(Boolean);
            return (
              <div className="xroom-result-card">
                {prediction && predictionRevealed && (
                  <div className={`xroom-prediction-feedback${prediction === "No reaction" ? " correct" : " partial"}`}>
                    <b>{prediction === "No reaction" ? "Correct! No reaction occurred." : "Not quite - these don't react together."}</b>
                    <span>You predicted: "{prediction}"</span>
                  </div>
                )}
                <div className="xroom-result-head">
                  <span className="xroom-result-badge fail">No reaction</span>
                  <b>Mixture only</b>
                </div>
                {parts.length >= 2 && (
                  <div className="xroom-mix-preview">
                    {parts.map((r, i) => (
                      <span key={r!.id} style={{ display: 'contents' }}>
                        {i > 0 && <span>+</span>}
                        <i className="xroom-swatch" style={{ background: r!.color }} />
                      </span>
                    ))}
                    <span>=</span>
                    <i className="xroom-swatch xroom-swatch-lg" style={{
                      background: parts.length === 2
                        ? `linear-gradient(135deg, ${parts[0]!.color} 40%, ${parts[1]!.color} 60%)`
                        : `conic-gradient(${parts.map((r, i) => `${r!.color} ${(i / parts.length) * 100}% ${((i + 1) / parts.length) * 100}%`).join(", ")})`,
                    }} />
                  </div>
                )}
                <p className="xroom-result-obs">
                  The substances sit together without reacting. The mixture keeps the properties of all ingredients - no new substance is formed. Not every combination produces a reaction, and knowing which ones don't is just as useful.
                </p>
              </div>
            );
          })()}

          </div>
          {/* Prediction step */}
          {filledSlots.length >= 2 && !result && !running && (
            <div className="xroom-prediction">
              <b>Predict first:</b>
              <span>What do you think will happen?</span>
              <div className="xroom-prediction-opts">
                {["A visible reaction", "No reaction", "Gas produced", "Colour change", "Heat released"].map((opt) => (
                  <button
                    key={opt}
                    className={`xroom-pred-btn${prediction === opt ? " chosen" : ""}`}
                    onClick={() => setPrediction(prediction === opt ? null : opt)}
                  >{opt}</button>
                ))}
              </div>
              {predictionRevealed && prediction && (
                <div className="xroom-prediction-result">
                  {result && result !== "none"
                    ? <span className="xroom-pred-right">You predicted: "{prediction}" - Let's see the result!</span>
                    : <span className="xroom-pred-check">You predicted: "{prediction}"</span>}
                </div>
              )}
            </div>
          )}

          {/* Guidance + actions */}
          <div className="xroom-bench-foot">
            <p className="xroom-guide">
              {running
                ? "Reaction in progress - watch the beaker."
                : result === "none"
                ? "Try another combination - the glowing ones react."
                : result
                ? "Adjust the amounts and try again, or pick new reagents."
                : filledSlots.length >= 2
                ? "Make a prediction above, then pour to test it."
                : filledSlots.length === 1
                ? "Pick a second reagent. The glowing ones will react with it."
                : "Pick any two reagents off the shelf."}
            </p>
            <div className="xroom-bench-actions">
              {log.length > 0 && (
                <button className="xroom-interact ghost" onClick={() => setLogOpen(!logOpen)}>
                  Lab notebook ({log.length})
                </button>
              )}
              <button className="xroom-interact ghost" onClick={clearBench}>Clear</button>
              <button
                className="xroom-interact"
                disabled={filledSlots.length < 2 || !!running}
                onClick={pour}
              >
                Pour together
              </button>
            </div>
          </div>
          </>}
        </div>
      )}

      {/* ══ Lab notebook - reaction log ══ */}
      {logOpen && (
        <div className="xroom-log xroom-ui" onClick={(e) => e.stopPropagation()}>
          <div className="xroom-log-bar">
            <b>Lab notebook</b>
            <span className="xroom-bench-count">{log.length} experiment{log.length !== 1 ? "s" : ""}</span>
            <button className="xroom-x" onClick={() => setLogOpen(false)}>✕</button>
          </div>
          <div className="xroom-log-list">
            {log.map((entry) => {
              const rA = reagentById(entry.a);
              const rB = reagentById(entry.b);
              const rC = entry.c ? reagentById(entry.c) : null;
              const rD = entry.d ? reagentById(entry.d) : null;
              return (
                <div key={entry.id} className={`xroom-log-entry${entry.recipe ? "" : " fail"}`}>
                  <div className="xroom-log-reagents">
                    <i className="xroom-swatch" style={{ background: rA?.color }} />
                    <span>{entry.amountA}{rA ? unitFor(rA) : ""} {rA?.formula}</span>
                    <span className="xroom-plus">+</span>
                    <i className="xroom-swatch" style={{ background: rB?.color }} />
                    <span>{entry.amountB}{rB ? unitFor(rB) : ""} {rB?.formula}</span>
                    {rC && <>
                      <span className="xroom-plus">+</span>
                      <i className="xroom-swatch" style={{ background: rC.color }} />
                      <span>{entry.amountC}{unitFor(rC)} {rC.formula}</span>
                    </>}
                    {rD && <>
                      <span className="xroom-plus">+</span>
                      <i className="xroom-swatch" style={{ background: rD.color }} />
                      <span>{entry.amountD}{unitFor(rD)} {rD.formula}</span>
                    </>}
                  </div>
                  {entry.recipe ? (
                    <div className="xroom-log-result">
                      <span className="xroom-result-badge success">Reaction</span>
                      <b>{entry.recipe.name}</b>
                      {entry.mixResult && (
                        <span className="xroom-log-yield">{Math.round(entry.mixResult.yield * 100)}% yield</span>
                      )}
                    </div>
                  ) : (
                    <div className="xroom-log-result">
                      <span className="xroom-result-badge fail">No reaction</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ══ In-room reading panel - the detail, without leaving ══ */}
      {readingStation && (
        <div className="xroom-read xroom-ui" onClick={(e) => e.stopPropagation()}>
          <div className="xroom-read-bar">
            <b>{readingStation.icon} {readingStation.label}</b>
            <button className="xroom-x" onClick={() => setReading(null)}>✕</button>
          </div>
          <p>{readingStation.detail}</p>

          {/* Controls for the model standing on the table in front of you */}
          {readingStation.model && (() => {
            const spec = SPECIMENS.find((s) => s.id === readingStation.model!.id);
            const v = views[readingStation.id];
            if (!v) return null;
            return (
              <div className="xroom-model-ctl">
                <span className="xroom-model-hint">
                  The model is on the table in front of you.
                </span>
                <div className="xroom-chips">
                  {spec?.layers.map((l) => (
                    <button
                      key={l.id}
                      className={v.layer === l.id ? "xroom-chip on" : "xroom-chip"}
                      onClick={() => setView(readingStation.id, { layer: l.id })}
                      title={l.hint}
                    >
                      {l.label}
                    </button>
                  ))}
                  <button
                    className={v.spin ? "xroom-chip on" : "xroom-chip"}
                    onClick={() => setView(readingStation.id, { spin: !v.spin })}
                  >
                    {v.spin ? "⏸ Stop" : "▶ Turn"}
                  </button>
                </div>
                {spec?.knob && (
                  <label className="xroom-knob">
                    <span>{spec.knob.label}</span>
                    <input
                      type="range"
                      min={spec.knob.min}
                      max={spec.knob.max}
                      step={spec.knob.step}
                      value={v.knob}
                      onChange={(e) => setView(readingStation.id, { knob: Number(e.target.value) })}
                    />
                    <b>{v.knob}{spec.knob.unit ?? ""}</b>
                  </label>
                )}
              </div>
            );
          })()}

          <div className="xroom-read-actions">
            {readingStation.specimen && (
              <button
                className="xroom-interact"
                onClick={() => { setDetailId(readingStation.specimen!); setReading(null); }}
              >
                🔬 View 3D detail
              </button>
            )}
            {readingStation.preset && (
              <button
                className="xroom-interact"
                onClick={() => { loadPreset(readingStation.preset!); setReading(null); }}
              >
                Load these reagents
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Controls help ── */}
      {showHelp && !benchOpen && (
        <div className="xroom-help xroom-ui" onClick={(e) => e.stopPropagation()}>
          {isTouch ? (
            <p>Joystick to walk, drag to look. Walk up to the middle bench and tap to open the mixing station.</p>
          ) : (
            <>
              <div className="xroom-help-grid">
                <span className="xroom-key">WASD</span><span>Move</span>
                <span className="xroom-key">Mouse</span><span>Look around</span>
                <span className="xroom-key">Shift</span><span>Run</span>
                <span className="xroom-key">E</span><span>Use station</span>
                <span className="xroom-key">Esc</span><span>Close panel</span>
              </div>
              <p>Walk to the middle bench to mix reagents</p>
            </>
          )}
          <button onClick={() => setShowHelp(false)}>Got it</button>
        </div>
      )}

      {/* Crosshair - only while pointer is locked */}
      {locked && <div className="xroom-crosshair" />}

      {/* ── Categorized station dock ── */}
      {!benchOpen && !reading && (
        <div className="xroom-dock xroom-ui" onClick={(e) => e.stopPropagation()}>
          <div className="xroom-dock-tabs">
            <button className={`xroom-dock-tab${dockTab === "core" ? " active" : ""}`} onClick={() => setDockTab("core")}>Core</button>
            <button className={`xroom-dock-tab${dockTab === "experiments" ? " active" : ""}`} onClick={() => setDockTab("experiments")}>Experiments</button>
            <button className={`xroom-dock-tab${dockTab === "tools" ? " active" : ""}`} onClick={() => setDockTab("tools")}>Analysis</button>
          </div>
          <div className="xroom-stations">
            {dockTab === "core" && (<>
              <button className="xroom-station primary" onClick={() => setBenchOpen(true)}>
                <span>⚗️</span><span>Mixing station</span>
              </button>
              <button className={`xroom-station${quizPassed ? " done" : ""}`} onClick={() => setQuizOpen(true)}>
                <span>🛡️</span><span>Safety quiz{quizPassed ? " ✓" : ""}</span>
              </button>
              <button className="xroom-station" onClick={() => setBadgesOpen(true)}>
                <span>🏆</span><span>Badges ({earnedBadges.length}/{ACHIEVEMENTS.length})</span>
              </button>
              {STATIONS.filter((s) => s.kind === "info").map((s) => (
                <button key={s.id} className={nearStation === s.id ? "xroom-station active" : "xroom-station"} onClick={() => setReading(s.id)}>
                  <span>{s.icon}</span><span>{s.label}</span>
                </button>
              ))}
            </>)}
            {dockTab === "experiments" && (<>
              <button className={`xroom-station${visited.has('flame') ? ' done' : ''}`} onClick={() => { setFlameOpen(true); markVisited('flame'); }}>
                <span>🔥</span><span>Flame test{visited.has('flame') ? ' ✓' : ''}</span>
              </button>
              <button className={`xroom-station${visited.has('electro') ? ' done' : ''}`} onClick={() => { setElectroOpen(true); markVisited('electro'); }}>
                <span>⚡</span><span>Electrolysis{visited.has('electro') ? ' ✓' : ''}</span>
              </button>
              <button className={`xroom-station${visited.has('calo') ? ' done' : ''}`} onClick={() => { setCaloOpen(true); markVisited('calo'); }}>
                <span>🌡️</span><span>Calorimeter{visited.has('calo') ? ' ✓' : ''}</span>
              </button>
              <button className={`xroom-station${visited.has('mystery') ? ' done' : ''}`} onClick={() => { setMysteryOpen(true); markVisited('mystery'); }}>
                <span>🔍</span><span>Mystery ({mysterySolved.size}/{MYSTERY_CHALLENGES.length}){visited.has('mystery') ? ' ✓' : ''}</span>
              </button>
              <button className={`xroom-station${visited.has('distill') ? ' done' : ''}`} onClick={() => { setDistOpen(true); markVisited('distill'); }}>
                <span>🧪</span><span>Distillation{visited.has('distill') ? ' ✓' : ''}</span>
              </button>
              <button className={`xroom-station${visited.has('chrom') ? ' done' : ''}`} onClick={() => { setChromOpen(true); markVisited('chrom'); }}>
                <span>🎨</span><span>Chromatography{visited.has('chrom') ? ' ✓' : ''}</span>
              </button>
              <button className={`xroom-station${visited.has('lab-proc') ? ' done' : ''}`} onClick={() => { setLabOpen(true); markVisited('lab-proc'); }}>
                <span>📋</span><span>Guided lab{visited.has('lab-proc') ? ' ✓' : ''}</span>
              </button>
              <button className={`xroom-station${visited.has('race') ? ' done' : ''}`} onClick={() => { setRaceOpen(true); markVisited('race'); }}>
                <span>🏁</span><span>Speed race{visited.has('race') ? ' ✓' : ''}</span>
              </button>
              <button className={`xroom-station${visited.has('titration') ? ' done' : ''}`} onClick={() => { setTitOpen(true); markVisited('titration'); }}>
                <span>🧫</span><span>Titration{visited.has('titration') ? ' ✓' : ''}</span>
              </button>
            </>)}
            {dockTab === "tools" && (<>
              <button className={`xroom-station${visited.has('pt') ? ' done' : ''}`} onClick={() => { setPtOpen(true); markVisited('pt'); }}>
                <span>📊</span><span>Periodic table{visited.has('pt') ? ' ✓' : ''}</span>
              </button>
              <button className={`xroom-station${visited.has('gas') ? ' done' : ''}`} onClick={() => { setGasOpen(true); markVisited('gas'); }}>
                <span>🎈</span><span>Gas laws{visited.has('gas') ? ' ✓' : ''}</span>
              </button>
              <button className={`xroom-station${visited.has('collision') ? ' done' : ''}`} onClick={() => { setCollisionOpen(true); markVisited('collision'); }}>
                <span>⚛️</span><span>Collision theory{visited.has('collision') ? ' ✓' : ''}</span>
              </button>
              <button className={`xroom-station${visited.has('ph') ? ' done' : ''}`} onClick={() => { setPhOpen(true); markVisited('ph'); }}>
                <span>🧪</span><span>pH meter{visited.has('ph') ? ' ✓' : ''}</span>
              </button>
              <button className={`xroom-station${visited.has('rate') ? ' done' : ''}`} onClick={() => { setRateOpen(true); markVisited('rate'); }}>
                <span>📈</span><span>Rate graphs{visited.has('rate') ? ' ✓' : ''}</span>
              </button>
              <button className={`xroom-station${visited.has('mol') ? ' done' : ''}`} onClick={() => { setMolOpen(true); markVisited('mol'); }}>
                <span>🧮</span><span>Molarity calc{visited.has('mol') ? ' ✓' : ''}</span>
              </button>
              <button className={`xroom-station${visited.has('econf') ? ' done' : ''}`} onClick={() => { setEconfOpen(true); markVisited('econf'); }}>
                <span>⚛️</span><span>Electron config{visited.has('econf') ? ' ✓' : ''}</span>
              </button>
            </>)}
          </div>
        </div>
      )}

      {/* ══ Scrim behind open panels ══ */}
      {(quizOpen || badgesOpen || sdsOpen || flameOpen || electroOpen || caloOpen || mysteryOpen || ptOpen || gasOpen || chromOpen || distOpen || collisionOpen || energyOpen || labOpen || raceOpen || phOpen || titOpen || rateOpen || molOpen || econfOpen) && (
        <div className="xroom-scrim" onClick={() => {
          setQuizOpen(false); setBadgesOpen(false); setSdsOpen(null);
          setFlameOpen(false); setElectroOpen(false); setCaloOpen(false);
          setMysteryOpen(false); setPtOpen(false); setGasOpen(false);
          setChromOpen(false); setDistOpen(false); setCollisionOpen(false);
          setEnergyOpen(false); setLabOpen(false); setRaceOpen(false);
          setPhOpen(false); setTitOpen(false); setRateOpen(false);
          setMolOpen(false); setEconfOpen(false);
        }} />
      )}

      {/* ══ Safety quiz gate ══ */}
      {quizOpen && (
        <div className="xroom-quiz xroom-ui" onClick={(e) => e.stopPropagation()}>
          <div className="xroom-quiz-bar">
            <b>🛡️ Lab Safety Quiz</b>
            <span className="xroom-bench-count">{quizStep + 1} / {SAFETY_QUIZ.length}</span>
            <button className="xroom-x" onClick={() => { setQuizOpen(false); setQuizStep(0); setQuizScore(0); setQuizAnswer(null); }}>✕</button>
          </div>
          {quizStep < SAFETY_QUIZ.length ? (() => {
            const q = SAFETY_QUIZ[quizStep];
            return (
              <div className="xroom-quiz-body">
                <p className="xroom-quiz-q">{q.question}</p>
                <div className="xroom-quiz-opts">
                  {q.options.map((opt, i) => (
                    <button
                      key={i}
                      className={`xroom-quiz-opt${quizAnswer === i ? (i === q.correct ? " correct" : " wrong") : ""}`}
                      disabled={quizAnswer !== null}
                      onClick={() => {
                        setQuizAnswer(i);
                        if (i === q.correct) { setQuizScore((s) => s + 1); playSuccess(); }
                        else playError();
                      }}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
                {quizAnswer !== null && (
                  <div className={`xroom-quiz-fb${quizAnswer === q.correct ? " ok" : " bad"}`}>
                    <b>{quizAnswer === q.correct ? "Correct!" : "Not quite."}</b>
                    <p>{q.explanation}</p>
                    <button className="xroom-interact" onClick={() => {
                      setQuizAnswer(null);
                      setQuizStep((s) => s + 1);
                    }}>Next</button>
                  </div>
                )}
              </div>
            );
          })() : (
            <div className="xroom-quiz-body xroom-quiz-done">
              <p className="xroom-quiz-score">
                {quizScore >= 4
                  ? `${quizScore}/${SAFETY_QUIZ.length} - You passed!`
                  : `${quizScore}/${SAFETY_QUIZ.length} - You need at least 4 correct. Try again!`}
              </p>
              {quizScore >= 4 ? (
                <button className="xroom-interact" onClick={() => {
                  setQuizPassed(true);
                  setQuizOpen(false);
                  setQuizStep(0);
                  setQuizScore(0);
                  setQuizAnswer(null);
                }}>Continue to lab</button>
              ) : (
                <button className="xroom-interact" onClick={() => {
                  setQuizStep(0);
                  setQuizScore(0);
                  setQuizAnswer(null);
                }}>Retry</button>
              )}
            </div>
          )}
        </div>
      )}

      {/* ══ Badges panel ══ */}
      {badgesOpen && (
        <div className="xroom-badges xroom-ui" onClick={(e) => e.stopPropagation()}>
          <div className="xroom-badges-bar">
            <b>🏆 Achievement Badges</b>
            <span className="xroom-bench-count">{earnedBadges.length} / {ACHIEVEMENTS.length}</span>
            <button className="xroom-x" onClick={() => setBadgesOpen(false)}>✕</button>
          </div>
          <div className="xroom-badges-grid">
            {ACHIEVEMENTS.map((a) => {
              const earned = a.check(achCtx);
              return (
                <div key={a.id} className={`xroom-badge${earned ? " earned" : ""}`}>
                  <span className="xroom-badge-icon">{earned ? a.icon : "🔒"}</span>
                  <b>{a.title}</b>
                  <span>{a.description}</span>
                  {!earned && a.progress && <span className="xroom-badge-progress">{a.progress(achCtx)}</span>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ══ New badge toast ══ */}
      {newBadge && (
        <div className="xroom-badge-toast xroom-ui">
          <span className="xroom-badge-icon">{newBadge.icon}</span>
          <div>
            <b>Badge earned!</b>
            <span>{newBadge.title}</span>
          </div>
        </div>
      )}

      {/* ══ SDS popup ══ */}
      {sdsOpen && (() => {
        const r = reagentById(sdsOpen);
        if (!r?.sds) return null;
        const d = r.sds.hazardDiamond;
        return (
          <div className="xroom-sds xroom-ui" onClick={(e) => e.stopPropagation()}>
            <div className="xroom-sds-bar">
              <b>📋 Safety Data - {r.name}</b>
              <button className="xroom-x" onClick={() => setSdsOpen(null)}>✕</button>
            </div>
            <div className="xroom-sds-body">
              <div className="xroom-diamond">
                <span className="xroom-diamond-cell health" title="Health">{d[0]}</span>
                <span className="xroom-diamond-cell fire" title="Flammability">{d[1]}</span>
                <span className="xroom-diamond-cell react" title="Reactivity">{d[2]}</span>
                <span className="xroom-diamond-cell special" title="Special">{d[3]}</span>
              </div>
              {r.pH !== undefined && (
                <div className="xroom-ph-readout">
                  <b>pH:</b>
                  <span className="xroom-ph-val" style={{
                    color: r.pH < 3 ? "#e04040" : r.pH < 6 ? "#e09030" : r.pH < 8 ? "#40b060" : r.pH < 11 ? "#3090d0" : "#7040c0",
                  }}>{r.pH}</span>
                  <span>{r.pH < 3 ? "Strong acid" : r.pH < 6 ? "Weak acid" : r.pH < 8 ? "Neutral" : r.pH < 11 ? "Weak base" : "Strong base"}</span>
                </div>
              )}
              <div className="xroom-sds-section">
                <b>First aid</b>
                <p>{r.sds.firstAid}</p>
              </div>
              <div className="xroom-sds-section">
                <b>Handling</b>
                <p>{r.sds.handling}</p>
              </div>
              {r.hazard && <div className="xroom-sds-hazard">⚠️ {r.hazard}</div>}
            </div>
          </div>
        );
      })()}

      {/* ══ Energy diagram ══ */}
      {energyOpen && result && result !== "none" && result.energy && (
        <EnergyDiagram recipe={result} onClose={() => setEnergyOpen(false)} />
      )}

      {/* ══ Phase 2 - Flame test station ══ */}
      {flameOpen && (
        <div className="xroom-flame xroom-ui" onClick={(e) => e.stopPropagation()}>
          <div className="xroom-flame-bar">
            <b>🔥 Flame Test Station</b>
            <button className="xroom-x" onClick={() => { setFlameOpen(false); setFlameSelected(null); }}>✕</button>
          </div>
          <p className="xroom-flame-intro">Dip a wire loop into a sample and hold it in the flame. Each metal ion gives a characteristic colour.</p>
          <div className="xroom-flame-grid">
            {FLAME_TESTS.map((f) => (
              <button
                key={f.ion}
                className={`xroom-flame-btn${flameSelected?.ion === f.ion ? " on" : ""}`}
                onClick={() => { setFlameSelected(f); playFlame(); }}
              >
                <span className="xroom-flame-dot" style={{ background: f.hex }} />
                <span>{f.ion}</span>
              </button>
            ))}
          </div>
          {flameSelected && (
            <div className="xroom-flame-result">
              <div className="xroom-flame-glow" style={{ background: flameSelected.hex, boxShadow: `0 0 40px ${flameSelected.hex}` }} />
              <b>{flameSelected.name} - {flameSelected.color}</b>
              <span>Wavelength: {flameSelected.wavelength}</span>
              <p>When {flameSelected.name.toLowerCase()} ions absorb heat energy, their electrons jump to a higher energy level. As they fall back, they emit light at {flameSelected.wavelength}, which your eyes see as {flameSelected.color.toLowerCase()}.</p>
            </div>
          )}
          {renderExpQuiz('flame', FLAME_QUIZ)}
        </div>
      )}

      {/* ══ Phase 2 - Electrolysis cell ══ */}
      {electroOpen && (
        <div className="xroom-electro xroom-ui" onClick={(e) => e.stopPropagation()}>
          <div className="xroom-electro-bar">
            <b>⚡ Electrolysis Cell</b>
            <button className="xroom-x" onClick={() => { setElectroOpen(false); setElectroRunning(false); }}>✕</button>
          </div>
          <div className="xroom-electro-tabs">
            {ELECTROLYSIS_SETUPS.map((s, i) => (
              <button
                key={s.id}
                className={electroSetup === i ? "xroom-chip on" : "xroom-chip"}
                onClick={() => { setElectroSetup(i); setElectroRunning(false); }}
              >{s.electrolyte}</button>
            ))}
          </div>
          {(() => {
            const s = ELECTROLYSIS_SETUPS[electroSetup];
            return (
              <div className="xroom-electro-body">
                <div className="xroom-electro-cell">
                  <div className="xroom-electrode cathode">
                    <b>Cathode (−)</b>
                    <span>{s.cathode}</span>
                  </div>
                  <div className={`xroom-electrolyte${electroRunning ? " running" : ""}`}>
                    <span>{s.formula}</span>
                    {electroRunning && <div className="xroom-bubbles" />}
                  </div>
                  <div className="xroom-electrode anode">
                    <b>Anode (+)</b>
                    <span>{s.anode}</span>
                  </div>
                </div>
                <code className="xroom-electro-eq">{s.equation}</code>
                {electroRunning && <p className="xroom-electro-obs">{s.observation}</p>}
                <button
                  className="xroom-interact"
                  onClick={() => { setElectroRunning(!electroRunning); if (!electroRunning) { playElectricHum(); setTimeout(playBubbles, 300); } }}
                >
                  {electroRunning ? "Switch off" : "Switch on power"}
                </button>
                {electroRunning && <p className="xroom-electro-explain">{s.explain}</p>}
              </div>
            );
          })()}
          {renderExpQuiz('electro', ELECTRO_QUIZ)}
        </div>
      )}

      {/* ══ Phase 2 - Calorimeter with live graph ══ */}
      {caloOpen && (
        <div className="xroom-calo xroom-ui" onClick={(e) => e.stopPropagation()}>
          <div className="xroom-calo-bar">
            <b>🌡️ Calorimeter</b>
            <button className="xroom-x" onClick={() => setCaloOpen(false)}>✕</button>
          </div>
          <div className="xroom-calo-body">
            {caloData.length > 0 && (
              <>
                <b className="xroom-calo-section">Live reaction data</b>
                <svg viewBox="0 0 320 160" className="xroom-calo-svg">
                  <line x1={30} y1={10} x2={30} y2={140} stroke="#445" strokeWidth={1} />
                  <line x1={30} y1={140} x2={310} y2={140} stroke="#445" strokeWidth={1} />
                  <text x={15} y={80} fill="#8aa" fontSize={8} textAnchor="middle" transform="rotate(-90,15,80)">Temp (C)</text>
                  <text x={170} y={156} fill="#8aa" fontSize={8} textAnchor="middle">Time</text>
                  {(() => {
                    const min = Math.min(...caloData) - 2;
                    const max = Math.max(...caloData) + 2;
                    const range = max - min || 1;
                    const pts = caloData.map((v, i) => {
                      const x = 30 + (i / 20) * 280;
                      const y = 140 - ((v - min) / range) * 130;
                      return `${x},${y}`;
                    }).join(" ");
                    return <polyline points={pts} fill="none" stroke="#e08040" strokeWidth={2} />;
                  })()}
                  <text x={35} y={20} fill="#ddd" fontSize={8}>{caloData[caloData.length - 1]}°C</text>
                </svg>
                <p className="xroom-calo-label">
                  {caloData[caloData.length - 1] > 25
                    ? `Exothermic: temperature rose from 25°C to ${caloData[caloData.length - 1]}°C`
                    : `Endothermic: temperature dropped from 25°C to ${caloData[caloData.length - 1]}°C`}
                </p>
              </>
            )}

            <b className="xroom-calo-section">Experiments</b>
            <div className="xroom-calo-exps">
              {CALO_EXPERIMENTS.map((exp) => (
                <button key={exp.id}
                  className={`xroom-chip${caloExp?.id === exp.id ? " on" : ""}`}
                  onClick={() => {
                    setCaloExp(exp);
                    const curve = caloTempCurve(exp, 40);
                    setCaloSimData(curve);
                    setCaloSimStep(0);
                    setCaloSimPlaying(false);
                  }}
                >{exp.title}</button>
              ))}
            </div>

            {caloExp && (
              <div className="xroom-calo-sim">
                <p className="xroom-calo-sim-desc">{caloExp.description}</p>
                <svg viewBox="0 0 320 160" className="xroom-calo-svg">
                  <line x1={30} y1={10} x2={30} y2={140} stroke="#445" strokeWidth={1} />
                  <line x1={30} y1={140} x2={310} y2={140} stroke="#445" strokeWidth={1} />
                  <text x={15} y={80} fill="#8aa" fontSize={8} textAnchor="middle" transform="rotate(-90,15,80)">Temp (°C)</text>
                  <text x={170} y={156} fill="#8aa" fontSize={8} textAnchor="middle">Time</text>
                  {(() => {
                    const visible = caloSimData.slice(0, caloSimStep + 1);
                    if (visible.length === 0) return null;
                    const allData = caloSimData;
                    const min = Math.min(...allData) - 2;
                    const max = Math.max(...allData) + 2;
                    const range = max - min || 1;
                    const pts = visible.map((v, i) => {
                      const x = 30 + (i / (allData.length - 1)) * 280;
                      const y = 140 - ((v - min) / range) * 130;
                      return `${x},${y}`;
                    }).join(" ");
                    const curTemp = visible[visible.length - 1];
                    return (
                      <>
                        <polyline points={pts} fill="none" stroke={caloExp.type === "exothermic" ? "#e08040" : "#40a0e0"} strokeWidth={2} />
                        <text x={35} y={20} fill="#ddd" fontSize={9}>{curTemp.toFixed(1)}°C</text>
                      </>
                    );
                  })()}
                </svg>
                <div className="xroom-calo-sim-controls">
                  <button className="xroom-rate-play" onClick={() => {
                    if (caloSimStep >= caloSimData.length - 1) setCaloSimStep(0);
                    setCaloSimPlaying(!caloSimPlaying);
                  }}>
                    {caloSimPlaying ? "⏸ Pause" : caloSimStep >= caloSimData.length - 1 ? "↻ Replay" : "▶ Run"}
                  </button>
                  <span className={`xroom-calo-sim-badge ${caloExp.type}`}>
                    {caloExp.type === "exothermic" ? "🔥 Exothermic" : "❄️ Endothermic"}
                  </span>
                </div>
                {caloSimStep >= caloSimData.length - 1 && (
                  <div className="xroom-calo-sim-result">
                    <p><b>ΔT =</b> {(caloExp.endTemp - caloExp.startTemp).toFixed(1)}°C</p>
                    <p><b>q = mcΔT =</b> {caloExp.massWater} g x 4.18 J/(g·°C) x {Math.abs(caloExp.endTemp - caloExp.startTemp).toFixed(1)}°C = <b>{(caloExp.massWater * 4.18 * Math.abs(caloExp.endTemp - caloExp.startTemp)).toFixed(0)} J</b></p>
                    <p><b>ΔH =</b> {caloExp.deltaH}</p>
                    <p className="xroom-calo-sim-explain">{caloExp.explanation}</p>
                  </div>
                )}
              </div>
            )}

            {!caloExp && caloData.length === 0 && (
              <p className="xroom-calo-empty">Choose an experiment above, or run a reaction at the mixing station to see live data.</p>
            )}
          </div>
          {renderExpQuiz('calo', CALO_QUIZ)}
        </div>
      )}

      {/* ══ Phase 2 - Mystery substance challenges ══ */}
      {mysteryOpen && (
        <div className="xroom-mystery xroom-ui" onClick={(e) => e.stopPropagation()}>
          <div className="xroom-mystery-bar">
            <b>🔍 Mystery Substance</b>
            <span className="xroom-bench-count">{mysterySolved.size}/{MYSTERY_CHALLENGES.length} solved</span>
            <button className="xroom-x" onClick={() => { setMysteryOpen(false); setMysteryGuess(null); }}>✕</button>
          </div>
          <div className="xroom-mystery-tabs">
            {MYSTERY_CHALLENGES.map((c, i) => (
              <button
                key={c.id}
                className={`xroom-chip${mysteryIdx === i ? " on" : ""}${mysterySolved.has(c.id) ? " solved" : ""}`}
                onClick={() => { setMysteryIdx(i); setMysteryGuess(null); }}
              >{c.label}{mysterySolved.has(c.id) ? " ✓" : ""}</button>
            ))}
          </div>
          {(() => {
            const c = MYSTERY_CHALLENGES[mysteryIdx];
            const solved = mysterySolved.has(c.id);
            return (
              <div className="xroom-mystery-body">
                <p className="xroom-mystery-appear"><b>Appearance:</b> {c.appearance}</p>
                <div className="xroom-mystery-clues">
                  <b>Observations:</b>
                  {c.clues.map((cl, i) => <span key={i}>{cl}</span>)}
                </div>
                <div className="xroom-mystery-tests">
                  <b>Test results:</b>
                  {c.tests.map((t, i) => (
                    <div key={i} className="xroom-mystery-test">
                      <span className="xroom-mystery-testname">{t.test}:</span>
                      <span>{t.result}</span>
                    </div>
                  ))}
                </div>
                {!solved && (
                  <div className="xroom-mystery-guess">
                    <b>What is it?</b>
                    <div className="xroom-mystery-opts">
                      {c.options.map((oid) => REAGENTS.find(r => r.id === oid)).filter(Boolean).map((r) => (
                        <button
                          key={r!.id}
                          className={`xroom-quiz-opt${mysteryGuess === r!.id ? (r!.id === c.answer ? " correct" : " wrong") : ""}`}
                          disabled={mysteryGuess !== null}
                          onClick={() => {
                            setMysteryGuess(r!.id);
                            if (r!.id === c.answer) { setMysterySolved((s) => new Set([...s, c.id])); playSuccess(); }
                            else playError();
                          }}
                        >{r!.formula} - {r!.name}</button>
                      ))}
                    </div>
                  </div>
                )}
                {(solved || mysteryGuess !== null) && (
                  <div className={`xroom-mystery-reveal${mysteryGuess === c.answer || solved ? " ok" : " bad"}`}>
                    <b>{mysteryGuess === c.answer || solved ? "Correct!" : "Not quite - try a different challenge."}</b>
                    {(mysteryGuess === c.answer || solved) && <p>{c.explanation}</p>}
                  </div>
                )}
              </div>
            );
          })()}
          {renderExpQuiz('mystery', MYSTERY_QUIZ)}
        </div>
      )}

      {/* ══ Phase 2 - Periodic table wall ══ */}
      {ptOpen && (
        <div className="xroom-pt xroom-ui" onClick={(e) => e.stopPropagation()}>
          <div className="xroom-pt-bar">
            <b>📊 Periodic Table</b>
            <button className="xroom-x" onClick={() => { setPtOpen(false); setPtSelected(null); }}>✕</button>
          </div>
          <div className="xroom-pt-grid">
            {PT_ELEMENTS.map((el) => (
              <button
                key={el.z}
                className={`xroom-pt-el${ptSelected?.z === el.z ? " on" : ""}`}
                style={{
                  gridColumn: el.group,
                  gridRow: el.period,
                  background: ptSelected?.z === el.z ? el.color : `${el.color}40`,
                  color: ptSelected?.z === el.z ? "#111" : el.color,
                }}
                onClick={() => setPtSelected(el)}
              >
                <span className="xroom-pt-z">{el.z}</span>
                <b>{el.symbol}</b>
              </button>
            ))}
          </div>
          {ptSelected && (
            <div className="xroom-pt-detail">
              <b style={{ color: ptSelected.color }}>{ptSelected.symbol}</b>
              <span>{ptSelected.name}</span>
              <span>Z = {ptSelected.z} | Mass = {ptSelected.mass}</span>
              <span>Group {ptSelected.group}, Period {ptSelected.period}</span>
              <span className="xroom-pt-cat">{ptSelected.category}</span>
            </div>
          )}
        </div>
      )}

      {/* ══ Phase 3 - Gas laws chamber ══ */}
      {gasOpen && (
        <div className="xroom-gas xroom-ui" onClick={(e) => e.stopPropagation()}>
          <div className="xroom-gas-bar">
            <b>🎈 Gas Laws - PV = nRT</b>
            <button className="xroom-x" onClick={() => setGasOpen(false)}>✕</button>
          </div>
          <div className="xroom-gas-body">
            <div className="xroom-gas-presets">
              {GAS_LAW_PRESETS.map((p) => (
                <button key={p.id} className="xroom-chip" onClick={() => {
                  setGasP(p.P); setGasV(p.V); setGasN(p.n); setGasT(p.T);
                }}>{p.name}</button>
              ))}
            </div>
            <div className="xroom-gas-readout">
              <code>PV = nRT</code>
              <span>{gasP} atm x {gasV} L = {gasN} mol x 0.0821 x {gasT} K</span>
              <span>= {(gasN * R_CONST * gasT).toFixed(2)} L atm</span>
            </div>
            <div className="xroom-gas-controls">
              <label>
                <span>Solve for:</span>
                <select value={gasLock} onChange={(e) => setGasLock(e.target.value as "P" | "V" | "T")}>
                  <option value="V">Volume (V)</option>
                  <option value="P">Pressure (P)</option>
                  <option value="T">Temperature (T)</option>
                </select>
              </label>
              {gasLock !== "P" && (
                <label>
                  <span>P (atm)</span>
                  <input type="range" min={0.1} max={20} step={0.1} value={gasP}
                    onChange={(e) => { const v = +e.target.value; setGasP(v); solveGas(gasLock, v, gasV, gasN, gasT); }} />
                  <b>{gasP}</b>
                </label>
              )}
              {gasLock !== "V" && (
                <label>
                  <span>V (L)</span>
                  <input type="range" min={0.5} max={100} step={0.5} value={gasV}
                    onChange={(e) => { const v = +e.target.value; setGasV(v); solveGas(gasLock, gasP, v, gasN, gasT); }} />
                  <b>{gasV}</b>
                </label>
              )}
              <label>
                <span>n (mol)</span>
                <input type="range" min={0.1} max={5} step={0.1} value={gasN}
                  onChange={(e) => { const v = +e.target.value; setGasN(v); solveGas(gasLock, gasP, gasV, v, gasT); }} />
                <b>{gasN}</b>
              </label>
              {gasLock !== "T" && (
                <label>
                  <span>T (K)</span>
                  <input type="range" min={100} max={1000} step={5} value={gasT}
                    onChange={(e) => { const v = +e.target.value; setGasT(v); solveGas(gasLock, gasP, gasV, gasN, v); }} />
                  <b>{gasT}</b>
                </label>
              )}
            </div>
            <div className="xroom-gas-viz">
              <div className="xroom-gas-container" style={{
                width: `${Math.min(200, Math.max(30, gasV * 4))}px`,
                height: `${Math.min(120, Math.max(30, gasV * 2.5))}px`,
              }}>
                {gasParticles.slice(0, Math.min(20, Math.round(gasN * 10))).map((p, i) => (
                  <span key={i} className="xroom-gas-particle" style={{
                    left: `${p.x}%`,
                    top: `${p.y}%`,
                    animationDuration: `${Math.max(0.3, 2 - gasT / 500)}s`,
                  }} />
                ))}
              </div>
            </div>
            <p className="xroom-gas-explain">
              {gasLock === "V" ? "Volume adjusts to satisfy PV = nRT. Increase T or n: volume grows. Increase P: volume shrinks."
                : gasLock === "P" ? "Pressure adjusts. Compress the volume or heat the gas: pressure rises."
                : "Temperature adjusts. Compress: temperature rises (adiabatic). Expand: it drops."}
            </p>
          </div>
          {renderExpQuiz('gas', GAS_QUIZ)}
        </div>
      )}

      {/* ══ Phase 3 - Chromatography station ══ */}
      {chromOpen && (
        <div className="xroom-chrom xroom-ui" onClick={(e) => e.stopPropagation()}>
          <div className="xroom-chrom-bar">
            <b>🎨 Paper Chromatography</b>
            <button className="xroom-x" onClick={() => { setChromOpen(false); setChromRunning(false); setChromProgress(0); }}>✕</button>
          </div>
          <div className="xroom-chrom-tabs">
            {CHROM_SAMPLES.map((s, i) => (
              <button key={s.id} className={`xroom-chip${chromSample === i ? " on" : ""}`}
                onClick={() => { setChromSample(i); setChromRunning(false); setChromProgress(0); }}
              >{s.name}</button>
            ))}
          </div>
          <div className="xroom-chrom-body">
            <div className="xroom-chrom-paper">
              <div className="xroom-chrom-solvent" style={{ height: `${chromProgress}%` }} />
              <div className="xroom-chrom-origin" />
              {CHROM_SAMPLES[chromSample].pigments.map((p) => {
                const show = chromProgress > 10;
                const y = show ? Math.max(5, 100 - p.rf * chromProgress) : 95;
                return (
                  <div key={p.name} className="xroom-chrom-spot" style={{
                    background: p.color,
                    bottom: `${100 - y}%`,
                    opacity: show ? 1 : 0.3,
                    transition: "bottom 0.5s ease-out, opacity 0.3s",
                  }} title={show && chromProgress >= 100 ? `${p.name} (Rf = ${p.rf})` : ""} />
                );
              })}
            </div>
            <button className="xroom-interact"
              disabled={chromRunning}
              onClick={() => { setChromProgress(0); setChromRunning(true); playPour(); }}
            >{chromProgress >= 100 ? "Run again" : "Add solvent"}</button>
            {chromProgress >= 100 && (
              <div className="xroom-chrom-results">
                <b>Separated components:</b>
                {CHROM_SAMPLES[chromSample].pigments.map((p) => (
                  <div key={p.name} className="xroom-chrom-row">
                    <span className="xroom-swatch" style={{ background: p.color }} />
                    <span>{p.name}</span>
                    <span className="xroom-chrom-rf">Rf = {p.rf}</span>
                  </div>
                ))}
                <p className="xroom-chrom-explain">
                  Rf = distance moved by pigment / distance moved by solvent. Higher Rf means the substance is more soluble in the mobile phase and travels further.
                </p>
              </div>
            )}
          </div>
          {renderExpQuiz('chrom', CHROM_QUIZ)}
        </div>
      )}

      {/* ══ Phase 3 - Distillation apparatus ══ */}
      {distOpen && (
        <div className="xroom-dist xroom-ui" onClick={(e) => e.stopPropagation()}>
          <div className="xroom-dist-bar">
            <b>🧪 Distillation</b>
            <button className="xroom-x" onClick={() => { setDistOpen(false); setDistTemp(20); setDistCollected([]); }}>✕</button>
          </div>
          <div className="xroom-dist-tabs">
            {DISTILLATION_MIXES.map((m, i) => (
              <button key={m.id} className={`xroom-chip${distMix === i ? " on" : ""}`}
                onClick={() => { setDistMix(i); setDistTemp(20); setDistCollected([]); }}
              >{m.name}</button>
            ))}
          </div>
          {(() => {
            const m = DISTILLATION_MIXES[distMix];
            return (
              <div className="xroom-dist-body">
                <div className="xroom-dist-viz">
                  <div className="xroom-dist-flask">
                    {m.components.map((c) => (
                      <div key={c.name} className="xroom-dist-layer" style={{
                        height: `${c.percent}%`,
                        background: c.color,
                        opacity: distTemp >= c.bp ? 0.2 : 0.8,
                      }} title={c.name} />
                    ))}
                  </div>
                  <div className="xroom-dist-therm">
                    <div className="xroom-dist-mercury" style={{ height: `${Math.min(100, (distTemp / 500) * 100)}%` }} />
                    <span>{distTemp}°C</span>
                  </div>
                  <div className="xroom-dist-collector">
                    {distCollected.map((name, i) => {
                      const c = m.components.find((x) => x.name === name);
                      return <div key={i} className="xroom-dist-drop" style={{ background: c?.color ?? "#aaa" }} title={name} />;
                    })}
                  </div>
                </div>
                <label className="xroom-dist-heat">
                  <span>🔥 Heat</span>
                  <input type="range" min={20} max={500} step={5} value={distTemp}
                    onChange={(e) => {
                      const t = +e.target.value;
                      setDistTemp(t);
                      const newCollected = m.components.filter((c) => t >= c.bp).map((c) => c.name);
                      if (newCollected.length > distCollected.length) playDrip();
                      setDistCollected(newCollected);
                    }} />
                  <b>{distTemp}°C</b>
                </label>
                <div className="xroom-dist-fractions">
                  {m.components.map((c) => (
                    <div key={c.name} className={`xroom-dist-frac${distTemp >= c.bp ? " boiling" : ""}`}>
                      <span className="xroom-swatch" style={{ background: c.color }} />
                      <span>{c.name}</span>
                      <span>bp {c.bp}°C</span>
                      {distTemp >= c.bp && <span className="xroom-dist-boil">Boiling</span>}
                    </div>
                  ))}
                </div>
                {distCollected.length > 0 && <p className="xroom-dist-explain">{m.explanation}</p>}
              </div>
            );
          })()}
          {renderExpQuiz('distill', DISTILL_QUIZ)}
        </div>
      )}

      {/* ══ Phase 3 - Collision theory particle simulator ══ */}
      {collisionOpen && (
        <div className="xroom-collision xroom-ui" onClick={(e) => e.stopPropagation()}>
          <div className="xroom-collision-bar">
            <b>⚛️ Collision Theory</b>
            <button className="xroom-x" onClick={() => setCollisionOpen(false)}>✕</button>
          </div>
          <div className="xroom-collision-body">
            <div className="xroom-collision-box">
              {collisionParticles.slice(0, collisionConc).map((p, i) => (
                <span key={i} className={`xroom-collision-p${i % 2 === 0 ? " a" : " b"}`} style={{
                  left: `${p.x}%`,
                  top: `${p.y}%`,
                  animationDuration: `${Math.max(0.2, 3 - collisionTemp / 200)}s`,
                  animationDelay: `${p.delay}s`,
                }} />
              ))}
            </div>
            <div className="xroom-collision-controls">
              <label>
                <span>Temperature (K)</span>
                <input type="range" min={100} max={800} step={10} value={collisionTemp}
                  onChange={(e) => setCollisionTemp(+e.target.value)} />
                <b>{collisionTemp} K</b>
              </label>
              <label>
                <span>Concentration (particles)</span>
                <input type="range" min={10} max={100} step={5} value={collisionConc}
                  onChange={(e) => setCollisionConc(+e.target.value)} />
                <b>{collisionConc}</b>
              </label>
            </div>
            <div className="xroom-collision-rate">
              <b>Collision rate:</b>
              <span className="xroom-collision-val">{Math.round(collisionTemp * collisionConc / 50)} per second</span>
            </div>
            <p className="xroom-collision-explain">
              {collisionTemp > 500
                ? "High temperature: particles move fast, collisions are frequent and energetic. More collisions exceed the activation energy, so the reaction rate is high."
                : collisionTemp > 250
                ? "Moderate temperature: particles have enough energy for some successful collisions. Increasing concentration adds more particles, raising the collision frequency."
                : "Low temperature: particles move slowly and few collisions have enough energy to react. Most collisions just bounce off without reacting."}
            </p>
          </div>
          {renderExpQuiz('collision', COLLISION_QUIZ)}
        </div>
      )}

      {/* ══ Rate-of-Reaction Graphs ══ */}
      {rateOpen && (() => {
        const svgW = 340, svgH = 180;
        const sc = rateScenario;
        const steps = 100;
        return (
          <div className="xroom-rate xroom-ui" onClick={(e) => e.stopPropagation()}>
            <div className="xroom-rate-bar">
              <b>📈 Rate of Reaction</b>
              <button className="xroom-x" onClick={() => { setRateOpen(false); setRatePlaying(false); setRateTime(0); }}>✕</button>
            </div>

            <div className="xroom-rate-tabs">
              {RATE_SCENARIOS.map((s) => (
                <button key={s.id}
                  className={`xroom-chip${sc.id === s.id ? " on" : ""}`}
                  onClick={() => { setRateScenario(s); setRateTime(0); setRatePlaying(false); }}
                >{s.title}</button>
              ))}
            </div>

            <div className="xroom-rate-body">
              <p className="xroom-rate-desc">{sc.description}</p>

              {/* Graph */}
              <div className="xroom-rate-graph">
                <svg viewBox={`0 0 ${svgW} ${svgH}`} className="xroom-rate-svg">
                  {/* Grid */}
                  {[0, 0.25, 0.5, 0.75, 1.0].map(f => {
                    const maxC = Math.max(...sc.curves.map(c => c.c0));
                    const val = (f * maxC).toFixed(1);
                    const y = svgH - 15 - f * (svgH - 30);
                    return (
                      <g key={f}>
                        <line x1={40} y1={y} x2={svgW - 5} y2={y} stroke="rgba(255,255,255,.06)" strokeWidth={0.5} />
                        <text x={36} y={y + 3} fill="#80a898" fontSize="7" textAnchor="end">{val}</text>
                      </g>
                    );
                  })}
                  {/* X axis labels */}
                  <text x={40} y={svgH - 3} fill="#80a898" fontSize="7">0</text>
                  <text x={svgW - 5} y={svgH - 3} fill="#80a898" fontSize="7" textAnchor="end">{sc.xMax}s</text>
                  <text x={svgW / 2} y={svgH} fill="#6a9888" fontSize="7" textAnchor="middle">Time (s)</text>
                  {/* Y label */}
                  <text x={4} y={svgH / 2} fill="#6a9888" fontSize="6" textAnchor="middle"
                    transform={`rotate(-90, 4, ${svgH / 2})`}>{sc.yLabel}</text>

                  {/* Curves */}
                  {sc.curves.map((curve) => {
                    const maxC = Math.max(...sc.curves.map(c => c.c0));
                    const pts: string[] = [];
                    for (let i = 0; i <= steps; i++) {
                      const t = (i / steps) * sc.xMax;
                      if (t > rateTime) break;
                      const c = rateConcentration(curve.k, curve.order, curve.c0, t);
                      const x = 40 + (t / sc.xMax) * (svgW - 45);
                      const y = svgH - 15 - (c / maxC) * (svgH - 30);
                      pts.push(`${x},${y}`);
                    }
                    return pts.length > 1 ? (
                      <polyline key={curve.label} points={pts.join(" ")}
                        fill="none" stroke={curve.color} strokeWidth={2} strokeLinejoin="round" />
                    ) : null;
                  })}

                  {/* Time cursor */}
                  {rateTime > 0 && (
                    <line x1={40 + (rateTime / sc.xMax) * (svgW - 45)} y1={15}
                      x2={40 + (rateTime / sc.xMax) * (svgW - 45)} y2={svgH - 15}
                      stroke="rgba(255,255,255,.2)" strokeWidth={1} strokeDasharray="2,2" />
                  )}
                </svg>
              </div>

              {/* Legend */}
              <div className="xroom-rate-legend">
                {sc.curves.map(curve => {
                  const c = rateConcentration(curve.k, curve.order, curve.c0, rateTime);
                  return (
                    <div key={curve.label} className="xroom-rate-legend-item">
                      <span className="xroom-rate-legend-swatch" style={{ background: curve.color }} />
                      <span>{curve.label}</span>
                      <span className="xroom-rate-legend-val">{c.toFixed(3)} M</span>
                    </div>
                  );
                })}
              </div>

              {/* Controls */}
              <div className="xroom-rate-controls">
                <button className="xroom-rate-play" onClick={() => {
                  if (rateTime >= sc.xMax) setRateTime(0);
                  setRatePlaying(!ratePlaying);
                }}>
                  {ratePlaying ? "⏸ Pause" : rateTime >= sc.xMax ? "↻ Replay" : "▶ Play"}
                </button>
                <input type="range" min={0} max={sc.xMax} step={0.5} value={rateTime}
                  onChange={(e) => { setRateTime(+e.target.value); setRatePlaying(false); }}
                  className="xroom-rate-slider"
                />
                <span className="xroom-rate-time">{rateTime.toFixed(0)}s</span>
              </div>

              {/* Explanation */}
              {rateTime >= sc.xMax * 0.8 && (
                <div className="xroom-rate-explain">
                  <b>What happened?</b>
                  <p>{sc.explanation}</p>
                </div>
              )}
            </div>

            {renderExpQuiz('rate', RATE_QUIZ)}
          </div>
        );
      })()}

      {/* ══ Molarity / Dilution Calculator ══ */}
      {molOpen && (() => {
        const preset = molPreset;
        const molarity = calcMolarity(molMass, preset.molarMass, molVol);
        const massNeeded = calcMassNeeded(molarity > 0 ? molarity : 1, preset.molarMass, molVol);
        const dilV2 = calcDilution(dilC1, dilV1, dilC2);
        return (
          <div className="xroom-mol xroom-ui" onClick={(e) => e.stopPropagation()}>
            <div className="xroom-mol-bar">
              <b>🧮 Molarity & Dilution</b>
              <button className="xroom-x" onClick={() => setMolOpen(false)}>✕</button>
            </div>

            <div className="xroom-mol-tabs">
              <button className={`xroom-chip${molMode === "molarity" ? " on" : ""}`} onClick={() => setMolMode("molarity")}>Molarity</button>
              <button className={`xroom-chip${molMode === "dilution" ? " on" : ""}`} onClick={() => setMolMode("dilution")}>Dilution (C₁V₁=C₂V₂)</button>
            </div>

            <div className="xroom-mol-body">
              {molMode === "molarity" ? (
                <>
                  <div className="xroom-mol-presets">
                    {MOLARITY_PRESETS.map((p) => (
                      <button key={p.id} className={`xroom-chip${preset.id === p.id ? " on" : ""}`} onClick={() => setMolPreset(p)}>
                        {p.title}
                      </button>
                    ))}
                  </div>
                  <p className="xroom-mol-desc">{preset.description} - molar mass: {preset.molarMass} {preset.unit}</p>

                  <div className="xroom-mol-fields">
                    <label>
                      Mass of solute (g)
                      <input type="range" min={0.1} max={100} step={0.1} value={molMass} onChange={(e) => setMolMass(+e.target.value)} />
                      <span className="xroom-mol-val">{molMass.toFixed(1)} g</span>
                    </label>
                    <label>
                      Volume of solution (L)
                      <input type="range" min={0.01} max={2} step={0.01} value={molVol} onChange={(e) => setMolVol(+e.target.value)} />
                      <span className="xroom-mol-val">{molVol.toFixed(2)} L ({(molVol * 1000).toFixed(0)} mL)</span>
                    </label>
                  </div>

                  <div className="xroom-mol-result">
                    <div className="xroom-mol-formula">
                      M = n / V = ({molMass.toFixed(1)} / {preset.molarMass}) / {molVol.toFixed(2)}
                    </div>
                    <div className="xroom-mol-answer">
                      <b>{molarity.toFixed(4)} M</b>
                      <span>({(molarity * 1000).toFixed(1)} mM)</span>
                    </div>
                  </div>

                  <div className="xroom-mol-reverse">
                    <b>Reverse:</b> To make {molVol.toFixed(2)} L of {molarity > 0 ? molarity.toFixed(3) : "1.000"} M {preset.title}, you need <b>{massNeeded.toFixed(2)} g</b> of solute.
                  </div>
                </>
              ) : (
                <>
                  <p className="xroom-mol-desc">Use C₁V₁ = C₂V₂ to calculate how much solution you need when diluting a stock solution.</p>

                  <div className="xroom-mol-fields">
                    <label>
                      Stock concentration C₁ (M)
                      <input type="range" min={0.1} max={12} step={0.1} value={dilC1} onChange={(e) => setDilC1(+e.target.value)} />
                      <span className="xroom-mol-val">{dilC1.toFixed(1)} M</span>
                    </label>
                    <label>
                      Stock volume V₁ (mL)
                      <input type="range" min={1} max={500} step={1} value={dilV1} onChange={(e) => setDilV1(+e.target.value)} />
                      <span className="xroom-mol-val">{dilV1.toFixed(0)} mL</span>
                    </label>
                    <label>
                      Desired concentration C₂ (M)
                      <input type="range" min={0.01} max={dilC1} step={0.01} value={Math.min(dilC2, dilC1)} onChange={(e) => setDilC2(+e.target.value)} />
                      <span className="xroom-mol-val">{Math.min(dilC2, dilC1).toFixed(2)} M</span>
                    </label>
                  </div>

                  <div className="xroom-mol-result">
                    <div className="xroom-mol-formula">
                      V₂ = C₁V₁ / C₂ = ({dilC1.toFixed(1)} x {dilV1.toFixed(0)}) / {Math.min(dilC2, dilC1).toFixed(2)}
                    </div>
                    <div className="xroom-mol-answer">
                      <b>{dilV2.toFixed(1)} mL</b>
                      <span>(add {(dilV2 - dilV1).toFixed(1)} mL of water)</span>
                    </div>
                  </div>

                  <div className="xroom-mol-reverse">
                    <b>Summary:</b> Take {dilV1.toFixed(0)} mL of {dilC1.toFixed(1)} M stock, add water to reach {dilV2.toFixed(1)} mL total volume, giving {Math.min(dilC2, dilC1).toFixed(2)} M solution.
                  </div>
                </>
              )}
            </div>

            {renderExpQuiz('molarity', MOLARITY_QUIZ)}
          </div>
        );
      })()}

      {/* ══ Electron Configuration Viewer ══ */}
      {econfOpen && (() => {
        const el = PT_ELEMENTS.find(e => e.z === econfZ) || PT_ELEMENTS[0];
        const config = electronConfiguration(el.z);
        const configStr = electronConfigString(el.z);
        const shells = shellElectrons(el.z);
        const shellColors = ["#ff6b6b", "#ffa94d", "#51cf66", "#339af0", "#cc5de8"];
        const maxR = 120;
        return (
          <div className="xroom-econf xroom-ui" onClick={(e) => e.stopPropagation()}>
            <div className="xroom-econf-bar">
              <b>⚛️ Electron Configuration</b>
              <button className="xroom-x" onClick={() => setEconfOpen(false)}>✕</button>
            </div>

            <div className="xroom-econf-body">
              <div className="xroom-econf-picker">
                <label>
                  Element (Z = {el.z})
                  <input type="range" min={1} max={36} value={econfZ} onChange={(e) => setEconfZ(+e.target.value)} />
                </label>
                <div className="xroom-econf-element" style={{ borderColor: el.color }}>
                  <span className="xroom-econf-z">{el.z}</span>
                  <span className="xroom-econf-sym">{el.symbol}</span>
                  <span className="xroom-econf-name">{el.name}</span>
                </div>
              </div>

              <div className="xroom-econf-notation">
                <b>Configuration:</b> {configStr}
              </div>

              {/* Shell diagram */}
              <svg viewBox="0 0 280 280" className="xroom-econf-svg">
                {/* Nucleus */}
                <circle cx={140} cy={140} r={16} fill="#ff8844" opacity={0.9} />
                <text x={140} y={145} textAnchor="middle" fill="#fff" fontSize={12} fontWeight="bold">{el.symbol}</text>
                {/* Shells */}
                {shells.map((count, i) => {
                  const r = 34 + i * ((maxR - 34) / Math.max(shells.length, 1));
                  return (
                    <g key={i}>
                      <circle cx={140} cy={140} r={r} fill="none" stroke={shellColors[i]} strokeWidth={1} opacity={0.3} strokeDasharray="4 3" />
                      <text x={140 + r + 4} y={138} fill={shellColors[i]} fontSize={9} opacity={0.7}>n={i + 1}</text>
                      {Array.from({ length: count }).map((_, j) => {
                        const angle = (j / count) * Math.PI * 2 - Math.PI / 2;
                        const ex = 140 + r * Math.cos(angle);
                        const ey = 140 + r * Math.sin(angle);
                        return <circle key={j} cx={ex} cy={ey} r={4} fill={shellColors[i]} />;
                      })}
                    </g>
                  );
                })}
              </svg>

              {/* Subshell detail */}
              <div className="xroom-econf-subs">
                {config.map((s, i) => (
                  <div key={i} className="xroom-econf-sub">
                    <span className="xroom-econf-sub-label">{s.label}</span>
                    <div className="xroom-econf-sub-boxes">
                      {Array.from({ length: s.max / 2 }).map((_, bi) => {
                        const e1 = bi * 2 < s.electrons;
                        const e2 = bi * 2 + 1 < s.electrons;
                        return (
                          <div key={bi} className="xroom-econf-orbital">
                            <span className={e1 ? "xroom-econf-arrow up" : "xroom-econf-arrow empty"}>
                              {e1 ? "↑" : ""}
                            </span>
                            <span className={e2 ? "xroom-econf-arrow down" : "xroom-econf-arrow empty"}>
                              {e2 ? "↓" : ""}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                    <span className="xroom-econf-sub-count">{s.electrons}/{s.max}</span>
                  </div>
                ))}
              </div>

              <div className="xroom-econf-info">
                <span><b>Category:</b> {el.category}</span>
                <span><b>Mass:</b> {el.mass} u</span>
                <span><b>Period:</b> {el.period}</span>
                <span><b>Group:</b> {el.group}</span>
              </div>
            </div>

            {renderExpQuiz('econf', ELECTRON_QUIZ)}
          </div>
        );
      })()}

      {/* ══ pH Meter / Indicator Station ══ */}
      {phOpen && (
        <div className="xroom-ph xroom-ui" onClick={(e) => e.stopPropagation()}>
          <div className="xroom-ph-bar">
            <b>🧪 pH Meter</b>
            <button className="xroom-x" onClick={() => { setPhOpen(false); setPhTarget(null); }}>✕</button>
          </div>

          {/* pH scale strip */}
          <div className="xroom-ph-scale">
            {PH_SCALE_COLORS.map((c, i) => (
              <div key={i} className="xroom-ph-scale-cell" style={{ background: c }}>
                <span>{i}</span>
              </div>
            ))}
            <div className="xroom-ph-scale-labels">
              <span>Acidic</span><span>Neutral</span><span>Basic</span>
            </div>
          </div>

          {/* Indicator selector */}
          <div className="xroom-ph-indicators">
            <b>Indicator</b>
            <div className="xroom-ph-ind-row">
              {PH_INDICATORS.map((ind) => (
                <button key={ind.id}
                  className={`xroom-chip${phIndicator.id === ind.id ? " on" : ""}`}
                  onClick={() => setPhIndicator(ind)}
                >{ind.name}</button>
              ))}
            </div>
            <p className="xroom-ph-ind-desc">{phIndicator.description}</p>
          </div>

          {/* Reagent test area */}
          <div className="xroom-ph-test">
            <b>Test a solution</b>
            <div className="xroom-ph-reagents">
              {REAGENTS.filter((r) => r.pH != null && !PRODUCT_IDS.has(r.id)).map((r) => (
                <button key={r.id}
                  className={`xroom-ph-reagent${phTarget === r.id ? " active" : ""}`}
                  onClick={() => setPhTarget(r.id)}
                >
                  <span className="xroom-ph-dot" style={{ background: r.color }} />
                  {r.formula}
                </button>
              ))}
            </div>
          </div>

          {/* Result display */}
          {phTarget && (() => {
            const r = reagentById(phTarget);
            if (!r || r.pH == null) return null;
            const color = indicatorColor(phIndicator, r.pH);
            return (
              <div className="xroom-ph-result">
                <div className="xroom-ph-result-header">
                  <span className="xroom-ph-result-name">{r.name} ({r.formula})</span>
                  <span className="xroom-ph-result-val" style={{ background: PH_SCALE_COLORS[Math.round(Math.min(14, Math.max(0, r.pH)))] }}>
                    pH {r.pH}
                  </span>
                </div>
                <div className="xroom-ph-result-row">
                  <div className="xroom-ph-vial" style={{ background: color === "transparent" ? "rgba(255,255,255,.08)" : color }}>
                    {color === "transparent" && <span className="xroom-ph-no-color">No colour change</span>}
                  </div>
                  <div className="xroom-ph-result-info">
                    <p><b>{phIndicator.name}:</b> {
                      color === "transparent"
                        ? `No visible change (outside indicator range pH ${phIndicator.rangeLow}--${phIndicator.rangeHigh})`
                        : `Colour change visible`
                    }</p>
                    <p>{r.pH < 7 ? "Acidic" : r.pH === 7 ? "Neutral" : "Basic"} solution.
                      {r.pH <= 2 && " Strongly acidic -- handle with care!"}
                      {r.pH >= 12 && " Strongly basic -- handle with care!"}
                    </p>
                  </div>
                </div>
                {/* pH needle on scale */}
                <div className="xroom-ph-needle-track">
                  <div className="xroom-ph-needle" style={{ left: `${(r.pH / 14) * 100}%` }}>▼</div>
                </div>
              </div>
            );
          })()}

          {renderExpQuiz('ph', PH_QUIZ)}
        </div>
      )}

      {/* ══ Interactive Titration ══ */}
      {titOpen && (() => {
        const currentPH = titrationPH(titSetup, titAdded);
        const acid = reagentById(titSetup.acidId);
        const base = reagentById(titSetup.baseId);
        const equivVol = (titSetup.acidConc * titSetup.flaskVol) / titSetup.baseConc;
        const ind = PH_INDICATORS.find(i => i.id === titSetup.indicator) || PH_INDICATORS[0];
        const indColor = indicatorColor(ind, currentPH);
        const svgW = 320, svgH = 160;
        const maxVol = Math.min(titSetup.buretteVol, equivVol * 2);
        return (
          <div className="xroom-tit xroom-ui" onClick={(e) => e.stopPropagation()}>
            <div className="xroom-tit-bar">
              <b>🧫 Interactive Titration</b>
              <button className="xroom-x" onClick={() => { setTitOpen(false); setTitAdded(0); setTitCurve([]); setTitDropping(false); }}>✕</button>
            </div>

            {/* Setup selector */}
            <div className="xroom-tit-tabs">
              {TITRATION_SETUPS.map((s) => (
                <button key={s.id}
                  className={`xroom-chip${titSetup.id === s.id ? " on" : ""}`}
                  onClick={() => { setTitSetup(s); setTitAdded(0); setTitCurve([]); setTitDropping(false); }}
                >{s.title}</button>
              ))}
            </div>

            <div className="xroom-tit-body">
              <p className="xroom-tit-desc">{titSetup.description}</p>

              {/* Flask + burette visual */}
              <div className="xroom-tit-viz">
                {/* Burette */}
                <div className="xroom-tit-burette">
                  <div className="xroom-tit-burette-label">Burette</div>
                  <div className="xroom-tit-burette-tube">
                    <div className="xroom-tit-burette-fill" style={{
                      height: `${Math.max(0, (1 - titAdded / titSetup.buretteVol)) * 100}%`,
                      background: base?.color || '#eef4f1'
                    }} />
                  </div>
                  <div className="xroom-tit-burette-vol">{titAdded.toFixed(1)} mL added</div>
                  <div className="xroom-tit-reagent-label">{base?.formula} ({titSetup.baseConc} M)</div>
                </div>

                {/* Flask */}
                <div className="xroom-tit-flask">
                  <div className="xroom-tit-flask-label">Conical flask</div>
                  <div className="xroom-tit-flask-body" style={{
                    background: indColor === "transparent" ? (acid?.color || '#eaf3f6') : indColor,
                  }}>
                    <span className="xroom-tit-flask-ph">pH {currentPH.toFixed(1)}</span>
                  </div>
                  <div className="xroom-tit-reagent-label">{acid?.formula} ({titSetup.acidConc} M, {titSetup.flaskVol} mL)</div>
                  <div className="xroom-tit-indicator-label">Indicator: {ind.name}</div>
                </div>
              </div>

              {/* Controls */}
              <div className="xroom-tit-controls">
                <button className="xroom-tit-drop" disabled={titAdded >= titSetup.buretteVol}
                  onClick={() => {
                    const next = Math.min(titAdded + 0.5, titSetup.buretteVol);
                    setTitAdded(next);
                    setTitCurve(prev => [...prev, { vol: next, pH: titrationPH(titSetup, next) }]);
                    playDrip();
                  }}>
                  + 0.5 mL drop
                </button>
                <button className="xroom-tit-drop" disabled={titAdded >= titSetup.buretteVol}
                  onClick={() => {
                    const next = Math.min(titAdded + 2, titSetup.buretteVol);
                    setTitAdded(next);
                    setTitCurve(prev => [...prev, { vol: next, pH: titrationPH(titSetup, next) }]);
                    playDrip();
                  }}>
                  + 2 mL pour
                </button>
                <button className="xroom-tit-drop" disabled={titAdded >= titSetup.buretteVol || titDropping}
                  onClick={() => {
                    setTitDropping(true);
                    let vol = titAdded;
                    const interval = setInterval(() => {
                      vol = Math.min(vol + 0.5, titSetup.buretteVol);
                      setTitAdded(vol);
                      setTitCurve(prev => [...prev, { vol, pH: titrationPH(titSetup, vol) }]);
                      if (vol >= titSetup.buretteVol) { clearInterval(interval); setTitDropping(false); }
                    }, 200);
                  }}>
                  {titDropping ? "Dripping..." : "Auto-drip"}
                </button>
                <button className="xroom-tit-reset" onClick={() => { setTitAdded(0); setTitCurve([]); setTitDropping(false); }}>
                  Reset
                </button>
              </div>

              {/* pH curve graph */}
              <div className="xroom-tit-graph">
                <b>pH curve</b>
                <svg viewBox={`0 0 ${svgW} ${svgH}`} className="xroom-tit-svg">
                  {/* Grid lines */}
                  {[0, 2, 4, 6, 7, 8, 10, 12, 14].map(pH => (
                    <line key={pH}
                      x1={30} y1={svgH - 10 - (pH / 14) * (svgH - 20)}
                      x2={svgW - 5} y2={svgH - 10 - (pH / 14) * (svgH - 20)}
                      stroke={pH === 7 ? "rgba(100,220,180,.3)" : "rgba(255,255,255,.06)"} strokeWidth={pH === 7 ? 1 : 0.5}
                    />
                  ))}
                  {/* pH axis labels */}
                  {[0, 7, 14].map(pH => (
                    <text key={pH} x={22} y={svgH - 7 - (pH / 14) * (svgH - 20)}
                      fill="#80a898" fontSize="8" textAnchor="end">{pH}</text>
                  ))}
                  {/* Volume axis labels */}
                  <text x={30} y={svgH - 1} fill="#80a898" fontSize="7">0</text>
                  <text x={svgW - 5} y={svgH - 1} fill="#80a898" fontSize="7" textAnchor="end">{maxVol.toFixed(0)} mL</text>
                  {/* Equivalence point marker */}
                  <line
                    x1={30 + (equivVol / maxVol) * (svgW - 35)} y1={10}
                    x2={30 + (equivVol / maxVol) * (svgW - 35)} y2={svgH - 10}
                    stroke="rgba(255,200,60,.3)" strokeWidth={1} strokeDasharray="3,3"
                  />
                  <text x={30 + (equivVol / maxVol) * (svgW - 35)} y={8}
                    fill="#ffd060" fontSize="7" textAnchor="middle">equiv.</text>
                  {/* Curve */}
                  {titCurve.length > 1 && (
                    <polyline
                      points={titCurve.map(p =>
                        `${30 + (p.vol / maxVol) * (svgW - 35)},${svgH - 10 - (Math.min(14, Math.max(0, p.pH)) / 14) * (svgH - 20)}`
                      ).join(" ")}
                      fill="none" stroke="#7cecc4" strokeWidth={2} strokeLinejoin="round"
                    />
                  )}
                  {/* Current point */}
                  {titCurve.length > 0 && (() => {
                    const last = titCurve[titCurve.length - 1];
                    return (
                      <circle
                        cx={30 + (last.vol / maxVol) * (svgW - 35)}
                        cy={svgH - 10 - (Math.min(14, Math.max(0, last.pH)) / 14) * (svgH - 20)}
                        r={3} fill="#fff"
                      />
                    );
                  })()}
                </svg>
              </div>

              {/* Endpoint info */}
              {titAdded >= equivVol * 0.95 && (
                <div className="xroom-tit-endpoint">
                  <b>Near the equivalence point!</b>
                  <p>{titSetup.endpoint}</p>
                </div>
              )}
            </div>

            {renderExpQuiz('titration', TITRATION_QUIZ)}
          </div>
        );
      })()}

      {/* ══ Guided Lab Procedure ══ */}
      {labOpen && (
        <div className="xroom-lab-proc xroom-ui" onClick={(e) => e.stopPropagation()}>
          <div className="xroom-lab-proc-bar">
            <b>📋 {labProc.title}</b>
            <span className="xroom-bench-count">Step {Math.min(labStep + 1, labProc.steps.length)} / {labProc.steps.length}</span>
            <button className="xroom-x" onClick={() => { setLabOpen(false); setLabStep(0); setLabDone(false); }}>✕</button>
          </div>

          {/* Procedure selector */}
          <div className="xroom-lab-proc-tabs">
            {LAB_PROCEDURES.map((p) => (
              <button key={p.id}
                className={`xroom-chip${labProc.id === p.id ? " on" : ""}`}
                onClick={() => { setLabProc(p); setLabStep(0); setLabDone(false); }}
              >{p.subtitle}</button>
            ))}
          </div>

          <div className="xroom-lab-proc-body">
            <p className="xroom-lab-proc-goal"><b>Goal:</b> {labProc.goal}</p>
            <p className="xroom-lab-proc-safety">⚠️ {labProc.safety}</p>

            {/* Step list */}
            <div className="xroom-lab-proc-steps">
              {labProc.steps.map((step, i) => {
                const done = i < labStep;
                const active = i === labStep && !labDone;
                return (
                  <div key={i} className={`xroom-lab-step${done ? " done" : ""}${active ? " active" : ""}`}>
                    <div className="xroom-lab-step-head">
                      <span className="xroom-lab-step-num">{done ? "✓" : i + 1}</span>
                      <b>{step.title}</b>
                      {step.action === "select" && <span className="xroom-lab-step-tag select">Select</span>}
                      {step.action === "adjust" && <span className="xroom-lab-step-tag adjust">Adjust</span>}
                      {step.action === "pour" && <span className="xroom-lab-step-tag pour">Pour</span>}
                      {step.action === "observe" && <span className="xroom-lab-step-tag observe">Observe</span>}
                      {step.action === "record" && <span className="xroom-lab-step-tag record">Record</span>}
                    </div>
                    {(active || done) && (
                      <div className="xroom-lab-step-body">
                        <p>{step.instruction}</p>
                        {step.tip && <p className="xroom-lab-step-tip">💡 {step.tip}</p>}
                        {active && (
                          <button className="xroom-lab-step-next" onClick={() => {
                            if (labStep < labProc.steps.length - 1) {
                              setLabStep(labStep + 1);
                            } else {
                              setLabDone(true);
                              playSuccess();
                            }
                          }}>
                            {labStep < labProc.steps.length - 1 ? "Done - Next step →" : "Complete procedure ✓"}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Conclusion */}
            {labDone && (
              <div className="xroom-lab-proc-conclusion">
                <b>Conclusion</b>
                <p>{labProc.conclusion}</p>
                <button onClick={() => { setLabStep(0); setLabDone(false); }}>Restart this procedure</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══ Reaction Speed Comparison ══ */}
      {raceOpen && (
        <div className="xroom-race xroom-ui" onClick={(e) => e.stopPropagation()}>
          <div className="xroom-race-bar">
            <b>🏁 Reaction Speed Race</b>
            <button className="xroom-x" onClick={() => { setRaceOpen(false); setRaceRunning(false); setRaceFinished(false); setRaceRevealed(false); }}>✕</button>
          </div>

          {/* Trial selector */}
          <div className="xroom-race-tabs">
            {SPEED_TRIALS.map((t) => (
              <button key={t.id}
                className={`xroom-chip${raceTrial.id === t.id ? " on" : ""}`}
                disabled={raceRunning}
                onClick={() => { setRaceTrial(t); setRaceFinished(false); setRaceRevealed(false); setRaceProgressA(0); setRaceProgressB(0); }}
              >{t.title}</button>
            ))}
          </div>

          <div className="xroom-race-body">
            <p className="xroom-race-desc">{raceTrial.description}</p>
            <p className="xroom-race-var"><b>Variable:</b> {raceTrial.variable}</p>

            {/* Race lanes */}
            <div className="xroom-race-lanes">
              <div className="xroom-race-lane">
                <span className="xroom-race-label">A</span>
                <div className="xroom-race-track">
                  <div className="xroom-race-fill a" style={{ width: `${raceProgressA * 100}%` }} />
                </div>
                <span className="xroom-race-pct">{Math.round(raceProgressA * 100)}%</span>
              </div>
              <div className="xroom-race-lane-name">{raceTrial.reactionA.label}</div>

              <div className="xroom-race-lane">
                <span className="xroom-race-label">B</span>
                <div className="xroom-race-track">
                  <div className="xroom-race-fill b" style={{ width: `${raceProgressB * 100}%` }} />
                </div>
                <span className="xroom-race-pct">{Math.round(raceProgressB * 100)}%</span>
              </div>
              <div className="xroom-race-lane-name">{raceTrial.reactionB.label}</div>
            </div>

            {/* Controls */}
            <div className="xroom-race-controls">
              {!raceRunning && !raceFinished && (
                <button className="xroom-race-go" onClick={startRace}>Start race</button>
              )}
              {raceRunning && <span className="xroom-race-status">Racing...</span>}
              {raceFinished && !raceRevealed && (
                <button className="xroom-race-reveal" onClick={() => setRaceRevealed(true)}>
                  {raceTrial.question} Reveal answer →
                </button>
              )}
              {raceFinished && (
                <button className="xroom-race-restart" onClick={() => { setRaceFinished(false); setRaceRevealed(false); setRaceProgressA(0); setRaceProgressB(0); }}>
                  Race again
                </button>
              )}
            </div>

            {/* Answer reveal */}
            {raceRevealed && (
              <div className="xroom-race-answer">
                <b>Answer</b>
                <p>{raceTrial.answer}</p>
                <p className="xroom-race-explain">{raceTrial.explanation}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function AmountSlider({ id, value, onChange }: {
  id: string; value: number; onChange: (v: number) => void;
}) {
  const r = reagentById(id);
  if (!r) return null;
  const unit = unitFor(r);
  const max = r.phase === "solid" ? 20 : 50;
  return (
    <label className="xroom-amount">
      <i className="xroom-swatch" style={{ background: r.color }} />
      <span dangerouslySetInnerHTML={{ __html: r.formula }} />
      <input
        type="range" min={1} max={max} step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <b>{value} {unit}</b>
    </label>
  );
}

/** One of the two reagent slots on the bench. */
function Slot({ label, id, onClear }: {
  label: string; id: string | null; onClear: () => void;
}) {
  const r = reagentById(id);
  return (
    <button className={`xroom-slot${r ? " filled" : ""}`} onClick={r ? onClear : undefined}>
      {r ? (
        <>
          <i className="xroom-swatch" style={{ background: r.color }} />
          <b dangerouslySetInnerHTML={{ __html: r.formula }} />
          <span>{r.name}</span>
        </>
      ) : (
        <>
          <i className="xroom-swatch empty" />
          <b>{label}</b>
          <span>empty</span>
        </>
      )}
    </button>
  );
}

function EnergyDiagram({ recipe, onClose }: { recipe: Recipe; onClose: () => void }) {
  const e = recipe.energy;
  if (!e) return null;
  const exo = e.enthalpy < 0;
  const w = 360, h = 200;
  const rStart = 40, rEnd = exo ? 140 : 40;
  const pEnd = exo ? 40 : 140;
  const peak = rStart + e.activation;
  const peakY = Math.max(10, h - 20 - peak * (h - 40) / 200);
  const rY = h - 20 - rEnd * (h - 40) / 200;
  const pY = h - 20 - pEnd * (h - 40) / 200;
  const midX = w / 2;

  return (
    <div className="xroom-energy xroom-ui" onClick={(ev) => ev.stopPropagation()}>
      <div className="xroom-energy-bar">
        <b>Energy diagram - {recipe.name}</b>
        <button className="xroom-x" onClick={onClose}>✕</button>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} className="xroom-energy-svg">
        <line x1={20} y1={h - 20} x2={w - 10} y2={h - 20} stroke="#445" strokeWidth={1.5} />
        <line x1={20} y1={10} x2={20} y2={h - 20} stroke="#445" strokeWidth={1.5} />
        <text x={12} y={h / 2} fill="#8aa" fontSize={9} textAnchor="middle" transform={`rotate(-90,12,${h / 2})`}>Energy</text>
        <text x={w / 2} y={h - 4} fill="#8aa" fontSize={9} textAnchor="middle">Reaction progress</text>
        <line x1={30} y1={rY} x2={80} y2={rY} stroke="#50ddaa" strokeWidth={2} />
        <text x={55} y={rY - 6} fill="#50ddaa" fontSize={8} textAnchor="middle">Reactants</text>
        <path
          d={`M80,${rY} Q${midX - 20},${peakY - 20} ${midX},${peakY} Q${midX + 20},${peakY - 20} ${w - 100},${pY}`}
          fill="none" stroke={exo ? "#e88040" : "#40a0e0"} strokeWidth={2}
        />
        <line x1={w - 100} y1={pY} x2={w - 40} y2={pY} stroke="#e06050" strokeWidth={2} />
        <text x={w - 70} y={pY - 6} fill="#e06050" fontSize={8} textAnchor="middle">Products</text>
        <line x1={midX} y1={rY} x2={midX} y2={peakY} stroke="#aaa" strokeWidth={1} strokeDasharray="3,3" />
        <text x={midX + 4} y={(rY + peakY) / 2} fill="#ddd" fontSize={8}>Ea={e.activation} kJ</text>
        <line x1={w - 70} y1={rY} x2={w - 70} y2={pY} stroke="#aaa" strokeWidth={1} strokeDasharray="3,3" />
        <text x={w - 66} y={(rY + pY) / 2} fill="#ddd" fontSize={8}>
          {"Δ"}H={e.enthalpy > 0 ? "+" : ""}{e.enthalpy} kJ
        </text>
      </svg>
      <p className="xroom-energy-label">
        {exo
          ? "Exothermic - energy is released to the surroundings. Products are more stable than reactants."
          : "Endothermic - energy is absorbed from the surroundings. Products are less stable than reactants."}
      </p>
    </div>
  );
}
