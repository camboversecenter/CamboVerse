import { useState } from "react";
import { MapView } from "./components/MapView";
import { SpotView } from "./components/SpotView";
import { SPOTS } from "./spots";

export function App() {
  const [spotId, setSpotId] = useState<string | null>(null);
  // Bump on every navigation to replay the teleport flash.
  const [flash, setFlash] = useState(0);

  const spot = SPOTS.find((s) => s.id === spotId) ?? null;

  const teleport = (id: string) => {
    setSpotId(id);
    setFlash((f) => f + 1);
  };
  const backToMap = () => {
    setSpotId(null);
    setFlash((f) => f + 1);
  };

  return (
    <>
      {spot ? (
        <SpotView spot={spot} onBack={backToMap} />
      ) : (
        <MapView onEnter={teleport} />
      )}

      {/* Teleport flash — remounts on each nav change and fades out. */}
      <div key={flash} className="teleport-flash" />
    </>
  );
}
