/** Scoring rules. All tuning numbers live here so play-testing changes are one-line edits. */
export const SCORING = {
  base: 500,
  maxSpeedBonus: 500,
  /** Streak bonus applies once a player has this many correct answers in a row. */
  streakThreshold: 3,
  streakBonus: 100,
  finalRoundMultiplier: 2,
  /** Points are multiplied by this when the player used a hint on the question. */
  hintFactor: 0.5,
} as const;

export interface ScoreInput {
  correct: boolean;
  /** Milliseconds left on the clock when the answer was locked in. */
  timeLeftMs: number;
  timeLimitMs: number;
  /** Consecutive correct answers before this one. */
  streakBefore: number;
  multiplier: number;
  hinted?: boolean;
}

export interface ScoreBreakdown {
  base: number;
  speed: number;
  streak: number;
  multiplier: number;
  hinted: boolean;
  total: number;
}

export function scoreAnswer(input: ScoreInput): ScoreBreakdown {
  const { correct, timeLeftMs, timeLimitMs, streakBefore, multiplier } = input;
  const hinted = input.hinted ?? false;
  if (!correct) return { base: 0, speed: 0, streak: 0, multiplier, hinted, total: 0 };

  const fraction = timeLimitMs > 0 ? Math.min(1, Math.max(0, timeLeftMs / timeLimitMs)) : 0;
  const base = SCORING.base;
  const speed = Math.round(SCORING.maxSpeedBonus * fraction);
  const streak = streakBefore + 1 >= SCORING.streakThreshold ? SCORING.streakBonus : 0;
  const factor = hinted ? SCORING.hintFactor : 1;
  return { base, speed, streak, multiplier, hinted, total: Math.round((base + speed + streak) * multiplier * factor) };
}
