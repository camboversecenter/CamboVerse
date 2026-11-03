import {describe, expect, it} from 'vitest';
import {findRecipe} from './chemistry';
import {mixSelected,canDose} from './labExperiments';
import {tideHeight} from './earthsky';

describe('shared lab experiment results',()=>{
  it('preserves chemical quantities when reagents are picked in reverse order or slots have gaps',()=>{
    const recipe=findRecipe('h2','o2')!;
    const normal=mixSelected(recipe,['h2','o2'],[20,10]);
    const reverse=mixSelected(recipe,['o2',null,'h2'],[10,99,20]);
    expect(normal.limiting).toBe(-1);expect(reverse).toEqual(normal);
  });
  it('only doses a tilted vial above the actual vessel opening',()=>{
    expect(canDose(0,1.4,-4.04,0)).toBe(true);
    expect(canDose(0,1.4,-4.04,1)).toBe(false);
    expect(canDose(.5,1.4,-4.04,0)).toBe(false);
    expect(canDose(0,.9,-4.04,0)).toBe(false);
    expect(canDose(0,1.2,-4.04,0)).toBe(false);
    expect(canDose(0,2,-4.04,0)).toBe(false);
    expect(canDose(NaN,1.4,-4.04,0)).toBe(false);
  });
  it('models opposing high tides and perpendicular lows in the ideal teaching model',()=>{
    expect(tideHeight(0,0)).toBeCloseTo(1);expect(tideHeight(0,180)).toBeCloseTo(1);
    expect(tideHeight(0,90)).toBeCloseTo(0);expect(tideHeight(0,270)).toBeCloseTo(0);
    expect(tideHeight(30,30)).toBeCloseTo(tideHeight(30,210));
  });
});
