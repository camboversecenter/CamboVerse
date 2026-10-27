import { applyProps } from '@react-three/fiber';
import { Group, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { SPOTS } from '../spots';
import { SceneAssetGroup } from './SceneAssetGroup';

describe('capture / temple transitions', () => {
  const capture = SPOTS.find(s => s.id === 'wat-phnom')!.pois!
    .find(p => p.capture)!.capture!;

  it('restores an upright temple after repeated capture visits in either detail tier', () => {
    const group = new Group();
    for (const tier of ['normal', 'ultra'] as const) {
      expect(capture[tier]).toBeTruthy();
      for (let visit = 0; visit < 3; visit++) {
        // Apply the actual component props with the renderer, on the same
        // Three.js object just as React does when switching these views.
        applyProps(group, SceneAssetGroup({ capture, modelScale: 1.3, modelY: 2 }).props);
        expect(group.rotation.x).toBeCloseTo(Math.PI / 2);
        expect(group.position.toArray()).toEqual(capture.position);
        expect(group.scale.toArray()).toEqual([capture.scale, capture.scale, capture.scale]);

        applyProps(group, SceneAssetGroup({ modelScale: 1.3, modelY: 2 }).props);
        expect(group.rotation.toArray().slice(0, 3)).toEqual([0, 0, 0]);
        expect(group.position.toArray()).toEqual([0, 2, 0]);
        expect(group.scale.toArray()).toEqual([1.3, 1.3, 1.3]);
        group.updateMatrixWorld(true);
        expect(new Vector3(0, 1, 0).transformDirection(group.matrixWorld).toArray())
          .toEqual([0, 1, 0]);
      }
    }
  });

  it('also starts upright before any capture has been opened', () => {
    const group = new Group();
    applyProps(group, SceneAssetGroup({ modelScale: 1, modelY: 0 }).props);
    expect(group.quaternion.toArray()).toEqual([0, 0, 0, 1]);
  });

  it('restores the temple after the independently scaled clock capture',()=>{
    const clock=SPOTS.find(s=>s.id==='wat-phnom')!.pois!.find(p=>p.id==='flower-clock')!.capture!;
    const group=new Group();
    applyProps(group,SceneAssetGroup({capture:clock,modelScale:1,modelY:1.4}).props);
    expect(group.scale.x).toBe(12);expect(group.rotation.x).toBeCloseTo(Math.PI/2);
    applyProps(group,SceneAssetGroup({modelScale:1,modelY:1.4}).props);
    expect(group.scale.toArray()).toEqual([1,1,1]);
    expect(group.rotation.toArray().slice(0,3)).toEqual([0,0,0]);
    expect(group.position.toArray()).toEqual([0,1.4,0]);
  });
});
