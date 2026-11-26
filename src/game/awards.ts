import { CATEGORIES } from './categories';
import type { AnswerResult, TeamScore } from './session';

/** A fun end-of-game award, given to the team (or player) who earned it. */
export interface Award {
  id: string;
  icon: string;
  title: string;
  /** Why they got it, e.g. "2.1s average answer". */
  why: string;
  teamId: string;
}

interface Tally {
  answered: number;
  correct: number;
  correctMs: number[];
  clutch: number;
  lightning: number;
  estimates: number;
  hinted: number;
  bestStreak: number;
  wagerWon: number;
  byCategory: Map<string, number>;
}

const secs = (ms: number) => `${(ms / 1000).toFixed(1)}s`;

function tally(history: readonly AnswerResult[], teamId: string): Tally {
  const t: Tally = { answered: 0, correct: 0, correctMs: [], clutch: 0, lightning: 0, estimates: 0, hinted: 0, bestStreak: 0, wagerWon: 0, byCategory: new Map() };
  for (const r of history) {
    if (r.teamId !== teamId) continue;
    t.answered += 1;
    if (r.score.hinted) t.hinted += 1;
    t.bestStreak = Math.max(t.bestStreak, r.streak);
    if (!r.correct) continue;
    t.correct += 1;
    if (r.kind !== 'wager') t.correctMs.push(r.timeLimitMs - r.timeLeftMs);
    if (r.timeLeftMs > 0 && r.timeLeftMs <= 2000) t.clutch += 1;
    if (r.kind === 'lightning') t.lightning += 1;
    if (r.question.estimate) t.estimates += 1;
    if (r.kind === 'wager' && r.wager) t.wagerWon = r.wager;
    t.byCategory.set(r.question.category, (t.byCategory.get(r.question.category) ?? 0) + 1);
  }
  return t;
}

const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

interface Rule {
  id: string;
  icon: string;
  title: string;
  /** Higher is better; null means this team doesn't qualify. */
  value: (t: Tally) => number | null;
  why: (t: Tally, v: number) => string;
}

const RULES: Rule[] = [
  {
    id: 'speed',
    icon: '⚡',
    title: 'Speed Demon',
    // Lower time is better, so score by negative average. Only real speed counts: under 5 seconds.
    value: (t) => (t.correctMs.length >= 2 && avg(t.correctMs) <= 5000 ? -avg(t.correctMs) : null),
    why: (_t, v) => `${secs(-v)} average right answer`,
  },
  { id: 'streak', icon: '🔥', title: 'On Fire', value: (t) => (t.bestStreak >= 3 ? t.bestStreak : null), why: (_t, v) => `${v} in a row` },
  {
    id: 'brain',
    icon: '🧠',
    title: 'Big Brain',
    value: (t) => (t.answered >= 3 && t.correct / t.answered >= 0.6 ? t.correct / t.answered : null),
    why: (_t, v) => `${Math.round(v * 100)}% right`,
  },
  { id: 'clutch', icon: '⏱️', title: 'Clutch', value: (t) => (t.clutch >= 1 ? t.clutch : null), why: (_t, v) => `${v} right with under 2 seconds left` },
  { id: 'lightning', icon: '🌩️', title: 'Storm Chaser', value: (t) => (t.lightning >= 3 ? t.lightning : null), why: (_t, v) => `${v} right in the lightning round` },
  { id: 'sharpshooter', icon: '🎯', title: 'Sharpshooter', value: (t) => (t.estimates >= 1 ? t.estimates : null), why: (_t, v) => `${v} closest guess${v === 1 ? '' : 'es'}` },
  { id: 'roller', icon: '🎲', title: 'High Roller', value: (t) => (t.wagerWon > 0 ? t.wagerWon : null), why: (_t, v) => `won a ${v.toLocaleString('en-US')} point bet` },
  {
    id: 'nohelp',
    icon: '🙌',
    title: 'No Help Needed',
    value: (t) => (t.hinted === 0 && t.answered >= 5 && t.correct / t.answered >= 0.7 ? t.correct : null),
    why: () => 'aced it without a 50/50',
  },
];

/**
 * Works out the awards for a finished game. Each award goes to the team that did best at it;
 * a tie goes to the team higher in the standings. Category champs are added for the best team in each category.
 */
export function computeAwards(history: readonly AnswerResult[], standings: readonly TeamScore[]): Award[] {
  const tallies = new Map(standings.map((t) => [t.id, tally(history, t.id)]));
  const awards: Award[] = [];
  for (const rule of RULES) {
    let best: { teamId: string; v: number } | null = null;
    for (const team of standings) {
      const v = rule.value(tallies.get(team.id)!);
      if (v !== null && (!best || v > best.v)) best = { teamId: team.id, v };
    }
    if (best) awards.push({ id: rule.id, icon: rule.icon, title: rule.title, why: rule.why(tallies.get(best.teamId)!, best.v), teamId: best.teamId });
  }
  // Category champ: most right answers in one category (at least 3).
  let champ: { teamId: string; cat: string; n: number } | null = null;
  for (const team of standings) {
    for (const [cat, n] of tallies.get(team.id)!.byCategory) if (n >= 3 && (!champ || n > champ.n)) champ = { teamId: team.id, cat, n };
  }
  if (champ) {
    const c = CATEGORIES.find((x) => x.id === champ.cat);
    if (c) awards.push({ id: `champ-${c.id}`, icon: c.icon, title: `${c.name} Champ`, why: `${champ.n} right in ${c.name}`, teamId: champ.teamId });
  }
  return awards;
}
