import { beforeEach, describe, expect, it } from 'vitest';
import { BANK } from '../src/data/bank';
import { GameSession, mulberry32, type GameConfig } from '../src/game/session';

// A tiny stand-in for the browser's storage.
const store = new Map<string, string>();
(globalThis as { localStorage?: unknown }).localStorage = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, String(v)),
  removeItem: (k: string) => void store.delete(k),
};

const config = (over: Partial<GameConfig> = {}): GameConfig => ({
  categories: ['science'],
  rounds: 2,
  questionsPerRound: 5,
  timeLimitMs: 15000,
  ...over,
});

function play(session: GameSession): string[] {
  const ids: string[] = [];
  while (session.hasNextRound()) {
    session.startRound();
    while (session.hasNextQuestion()) {
      ids.push(session.nextQuestion().id);
      session.submit(null, 0);
    }
  }
  return ids;
}

describe('no repeats on the same day', async () => {
  const { markUsed, usedToday } = await import('../src/game/recent');
  beforeEach(() => store.clear());

  it('deals questions not asked earlier today first', () => {
    const first = play(new GameSession(config(), BANK, mulberry32(1)));
    const second = play(new GameSession(config(), BANK, mulberry32(1), undefined, first));
    expect(second.filter((id) => first.includes(id))).toEqual([]);
  });

  it('falls back to the longest-ago questions when a category runs out', () => {
    const science = BANK.filter((q) => q.category === 'science' && (q.age ?? 'teen') !== 'expert');
    const all = science.map((q) => q.id);
    // Everything asked except one; the oldest asked should come straight after it.
    const avoid = all.slice(1);
    const ids = play(new GameSession(config({ rounds: 1, questionsPerRound: 3 }), BANK, mulberry32(2), undefined, avoid));
    expect(ids[0]).toBe(all[0]);
    expect(ids.slice(1)).toEqual(avoid.slice(0, 2));
  });

  it('remembers asked questions for today only', () => {
    const day1 = new Date(2026, 10, 27, 20);
    const day2 = new Date(2026, 10, 28, 9);
    markUsed('a', day1);
    markUsed('b', day1);
    markUsed('a', day1);
    expect(usedToday(day1)).toEqual(['b', 'a']);
    expect(usedToday(day2)).toEqual([]);
  });
});

describe('players stay joined between games', async () => {
  const { PartyHost } = await import('../src/net/host');
  type Sent = { t: string; [k: string]: unknown };

  /** A fake phone connection that records what the host sends. */
  function fakeConn() {
    const handlers = new Map<string, ((x?: unknown) => void)[]>();
    const conn = {
      open: true,
      sent: [] as Sent[],
      send(m: Sent) {
        this.sent.push(m);
      },
      close() {
        conn.open = false;
        for (const h of handlers.get('close') ?? []) h();
      },
      on(ev: string, h: (x?: unknown) => void) {
        handlers.set(ev, [...(handlers.get(ev) ?? []), h]);
      },
      say(m: unknown) {
        for (const h of handlers.get('data') ?? []) h(m);
      },
    };
    return conn;
  }

  function joined(host: InstanceType<typeof PartyHost>, name: string, playerId?: string) {
    const conn = fakeConn();
    (host as unknown as { accept(c: unknown): void }).accept(conn);
    conn.say({ t: 'hello', name, playerId });
    return conn;
  }

  it('keeps connected players for the next game, even after a mode change', () => {
    const host = new PartyHost();
    host.newLobby('teams', 2);
    const a = joined(host, 'Ann');
    const b = joined(host, 'Bob');
    expect(host.players.size).toBe(2);

    // Game over: host goes back to set up something new.
    host.locked = true;
    host.hold();
    expect(a.sent.at(-1)).toMatchObject({ t: 'hold' });

    host.newLobby('players', 0);
    expect(host.players.size).toBe(2);
    expect(host.teams.map((t) => t.name).sort()).toEqual(['Ann', 'Bob']);
    host.lobbyChanged();
    expect(b.sent.at(-1)).toMatchObject({ t: 'lobby', open: true, mode: 'players' });
  });

  it('lets a player leave, and drops them from the next game', () => {
    const host = new PartyHost();
    host.newLobby('teams', 2);
    const a = joined(host, 'Ann');
    joined(host, 'Bob');
    host.locked = true;
    a.say({ t: 'leave' });
    expect(host.players.size).toBe(2); // mid-game their team keeps its points
    host.newLobby('teams', 2);
    expect([...host.players.values()].map((p) => p.name)).toEqual(['Bob']);
  });

  it('takes a returning phone back under the same id after the host restarts', () => {
    const host = new PartyHost();
    host.newLobby('teams', 2);
    joined(host, 'Ann', 'abc12345');
    expect(host.players.get('abc12345')?.name).toBe('Ann');
  });

  it('holds late arrivals in a solo-players game until the next lobby', () => {
    const host = new PartyHost();
    host.newLobby('players', 0);
    joined(host, 'Ann');
    host.locked = true;
    const late = joined(host, 'Cy');
    expect(late.sent.at(-1)).toMatchObject({ t: 'hold' });
    expect(host.players.size).toBe(1);
    host.newLobby('players', 0);
    expect([...host.players.values()].map((p) => p.name).sort()).toEqual(['Ann', 'Cy']);
  });
});
