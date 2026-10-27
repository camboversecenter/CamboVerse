import { useState } from 'react';
import type { Spot } from '../spots';
import { KULEN_WATERFALL } from '../kulenWaterfall';
import { SpotView } from './SpotView';

/** Separate canvases reset camera, controls and XR state on each scene visit. */
export function PhnomKulenView({ spot, onBack }: { spot: Spot; onBack: () => void }) {
  const [waterfall, setWaterfall] = useState(false);
  if (waterfall) return <SpotView key="waterfall" spot={KULEN_WATERFALL}
    onBack={() => setWaterfall(false)} backLabel="← Kulen mountain" />;
  return <SpotView key="mountain" spot={spot} onBack={onBack}
    enterPlace={{ id: 'waterfalls', label: 'Enter waterfall study', onEnter: () => setWaterfall(true) }} />;
}
