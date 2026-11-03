import {describe, expect, it} from 'vitest';
import {captureLabelPosition} from './hotspotLayout';

describe('capture label placement', () => {
  it('keeps a phone label below the VR, quality and guide buttons', () => {
    const [x,y] = captureLabelPosition(350,45,390,844);
    expect(x - 110).toBeGreaterThanOrEqual(12);
    expect(x + 110).toBeLessThanOrEqual(378);
    expect(y - 22).toBeGreaterThan(174);
  });
  it('leaves central labels attached and unseen anchors outside the viewport', () => {
    expect(captureLabelPosition(400,300,1200,800)).toEqual([400,300]);
    expect(captureLabelPosition(-50,20,390,844)).toEqual([-50,20]);
    expect(captureLabelPosition(200,-60,390,844)).toEqual([200,-60]);
  });
  it('keeps the label above walking controls and handles a short viewport', () => {
    expect(captureLabelPosition(200,820,390,844)[1]).toBe(684);
    const [x,y] = captureLabelPosition(40,100,240,240);
    expect(x).toBe(120); expect(y).toBe(120);
  });
});
