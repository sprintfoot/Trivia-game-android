import Peer, { type DataConnection } from 'peerjs';
import { PEER_PREFIX, peerOptions, type HostMsg, type PlayerMsg } from './protocol';

export type ClientStatus = 'connecting' | 'connected' | 'reconnecting' | 'closed';

/** A phone's connection to the host. Reconnects by itself if the phone sleeps or loses signal. */
export class PartyClient {
  status: ClientStatus = 'connecting';
  onMessage: (msg: HostMsg) => void = () => undefined;
  onStatus: (s: ClientStatus) => void = () => undefined;

  private peer: Peer | null = null;
  private conn: DataConnection | null = null;
  private playerId: string | null;
  private closed = false;
  private retryTimer: number | null = null;

  constructor(
    readonly code: string,
    readonly name: string,
    readonly avatar?: string,
  ) {
    this.playerId = sessionStorage.getItem(this.storeKey);
  }

  private get storeKey(): string {
    return `trivia-party:player:${this.code}`;
  }

  /** Resolves once connected the first time; rejects if the room can't be reached. */
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      let first = true;
      const timeout = window.setTimeout(() => {
        if (first) reject(new Error("Couldn't reach that game. Check the code, and that the TV is on the lobby screen."));
      }, 15000);

      this.peer = new Peer(peerOptions());
      this.peer.on('error', (err) => {
        if (err.type === 'peer-unavailable') {
          if (first) {
            window.clearTimeout(timeout);
            reject(new Error(`No game found with code ${this.code}.`));
          } else this.scheduleRetry();
        }
      });
      this.peer.on('disconnected', () => !this.closed && this.peer?.reconnect());
      this.peer.on('open', () => {
        this.dial(() => {
          if (first) {
            first = false;
            window.clearTimeout(timeout);
            resolve();
          }
        });
      });
    });
  }

  private dial(onOpen?: () => void): void {
    if (!this.peer || this.peer.destroyed) return;
    const conn = this.peer.connect(PEER_PREFIX + this.code, { reliable: true, serialization: 'json' });
    this.conn = conn;
    conn.on('open', () => {
      this.setStatus('connected');
      this.send({ t: 'hello', name: this.name, playerId: this.playerId ?? undefined, avatar: this.avatar });
      onOpen?.();
    });
    conn.on('data', (raw) => {
      const msg = raw as HostMsg;
      if (msg.t === 'welcome') {
        this.playerId = msg.playerId;
        sessionStorage.setItem(this.storeKey, msg.playerId);
      }
      if (msg.t === 'bye') this.closed = true;
      this.onMessage(msg);
    });
    conn.on('close', () => {
      if (this.conn === conn) this.scheduleRetry();
    });
    conn.on('error', () => this.scheduleRetry());
  }

  private scheduleRetry(): void {
    if (this.closed || this.retryTimer !== null) return;
    this.setStatus('reconnecting');
    this.retryTimer = window.setTimeout(() => {
      this.retryTimer = null;
      this.dial();
    }, 2000);
  }

  private setStatus(s: ClientStatus): void {
    this.status = s;
    this.onStatus(s);
  }

  send(msg: PlayerMsg): void {
    if (this.conn?.open) this.conn.send(msg);
  }

  leave(): void {
    this.closed = true;
    this.send({ t: 'leave' });
    // Give the goodbye a moment to reach the host before hanging up.
    const peer = this.peer;
    setTimeout(() => peer?.destroy(), 250);
    this.setStatus('closed');
  }
}
