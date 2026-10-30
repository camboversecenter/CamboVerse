import { useState } from "react";
import { Canvas } from "@react-three/fiber";
import { ExploreControls as OrbitControls } from './ExploreControls';
import { CambodiaMap } from "./CambodiaMap";
import { Pin } from "./Pin";
import { Passport } from "./Passport";
import { SPOTS } from "../spots";
import { LandmarkArt } from "./LandmarkArt";

const SITE_GROUPS = [...new Set(SPOTS.map((spot) => spot.province))].map((province) => {
  const sites = SPOTS.filter((spot) => spot.province === province);
  return {
    province,
    sites,
    lat: sites.reduce((sum, spot) => sum + spot.lat, 0) / sites.length,
    lng: sites.reduce((sum, spot) => sum + spot.lng, 0) / sites.length,
    // These two nearby southern groups need a little cartographic separation.
    offset: province === "Phnom Penh" ? [0.38, 0.08] as [number, number]
      : province === "Kampong Speu" ? [-0.55, -0.08] as [number, number]
      : [0, 0] as [number, number],
    labelOffset: ({
      "Siem Reap": [-15, 22],
      "Preah Vihear": [28, -18],
      "Phnom Penh": [42, 17],
      "Kampong Thom": [48, -4],
      "Banteay Meanchey": [-6, -45],
      "Kampong Speu": [-48, -7],
    } as Record<string, [number, number]>)[province] ?? [0, 0] as [number, number],
  };
});

function detectMapDetail(): "normal" | "ultra" {
  if (typeof navigator === "undefined" || typeof window === "undefined") return "normal";
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 4;
  const small = Math.min(window.screen.width, window.screen.height) < 500;
  return navigator.hardwareConcurrency <= 4 || memory <= 3 || small ? "normal" : "ultra";
}

/** The hub: an explorable map of Cambodia with a pin per heritage site. */
export function MapView({
  onEnter,
  onEnterProvince,
  onOpenTools,
  onOpenClassroom,
  onOpenKunKhmer,
  onOpenGames,
  onOpenFarm,
  onOpenMeditation,
  onOpenVillage,
  onOpenFashion,
  onOpenSakYant,
  onOpenGrove,
  onOpenBuildings,
  onOpenLab,
  onOpenCeremonies,
  onOpenProvinceSongs,
  onOpenPanorama,
}: {
  onEnter: (id: string) => void;
  onEnterProvince: (name: string) => void;
  onOpenTools: () => void;
  onOpenClassroom: () => void;
  onOpenKunKhmer: () => void;
  onOpenGames: () => void;
  onOpenFarm: () => void;
  onOpenMeditation: () => void;
  onOpenVillage: () => void;
  onOpenFashion: () => void;
  onOpenSakYant: () => void;
  onOpenGrove: () => void;
  onOpenBuildings: () => void;
  onOpenLab: () => void;
  onOpenCeremonies: () => void;
  onOpenProvinceSongs: () => void;
  onOpenPanorama?: () => void;
}) {
  const [passportOpen, setPassportOpen] = useState(false);
  const [detail, setDetail] = useState<"normal" | "ultra">(detectMapDetail);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedProvince, setSelectedProvince] = useState<string | null>(null);
  const [sitesOpen, setSitesOpen] = useState(false);
  const [siteQuery, setSiteQuery] = useState("");
  const [featuresOpen, setFeaturesOpen] = useState(false);
  const selectedSpot = SPOTS.find((spot) => spot.id === selectedId);
  const query = siteQuery.trim().toLowerCase();
  const visibleGroups = SITE_GROUPS
    .filter((group) => !selectedProvince || group.province === selectedProvince)
    .map((group) => ({
      ...group,
      sites: query && !group.province.toLowerCase().includes(query)
        ? group.sites.filter((site) => site.name.toLowerCase().includes(query))
        : group.sites,
    }))
    .filter((group) => group.sites.length > 0);
  const selectProvinceGroup = (province: string) => {
    setSelectedId(null);
    setSelectedProvince(province);
    setSiteQuery("");
    setSitesOpen(true);
    setFeaturesOpen(false);
  };
  return (
    <>
      <div className="viewer">
        <Canvas
          dpr={detail === "ultra" ? [1, 2] : 1}
          camera={{ position: [0, 13, 4.2], fov: 45 }}
          gl={{ antialias: detail === "ultra", powerPreference: "high-performance" }}
        >
          <color attach="background" args={["#16232b"]} />
          <fog attach="fog" args={["#16232b", 18, 34]} />

          {/* Scale the map to fit a portrait phone viewport. */}
          <group scale={0.55}>
            <CambodiaMap onSelectProvince={onEnterProvince} detail={detail} />
            {SITE_GROUPS.map((group) => <Pin key={group.province}
              province={group.province}
              siteId={group.sites[0].id}
              lat={group.lat}
              lng={group.lng}
              offset={group.offset}
              labelOffset={group.labelOffset}
              count={group.sites.length}
              selected={selectedProvince === group.province}
              onSelect={selectProvinceGroup}
            />)}
          </group>

          <ambientLight intensity={0.7} />
          <hemisphereLight args={["#cfe0ff", "#1a2a20", 0.5]} />
          <directionalLight position={[4, 10, 6]} intensity={1.1} />

          <OrbitControls
            enablePan
            minDistance={7}
            maxDistance={16}
            maxPolarAngle={Math.PI / 2.3}
            enableDamping
            dampingFactor={0.08}
            target={[0, 0, 0]}
          />
        </Canvas>
      </div>

      <div className="hud map-hud" aria-live="polite">
        {selectedSpot ? (
          <>
            <span className="tag">{selectedSpot.province} · {selectedSpot.live ? "Explore now" : "Coming soon"}</span>
            <div className="map-selected-title"><LandmarkArt siteId={selectedSpot.id} /><h1>{selectedSpot.name}</h1></div>
            <p>{selectedSpot.blurb}</p>
            <div className="map-hud-actions">
              <button type="button" onClick={() => onEnter(selectedSpot.id)}>Explore {selectedSpot.name}</button>
              <button type="button" onClick={() => { setSelectedId(null); setSelectedProvince(null); }} aria-label="Close selected site">✕</button>
            </div>
          </>
        ) : (
          <>
            <span className="tag">Explore Cambodia · Prototype</span>
            <h1>Choose a province or place</h1>
            <p>Tap a province marker to browse its places, or open Places to find a specific site.</p>
            <p className="map-relief-note">Illustrative relief · generalized waterways. Tonlé Sap’s shoreline changes with the seasons.</p>
          </>
        )}
      </div>

      <button
        type="button"
        className="map-sites-toggle"
        aria-expanded={sitesOpen}
        aria-controls="map-sites-list"
        onClick={() => { setSitesOpen((open) => !open); setSelectedProvince(null); setSiteQuery(""); setFeaturesOpen(false); }}
      >
        Places <span>{SPOTS.length}</span>
      </button>
      <a className="map-vr-shortcut" href="?site=wat-phnom">🥽 Wat Phnom VR</a>
      {sitesOpen && (
        <nav id="map-sites-list" className="map-sites-list" aria-label="Heritage places">
          <div className="map-sites-heading">{selectedProvince ? "Places in this province" : "Province · featured places"}</div>
          <input type="search" className="map-sites-search" aria-label="Search places by name"
            placeholder="Search places by name" value={siteQuery} onChange={(event) => setSiteQuery(event.target.value)} />
          {visibleGroups.length === 0 && <p className="map-sites-empty">No matching places. Try another name.</p>}
          {visibleGroups.map((group) => (
            <div key={group.province} className="map-site-group">
              <div className="map-group-heading">
                <span className="map-site-dot live" aria-hidden="true" />
                <span>{group.province}</span>
                <small>{group.sites.length} {group.sites.length === 1 ? "place" : "places"}</small>
              </div>
              {group.sites.map((spot) => (
                <button
                  key={spot.id}
                  type="button"
                  className={spot.id === selectedId ? "selected" : ""}
                  onClick={() => { setSelectedId(spot.id); setSelectedProvince(group.province); setSitesOpen(false); }}
                >
                  <LandmarkArt siteId={spot.id} />
                  <span className="map-site-name">{spot.name}<small>{spot.province}</small></span>
                  <span className="map-site-status">{spot.live ? "View" : "Soon"}</span>
                </button>
              ))}
            </div>
          ))}
        </nav>
      )}

      <button
        type="button"
        className="map-feature-toggle"
        aria-expanded={featuresOpen}
        aria-controls="map-feature-nav"
        onClick={() => { setFeaturesOpen((open) => !open); setSitesOpen(false); }}
      >
        Explore features ☰
      </button>

      <div className="map-detail" role="group" aria-label="Map detail">
        <button type="button" className={detail === "normal" ? "active" : ""} aria-pressed={detail === "normal"} onClick={() => setDetail("normal")}>Normal</button>
        <button type="button" className={detail === "ultra" ? "active" : ""} aria-pressed={detail === "ultra"} onClick={() => setDetail("ultra")}>Ultra</button>
      </div>

      <nav id="map-feature-nav" className={`map-nav${featuresOpen ? " open" : ""}`} aria-label="CamboVerse features">
        {onOpenPanorama && <button className="tools-btn" onClick={onOpenPanorama}>◉ 360° Photo Test</button>}
        <button className="tools-btn" onClick={onOpenProvinceSongs}>♫ Province Songs &amp; Characters</button>
        <button className="tools-btn" onClick={onOpenTools}>🏺 Khmer Life</button>
        <button className="alphabet-btn" onClick={onOpenClassroom}>🔤 Khmer Alphabet</button>
        <button className="kun-btn" onClick={onOpenKunKhmer}>🥊 Kun Khmer</button>
        <button className="games-btn" onClick={onOpenGames}>🎪 Khmer Games</button>
        <button className="farm-btn" onClick={onOpenFarm}>🌾 Virtual Farm</button>
        <button className="village-btn" onClick={onOpenVillage}>🏡 Khmer Village</button>
        <button className="fashion-btn" onClick={onOpenFashion}>👗 Khmer Fashion</button>
        <button className="sakyant-btn" onClick={onOpenSakYant}>🪷 Sak Yant</button>
        <button className="grove-btn" onClick={onOpenGrove}>🌱 Grove Garden</button>
        {/* One button, not one per building. Sites and buildings are listed on
            the Buildings page itself (BuildingsHome). */}
        <button className="campus-btn" onClick={onOpenBuildings}>🏛 Buildings</button>
        <button className="lab-btn" onClick={onOpenLab}>🔬 Learning Lab</button>
        <button className="cer-btn" onClick={onOpenCeremonies}>🎊 Ceremonies</button>
        <button className="med-btn" onClick={onOpenMeditation}>🧘 Meditation</button>
        <button className="passport-btn" onClick={() => setPassportOpen(true)}>🛂 Passport</button>
      </nav>

      {passportOpen && <Passport onClose={() => setPassportOpen(false)} />}
    </>
  );
}
