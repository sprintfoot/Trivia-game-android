import { describe, expect, it } from 'vitest';
import bank from '../src/data/questions.json';
import { CATEGORIES } from '../src/game/categories';
import { scoreAnswer, SCORING } from '../src/game/scoring';
import { GameSession, mulberry32, type BankQuestion, type GameConfig } from '../src/game/session';

const BANK = bank as BankQuestion[];
const config = (over: Partial<GameConfig> = {}): GameConfig => ({
  categories: ['science', 'history', 'music'],
  rounds: 3,
  questionsPerRound: 3,
  timeLimitMs: 15000,
  ...over,
});

describe('question bank', () => {
  it('has well-formed questions for every category', () => {
    const ids = new Set<string>();
    for (const q of BANK) {
      expect(ids.has(q.id)).toBe(false);
      ids.add(q.id);
      expect(q.choices).toHaveLength(4);
      expect(new Set(q.choices).size).toBe(4);
      expect(q.answer).toBeGreaterThanOrEqual(0);
      expect(q.answer).toBeLessThan(4);
      expect(['kids', 'teen', 'adult']).toContain(q.age);
      expect(CATEGORIES.some((c) => c.id === q.category)).toBe(true);
    }
    expect(BANK.length).toBeGreaterThanOrEqual(380);
    for (const c of CATEGORIES) {
      const qs = BANK.filter((q) => q.category === c.id);
      expect(qs.length).toBeGreaterThanOrEqual(15);
      // Enough kid-friendly questions that kids games don't fall back to the full category.
      expect(qs.filter((q) => q.age === 'kids').length).toBeGreaterThanOrEqual(4);
    }
  });
});

describe('scoreAnswer', () => {
  const base = { timeLimitMs: 10000, streakBefore: 0, multiplier: 1 };

  it('gives nothing for a wrong answer', () => {
    expect(scoreAnswer({ ...base, correct: false, timeLeftMs: 9000 }).total).toBe(0);
  });

  it('adds a speed bonus that shrinks with time', () => {
    expect(scoreAnswer({ ...base, correct: true, timeLeftMs: 10000 }).total).toBe(1000);
    expect(scoreAnswer({ ...base, correct: true, timeLeftMs: 5000 }).total).toBe(750);
    expect(scoreAnswer({ ...base, correct: true, timeLeftMs: 0 }).total).toBe(500);
  });

  it('adds a streak bonus from the third correct answer in a row', () => {
    expect(scoreAnswer({ ...base, correct: true, timeLeftMs: 0, streakBefore: 1 }).streak).toBe(0);
    expect(scoreAnswer({ ...base, correct: true, timeLeftMs: 0, streakBefore: 2 }).streak).toBe(SCORING.streakBonus);
  });

  it('applies the multiplier to the whole answer', () => {
    expect(scoreAnswer({ ...base, correct: true, timeLeftMs: 10000, multiplier: 2 }).total).toBe(2000);
  });
});

describe('GameSession', () => {
  it('plays a full game and doubles points in the final round', () => {
    const s = new GameSession(config(), BANK, mulberry32(42));
    let rounds = 0;
    while (s.hasNextRound()) {
      const cat = s.startRound();
      rounds += 1;
      expect(s.multiplier).toBe(rounds === 3 ? 2 : 1);
      while (s.hasNextQuestion()) {
        const q = s.nextQuestion();
        expect(q.category).toBe(cat);
        s.submit(q.answer, 15000);
      }
    }
    expect(rounds).toBe(3);
    expect(s.history).toHaveLength(9);
    expect(s.correctCount).toBe(9);
    expect(s.bestStreak).toBe(9);
    // Rounds 1-2: 6 answers worth 1000, plus streak bonus from answer 3 onward (7 answers).
    // Round 3: 3 answers worth (1000 + 100) * 2.
    expect(s.score).toBe(6 * 1000 + 4 * 100 + 3 * 1100 * 2);
  });

  it('keeps the correct answer after shuffling choices', () => {
    const s = new GameSession(config(), BANK, mulberry32(7));
    s.startRound();
    const q = s.nextQuestion();
    const original = BANK.find((b) => b.id === q.id)!;
    expect(q.choices[q.answer]).toBe(original.choices[original.answer]);
  });

  it('resets the streak on a wrong or timed-out answer', () => {
    const s = new GameSession(config(), BANK, mulberry32(1));
    s.startRound();
    const q1 = s.nextQuestion();
    s.submit(q1.answer, 1000);
    s.nextQuestion();
    const r = s.submit(null, 5000);
    expect(r.correct).toBe(false);
    expect(r.score.total).toBe(0);
    expect(s.streak).toBe(0);
  });

  it('spreads rounds over the chosen categories', () => {
    const s = new GameSession(config({ rounds: 3 }), BANK, mulberry32(3));
    expect(new Set(s.roundCategories).size).toBe(3);
  });

  it('never repeats a question until the category runs out', () => {
    const s = new GameSession(config({ categories: ['tech'], rounds: 2, questionsPerRound: 5 }), BANK, mulberry32(9));
    const seen = new Set<string>();
    while (s.hasNextRound()) {
      s.startRound();
      while (s.hasNextQuestion()) {
        const q = s.nextQuestion();
        expect(seen.has(q.id)).toBe(false);
        seen.add(q.id);
        s.submit(null, 0);
      }
    }
    expect(seen.size).toBe(10);
  });
});

describe('age groups', () => {
  it('only serves kids questions to kids when enough exist', () => {
    const s = new GameSession(config({ categories: ['sports'], ageGroup: 'kids', rounds: 1, questionsPerRound: 4 }), BANK, mulberry32(5));
    s.startRound();
    while (s.hasNextQuestion()) {
      const q = s.nextQuestion();
      expect(q.age).toBe('kids');
      s.submit(null, 0);
    }
  });

  it('never serves adult questions to teens', () => {
    const s = new GameSession(config({ categories: ['screen', 'food'], ageGroup: 'teen', rounds: 2, questionsPerRound: 5 }), BANK, mulberry32(8));
    while (s.hasNextRound()) {
      s.startRound();
      while (s.hasNextQuestion()) {
        expect(s.nextQuestion().age).not.toBe('adult');
        s.submit(null, 0);
      }
    }
  });
});

describe('hints', () => {
  it('hides two wrong answers, halves the points and counts down', () => {
    const s = new GameSession(config({ hints: 1 }), BANK, mulberry32(11));
    s.startRound();
    const q = s.nextQuestion();
    expect(s.canUseHint()).toBe(true);
    const hidden = s.useHint();
    expect(hidden).toHaveLength(2);
    expect(hidden).not.toContain(q.answer);
    expect(s.hintsLeft).toBe(0);
    expect(s.canUseHint()).toBe(false);
    const r = s.submit(q.answer, 15000);
    expect(r.score.hinted).toBe(true);
    expect(r.score.total).toBe(500);
    s.nextQuestion();
    expect(s.canUseHint()).toBe(false);
  });

  it('has no hints by default', () => {
    const s = new GameSession(config(), BANK, mulberry32(12));
    s.startRound();
    s.nextQuestion();
    expect(s.canUseHint()).toBe(false);
  });
});
