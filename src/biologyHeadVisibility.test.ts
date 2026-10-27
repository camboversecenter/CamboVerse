import { describe, expect, it } from 'vitest';
import { showBiologyOrgan, isFittedHeadPart } from './biologyRoomState';

describe('fitted facial study visibility', () => {
  for (const id of ['eyes', 'ears', 'nose', 'mouth']) {
    it(`${id} is assembled on the skull and available separately`, () => {
      expect(isFittedHeadPart(id)).toBe(true);
      expect(showBiologyOrgan('combined', id, null)).toBe(true);
      expect(showBiologyOrgan('combined', id, 'heart')).toBe(true);
      expect(showBiologyOrgan('combined', id, id)).toBe(true);
      expect(showBiologyOrgan('cutaway', id, null)).toBe(true);
      expect(showBiologyOrgan('frame', id, null)).toBe(false);
    });
  }
  it('keeps internal organs in the combined view', () => {
    for (const id of ['brain', 'heart', 'lungs', 'thyroid']) {
      expect(isFittedHeadPart(id)).toBe(false);
      expect(showBiologyOrgan('combined', id, null)).toBe(true);
    }
  });
});
