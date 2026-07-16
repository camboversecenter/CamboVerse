import { useEffect, useMemo, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { Line, Html, OrbitControls } from "@react-three/drei";
import { Shape } from "three";
import { CAMBODIA_PROVINCES } from "../cambodia-provinces";
import { projectLatLng } from "../cambodia-outline";
import { spotsInProvince, prettyProvince, type Spot } from "../spots";
import { FARM_STAGES } from "../farm";
import { listPlots, getPlot, type SharedPlot } from "../lib/farmShare";
import type { District } from "../cambodia-districts";
import { loadCommunes, type Commune } from "../communes";

/** Ray-casting point-in-polygon on a map-plane ring [[x, z], …]. */
function pointInRing(x: number, z: number, ring: [number, number][]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0], zi = ring[i][1], xj = ring[j][0], zj = ring[j][1];
    if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
}
type Region = { rings: [number, number][][] };
const inRegion = (x: number, z: number, g: Region) => g.rings.some((r) => pointInRing(x, z, r));
function centroid(g: Region): [number, number] {
  const ring = g.rings.reduce((a, b) => (b.length > a.length ? b : a), g.rings[0]);
  let sx = 0, sz = 0;
  for (const [x, z] of ring) { sx += x; sz += z; }
  return [sx / ring.length, sz / ring.length];
}

/**
 * The province map — the second teleport tier. Tapping a province on the
 * national map lands here: that province drawn large (its neighbours faint for
 * orientation), with a marker for every heritage site inside it. Tapping a site
 * opens its points of interest in detail before you teleport in.
 *
 * District (ADM2) boundaries will subdivide each province here later — the data
 * slots straight into this same map plane (see TODO.md · "district boundaries").
 */
export function ProvinceView({
  provinceName,
  onBack,
  onEnterSite,
}: {
  provinceName: string;
  onBack: () => void;
  onEnterSite: (id: string) => void;
}) {
  const province = useMemo(
    () => CAMBODIA_PROVINCES.find((p) => p.name === provinceName) ?? null,
    [provinceName],
  );
  const sites = useMemo(() => (province ? spotsInProvince(province.name) : []), [province]);
  const [selected, setSelected] = useState<Spot | null>(null);

  // Shared living farms in this province (docs/LIVING_FARM.md).
  const [farms, setFarms] = useState<SharedPlot[]>([]);
  const [farm, setFarm] = useState<SharedPlot | null>(null);
  useEffect(() => {
    let live = true;
    setFarms([]);
    setFarm(null);
    if (province) listPlots(province.name).then((ps) => live && setFarms(ps));
    return () => {
      live = false;
    };
  }, [province]);

  // District (ADM2) boundaries — lazy-loaded (kept out of the initial bundle).
  const [districts, setDistricts] = useState<District[]>([]);
  const [activeD, setActiveD] = useState<District | null>(null);
  useEffect(() => {
    let live = true;
    setDistricts([]);
    setActiveD(null);
    if (province) {
      import("../cambodia-districts").then((m) => {
        if (live) setDistricts(m.CAMBODIA_DISTRICTS.filter((d) => d.province === province.pcode));
      });
    }
    return () => {
      live = false;
    };
  }, [province]);

  // Commune (ADM3) boundaries — the fourth tier, loaded only once a district is
  // opened (one province's communes at a time, ~30 KB).
  const [communes, setCommunes] = useState<Commune[]>([]);
  const [activeC, setActiveC] = useState<Commune | null>(null);
  useEffect(() => setActiveC(null), [activeD]);
  useEffect(() => {
    let live = true;
    if (activeD && communes.length === 0 && province) {
      loadCommunes(province.pcode).then((cs) => live && setCommunes(cs));
    }
    return () => {
      live = false;
    };
  }, [activeD, province, communes.length]);

  // Filled shapes + a camera framed on this province.
  const geo = useMemo(() => {
    if (!province) return null;
    const shapes = province.rings.map((ring) => {
      const s = new Shape();
      ring.forEach(([x, z], i) => (i === 0 ? s.moveTo(x, -z) : s.lineTo(x, -z)));
      s.closePath();
      return s;
    });
    const boundaries = province.rings.map((ring) =>
      [...ring, ring[0]].map(([x, z]) => [x, 0.06, z] as [number, number, number]),
    );
    const pts = province.rings.flat();
    const xs = pts.map((p) => p[0]);
    const zs = pts.map((p) => p[1]);
    const minX = Math.min(...xs), maxX = Math.max(...xs);
    const minZ = Math.min(...zs), maxZ = Math.max(...zs);
    const cx = (minX + maxX) / 2, cz = (minZ + maxZ) / 2;
    const r = Math.max(maxX - minX, maxZ - minZ) / 2 || 0.5;
    return { shapes, boundaries, cx, cz, r };
  }, [province]);

  if (!province || !geo) {
    return (
      <div className="prov">
        <div className="cls-top">
          <button className="backbtn" onClick={onBack}>← Map</button>
          <span className="cls-title">Province</span>
        </div>
        <div className="prov-hint"><p>Unknown province.</p></div>
      </div>
    );
  }

  const { shapes, boundaries, cx, cz, r } = geo;
  const camDist = r * 2.4 + 1.2;
  const markerScale = Math.max(0.12, r * 0.16);

  // Farm pin positions. Coarse geo collapses nearby farms to the same cell, so
  // fan out any that would land on top of each other (privacy is preserved —
  // this only separates the markers, it doesn't reveal a real location).
  const farmPos = useMemo(() => {
    const cell = new Map<string, number>();
    return farms.map((pl, i) => {
      let bx: number, bz: number;
      if (pl.geo) {
        const [x, z] = projectLatLng(pl.geo.lat, pl.geo.lng);
        bx = x; bz = z;
      } else {
        bx = cx + ((i % 3) - 1) * r * 0.3;
        bz = cz + (Math.floor(i / 3) - 1) * r * 0.3;
      }
      const key = `${Math.round(bx * 20)}_${Math.round(bz * 20)}`;
      const n = cell.get(key) ?? 0;
      cell.set(key, n + 1);
      if (n > 0) {
        const ang = n * 2.399; // golden angle
        bx += Math.cos(ang) * r * 0.16;
        bz += Math.sin(ang) * r * 0.16;
      }
      return [bx, 0, bz] as [number, number, number];
    });
  }, [farms, cx, cz, r]);

  // District fills (clickable) + boundary polylines + centroids for labels.
  const districtGeo = useMemo(
    () =>
      districts.map((d) => ({
        d,
        shapes: d.rings.map((ring) => {
          const s = new Shape();
          ring.forEach(([x, z], i) => (i === 0 ? s.moveTo(x, -z) : s.lineTo(x, -z)));
          s.closePath();
          return s;
        }),
        lines: d.rings.map((ring) => [...ring, ring[0]].map(([x, z]) => [x, 0.05, z] as [number, number, number])),
        center: centroid(d),
      })),
    [districts],
  );

  // Communes of the open district (finer borders + clickable fills).
  const districtCommunes = useMemo(
    () => (activeD ? communes.filter((c) => c.district === activeD.pcode) : []),
    [activeD, communes],
  );
  const communeGeo = useMemo(
    () =>
      districtCommunes.map((c) => ({
        c,
        lines: c.rings.map((ring) => [...ring, ring[0]].map(([x, z]) => [x, 0.055, z] as [number, number, number])),
        shapes: c.rings.map((ring) => {
          const s = new Shape();
          ring.forEach(([x, z], i) => (i === 0 ? s.moveTo(x, -z) : s.lineTo(x, -z)));
          s.closePath();
          return s;
        }),
      })),
    [districtCommunes],
  );

  // What falls inside the active region (district, or a commune within it) —
  // the "filter to an area" tiers.
  const contentsOf = (region: Region | null) => {
    if (!region) return { sites: [] as Spot[], farms: [] as SharedPlot[] };
    const s = sites.filter((sp) => {
      const [x, z] = projectLatLng(sp.lat, sp.lng);
      return inRegion(x, z, region);
    });
    const f = farms.filter((pl, i) => {
      const [x, z] = pl.geo ? projectLatLng(pl.geo.lat, pl.geo.lng) : [farmPos[i][0], farmPos[i][2]];
      return inRegion(x, z, region);
    });
    return { sites: s, farms: f };
  };
  const activeContents = useMemo(() => contentsOf(activeC ?? activeD), [activeC, activeD, sites, farms, farmPos]);

  const clearAll = () => { setSelected(null); setFarm(null); setActiveD(null); setActiveC(null); };
  const openFarm = async (pl: SharedPlot) => { setSelected(null); setFarm(await getPlot(pl.id) ?? pl); };

  return (
    <div className="prov">
      <Canvas
        dpr={[1, 2]}
        camera={{ position: [cx, camDist, cz + r * 0.85], fov: 45 }}
        gl={{ antialias: true }}
        onPointerMissed={clearAll}
      >
        <color attach="background" args={["#16232b"]} />
        <ambientLight intensity={0.8} />
        <hemisphereLight args={["#cfe0ff", "#1a2a20", 0.5]} />
        <directionalLight position={[cx + 3, 8, cz + 4]} intensity={1.0} />

        {/* Neighbouring provinces, faint, for orientation. */}
        {CAMBODIA_PROVINCES.filter((p) => p.name !== province.name).flatMap((p, pi) =>
          p.rings.map((ring, ri) => (
            <Line
              key={`n-${pi}-${ri}`}
              points={[...ring, ring[0]].map(([x, z]) => [x, 0.02, z] as [number, number, number])}
              color="#3a4a42"
              lineWidth={1}
              transparent
              opacity={0.4}
            />
          )),
        )}

        {/* This province: filled + a bold boundary. */}
        {shapes.map((s, i) => (
          <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]} receiveShadow>
            <shapeGeometry args={[s]} />
            <meshStandardMaterial color="#7c8a55" roughness={1} />
          </mesh>
        ))}
        {boundaries.map((b, i) => (
          <Line key={i} points={b} color="#e9e2c8" lineWidth={2.5} />
        ))}

        {/* District (ADM2) subdivisions — thin borders + clickable fills. */}
        {districtGeo.map(({ d, shapes: dsh, lines }) => {
          const on = activeD?.pcode === d.pcode;
          return (
            <group key={d.pcode}>
              {dsh.map((s, i) => (
                <mesh
                  key={i}
                  rotation={[-Math.PI / 2, 0, 0]}
                  position={[0, 0.05, 0]}
                  onClick={(e) => { e.stopPropagation(); setSelected(null); setFarm(null); setActiveD((p) => (p?.pcode === d.pcode ? null : d)); }}
                  onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = "pointer"; }}
                  onPointerOut={() => { document.body.style.cursor = "auto"; }}
                >
                  <shapeGeometry args={[s]} />
                  <meshBasicMaterial color="#efe0a8" transparent opacity={on ? 0.24 : 0} depthWrite={false} />
                </mesh>
              ))}
              {lines.map((l, i) => (
                <Line key={i} points={l} color={on ? "#f0e6c8" : "#5c6a46"} lineWidth={on ? 1.6 : 1} transparent opacity={on ? 0.9 : 0.55} />
              ))}
              {on && (
                <Html position={[d ? centroid(d)[0] : 0, 0.1, d ? centroid(d)[1] : 0]} center occlude={false}>
                  <span className="prov-dist-label">{d.name}</span>
                </Html>
              )}
            </group>
          );
        })}

        {/* Commune (ADM3) subdivisions of the open district — finer borders. */}
        {communeGeo.map(({ c, shapes: csh, lines }) => {
          const on = activeC?.pcode === c.pcode;
          return (
            <group key={c.pcode}>
              {csh.map((s, i) => (
                <mesh
                  key={i}
                  rotation={[-Math.PI / 2, 0, 0]}
                  position={[0, 0.055, 0]}
                  onClick={(e) => { e.stopPropagation(); setSelected(null); setFarm(null); setActiveC((p) => (p?.pcode === c.pcode ? null : c)); }}
                  onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = "pointer"; }}
                  onPointerOut={() => { document.body.style.cursor = "auto"; }}
                >
                  <shapeGeometry args={[s]} />
                  <meshBasicMaterial color="#bfe0bf" transparent opacity={on ? 0.32 : 0} depthWrite={false} />
                </mesh>
              ))}
              {lines.map((l, i) => (
                <Line key={i} points={l} color={on ? "#dcf0dc" : "#6f8a5c"} lineWidth={on ? 1.4 : 0.8} transparent opacity={on ? 0.9 : 0.42} />
              ))}
              {on && (
                <Html position={[centroid(c)[0], 0.12, centroid(c)[1]]} center occlude={false}>
                  <span className="prov-comm-label">{c.name}</span>
                </Html>
              )}
            </group>
          );
        })}

        {/* Heritage sites in this province. */}
        {sites.map((spot) => (
          <SiteMarker
            key={spot.id}
            spot={spot}
            scale={markerScale}
            selected={selected?.id === spot.id}
            onSelect={() => setSelected(spot)}
          />
        ))}

        {/* Living farms shared in this province (coarse location). */}
        {farms.map((pl, i) => (
          <FarmMarker
            key={pl.id}
            plot={pl}
            position={farmPos[i]}
            scale={markerScale}
            selected={farm?.id === pl.id}
            onSelect={async () => {
              setSelected(null);
              const detail = await getPlot(pl.id);
              setFarm(detail ?? pl);
            }}
          />
        ))}

        <OrbitControls
          enablePan={false}
          minDistance={camDist * 0.5}
          maxDistance={camDist * 1.8}
          maxPolarAngle={Math.PI / 2.2}
          enableDamping
          dampingFactor={0.08}
          target={[cx, 0, cz]}
        />
      </Canvas>

      {/* ---- HUD ---- */}
      <div className="cls-top">
        <button className="backbtn" onClick={onBack}>← Cambodia</button>
        <span className="cls-title">🗺️ {prettyProvince(province.name)}</span>
      </div>

      {farm ? (
        <FarmDetail plot={farm} onClose={() => setFarm(null)} />
      ) : selected ? (
        <SiteDetail spot={selected} onClose={() => setSelected(null)} onEnter={() => onEnterSite(selected.id)} />
      ) : activeC ? (
        <RegionPanel
          icon="🏡"
          name={activeC.name}
          kind="commune"
          sites={activeContents.sites}
          farms={activeContents.farms}
          onClose={() => setActiveC(null)}
          onSite={(s) => setSelected(s)}
          onFarm={openFarm}
        />
      ) : activeD ? (
        <RegionPanel
          icon="🏙️"
          name={activeD.name}
          kind="district"
          sub={districtCommunes.length > 0 ? `${districtCommunes.length} communes · tap one to zoom in` : undefined}
          sites={activeContents.sites}
          farms={activeContents.farms}
          onClose={() => setActiveD(null)}
          onSite={(s) => setSelected(s)}
          onFarm={openFarm}
        />
      ) : (
        <div className="prov-hint">
          <p>
            <b>{prettyProvince(province.name)}</b> ·{" "}
            {sites.length > 0
              ? `${sites.length} heritage ${sites.length === 1 ? "site" : "sites"}.`
              : "No heritage sites here yet."}
            {farms.length > 0 && (
              <>
                {" "}🌾 <b>{farms.length}</b> living {farms.length === 1 ? "farm" : "farms"}.
              </>
            )}
            {districts.length > 0 && (
              <>
                {" "}<b>{districts.length}</b> districts.
              </>
            )}
          </p>
          <p className="prov-hint-sub">
            {districts.length > 0
              ? "Tap a district, then a commune to zoom in — or a marker for a site's points of interest, or a 🌾 pin for a real farm's season."
              : "Tap a marker for a site's points of interest, or a 🌾 pin for a real farm's season."}
          </p>
        </div>
      )}
    </div>
  );
}

/** Bottom sheet for a tapped district or commune — the "filter to an area" tiers. */
function RegionPanel({
  icon,
  name,
  kind,
  sub,
  sites,
  farms,
  onClose,
  onSite,
  onFarm,
}: {
  icon: string;
  name: string;
  kind: string;
  sub?: string;
  sites: Spot[];
  farms: SharedPlot[];
  onClose: () => void;
  onSite: (s: Spot) => void;
  onFarm: (p: SharedPlot) => void;
}) {
  const empty = sites.length === 0 && farms.length === 0;
  return (
    <div className="prov-detail">
      <button className="cls-close" onClick={onClose} aria-label="Close">✕</button>
      <div className="prov-detail-head">
        <h2>{icon} {name}</h2>
      </div>
      <p className="prov-blurb">
        {sites.length} heritage {sites.length === 1 ? "site" : "sites"} · 🌾 {farms.length} living{" "}
        {farms.length === 1 ? "farm" : "farms"} in this {kind}.{sub ? ` · ${sub}` : ""}
      </p>
      {empty ? (
        <p className="prov-nopoi">Nothing mapped in this {kind} yet — add a site (see TODO.md) or share your farm.</p>
      ) : (
        <ul className="prov-dist-list">
          {sites.map((s) => (
            <li key={s.id}>
              <button className="prov-dist-item" onClick={() => onSite(s)}>
                <span>📍 {s.name} <span className="khmer">{s.khmer}</span></span>
                <span className="prov-dist-go">›</span>
              </button>
            </li>
          ))}
          {farms.map((p) => (
            <li key={p.id}>
              <button className="prov-dist-item" onClick={() => onFarm(p)}>
                <span>🌾 {p.name}</span>
                <span className="prov-dist-go">›</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** A site marker on the province map — tap to reveal its points of interest. */
function SiteMarker({
  spot,
  scale,
  selected,
  onSelect,
}: {
  spot: Spot;
  scale: number;
  selected: boolean;
  onSelect: () => void;
}) {
  const [hover, setHover] = useState(false);
  const [px, pz] = projectLatLng(spot.lat, spot.lng);
  // The national-map `nudge` fans out clustered pins for legibility; at province
  // zoom it over-pushes (Banteay Srei off the border), so apply it at half.
  const [nx, nz] = spot.nudge ?? [0, 0];
  const color = spot.live ? "#c8912e" : "#8b9099";
  const poiCount = spot.pois?.length ?? 0;

  return (
    <group
      position={[px + nx * 0.5, 0, pz + nz * 0.5]}
      scale={(hover || selected ? 1.15 : 1) * scale}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHover(true);
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        setHover(false);
        document.body.style.cursor = "auto";
      }}
    >
      <mesh position={[0, 0.9, 0]}>
        <cylinderGeometry args={[0.5, 0.5, 1.8, 8]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>
      <mesh position={[0, 0.55, 0]}>
        <cylinderGeometry args={[0.06, 0.06, 1.1, 8]} />
        <meshStandardMaterial color={color} roughness={0.6} />
      </mesh>
      <mesh position={[0, 1.2, 0]}>
        <sphereGeometry args={[0.22, 18, 18]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={selected ? 0.6 : hover ? 0.4 : 0.18}
          roughness={0.4}
        />
      </mesh>

      <Html position={[0, 1.9, 0]} center occlude={false}>
        <button
          className="prov-label"
          onClick={(e) => {
            e.stopPropagation();
            onSelect();
          }}
          style={{ borderColor: spot.live ? "rgba(200,145,46,0.7)" : "rgba(139,144,153,0.5)" }}
        >
          {spot.name}
          {poiCount > 0 && <span className="prov-label-count">{poiCount}</span>}
        </button>
      </Html>
    </group>
  );
}

/** A living-farm marker (🌾) on the province map. */
function FarmMarker({
  plot,
  position,
  scale,
  selected,
  onSelect,
}: {
  plot: SharedPlot;
  position: [number, number, number];
  scale: number;
  selected: boolean;
  onSelect: () => void;
}) {
  const [hover, setHover] = useState(false);
  const stage = FARM_STAGES.reduce((best, s) =>
    Math.abs(s.growth - (plot.latestGrowth ?? 0.5)) < Math.abs(best.growth - (plot.latestGrowth ?? 0.5)) ? s : best,
  );
  const color = stage.color;
  return (
    <group
      position={position}
      scale={(hover || selected ? 1.15 : 1) * scale}
      onClick={(e) => { e.stopPropagation(); onSelect(); }}
      onPointerOver={(e) => { e.stopPropagation(); setHover(true); document.body.style.cursor = "pointer"; }}
      onPointerOut={() => { setHover(false); document.body.style.cursor = "auto"; }}
    >
      <mesh position={[0, 0.9, 0]}>
        <cylinderGeometry args={[0.5, 0.5, 1.8, 8]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>
      <mesh position={[0, 0.55, 0]}>
        <cylinderGeometry args={[0.06, 0.06, 1.1, 8]} />
        <meshStandardMaterial color={color} roughness={0.6} />
      </mesh>
      {/* a little paddy patch as the pin head */}
      <mesh position={[0, 1.15, 0]}>
        <boxGeometry args={[0.34, 0.14, 0.34]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={selected ? 0.5 : hover ? 0.35 : 0.15} roughness={0.5} />
      </mesh>
      <Html position={[0, 1.85, 0]} center occlude={false}>
        <button
          className="prov-label prov-label-farm"
          onClick={(e) => { e.stopPropagation(); onSelect(); }}
        >
          🌾 {plot.name}
        </button>
      </Html>
    </group>
  );
}

/** Bottom sheet: a shared farm's season — photos + stage, scrub the timeline. */
function FarmDetail({ plot, onClose }: { plot: SharedPlot; onClose: () => void }) {
  const [i, setI] = useState(Math.max(0, (plot.checkins?.length ?? 1) - 1));
  const checks = plot.checkins ?? [];
  const c = checks[Math.min(i, checks.length - 1)];
  const st = c ? FARM_STAGES.find((s) => s.id === c.stageId) : undefined;
  return (
    <div className="prov-detail">
      <button className="cls-close" onClick={onClose} aria-label="Close">✕</button>
      <div className="prov-detail-head">
        <h2>🌾 {plot.name}</h2>
      </div>
      <p className="prov-blurb">
        {prettyProvince(plot.province)}
        {plot.variety ? ` · ${plot.variety}` : ""} — a real farm's season, shared to the commons.
      </p>
      {c ? (
        <>
          <div className="prov-farm-view">
            {c.photo && <img className="prov-farm-photo" src={c.photo} alt={`${plot.name} on ${c.takenOn}`} />}
            <div className="prov-farm-meta">
              <div className="prov-farm-stage" style={{ color: st?.color }}>
                {st?.emoji} <span className="khmer">{st?.khmer}</span> · {st?.english}
              </div>
              <div className="prov-farm-date">{c.takenOn}</div>
              {c.note && <div className="prov-farm-note">“{c.note}”</div>}
            </div>
          </div>
          {checks.length > 1 && (
            <div className="farm-scrub">
              <span className="farm-scrub-cap">{Math.min(i, checks.length - 1) + 1} / {checks.length}</span>
              <input
                type="range"
                min={0}
                max={checks.length - 1}
                value={Math.min(i, checks.length - 1)}
                onChange={(e) => setI(Number(e.target.value))}
                aria-label="Scrub the season"
              />
            </div>
          )}
        </>
      ) : (
        <p className="prov-nopoi">No approved photos yet.</p>
      )}
      <p className="prov-farm-credit">Shared CC-BY · location shown to village level only.</p>
    </div>
  );
}

/** Bottom sheet: a site's story + its points of interest, then a teleport in. */
function SiteDetail({ spot, onClose, onEnter }: { spot: Spot; onClose: () => void; onEnter: () => void }) {
  return (
    <div className="prov-detail">
      <button className="cls-close" onClick={onClose} aria-label="Close">✕</button>
      <div className="prov-detail-head">
        <h2>
          {spot.name} <span className="khmer">{spot.khmer}</span>
        </h2>
        {!spot.live && <span className="prov-soon">coming soon</span>}
      </div>
      <p className="prov-blurb">{spot.blurb}</p>

      {spot.pois && spot.pois.length > 0 ? (
        <>
          <h3>Points of interest · {spot.pois.length}</h3>
          <ul className="prov-pois">
            {spot.pois.map((poi) => (
              <li key={poi.id}>
                <span className="prov-poi-title">
                  {poi.title} {poi.khmer && <span className="khmer">{poi.khmer}</span>}
                </span>
                <span className="prov-poi-info">{poi.info}</span>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="prov-nopoi">Points of interest for this site haven't been authored yet — a great way to help.</p>
      )}

      <button className="prov-enter" onClick={onEnter} disabled={!spot.live}>
        {spot.live ? `Teleport into ${spot.name} →` : "Experience coming soon"}
      </button>
    </div>
  );
}
