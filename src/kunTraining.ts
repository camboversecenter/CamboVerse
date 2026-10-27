import { KUN_MOVES } from './kunkhmer';

export type KunLevel = 'relaxed' | 'challenge';
export type KunPhase = 'ready' | 'countdown' | 'prompt' | 'feedback' | 'paused' | 'done';
export const KUN_ROUND = 8;
export const KUN_PASS = 6;
export const promptSeconds = (level: KunLevel) => level === 'relaxed' ? 4.5 : 2.6;
export interface KunAnswer { wanted: string; picked: string | null; correct: boolean; seconds: number }
export interface KunRound {
  phase: KunPhase; resume: KunPhase; level: KunLevel; order: string[];
  index: number; remaining: number; answers: KunAnswer[]; streak: number; bestStreak: number;
}
export function newKunRound(level: KunLevel = 'relaxed'): KunRound {
  return { phase: 'ready', resume: 'ready', level, order: [], index: 0, remaining: 0, answers: [], streak: 0, bestStreak: 0 };
}
/** Every round includes all seven techniques, plus one different final prompt. */
export function kunSequence(random: () => number = Math.random): string[] {
  const ids = KUN_MOVES.map(m => m.id);
  for (let i = ids.length - 1; i > 0; i--) {
    const j = Math.min(i, Math.max(0, Math.floor(random() * (i + 1))));
    [ids[i], ids[j]] = [ids[j], ids[i]];
  }
  return [...ids, ids[0]];
}
export function startKunRound(level: KunLevel, order = kunSequence()): KunRound {
  const valid = order.length === KUN_ROUND && order.every(id => KUN_MOVES.some(m => m.id === id));
  return { ...newKunRound(level), phase: 'countdown', remaining: 3, order: valid ? [...order] : kunSequence() };
}
export function pauseKunRound(s: KunRound): KunRound {
  return ['countdown', 'prompt', 'feedback'].includes(s.phase) ? { ...s, resume: s.phase, phase: 'paused' } : s;
}
export function resumeKunRound(s: KunRound): KunRound {
  return s.phase === 'paused' ? { ...s, phase: s.resume } : s;
}
export function answerKunRound(s: KunRound, picked: string | null): KunRound {
  if (s.phase !== 'prompt' || (picked !== null && !KUN_MOVES.some(m => m.id === picked))) return s;
  const correct = picked === s.order[s.index];
  const streak = correct ? s.streak + 1 : 0;
  return { ...s, phase: 'feedback', remaining: 1.1, streak, bestStreak: Math.max(s.bestStreak, streak),
    answers: [...s.answers, { wanted: s.order[s.index], picked, correct, seconds: Math.max(0, promptSeconds(s.level) - s.remaining) }] };
}
export function tickKunRound(s: KunRound, seconds: number): KunRound {
  if (!['countdown', 'prompt', 'feedback'].includes(s.phase) || !Number.isFinite(seconds) || seconds <= 0) return s;
  const remaining = Math.max(0, s.remaining - Math.min(seconds, .1));
  if (remaining > .000001) return { ...s, remaining };
  if (s.phase === 'prompt') return answerKunRound({ ...s, remaining: 0 }, null);
  if (s.phase === 'feedback' && s.index === KUN_ROUND - 1) return { ...s, phase: 'done', remaining: 0 };
  return { ...s, phase: 'prompt', index: s.phase === 'feedback' ? s.index + 1 : 0, remaining: promptSeconds(s.level) };
}
export const kunScore = (s: KunRound) => s.answers.filter(a => a.correct).length;
export const KUN_RECORD_KEY = 'camboverse.kun-training.v2';
export interface KunRecord { seen: string[]; rounds: number; best: number; wins: number }
export function parseKunRecord(raw: string | null): KunRecord {
  const empty = { seen: [], rounds: 0, best: 0, wins: 0 };
  try {
    const data = JSON.parse(raw ?? 'null');
    if (!data || ![data.rounds, data.best, data.wins].every(n => Number.isSafeInteger(n) && n >= 0) || data.best > KUN_ROUND || data.wins > data.rounds) return empty;
    return { seen: Array.isArray(data.seen) ? [...new Set<string>(data.seen.filter((id: unknown) => KUN_MOVES.some(m => m.id === id)))] : [], rounds: data.rounds, best: data.best, wins: data.wins };
  } catch { return empty; }
}
