import { describe, it, expect } from 'vitest';
import { HEAD_LEARNING } from './headLearning';
describe('head learning cards', () => {
  it('covers all four head groups with complete content and references', () => {
    expect(Object.keys(HEAD_LEARNING).sort()).toEqual(['ears','eyes','mouth','nose']);
    for (const card of Object.values(HEAD_LEARNING)) {
      for (const field of ['summary','location','function','limitations'] as const) expect(card[field].length).toBeGreaterThan(30);
      expect(card.subparts.length).toBeGreaterThanOrEqual(4);
      expect(card.references.length).toBeGreaterThan(0);
      for (const source of card.references) expect(new URL(source.url).protocol).toBe('https:');
      expect(card.summary.length).toBeLessThan(250);
    }
  });
});
