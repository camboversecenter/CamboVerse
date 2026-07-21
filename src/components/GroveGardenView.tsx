import { useEffect, useMemo, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Html } from "@react-three/drei";
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
        <OrbitControls
          enablePan={false}
          minDistance={5}
          maxDistance={22}
          maxPolarAngle={Math.PI / 2.15}
          enableDamping
          target={[0, 1.2, 0]}
        />
      </Canvas>

      <div className="cls-top">
        <button className="backbtn" onClick={onBackToMap}>← Map</button>
        <span className="cls-title">🌱 Grove Garden</span>
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
            <div className="grove-row"><span>Species</span><b>{sel.species} · {sel.count}×</b></div>
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
          <b>{plot.species}</b> ·{plot.count}
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

/* ---------------- procedural trees ---------------- */

function Tree({ species, stage, opacity, seed }: { species: string; stage: number; opacity: number; seed: number }) {
  const s = species.toLowerCase();
  if (s.includes("coconut") || s.includes("palm")) return <CoconutPalm stage={stage} opacity={opacity} />;
  if (s.includes("banana")) return <BananaPlant stage={stage} opacity={opacity} />;
  return <BroadleafTree stage={stage} opacity={opacity} seed={seed} tint={s.includes("mango") ? "#3f7d34" : "#4c8a3f"} />;
}

function mat(color: string, opacity: number, extra: Record<string, unknown> = {}) {
  return <meshStandardMaterial color={color} roughness={0.85} transparent opacity={opacity} {...extra} />;
}

function BroadleafTree({ stage, opacity, seed, tint }: { stage: number; opacity: number; seed: number; tint: string }) {
  const h = 0.6 + stage * 2.6;
  const canopy = 0.5 + stage * 1.0;
  const wob = ((seed % 5) - 2) * 0.05;
  return (
    <group>
      <mesh position={[0, h / 2, 0]} castShadow>
        <cylinderGeometry args={[0.06 + stage * 0.1, 0.09 + stage * 0.13, h, 7]} />
        {mat("#6b4a2b", opacity)}
      </mesh>
      <mesh position={[wob, h + canopy * 0.3, 0]} castShadow>
        <sphereGeometry args={[canopy, 12, 12]} />
        {mat(tint, opacity)}
      </mesh>
      <mesh position={[-wob * 0.8, h + canopy * 0.7, wob]} castShadow>
        <sphereGeometry args={[canopy * 0.7, 12, 12]} />
        {mat("#579a48", opacity)}
      </mesh>
    </group>
  );
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
        <mesh position={[0, 0.05, 0]}>
          <sphereGeometry args={[0.16, 8, 8]} />
          {mat("#7a5a2a", opacity)}
        </mesh>
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
