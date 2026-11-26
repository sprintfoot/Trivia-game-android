import type { BankQuestion } from './session';

/**
 * Question packs you write yourself (family inside jokes, a birthday quiz…), saved on this device.
 * Packs can be shared as plain text: one question per line, "Question | right answer | wrong | wrong | wrong".
 */

export interface CustomQuestion {
  prompt: string;
  right: string;
  /** One to three wrong answers. */
  wrong: string[];
}

export interface CustomPack {
  id: string;
  name: string;
  on: boolean;
  questions: CustomQuestion[];
}

const KEY = 'trivia-party:packs:v1';
export const MAX_LEN = 140;

export function loadPacks(): CustomPack[] {
  try {
    const raw = localStorage.getItem(KEY);
    const packs = raw ? (JSON.parse(raw) as CustomPack[]) : [];
    return Array.isArray(packs) ? packs : [];
  } catch {
    return [];
  }
}

export function savePacks(packs: CustomPack[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(packs));
  } catch {
    // Storage full or unavailable.
  }
}

export function newPack(name: string): CustomPack {
  return { id: Math.random().toString(36).slice(2, 10), name: name.trim().slice(0, 40) || 'My pack', on: true, questions: [] };
}

const clean = (s: string) => s.replace(/\s+/g, ' ').trim().slice(0, MAX_LEN);

/** Checks a question; returns why it can't be added, or null if it's fine. */
export function problem(q: CustomQuestion): string | null {
  if (!clean(q.prompt)) return 'Write a question.';
  if (!clean(q.right)) return 'Add the right answer.';
  const wrong = q.wrong.map(clean).filter(Boolean);
  if (wrong.length === 0) return 'Add at least one wrong answer.';
  const all = [q.right, ...wrong].map((x) => clean(x).toLowerCase());
  if (new Set(all).size !== all.length) return 'Each answer must be different.';
  return null;
}

export function tidy(q: CustomQuestion): CustomQuestion {
  return { prompt: clean(q.prompt), right: clean(q.right), wrong: q.wrong.map(clean).filter(Boolean).slice(0, 3) };
}

/** Reads pasted text: one question per line, fields split by "|". Lines starting with # are comments. */
export function parseBulk(text: string): { questions: CustomQuestion[]; errors: string[] } {
  const questions: CustomQuestion[] = [];
  const errors: string[] = [];
  text.split(/\r?\n/).forEach((line, i) => {
    const t = line.trim();
    if (!t || t.startsWith('#')) return;
    const [prompt = '', right = '', ...wrong] = t.split('|');
    const q = { prompt, right, wrong };
    const why = problem(q);
    if (why) errors.push(`Line ${i + 1}: ${why}`);
    else questions.push(tidy(q));
  });
  return { questions, errors };
}

/** The pack as shareable text (the same format parseBulk reads). */
export function exportPack(p: CustomPack): string {
  return [`# ${p.name}`, ...p.questions.map((q) => [q.prompt, q.right, ...q.wrong].join(' | '))].join('\n');
}

/** Game questions from every pack that's switched on. Answer order is shuffled by the game. */
export function customBankQuestions(packs: readonly CustomPack[]): BankQuestion[] {
  return packs
    .filter((p) => p.on)
    .flatMap((p) =>
      p.questions.map((q, i) => ({
        id: `custom-${p.id}-${i + 1}`,
        category: 'custom' as const,
        // Written for your own crowd, so every age group gets them.
        age: 'kids' as const,
        prompt: q.prompt,
        choices: [q.right, ...q.wrong],
        answer: 0,
      })),
    );
}

export function customCount(packs: readonly CustomPack[]): number {
  return packs.filter((p) => p.on).reduce((n, p) => n + p.questions.length, 0);
}
