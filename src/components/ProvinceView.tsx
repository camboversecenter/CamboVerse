import { useEffect, useMemo, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { Line, Html, OrbitControls } from "@react-three/drei";
import { Shape } from "three";
import { CAMBODIA_PROVINCES } from "../cambodia-provinces";
import { projectLatLng } from "../cambodia-outline";
import { spotsInProvince, prettyProvince, type Spot } from "../spots";
import { FARM_STAGES } from "../farm";
import { listPlots, getPlot, type SharedPlot } from "../lib/farmShare";

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

  return (
    <div className="prov">
      <Canvas dpr={[1, 2]} camera={{ position: [cx, camDist, cz + r * 0.85], fov: 45 }} gl={{ antialias: true }}>
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
      ) : (
        <div className="prov-hint">
          <p>
            <b>{prettyProvince(province.name)}</b> ·{" "}
            {sites.length > 0
              ? `${sites.length} heritage ${sites.length === 1 ? "site" : "sites"}. Tap a marker to see its points of interest.`
              : "No heritage sites here yet."}
            {farms.length > 0 && (
              <>
                {" "}🌾 <b>{farms.length}</b> living {farms.length === 1 ? "farm" : "farms"}.
              </>
            )}
          </p>
          <p className="prov-hint-sub">
            {sites.length === 0 && farms.length === 0
              ? "Help put this province on the map — add a site (see TODO.md), or share your farm in the Virtual Farm."
              : "Tap a green 🌾 pin to watch a real farm's season. District boundaries are coming soon."}
          </p>
        </div>
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
