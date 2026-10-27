import { useEffect, useLayoutEffect, useRef, type MutableRefObject } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { MathUtils, PerspectiveCamera } from "three";
import { advanceCaptureJump, advanceCaptureWalk, captureWalkLook, captureWalkPosition, type CaptureJumpState } from "../captureWalk";
import type { CaptureWalkPath, PoiCapture } from "../spots";
import type { WalkInput } from "./FirstPersonControls";

/** Continuous walking on the corrected, estimated staircase surface.
 * Camera pitch affects looking only; eye height follows the ground profile. */
export function CaptureWalkControls({
  input, path, lookLimits,
}: {
  input: MutableRefObject<WalkInput>;
  path: CaptureWalkPath;
  lookLimits?: NonNullable<PoiCapture['cleanup']>['lookLimits'];
}) {
  const camera = useThree(state => state.camera);
  const gl = useThree(state => state.gl);
  const route = useRef({ progress: 0, lateral: 0 });
  const jump = useRef<CaptureJumpState | null>(null);
  const keys = useRef(new Set<string>());
  const velocity = useRef({ forward: 0, side: 0 });
  const yaw = useRef(path.startYaw ?? 0);
  const targetYaw = useRef(path.startYaw ?? 0);
  const pitch = useRef(-0.16);
  const targetPitch = useRef(-0.16);

  useLayoutEffect(() => {
    route.current = { progress: 0, lateral: 0 };
    jump.current = null;
    input.current.move = { x: 0, y: 0 };
    input.current.look = { dx: 0, dy: 0 };
    input.current.jump = false;
    yaw.current = targetYaw.current = path.startYaw ?? 0;
    pitch.current = targetPitch.current = -0.16;
    camera.position.set(...captureWalkPosition(path, 0));
    camera.rotation.set(pitch.current, yaw.current, 0, "YXZ");
  }, [camera, path, input]);

  useLayoutEffect(() => {
    if (!(camera instanceof PerspectiveCamera)) return;
    const previousFov = camera.fov;
    const previousNear = camera.near;
    camera.fov = 56;
    // The capture uses a small scene scale: the ordinary 0.1 near plane cuts
    // away nearby steps, making the visitor appear to stand over a hole.
    camera.near = 0.01;
    camera.updateProjectionMatrix();
    return () => {
      camera.fov = previousFov;
      camera.near = previousNear;
      camera.updateProjectionMatrix();
    };
  }, [camera]);

  useEffect(() => {
    const movementKeys = new Set(["KeyW", "KeyA", "KeyS", "KeyD", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"]);
    const reset = () => {
      keys.current.clear();
      velocity.current = { forward: 0, side: 0 };
      input.current.move = { x: 0, y: 0 };
      input.current.look = { dx: 0, dy: 0 };
      input.current.jump = false;
      jump.current = null;
    };
    const onDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey) { reset(); return; }
      if (event.target instanceof HTMLElement && event.target.closest('input, textarea, select, [contenteditable="true"]')) return;
      if (event.code === "Space") {
        // Let a focused button retain its native Space activation.
        if (event.target instanceof HTMLElement && event.target.closest('button, a, [role="button"]')) return;
        event.preventDefault();
        if (!event.repeat) input.current.jump = true;
        return;
      }
      if (!movementKeys.has(event.code)) return;
      event.preventDefault();
      keys.current.add(event.code);
    };
    const onUp = (event: KeyboardEvent) => { keys.current.delete(event.code); };
    const onVisibility = () => { if (document.hidden) reset(); };
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    window.addEventListener("blur", reset);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
      window.removeEventListener("blur", reset);
      document.removeEventListener("visibilitychange", onVisibility);
      reset();
    };
  }, [input]);

  useFrame((_, delta) => {
    if (gl.xr.isPresenting) return;
    const dt = Math.min(delta, 0.05);
    const look = input.current.look;
    const nextLook = captureWalkLook(targetYaw.current-look.dx*0.0027,
      targetPitch.current-look.dy*0.0027, lookLimits);
    targetYaw.current = nextLook.yaw;
    targetPitch.current = nextLook.pitch;
    look.dx = look.dy = 0;
    yaw.current = MathUtils.damp(yaw.current, targetYaw.current, 14, dt);
    pitch.current = MathUtils.damp(pitch.current, targetPitch.current, 14, dt);

    const pressed = (a: string, b: string) => Number(keys.current.has(a) || keys.current.has(b));
    const forward = MathUtils.clamp(pressed("KeyW", "ArrowUp") - pressed("KeyS", "ArrowDown") - input.current.move.y, -1, 1);
    const side = MathUtils.clamp(pressed("KeyD", "ArrowRight") - pressed("KeyA", "ArrowLeft") + input.current.move.x, -1, 1);
    velocity.current.forward = MathUtils.damp(velocity.current.forward, forward, 18, dt);
    velocity.current.side = MathUtils.damp(velocity.current.side, side, 18, dt);
    if (forward === 0 && Math.abs(velocity.current.forward) < 0.001) velocity.current.forward = 0;
    if (side === 0 && Math.abs(velocity.current.side) < 0.001) velocity.current.side = 0;
    route.current = advanceCaptureWalk(path, route.current.progress, route.current.lateral,
      yaw.current, velocity.current.forward, velocity.current.side, dt);
    const [x, restingY, z] = captureWalkPosition(path, route.current.progress, route.current.lateral);
    jump.current = advanceCaptureJump(jump.current ?? { y: restingY, velocity: 0, grounded: true },
      restingY, input.current.jump ?? false, dt);
    input.current.jump = false;
    camera.position.set(x, jump.current.y, z);
    camera.rotation.set(pitch.current, yaw.current, 0, "YXZ");
  });

  return null;
}
