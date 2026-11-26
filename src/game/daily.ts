import { CATEGORIES, PACK_CATEGORIES, type CategoryId } from './categories';
import type { Hall } from './hall';
import type { AnswerResult, GameConfig } from './session';

/**
 * The daily challenge: the same 10 questions for everyone on the same day, one try that counts,
 * and a streak for playing day after day.
 */

export const DAILY_QUESTIONS = 10;

/** Local date as YYYY-MM-DD. */
export function dateKey(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** A number from the date, so every phone gets the same game on the same day. */
export function dailySeed(key: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** The categories in play: every main category (no local/holiday packs). */
export const DAILY_CATEGORIES: readonly CategoryId[] = CATEGORIES.map((c) => c.id).filter((id) => !PACK_CATEGORIES.includes(id));

export function dailyConfig(): GameConfig {
  return {
    categories: [...DAILY_CATEGORIES],
    rounds: 2,
    questionsPerRound: DAILY_QUESTIONS / 2,
    timeLimitMs: 20000,
    ageGroup: 'teen',
    hints: 0,
    lightning: false,
    finalWager: false,
    mixCategories: true,
  };
}

/** Days in a row the daily was played, ending today (or yesterday, if today isn't played yet). */
export function dailyStreak(hall: Hall, today: Date): number {
  const played = new Set(hall.games.map((g) => g.daily).filter(Boolean));
  const d = new Date(today);
  if (!played.has(dateKey(d))) d.setDate(d.getDate() - 1);
  let n = 0;
  while (played.has(dateKey(d))) {
    n += 1;
    d.setDate(d.getDate() - 1);
  }
  return n;
}

/** Today's counted result, if the daily was already played. */
export function todaysDaily(hall: Hall, today: Date): { score: number; correct: number } | null {
  const g = hall.games.find((x) => x.daily === dateKey(today));
  return g ? { score: g.entries[0]?.score ?? 0, correct: g.entries[0]?.correct ?? 0 } : null;
}

/** A spoiler-free result to paste into a group chat. */
export function shareText(key: string, history: readonly AnswerResult[], score: number, streak: number): string {
  const squares = history.map((r) => (r.correct ? '🟩' : '🟥')).join('');
  const right = history.filter((r) => r.correct).length;
  return `Trivia Party Daily ${key}\n${squares} ${right}/${history.length}\n${score.toLocaleString('en-US')} points${streak > 1 ? ` · 🔥 ${streak}-day streak` : ''}`;
}
