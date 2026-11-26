import type { Award } from './awards';
import type { AnswerResult, TeamScore } from './session';

/**
 * The hall of fame: every finished game on this device, kept in local storage.
 * Pure functions take and return a Hall so they're easy to test; load/save touch storage.
 */

export interface HallEntry {
  name: string;
  score: number;
  correct: number;
  answered: number;
  bestStreak: number;
  color: string;
}

export interface GameRecord {
  at: number;
  mode: 'solo' | 'party';
  /** Best first. */
  entries: HallEntry[];
  awards: { icon: string; title: string; name: string }[];
  /** Solo only: right/asked per category, for lifetime category stats. */
  categories?: Record<string, [number, number]>;
  /** Set when this was the day's daily challenge (YYYY-MM-DD). */
  daily?: string;
}

export interface Hall {
  games: GameRecord[];
}

const KEY = 'trivia-party:hall:v1';
export const MAX_GAMES = 200;

export function emptyHall(): Hall {
  return { games: [] };
}

export function loadHall(): Hall {
  try {
    const raw = localStorage.getItem(KEY);
    const h = raw ? (JSON.parse(raw) as Hall) : null;
    return h && Array.isArray(h.games) ? h : emptyHall();
  } catch {
    return emptyHall();
  }
}

export function saveHall(h: Hall): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(h));
  } catch {
    // Storage full or unavailable: the hall just won't persist.
  }
}

/** Builds the record for a finished game. */
export function gameRecord(
  mode: 'solo' | 'party',
  standings: readonly TeamScore[],
  history: readonly AnswerResult[],
  awards: readonly Award[],
  at = Date.now(),
): GameRecord {
  const names = new Map(standings.map((t) => [t.id, t.name]));
  const rec: GameRecord = {
    at,
    mode,
    entries: standings.map((t) => ({
      name: t.name,
      score: t.score,
      correct: t.correctCount,
      answered: history.filter((r) => r.teamId === t.id).length,
      bestStreak: t.bestStreak,
      color: t.color,
    })),
    awards: awards.map((a) => ({ icon: a.icon, title: a.title, name: names.get(a.teamId) ?? '' })),
  };
  if (mode === 'solo') {
    const cats: Record<string, [number, number]> = {};
    for (const r of history) {
      const c = (cats[r.question.category] ??= [0, 0]);
      if (r.correct) c[0] += 1;
      c[1] += 1;
    }
    rec.categories = cats;
  }
  return rec;
}

/** Adds a game, keeping the newest MAX_GAMES. */
export function addGame(h: Hall, rec: GameRecord): Hall {
  return { games: [rec, ...h.games].slice(0, MAX_GAMES) };
}

export interface TopScore extends HallEntry {
  at: number;
  mode: 'solo' | 'party';
}

/** The best scores ever, one row per player or team per game. */
export function topScores(h: Hall, n = 10, mode?: 'solo' | 'party'): TopScore[] {
  return h.games
    .filter((g) => !mode || g.mode === mode)
    .flatMap((g) => g.entries.map((e) => ({ ...e, at: g.at, mode: g.mode })))
    .filter((e) => e.score > 0)
    .sort((a, b) => b.score - a.score || a.at - b.at)
    .slice(0, n);
}

export interface LifetimeStats {
  games: number;
  soloGames: number;
  partyGames: number;
  answered: number;
  correct: number;
  bestStreak: number;
  /** Solo category accuracy, best first: [category, right, asked]. At least 3 asked. */
  categories: [string, number, number][];
  /** How many times each award was won, most first. Solo games count the player's awards. */
  trophies: { icon: string; title: string; count: number }[];
}

export function lifetime(h: Hall): LifetimeStats {
  const solo = h.games.filter((g) => g.mode === 'solo');
  const cats = new Map<string, [number, number]>();
  for (const g of solo)
    for (const [c, [r, a]] of Object.entries(g.categories ?? {})) {
      const t = cats.get(c) ?? [0, 0];
      cats.set(c, [t[0] + r, t[1] + a]);
    }
  const trophies = new Map<string, { icon: string; title: string; count: number }>();
  for (const g of solo)
    for (const a of g.awards) {
      const t = trophies.get(a.title) ?? { icon: a.icon, title: a.title, count: 0 };
      t.count += 1;
      trophies.set(a.title, t);
    }
  const me = solo.map((g) => g.entries[0]).filter(Boolean);
  return {
    games: h.games.length,
    soloGames: solo.length,
    partyGames: h.games.length - solo.length,
    answered: me.reduce((n, e) => n + e.answered, 0),
    correct: me.reduce((n, e) => n + e.correct, 0),
    bestStreak: h.games.flatMap((g) => g.entries).reduce((n, e) => Math.max(n, e.bestStreak), 0),
    categories: [...cats.entries()]
      .filter(([, [, a]]) => a >= 3)
      .map(([c, [r, a]]) => [c, r, a] as [string, number, number])
      .sort((x, y) => y[1] / y[2] - x[1] / x[2] || y[2] - x[2]),
    trophies: [...trophies.values()].sort((a, b) => b.count - a.count),
  };
}
