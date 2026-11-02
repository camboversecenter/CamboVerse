import type {CaptureJumpState} from './captureWalk';

export const RUN_MULTIPLIER=2.5;
export const BUILDING_VR_HELP='Left stick: move. Hold the left grip to speed up. On foot, press right A to jump, then press again in the air for a second jump. Press right B to fly; hold A to rise or left X to descend. Press B again to land. Right stick: snap turn. Left Y opens or closes the campus guide. Movement stays available while reading; point and press a trigger to select guide buttons. Use the headset system menu to leave VR.';

/** At most two presses per flight; holding A never repeats. Floor-relative metres. */
export function buildingVRJump(state:CaptureJumpState,held:boolean,pressed:boolean,delta:number,jumpsUsed=0){
  const dt=Math.max(0,Math.min(delta,.05)),requested=pressed&&!held;
  if(state.grounded)jumpsUsed=0;
  if(state.grounded&&!requested)return {state:{y:0,velocity:0,grounded:true},held:pressed,jumpsUsed};
  const launch=requested&&jumpsUsed<2;
  if(launch)jumpsUsed=state.grounded?1:Math.max(1,jumpsUsed)+1;
  const velocity=launch?3.2:state.velocity;
  const y=(state.grounded?0:state.y)+velocity*dt-4.9*dt*dt;
  const landed=y<=0&&velocity-9.8*dt<=0;
  return {state:landed?{y:0,velocity:0,grounded:true}:{y,velocity:velocity-9.8*dt,grounded:false},held:pressed,jumpsUsed:landed?0:jumpsUsed};
}
