import {useLayoutEffect, useRef} from 'react';
import {useThree} from '@react-three/fiber';
import {useXR} from '@react-three/xr';
import type {OrbitControls as Controls} from 'three-stdlib';
import {ExploreControls as OrbitControls} from './ExploreControls';

export const CAMPUS_OVERVIEW_POSITION: [number, number, number] = [30, 120, 320];
const TARGET: [number, number, number] = [24, 6, 70];

/** Walking and XR leave their own pose behind. Overview owns its arrival pose. */
export function CampusOverview({resetKey}: {resetKey: number}) {
  const camera = useThree(s => s.camera);
  const immersive = useXR(s => s.session != null);
  const controls = useRef<Controls>(null);
  useLayoutEffect(() => {
    if (immersive) return;
    camera.up.set(0, 1, 0);
    camera.position.set(...CAMPUS_OVERVIEW_POSITION);
    camera.lookAt(...TARGET);
    controls.current?.target.set(...TARGET);
    controls.current?.update();
    controls.current?.saveState();
  }, [camera, immersive, resetKey]);
  return <OrbitControls ref={controls} enablePan minDistance={20} maxDistance={420}
    maxPolarAngle={Math.PI / 2.12} enableDamping target={TARGET} resetKey={String(resetKey)}/>;
}
