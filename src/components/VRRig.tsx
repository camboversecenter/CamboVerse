import { useRef } from "react";
import { Group } from "three";
import { XROrigin, useXRControllerLocomotion } from "@react-three/xr";

/**
 * The VR player. Places the visitor standing in the scene and drives them with
 * the controller thumbsticks — left stick to walk, right stick to snap-turn.
 * Harmless outside a VR session (the hook simply does nothing).
 */
export function VRRig({ position }: { position: [number, number, number] }) {
  const ref = useRef<Group>(null);
  useXRControllerLocomotion(ref, { speed: 2.6 }, { type: "snap", degrees: 30 });
  return <XROrigin ref={ref} position={position} />;
}
