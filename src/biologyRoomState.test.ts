import { describe, expect, it } from 'vitest';
import { biologyTransition as step, biologyParts, canTakeBiologyPart, showBiologyOrgan, initialBiologyState as initial } from './biologyRoomState';
import { SPECIMENS } from './lab';

describe('biology room learning loop', () => {
  it('does not offer or select retired skin and facial surface regions', () => {
    expect(biologyParts.every(p => p.layer !== 'whole')).toBe(true);
    for(const id of ['skin','eye-left','eye-right','ear-left','ear-right']) {
      expect(step(initial,{type:'select',id})).toEqual(initial);
    }
    expect(step(initial,{type:'layer',layer:'whole'})).toEqual(initial);
  });
  it('keeps skeleton context while selecting and extracting an organ', () => {
    const combined = step(initial, { type: 'layer', layer: 'combined' });
    const heart = step(combined, { type: 'select', id: 'heart' });
    expect(step(heart, { type: 'take' })).toEqual({ layer: 'combined', selected: 'heart', taken: 'heart' });
    expect(step(combined, { type: 'select', id: 'skeleton' }).layer).toBe('combined');
  });
  it('offers an independent muscles layer without extraction', () => {
    const muscle = step(initial, { type: 'select', id: 'muscles' });
    expect(muscle.layer).toBe('muscles');
    expect(step(muscle, { type: 'take' }).taken).toBeNull();
  });
  it('starts at skeleton plus organs with an empty tray', () => {
    expect(initial).toEqual({ layer: 'combined', selected: null, taken: null });
  });
  it('exposes a selected organ, takes it and returns it', () => {
    const selected = step(initial, { type: 'select', id: 'heart' });
    expect(selected.layer).toBe('combined');
    const taken = step(selected, { type: 'take' });
    expect(taken.taken).toBe('heart');
    expect(step(taken, { type: 'take' })).toEqual(selected);
  });
  it('returns the previous structure when selecting a different one', () => {
    const taken = { layer: 'cutaway' as const, selected: 'heart', taken: 'heart' };
    expect(step(taken, { type: 'select', id: 'lungs' }).taken).toBeNull();
    expect(step(taken, { type: 'select', id: 'heart' })).toEqual(taken);
  });
  it('does not extract surface skin or the whole skeleton', () => {
    for (const id of ['skin', 'skeleton']) {
      expect(step(step(initial, { type: 'select', id }), { type: 'take' }).taken).toBeNull();
    }
  });
  it('keeps all internal lesson parts reachable and extractable', () => {
    for (const part of SPECIMENS.find(s => s.id === 'human-body')!.parts.filter(p => p.layer === 'cutaway')) {
      expect(step(step(initial, { type: 'select', id: part.id }), { type: 'take' }).taken).toBe(part.id);
    }
  });
  it('round-trips every organ from both organ views and preserves visibility', () => {
    const organs = biologyParts.filter(p => p.layer === 'cutaway');
    expect(organs).toHaveLength(23);
    for (const layer of ['combined', 'cutaway'] as const) {
      for (const part of organs) {
        expect(canTakeBiologyPart(part.id)).toBe(true);
        const selected = step({ ...initial, layer }, { type: 'select', id: part.id });
        const taken = step(selected, { type: 'take' });
        expect(taken).toEqual({ layer, selected: part.id, taken: part.id });
        expect(showBiologyOrgan(layer, part.id, taken.taken)).toBe(true);
        expect(step(taken, { type: 'take' })).toEqual(selected);
        for (const next of organs) {
          const nextSelected = step(taken, { type: 'select', id: next.id });
          expect(nextSelected.taken).toBe(next.id === part.id ? part.id : null);
        }
        for (const nextLayer of ['frame', 'cutaway', 'combined', 'muscles'] as const) {
          expect(step(taken, { type: 'layer', layer: nextLayer }).taken).toBeNull();
        }
      }
    }
    for (const id of ['skeleton', 'muscles', 'missing', null]) expect(canTakeBiologyPart(id)).toBe(false);
  });
  it('layer changes and reset clear the tray; unknown selections are ignored', () => {
    const taken = { layer: 'cutaway' as const, selected: 'kidneys', taken: 'kidneys' };
    expect(step(taken, { type: 'layer', layer: 'frame' })).toEqual({ layer: 'frame', selected: null, taken: null });
    expect(step(taken, { type: 'reset' })).toEqual(initial);
    expect(step(taken, { type: 'select', id: 'missing' })).toEqual(taken);
  });
});
