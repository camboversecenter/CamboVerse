import {useEffect, useMemo, useRef} from 'react';
import {useFrame, type ThreeEvent} from '@react-three/fiber';
import {useXR} from '@react-three/xr';
import {Group, Plane, Vector3} from 'three';
import {sliderValue} from '../labManipulation';
import {useLabGrabbable, useLabInteraction} from './LabInteraction';
import {VRSurface} from './VRSurface';

/** The same value setter can be reached by trigger-drag, grip, or +/- buttons. */
export function LabSlider3D({label, value, min, max, step, onChange, position, unit = ''}: {
  label: string; value: number; min: number; max: number; step: number;
  onChange: (value: number) => void; position: [number, number, number]; unit?: string;
}) {
  const root = useRef<Group>(null), knob = useRef<Group>(null), drag = useRef<number | null>(null);
  const capture = useRef<{releasePointerCapture: (id: number) => void} | null>(null);
  const session = useXR(s => s.session);
  const interaction = useLabInteraction();
  const math = useMemo(() => ({plane: new Plane(), normal: new Vector3(), point: new Vector3(), origin: new Vector3()}), []);
  const latestValue = useRef(value); latestValue.current = value;
  const commit = (x: number) => {
    const next = sliderValue((x + .3) / .6, min, max, step);
    if (next !== latestValue.current) {latestValue.current = next; onChange(next);}
  };
  const held = useLabGrabbable(knob, true, {onMove: object => {
    if (!root.current) return;
    object.getWorldPosition(math.point); root.current.worldToLocal(math.point); commit(math.point.x);
  }});
  const endDrag = () => {
    if (drag.current !== null) capture.current?.releasePointerCapture(drag.current);
    drag.current = null; capture.current = null;
  };
  useEffect(() => {
    session?.addEventListener('visibilitychange', endDrag);
    return () => {session?.removeEventListener('visibilitychange', endDrag); endDrag();};
  }, [session]);
  useFrame(() => {
    if (interaction?.blocked && drag.current !== null) endDrag();
    if (knob.current && !held()) knob.current.position.set(-.3 + (value - min) / (max - min) * .6, 0, .025);
  });
  const move = (e: ThreeEvent<PointerEvent>) => {
    if (!root.current || drag.current !== e.pointerId) return;
    e.stopPropagation(); root.current.updateWorldMatrix(true, false);
    math.normal.set(0, 0, 1).transformDirection(root.current.matrixWorld);
    root.current.getWorldPosition(math.origin); math.plane.setFromNormalAndCoplanarPoint(math.normal, math.origin);
    if (e.ray.intersectPlane(math.plane, math.point)) commit(root.current.worldToLocal(math.point).x);
  };
  return <group ref={root} position={position}>
    <group position={[0,.13,0]}><VRSurface variant="heading" title={`${label}: ${value.toFixed(step < 1 ? 1 : 0)}${unit}`} width={.95} height={.11}/></group>
    <group onPointerDown={e => {
      e.stopPropagation();
      if (drag.current !== null || held() || interaction?.blocked) return;
      drag.current = e.pointerId;
      const target = e.target as unknown as Element;
      target.setPointerCapture(e.pointerId); capture.current = target; move(e);
    }} onPointerMove={move} onPointerUp={e => {if (e.pointerId === drag.current) {e.stopPropagation(); endDrag();}}}
      onPointerCancel={endDrag}>
    <mesh>
      <boxGeometry args={[.68,.09,.025]}/><meshStandardMaterial color="#294e56"/>
    </mesh>
    <group ref={knob}><mesh><sphereGeometry args={[.045,12,8]}/><meshStandardMaterial color="#f0cf70"/></mesh></group>
    </group>
    <group position={[-.46,0,0]}><VRSurface title="−" width={.14} height={.12} onClick={() => onChange(Math.max(min, value - step))}/></group>
    <group position={[.46,0,0]}><VRSurface title="+" width={.14} height={.12} onClick={() => onChange(Math.min(max, value + step))}/></group>
  </group>;
}
