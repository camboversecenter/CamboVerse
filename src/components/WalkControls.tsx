import { useRef, type MutableRefObject, type PointerEvent as RPointerEvent } from "react";
import type { WalkInput } from "./FirstPersonControls";

/**
 * Touch/mouse overlay for walk mode: a left thumb-joystick to move, and drag
 * anywhere else to look. Multi-touch aware (joystick + look at once) via
 * pointer ids. Writes into the shared `input` ref read by FirstPersonControls.
 */
export function WalkControls({
  input,
  hint = "Joystick to move · drag to look",
  showJoystick = true,
  onActivate,
}: {
  input: MutableRefObject<WalkInput>;
  hint?: string;
  showJoystick?: boolean;
  /** Double-click/double-tap action used by capture viewpoint navigation. */
  onActivate?: () => void;
}) {
  const joyRef = useRef<HTMLDivElement>(null);
  const knobRef = useRef<HTMLDivElement>(null);
  const joyId = useRef<number | null>(null);
  const lookId = useRef<number | null>(null);
  const lookLast = useRef({ x: 0, y: 0 });
  const center = useRef({ x: 0, y: 0 });
  const tapStart = useRef({ x: 0, y: 0, moved: false });
  const lastTap = useRef({ time: -Infinity, x: 0, y: 0 });
  const R = 52;

  const setJoy = (x: number, y: number) => {
    let dx = x - center.current.x;
    let dy = y - center.current.y;
    const d = Math.hypot(dx, dy) || 1;
    const m = Math.min(1, d / R);
    dx = (dx / d) * m;
    dy = (dy / d) * m;
    input.current.move = { x: dx, y: dy };
    if (knobRef.current) knobRef.current.style.transform = `translate(${dx * R}px, ${dy * R}px)`;
  };

  const onDown = (e: RPointerEvent) => {
    if (e.button !== 0) return;
    const jr = joyRef.current?.getBoundingClientRect();
    const cx = jr ? jr.left + jr.width / 2 : 0;
    const cy = jr ? jr.top + jr.height / 2 : 0;
    const near = showJoystick && Math.hypot(e.clientX - cx, e.clientY - cy) < R * 1.7;
    e.currentTarget.setPointerCapture(e.pointerId);
    if (near && joyId.current === null) {
      joyId.current = e.pointerId;
      center.current = { x: cx, y: cy };
      setJoy(e.clientX, e.clientY);
    } else if (lookId.current === null) {
      lookId.current = e.pointerId;
      lookLast.current = { x: e.clientX, y: e.clientY };
      tapStart.current = { x: e.clientX, y: e.clientY, moved: false };
    }
  };

  const onMove = (e: RPointerEvent) => {
    if (e.pointerId === joyId.current) {
      setJoy(e.clientX, e.clientY);
    } else if (e.pointerId === lookId.current) {
      if (Math.hypot(e.clientX - tapStart.current.x, e.clientY - tapStart.current.y) > 8) {
        tapStart.current.moved = true;
      }
      input.current.look.dx += e.clientX - lookLast.current.x;
      input.current.look.dy += e.clientY - lookLast.current.y;
      lookLast.current = { x: e.clientX, y: e.clientY };
    }
  };

  const onUp = (e: RPointerEvent) => {
    if (e.pointerId === joyId.current) {
      joyId.current = null;
      input.current.move = { x: 0, y: 0 };
      if (knobRef.current) knobRef.current.style.transform = "translate(0,0)";
    } else if (e.pointerId === lookId.current) {
      lookId.current = null;
      if (onActivate && e.type === "pointerup" && !tapStart.current.moved) {
        const now = performance.now();
        const close = Math.hypot(e.clientX - lastTap.current.x, e.clientY - lastTap.current.y) < 36;
        if (now - lastTap.current.time < 360 && close) {
          lastTap.current.time = -Infinity;
          onActivate();
        } else {
          lastTap.current = { time: now, x: e.clientX, y: e.clientY };
        }
      } else {
        lastTap.current.time = -Infinity;
      }
    }
  };

  return (
    <div
      className={`walk-layer${showJoystick ? "" : " viewpoint-mode"}`}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
      onLostPointerCapture={onUp}
    >
      {showJoystick && <div className="joystick" ref={joyRef}>
        <div className="joy-knob" ref={knobRef} />
      </div>}
      {hint && <div className="walk-hint">{hint}</div>}
    </div>
  );
}
