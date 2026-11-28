import Peer, { type DataConnection } from 'peerjs';
import { makeRoomCode, PLAYER_COLORS, TEAM_PRESETS, type Vote } from '../game/teams';
import { avatarDef, randomAvatar } from '../game/avatars';
import type { TeamInfo, TeamScore } from '../game/session';
import { PEER_PREFIX, peerOptions, type HostMsg, type PlayerMsg, type PublicTeam, type TeamMode } from './protocol';

export interface Player {
  id: string;
  name: string;
  teamId: string | null;
  conn: DataConnection | null;
  avatar: string;
  /** The host playing along on the TV/host screen itself (no phone connection). */
  local?: boolean;
}

/** One phone's connection, and the player it speaks for once it has said hello. */
interface Slot {
  conn: DataConnection;
  playerId: string | null;
}

const isOnline = (p: Player) => !!p.conn || !!p.local;

export interface HostEvents {
  /** Lobby membership changed (join, leave, team switch). */
  onLobby?: () => void;
  /** A vote arrived during a question. */
  onVote?: (teamId: string, playerId: string) => void;
  /** A team asked for a 50/50 hint. Return the hidden answers, or null if not allowed. */
  onHint?: (teamId: string, qid: number) => { hidden: number[]; hintsLeft: number } | null;
  /** Final wager: a team member placed a bet. Returns the amount accepted. */
  onBet?: (teamId: string, amount: number) => number | null;
}

const MAX_NAME = 16;

/** The host's room code, kept so the same code (and the phones on it) carry over to the next game. */
const ROOM_KEY = 'trivia-party:room';
/** A remembered code is reused for this long after it was last used. */
const ROOM_TTL_MS = 12 * 60 * 60 * 1000;

function rememberedCode(): string | null {
  try {
    const raw = localStorage.getItem(ROOM_KEY);
    const r = raw ? (JSON.parse(raw) as { code?: string; at?: number }) : null;
    if (r?.code && /^[A-Z0-9]{4}$/.test(r.code) && Date.now() - (r.at ?? 0) < ROOM_TTL_MS) return r.code;
  } catch {
    // Unreadable: a fresh code is fine.
  }
  return null;
}

function rememberCode(code: string): void {
  try {
    localStorage.setItem(ROOM_KEY, JSON.stringify({ code, at: Date.now() }));
  } catch {
    // Not stored: the next game gets a new code.
  }
}

const validId = (id: unknown): id is string => typeof id === 'string' && /^[a-z0-9]{4,16}$/.test(id);
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** The TV/host end of a party game: owns the room code, player list, teams and live votes. */
export class PartyHost {
  code = '';
  readonly players = new Map<string, Player>();
  teams: TeamInfo[] = [];
  mode: TeamMode = 'teams';
  locked = false;
  /** Between games: phones stay joined and are told to wait for the next one. */
  holding = false;
  events: HostEvents = {};

  private peer: Peer | null = null;
  private qid = 0;
  private votes = new Map<string, Vote[]>();
  private questionOpen = false;
  private deadline = 0;
  private scores: () => TeamScore[] = () => [];
  /** Set for fill-in-the-blank questions: is this typed guess right? */
  matcher: ((text: string) => boolean) | null = null;

  /** True while the room is open and reachable by phones. */
  get isOpen(): boolean {
    return !!this.peer && !this.peer.destroyed;
  }

  /**
   * Opens the room. Reuses the last room code when it can, so phones from the last game
   * (which keep trying it) find their way back without scanning again. Otherwise picks a fresh code.
   */
  async open(mode: TeamMode, teamCount: number): Promise<string> {
    this.newLobby(mode, teamCount);
    const old = rememberedCode();
    // Right after the app restarts the old code can take a few seconds to be released.
    const tries = old ? [old, old, old, old] : [];
    for (let attempt = 0; attempt < tries.length + 5; attempt++) {
      const code = tries[attempt] ?? makeRoomCode();
      try {
        this.peer = await this.listen(code);
        this.code = code;
        rememberCode(code);
        return code;
      } catch (e) {
        if (!(e instanceof Error) || !e.message.includes('unavailable-id')) throw e;
        if (attempt < tries.length - 1) await wait(2000);
      }
    }
    throw new Error('Could not get a room code. Check your internet connection and try again.');
  }

  /**
   * Gets the room ready for a new game, keeping everyone who is still connected.
   * Players who left or dropped off since the last game are let go; they can rejoin any time.
   */
  newLobby(mode: TeamMode, teamCount: number): void {
    this.holding = false;
    this.locked = false;
    for (const p of [...this.players.values()]) if (!isOnline(p)) this.players.delete(p.id);
    const changed = mode !== this.mode;
    this.mode = mode;
    if (mode === 'teams') {
      this.teams = TEAM_PRESETS.slice(0, teamCount);
      for (const p of this.players.values()) if (changed || !this.teams.some((t) => t.id === p.teamId)) p.teamId = null;
      for (const p of this.players.values()) if (!p.teamId) p.teamId = this.smallestTeam();
    } else {
      this.teams = [];
      for (const p of this.players.values()) this.giveOwnTeam(p);
    }
    if (this.code) rememberCode(this.code);
    // Phones that arrived mid-game join now.
    const waiting = this.waitlist;
    this.waitlist = [];
    for (const w of waiting) if (w.slot.conn.open) w.slot.playerId = this.hello(w.slot, w.msg);
  }

  /** Between games: phones stay joined and see the given message until the next lobby opens. */
  hold(text = 'The host is setting up the next game.'): void {
    this.holding = true;
    this.locked = false;
    this.holdText = text;
    this.broadcast({ t: 'hold', text });
    this.events = {};
  }

  private holdText = '';
  /** Phones that arrived while an every-player-for-themselves game was on. */
  private waitlist: { slot: Slot; msg: Extract<PlayerMsg, { t: 'hello' }> }[] = [];

  private listen(code: string): Promise<Peer> {
    return new Promise((resolve, reject) => {
      const peer = new Peer(PEER_PREFIX + code, peerOptions());
      const fail = (err: { type?: string; message?: string }) => {
        peer.destroy();
        reject(new Error(err.type === 'unavailable-id' ? 'unavailable-id' : (err.message ?? 'Connection failed')));
      };
      peer.once('error', fail);
      peer.once('open', () => {
        peer.off('error', fail);
        peer.on('error', (err) => console.warn('[host] peer error', err.type));
        // Keep the room reachable if the signalling server drops us.
        peer.on('disconnected', () => setTimeout(() => !peer.destroyed && peer.reconnect(), 1500));
        peer.on('connection', (conn) => this.accept(conn));
        resolve(peer);
      });
    });
  }

  /**
   * The host is leaving this screen (e.g. the app restarts to the title). Phones are told to wait,
   * and keep trying the same room code until the host opens it again.
   */
  suspend(): void {
    this.hold('The host is setting up the next game.');
    setTimeout(() => this.peer?.destroy(), 300);
  }

  /** Gives the host a way to read live scores for lobby/standings messages. */
  bindScores(fn: () => TeamScore[]): void {
    this.scores = fn;
  }

  // ---------- membership ----------

  private accept(conn: DataConnection): void {
    const slot: Slot = { conn, playerId: null };
    conn.on('data', (raw) => {
      const msg = raw as PlayerMsg;
      if (msg.t === 'hello') {
        slot.playerId = this.hello(slot, msg);
        return;
      }
      if (msg.t === 'leave') {
        this.waitlist = this.waitlist.filter((w) => w.slot !== slot);
        if (slot.playerId) this.leave(slot.playerId);
        slot.playerId = null;
        return;
      }
      if (slot.playerId) this.handle(slot.playerId, msg);
    });
    conn.on('close', () => {
      this.waitlist = this.waitlist.filter((w) => w.slot !== slot);
      if (!slot.playerId) return;
      const p = this.players.get(slot.playerId);
      if (p && p.conn === conn) {
        p.conn = null;
        this.lobbyChanged();
      }
    });
    conn.on('error', () => conn.close());
  }

  private hello(slot: Slot, msg: Extract<PlayerMsg, { t: 'hello' }>): string | null {
    const conn = slot.conn;
    const name = String(msg.name ?? '').trim().slice(0, MAX_NAME) || 'Player';
    const askedId = validId(msg.playerId) ? msg.playerId : undefined;
    let p = askedId ? this.players.get(askedId) : undefined;
    const avatar = avatarDef(msg.avatar).id === msg.avatar ? msg.avatar! : randomAvatar();
    if (p) {
      // Rejoining (phone slept or lost signal): keep their team and score.
      p.conn?.close();
      p.conn = conn;
      if (msg.avatar) p.avatar = avatar;
    } else {
      if (this.locked && this.mode === 'players') {
        // Every player is their own team, so nobody new can join mid-game: they wait for the next one.
        this.waitlist = this.waitlist.filter((w) => w.slot !== slot);
        this.waitlist.push({ slot, msg });
        conn.send({ t: 'hold', text: "A game is on right now. You'll be in the next one." } satisfies HostMsg);
        return null;
      }
      // A phone from an earlier game keeps its id, so it stays the same player from game to game.
      p = this.addPlayer(name, conn, false, avatar, askedId);
    }
    this.send(p, { t: 'welcome', playerId: p.id, teamId: p.teamId, mode: this.mode });
    if (this.holding) this.send(p, { t: 'hold', text: this.holdText });
    this.lobbyChanged();
    return p.id;
  }

  private addPlayer(name: string, conn: DataConnection | null, local = false, avatar = randomAvatar(), id = Math.random().toString(36).slice(2, 10)): Player {
    const p: Player = { id, name, teamId: null, conn, local, avatar };
    this.players.set(id, p);
    if (this.mode === 'players') this.giveOwnTeam(p);
    else p.teamId = this.smallestTeam();
    return p;
  }

  /** Every-player-for-themselves: each player is their own team. */
  private giveOwnTeam(p: Player): void {
    const color = PLAYER_COLORS[this.teams.length % PLAYER_COLORS.length];
    this.teams.push({ id: `p-${p.id}`, name: p.name, color });
    p.teamId = `p-${p.id}`;
  }

  // ---------- the host playing along ----------

  get localPlayer(): Player | undefined {
    return [...this.players.values()].find((p) => p.local);
  }

  /** Adds the host as a player who answers on the host screen. Only before the game starts. */
  addLocal(name: string, avatar?: string): Player | null {
    if (this.locked) return null;
    const p = this.localPlayer ?? this.addPlayer(name.trim().slice(0, MAX_NAME) || 'Host', null, true, avatar && avatarDef(avatar).id === avatar ? avatar : randomAvatar());
    this.lobbyChanged();
    return p;
  }

  removeLocal(): void {
    const p = this.localPlayer;
    if (p && !this.locked) this.removePlayer(p.id);
  }

  /**
   * A player chose to leave: gone from the lobby before the game; mid-game their team keeps its
   * points, and they are let go when the next game's lobby opens.
   */
  private leave(playerId: string): void {
    const p = this.players.get(playerId);
    if (!p) return;
    if (!this.locked) this.removePlayer(playerId);
    else {
      p.conn = null;
      this.lobbyChanged();
    }
  }

  private removePlayer(playerId: string): void {
    const p = this.players.get(playerId);
    if (!p) return;
    this.players.delete(playerId);
    if (this.mode === 'players') this.teams = this.teams.filter((t) => t.id !== p.teamId);
    this.lobbyChanged();
  }

  /** Moves the host's own player to another team (teams mode, lobby only). */
  moveLocal(teamId: string): void {
    const p = this.localPlayer;
    if (p) this.handle(p.id, { t: 'team', teamId });
  }

  /** The host's own answer, made on the host screen. */
  localVote(choice: number): void {
    const p = this.localPlayer;
    if (p) this.vote(p, this.qid, choice);
  }

  /** The host's own bet in the final wager. */
  localBet(amount: number): number | null {
    const p = this.localPlayer;
    return p ? this.bet(p, amount) : null;
  }

  private bet(p: Player, raw: unknown): number | null {
    const amount = Number(raw);
    if (!p.teamId || !Number.isFinite(amount) || !this.events.onBet) return null;
    const accepted = this.events.onBet(p.teamId, amount);
    if (accepted !== null) this.sendToTeam(p.teamId, { t: 'bet', amount: accepted, by: p.name });
    return accepted;
  }

  /** The host's own typed answer (fill in the blank). */
  localGuess(text: string): void {
    const p = this.localPlayer;
    if (p) this.guess(p, this.qid, text);
  }

  /** The host's own 50/50 request. Returns what was hidden, or null if not allowed. */
  localHint(): { hidden: number[]; hintsLeft: number } | null {
    const p = this.localPlayer;
    if (!p?.teamId || !this.questionOpen) return null;
    const res = this.events.onHint?.(p.teamId, this.qid) ?? null;
    if (res) this.sendToTeam(p.teamId, { t: 'hint', qid: this.qid, hidden: res.hidden, hintsLeft: res.hintsLeft });
    return res;
  }

  private smallestTeam(): string {
    const counts = this.teams.map((t) => ({ id: t.id, n: this.membersOf(t.id).length }));
    counts.sort((a, b) => a.n - b.n);
    return counts[0].id;
  }

  private handle(playerId: string, msg: PlayerMsg): void {
    const p = this.players.get(playerId);
    if (!p) return;
    switch (msg.t) {
      case 'team':
        if (this.mode === 'teams' && !this.locked && this.teams.some((t) => t.id === msg.teamId)) {
          p.teamId = msg.teamId;
          this.lobbyChanged();
        }
        break;
      case 'vote':
        if (!this.matcher) this.vote(p, msg.qid, msg.choice);
        break;
      case 'guess':
        this.guess(p, msg.qid, msg.text);
        break;
      case 'bet':
        this.bet(p, msg.amount);
        break;
      case 'hint': {
        if (!p.teamId || msg.qid !== this.qid || !this.questionOpen) return;
        const res = this.events.onHint?.(p.teamId, msg.qid);
        if (res) this.sendToTeam(p.teamId, { t: 'hint', qid: msg.qid, hidden: res.hidden, hintsLeft: res.hintsLeft });
        break;
      }
    }
  }

  membersOf(teamId: string): Player[] {
    return [...this.players.values()].filter((p) => p.teamId === teamId);
  }

  /** Teams that have at least one player. */
  activeTeams(): TeamInfo[] {
    return this.teams.filter((t) => this.membersOf(t.id).length > 0);
  }

  publicTeams(): PublicTeam[] {
    const scores = this.scores();
    return this.teams.map((t) => {
      const s = scores.find((x) => x.id === t.id);
      return {
        ...t,
        score: s?.score ?? 0,
        hintsLeft: s?.hintsLeft ?? 0,
        members: this.membersOf(t.id).map((m) => ({ id: m.id, name: m.name, online: isOnline(m), avatar: m.avatar })),
      };
    });
  }

  lobbyChanged(): void {
    const teams = this.publicTeams();
    for (const p of this.players.values()) {
      if (this.holding) continue;
      this.send(p, { t: 'lobby', mode: this.mode, teams, you: { playerId: p.id, teamId: p.teamId }, open: !this.locked });
    }
    this.events.onLobby?.();
  }

  // ---------- questions and votes ----------

  /** Starts collecting votes for a new question. */
  openQuestion(qid: number, durationMs: number): void {
    this.qid = qid;
    this.votes = new Map();
    this.questionOpen = true;
    // A little grace for network delay; phones show the plain duration.
    this.deadline = performance.now() + durationMs + 600;
  }

  closeQuestion(): void {
    this.questionOpen = false;
  }

  votesFor(teamId: string): Vote[] {
    return this.votes.get(teamId) ?? [];
  }

  /** True when every connected member of every active team has voted. */
  allVoted(): boolean {
    return this.activeTeams().every((t) => this.teamDecided(t.id));
  }

  teamDecided(teamId: string): boolean {
    const online = this.membersOf(teamId).filter(isOnline);
    if (online.length === 0) return true;
    const voters = new Set(this.votesFor(teamId).map((v) => v.playerId));
    return online.every((m) => voters.has(m.id));
  }

  private guess(p: Player, qid: number, raw: unknown): void {
    const text = String(raw ?? '').trim().slice(0, 40);
    if (!this.matcher || !text) return;
    // 0 is the right answer; every wrong guess counts as choice 1.
    this.vote(p, qid, this.matcher(text) ? 0 : 1, text);
  }

  /** Each team member's latest typed answer. */
  teamTexts(teamId: string): string[] {
    const latest = new Map<string, string>();
    for (const v of this.votesFor(teamId)) if (v.text) latest.set(v.playerId, v.text);
    return [...latest.values()];
  }

  /** What a team typed for the answer it went with (fill in the blank). */
  teamText(teamId: string, choice: number | null): string | undefined {
    const list = this.votesFor(teamId).filter((v) => v.choice === choice && v.text);
    return list[list.length - 1]?.text;
  }

  private vote(p: Player, qid: number, choice: number, text?: string): void {
    if (!this.questionOpen || qid !== this.qid || !p.teamId) return;
    if (performance.now() > this.deadline) return;
    if (!Number.isInteger(choice) || choice < 0 || choice > 3) return;
    const list = this.votes.get(p.teamId) ?? [];
    list.push({ playerId: p.id, choice, at: performance.now(), text });
    this.votes.set(p.teamId, list);

    const latest = new Map<string, Vote>();
    for (const v of list) latest.set(v.playerId, v);
    this.sendToTeam(p.teamId, {
      t: 'votes',
      qid,
      votes: [...latest].map(([playerId, v]) => ({ playerId, name: this.players.get(playerId)?.name ?? '?', choice: v.choice, text: v.text })),
      decided: this.teamDecided(p.teamId),
    });
    this.events.onVote?.(p.teamId, p.id);
  }

  // ---------- sending ----------

  send(p: Player, msg: HostMsg): void {
    if (p.conn?.open) p.conn.send(msg);
  }

  sendToTeam(teamId: string, msg: HostMsg): void {
    for (const p of this.membersOf(teamId)) this.send(p, msg);
  }

  broadcast(msg: HostMsg): void {
    for (const p of this.players.values()) this.send(p, msg);
  }

  /** Sends each player a message built for their team. */
  each(build: (p: Player) => HostMsg): void {
    for (const p of this.players.values()) this.send(p, build(p));
  }
}
