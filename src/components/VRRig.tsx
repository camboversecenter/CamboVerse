import { useEffect, useMemo, useRef } from "react";
import { Group, Vector3 } from "three";
import { useFrame } from "@react-three/fiber";
import { XROrigin, useXR, useXRControllerLocomotion } from "@react-three/xr";
import type { Poi } from "../spots";

/**
 * The VR player. Places the visitor standing in the scene and drives them with
 * the controller thumbsticks — left stick to walk, right stick to snap-turn.
 * Selecting a point of interest (with the controller ray) glides them there.
 * Harmless outside a VR session (the hooks simply do nothing).
 */
export function VRRig({ position, poi }: { position: [number, number, number]; poi?: Poi | null }) {
  const ref = useRef<Group>(null);
  useXRControllerLocomotion(ref, { speed: 2.6 }, { type: "snap", degrees: 30 });
  const presenting = useXR((s) => s.session != null);

  // Glide the origin to the POI's vantage (at floor level) when one is picked.
  const target = useMemo(() => (poi ? new Vector3(poi.camera[0], 0, poi.camera[2]) : null), [poi]);
  const done = useRef(false);
  useEffect(() => {
    done.current = false;
  }, [poi]);
  useFrame(() => {
    const g = ref.current;
    if (!presenting || !poi || !target || done.current || !g) return;
    g.position.lerp(target, 0.12);
    if (g.position.distanceTo(target) < 0.08) done.current = true;
  });

  return <XROrigin ref={ref} position={position} />;
}
