import {describe,expect,it} from 'vitest';
import {advanceBuildingVRFlight,type BuildingVRFlightState} from './buildingVRFlight';
describe('Buildings VR flight',()=>{
  const idle={toggle:false,rise:false,descend:false,currentY:0,floorY:0,running:false};
  it('starts from the current jump height and consumes a held B only once',()=>{
    let state:BuildingVRFlightState={mode:'walking',y:0,held:false};
    state=advanceBuildingVRFlight(state,{...idle,toggle:true,currentY:.7},1/60);
    expect(state.mode).toBe('flying');expect(state.y).toBe(.7);
    state=advanceBuildingVRFlight(state,{...idle,toggle:true,currentY:.7},1/60);
    expect(state.mode).toBe('flying');expect(state.y).toBe(.7);
  });
  it('clamps frame time, respects the ground, and allows cancelling a landing',()=>{
    let state=advanceBuildingVRFlight({mode:'flying',y:4,held:false},{...idle,rise:true,running:true},10);
    expect(state.y).toBe(4.25);
    state=advanceBuildingVRFlight(state,{...idle,toggle:true,currentY:4.25},.05);
    expect(state.mode).toBe('landing');expect(state.y).toBe(4.125);
    state=advanceBuildingVRFlight(state,idle,.05);
    state=advanceBuildingVRFlight(state,{...idle,toggle:true,currentY:state.y},.05);
    expect(state.mode).toBe('flying');
    state=advanceBuildingVRFlight({mode:'flying',y:.01,held:false},{...idle,descend:true},.05);
    expect(state.y).toBe(0);
  });
});
