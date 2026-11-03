import {describe, expect, it} from 'vitest';
import {labStationArrival, type LabBounds} from './labVRNavigation';

describe('Learning Lab station arrivals',()=>{
  it.each([[0,1.4,-3],[-4.2,1.4,0],[4.2,1.4,0],[0,1.4,3],[0,1.4,0]])('approaches %j from the aisle, facing the exhibit',(...at)=>{
    const bounds:LabBounds=[-5.4,5.4,-4.4,4.4];
    const result=labStationArrival(at as [number,number,number],bounds);
    const [x,y,z]=result.position;
    expect(y).toBe(0);expect(Math.hypot(x-at[0],z-at[2])).toBeCloseTo(1.6);
    const dx=at[0]-x,dz=at[2]-z;
    expect(-Math.sin(result.yaw)).toBeCloseTo(dx/1.6);expect(-Math.cos(result.yaw)).toBeCloseTo(dz/1.6);
  });
  it('keeps a malformed or moved exhibit inside the room and preserves floor height',()=>{
    const result=labStationArrival([50,10,-50],[-2,2,-2,2],.2);
    expect(result.position).toEqual([2,.2,-2]);
  });
});
