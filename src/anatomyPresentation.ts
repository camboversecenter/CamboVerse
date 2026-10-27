// Authored head landmarks in the shared registration; mouth surface heights updated for V9.
// Positions use the same body-centimetre frame as the exported meshes.
import { Vector3 } from 'three';

/** Capture a world position once per extraction, never track the moving camera. */
export function anchoredStudyPosition(previous: Vector3 | null, candidate: Vector3) {
  return previous ?? candidate.clone();
}

export const HEAD_ANCHORS: Record<string, [number, number, number][]> = {
  nose: [[0,68.9976,7.2848],[.7374,68.9408,6.0936],[.4538,70.5291,5.4924]],
  mouth: [[0,64.21,4.7014],[0,66.35,4.5426],[0,65.0837,2.9203],[5.9885,65.2539,.4175]],
  ears: [[-8.9394,70.5858,.2513],[-6.784,70.0186,.4214],[-6.489,70.3362,.4668],[-5.6155,69.2812,.6483]],
  eyes: [[3.5735,71.4934,8.3966],[3.5735,71.4934,8.2945],[3.5735,71.4934,7.6819],[-3.5735,71.4934,5.5264],[-2.9496,71.2665,4.2785]],
};

export function centeredAnchor(point: readonly number[], center: readonly number[]): [number, number, number] {
  return [point[0]-center[0], point[1]-center[1], point[2]-center[2]];
}

/** Head landmarks are close together: select one without requiring extra zoom. */
export function showAnnotation(isHead: boolean, index: number, active: number | null, zoom: number) {
  return isHead ? index === active : zoom >= 1.2;
}

/** Fit a rotation-safe bounding sphere to the smaller viewport dimension. */
export function studyDistance(width: number, height: number, verticalFov = 65, diameter = .48) {
  const halfY = verticalFov * Math.PI / 360;
  const halfX = Math.atan(Math.tan(halfY) * Math.max(1,width) / Math.max(1,height));
  return (diameter / 2) / Math.sin(Math.min(halfX, halfY)) / .72;
}
