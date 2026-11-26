import type { CategoryId } from './categories';
import { SCORING, scoreAnswer, type ScoreBreakdown } from './scoring';

export interface BankQuestion {
  id: string;
  category: CategoryId;
  prompt: string;
  choices: string[];
  /** Index into choices of the correct answer. */
  answer: number;
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
}

export interface AnswerResult {
  question: LiveQuestion;
  chosen: number | null;
  correct: boolean;
  score: ScoreBreakdown;
  streak: number;
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

/** Runs one solo game: picks a category per round, serves questions, keeps score. */
export class GameSession {
  readonly config: GameConfig;
  readonly roundCategories: CategoryId[];
  score = 0;
  streak = 0;
  bestStreak = 0;
  correctCount = 0;
  readonly history: AnswerResult[] = [];

  private round = 0;
  private questionInRound = 0;
  private current: LiveQuestion | null = null;
  private readonly pools = new Map<CategoryId, BankQuestion[]>();
  private readonly byCategory = new Map<CategoryId, BankQuestion[]>();

  constructor(config: GameConfig, bank: readonly BankQuestion[], private readonly rng: Rng = Math.random) {
    if (config.categories.length === 0) throw new Error('Pick at least one category');
    this.config = config;
    for (const id of config.categories) {
      const questions = bank.filter((q) => q.category === id);
      if (questions.length === 0) throw new Error(`No questions for category: ${id}`);
      this.byCategory.set(id, questions);
      this.pools.set(id, shuffle(questions, rng));
    }
    this.roundCategories = this.planRounds();
  }

  get totalRounds(): number {
    return this.config.rounds;
  }

  get currentRound(): number {
    return this.round;
  }

  get isFinalRound(): boolean {
    return this.round === this.config.rounds;
  }

  get multiplier(): number {
    return this.isFinalRound && this.config.rounds > 1 ? SCORING.finalRoundMultiplier : 1;
  }

  get totalQuestions(): number {
    return this.config.rounds * this.config.questionsPerRound;
  }

  hasNextRound(): boolean {
    return this.round < this.config.rounds;
  }

  startRound(): CategoryId {
    if (!this.hasNextRound()) throw new Error('No rounds left');
    this.round += 1;
    this.questionInRound = 0;
    return this.roundCategories[this.round - 1];
  }

  hasNextQuestion(): boolean {
    return this.round > 0 && this.questionInRound < this.config.questionsPerRound;
  }

  nextQuestion(): LiveQuestion {
    if (!this.hasNextQuestion()) throw new Error('No questions left in this round');
    const category = this.roundCategories[this.round - 1];
    const q = this.draw(category);
    this.questionInRound += 1;

    const order = shuffle(q.choices.map((_, i) => i), this.rng);
    this.current = {
      ...q,
      choices: order.map((i) => q.choices[i]),
      answer: order.indexOf(q.answer),
      number: this.history.length + 1,
      round: this.round,
    };
    return this.current;
  }

  /** chosen is null when time ran out. */
  submit(chosen: number | null, timeLeftMs: number): AnswerResult {
    const question = this.current;
    if (!question) throw new Error('No active question');
    this.current = null;

    const correct = chosen === question.answer;
    const score = scoreAnswer({
      correct,
      timeLeftMs: chosen === null ? 0 : timeLeftMs,
      timeLimitMs: this.config.timeLimitMs,
      streakBefore: this.streak,
      multiplier: this.multiplier,
    });

    this.streak = correct ? this.streak + 1 : 0;
    this.bestStreak = Math.max(this.bestStreak, this.streak);
    if (correct) this.correctCount += 1;
    this.score += score.total;

    const result: AnswerResult = { question, chosen, correct, score, streak: this.streak };
    this.history.push(result);
    return result;
  }

  /** Spread rounds across the chosen categories, avoiding back-to-back repeats where possible. */
  private planRounds(): CategoryId[] {
    const plan: CategoryId[] = [];
    let deck: CategoryId[] = [];
    while (plan.length < this.config.rounds) {
      if (deck.length === 0) {
        deck = shuffle(this.config.categories, this.rng);
        if (deck.length > 1 && deck[0] === plan[plan.length - 1]) deck.push(deck.shift()!);
      }
      plan.push(deck.shift()!);
    }
    return plan;
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
