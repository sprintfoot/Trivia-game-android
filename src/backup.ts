import { MAX_GAMES, type Hall } from './game/hall';
import type { CustomPack } from './game/custom';

/**
 * Backup and restore for everything the game keeps on this device: settings (with personal best),
 * the Hall of Fame and My Questions. A backup is one small JSON file holding the raw storage values,
 * so it also picks up anything saved under a new key later without changes here.
 *
 * Restoring merges rather than wipes: games and packs already on the device are kept alongside the
 * backup's, so restoring onto a fresh install that has a few games on it loses nothing.
 */

export const PREFIX = 'trivia-party:';
const SETTINGS = `${PREFIX}settings:v1`;
const HALL = `${PREFIX}hall:v1`;
const PACKS = `${PREFIX}packs:v1`;

export interface Backup {
  app: 'trivia-party';
  version: 1;
  exportedAt: number;
  /** Raw storage values, keyed by storage key. */
  data: Record<string, string>;
}

/** The bit of Storage this needs, so tests can pass a plain object. */
export interface KeyValueStore {
  readonly length: number;
  key(i: number): string | null;
  getItem(k: string): string | null;
  setItem(k: string, v: string): void;
}

export function makeBackup(store: KeyValueStore, at = Date.now()): Backup {
  const data: Record<string, string> = {};
  for (let i = 0; i < store.length; i++) {
    const k = store.key(i);
    if (!k || !k.startsWith(PREFIX)) continue;
    const v = store.getItem(k);
    if (v != null) data[k] = v;
  }
  return { app: 'trivia-party', version: 1, exportedAt: at, data };
}

export function backupFileName(at = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `trivia-party-backup-${at.getFullYear()}-${pad(at.getMonth() + 1)}-${pad(at.getDate())}.json`;
}

/** Reads a backup from pasted or loaded text. Throws an Error with a friendly message if it isn't one. */
export function parseBackup(text: string): Backup {
  let obj: unknown;
  try {
    obj = JSON.parse(text.trim());
  } catch {
    throw new Error("That isn't a Trivia Party backup (it couldn't be read).");
  }
  const b = obj as Partial<Backup> | null;
  if (!b || b.app !== 'trivia-party' || typeof b.data !== 'object' || b.data === null) {
    throw new Error("That isn't a Trivia Party backup.");
  }
  if (typeof b.version === 'number' && b.version > 1) {
    throw new Error('That backup is from a newer version of the game. Update the app, then try again.');
  }
  const data: Record<string, string> = {};
  for (const [k, v] of Object.entries(b.data)) if (k.startsWith(PREFIX) && typeof v === 'string') data[k] = v;
  return { app: 'trivia-party', version: 1, exportedAt: Number(b.exportedAt) || 0, data };
}

export interface BackupSummary {
  games: number;
  packs: number;
  questions: number;
  bestScore: number;
  hasSettings: boolean;
}

const json = <T>(s: string | null | undefined): T | null => {
  if (s == null) return null;
  try {
    return JSON.parse(s) as T;
  } catch {
    return null;
  }
};

export function summarize(b: Backup): BackupSummary {
  const hall = json<Hall>(b.data[HALL]);
  const packs = json<CustomPack[]>(b.data[PACKS]);
  const settings = json<{ bestScore?: number }>(b.data[SETTINGS]);
  const packList = Array.isArray(packs) ? packs : [];
  return {
    games: Array.isArray(hall?.games) ? hall.games.length : 0,
    packs: packList.length,
    questions: packList.reduce((n, p) => n + (Array.isArray(p?.questions) ? p.questions.length : 0), 0),
    bestScore: Number(settings?.bestScore) || 0,
    hasSettings: !!settings,
  };
}

const gameKey = (g: Hall['games'][number]) => `${g.at}|${g.mode}|${g.daily ?? ''}`;

function mergeHall(current: string | null, incoming: string): string {
  const a = json<Hall>(current);
  const b = json<Hall>(incoming);
  const games = new Map<string, Hall['games'][number]>();
  for (const g of [...(Array.isArray(a?.games) ? a.games : []), ...(Array.isArray(b?.games) ? b.games : [])]) {
    if (g && typeof g.at === 'number') games.set(gameKey(g), g);
  }
  const merged = [...games.values()].sort((x, y) => y.at - x.at).slice(0, MAX_GAMES);
  return JSON.stringify({ games: merged });
}

function mergePacks(current: string | null, incoming: string): string {
  const a = json<CustomPack[]>(current);
  const b = json<CustomPack[]>(incoming);
  const packs = new Map<string, CustomPack>();
  // Backup first, then the device's: a pack edited on this device since the backup keeps its edits.
  for (const p of [...(Array.isArray(b) ? b : []), ...(Array.isArray(a) ? a : [])]) if (p && p.id) packs.set(p.id, p);
  return JSON.stringify([...packs.values()]);
}

function mergeSettings(current: string | null, incoming: string): string {
  const a = json<Record<string, unknown>>(current) ?? {};
  const b = json<Record<string, unknown>>(incoming) ?? {};
  const best = Math.max(Number(a.bestScore) || 0, Number(b.bestScore) || 0);
  return JSON.stringify({ ...a, ...b, bestScore: best });
}

/** Writes a backup into storage, merging with what's already there. */
export function restoreBackup(store: KeyValueStore, b: Backup): void {
  for (const [k, v] of Object.entries(b.data)) {
    const cur = store.getItem(k);
    if (k === HALL) store.setItem(k, mergeHall(cur, v));
    else if (k === PACKS) store.setItem(k, mergePacks(cur, v));
    else if (k === SETTINGS) store.setItem(k, mergeSettings(cur, v));
    else store.setItem(k, v);
  }
}
