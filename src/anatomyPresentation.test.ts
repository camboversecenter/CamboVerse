import { describe, it, expect } from 'vitest';
import { centeredAnchor, HEAD_ANCHORS, studyDistance, showAnnotation, anchoredStudyPosition } from './anatomyPresentation';
import { Vector3 } from 'three';

describe('anatomy study presentation', () => {
  it('keeps study placement fixed as the camera moves, and recaptures after return', () => {
    const cameraTarget = new Vector3(1,2,3);
    const first = anchoredStudyPosition(null, cameraTarget);
    cameraTarget.set(8,9,10);
    expect(anchoredStudyPosition(first,cameraTarget).toArray()).toEqual([1,2,3]);
    expect(anchoredStudyPosition(null,cameraTarget).toArray()).toEqual([8,9,10]);
  });
  it('shows only the selected head landmark, even at default zoom', () => {
    expect([0,1,2,3,4].filter(i => showAnnotation(true,i,2,1))).toEqual([2]);
    expect(showAnnotation(true,0,null,3)).toBe(false);
    expect(showAnnotation(false,0,null,1)).toBe(false);
    expect(showAnnotation(false,0,null,1.2)).toBe(true);
  });
  it('moves body-frame anchors into the centered mesh frame', () => {
    expect(centeredAnchor([2,70,8], [1,68,6])).toEqual([1,2,2]);
    expect(centeredAnchor([1,68,6], [1,68,6])).toEqual([0,0,0]);
  });
  it('has one authored anchor per existing head label', () => {
    expect(Object.fromEntries(Object.entries(HEAD_ANCHORS).map(([id,p])=>[id,p.length])))
      .toEqual({nose:3,mouth:4,ears:4,eyes:5});
    expect(Object.values(HEAD_ANCHORS).flat(2).every(Number.isFinite)).toBe(true);
  });
  it('fits a rotating model in portrait and landscape viewports', () => {
    for (const [w,h] of [[390,300],[300,600],[760,200]]) {
      const distance=studyDistance(w,h);
      const halfY=65*Math.PI/360;
      const halfX=Math.atan(Math.tan(halfY)*w/h);
      expect(Math.asin(.24/distance)).toBeLessThan(Math.min(halfY,halfX));
      expect(distance).toBeGreaterThan(.24+.05);
    }
    expect(studyDistance(300,600)).toBeGreaterThan(studyDistance(600,300));
  });
});
