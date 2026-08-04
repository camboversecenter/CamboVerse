import { useEffect, useRef, type MutableRefObject } from "react";
import { useThree, useFrame } from "@react-three/fiber";
import { Raycaster, Vector3, MathUtils } from "three";

export interface WalkInput {
  move: { x: number; y: number }; // joystick, [-1..1]; y<0 = forward
  look: { dx: number; dy: number }; // accumulated drag delta (px)
}

/**
 * Lightweight first-person walk controller: joystick moves, drag looks. Uses
 * ray casts against the scene for wall collision (blocked, not clipping) and a
 * downward ray to stay on the floor — no physics engine, cheap on mobile.
 */
export function FirstPersonControls({
  input,
  start = [0, 1.5, 9.5],
  startYaw = 0,
  speed = 2.4,
  eyeHeight = 1.25,
}: {
  input: MutableRefObject<WalkInput>;
  start?: [number, number, number];
  /** Which way the visitor faces on arrival (radians, 0 = looking down −Z).
   *  Lets a scene drop someone in already looking at the thing they came for. */
  startYaw?: number;
  speed?: number;
  eyeHeight?: number;
}) {
  const camera = useThree((s) => s.camera);
  const scene = useThree((s) => s.scene);
  const yaw = useRef(0);
  const pitch = useRef(-0.04);
  const ray = useRef(new Raycaster());
  const fwd = useRef(new Vector3());
  const rgt = useRef(new Vector3());
  const dir = useRef(new Vector3());
  const from = useRef(new Vector3());
  const DOWN = useRef(new Vector3(0, -1, 0));
  /** Eye height of a standing adult — the camera is snapped to this above
   *  whatever ground is underfoot, every frame. */
  // const EYE = eyeHeight ?? 1.65;
  // const SPEED = speed;
  const keys = useRef({ w: false, a: false, s: false, d: false, shift: false, space: false });
  const velY = useRef(0);
  const isGrounded = useRef(false);

  useEffect(() => {
    camera.rotation.order = "YXZ";
    camera.position.set(start[0], start[1], start[2]);
    yaw.current = startYaw;
    pitch.current = -0.04;
    velY.current = 0;
  }, [camera, start, startYaw]);

  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
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
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
    };
  }, []);

  useFrame((_, dt) => {
    const inp = input.current;

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
        ray.current.set(camera.position, dir.current);
        ray.current.far = step + 0.4;
        const wall = ray.current
          .intersectObjects(scene.children, true)
          .filter((h) => (h.object as { type?: string }).type === "Mesh");
        if (!(wall.length && wall[0].distance < step + 0.35)) {
          camera.position.addScaledVector(dir.current, step);
        }
      }
    }

    // Jump & Gravity
    if (isGrounded.current && keys.current.space) {
      velY.current = 4.5; // Jump strength
      isGrounded.current = false;
    }
    velY.current -= 12.0 * dt; // Gravity
    camera.position.y += velY.current * dt;

    // Stay on the floor
    from.current.set(camera.position.x, Math.max(camera.position.y + 2, 2), camera.position.z);
    ray.current.set(from.current, DOWN.current);
    ray.current.far = Math.max(8, camera.position.y + 2);
    const ground = ray.current
      .intersectObjects(scene.children, true)
      .filter((h) => (h.object as { type?: string }).type === "Mesh");
    
    if (ground.length) {
      const floorY = ground[0].point.y + eyeHeight;
      if (camera.position.y <= floorY + 0.05 && velY.current <= 0) {
        camera.position.y = floorY;
        velY.current = 0;
        isGrounded.current = true;
      } else {
        isGrounded.current = false;
      }
    } else {
      isGrounded.current = false;
    }
  });

  return null;
}
