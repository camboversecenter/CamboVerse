import { describe, expect, it } from 'vitest';
import { waterExperiment } from './chemistryBench';
describe('water reaction bench', () => {
  it('conserves every atom for every allowed tray', () => {
    for (let h=0;h<=4;h++) for(let o=0;o<=2;o++) {
      const r=waterExperiment(h,o);
      expect(r.atoms.filter(a=>a.element==='H')).toHaveLength(h*2);
      expect(r.atoms.filter(a=>a.element==='O')).toHaveLength(o*2);
      expect(r.water*2+r.leftH*2).toBe(h*2);
      expect(r.water+r.leftO*2).toBe(o*2);
      expect(new Set(r.atoms.map(a=>a.id)).size).toBe(r.atoms.length);
      expect(r.after.flat().every(i=>i>=0&&i<r.atoms.length)).toBe(true);
    }
  });
  it('forms water and retains excess reactants',()=>{
    expect(waterExperiment(3,1)).toMatchObject({water:2,leftH:1,leftO:0});
    expect(waterExperiment(1,2)).toMatchObject({water:0,leftH:1,leftO:2});
  });
});
