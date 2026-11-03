import {describe,expect,it} from 'vitest';
import {sampleInFlame,flameExplanation} from './ExperienceRoomFlame';
import {FLAME_TESTS} from '../chemistry';

describe('flame-test target',()=>{
  it('accepts samples in the flame and rejects the rack, distant or invalid positions',()=>{
    expect(sampleInFlame(0,.27,0)).toBe(true);
    expect(sampleInFlame(.1,.27,0)).toBe(true);
    expect(sampleInFlame(0,0,.22)).toBe(false);
    expect(sampleInFlame(.23,.27,0)).toBe(false);
    expect(sampleInFlame(NaN,.27,0)).toBe(false);
  });
  it('describes each flame colour without asserting an unverified wavelength',()=>{
    for (const entry of FLAME_TESTS) {
      const result=flameExplanation(entry);
      expect(result).toContain(entry.name);
      expect(result).toContain(entry.color.toLowerCase());
      expect(result).toContain('emit light');
      expect(result).not.toContain(entry.wavelength);
    }
  });
});
