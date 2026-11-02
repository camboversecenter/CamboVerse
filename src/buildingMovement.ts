import type {CaptureJumpState} from './captureWalk';

export const RUN_MULTIPLIER=2.5;
export const BUILDING_VR_HELP='Left stick: walk. Hold the left grip to run. Press A on the right controller to jump. Right stick: snap turn. Use the headset system menu to leave VR.';

/** One A press per jump. Offset is relative to the authored floor, in metres. */
export function buildingVRJump(state:CaptureJumpState,held:boolean,pressed:boolean,delta:number){
  const dt=Math.max(0,Math.min(delta,.05)),requested=pressed&&!held;
  if(state.grounded&&!requested)return {state:{y:0,velocity:0,grounded:true},held:pressed};
  const velocity=state.grounded?3.2:state.velocity;
  const y=(state.grounded?0:state.y)+velocity*dt-4.9*dt*dt;
  return {state:y<=0&&velocity-9.8*dt<=0?{y:0,velocity:0,grounded:true}:{y,velocity:velocity-9.8*dt,grounded:false},held:pressed};
}
