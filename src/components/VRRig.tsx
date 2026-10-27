import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { Group, Vector3 } from "three";
import { useFrame } from "@react-three/fiber";
import { XROrigin, useXR, useXRStore, useXRControllerLocomotion } from "@react-three/xr";
import type { Poi, CaptureWalkArea, PoiCapture } from "../spots";
import { areaGroundHeight, constrainAreaPosition } from '../captureAreaWalk';
import { captureVRArrival, captureVRFloor, captureVRScale, captureVRInputStep } from '../captureVR';

/**
 * The VR player. Places the visitor standing in the scene and drives them with
 * the controller thumbsticks left stick to walk, right stick to snap-turn.
 * Selecting a point of interest (with the controller ray) glides them there.
 * Harmless outside a VR session (the hooks simply do nothing).
 */
export function VRRig({ position, poi, elevatedStops = false, area, capture, resetKey=0 }: { position: [number, number, number]; poi?: Poi | null; elevatedStops?: boolean; area?:CaptureWalkArea;capture?:PoiCapture;resetKey?:number }) {
  const ref = useRef<Group>(null);
  // Captures handle their calibrated input below. A no-op target also avoids
  // the legacy hook applying a retained vector while its options are false.
  useXRControllerLocomotion(capture?()=>{}:ref, capture?false:{ speed: area?.speed ?? 2.6 }, capture?false:{ type: "snap", degrees: 30 });
  const store=useXRStore(),canTurn=useRef(true);
  const presenting = useXR((s) => s.session != null);
  const head=useMemo(()=>new Vector3(),[]);
  const direction=useMemo(()=>new Vector3(),[]),beforeTurn=useMemo(()=>new Vector3(),[]);
  const scale=presenting&&capture?captureVRScale(capture):1;
  useLayoutEffect(()=>{
    if(!presenting||!capture||!ref.current)return;
    const arrival=captureVRArrival(capture);
    ref.current.position.set(...arrival.position);ref.current.rotation.set(0,arrival.yaw,0);
    canTurn.current=true;
  },[presenting,capture,resetKey]);

  // Glide the origin to the POI's vantage (at floor level) when one is picked.
  // Hill-site viewing stops must not teleport the origin underneath the hill.
  const target = useMemo(() => (poi ? new Vector3(poi.camera[0], elevatedStops ? poi.camera[1] - 1.6 : 0, poi.camera[2]) : null), [poi, elevatedStops]);
  const done = useRef(false);
  useEffect(() => {
    done.current = false;
  }, [poi]);
  // Re-enter at the capture's outside path; the headset supplies eye height.
  useEffect(()=>{if(presenting&&area&&!capture&&ref.current)ref.current.position.set(area.start[0],areaGroundHeight(area,...area.start),area.start[1]);},[presenting,area,capture]);
  useFrame(({camera},delta) => {
    const g = ref.current;
    if(presenting&&capture&&g){
      const sources=store.getState().inputSourceStates;
      const left=sources.find(s=>s.type==='controller'&&s.inputSource.handedness==='left');
      const right=sources.find(s=>s.type==='controller'&&s.inputSource.handedness==='right');
      const move=left?.type==='controller'?left.gamepad['xr-standard-thumbstick']:undefined;
      const turn=right?.type==='controller'?right.gamepad['xr-standard-thumbstick']:undefined;
      g.updateWorldMatrix(true,true);camera.getWorldDirection(direction);
      const yaw=Math.atan2(-direction.x,-direction.z);
      const step=captureVRInputStep(move?.xAxis??0,-(move?.yAxis??0),turn?.xAxis??0,yaw,capture.walk ? .45 : capture.walkAround?.speed??1.4,delta,canTurn.current);
      canTurn.current=step.canTurn;
      if(step.angle){
        // Pivot around the visitor's head, not a distant room-scale origin.
        camera.getWorldPosition(beforeTurn);g.rotation.y+=step.angle;
        g.updateWorldMatrix(true,true);camera.getWorldPosition(head);
        g.position.x+=beforeTurn.x-head.x;g.position.z+=beforeTurn.z-head.z;
      }
      g.position.x+=step.dx;g.position.z+=step.dz;
      // Include room-scale head offsets in the same boundary as thumbsticks.
      g.updateWorldMatrix(true,true);camera.getWorldPosition(head);
      const [x,y,z]=captureVRFloor(capture,head.x,head.z);
      g.position.x+=x-head.x;g.position.z+=z-head.z;g.position.y=y;return;
    }
    if(presenting&&area&&g){
      const [x,z]=constrainAreaPosition(area,g.position.x,g.position.z);
      g.position.set(x,areaGroundHeight(area,x,z),z);return;
    }
    if (!presenting || !poi || !target || done.current || !g) return;
    g.position.lerp(target, 0.12);
    if (g.position.distanceTo(target) < 0.08) done.current = true;
  });

  return <XROrigin ref={ref} position={position} scale={scale}/>;
}
