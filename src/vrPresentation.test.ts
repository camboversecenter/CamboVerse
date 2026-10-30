import {describe,expect,it} from 'vitest';
import {worldPanelPose,wrapVRText,vrMarkerScale} from './vrPresentation';
import {OBJECT_INFO,STAIRCASE_OBJECT_ANCHORS} from './objectHotspots';

describe('world-anchored VR information',()=>{
  it('keeps distant object labels readable at a consistent angular width',()=>{
    for(const distance of [.1,.5,1,4,12])expect(.95*vrMarkerScale(distance)/distance).toBeCloseTo(.26);
    expect(Number.isFinite(vrMarkerScale(0))).toBe(true);
  });
  it('creates an upright snapshot unaffected by head pitch or later movement',()=>{
    const head={x:1,y:1.6,z:3},direction={x:0,y:.9,z:-.1};
    const pose=worldPanelPose(head,direction,1);
    expect(pose.position).toEqual([1,1.3800000000000001,1.3]);
    expect(Math.abs(pose.yaw)).toBe(0);
    head.x=50;direction.x=1;
    expect(pose.position[0]).toBe(1); // snapshot, not a live head reference
    expect(worldPanelPose(head,{x:0,y:1,z:0},.2).position.every(Number.isFinite)).toBe(true);
  });
  it('uses capture scale for comfortable panel distances and keeps its side placement',()=>{
    const head={x:0,y:2,z:0},forward={x:1,y:0,z:0};
    const pose=worldPanelPose(head,forward,.25,-.95);
    expect(pose.position[0]).toBeCloseTo(.425);
    expect(pose.position[1]).toBeCloseTo(2-.22*.25);
    expect(pose.position[2]).toBeCloseTo(-.95*.25);
    expect(pose.yaw).toBeCloseTo(-Math.PI/2);
  });
  it('fits all existing staircase descriptions without dropping facts',()=>{
    for(const {id} of STAIRCASE_OBJECT_ANCHORS){
      const text=OBJECT_INFO[id].text;
      const lines=wrapVRText(text,928,s=>s.length*18);
      expect(lines.join(' ')).toBe(text);
      // Body starts at 120px; each line is 44px, with credits starting at 650px.
      expect(120+lines.length*44).toBeLessThan(650);
      expect(lines.every(line=>line.length*18<=928)).toBe(true);
    }
  });
});
