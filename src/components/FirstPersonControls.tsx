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
  start = [0, 1.5, 5.4],
}: {
  input: MutableRefObject<WalkInput>;
  start?: [number, number, number];
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
  const EYE = 1.25;
  const SPEED = 2.4;

  useEffect(() => {
    camera.rotation.order = "YXZ";
    camera.position.set(start[0], start[1], start[2]);
    yaw.current = 0;
    pitch.current = -0.04;
  }, [camera, start]);

  useFrame((_, dt) => {
    const inp = input.current;

    // Look
    yaw.current -= inp.look.dx * 0.0045;
    pitch.current = MathUtils.clamp(pitch.current - inp.look.dy * 0.0045, -1.1, 1.1);
    inp.look.dx = 0;
    inp.look.dy = 0;
    camera.rotation.set(pitch.current, yaw.current, 0, "YXZ");

    // Move (horizontal, relative to look direction)
    const mx = inp.move.x;
    const my = inp.move.y;
    const mag = Math.min(1, Math.hypot(mx, my));
    if (mag > 0.02) {
      fwd.current.set(-Math.sin(yaw.current), 0, -Math.cos(yaw.current));
      rgt.current.set(Math.cos(yaw.current), 0, -Math.sin(yaw.current));
      dir.current.set(0, 0, 0).addScaledVector(fwd.current, -my).addScaledVector(rgt.current, mx);
      if (dir.current.lengthSq() > 0) {
        dir.current.normalize();
        const step = SPEED * dt * mag;
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

    // Stay on the floor
    from.current.set(camera.position.x, camera.position.y + 2, camera.position.z);
    ray.current.set(from.current, DOWN.current);
    ray.current.far = 8;
    const ground = ray.current
      .intersectObjects(scene.children, true)
      .filter((h) => (h.object as { type?: string }).type === "Mesh");
    if (ground.length) camera.position.y = ground[0].point.y + EYE;
  });

  return null;
}
