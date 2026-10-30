import { lazy, Suspense, useRef, useState } from "react";
import { MapView } from "./components/MapView";
import { SpotView } from "./components/SpotView";
import { PhnomKulenView } from "./components/PhnomKulenView";
import { ProvinceView } from "./components/ProvinceView";
import { ToolsView } from "./components/ToolsView";
import { ClassroomView } from "./components/ClassroomView";
import { KunKhmer } from "./components/KunKhmer";
import { GamesView } from "./components/GamesView";
import { FarmView } from "./components/FarmView";
import { MeditationView } from "./components/MeditationView";
import { VillageView } from "./components/VillageView";
import { FashionView } from "./components/FashionView";
import { SakYantView } from "./components/SakYantView";
import { GroveGardenView } from "./components/GroveGardenView";
import { LabView } from "./components/LabView";
import { ExperienceRoom } from "./components/ExperienceRoom";
import { PhysicsRoom } from "./components/PhysicsRoom";
import { EarthSkyRoom } from "./components/EarthSkyRoom";
import { BiologyRoom, initialBiologyState } from "./components/BiologyRoom";
import { CeremonyHome } from "./components/CeremonyHome";
import { CeremonyView } from "./components/CeremonyView";
import { SpecimenView } from "./components/SpecimenView";
import { BuildingsHome } from "./components/BuildingsHome";
import { BuildingsView } from "./components/BuildingsView";
import { BuildingView } from "./components/BuildingView";
import { buildingById, siteById } from "./buildings";
import { specimenById } from "./lab";
import { templateById } from "./ceremony";
import { SPOTS } from "./spots";

const ProvinceSongs = lazy(() => import('./components/ProvinceSongs'));
const PanoramaTour = import.meta.env.DEV ? lazy(() => import('./components/PanoramaTour')) : null;

export function App() {
  const [panoramaOpen,setPanoramaOpen] = useState(() => import.meta.env.DEV && new URLSearchParams(window.location.search).get('view') === '360-test');
  const [spotId, setSpotId] = useState<string | null>(() => {
    const requested=new URLSearchParams(window.location.search).get('site');
    return SPOTS.some(spot=>spot.id===requested)?requested:null;
  });
  const [provinceName, setProvinceName] = useState<string | null>(null);
  const [provinceSongsOpen, setProvinceSongsOpen] = useState(() => new URLSearchParams(window.location.search).get('view') === 'province-songs');
  const [toolsOpen, setToolsOpen] = useState(false);
  const [classroomOpen, setClassroomOpen] = useState(false);
  const [kunOpen, setKunOpen] = useState(false);
  const [gamesOpen, setGamesOpen] = useState(false);
  const [farmOpen, setFarmOpen] = useState(false);
  const [medOpen, setMedOpen] = useState(false);
  const [villageOpen, setVillageOpen] = useState(false);
  const [fashionOpen, setFashionOpen] = useState(false);
  const [sakYantOpen, setSakYantOpen] = useState(false);
  const [groveOpen, setGroveOpen] = useState(false);
  // 🏛 Buildings is three layers deep: the directory, a walkable site, and a
  // single building's page. The map only ever opens the directory.
  const [buildingsOpen, setBuildingsOpen] = useState(false);
  const [siteId, setSiteId] = useState<string | null>(null);
  const [buildingId, setBuildingId] = useState<string | null>(null);
  const [roomId, setRoomId] = useState<string | null>(null);
  // 🔬 Learning Lab: a directory, then one specimen's page.
  const [labOpen, setLabOpen] = useState(false);
  const [chemistryOpen, setChemistryOpen] = useState(false);
  const [physicsOpen, setPhysicsOpen] = useState(false);
  const [earthSkyOpen, setEarthSkyOpen] = useState(false);
  const [biologyOpen, setBiologyOpen] = useState(false);
  const [biologyState, setBiologyState] = useState(initialBiologyState);
  // A stack, not a single id: an organ's screen is reached from inside the body
  // it belongs to, and Back has to return there rather than to the hub.
  const [specimenStack, setSpecimenStack] = useState<string[]>([]);
  // 🎊 Ceremonies: the directory, then one ceremony staged in its setting.
  const [ceremoniesOpen, setCeremoniesOpen] = useState(false);
  const [ceremonyId, setCeremonyId] = useState<string | null>(null);
  const [warping, setWarping] = useState(false);
  const busy = useRef(false);

  const spot = SPOTS.find((s) => s.id === spotId) ?? null;
  const building = buildingId ? buildingById(buildingId) ?? null : null;
  const site = siteId ? siteById(siteId) ?? null : null;
  const specimenId = specimenStack[specimenStack.length - 1] ?? null;
  const specimen = specimenId ? specimenById(specimenId) ?? null : null;
  const ceremony = ceremonyId ? templateById(ceremonyId) : null;
  const parent = specimenStack.length > 1
    ? specimenById(specimenStack[specimenStack.length - 2])
    : null;

  /** Leave the whole Buildings stack in one go, from any depth. */
  const closeBuildings = () => {
    setBuildingId(null);
    setRoomId(null);
    setSiteId(null);
    setBuildingsOpen(false);
  };

  const openBuilding = (id: string, room: string | null = null) => {
    setBuildingId(id);
    setRoomId(room);
  };

  // Teleport: cover the screen with a warp flash, run the scene swap hidden
  // underneath, then reveal. Guarded so taps can't overlap mid-transition.
  const warp = (swap: () => void) => {
    if (busy.current) return;
    busy.current = true;
    setWarping(true); // flash covers
    window.setTimeout(swap, 280); // swap under cover
    window.setTimeout(() => setWarping(false), 360); // reveal
    window.setTimeout(() => {
      busy.current = false;
    }, 720);
  };

  const go = (next: string | null) => warp(() => setSpotId(next));
  const goProvince = (next: string | null) => warp(() => setProvinceName(next));

  return (
    <>
      {panoramaOpen && PanoramaTour ? (
        <Suspense fallback={<p role="status">Loading 360° test tour…</p>}><PanoramaTour onBack={() => setPanoramaOpen(false)} /></Suspense>
      ) : provinceSongsOpen ? (
        <Suspense fallback={<p role="status" style={{ padding: 24 }}>Loading province collection…</p>}>
          <ProvinceSongs initialId={new URLSearchParams(window.location.search).get('province') ?? undefined} onBack={() => setProvinceSongsOpen(false)} />
        </Suspense>
      ) : spot ? (
        // Leaving a site returns to the province map if one is open, else the
        // national map.
        spot.id === 'phnom-kulen'
          ? <PhnomKulenView spot={spot} onBack={() => go(null)} />
          : <SpotView spot={spot} onBack={() => go(null)} />
      ) : provinceName ? (
        <ProvinceView
          provinceName={provinceName}
          onBack={() => goProvince(null)}
          onEnterSite={(id) => go(id)}
        />
      ) : toolsOpen ? (
        <ToolsView onBackToMap={() => setToolsOpen(false)} />
      ) : classroomOpen ? (
        <ClassroomView onBackToMap={() => setClassroomOpen(false)} />
      ) : kunOpen ? (
        <KunKhmer onBackToMap={() => setKunOpen(false)} />
      ) : gamesOpen ? (
        <GamesView onBackToMap={() => setGamesOpen(false)} />
      ) : farmOpen ? (
        <FarmView onBackToMap={() => setFarmOpen(false)} />
      ) : medOpen ? (
        <MeditationView onBackToMap={() => setMedOpen(false)} />
      ) : villageOpen ? (
        <VillageView onBackToMap={() => setVillageOpen(false)} />
      ) : fashionOpen ? (
        <FashionView onBackToMap={() => setFashionOpen(false)} />
      ) : sakYantOpen ? (
        <SakYantView onBackToMap={() => setSakYantOpen(false)} />
      ) : groveOpen ? (
        <GroveGardenView onBackToMap={() => setGroveOpen(false)} />
      ) : specimen ? (
        <SpecimenView
          specimen={specimen}
          onBack={() => setSpecimenStack((st) => st.slice(0, -1))}
          onOpenSpecimen={(id) => setSpecimenStack((st) => [...st, id])}
          backLabel={parent ? `← ${parent.name}` : biologyOpen ? "← Biology & Anatomy" : chemistryOpen ? "← Experience Room" : physicsOpen ? "← Physics Lab" : earthSkyOpen ? "← Earth & Sky" : "← Lab"}
        />
      ) : ceremony ? (
        <CeremonyView template={ceremony} onBack={() => setCeremonyId(null)} />
      ) : ceremoniesOpen ? (
        <CeremonyHome
          onBackToMap={() => setCeremoniesOpen(false)}
          onOpenCeremony={(id) => setCeremonyId(id)}
        />
      ) : biologyOpen ? (
        <BiologyRoom state={biologyState} onChange={setBiologyState} onBack={() => setBiologyOpen(false)} onOpenSpecimen={(id) => setSpecimenStack([id])} />
      ) : chemistryOpen ? (
        <ExperienceRoom onBack={() => setChemistryOpen(false)} onOpenSpecimen={(id) => setSpecimenStack([id])} />
      ) : physicsOpen ? (
        <PhysicsRoom onBack={() => setPhysicsOpen(false)} onOpenSpecimen={(id) => setSpecimenStack([id])} />
      ) : earthSkyOpen ? (
        <EarthSkyRoom onBack={() => setEarthSkyOpen(false)} onOpenSpecimen={(id) => setSpecimenStack([id])} />
      ) : labOpen ? (
        <LabView
          onBackToMap={() => setLabOpen(false)}
          onOpenSpecimen={(id) => setSpecimenStack([id])}
          onOpenChemistry={() => setChemistryOpen(true)}
          onOpenBiology={() => setBiologyOpen(true)}
          onOpenPhysics={() => setPhysicsOpen(true)}
          onOpenEarthSky={() => setEarthSkyOpen(true)}
        />
      ) : building ? (
        // A building's own page reached from the directory, or by tapping it
        // inside a site. Back goes wherever you came from.
        <BuildingView
          building={building}
          initialRoom={roomId}
          onRoomChange={(r) => setRoomId(r)}
          onBack={() => { setBuildingId(null); setRoomId(null); }}
          onBackToMap={closeBuildings}
          backLabel={siteId ? "← Site" : "← Buildings"}
        />
      ) : site ? (
        <BuildingsView
          site={site}
          onBack={() => setSiteId(null)}
          onOpenBuilding={openBuilding}
        />
      ) : buildingsOpen ? (
        <BuildingsHome
          onBackToMap={closeBuildings}
          onOpenSite={(id) => setSiteId(id)}
          onOpenBuilding={openBuilding}
        />
      ) : (
        <MapView
          onEnter={(id) => go(id)}
          onEnterProvince={(name) => goProvince(name)}
          onOpenTools={() => setToolsOpen(true)}
          onOpenClassroom={() => setClassroomOpen(true)}
          onOpenKunKhmer={() => setKunOpen(true)}
          onOpenGames={() => setGamesOpen(true)}
          onOpenFarm={() => setFarmOpen(true)}
          onOpenMeditation={() => setMedOpen(true)}
          onOpenVillage={() => setVillageOpen(true)}
          onOpenFashion={() => setFashionOpen(true)}
          onOpenSakYant={() => setSakYantOpen(true)}
          onOpenGrove={() => setGroveOpen(true)}
          onOpenLab={() => setLabOpen(true)}
          onOpenCeremonies={() => setCeremoniesOpen(true)}
          onOpenBuildings={() => setBuildingsOpen(true)}
          onOpenProvinceSongs={() => setProvinceSongsOpen(true)}
          onOpenPanorama={import.meta.env.DEV ? () => setPanoramaOpen(true) : undefined}
        />
      )}

      <div className={`warp${warping ? " warp--on" : ""}`} aria-hidden="true" />
    </>
  );
}
