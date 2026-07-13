import { useRef, type MutableRefObject, type PointerEvent as RPointerEvent } from "react";
import type { WalkInput } from "./FirstPersonControls";

/**
 * Touch/mouse overlay for walk mode: a left thumb-joystick to move, and drag
 * anywhere else to look. Multi-touch aware (joystick + look at once) via
 * pointer ids. Writes into the shared `input` ref read by FirstPersonControls.
 */
export function WalkControls({ input }: { input: MutableRefObject<WalkInput> }) {
  const joyRef = useRef<HTMLDivElement>(null);
  const knobRef = useRef<HTMLDivElement>(null);
  const joyId = useRef<number | null>(null);
  const lookId = useRef<number | null>(null);
  const lookLast = useRef({ x: 0, y: 0 });
  const center = useRef({ x: 0, y: 0 });
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
    const jr = joyRef.current?.getBoundingClientRect();
    const cx = jr ? jr.left + jr.width / 2 : 0;
    const cy = jr ? jr.top + jr.height / 2 : 0;
    const near = Math.hypot(e.clientX - cx, e.clientY - cy) < R * 1.7;
    e.currentTarget.setPointerCapture(e.pointerId);
    if (near && joyId.current === null) {
      joyId.current = e.pointerId;
      center.current = { x: cx, y: cy };
      setJoy(e.clientX, e.clientY);
    } else if (lookId.current === null) {
      lookId.current = e.pointerId;
      lookLast.current = { x: e.clientX, y: e.clientY };
    }
  };

  const onMove = (e: RPointerEvent) => {
    if (e.pointerId === joyId.current) {
      setJoy(e.clientX, e.clientY);
    } else if (e.pointerId === lookId.current) {
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
    }
  };

  return (
    <div
      className="walk-layer"
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
    >
      <div className="joystick" ref={joyRef}>
        <div className="joy-knob" ref={knobRef} />
      </div>
      <div className="walk-hint">Joystick to move · drag to look</div>
    </div>
  );
}
