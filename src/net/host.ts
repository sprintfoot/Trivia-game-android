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

/** The TV/host end of a party game: owns the room code, player list, teams and live votes. */
export class PartyHost {
  code = '';
  readonly players = new Map<string, Player>();
  teams: TeamInfo[] = [];
  mode: TeamMode = 'teams';
  locked = false;
  events: HostEvents = {};

  private peer: Peer | null = null;
  private qid = 0;
  private votes = new Map<string, Vote[]>();
  private questionOpen = false;
  private deadline = 0;
  private scores: () => TeamScore[] = () => [];
  /** Set for fill-in-the-blank questions: is this typed guess right? */
  matcher: ((text: string) => boolean) | null = null;

  /** Opens the room. Retries with a fresh code if one is already taken. */
  async open(mode: TeamMode, teamCount: number): Promise<string> {
    this.mode = mode;
    this.teams = mode === 'teams' ? TEAM_PRESETS.slice(0, teamCount) : [];
    for (let attempt = 0; attempt < 5; attempt++) {
      const code = makeRoomCode();
      try {
        this.peer = await this.listen(code);
        this.code = code;
        return code;
      } catch (e) {
        if (!(e instanceof Error) || !e.message.includes('unavailable-id')) throw e;
      }
    }
    throw new Error('Could not get a room code. Check your internet connection and try again.');
  }

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

  close(): void {
    this.broadcast({ t: 'bye', reason: 'The host ended the game.' });
    setTimeout(() => this.peer?.destroy(), 300);
  }

  /** Gives the host a way to read live scores for lobby/standings messages. */
  bindScores(fn: () => TeamScore[]): void {
    this.scores = fn;
  }

  // ---------- membership ----------

  private accept(conn: DataConnection): void {
    let playerId: string | null = null;
    conn.on('data', (raw) => {
      const msg = raw as PlayerMsg;
      if (msg.t === 'hello') {
        playerId = this.hello(conn, msg);
        return;
      }
      if (playerId) this.handle(playerId, msg);
    });
    conn.on('close', () => {
      if (!playerId) return;
      const p = this.players.get(playerId);
      if (p && p.conn === conn) {
        p.conn = null;
        this.lobbyChanged();
      }
    });
    conn.on('error', () => conn.close());
  }

  private hello(conn: DataConnection, msg: Extract<PlayerMsg, { t: 'hello' }>): string | null {
    const name = String(msg.name ?? '').trim().slice(0, MAX_NAME) || 'Player';
    let p = msg.playerId ? this.players.get(msg.playerId) : undefined;
    const avatar = avatarDef(msg.avatar).id === msg.avatar ? msg.avatar! : randomAvatar();
    if (p) {
      // Rejoining (phone slept or lost signal): keep their team and score.
      p.conn?.close();
      p.conn = conn;
      if (msg.avatar) p.avatar = avatar;
    } else {
      if (this.locked && this.mode === 'players') {
        conn.send({ t: 'bye', reason: 'This game has already started.' } satisfies HostMsg);
        setTimeout(() => conn.close(), 300);
        return null;
      }
      p = this.addPlayer(name, conn, false, avatar);
    }
    this.send(p, { t: 'welcome', playerId: p.id, teamId: p.teamId, mode: this.mode });
    this.lobbyChanged();
    return p.id;
  }

  private addPlayer(name: string, conn: DataConnection | null, local = false, avatar = randomAvatar()): Player {
    const id = Math.random().toString(36).slice(2, 10);
    const p: Player = { id, name, teamId: null, conn, local, avatar };
    this.players.set(id, p);
    if (this.mode === 'players') {
      const color = PLAYER_COLORS[this.teams.length % PLAYER_COLORS.length];
      this.teams.push({ id: `p-${id}`, name, color });
      p.teamId = `p-${id}`;
    } else {
      p.teamId = this.smallestTeam();
    }
    return p;
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
    if (!p || this.locked) return;
    this.players.delete(p.id);
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
      this.send(p, { t: 'lobby', mode: this.mode, teams, you: { playerId: p.id, teamId: p.teamId } });
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
