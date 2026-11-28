import { describe, expect, it } from 'vitest';
import { makeBackup, parseBackup, restoreBackup, summarize, type KeyValueStore } from '../src/backup';

class Mem implements KeyValueStore {
  m = new Map<string, string>();
  get length() {
    return this.m.size;
  }
  key(i: number) {
    return [...this.m.keys()][i] ?? null;
  }
  getItem(k: string) {
    return this.m.get(k) ?? null;
  }
  setItem(k: string, v: string) {
    this.m.set(k, v);
  }
}

const game = (at: number, score = 100) => ({ at, mode: 'solo', entries: [{ name: 'A', score, correct: 1, answered: 1, bestStreak: 1, color: '#fff' }], awards: [] });
const pack = (id: string, n: number) => ({ id, name: id, on: true, questions: Array.from({ length: n }, (_, i) => ({ prompt: `q${i}`, right: 'r', wrong: ['w'] })) });

function device() {
  const s = new Mem();
  s.setItem('trivia-party:settings:v1', JSON.stringify({ sound: false, bestScore: 900 }));
  s.setItem('trivia-party:hall:v1', JSON.stringify({ games: [game(1), game(2)] }));
  s.setItem('trivia-party:packs:v1', JSON.stringify([pack('fam', 3)]));
  s.setItem('unrelated', 'x');
  return s;
}

describe('backup', () => {
  it('round-trips every trivia-party key and nothing else', () => {
    const b = parseBackup(JSON.stringify(makeBackup(device(), 5)));
    expect(Object.keys(b.data).sort()).toEqual(['trivia-party:hall:v1', 'trivia-party:packs:v1', 'trivia-party:settings:v1']);
    expect(summarize(b)).toEqual({ games: 2, packs: 1, questions: 3, bestScore: 900, hasSettings: true });
    const fresh = new Mem();
    restoreBackup(fresh, b);
    expect(fresh.m).toEqual(new Map([...device().m].filter(([k]) => k !== 'unrelated')).set('trivia-party:hall:v1', JSON.stringify({ games: [game(2), game(1)] })));
  });

  it('merges into a device that already has data', () => {
    const b = makeBackup(device());
    const now = new Mem();
    now.setItem('trivia-party:settings:v1', JSON.stringify({ sound: true, bestScore: 1200, playerName: 'C' }));
    now.setItem('trivia-party:hall:v1', JSON.stringify({ games: [game(2), game(3)] }));
    now.setItem('trivia-party:packs:v1', JSON.stringify([pack('fam', 5), pack('new', 1)]));
    restoreBackup(now, b);
    const hall = JSON.parse(now.getItem('trivia-party:hall:v1')!);
    expect(hall.games.map((g: { at: number }) => g.at)).toEqual([3, 2, 1]);
    const packs = JSON.parse(now.getItem('trivia-party:packs:v1')!);
    expect(packs.map((p: { id: string; questions: unknown[] }) => [p.id, p.questions.length])).toEqual([['fam', 5], ['new', 1]]);
    const settings = JSON.parse(now.getItem('trivia-party:settings:v1')!);
    expect(settings).toEqual({ sound: false, bestScore: 1200, playerName: 'C' });
  });

  it('rejects things that are not backups', () => {
    expect(() => parseBackup('hello')).toThrow(/isn't a Trivia Party backup/);
    expect(() => parseBackup('{"app":"other","data":{}}')).toThrow(/isn't a Trivia Party backup/);
    expect(() => parseBackup('{"app":"trivia-party","version":2,"data":{}}')).toThrow(/newer version/);
  });
});
