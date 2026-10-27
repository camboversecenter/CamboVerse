import { MathUtils } from "three";
import type { CaptureWalkPath, PoiCapture } from "./spots";

/** Horizontal look is always unrestricted; optional pitch limits prevent flips. */
export function captureWalkLook(
  yaw: number, pitch: number,
  limits?: NonNullable<PoiCapture['cleanup']>['lookLimits'],
): { yaw: number; pitch: number } {
  if (!limits) return { yaw, pitch: MathUtils.clamp(pitch, -0.9, 0.72) };
  return {
    yaw,
    pitch: MathUtils.clamp(pitch, limits.minPitch, limits.maxPitch),
  };
}

/** Authored ground height at a point on the capture route. */
export function captureWalkGroundHeight(path: CaptureWalkPath, progress: number): number {
  const t = MathUtils.clamp(progress, 0, 1);
  const profile = path.heightProfile;
  if (!profile?.length) return MathUtils.lerp(path.start[1], path.end[1], t) - (path.eyeHeight ?? 0);

  const first = profile[0];
  if (t <= first.at) return first.groundY;

  for (let index = 1; index < profile.length; index += 1) {
    const previous = profile[index - 1];
    const next = profile[index];
    if (t <= next.at) {
      const span = next.at - previous.at;
      if (span <= 0) return next.groundY;
      return MathUtils.lerp(previous.groundY, next.groundY, (t - previous.at) / span);
    }
  }

  return profile[profile.length - 1].groundY;
}

/** Camera height stays a fixed distance above the reconstructed stair surface. */
export function captureWalkHeight(path: CaptureWalkPath, progress: number): number {
  if (!path.heightProfile?.length) {
    return MathUtils.lerp(path.start[1], path.end[1], MathUtils.clamp(progress, 0, 1));
  }
  return captureWalkGroundHeight(path, progress) + (path.eyeHeight ?? 0.68);
}

/** Position at an authored viewpoint on the capture route. */
export function captureWalkPosition(
  path: CaptureWalkPath,
  progress: number,
  lateral = 0,
): [number, number, number] {
  const t = MathUtils.clamp(progress, 0, 1);
  const dx = path.end[0] - path.start[0];
  const dz = path.end[2] - path.start[2];
  const length = Math.hypot(dx, dz) || 1;
  const limit = path.lateralLimit ?? 0.18;
  const side = MathUtils.clamp(lateral, -limit, limit);
  return [
    MathUtils.lerp(path.start[0], path.end[0], t) - dz / length * side,
    captureWalkHeight(path, t),
    MathUtils.lerp(path.start[2], path.end[2], t) + dx / length * side,
  ];
}

/** Camera-relative walking on the calibrated surface strip. Looking up/down
 * never changes travel height; only the floor profile determines camera Y. */
export function advanceCaptureWalk(
  path: CaptureWalkPath, progress: number, lateral: number,
  yaw: number, forward: number, side: number, delta: number,
): { progress: number; lateral: number } {
  const dx = path.end[0] - path.start[0];
  const dz = path.end[2] - path.start[2];
  const length = Math.hypot(dx, dz) || 1;
  const magnitude = Math.max(1, Math.hypot(forward, side));
  const x = (-Math.sin(yaw) * forward + Math.cos(yaw) * side) / magnitude;
  const z = (-Math.cos(yaw) * forward - Math.sin(yaw) * side) / magnitude;
  const distance = 0.45 * MathUtils.clamp(delta, 0, 0.05);
  const limit = path.lateralLimit ?? 0.18;
  return {
    progress: MathUtils.clamp(progress + (x * dx + z * dz) / (length * length) * distance, 0, 1),
    lateral: MathUtils.clamp(lateral + (-x * dz + z * dx) / length * distance, -limit, limit),
  };
}

export interface CaptureJumpState { y: number; velocity: number; grounded: boolean }

/** World-height jump, so descending stairs cannot pull an airborne camera down.
 * Landing uses the floor at the current horizontal position. No mid-air jumps. */
export function advanceCaptureJump(
  state: CaptureJumpState, restingY: number, requested: boolean, delta: number,
): CaptureJumpState {
  const dt = MathUtils.clamp(delta, 0, 0.05);
  if (state.grounded && !requested) return { y: restingY, velocity: 0, grounded: true };
  const velocity = state.grounded ? 1.65 : state.velocity;
  const y = (state.grounded ? restingY : state.y) + velocity * dt - 3.5 * dt * dt;
  const nextVelocity = velocity - 7 * dt;
  if (y <= restingY && nextVelocity <= 0) return { y: restingY, velocity: 0, grounded: true };
  // An uphill step may meet the jump before its apex: resolve onto that surface.
  if (!state.grounded && y < restingY) return { y: restingY, velocity: 0, grounded: true };
  return { y, velocity: nextVelocity, grounded: false };
}

/** Ordered viewpoint positions used by double-click/tap navigation. */
export function captureViewpointStops(path: CaptureWalkPath): number[] {
  const stops = path.heightProfile?.map(({ at }) => MathUtils.clamp(at, 0, 1));
  return stops?.length ? [...new Set(stops)].sort((a, b) => a - b) : [0, 0.25, 0.5, 0.75, 1];
}
