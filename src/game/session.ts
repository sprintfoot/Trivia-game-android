import type { CategoryId } from './categories';

export type AgeGroup = 'kids' | 'teen' | 'adult' | 'expert';

export const AGE_GROUPS: readonly { id: AgeGroup; label: string; detail: string }[] = [
  { id: 'kids', label: 'Kids', detail: 'Ages 6–10' },
  { id: 'teen', label: 'Teens', detail: 'Ages 11–15' },
  { id: 'adult', label: 'Adults', detail: '16 and up' },
  { id: 'expert', label: 'Experts', detail: 'Hard, 16 and up' },
];

/** Which question age levels each group may see. */
const ALLOWED: Record<AgeGroup, AgeGroup[]> = {
  kids: ['kids'],
  teen: ['kids', 'teen'],
  adult: ['kids', 'teen', 'adult'],
  // Experts get only the hardest questions: expert ones, plus the adult ones.
  expert: ['adult', 'expert'],
};

/** Fewer suitable questions than this in a category and we fall back to the whole category. */
const MIN_POOL = 4;
import { SCORING, scoreAnswer, type ScoreBreakdown } from './scoring';

/** A picture slowly uncovered during the question. Drawn on the device; no photos or logos. */
export type Picture =
  | { kind: 'flag'; code: string }
  | { kind: 'emoji'; clues: string[] }
  | { kind: 'zoom'; emoji: string; x: number; y: number }
  /** Not a picture but a melody the device plays, uncovered phrase by phrase. */
  | { kind: 'tune'; id: string }
  | { kind: 'shadow'; emoji: string }
  | { kind: 'pixel'; emoji: string }
  /** Famous faces: a free-licensed photo or painting that comes clearer over time. credit is shown once revealed. */
  | { kind: 'photo'; id: string; credit: string }
  /** Who am I?: text clues about a famous person, hardest first, shown one at a time. */
  | { kind: 'clues'; icon: string; clues: string[] };

export interface BankQuestion {
  id: string;
  category: CategoryId;
  /** Youngest age group the question suits. Missing means teen. */
  age?: AgeGroup;
  prompt: string;
  choices: string[];
  /** Index into choices of the correct answer. */
  answer: number;
  picture?: Picture;
  /** Fill-in-the-blank: players type the answer; any of these (forgivingly matched) is right. */
  accept?: string[];
  /** Closest guess: players type a number; within 10% (or the closest team) scores. */
  estimate?: { value: number; unit?: string };
  /** Keep the choices in the order written (e.g. Real / Made up). */
  fixedOrder?: boolean;
}

export type RoundKind = 'normal' | 'lightning' | 'wager';

export const LIGHTNING = { questions: 5, timeMs: 8000 } as const;

/** Famous Faces clock: 60% of the normal time, but never under 7 seconds or over the normal time. */
export const photoTimeMs = (normalMs: number): number => Math.min(normalMs, Math.max(7000, Math.round(normalMs * 0.6)));

/** Players type rather than pick, for these questions. */
export function isTyped(q: Pick<BankQuestion, 'accept' | 'estimate'>): boolean {
  return !!q.accept || !!q.estimate;
}

/** Reads a typed number: "1,200", "1200", "1.2k", "about 300". */
export function parseGuess(text: string): number | null {
  const m = /-?\d[\d,]*(\.\d+)?\s*(k|thousand|m|million|b|billion)?\b/i.exec(text.replace(/\s+/g, ' '));
  if (!m) return null;
  let n = Number(m[0].replace(/[^\d.-]/g, ''));
  const unit = (m[2] ?? '').toLowerCase();
  if (unit === 'k' || unit === 'thousand') n *= 1e3;
  if (unit === 'm' || unit === 'million') n *= 1e6;
  if (unit === 'b' || unit === 'billion') n *= 1e9;
  return Number.isFinite(n) ? n : null;
}

export function estimateTolerance(value: number): number {
  return Math.max(Math.abs(value) * 0.1, 1);
}

/** A question as shown to a player: choices shuffled, answer index remapped. */
export interface LiveQuestion extends BankQuestion {
  number: number;
  round: number;
}

export interface GameConfig {
  categories: CategoryId[];
  rounds: number;
  questionsPerRound: number;
  timeLimitMs: number;
  ageGroup?: AgeGroup;
  /** 50/50 hints each team gets for the whole game. */
  hints?: number;
  /** Add a quick-fire lightning round before the final round. */
  lightning?: boolean;
  /** End with one question where teams bet their points. */
  finalWager?: boolean;
  /** Mix the chosen categories question by question instead of one category per round. */
  mixCategories?: boolean;
}

export interface TeamInfo {
  id: string;
  name: string;
  color: string;
}

export interface TeamScore extends TeamInfo {
  score: number;
  streak: number;
  bestStreak: number;
  correctCount: number;
  hintsLeft: number;
}

/** One team's answer to the current question. chosen is null if they didn't answer in time. */
export interface TeamPick {
  teamId: string;
  chosen: number | null;
  timeLeftMs: number;
  /** Closest-guess questions: the team's number. */
  guess?: number | null;
}

export interface AnswerResult {
  teamId: string;
  question: LiveQuestion;
  chosen: number | null;
  correct: boolean;
  score: ScoreBreakdown;
  streak: number;
  guess?: number | null;
  /** Final wager: the amount bet. */
  wager?: number;
  /** Which kind of round the question was in. */
  kind: RoundKind;
  /** Time left on the clock when the answer went in (0 when time ran out), and the clock's length. */
  timeLeftMs: number;
  timeLimitMs: number;
}

export type Rng = () => number;

/** Small seeded PRNG so tests are deterministic. */
export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle<T>(items: readonly T[], rng: Rng): T[] {
  const a = items.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Shuffles questions so the ones not asked recently come first. Recently asked ones follow,
 * the longest-ago first, so a category that runs out still has something to ask.
 */
export function freshFirst(questions: readonly BankQuestion[], avoid: readonly string[], rng: Rng): BankQuestion[] {
  if (avoid.length === 0) return shuffle(questions, rng);
  const when = new Map(avoid.map((id, i) => [id, i]));
  const fresh = shuffle(questions.filter((q) => !when.has(q.id)), rng);
  const used = questions.filter((q) => when.has(q.id)).sort((a, b) => when.get(a.id)! - when.get(b.id)!);
  return [...fresh, ...used];
}

/**
 * Runs one game: picks a category per round, serves questions and keeps score for one or more teams.
 * A solo game is a game with a single team; the solo helpers (score, submit, useHint…) act on it.
 */
export class GameSession {
  readonly config: GameConfig;
  readonly roundCategories: CategoryId[];
  readonly teams: TeamScore[];
  readonly history: AnswerResult[] = [];

  private round = 0;
  private questionInRound = 0;
  private questionCount = 0;
  private current: LiveQuestion | null = null;
  /** The last question asked, so its time limit still holds while it is scored. */
  private asked: LiveQuestion | null = null;
  private hidden = new Map<string, number[]>();
  private readonly pools = new Map<CategoryId, BankQuestion[]>();
  private readonly kinds: RoundKind[];
  private readonly wagers = new Map<string, number>();
  private readonly byCategory = new Map<CategoryId, BankQuestion[]>();
  private mixDeck: CategoryId[] = [];
  private lastMixed: CategoryId | null = null;

  constructor(
    config: GameConfig,
    bank: readonly BankQuestion[],
    private readonly rng: Rng = Math.random,
    teams: readonly TeamInfo[] = [{ id: 'solo', name: 'You', color: '#38e1ff' }],
    /** Questions already asked recently, oldest first. They are dealt only once a category runs out of others. */
    avoid: readonly string[] = [],
  ) {
    if (config.categories.length === 0) throw new Error('Pick at least one category');
    if (teams.length === 0) throw new Error('Need at least one team');
    this.config = config;
    this.teams = teams.map((t) => ({ ...t, score: 0, streak: 0, bestStreak: 0, correctCount: 0, hintsLeft: config.hints ?? 0 }));
    const allowed = ALLOWED[config.ageGroup ?? 'adult'];
    for (const id of config.categories) {
      const all = bank.filter((q) => q.category === id);
      if (all.length === 0) throw new Error(`No questions for category: ${id}`);
      const suitable = all.filter((q) => allowed.includes(q.age ?? 'teen'));
      const questions = suitable.length >= MIN_POOL ? suitable : all;
      this.byCategory.set(id, questions);
      this.pools.set(id, freshFirst(questions, avoid, rng));
    }
    this.kinds = Array<RoundKind>(config.rounds).fill('normal');
    if (config.lightning) this.kinds.splice(Math.max(0, config.rounds - 1), 0, 'lightning');
    if (config.finalWager) this.kinds.push('wager');
    this.roundCategories = this.planRounds();
  }

  // ----- solo helpers (first team) -----

  private get solo(): TeamScore {
    return this.teams[0];
  }
  get score(): number {
    return this.solo.score;
  }
  get streak(): number {
    return this.solo.streak;
  }
  get bestStreak(): number {
    return this.solo.bestStreak;
  }
  get correctCount(): number {
    return this.solo.correctCount;
  }
  get hintsLeft(): number {
    return this.solo.hintsLeft;
  }

  // ----- rounds and questions -----

  get totalRounds(): number {
    return this.kinds.length;
  }

  /** What kind of round is being played (or about to be, before startRound). */
  get roundKind(): RoundKind {
    return this.kinds[Math.max(0, this.round - 1)];
  }

  /** The kind of the next round, for showing the right banner before it starts. */
  get nextRoundKind(): RoundKind | null {
    return this.kinds[this.round] ?? null;
  }

  /** Time on the clock for the current question. Famous Faces get less, since the photo keeps sharpening. */
  get timeLimitMs(): number {
    if (this.roundKind === 'lightning') return LIGHTNING.timeMs;
    const q = this.current ?? this.asked;
    if (q?.picture?.kind === 'photo') return photoTimeMs(this.config.timeLimitMs);
    return this.config.timeLimitMs;
  }

  private questionsIn(kind: RoundKind): number {
    return kind === 'lightning' ? LIGHTNING.questions : kind === 'wager' ? 1 : this.config.questionsPerRound;
  }

  /** True when normal rounds serve questions from all the chosen categories, mixed together. */
  get mixed(): boolean {
    return !!this.config.mixCategories && this.config.categories.length > 1;
  }

  get currentRound(): number {
    return this.round;
  }

  /** The last normal round, worth double. */
  get isFinalRound(): boolean {
    return this.round > 0 && this.roundKind === 'normal' && this.kinds.lastIndexOf('normal') === this.round - 1;
  }

  get multiplier(): number {
    return this.isFinalRound && this.config.rounds > 1 ? SCORING.finalRoundMultiplier : 1;
  }

  get totalQuestions(): number {
    return this.kinds.reduce((n, k) => n + this.questionsIn(k), 0);
  }

  get currentQuestion(): LiveQuestion | null {
    return this.current;
  }

  hasNextRound(): boolean {
    return this.round < this.kinds.length;
  }

  startRound(): CategoryId {
    if (!this.hasNextRound()) throw new Error('No rounds left');
    this.round += 1;
    this.questionInRound = 0;
    this.wagers.clear();
    return this.roundCategories[this.round - 1];
  }

  hasNextQuestion(): boolean {
    return this.round > 0 && this.questionInRound < this.questionsIn(this.roundKind);
  }

  // ----- final wager -----

  /** The most a team may bet: its score, or 500 if it has less, so nobody is shut out. */
  maxWager(teamId = this.solo.id): number {
    return Math.max(this.team(teamId).score, 500);
  }

  setWager(teamId: string, amount: number): number {
    const bet = Math.round(Math.min(this.maxWager(teamId), Math.max(0, amount)));
    this.wagers.set(teamId, bet);
    return bet;
  }

  wagerOf(teamId: string): number {
    return this.wagers.get(teamId) ?? 0;
  }

  nextQuestion(): LiveQuestion {
    if (!this.hasNextQuestion()) throw new Error('No questions left in this round');
    const kind = this.roundKind;
    const category = this.roundCategories[this.round - 1];
    // Lightning: quick four-choice questions from any chosen category. Wager: no number guesses.
    const q =
      kind === 'lightning'
        ? this.drawFrom(shuffle(this.config.categories, this.rng), (x) => x.choices.length === 4 && !x.picture && !isTyped(x))
        : kind === 'wager'
          ? this.drawFrom([category, ...this.config.categories], (x) => !x.estimate && x.picture?.kind !== 'tune')
          : this.draw(this.mixed ? this.nextMixedCategory() : category);
    this.questionInRound += 1;
    this.questionCount += 1;
    this.hidden = new Map();

    const order = q.fixedOrder ? q.choices.map((_, i) => i) : shuffle(q.choices.map((_, i) => i), this.rng);
    this.current = {
      ...q,
      choices: order.map((i) => q.choices[i]),
      answer: order.indexOf(q.answer),
      number: this.questionCount,
      round: this.round,
    };
    this.asked = this.current;
    return this.current;
  }

  // ----- hints -----

  team(teamId: string): TeamScore {
    const t = this.teams.find((x) => x.id === teamId);
    if (!t) throw new Error(`Unknown team: ${teamId}`);
    return t;
  }

  hiddenFor(teamId: string): number[] {
    return this.hidden.get(teamId) ?? [];
  }

  canUseHint(teamId = this.solo.id): boolean {
    const q = this.current;
    return this.team(teamId).hintsLeft > 0 && q !== null && !isTyped(q) && q.choices.length >= 4 && this.roundKind !== 'wager' && !this.hidden.has(teamId);
  }

  /** 50/50: hides two wrong answers on the current question for one team. Returns the hidden indices. */
  useHint(teamId = this.solo.id): number[] {
    const q = this.current;
    if (!q || !this.canUseHint(teamId)) throw new Error('No hint available');
    const wrong = q.choices.map((_, i) => i).filter((i) => i !== q.answer);
    const hidden = shuffle(wrong, this.rng).slice(0, 2).sort();
    this.hidden.set(teamId, hidden);
    this.team(teamId).hintsLeft -= 1;
    return hidden;
  }

  // ----- answers -----

  /** Solo: chosen is null when time ran out. */
  submit(chosen: number | null, timeLeftMs: number, guess?: number | null): AnswerResult {
    return this.submitAll([{ teamId: this.solo.id, chosen, timeLeftMs, guess }])[0];
  }

  /** Scores every team on the current question. Teams with no pick count as out of time. */
  submitAll(picks: readonly TeamPick[]): AnswerResult[] {
    const question = this.current;
    if (!question) throw new Error('No active question');
    this.current = null;
    const wagerRound = this.roundKind === 'wager';

    // Closest guess: within 10% scores, and so does the closest team (when there's more than one).
    const est = question.estimate;
    const diffs = new Map<string, number>();
    if (est) for (const p of picks) if (p.guess != null) diffs.set(p.teamId, Math.abs(p.guess - est.value));
    const closest = Math.min(...diffs.values());

    return this.teams.map((team) => {
      const pick = picks.find((p) => p.teamId === team.id);
      const guess = est ? (pick?.guess ?? null) : undefined;
      const chosen = est ? (guess == null ? null : 0) : (pick?.chosen ?? null);
      const diff = diffs.get(team.id);
      const correct = est
        ? diff !== undefined && (diff <= estimateTolerance(est.value) || (this.teams.length > 1 && diff === closest))
        : chosen === question.answer;
      let score = scoreAnswer({
        correct,
        timeLeftMs: chosen === null ? 0 : (pick?.timeLeftMs ?? 0),
        timeLimitMs: this.timeLimitMs,
        streakBefore: team.streak,
        multiplier: this.multiplier,
        hinted: this.hidden.has(team.id),
      });
      const wager = wagerRound ? this.wagerOf(team.id) : undefined;
      if (wager !== undefined) {
        const delta = correct ? wager : 0 - Math.min(wager, team.score);
        score = { base: wager, speed: 0, streak: 0, multiplier: 1, hinted: false, total: delta };
      }

      team.streak = correct ? team.streak + 1 : 0;
      team.bestStreak = Math.max(team.bestStreak, team.streak);
      if (correct) team.correctCount += 1;
      team.score += score.total;

      const result: AnswerResult = {
        teamId: team.id,
        question,
        chosen,
        correct,
        score,
        streak: team.streak,
        guess,
        wager,
        kind: this.roundKind,
        timeLeftMs: chosen === null ? 0 : (pick?.timeLeftMs ?? 0),
        timeLimitMs: this.timeLimitMs,
      };
      this.history.push(result);
      return result;
    });
  }

  /** Teams sorted by score, best first. */
  standings(): TeamScore[] {
    return this.teams.slice().sort((a, b) => b.score - a.score || b.correctCount - a.correctCount);
  }

  /** Spread rounds across the chosen categories, avoiding back-to-back repeats where possible. */
  private planRounds(): CategoryId[] {
    const plan: CategoryId[] = [];
    let deck: CategoryId[] = [];
    while (plan.length < this.kinds.length) {
      if (deck.length === 0) {
        deck = shuffle(this.config.categories, this.rng);
        if (deck.length > 1 && deck[0] === plan[plan.length - 1]) deck.push(deck.shift()!);
      }
      plan.push(deck.shift()!);
    }
    return plan;
  }

  /** Deals categories like cards: each chosen one comes up once per pass, never twice in a row. */
  private nextMixedCategory(): CategoryId {
    if (this.mixDeck.length === 0) {
      this.mixDeck = shuffle(this.config.categories, this.rng);
      if (this.mixDeck.length > 1 && this.mixDeck[0] === this.lastMixed) this.mixDeck.push(this.mixDeck.shift()!);
    }
    this.lastMixed = this.mixDeck.shift()!;
    return this.lastMixed;
  }

  /** Takes the first question matching `ok` from the first of these categories that has one. */
  private drawFrom(categories: readonly CategoryId[], ok: (q: BankQuestion) => boolean): BankQuestion {
    for (const c of categories) {
      const pool = this.pools.get(c);
      const i = pool?.findIndex(ok) ?? -1;
      if (pool && i >= 0) return pool.splice(i, 1)[0];
      const fresh = this.byCategory.get(c)?.filter(ok) ?? [];
      if (fresh.length) return fresh[Math.floor(this.rng() * fresh.length)];
    }
    return this.draw(categories[0]);
  }

  private draw(category: CategoryId): BankQuestion {
    let pool = this.pools.get(category)!;
    if (pool.length === 0) {
      // Every question in this category has been used: reshuffle rather than end the game.
      pool = shuffle(this.byCategory.get(category)!, this.rng);
      this.pools.set(category, pool);
    }
    return pool.shift()!;
  }
}
