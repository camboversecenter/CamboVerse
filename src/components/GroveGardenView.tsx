import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Html, Sky } from "@react-three/drei";
import { createXRStore, XR, XROrigin, useXR } from "@react-three/xr";
import { ACESFilmicToneMapping, Color, InstancedMesh, Matrix4, Quaternion, Vector3 } from "three";
import { importBundle, importBundleFile } from "../grove/bundle";
import { GroveClient, DEFAULT_NODE, type VerifiedRecord } from "../grove/client";
import {
  buildPlots, gardenTotals, growthAt, measuredHeightM, trustOpacity, type GrovePlot,
} from "../grove/garden";
import { grassTexture, soilTexture } from "../lib/groundTexture";
import {
  BroadleafPlant, PalmPlant, BananaPlant, PapayaPlant, Seedling,
  type PlantLook, type TreeShape,
} from "./GrovePlants";
import demoBundle from "../grove/fixtures/grove-bundle.json";

/**
 * CamboVerse's view modes (see AGENTS.md → "The three view modes"):
 *
 *  • **normal** — the hard baseline, a ~$150 Android on 4G: fewer branch
 *    generations, faceted foliage, no shadows, no grass, no wind, lower DPR.
 *  • **ultra**  — a high-end phone, tablet or desktop: the full scene.
 *  • **VR**     — not a third setting but a presentation of **ultra**; entering
 *    a WebXR session raises the view to ultra for its duration.
 *
 * Auto-detected, always overridable by the visitor — detection is only a guess.
 * The tiers change *detail, never content*: the same species at the same scale.
 */
export type ViewMode = "normal" | "ultra";

function detectViewMode(): ViewMode {
  if (typeof navigator === "undefined") return "ultra";
  const cores = navigator.hardwareConcurrency ?? 4;
  const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 4;
  const small = typeof window !== "undefined" && Math.min(window.screen.width, window.screen.height) < 500;
  return cores <= 4 || mem <= 3 || small ? "normal" : "ultra";
}

/**
 * 🌱 Grove Garden — CamboVerse's virtual twin of a real, device-signed garden.
 *
 * It reads Grove records two ways (BRIDGE.md §1): an offline export bundle from a
 * phone (Path A), or a Grove node's public feeds (Path B, base URL configurable).
 * Every record is **verified locally** before anything is drawn — a tampered or
 * forged record never reaches the scene. Each verified plot grows a virtual
 * parcel; the `prev` chain replays growth over time; `co2Kg` is shown only as an
 * estimate, and `trust` as a translucency cue.
 */
export function GroveGardenView({ onBackToMap }: { onBackToMap: () => void }) {
  const store = useMemo(() => createXRStore({ emulate: false }), []);
  const [vrSupported, setVrSupported] = useState(false);
  const [records, setRecords] = useState<VerifiedRecord[]>([]);
  const [status, setStatus] = useState<string>("Verifying signed records…");
  const [nodeUrl, setNodeUrl] = useState(DEFAULT_NODE);
  const [selected, setSelected] = useState<string | null>(null);
  const [t, setT] = useState(1); // timeline position 0..1
  const [playing, setPlaying] = useState(false);
  const [mode, setMode] = useState<ViewMode>(detectViewMode);

  const plots = useMemo(() => buildPlots(records), [records]);
  const totals = useMemo(() => gardenTotals(plots), [plots]);
  const span = useMemo(() => {
    const first = Math.min(...plots.map((p) => p.firstAt));
    const last = Math.max(...plots.map((p) => p.lastAt));
    return { first, last, dur: Math.max(1, last - first) };
  }, [plots]);
  const now = span.first + t * span.dur;

  // Is immersive VR available on this device?
  useEffect(() => {
    const xr = (navigator as Navigator & { xr?: { isSessionSupported(m: string): Promise<boolean> } }).xr;
    xr?.isSessionSupported("immersive-vr").then(setVrSupported).catch(() => setVrSupported(false));
  }, []);

  // Load the demo bundle on mount (Path A, offline, verified).
  useEffect(() => {
    let live = true;
    (async () => {
      const imp = await importBundle(demoBundle);
      if (!live) return;
      setRecords(imp.records);
      setStatus(
        `${imp.records.length}/${imp.total} records verified locally` +
          (imp.dropped ? ` · ${imp.dropped} dropped (failed verify)` : ""),
      );
    })();
    return () => { live = false; };
  }, []);

  // Growth animation: advance the timeline while playing.
  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    let last = performance.now();
    const step = (ts: number) => {
      const dt = (ts - last) / 1000;
      last = ts;
      setT((prev) => {
        const next = prev + dt / 5; // ~5 s to replay the whole history
        if (next >= 1) { setPlaying(false); return 1; }
        return next;
      });
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [playing]);

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setStatus("Verifying imported bundle…");
    try {
      const imp = await importBundleFile(file);
      setRecords(imp.records);
      setSelected(null);
      setT(1);
      setStatus(
        `Imported: ${imp.records.length}/${imp.total} verified` +
          (imp.dropped ? ` · ${imp.dropped} dropped` : ""),
      );
    } catch (err) {
      setStatus("Import failed: " + (err as Error).message);
    }
  };

  const loadNode = async () => {
    setStatus("Reading node feed…");
    try {
      const client = new GroveClient(nodeUrl);
      const page = await client.feed({ limit: 100 });
      setRecords(page.records);
      setSelected(null);
      setT(1);
      setStatus(
        page.records.length
          ? `${page.records.length} verified from node` + (page.dropped ? ` · ${page.dropped} dropped` : "")
          : "No records from node (or none verified).",
      );
    } catch (err) {
      setStatus("Node unreachable: " + (err as Error).message + " — using the offline bundle instead.");
    }
  };

  const sel = plots.find((p) => p.id === selected) ?? null;

  return (
    <div className="grove">
      <Canvas
        dpr={mode === "normal" ? [1, 1.5] : [1, 2]}
        camera={{ position: [0, 15, 46], fov: 45 }}
        gl={{ antialias: mode === "ultra", powerPreference: "high-performance" }}
        shadows={mode === "ultra"}
        onCreated={({ gl }) => {
          // Filmic response + a touch under 1.0 keeps the tropical sun from
          // blowing out the foliage highlights.
          gl.toneMapping = ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.18;
        }}
      >
        <XR store={store}>
          <GardenSky mode={mode} />
          {plots.map((p, i) => (
            <PlotParcel
              key={p.id}
              plot={p}
              index={i}
              total={plots.length}
              now={now}
              mode={mode}
              selected={p.id === selected}
              onSelect={() => setSelected(p.id === selected ? null : p.id)}
            />
          ))}
          {/* In VR, stand back on the ground and look along the row of plots. */}
          <XROrigin position={[0, 0, 8]} />
          <VrImpliesUltra onEnter={() => setMode("ultra")} />
          <GardenControls />
        </XR>
      </Canvas>

      <div className="cls-top">
        <button className="backbtn" onClick={onBackToMap}>← Map</button>
        <span className="cls-title">🌱 Grove Garden</span>
        <button
          className="grove-quality"
          onClick={() => setMode((m) => (m === "ultra" ? "normal" : "ultra"))}
          title="View mode — Normal is the low-end baseline, Ultra is the full 3D scene"
        >
          {mode === "ultra" ? "✨ Ultra" : "🍃 Normal"}
        </button>
        {vrSupported && (
          <button
            className="vr-btn cls-vr"
            onClick={() => { setMode("ultra"); store.enterVR(); }}
          >
            🥽 VR
          </button>
        )}
      </div>

      {/* verification banner — the trust story, front and centre */}
      <div className="grove-verify">🔏 {status}</div>

      {/* data source */}
      <div className="grove-source">
        <label className="grove-import">
          📥 Import phone JSON
          <input type="file" accept="application/json,.json" onChange={onFile} hidden />
        </label>
        <div className="grove-node">
          <input
            value={nodeUrl}
            onChange={(e) => setNodeUrl(e.target.value)}
            spellCheck={false}
            aria-label="Grove node base URL"
          />
          <button onClick={loadNode}>Read node</button>
        </div>
      </div>

      {/* totals + timeline */}
      <div className="grove-panel">
        <div className="grove-totals">
          <span><b>{totals.plots}</b> plots</span>
          <span><b>{totals.plants}</b> plants</span>
          <span className="grove-co2">≈ {fmt(totals.co2Kg)} kg CO₂ <i>estimated</i></span>
        </div>
        <div className="grove-timeline">
          <button className="grove-play" onClick={() => { if (t >= 1) setT(0); setPlaying((v) => !v); }}>
            {playing ? "⏸" : "▶"}
          </button>
          <input
            type="range" min={0} max={1} step={0.001} value={t}
            onChange={(e) => { setPlaying(false); setT(+e.target.value); }}
            aria-label="growth timeline"
          />
          <span className="grove-date">{span.dur > 1 ? new Date(now).toISOString().slice(0, 10) : "—"}</span>
        </div>
        <p className="grove-foot">
          CO₂ is a conservative <b>estimate</b> (Chave 2014 allometry), never a tradable credit. Every
          record is verified on this device — nothing here is trusted from a server.
        </p>
      </div>

      {/* selected plot detail */}
      {sel && (
        <div className="grove-detail" onClick={() => setSelected(null)}>
          <div className="grove-card" onClick={(e) => e.stopPropagation()}>
            <div className="grove-card-head">
              <b>{sel.id}</b>
              <button className="grove-x" onClick={() => setSelected(null)}>✕</button>
            </div>
            <div className="grove-row"><span>Species</span><b>{sel.speciesCounts.map((sc) => `${sc.count}× ${sc.species}`).join(", ")}</b></div>
            <div className="grove-row"><span>Est. CO₂</span><b>≈ {fmt(sel.totalCo2Kg)} kg</b></div>
            <div className="grove-row">
              <span>Trust</span>
              <span className="grove-trust">
                <span className="grove-trust-bar"><span style={{ width: `${sel.trust}%` }} /></span>
                {sel.trust}/100 {sel.latest.attestations.length ? "· community-attested" : "· self-claim"}
              </span>
            </div>
            <div className="grove-row"><span>Observations</span><b>{sel.timeline.length}</b></div>
            <div className="grove-row"><span>Device</span><code>{sel.latest.observation.device.slice(0, 10)}…</code></div>
            {sel.gps && (
              <div className="grove-row"><span>Location</span><b>~{sel.gps.lat.toFixed(2)}, {sel.gps.lng.toFixed(2)} <i>(coarsened)</i></b></div>
            )}
            <p className="grove-note">
              Device id is a pseudonym. Location is coarsened to ~1 km. Verified from the signed record
              itself — {sel.latest.attestations.length} attestation
              {sel.latest.attestations.length === 1 ? "" : "s"} checked.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------- the world: sky, sun, ground ---------------- */

const SUN: [number, number, number] = [18, 11, 8];

/**
 * A late-afternoon tropical sky and the light rig under it. Everything is
 * procedural — Preetham sky, a warm sun, cool sky-fill bounce, and a grass plane
 * whose texture is drawn on a canvas at runtime. No HDRI, nothing downloaded.
 */
function GardenSky({ mode }: { mode: ViewMode }) {
  const grass = useMemo(() => grassTexture(mode === "ultra" ? 64 : 40), [mode]);
  return (
    <>
      <Sky sunPosition={SUN} turbidity={6} rayleigh={1.1} mieCoefficient={0.006} mieDirectionalG={0.92} />
      <fog attach="fog" args={["#cfe0e8", 70, 260]} />

      <ambientLight intensity={0.5} />
      <hemisphereLight args={["#cfe2ff", "#6b8a45", 0.85]} />
      <directionalLight
        position={SUN}
        intensity={2.5}
        color="#fff1d6"
        castShadow={mode === "ultra"}
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0005}
        shadow-camera-near={0.5}
        shadow-camera-far={70}
        shadow-camera-left={-24}
        shadow-camera-right={24}
        shadow-camera-top={24}
        shadow-camera-bottom={-24}
      />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
        <planeGeometry args={[400, 400]} />
        <meshStandardMaterial map={grass} roughness={1} />
      </mesh>
    </>
  );
}

/**
 * Instanced grass blades around a plot — one draw call for the lot. They sell
 * the ground far better than a flat texture alone, so they're the first thing
 * dropped on a low-end device.
 */
function GrassTufts({ count, radius, seed }: { count: number; radius: number; seed: number }) {
  const ref = useRef<InstancedMesh>(null);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    let t = seed >>> 0;
    const rand = () => {
      t += 0x6d2b79f5;
      let x = Math.imul(t ^ (t >>> 15), 1 | t);
      x ^= x + Math.imul(x ^ (x >>> 7), 61 | x);
      return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
    };
    const m = new Matrix4();
    const q = new Quaternion();
    const p = new Vector3();
    const s = new Vector3();
    const a = new Color("#6f9c46");
    const b = new Color("#93ab52");
    const c = new Color();
    for (let i = 0; i < count; i++) {
      // Denser at the pad's edge, thinning outward — how grass meets bare soil.
      const ang = rand() * Math.PI * 2;
      const r = radius * (0.85 + rand() * 0.9);
      const h = 0.1 + rand() * 0.14;
      const w = 0.03 + rand() * 0.035;
      p.set(Math.cos(ang) * r, h / 2, Math.sin(ang) * r); // cone is centred — lift so the base sits on the ground
      q.setFromAxisAngle(new Vector3(0, 1, 0), rand() * Math.PI);
      s.set(w, h, w);
      m.compose(p, q, s);
      mesh.setMatrixAt(i, m);
      c.copy(a).lerp(b, rand());
      mesh.setColorAt(i, c);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [count, radius, seed]);

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, count]} position={[0, 0.02, 0]} castShadow>
      <coneGeometry args={[1, 1, 3]} />
      <meshStandardMaterial roughness={0.9} flatShading />
    </instancedMesh>
  );
}

/** VR always presents the Ultra scene — if a session starts while the view is in
 *  Normal (headset "enter VR", a deep link), raise it for the session. */
function VrImpliesUltra({ onEnter }: { onEnter: () => void }) {
  const inXR = useXR((s) => s.session != null);
  useEffect(() => { if (inXR) onEnter(); }, [inXR, onEnter]);
  return null;
}

/** Orbit controls for the 2D view; disabled inside an immersive XR session
 *  (there the headset drives the camera and XROrigin places the viewer). */
function GardenControls() {
  const inXR = useXR((s) => s.session != null);
  if (inXR) return null;
  return (
    <OrbitControls
      enablePan={false}
      minDistance={4}
      maxDistance={140}
      maxPolarAngle={Math.PI / 2.15}
      enableDamping
      target={[0, 5, 0]}
    />
  );
}

/* ---------------- one plot parcel in the 3D world ---------------- */

function PlotParcel({
  plot, index, total, now, mode, selected, onSelect,
}: {
  plot: GrovePlot;
  index: number;
  total: number;
  now: number;
  mode: ViewMode;
  selected: boolean;
  onSelect: () => void;
}) {
  // Lay the parcels out as an orchard grid rather than one long row, so a
  // garden with many plots still frames in a single view.
  const spacing = 9.5; // real orchard spacing — full-grown crowns need room
  const cols = Math.ceil(Math.sqrt(total));
  const rows = Math.ceil(total / cols);
  const x = ((index % cols) - (cols - 1) / 2) * spacing;
  const z = (Math.floor(index / cols) - (rows - 1) / 2) * spacing;
  const soil = useMemo(() => soilTexture(2), []);

  // Flatten every plant in the plot (across all growth chains and their `count`)
  // into one list, then lay them out so nothing overlaps — a plot may hold
  // several separate plantings, not just one chain.
  const trees: { key: string; species: string; heightM: number; opacity: number }[] = [];
  plot.chains.forEach((chain, ci) => {
    const g = growthAt(chain, now);
    if (!g.record) return;
    const n = Math.min(6, g.record.observation.count);
    for (let k = 0; k < n; k++) {
      trees.push({
        key: `${ci}:${k}`,
        species: g.record.observation.species,
        heightM: measuredHeightM(g.record.observation),
        opacity: trustOpacity(g.record.trust),
      });
    }
  });
  const spots = layoutSpots(trees.length);

  // Label sits above the tallest plant so it never buries itself in a canopy.
  const labelY = 1.2 + Math.max(1.2, ...trees.map((t) => t.heightM));

  return (
    <group position={[x, 0, z]}>
      {/* turned soil bed */}
      <mesh position={[0, 0.02, 0]} onClick={onSelect} receiveShadow>
        <cylinderGeometry args={[2.4, 2.5, 0.16, 30]} />
        <meshStandardMaterial map={soil} color={selected ? "#ffd9a8" : "#ffffff"} roughness={1} />
      </mesh>
      {/* a low rim of grass where the bed meets the lawn */}
      {mode === "ultra" && <GrassTufts count={260} radius={2.4} seed={index * 31 + 5} />}

      {/* the plants */}
      {trees.map((tr, i) => (
        <group key={tr.key} position={[spots[i][0], 0.08, spots[i][1]]}>
          <Plant
            species={tr.species}
            heightM={tr.heightM}
            opacity={tr.opacity}
            seed={index * 7 + i}
            mode={mode}
          />
        </group>
      ))}

      {/* floating label */}
      <Billboard position={[0, labelY, 0]}>
        <div className={selected ? "grove-tag on" : "grove-tag"} onClick={onSelect}>
          <b>{plot.speciesCounts.map((sc) => `${sc.species}·${sc.count}`).join(" · ")}</b>
          <span>≈{fmt(plot.totalCo2Kg)}kg</span>
        </div>
      </Billboard>
    </group>
  );
}

/** Positions for N trees on a plot pad so none overlap: one at centre, the rest
 *  on a ring (with a second ring past six). Deterministic — no randomness. */
function layoutSpots(n: number): [number, number][] {
  if (n <= 0) return [];
  if (n === 1) return [[0, 0]];
  const spots: [number, number][] = [];
  const ringCount = n <= 6 ? n : 6;
  for (let i = 0; i < ringCount; i++) {
    const a = (i / ringCount) * Math.PI * 2;
    spots.push([Math.cos(a) * 1.4, Math.sin(a) * 1.4]);
  }
  for (let i = ringCount; i < n; i++) {
    const a = ((i - ringCount) / Math.max(1, n - ringCount)) * Math.PI * 2 + 0.4;
    spots.push([Math.cos(a) * 0.65, Math.sin(a) * 0.65]);
  }
  return spots;
}

/* ---------------- species → how the plant is grown ---------------- */

/**
 * How each species is built. `shape` drives the branch skeleton, so a mango's
 * dense round crown, a jackfruit's upright oval with fruit straight off the
 * trunk, and a tamarind's wide feathery umbrella all grow differently rather
 * than being the same blob in different colours. Extend freely — Grove's
 * species list is open.
 */
const SHAPES: Record<string, TreeShape> = {
  round:    { spread: 0.85, levels: 3, children: 3, trunkFrac: 0.42, girth: 1.0, clump: 1.0 },
  oval:     { spread: 0.55, levels: 3, children: 3, trunkFrac: 0.5,  girth: 1.15, clump: 0.9 },
  umbrella: { spread: 1.15, levels: 3, children: 3, trunkFrac: 0.38, girth: 1.3, clump: 1.15 },
  bushy:    { spread: 0.95, levels: 3, children: 4, trunkFrac: 0.3,  girth: 0.8, clump: 0.85 },
};

const PLANT_LOOKS: Record<string, PlantLook> = {
  coconut: { form: "palm", leaf: "#3f8a44", leaf2: "#57a052", bark: "#9a7b4a" },
  palm: { form: "palm", leaf: "#3f8a44", leaf2: "#57a052", bark: "#9a7b4a" },
  banana: { form: "banana", leaf: "#4c9a3a", leaf2: "#63b04a", bark: "#5f8a3a" },
  papaya: { form: "papaya", leaf: "#3f8a3f", leaf2: "#55a24d", bark: "#8a9a5a" },
  mango: {
    form: "broadleaf", leaf: "#2f6d2e", leaf2: "#437f33", bark: "#6b4a2b", shape: SHAPES.round,
    fruit: { color: "#d99a34", size: 0.11, where: "canopy", count: 7 },
  },
  jackfruit: {
    form: "broadleaf", leaf: "#356b30", leaf2: "#4a8a3a", bark: "#6f5233", shape: SHAPES.oval,
    fruit: { color: "#9caa3a", size: 0.26, where: "trunk", count: 3 },
  },
  tamarind: { form: "broadleaf", leaf: "#6f9a4a", leaf2: "#87ad5e", bark: "#5f4630", shape: SHAPES.umbrella },
  teak: { form: "broadleaf", leaf: "#4f8a3c", leaf2: "#6aa24a", bark: "#7a5a38", shape: SHAPES.oval },
  longan: {
    form: "broadleaf", leaf: "#3c7a3a", leaf2: "#4f9a48", bark: "#6b4a2b", shape: SHAPES.round,
    fruit: { color: "#b98a52", size: 0.07, where: "canopy", count: 9 },
  },
  guava: {
    form: "broadleaf", leaf: "#5a9a4a", leaf2: "#7ab35c", bark: "#8a7050", shape: SHAPES.bushy,
    fruit: { color: "#cdd08a", size: 0.09, where: "canopy", count: 5 },
  },
};

const DEFAULT_LOOK: PlantLook = {
  form: "broadleaf", leaf: "#4c8a3f", leaf2: "#5fa04d", bark: "#6b4a2b", shape: SHAPES.round,
};

function lookFor(species: string): PlantLook {
  const s = species.toLowerCase();
  if (PLANT_LOOKS[s]) return PLANT_LOOKS[s];
  for (const key of Object.keys(PLANT_LOOKS)) if (s.includes(key)) return PLANT_LOOKS[key];
  return DEFAULT_LOOK;
}

/**
 * Grow the right plant for a species, **at its measured height in metres**. Under
 * about waist height nothing has made a trunk yet, so every species starts as a
 * seedling — which is what a freshly planted sapling really looks like.
 */
function Plant({
  species, heightM, opacity, seed, mode,
}: {
  species: string; heightM: number; opacity: number; seed: number; mode: ViewMode;
}) {
  const look = lookFor(species);
  const height = Math.max(0.35, heightM);
  const wind = mode === "ultra" ? 1 : 0;

  if (height < 1.1) return <Seedling look={look} height={height} seed={seed} opacity={opacity} />;
  if (look.form === "palm") return <PalmPlant look={look} height={height} seed={seed} opacity={opacity} wind={wind} />;
  if (look.form === "banana") return <BananaPlant look={look} height={height} seed={seed} opacity={opacity} wind={wind} />;
  if (look.form === "papaya") return <PapayaPlant look={look} height={height} seed={seed} opacity={opacity} wind={wind} />;

  // On a low-end device, drop a branch generation: ~3x fewer limbs, same look.
  const shape = mode === "ultra" ? look.shape! : { ...look.shape!, levels: 2, children: 3 };
  return (
    <BroadleafPlant
      look={{ ...look, shape }} height={height} seed={seed} opacity={opacity} wind={wind}
      detail={mode === "ultra" ? 1 : 0}
    />
  );
}
/* A lightweight DOM billboard in 3D space via drei's Html. */
function Billboard({ position, children }: { position: [number, number, number]; children: React.ReactNode }) {
  return (
    <Html position={position} center distanceFactor={26} occlude={false} style={{ pointerEvents: "auto" }}>
      {children}
    </Html>
  );
}

function fmt(n: number): string {
  return n >= 1000 ? (n / 1000).toFixed(1) + "k" : Math.round(n).toString();
}
