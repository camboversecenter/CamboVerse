import { useEffect, useRef, type MutableRefObject } from "react";
import { useThree, useFrame } from "@react-three/fiber";
import { Raycaster, Vector3, MathUtils, type Object3D, type Intersection } from "three";
import { isTerrainFloor, isWalkingSurface } from '../terrainWalk';

export interface WalkInput {
  move: { x: number; y: number }; // joystick, [-1..1]; y<0 = forward
  look: { dx: number; dy: number }; // accumulated drag delta (px)
  /** Discrete capture-viewpoint request; positive moves forward, negative back. */
  step?: number;
  /** One-shot jump request for capture walking (keyboard or touch button). */
  jump?: boolean;
  /** Optional capture flight controls; consumed only by the clock area. */
  flyToggle?: boolean;
  flyVertical?: number;
  flyStep?: number;
}

export function FirstPersonControls({
  input,
  start = [0, 1.5, 9.5],
  startYaw = 0,
  startPitch = -0.04,
  speed = 2.4,
  eyeHeight = 1.25,
  bounds,
  collision,
  headBob = false,
  terrainWalking = false,
  enabled = true,
  allowJump = true,
  onStep,
}: {
  input: MutableRefObject<WalkInput>;
  start?: [number, number, number];
  startYaw?: number;
  startPitch?: number;
  speed?: number;
  eyeHeight?: number;
  bounds?: { minX: number; maxX: number; minZ: number; maxZ: number };
  /** Root of the collidable world. Given one, rays test only its subtree
   *  instead of every mesh in the scene - the difference between ~40 and
   *  ~250 objects tested twice a frame. */
  collision?: { current: Object3D | null };
  /** Gentle footstep sway while walking. Costs nothing and does more for the
   *  sense of being on your feet than any amount of extra geometry. */
  headBob?: boolean;
  /** Opt-in for authored hills/stairs; existing flat scenes keep their behavior. */
  terrainWalking?: boolean;
  /** Pause movement while a scene's reading panel has focus. */
  enabled?: boolean;
  allowJump?: boolean;
  onStep?: () => void;
}) {
  const camera = useThree((s) => s.camera);
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const yaw = useRef(0);
  const pitch = useRef(-0.04);
  const wallRay = useRef(new Raycaster());
  const floorRay = useRef(new Raycaster());
  const fwd = useRef(new Vector3());
  const rgt = useRef(new Vector3());
  const dir = useRef(new Vector3());
  const from = useRef(new Vector3());
  const DOWN = useRef(new Vector3(0, -1, 0));
  const floorNormal = useRef(new Vector3());
  const keys = useRef({ w: false, a: false, s: false, d: false, shift: false, space: false });
  const velY = useRef(0);
  const isGrounded = useRef(false);
  const bobPhase = useRef(0);
  const bobAmount = useRef(0);

  // Depend on the coordinates, not the array. Callers pass `start={[x,y,z]}`
  // inline, so a new array arrives every render - depending on its identity
  // re-ran this and teleported the player back to the door mid-stride.
  const [sx, sy, sz] = start;
  useEffect(() => {
    if (gl.xr.isPresenting) return;
    camera.rotation.order = "YXZ";
    camera.position.set(sx, sy, sz);
    yaw.current = startYaw;
    pitch.current = startPitch;
    velY.current = 0;
  }, [camera, gl, sx, sy, sz, startYaw, startPitch]);

  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      if (!enabled || (e.target instanceof HTMLElement && (e.target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)))) return;
      if (e.code === "KeyW" || e.code === "ArrowUp") keys.current.w = true;
      if (e.code === "KeyA" || e.code === "ArrowLeft") keys.current.a = true;
      if (e.code === "KeyS" || e.code === "ArrowDown") keys.current.s = true;
      if (e.code === "KeyD" || e.code === "ArrowRight") keys.current.d = true;
      if (e.key === "Shift") keys.current.shift = true;
      if (e.code === "Space") keys.current.space = true;
    };
    const onUp = (e: KeyboardEvent) => {
      if (e.code === "KeyW" || e.code === "ArrowUp") keys.current.w = false;
      if (e.code === "KeyA" || e.code === "ArrowLeft") keys.current.a = false;
      if (e.code === "KeyS" || e.code === "ArrowDown") keys.current.s = false;
      if (e.code === "KeyD" || e.code === "ArrowRight") keys.current.d = false;
      if (e.key === "Shift") keys.current.shift = false;
      if (e.code === "Space") keys.current.space = false;
    };
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    const clear = () => { keys.current = { w:false, a:false, s:false, d:false, shift:false, space:false }; input.current.move.x = input.current.move.y = 0; input.current.look.dx = input.current.look.dy = 0; };
    window.addEventListener('blur', clear);
    return () => {
      clear();
      window.removeEventListener('blur', clear);
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
    };
  }, [enabled, input]);

  useFrame((_, dt) => {
    // Headset tracking owns the camera while immersive; discard stale desktop input.
    if (gl.xr.isPresenting || !enabled) {
      input.current.move.x = input.current.move.y = 0;
      input.current.look.dx = input.current.look.dy = 0;
      keys.current = { w: false, a: false, s: false, d: false, shift: false, space: false };
      return;
    }
    dt = Math.min(dt, .05);
    const inp = input.current;
    const root = collision?.current ?? null;
    const cast = (r: Raycaster): Intersection[] =>
      (root ? r.intersectObject(root, true) : r.intersectObjects(scene.children, true)).filter(isWalkingSurface);

    // Look
    yaw.current -= inp.look.dx * 0.0045;
    pitch.current = MathUtils.clamp(pitch.current - inp.look.dy * 0.0045, -1.1, 1.1);
    inp.look.dx = 0;
    inp.look.dy = 0;
    camera.rotation.set(pitch.current, yaw.current, 0, "YXZ");

    // Move (horizontal, relative to look direction)
    let mx = inp.move.x;
    let my = inp.move.y;
    if (keys.current.w) my -= 1;
    if (keys.current.s) my += 1;
    if (keys.current.a) mx -= 1;
    if (keys.current.d) mx += 1;
    mx = MathUtils.clamp(mx, -1, 1);
    my = MathUtils.clamp(my, -1, 1);

    const mag = Math.min(1, Math.hypot(mx, my));
    if (mag > 0.02) {
      fwd.current.set(-Math.sin(yaw.current), 0, -Math.cos(yaw.current));
      rgt.current.set(Math.cos(yaw.current), 0, -Math.sin(yaw.current));
      dir.current.set(0, 0, 0).addScaledVector(fwd.current, -my).addScaledVector(rgt.current, mx);
      if (dir.current.lengthSq() > 0) {
        dir.current.normalize();
        const activeSpeed = keys.current.shift ? speed * 2.5 : speed;
        const step = activeSpeed * dt * mag;

        // Wall collision: cast at waist height (0.8m) to catch walls/furniture
        from.current.set(camera.position.x, camera.position.y - 0.7, camera.position.z);
        wallRay.current.set(from.current, dir.current);
        wallRay.current.far = step + 0.4;
        const wall = cast(wallRay.current)
          .filter((h) => (h.object as { type?: string }).type === "Mesh");
        if (!(wall.length && wall[0].distance < step + 0.35)) {
          camera.position.addScaledVector(dir.current, step);
        }
      }
    }

    // Hard boundary clamp - player can never leave the room
    if (bounds) {
      camera.position.x = MathUtils.clamp(camera.position.x, bounds.minX, bounds.maxX);
      camera.position.z = MathUtils.clamp(camera.position.z, bounds.minZ, bounds.maxZ);
    }

    // Jump & Gravity
    if (allowJump && isGrounded.current && keys.current.space) {
      velY.current = 4.5;
      isGrounded.current = false;
    }
    velY.current -= 12.0 * dt;
    camera.position.y += velY.current * dt;

    // Floor detection - cast from well above, ignore hits above knee height (0.5m)
    const rayOriginY = Math.max(camera.position.y + 2, eyeHeight + 2);
    from.current.set(camera.position.x, rayOriginY, camera.position.z);
    floorRay.current.set(from.current, DOWN.current);
    floorRay.current.far = rayOriginY + 1;
    const ground = cast(floorRay.current)
      .filter((h) => {
        if ((h.object as { type?: string }).type !== "Mesh") return false;
        if (!terrainWalking) return h.point.y < 0.5;
        if (!h.face) return false;
        floorNormal.current.copy(h.face.normal).transformDirection(h.object.matrixWorld);
        return isTerrainFloor(h.point.y, camera.position.y - eyeHeight, floorNormal.current.y);
      });

    if (ground.length) {
      const floorY = ground[0].point.y + eyeHeight;
      if (camera.position.y <= floorY + 0.05 && velY.current <= 0) {
        camera.position.y = floorY;
        velY.current = 0;
        isGrounded.current = true;
      } else {
        isGrounded.current = false;
      }
    } else if (terrainWalking) {
      isGrounded.current = false;
      // Recovery only if a model is unavailable or the visitor falls off its edge.
      if (camera.position.y < -8) {
        camera.position.set(sx, sy, sz);
        velY.current = 0;
      }
    } else {
      // Safety net: no floor found, snap to default height
      if (camera.position.y < eyeHeight) {
        camera.position.y = eyeHeight;
        velY.current = 0;
        isGrounded.current = true;
      } else {
        isGrounded.current = false;
      }
    }

    // Absolute floor - never fall below ground level
    if (!terrainWalking && camera.position.y < eyeHeight - 0.5) {
      camera.position.y = eyeHeight;
      velY.current = 0;
      isGrounded.current = true;
    }

    // Footstep sway. Applied after the floor snap, which rewrites y every
    // frame - so this stays a visual offset and never accumulates.
    if (headBob) {
      const walking = mag > 0.02 && isGrounded.current;
      const target = walking ? (keys.current.shift ? 1.5 : 1) : 0;
      bobAmount.current += (target - bobAmount.current) * Math.min(1, dt * 8);
      if (walking) {
        const prev = bobPhase.current;
        bobPhase.current += dt * (keys.current.shift ? 13 : 8.5) * mag;
        if (onStep && Math.floor(bobPhase.current / Math.PI) !== Math.floor(prev / Math.PI)) onStep();
      }
      const a = bobAmount.current;
      if (a > 0.001) {
        camera.position.y += Math.sin(bobPhase.current * 2) * 0.022 * a;
        camera.rotation.z = Math.sin(bobPhase.current) * 0.007 * a;
      } else {
        camera.rotation.z = 0;
      }
    }
  });

  return null;
}
