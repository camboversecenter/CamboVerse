import { describe, expect, it } from 'vitest';
import { SPOTS } from './spots';
import { initialHeritageSite, isHeritageTrial, withHeritageTrial, HERITAGE_TRIAL_URL } from './heritagePreview';

describe('temporary heritage trial', () => {
  const search = '?site=banteay-chhmar&modelPreview=banteay-chhmar-v3';
  it('requires development, explicit opt-in, and the matching site', () => {
    expect(isHeritageTrial(search, true, 'banteay-chhmar')).toBe(true);
    expect(isHeritageTrial(search, false, 'banteay-chhmar')).toBe(false);
    expect(isHeritageTrial('', true, 'banteay-chhmar')).toBe(false);
    expect(isHeritageTrial(search, true, 'bayon')).toBe(false);
    expect(initialHeritageSite(search, false)).toBeNull();
    expect(initialHeritageSite('', true)).toBeNull();
    expect(initialHeritageSite('?site=banteay-chhmar', true)).toBe('banteay-chhmar');
  });
  it('keeps Normal and the original catalog untouched', () => {
    const original = SPOTS.find(s => s.id === 'banteay-chhmar')!;
    const before = JSON.stringify(original);
    const trial = withHeritageTrial(original);
    expect(trial.model).toBe(original.model);
    expect(trial.heritageUltraModel).toBe(HERITAGE_TRIAL_URL);
    expect(JSON.stringify(original)).toBe(before);
    expect(trial.pois).toHaveLength(5);
  });
});
