/**
 * Everything the host can say, written out in full, so each line can be recorded ahead of time
 * as a natural-sounding clip (see scripts/voice/). Lines with a name or number in them are
 * recorded for every name and number the game uses.
 */
import { BANK } from '../data/bank';
import { CATEGORIES } from '../game/categories';
import { TEAM_PRESETS } from '../game/teams';
import { LINES, type LineKey } from './lines';
import { isTyped } from '../game/session';

export const ROUND_NUMBERS = [2, 3, 4, 5, 6];
export const STREAK_MAX = 20;

export function render(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? ''));
}

/** What the host says to read a question. Fill-in-the-blank questions pass no choices. */
export function questionSpeech(prompt: string, choices: readonly string[]): string {
  const said = prompt.replace(/_{2,}/g, 'blank');
  return choices.length ? `${said} ${choices.map((c, i) => `${'ABCD'[i]}: ${c}.`).join(' ')}` : said;
}

/** Every way the given line can come out, for every name and number the game uses. */
export function lineVariants(key: LineKey): string[] {
  const out: string[] = [];
  for (const t of LINES[key] as readonly string[]) {
    if (t.includes('{category}')) CATEGORIES.forEach((c) => out.push(render(t, { category: c.name })));
    else if (t.includes('{team}')) TEAM_PRESETS.forEach((team) => out.push(render(t, { team: team.name })));
    else if (t.includes('{n}')) {
      const ns = key === 'round' || key === 'mixedRound' ? ROUND_NUMBERS : Array.from({ length: STREAK_MAX - 2 }, (_, i) => i + 3);
      ns.forEach((n) => out.push(render(t, { n })));
    } else out.push(t);
  }
  return out;
}

/** 32-bit FNV-1a, as 8 hex digits: the clip's file name. */
export function clipId(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

export function allVoiceTexts(): string[] {
  const texts = new Set<string>();
  for (const key of Object.keys(LINES) as LineKey[]) lineVariants(key).forEach((t) => texts.add(t));
  for (const q of BANK) if (q.picture?.kind !== 'tune') texts.add(questionSpeech(q.prompt, isTyped(q) ? [] : q.choices));
  return [...texts];
}
