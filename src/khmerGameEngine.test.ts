import { describe, expect, it } from 'vitest';
import { actGame, newGame, parseRecords, tickGame, timingZone, type GameLevel, type GameState } from './khmerGameEngine';
import type { GamePlay } from './games';

function advance(s: GameState, seconds: number, fps = 50) {
  for (let i = 0; i < seconds * fps; i++) s = tickGame(s, 1 / fps);
  return s;
}
function start(kind: GamePlay, level: GameLevel = 'practice') { return advance(actGame(newGame(kind, level), 'start'), 3.05); }

describe('Khmer game lifecycle', () => {
  for (const kind of ['aim', 'race', 'tug', 'catch'] as const) {
    it(`${kind}: waits for Start, counts down, pauses and resets completely`, () => {
      const fresh = newGame(kind);
      expect(tickGame(fresh, .1)).toBe(fresh);
      expect(actGame(fresh, 'action')).toBe(fresh);
      let state = advance(actGame(fresh, 'start'), 1);
      expect(state.phase).toBe('countdown');
      const paused = actGame(state, 'pause');
      expect(advance(paused, 40)).toBe(paused);
      state = advance(actGame(paused, 'resume'), 2.1);
      expect(state.phase).toBe('playing');
      const playingPause = actGame(state, 'pause');
      expect(advance(playingPause, 20)).toBe(playingPause);
      expect(actGame(playingPause, 'restart')).toEqual(fresh);
    });
    for (const level of ['practice', 'challenge'] as const) {
      it(`${kind}/${level}: can win through normal timed controls`, () => {
        let state = start(kind, level);
        for (let i = 0; i < 4000 && state.phase !== 'result'; i++) {
          state = tickGame(state, .02);
          if (state.phase !== 'playing') continue;
          if (kind === 'race' && state.elapsed - state.lastInput > .3) state = actGame(state, state.nextFoot);
          if (kind !== 'race') {
            const [low, high] = timingZone(state);
            if (Math.abs(state.position - (low + high) / 2) < 2 && state.elapsed - state.lastInput > .85) state = actGame(state, 'action');
          }
        }
        expect(state.phase).toBe('result');
        expect(state.won).toBe(true);
        expect(state.score).toBeGreaterThanOrEqual(60);
        expect(tickGame(state, .1)).toBe(state);
        expect(actGame(state, 'action')).toBe(state);
      });
    }
  }
});

describe('Game rules and edge cases', () => {
  it('accepts exactly three pot hits, rejects four misses, and locks each attempt', () => {
    for (const hits of [1, 3]) {
      let s = start('aim');
      for (let i = 0; i < 5; i++) {
        s = { ...s, position: i < hits ? s.target : 0 };
        s = actGame(s, 'action');
        expect(actGame(s, 'action')).toBe(s);
        s = advance(s, .82);
      }
      expect(s.phase).toBe('result'); expect(s.won).toBe(hits >= 3); expect(s.attempts).toBe(5);
    }
  });
  it('keeps the catch zone inside the visible track and permits a missed throw', () => {
    let s = start('catch');
    expect(timingZone(s)[1]).toBeLessThanOrEqual(100);
    s = actGame(s, 'action'); // too early
    s = advance(s, .82);
    expect(s.phase).toBe('playing'); expect(s.attempts).toBe(1);
    for (let i = 0; i < 4; i++) { s = actGame({ ...s, position: 85 }, 'action'); s = advance(s, .82); }
    expect(s.won).toBe(true); expect(s.hits).toBe(4);
  });
  it('finishes a scarf round with no input after five missed throws', () => {
    const s = advance(start('catch'), 25);
    expect(s.phase).toBe('result'); expect(s.attempts).toBe(5); expect(s.won).toBe(false);
  });
  it('prevents repeated-side race progress and rapid duplicate hops', () => {
    let s = actGame(start('race'), 'right');
    expect(s.you).toBe(0); expect(s.cooldown).toBeGreaterThan(0);
    expect(actGame(s, 'left')).toBe(s);
    s = actGame(advance(s, .5), 'left');
    expect(s.you).toBe(5); expect(s.nextFoot).toBe('right');
    expect(actGame(s, 'right')).toBe(s);
  });
  it('lets the rival win an idle race and does not stall after a stumble', () => {
    let s = actGame(start('race'), 'right');
    s = advance(s, 20);
    expect(s.phase).toBe('result'); expect(s.won).toBe(false); expect(s.rival).toBe(100);
  });
  it('rewards timed tugging and ignores button mashing', () => {
    const initial = { ...start('tug'), position: 50 };
    const good = actGame(initial, 'action');
    expect(good.you - initial.you).toBe(10);
    expect(actGame(good, 'action')).toBe(good);
    const early = actGame({ ...initial, position: 0 }, 'action');
    expect(early.you - initial.you).toBe(1);
    expect(advance(start('tug'), 20).won).toBe(false);
    expect(advance(start('tug'), 20).phase).toBe('result');
  });
  it('moves at the same speed at 30 and 60 fps and clamps resumed frames', () => {
    const initial = start('race');
    expect(advance(initial, 2, 30).rival).toBeCloseTo(advance(initial, 2, 60).rival, 5);
    expect(tickGame(initial, 90).elapsed - initial.elapsed).toBeCloseTo(.1);
    expect(tickGame(initial, NaN)).toBe(initial);
  });
  it('recovers safely from corrupt or unrelated stored records', () => {
    expect(parseRecords('{bad')).toEqual({}); expect(parseRecords('null')).toEqual({});
    expect(parseRecords('{"vay-kaom":{"played":1,"wins":2,"best":999}}')).toEqual({});
    expect(parseRecords('{"vay-kaom":{"played":3,"wins":2,"best":80},"unknown":{}}')).toEqual({ 'vay-kaom': { played: 3, wins: 2, best: 80 } });
  });
});
