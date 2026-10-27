import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { Euler, Vector3 } from "three";
import { advanceCaptureJump, advanceCaptureWalk, captureViewpointStops, captureWalkGroundHeight, captureWalkHeight, captureWalkLook, captureWalkPosition } from "./captureWalk";
import type { CaptureWalkPath } from "./spots";
import { SPOTS } from "./spots";

const path: CaptureWalkPath = {
  start: [0, 1.5, 4],
  end: [0, 2.5, 0],
};

describe("capture walk route", () => {
  it("allows repeated full turns in Clean view and Full scan without changing height", () => {
    const limits = { minPitch: -0.6, maxPitch: 0.22 };
    for (const angle of [-10*Math.PI-0.3, -Math.PI, Math.PI, 10*Math.PI+0.3]) {
      expect(captureWalkLook(angle, 1, limits)).toEqual({ yaw: angle, pitch: 0.22 });
      expect(captureWalkLook(angle, -1, limits)).toEqual({ yaw: angle, pitch: -0.6 });
      expect(captureWalkLook(angle, 0)).toEqual({ yaw: angle, pitch: 0 });
      const start = captureWalkPosition(path, 0.5);
      const moved = advanceCaptureWalk(path, 0.5, 0, angle, 1, 0, 1/60);
      expect(captureWalkPosition(path, moved.progress, moved.lateral)[1])
        .toBe(captureWalkHeight(path, moved.progress));
      expect(Math.abs(captureWalkHeight(path, moved.progress)-start[1])).toBeLessThan(.01);
    }
  });
  it("jumps once and lands at the current floor height without gaining height from repeated requests", () => {
    const dt = 1 / 60;
    let state = advanceCaptureJump({ y: 1, velocity: 0, grounded: true }, 1, true, dt);
    expect(state.y).toBeGreaterThan(1);
    expect(state.grounded).toBe(false);
    expect(advanceCaptureJump(state, 1, true, dt)).toEqual(advanceCaptureJump(state, 1, false, dt));
    let peak = state.y;
    for (let i = 0; i < 90; i++) {
      state = advanceCaptureJump(state, 0.9, false, dt);
      peak = Math.max(peak, state.y);
    }
    expect(peak).toBeGreaterThan(1.15);
    expect(peak).toBeLessThan(1.21);
    expect(state).toEqual({ y: 0.9, velocity: 0, grounded: true });
    expect(advanceCaptureJump(state, 1.1, false, dt).y).toBe(1.1);
  });

  it("allows wider sideways travel while keeping the configured edge", () => {
    const wide = { ...path, lateralLimit: 0.45 };
    expect(advanceCaptureWalk(wide, 0.5, 0.18, 0, 0, 1, 0.05).lateral).toBeGreaterThan(0.18);
    expect(advanceCaptureWalk(wide, 0.5, 0.45, 0, 0, 1, 0.05).lateral).toBe(0.45);
    expect(captureWalkPosition(wide, 0.5, 10)[0]).toBe(0.45);
  });
  it("walks continuously relative to facing direction and stops at capture boundaries", () => {
    const start = { progress: 0.5, lateral: 0 };
    const forward = advanceCaptureWalk(path, start.progress, start.lateral, 0, 1, 0, 1 / 60);
    expect(forward.progress).toBeGreaterThan(start.progress);
    expect(forward.progress - start.progress).toBeLessThan(0.01);
    const turned = advanceCaptureWalk(path, start.progress, 0, Math.PI, 1, 0, 1 / 60);
    expect(turned.progress).toBeLessThan(start.progress);
    const strafe = advanceCaptureWalk(path, start.progress, 0, 0, 0, 1, 1 / 60);
    expect(strafe.progress).toBe(start.progress);
    expect(strafe.lateral).toBeGreaterThan(0);
    expect(captureWalkPosition(path, strafe.progress, strafe.lateral)[1]).toBe(captureWalkPosition(path, start.progress)[1]);
    expect(advanceCaptureWalk(path, 1, 0.18, 0, 1, 1, 100)).toEqual({ progress: 1, lateral: 0.18 });
    expect(advanceCaptureWalk(path, 0, -0.18, 0, -1, -1, 100)).toEqual({ progress: 0, lateral: -0.18 });
  });
  it("places viewpoints on the centre of the photographed route", () => {
    expect(captureWalkPosition(path, 0.5)).toEqual([0, 2, 2]);
    expect(captureWalkPosition(path, -1)).toEqual([0, 1.5, 4]);
  });

  it("follows an authored staircase height profile instead of floating on one slope", () => {
    const stairs: CaptureWalkPath = {
      ...path,
      eyeHeight: 0.7,
      heightProfile: [
        { at: 0, groundY: 0.8 },
        { at: 0.4, groundY: 0.9 },
        { at: 0.7, groundY: 1.5 },
        { at: 1, groundY: 1.8 },
      ],
    };

    expect(captureWalkHeight(stairs, -1)).toBe(1.5);
    expect(captureWalkHeight(stairs, 0.2)).toBeCloseTo(1.55);
    expect(captureWalkHeight(stairs, 0.55)).toBeCloseTo(1.9);
    expect(captureWalkHeight(stairs, 2)).toBe(2.5);
    expect(captureWalkGroundHeight(stairs, 0.55)).toBeCloseTo(1.2);
    expect(captureWalkPosition(stairs, 0.55)[1]).toBeCloseTo(1.9);
  });

  it("uses authored profile points as discrete Street View stops", () => {
    expect(captureViewpointStops({
      ...path,
      heightProfile: [{ at: 1, groundY: 1.8 }, { at: 0, groundY: 0.8 }, { at: 0.4, groundY: 1.1 }],
    })).toEqual([0, 0.4, 1]);
    expect(captureViewpointStops(path)).toEqual([0, 0.25, 0.5, 0.75, 1]);
  });
});

// Regression: raw splat coordinates are NOT the displayed coordinates. A route
// can pass interpolation tests yet sit entirely outside the rendered scan.
describe("staircase route alignment with the exported capture", () => {
  const capture = SPOTS.find(spot => spot.id === "wat-phnom")!.pois!
    .find(poi => poi.id === "naga-staircase")!.capture!;
  const route = capture.walk!;

  it.each([
    ["original normal", capture.normal], ["original ultra", capture.ultra],
    ["clean normal", capture.cleanup!.normal], ["clean ultra", capture.cleanup!.ultra],
  ])("has nearby scan support at every %s viewpoint", (_label, url) => {
    const bytes = readFileSync(new URL(`../public${url}`, import.meta.url));
    // Include points between authored heights and both sides of the walk strip.
    const samples = Array.from({ length: 25 }, (_, i) => i / 24)
      .flatMap(t => [-(route.lateralLimit ?? 0.18), 0, route.lateralLimit ?? 0.18].map(side => ({ t, side })));
    const support = samples.map(() => 0);
    const positions = samples.map(({ t, side }) => captureWalkPosition(route, t, side));
    const floors = samples.map(({ t }) => captureWalkGroundHeight(route, t));
    const point = new Vector3();
    const rotation = new Euler(...capture.rotation);
    const translation = new Vector3(...capture.position);
    for (let offset = 0; offset < bytes.length; offset += 32) {
      // Matches installed drei/core/Splat.js centerAndScaleData conversion.
      point.set(bytes.readFloatLE(offset), -bytes.readFloatLE(offset + 4), -bytes.readFloatLE(offset + 8))
        .multiplyScalar(capture.scale).applyEuler(rotation).add(translation);
      positions.forEach(([x, , z], index) => {
        if (Math.abs(point.x - x) < 0.24 && Math.abs(point.z - z) < 0.10
          && Math.abs(point.y - floors[index]) < 0.075) support[index]++;
      });
    }
    support.forEach((count, index) => {
      expect(count, `Stop ${index + 1} has no support near its estimated floor`).toBeGreaterThan(15);
      expect(positions[index][1] - floors[index]).toBeCloseTo(route.eyeHeight!);
    });
  });
});
