import landmarks from './kulenLandmarks.json';
import type { Poi } from './spots';

/** Approximate published map pins, not surveyed positions or navigable routes.
 * East is +X and north is -Z. Relief and landmark symbols are exaggerated.
 * The terrain perimeter is an illustrative study boundary, not a park boundary.
 */
export function kulenPosition(lat: number, lng: number): [number, number, number] {
  return [(lng - 104.12) * 400 * Math.cos(13.55 * Math.PI / 180), 7, (13.55 - lat) * 400];
}
export const KULEN_LANDMARKS = landmarks;
export const KULEN_POIS: Poi[] = landmarks.map(p => {
  const [x, y, z] = kulenPosition(p.lat, p.lng);
  return { id: p.id, title: p.title, info: p.info, target: [x, y + .9, z], camera: [x + 4, y + 5.5, z + 6] };
});
export const KULEN_REGION_NOTE = 'Mountain-area overview · approximate landmark pins; illustrative relief and symbols. Not a navigation map.';
