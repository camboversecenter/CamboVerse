export type LabBounds = [number, number, number, number];

export const LAB_VR_HELP = 'Left stick: walk. Hold left grip to run. Right stick: turn. A: jump; press again for a second jump. B: fly / land. While flying, hold A to rise or X to descend. Y: show / hide the learning panel. Point and press a trigger to select. You can keep moving while the panel is open.';

/** Approach exhibits from the aisle, at floor level, looking at the exhibit. */
export function labStationArrival(at: [number, number, number], bounds: LabBounds, floor = 0) {
  const cx = (bounds[0] + bounds[1]) / 2, cz = (bounds[2] + bounds[3]) / 2;
  const dx = at[0] - cx, dz = at[2] - cz, length = Math.hypot(dx, dz);
  const x = Math.max(bounds[0], Math.min(bounds[1], at[0] - (length > .01 ? dx / length : 0) * 1.6));
  const z = Math.max(bounds[2], Math.min(bounds[3], at[2] - (length > .01 ? dz / length : -1) * 1.6));
  return {position: [x, floor, z] as [number, number, number], yaw: Math.atan2(x - at[0], z - at[2])};
}
