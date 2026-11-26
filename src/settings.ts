import type { Quality } from './scene/stage';
import type { CategoryId } from './game/categories';

export interface Settings {
  sound: boolean;
  music: boolean;
  haptics: boolean;
  quality: Quality;
  lastCategories: CategoryId[] | null;
  rounds: number;
  questionsPerRound: number;
  timeLimitSec: number;
  bestScore: number;
}

const KEY = 'trivia-party:settings:v1';

const DEFAULTS: Settings = {
  sound: true,
  music: true,
  haptics: true,
  quality: 'auto',
  lastCategories: null,
  rounds: 3,
  questionsPerRound: 3,
  timeLimitSec: 15,
  bestScore: 0,
};

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...DEFAULTS, ...(JSON.parse(raw) as Partial<Settings>) } : { ...DEFAULTS };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveSettings(s: Settings): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    // Storage can be unavailable (private mode); settings just won't persist.
  }
}
