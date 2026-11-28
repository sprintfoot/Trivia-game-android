import { dateKey } from './daily';

/**
 * Questions already asked today on this device, so a new game deals fresh ones.
 * The list starts over each day. Kept oldest first, so when a category runs out of fresh
 * questions the ones asked longest ago come back first.
 */

const KEY = 'trivia-party:used-today';

interface UsedToday {
  day: string;
  ids: string[];
}

function load(today: Date): UsedToday {
  const day = dateKey(today);
  try {
    const raw = localStorage.getItem(KEY);
    const data = raw ? (JSON.parse(raw) as UsedToday) : null;
    if (data && data.day === day && Array.isArray(data.ids)) return data;
  } catch {
    // Unreadable: start the day fresh.
  }
  return { day, ids: [] };
}

/** Today's asked question ids, oldest first. */
export function usedToday(today = new Date()): string[] {
  return load(today).ids;
}

/** Remembers that a question was asked. Asking it again moves it to the end of the list. */
export function markUsed(id: string, today = new Date()): void {
  const data = load(today);
  data.ids = data.ids.filter((x) => x !== id);
  data.ids.push(id);
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    // Storage full or unavailable: repeats just become possible.
  }
}
