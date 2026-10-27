import { describe, expect, it } from 'vitest';
import { KUN_MOVES } from './kunkhmer';
import { answerKunRound, kunScore, kunSequence, newKunRound, parseKunRecord, pauseKunRound, promptSeconds, resumeKunRound, startKunRound, tickKunRound, type KunRound } from './kunTraining';

function advance(s: KunRound, seconds: number, fps = 60) {
  for (let i = 0; i < Math.ceil(seconds * fps); i++) s = tickKunRound(s, 1 / fps);
  return s;
}
const sequence = [...KUN_MOVES.map(m => m.id), KUN_MOVES[0].id];
describe('Kun Khmer training lifecycle', () => {
  it('waits for explicit start and counts down before accepting input', () => {
    const ready = newKunRound();
    expect(advance(ready, 10)).toBe(ready);
    const started = startKunRound('relaxed', sequence);
    expect(answerKunRound(started, 'mat')).toBe(started);
    expect(advance(started, 3).phase).toBe('prompt');
  });
  it('includes every move and avoids repeated adjacent prompts', () => {
    for (const rng of [() => 0, () => .5, () => .999]) {
      const order = kunSequence(rng);
      expect(new Set(order.slice(0,7)).size).toBe(7);
      expect(order).toHaveLength(8);
      expect(order.every((id,i) => i === 0 || id !== order[i-1])).toBe(true);
    }
  });
  for (const level of ['relaxed', 'challenge'] as const) {
    it(`completes all eight correct answers in ${level}`, () => {
      let s = advance(startKunRound(level, sequence), 3);
      for (let i = 0; i < 8; i++) {
        expect(s.phase).toBe('prompt');
        expect(s.remaining).toBeCloseTo(promptSeconds(level));
        s = answerKunRound(advance(s, .3), sequence[i]);
        s = advance(s, 1.1);
      }
      expect(s.phase).toBe('done'); expect(kunScore(s)).toBe(8);
      expect(s.bestStreak).toBe(8); expect(s.answers).toHaveLength(8);
      expect(s.answers[0].seconds).toBeCloseTo(.3);
      expect(advance(s, 10)).toBe(s);
    });
  }
  for (const phase of ['countdown', 'prompt', 'feedback'] as const) {
    it(`freezes and resumes ${phase} without losing remaining time`, () => {
      let s = startKunRound('relaxed', sequence);
      if (phase !== 'countdown') s = advance(s, 3.4);
      if (phase === 'feedback') s = answerKunRound(s, sequence[0]);
      const paused = pauseKunRound(s);
      expect(advance(paused, 20)).toBe(paused);
      expect(answerKunRound(paused, sequence[0])).toBe(paused);
      expect(resumeKunRound(paused)).toEqual({ ...s, resume: s.phase });
    });
  }
  it('accepts exactly one answer and rejects unknown keys', () => {
    const prompt = advance(startKunRound('relaxed', sequence), 3);
    expect(answerKunRound(prompt, 'unknown')).toBe(prompt);
    const answered = answerKunRound(prompt, sequence[0]);
    expect(answerKunRound(answered, sequence[0])).toBe(answered);
  });
  it('handles unattended rounds and records missed techniques for review', () => {
    const s = advance(startKunRound('challenge', sequence), 35);
    expect(s.phase).toBe('done'); expect(kunScore(s)).toBe(0);
    expect(s.answers).toHaveLength(8);
    expect(s.answers.every(a => a.picked === null && !a.correct)).toBe(true);
  });
  it('resets the streak after a mistake and preserves the best streak', () => {
    let s = advance(startKunRound('relaxed', sequence), 3);
    s = advance(answerKunRound(s, sequence[0]), 1.1);
    s = advance(answerKunRound(s, sequence[1]), 1.1);
    s = answerKunRound(s, sequence[0]);
    expect(s.streak).toBe(0); expect(s.bestStreak).toBe(2);
  });
  it('restarts without a stale feedback advance', () => {
    const old = answerKunRound(advance(startKunRound('relaxed', sequence), 3), sequence[0]);
    const restart = startKunRound('challenge', sequence);
    advance(old, 2);
    expect(restart.phase).toBe('countdown'); expect(restart.answers).toEqual([]);
  });
  it('uses frame-independent seconds and clamps tab stalls', () => {
    const s = startKunRound('relaxed', sequence);
    expect(advance(s, 1, 30).remaining).toBeCloseTo(advance(s, 1, 60).remaining);
    expect(tickKunRound(s, 60).remaining).toBeCloseTo(2.9);
    expect(tickKunRound(s, NaN)).toBe(s);
  });
  it('recovers from corrupt local progress and filters unknown techniques', () => {
    expect(parseKunRecord('{bad').rounds).toBe(0);
    expect(parseKunRecord('{"rounds":1,"best":9,"wins":0}').best).toBe(0);
    expect(parseKunRecord('{"rounds":1,"best":8,"wins":2}').wins).toBe(0);
    expect(parseKunRecord(JSON.stringify({ rounds:2,best:7,wins:1,seen:['mat','mat','bad'] }))).toEqual({rounds:2,best:7,wins:1,seen:['mat']});
  });
});
