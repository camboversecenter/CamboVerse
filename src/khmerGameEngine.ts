import type { GamePlay } from './games';

export type GameLevel = 'practice' | 'challenge';
export type GamePhase = 'ready' | 'countdown' | 'playing' | 'paused' | 'result';
export type GameAction = 'start' | 'pause' | 'resume' | 'restart' | 'action' | 'left' | 'right';
export interface GameState {
  kind: GamePlay; level: GameLevel; phase: GamePhase; beforePause: 'countdown' | 'playing';
  countdown: number; elapsed: number; position: number; target: number; attempts: number;
  hits: number; you: number; rival: number; nextFoot: 'left' | 'right';
  cooldown: number; lastInput: number; feedback: string; won: boolean; score: number;
}
export const GAME_RULES = {
  aim: { goal: 'Land 3 hits in 5 swings.', controls: 'Swing when the white marker enters the highlighted pot zone.', keys: 'Space to swing' },
  race: { goal: 'Reach the finish before the rival.', controls: 'Alternate Left and Right at a steady pace. Repeating a side causes a short stumble.', keys: '← / A and → / D to hop' },
  tug: { goal: 'Pull the ribbon all the way to your side.', controls: 'Pull when the beat marker enters the green zone. Steady teamwork beats rapid tapping.', keys: 'Space to pull' },
  catch: { goal: 'Catch 3 of 5 throws.', controls: 'Catch when the scarf reaches the highlighted zone. A missed throw still leaves another chance.', keys: 'Space to catch' },
} satisfies Record<GamePlay, { goal: string; controls: string; keys: string }>;

export function newGame(kind: GamePlay, level: GameLevel = 'practice'): GameState {
  return { kind, level, phase: 'ready', beforePause: 'playing', countdown: 3, elapsed: 0,
    position: kind === 'aim' ? 0 : 0, target: 50, attempts: 0, hits: 0, you: kind === 'tug' ? 50 : 0,
    rival: 0, nextFoot: 'left', cooldown: 0, lastInput: -10, feedback: '', won: false, score: 0 };
}
export function timingZone(s: GameState): [number, number] {
  if (s.kind === 'catch') return [s.level === 'practice' ? 64 : 74, 94];
  if (s.kind === 'tug') return s.level === 'practice' ? [22, 78] : [32, 68];
  const half = s.level === 'practice' ? 18 : 12;
  return [Math.max(0, s.target - half), Math.min(100, s.target + half)];
}
export function result(s: GameState, won: boolean): GameState {
  const score = s.kind === 'aim' || s.kind === 'catch' ? s.hits * 20
    : won ? Math.max(60, Math.round(100 - s.elapsed)) : Math.round(s.you / 2);
  return { ...s, phase: 'result', won, score: Math.min(100, Math.max(0, score)), cooldown: 0 };
}
function resolveAttempt(s: GameState, hit: boolean, feedback: string): GameState {
  return { ...s, attempts: s.attempts + 1, hits: s.hits + Number(hit), feedback, cooldown: .8 };
}

/** Pure, seconds-based simulation shared by desktop, touch and WebXR controls. */
export function tickGame(state: GameState, dt: number): GameState {
  if (!Number.isFinite(dt) || dt <= 0 || !['playing', 'countdown'].includes(state.phase)) return state;
  dt = Math.min(dt, .1); // Never jump ahead after a suspended browser frame.
  if (state.phase === 'countdown') {
    const countdown = Math.max(0, state.countdown - dt);
    return { ...state, countdown, phase: countdown > .0001 ? 'countdown' : 'playing' };
  }
  let s = { ...state, elapsed: state.elapsed + dt };
  if (s.cooldown > 0) {
    s.cooldown = Math.max(0, s.cooldown - dt);
    if (s.cooldown === 0) {
      if ((s.kind === 'aim' || s.kind === 'catch') && s.attempts >= 5) return result(s, s.hits >= 3);
      s.feedback = '';
      if (s.kind === 'catch') s.position = 0;
      if (s.kind === 'aim') s.target = [50, 32, 68, 44, 59][s.attempts];
    }
    // The rival still moves during a race stumble.
    if (s.kind !== 'race') return s;
  }
  if (s.kind === 'aim') {
    const speed = s.level === 'practice' ? 40 : 65;
    // Store sweep direction in rival (unused by the timing games).
    let next = s.position + dt * speed * (s.rival === -1 ? -1 : 1);
    if (next >= 100) { next = 200 - next; s.rival = -1; }
    if (next <= 0) { next = -next; s.rival = 1; }
    s.position = next;
  } else if (s.kind === 'race') {
    s.rival = Math.min(100, s.rival + dt * (s.level === 'practice' ? 6 : 8.5));
    if (s.rival >= 100) return result(s, false);
  } else if (s.kind === 'tug') {
    s.position = (s.elapsed % 1.1) / 1.1 * 100;
    s.you = Math.max(0, s.you - dt * (s.level === 'practice' ? 3.1 : 4.1));
    if (s.you === 0 || s.elapsed >= 40) return result(s, false);
  } else {
    s.position = Math.min(100, s.position + dt * (s.level === 'practice' ? 30 : 43));
    if (s.position >= 100) s = resolveAttempt(s, false, 'Missed this throw — watch the catch zone.');
  }
  return s;
}

export function actGame(s: GameState, action: GameAction): GameState {
  if (action === 'restart') return newGame(s.kind, s.level);
  if (action === 'start' && (s.phase === 'ready' || s.phase === 'result')) return { ...newGame(s.kind, s.level), phase: 'countdown' };
  if (action === 'pause' && (s.phase === 'playing' || s.phase === 'countdown')) return { ...s, phase: 'paused', beforePause: s.phase };
  if (action === 'resume' && s.phase === 'paused') return { ...s, phase: s.beforePause };
  if (s.phase !== 'playing') return s;
  if (s.kind === 'race') {
    if (!['left', 'right'].includes(action) || s.cooldown > 0 || s.elapsed - s.lastInput < .18) return s;
    if (action !== s.nextFoot) return { ...s, cooldown: .45, feedback: `Try ${s.nextFoot} next.`, lastInput: s.elapsed };
    const you = Math.min(100, s.you + 5);
    const next = { ...s, you, nextFoot: s.nextFoot === 'left' ? 'right' as const : 'left' as const, lastInput: s.elapsed, feedback: 'Good hop!' };
    return you >= 100 ? result(next, true) : next;
  }
  if (action !== 'action' || s.cooldown > 0) return s;
  if (s.kind === 'tug') {
    if (s.elapsed - s.lastInput < .5) return s;
    const [min, max] = timingZone(s);
    const good = s.position >= min && s.position <= max;
    const you = Math.min(100, s.you + (good ? 10 : 1));
    const next = { ...s, you, hits: s.hits + Number(good), attempts: s.attempts + 1,
      lastInput: s.elapsed, feedback: good ? 'Together! A strong pull.' : 'Wait for the green beat zone.' };
    return you >= 100 ? result(next, true) : next;
  }
  const [min, max] = timingZone(s);
  const hit = s.position >= min && s.position <= max;
  return resolveAttempt(s, hit, hit ? s.kind === 'aim' ? 'A clean hit!' : 'Caught it!'
    : s.position < min ? 'Too early — wait for the zone.' : 'Too late — try a little earlier.');
}

export interface GameRecord { played: number; wins: number; best: number }
export type GameRecords = Record<string, GameRecord>;
export const GAME_RECORD_KEY = 'camboverse.games.records.v2';
export function parseRecords(raw: string | null): GameRecords {
  try {
    const value: unknown = JSON.parse(raw ?? '{}');
    if (!value || typeof value !== 'object') return {};
    const records: GameRecords = {};
    for (const id of ['vay-kaom', 'loat-bao', 'teanh-prot', 'chol-chhoung']) {
      const r = (value as GameRecords)[id];
      if (r && [r.played, r.wins, r.best].every(Number.isFinite) && r.played >= 0 && r.wins >= 0 && r.wins <= r.played && r.best >= 0 && r.best <= 100) records[id] = r;
    }
    return records;
  } catch { return {}; }
}
