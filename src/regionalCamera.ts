import type { Poi } from './spots';

/** Keep the regional miniature visible when the canvas becomes portrait. */
export function regionalOverviewCamera(pose: Poi, aspect: number): [number, number, number] {
  const factor = Math.max(1, 1.3 / Math.max(.35, aspect));
  return pose.camera.map((value, i) => pose.target[i] + (value - pose.target[i]) * factor) as [number, number, number];
}
