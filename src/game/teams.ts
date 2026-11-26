import type { TeamInfo } from './session';

export const TEAM_PRESETS: readonly TeamInfo[] = [
  { id: 't1', name: 'Neon Ninjas', color: '#38e1ff' },
  { id: 't2', name: 'Brainstorms', color: '#ff4fa3' },
  { id: 't3', name: 'Know-It-Alls', color: '#ffcc33' },
  { id: 't4', name: 'Fact Attack', color: '#7cf03d' },
  { id: 't5', name: 'Quiz Wizards', color: '#b46bff' },
  { id: 't6', name: 'Smarty Pants', color: '#ff8a3d' },
];

/** Colours for "every player for themselves" games, reused round-robin. */
export const PLAYER_COLORS = ['#38e1ff', '#ff4fa3', '#ffcc33', '#7cf03d', '#b46bff', '#ff8a3d', '#5ab4ff', '#ff5c5c', '#3dff9a', '#ffd84d'];

export interface Vote {
  playerId: string;
  choice: number;
  /** When the vote was cast (ms, host clock). */
  at: number;
}

export interface TeamDecision {
  choice: number | null;
  /** When the decision was settled: the last vote counted (ms, host clock). */
  at: number | null;
}

/**
 * A team's answer is its most popular vote. Ties go to the choice that was voted for first.
 * Only the latest vote from each player counts.
 */
export function decideTeamAnswer(votes: readonly Vote[]): TeamDecision {
  const latest = new Map<string, Vote>();
  for (const v of votes) {
    const prev = latest.get(v.playerId);
    if (!prev || v.at >= prev.at) latest.set(v.playerId, v);
  }
  if (latest.size === 0) return { choice: null, at: null };

  const tally = new Map<number, { count: number; first: number }>();
  for (const v of latest.values()) {
    const t = tally.get(v.choice) ?? { count: 0, first: Infinity };
    t.count += 1;
    t.first = Math.min(t.first, v.at);
    tally.set(v.choice, t);
  }
  let best: [number, { count: number; first: number }] | null = null;
  for (const entry of tally) {
    if (!best || entry[1].count > best[1].count || (entry[1].count === best[1].count && entry[1].first < best[1].first)) best = entry;
  }
  const at = Math.max(...[...latest.values()].map((v) => v.at));
  return { choice: best![0], at };
}

/** Short room codes without look-alike letters (no I, L, O, 0, 1). */
export function makeRoomCode(rng: () => number = Math.random): string {
  const letters = 'ABCDEFGHJKMNPQRSTUVWXYZ';
  let code = '';
  for (let i = 0; i < 4; i++) code += letters[Math.floor(rng() * letters.length)];
  return code;
}
