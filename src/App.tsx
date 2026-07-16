import { useRef, useState } from "react";
import { MapView } from "./components/MapView";
import { SpotView } from "./components/SpotView";
import { ToolsView } from "./components/ToolsView";
import { ClassroomView } from "./components/ClassroomView";
import { KunKhmer } from "./components/KunKhmer";
import { SPOTS } from "./spots";

export function App() {
  const [spotId, setSpotId] = useState<string | null>(null);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [classroomOpen, setClassroomOpen] = useState(false);
  const [kunOpen, setKunOpen] = useState(false);
  const [warping, setWarping] = useState(false);
  const busy = useRef(false);

  const spot = SPOTS.find((s) => s.id === spotId) ?? null;

  // Teleport: cover the screen with a warp flash, swap the scene hidden
  // underneath, then reveal. Guarded so taps can't overlap mid-transition.
  const go = (next: string | null) => {
    if (busy.current) return;
    busy.current = true;
    setWarping(true); // flash covers
    window.setTimeout(() => setSpotId(next), 280); // swap under cover
    window.setTimeout(() => setWarping(false), 360); // reveal
    window.setTimeout(() => {
      busy.current = false;
    }, 720);
  };

  return (
    <>
      {spot ? (
        <SpotView spot={spot} onBack={() => go(null)} />
      ) : toolsOpen ? (
        <ToolsView onBackToMap={() => setToolsOpen(false)} />
      ) : classroomOpen ? (
        <ClassroomView onBackToMap={() => setClassroomOpen(false)} />
      ) : kunOpen ? (
        <KunKhmer onBackToMap={() => setKunOpen(false)} />
      ) : (
        <MapView
          onEnter={(id) => go(id)}
          onOpenTools={() => setToolsOpen(true)}
          onOpenClassroom={() => setClassroomOpen(true)}
          onOpenKunKhmer={() => setKunOpen(true)}
        />
      )}

      <div className={`warp${warping ? " warp--on" : ""}`} aria-hidden="true" />
    </>
  );
}
