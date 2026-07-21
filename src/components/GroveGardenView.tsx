import { useEffect, useMemo, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Html } from "@react-three/drei";
import { createXRStore, XR, XROrigin, useXR } from "@react-three/xr";
import { importBundle, importBundleFile } from "../grove/bundle";
import { GroveClient, DEFAULT_NODE, type VerifiedRecord } from "../grove/client";
import {
  buildPlots, gardenTotals, growthAt, trustOpacity, type GrovePlot,
} from "../grove/garden";
import demoBundle from "../grove/fixtures/grove-bundle.json";

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
      <Canvas dpr={[1, 2]} camera={{ position: [0, 6, 13], fov: 45 }} gl={{ antialias: true }} shadows>
        <XR store={store}>
          <color attach="background" args={["#bfe0d6"]} />
          <fog attach="fog" args={["#bfe0d6", 16, 34]} />
          <ambientLight intensity={0.8} />
          <hemisphereLight args={["#eaffe6", "#5a7a3a", 0.55]} />
          <directionalLight position={[6, 12, 6]} intensity={1.1} castShadow shadow-mapSize={[1024, 1024]} />
          {/* ground */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
            <planeGeometry args={[60, 60]} />
            <meshStandardMaterial color="#8bbf6a" roughness={1} />
          </mesh>
          {plots.map((p, i) => (
            <PlotParcel
              key={p.id}
              plot={p}
              index={i}
              total={plots.length}
              now={now}
              selected={p.id === selected}
              onSelect={() => setSelected(p.id === selected ? null : p.id)}
            />
          ))}
          {/* In VR, stand back on the ground and look along the row of plots. */}
          <XROrigin position={[0, 0, 8]} />
          <GardenControls />
        </XR>
      </Canvas>

      <div className="cls-top">
        <button className="backbtn" onClick={onBackToMap}>← Map</button>
        <span className="cls-title">🌱 Grove Garden</span>
        {vrSupported && <button className="vr-btn cls-vr" onClick={() => store.enterVR()}>🥽 VR</button>}
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

/** Orbit controls for the 2D view; disabled inside an immersive XR session
 *  (there the headset drives the camera and XROrigin places the viewer). */
function GardenControls() {
  const inXR = useXR((s) => s.session != null);
  if (inXR) return null;
  return (
    <OrbitControls
      enablePan={false}
      minDistance={5}
      maxDistance={22}
      maxPolarAngle={Math.PI / 2.15}
      enableDamping
      target={[0, 1.2, 0]}
    />
  );
}

/* ---------------- one plot parcel in the 3D world ---------------- */

function PlotParcel({
  plot, index, total, now, selected, onSelect,
}: {
  plot: GrovePlot;
  index: number;
  total: number;
  now: number;
  selected: boolean;
  onSelect: () => void;
}) {
  const spacing = 4.2;
  const x = (index - (total - 1) / 2) * spacing;

  // Flatten every plant in the plot (across all growth chains and their `count`)
  // into one list, then lay them out so nothing overlaps — a plot may hold
  // several separate plantings, not just one chain.
  const trees: { key: string; species: string; stage: number; opacity: number }[] = [];
  plot.chains.forEach((chain, ci) => {
    const g = growthAt(chain, now);
    if (!g.record) return;
    const n = Math.min(6, g.record.observation.count);
    for (let k = 0; k < n; k++) {
      trees.push({
        key: `${ci}:${k}`,
        species: g.record.observation.species,
        stage: g.stage,
        opacity: trustOpacity(g.record.trust),
      });
    }
  });
  const spots = layoutSpots(trees.length);

  return (
    <group position={[x, 0, 0]}>
      {/* soil pad */}
      <mesh position={[0, 0, 0]} onClick={onSelect} receiveShadow>
        <cylinderGeometry args={[1.7, 1.8, 0.16, 28]} />
        <meshStandardMaterial color={selected ? "#8a6a3a" : "#7a5636"} roughness={1} />
      </mesh>
      {/* trees, spread across the pad */}
      {trees.map((tr, i) => (
        <group key={tr.key} position={[spots[i][0], 0.08, spots[i][1]]}>
          <Tree species={tr.species} stage={tr.stage} opacity={tr.opacity} seed={index * 7 + i} />
        </group>
      ))}
      {/* floating label */}
      <Billboard position={[0, 3.6, 0]}>
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
    spots.push([Math.cos(a) * 1.05, Math.sin(a) * 1.05]);
  }
  for (let i = ringCount; i < n; i++) {
    const a = ((i - ringCount) / Math.max(1, n - ringCount)) * Math.PI * 2 + 0.4;
    spots.push([Math.cos(a) * 0.5, Math.sin(a) * 0.5]);
  }
  return spots;
}

/* ---------------- procedural trees, by plant type ---------------- */

/** How a broadleaf species is shaped — canopy silhouette, colours, fruit. */
interface Broadleaf {
  form: "broadleaf";
  canopy: "round" | "oval" | "umbrella";
  leaf: string;
  leaf2: string;
  trunk: string;
  trunkThick: number;
  fruit?: { color: string; size: number; where: "canopy" | "trunk"; count: number };
}
type Style = Broadleaf | { form: "palm" } | { form: "banana" } | { form: "papaya" };

/**
 * A plant is drawn from its *species*, so a jackfruit (big fruit on the trunk),
 * a mango (dense round crown), a tamarind (wide feathery umbrella), a coconut
 * (palm), a banana and a papaya all read differently. Extend freely — the Grove
 * species list is open.
 */
const PLANT_STYLES: Record<string, Style> = {
  coconut: { form: "palm" },
  palm: { form: "palm" },
  banana: { form: "banana" },
  papaya: { form: "papaya" },
  mango: { form: "broadleaf", canopy: "round", leaf: "#2f6d2e", leaf2: "#3f8a34", trunk: "#6b4a2b", trunkThick: 1.1, fruit: { color: "#e0a52f", size: 0.12, where: "canopy", count: 6 } },
  jackfruit: { form: "broadleaf", canopy: "oval", leaf: "#356b30", leaf2: "#4a8a3a", trunk: "#6f5233", trunkThick: 1.25, fruit: { color: "#9caa3a", size: 0.3, where: "trunk", count: 3 } },
  tamarind: { form: "broadleaf", canopy: "umbrella", leaf: "#6f9a4a", leaf2: "#86ab5c", trunk: "#5f4630", trunkThick: 1.3 },
  teak: { form: "broadleaf", canopy: "oval", leaf: "#4f8a3c", leaf2: "#6aa24a", trunk: "#7a5a38", trunkThick: 1.15 },
  longan: { form: "broadleaf", canopy: "round", leaf: "#3c7a3a", leaf2: "#4f9a48", trunk: "#6b4a2b", trunkThick: 1, fruit: { color: "#b98a52", size: 0.08, where: "canopy", count: 8 } },
  guava: { form: "broadleaf", canopy: "round", leaf: "#5a9a4a", leaf2: "#7ab35c", trunk: "#8a7050", trunkThick: 0.8, fruit: { color: "#cdd08a", size: 0.1, where: "canopy", count: 4 } },
};
const DEFAULT_STYLE: Broadleaf = {
  form: "broadleaf", canopy: "round", leaf: "#4c8a3f", leaf2: "#579a48", trunk: "#6b4a2b", trunkThick: 1,
};

function styleFor(species: string): Style {
  const s = species.toLowerCase();
  if (PLANT_STYLES[s]) return PLANT_STYLES[s];
  for (const key of Object.keys(PLANT_STYLES)) if (s.includes(key)) return PLANT_STYLES[key];
  return DEFAULT_STYLE;
}

function Tree({ species, stage, opacity, seed }: { species: string; stage: number; opacity: number; seed: number }) {
  const style = styleFor(species);
  if (style.form === "palm") return <CoconutPalm stage={stage} opacity={opacity} />;
  if (style.form === "banana") return <BananaPlant stage={stage} opacity={opacity} />;
  if (style.form === "papaya") return <PapayaPlant stage={stage} opacity={opacity} />;
  return <BroadleafTree stage={stage} opacity={opacity} seed={seed} style={style} />;
}

function mat(color: string, opacity: number, extra: Record<string, unknown> = {}) {
  return <meshStandardMaterial color={color} roughness={0.85} transparent opacity={opacity} {...extra} />;
}

function BroadleafTree({ stage, opacity, seed, style }: { stage: number; opacity: number; seed: number; style: Broadleaf }) {
  const h = 0.6 + stage * 2.6;
  const canopy = 0.5 + stage * 1.0;
  const wob = ((seed % 5) - 2) * 0.05;
  // canopy silhouette per species
  const scale: [number, number, number] =
    style.canopy === "umbrella" ? [1.5, 0.55, 1.5] : style.canopy === "oval" ? [0.85, 1.3, 0.85] : [1, 1, 1];
  const cy = h + canopy * (style.canopy === "umbrella" ? 0.15 : style.canopy === "oval" ? 0.5 : 0.3);

  const fruitNodes = style.fruit ? fruitPositions(style.fruit, h, cy, canopy, scale, seed) : [];

  return (
    <group>
      {/* trunk */}
      <mesh position={[0, h / 2, 0]} castShadow>
        <cylinderGeometry args={[(0.06 + stage * 0.1) * style.trunkThick, (0.09 + stage * 0.13) * style.trunkThick, h, 8]} />
        {mat(style.trunk, opacity)}
      </mesh>
      {/* canopy */}
      <mesh position={[wob, cy, 0]} scale={scale} castShadow>
        <sphereGeometry args={[canopy, 12, 12]} />
        {mat(style.leaf, opacity)}
      </mesh>
      <mesh position={[-wob * 0.8, cy + canopy * 0.35, wob]} scale={scale.map((v) => v * 0.7) as [number, number, number]} castShadow>
        <sphereGeometry args={[canopy * 0.7, 12, 12]} />
        {mat(style.leaf2, opacity)}
      </mesh>
      {/* fruit — clustered on the trunk (jackfruit) or scattered in the canopy */}
      {fruitNodes.map((f, i) => (
        <mesh key={i} position={f} scale={style.fruit!.where === "trunk" ? [1, 1.5, 1] : [1, 1, 1]} castShadow>
          <sphereGeometry args={[style.fruit!.size, 8, 8]} />
          {mat(style.fruit!.color, opacity)}
        </mesh>
      ))}
    </group>
  );
}

/** Fruit placement: scattered in the canopy, or clustered on the trunk
 *  (jackfruit's cauliflory — its hallmark). */
function fruitPositions(
  fruit: NonNullable<Broadleaf["fruit"]>,
  h: number, cy: number, canopy: number,
  scale: [number, number, number], seed: number,
): [number, number, number][] {
  const out: [number, number, number][] = [];
  for (let i = 0; i < fruit.count; i++) {
    if (fruit.where === "trunk") {
      const a = (i / fruit.count) * Math.PI * 2 + seed;
      const ty = h * (0.25 + 0.5 * ((i % 2) / 1));
      out.push([Math.cos(a) * 0.16, ty, Math.sin(a) * 0.16]);
    } else {
      const a = (i / fruit.count) * Math.PI * 2 + seed;
      const rr = canopy * 0.85;
      out.push([Math.cos(a) * rr * scale[0], cy + Math.sin(i * 1.7) * canopy * 0.4, Math.sin(a) * rr * scale[2]]);
    }
  }
  return out;
}

function CoconutPalm({ stage, opacity }: { stage: number; opacity: number }) {
  const h = 1 + stage * 3.4;
  const fronds = 7;
  return (
    <group>
      <mesh position={[0, h / 2, 0]} castShadow>
        <cylinderGeometry args={[0.07, 0.12, h, 7]} />
        {mat("#9a7b4a", opacity)}
      </mesh>
      <group position={[0, h, 0]}>
        {Array.from({ length: fronds }).map((_, i) => {
          const a = (i / fronds) * Math.PI * 2;
          return (
            <mesh key={i} position={[Math.cos(a) * 0.5, 0.1, Math.sin(a) * 0.5]} rotation={[0, -a, 0.9]} castShadow>
              <boxGeometry args={[1.5 * (0.6 + stage * 0.5), 0.04, 0.28]} />
              {mat("#3f8a44", opacity)}
            </mesh>
          );
        })}
        {/* coconuts */}
        {[0, 1, 2].map((i) => (
          <mesh key={i} position={[Math.cos(i * 2.1) * 0.14, -0.02, Math.sin(i * 2.1) * 0.14]}>
            <sphereGeometry args={[0.1, 8, 8]} />
            {mat("#7a5a2a", opacity)}
          </mesh>
        ))}
      </group>
    </group>
  );
}

function PapayaPlant({ stage, opacity }: { stage: number; opacity: number }) {
  const h = 0.8 + stage * 2.6;
  const leaves = 7;
  return (
    <group>
      <mesh position={[0, h / 2, 0]} castShadow>
        <cylinderGeometry args={[0.06, 0.11, h, 7]} />
        {mat("#8a9a5a", opacity)}
      </mesh>
      {/* fruit ring hugging the upper trunk */}
      {Array.from({ length: 5 }).map((_, i) => {
        const a = (i / 5) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.cos(a) * 0.13, h - 0.25, Math.sin(a) * 0.13]}>
            <sphereGeometry args={[0.11, 8, 8]} />
            {mat("#c9b23a", opacity)}
          </mesh>
        );
      })}
      {/* palmate leaf crown */}
      <group position={[0, h, 0]}>
        {Array.from({ length: leaves }).map((_, i) => {
          const a = (i / leaves) * Math.PI * 2;
          return (
            <mesh key={i} position={[Math.cos(a) * 0.35, 0.05, Math.sin(a) * 0.35]} rotation={[0, -a, 0.6]} scale={[1, 0.12, 1]}>
              <sphereGeometry args={[0.42 * (0.6 + stage * 0.5), 8, 8]} />
              {mat("#3f8a3f", opacity)}
            </mesh>
          );
        })}
      </group>
    </group>
  );
}

function BananaPlant({ stage, opacity }: { stage: number; opacity: number }) {
  const h = 0.5 + stage * 1.6;
  return (
    <group>
      <mesh position={[0, h / 2, 0]} castShadow>
        <cylinderGeometry args={[0.1, 0.14, h, 7]} />
        {mat("#5f8a3a", opacity)}
      </mesh>
      {Array.from({ length: 5 }).map((_, i) => {
        const a = (i / 5) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.cos(a) * 0.4, h, Math.sin(a) * 0.4]} rotation={[0, -a, 0.5]}>
            <boxGeometry args={[1.1, 0.02, 0.4]} />
            {mat("#4c9a3a", opacity)}
          </mesh>
        );
      })}
    </group>
  );
}

/* A lightweight DOM billboard in 3D space via drei's Html. */
function Billboard({ position, children }: { position: [number, number, number]; children: React.ReactNode }) {
  return (
    <Html position={position} center distanceFactor={10} occlude={false} style={{ pointerEvents: "auto" }}>
      {children}
    </Html>
  );
}

function fmt(n: number): string {
  return n >= 1000 ? (n / 1000).toFixed(1) + "k" : Math.round(n).toString();
}
