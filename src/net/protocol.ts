import { Capacitor } from '@capacitor/core';

/** Messages between the host (TV) and players' phones. Kept small and JSON-friendly. */

export type TeamMode = 'teams' | 'players';

export interface PublicCategory {
  name: string;
  icon: string;
  color: string;
}

export interface PublicMember {
  id: string;
  name: string;
  online: boolean;
  avatar: string;
}

export interface PublicTeam {
  id: string;
  name: string;
  color: string;
  score: number;
  hintsLeft: number;
  members: PublicMember[];
}

export type HostMsg =
  | { t: 'welcome'; playerId: string; teamId: string | null; mode: TeamMode }
  | { t: 'lobby'; mode: TeamMode; teams: PublicTeam[]; you: { playerId: string; teamId: string | null } }
  | {
      t: 'screen';
      screen: 'wheel' | 'category' | 'scores' | 'wait';
      text: string;
      category?: PublicCategory;
    }
  | {
      t: 'question';
      qid: number;
      number: number;
      total: number;
      multiplier: number;
      prompt: string;
      choices: string[];
      category: PublicCategory;
      durationMs: number;
      hidden: number[];
      hintsLeft: number;
      teamSize: number;
      /** The TV is showing a picture, or playing a tune, for this question. */
      media: 'picture' | 'tune' | null;
      /** Fill in the blank: type the answer instead of picking one. */
      typed: boolean;
      /** Closest guess: the answer is a number. */
      numeric?: boolean;
    }
  | { t: 'votes'; qid: number; votes: { playerId: string; name: string; choice: number; text?: string }[]; decided: boolean }
  | { t: 'hint'; qid: number; hidden: number[]; hintsLeft: number }
  | { t: 'wager'; max: number; score: number; category: PublicCategory; durationMs: number }
  | { t: 'bet'; amount: number; by: string }
  | {
      t: 'reveal';
      qid: number;
      answer: number;
      answerText: string;
      chosen: number | null;
      correct: boolean;
      points: number;
      rank: number;
      teams: PublicTeam[];
    }
  | { t: 'final'; teams: PublicTeam[]; yourTeamId: string | null; awards?: { icon: string; title: string; why: string; teamId: string }[] }
  | { t: 'bye'; reason: string };

export type PlayerMsg =
  | { t: 'hello'; name: string; playerId?: string; avatar?: string }
  | { t: 'team'; teamId: string }
  | { t: 'vote'; qid: number; choice: number }
  | { t: 'guess'; qid: number; text: string }
  | { t: 'bet'; amount: number }
  | { t: 'hint'; qid: number };

export const PEER_PREFIX = 'trivia-party-room-';

/** Where phones open the game. The host's QR code points here with ?join=CODE. */
export const PUBLIC_URL = 'https://sprintfoot.github.io/Trivia-game-android/';

export function joinUrl(code: string): string {
  // When the host runs from a normal web address (not inside the Android app), link back to it.
  const here = window.location;
  const base = Capacitor.isNativePlatform() ? PUBLIC_URL : `${here.origin}${here.pathname}`;
  const extra = new URLSearchParams(here.search).get('peer');
  return `${base}?join=${code}${extra ? `&peer=${encodeURIComponent(extra)}` : ''}`;
}

/**
 * PeerJS options. By default this uses the free public PeerJS server to introduce phones to the host;
 * after that, game messages go directly between devices. ?peer=host:port points at a private server
 * (used for local testing).
 */
export function peerOptions(): import('peerjs').PeerOptions {
  const custom = new URLSearchParams(window.location.search).get('peer');
  const ice = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }] };
  if (custom) {
    const [host, port] = custom.split(':');
    return { host, port: Number(port) || 9000, path: '/', secure: false, config: ice, debug: 1 };
  }
  return { config: ice, debug: 1 };
}
