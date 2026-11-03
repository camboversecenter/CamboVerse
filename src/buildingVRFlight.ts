export type BuildingVRFlightState={mode:'walking'|'flying'|'landing';y:number;held:boolean};

/** Physical metres, before the capture's scale. B is edge-triggered; A/X hold. */
export function advanceBuildingVRFlight(state:BuildingVRFlightState,input:{toggle:boolean;rise:boolean;descend:boolean;currentY:number;floorY:number;running:boolean;maxY?:number},delta:number):BuildingVRFlightState{
  const dt=Math.max(0,Math.min(delta,.05));
  let {mode,y}=state;
  if(input.toggle&&!state.held){
    mode=mode==='flying'?'landing':'flying';
    y=Math.max(input.floorY,input.currentY);
  }
  if(mode==='flying'){
    y+=(Number(input.rise)-Number(input.descend))*(input.running?5:2)*dt;
    y=Math.max(input.floorY,Math.min(input.maxY??input.floorY+60,y));
  }else if(mode==='landing'){
    y=Math.max(input.floorY,Math.min(input.maxY??Infinity,y-2.5*dt));
    if(y<=input.floorY)mode='walking';
  }else y=input.currentY;
  return {mode,y,held:input.toggle};
}
