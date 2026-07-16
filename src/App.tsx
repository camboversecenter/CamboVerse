import { useRef, useState } from "react";
import { MapView } from "./components/MapView";
import { SpotView } from "./components/SpotView";
import { ProvinceView } from "./components/ProvinceView";
import { ToolsView } from "./components/ToolsView";
import { ClassroomView } from "./components/ClassroomView";
import { KunKhmer } from "./components/KunKhmer";
import { GamesView } from "./components/GamesView";
import { SPOTS } from "./spots";

export function App() {
  const [spotId, setSpotId] = useState<string | null>(null);
  const [provinceName, setProvinceName] = useState<string | null>(null);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [classroomOpen, setClassroomOpen] = useState(false);
  const [kunOpen, setKunOpen] = useState(false);
  const [gamesOpen, setGamesOpen] = useState(false);
  const [warping, setWarping] = useState(false);
  const busy = useRef(false);

  const spot = SPOTS.find((s) => s.id === spotId) ?? null;

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
      {spot ? (
        // Leaving a site returns to the province map if one is open, else the
        // national map.
        <SpotView spot={spot} onBack={() => go(null)} />
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
      ) : (
        <MapView
          onEnter={(id) => go(id)}
          onEnterProvince={(name) => goProvince(name)}
          onOpenTools={() => setToolsOpen(true)}
          onOpenClassroom={() => setClassroomOpen(true)}
          onOpenKunKhmer={() => setKunOpen(true)}
          onOpenGames={() => setGamesOpen(true)}
        />
      )}

      <div className={`warp${warping ? " warp--on" : ""}`} aria-hidden="true" />
    </>
  );
}
