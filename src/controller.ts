/**
 * The phone side of a party game: join with a code, pick a team, then vote on answers.
 * Works in any phone browser (iPhone or Android) and inside the Android app.
 */
import { PartyClient } from './net/client';
import type { HostMsg, PublicTeam } from './net/protocol';
import { sound } from './audio/sound';
import { haptics } from './audio/haptics';
import { esc, mount, press } from './ui/ui';
import type { Settings } from './settings';
import { saveSettings } from './settings';

const LETTERS = ['A', 'B', 'C', 'D'];

export function joinForm(settings: Settings, presetCode = ''): Promise<{ code: string; name: string } | null> {
  const el = mount(
    `<header class="bar"><h2>Join a game</h2></header>
     <form class="join-form" autocomplete="off">
       <label>Room code<input name="code" maxlength="4" inputmode="text" autocapitalize="characters" spellcheck="false" value="${esc(presetCode)}" placeholder="ABCD" required /></label>
       <label>Your name<input name="name" maxlength="16" value="${esc(settings.playerName)}" placeholder="Name" required /></label>
       <p class="hint">The room code is on the TV.</p>
       <p class="error" data-err></p>
       <button class="btn primary big" type="submit">JOIN</button>
       <button class="btn ghost" type="button" data-back>BACK</button>
     </form>`,
    'join-screen',
  );
  const form = el.querySelector('form')!;
  const codeIn = form.elements.namedItem('code') as HTMLInputElement;
  const nameIn = form.elements.namedItem('name') as HTMLInputElement;
  codeIn.addEventListener('input', () => (codeIn.value = codeIn.value.toUpperCase().replace(/[^A-Z]/g, '')));
  requestAnimationFrame(() => (presetCode ? nameIn : codeIn).focus());

  return new Promise((resolve) => {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const code = codeIn.value.trim().toUpperCase();
      const name = nameIn.value.trim();
      if (code.length !== 4 || !name) {
        el.querySelector('[data-err]')!.textContent = 'Enter the 4-letter code and your name.';
        return;
      }
      sound.click();
      settings.playerName = name;
      saveSettings(settings);
      resolve({ code, name });
    });
    press(el.querySelector('[data-back]')!, () => resolve(null));
  });
}

export function joinError(text: string): void {
  const el = document.querySelector('[data-err]');
  if (el) el.textContent = text;
}

/** Runs the phone controller until the game ends or the player leaves. */
export class Controller {
  private teamId: string | null = null;
  private playerId: string | null = null;
  private teams: PublicTeam[] = [];
  private qid = -1;
  private inGame = false;
  private statusEl: HTMLElement;

  constructor(private readonly client: PartyClient) {
    this.statusEl = document.createElement('div');
    this.statusEl.className = 'net-status';
    document.body.appendChild(this.statusEl);
    client.onStatus = (s) => {
      this.statusEl.textContent = s === 'reconnecting' ? 'Reconnecting…' : '';
      this.statusEl.classList.toggle('on', s === 'reconnecting');
    };
    client.onMessage = (m) => this.handle(m);
    this.waitScreen('Connected!', 'Hang tight…');
  }

  private get myTeam(): PublicTeam | undefined {
    return this.teams.find((t) => t.id === this.teamId);
  }

  private handle(m: HostMsg): void {
    switch (m.t) {
      case 'welcome':
        this.playerId = m.playerId;
        this.teamId = m.teamId;
        break;
      case 'lobby':
        this.teams = m.teams;
        this.teamId = m.you.teamId;
        this.playerId = m.you.playerId;
        if (!this.inGame) this.lobby(m.mode);
        break;
      case 'screen':
        this.inGame = true;
        this.waitScreen(m.text, m.screen === 'category' && m.category ? `${m.category.icon} ${m.category.name}` : 'Look at the TV!', m.category?.color);
        break;
      case 'question':
        this.inGame = true;
        this.question(m);
        break;
      case 'votes':
        if (m.qid === this.qid) this.showVotes(m.votes, m.decided);
        break;
      case 'hint':
        if (m.qid === this.qid) this.applyHint(m.hidden, m.hintsLeft);
        break;
      case 'reveal':
        this.teams = m.teams;
        this.reveal(m);
        break;
      case 'final':
        this.final(m.teams);
        break;
      case 'bye':
        this.waitScreen('Game over', m.reason);
        break;
    }
  }

  private lobby(mode: 'teams' | 'players'): void {
    const team = this.myTeam;
    const el = mount(
      `<div class="ctl">
         <div class="ctl-head" style="--c:${team?.color ?? '#38e1ff'}">You're in!</div>
         ${
           mode === 'teams'
             ? `<p class="hint">Tap a team to join it</p>
                <div class="ctl-teams">${this.teams
                  .map(
                    (t) => `<button class="ctl-team ${t.id === this.teamId ? 'on' : ''}" data-team="${t.id}" style="--c:${t.color}">
                      <b>${esc(t.name)}</b><span>${t.members.map((x) => esc(x.name)).join(', ') || 'Nobody yet'}</span></button>`,
                  )
                  .join('')}</div>`
             : `<p class="hint">Every player for themselves.</p>`
         }
         <p class="ctl-wait">Waiting for the host to start…</p>
       </div>`,
      'ctl-screen',
    );
    el.querySelectorAll<HTMLElement>('[data-team]').forEach((b) =>
      press(b, () => this.client.send({ t: 'team', teamId: b.dataset.team! })),
    );
  }

  private waitScreen(title: string, text: string, color?: string): void {
    const team = this.myTeam;
    mount(
      `<div class="ctl ctl-wait-screen" style="--c:${color ?? team?.color ?? '#38e1ff'}">
         ${team ? `<div class="ctl-badge" style="--c:${team.color}">${esc(team.name)} · ${team.score.toLocaleString()}</div>` : ''}
         <div class="ctl-big">${esc(title)}</div>
         <p class="ctl-sub">${esc(text)}</p>
       </div>`,
      'ctl-screen',
    );
  }

  private question(m: Extract<HostMsg, { t: 'question' }>): void {
    this.qid = m.qid;
    const team = this.myTeam;
    const el = mount(
      `<div class="ctl ctl-q" style="--c:${m.category.color}">
         <div class="ctl-top">
           <span class="ctl-badge" style="--c:${team?.color ?? '#fff'}">${esc(team?.name ?? '')}</span>
           <span class="ctl-timer" data-timer></span>
         </div>
         <div class="ctl-prompt">${esc(m.prompt)}</div>
         <div class="ctl-answers">${m.choices
           .map(
             (c, i) =>
               `<button class="ctl-ans" data-i="${i}"><span class="letter">${LETTERS[i]}</span><span class="txt">${esc(c)}</span><span class="voters"></span></button>`,
           )
           .join('')}</div>
         ${m.hintsLeft > 0 ? `<button class="hint-btn" data-hint>💡 50/50 <span>${m.hintsLeft} left</span></button>` : ''}
         <p class="ctl-sub" data-note>${m.teamSize > 1 ? 'Vote with your team. The most popular answer counts.' : 'Tap your answer.'}</p>
       </div>`,
      'ctl-screen',
    );
    haptics.tap();
    sound.whoosh();
    el.querySelectorAll<HTMLButtonElement>('.ctl-ans').forEach((b) =>
      b.addEventListener('click', () => {
        const i = Number(b.dataset.i);
        if (b.disabled) return;
        sound.lockIn();
        haptics.heavy();
        el.querySelectorAll('.ctl-ans').forEach((x) => x.classList.toggle('mine', x === b));
        this.client.send({ t: 'vote', qid: m.qid, choice: i });
      }),
    );
    if (m.hidden.length) this.applyHint(m.hidden, m.hintsLeft);
    el.querySelector('[data-hint]')?.addEventListener('click', (e) => {
      (e.currentTarget as HTMLButtonElement).disabled = true;
      this.client.send({ t: 'hint', qid: m.qid });
    });

    // Local countdown, just for show; the host decides when time is up.
    const timer = el.querySelector<HTMLElement>('[data-timer]')!;
    const end = performance.now() + m.durationMs;
    const qid = m.qid;
    const tick = () => {
      if (this.qid !== qid || !timer.isConnected) return;
      const left = Math.max(0, Math.ceil((end - performance.now()) / 1000));
      timer.textContent = `${left}s`;
      timer.classList.toggle('danger', left <= 5);
      if (left > 0) requestAnimationFrame(tick);
      else el.querySelectorAll<HTMLButtonElement>('.ctl-ans').forEach((b) => (b.disabled = true));
    };
    tick();
  }

  private applyHint(hidden: number[], hintsLeft: number): void {
    sound.hint();
    for (const i of hidden) {
      const b = document.querySelector<HTMLButtonElement>(`.ctl-ans[data-i="${i}"]`);
      if (b) {
        b.disabled = true;
        b.classList.add('gone');
      }
    }
    const h = document.querySelector<HTMLButtonElement>('[data-hint]');
    if (h) {
      h.disabled = true;
      h.querySelector('span')!.textContent = `${hintsLeft} left`;
    }
  }

  private showVotes(votes: { playerId: string; name: string; choice: number }[], decided: boolean): void {
    document.querySelectorAll<HTMLElement>('.ctl-ans').forEach((b) => {
      const i = Number(b.dataset.i);
      b.querySelector('.voters')!.innerHTML = votes
        .filter((v) => v.choice === i)
        .map((v) => `<i>${esc(v.playerId === this.playerId ? 'You' : v.name)}</i>`)
        .join('');
    });
    const note = document.querySelector('[data-note]');
    if (note && decided) note.textContent = 'Locked in! You can still change your vote until time runs out.';
  }

  private reveal(m: Extract<HostMsg, { t: 'reveal' }>): void {
    const team = this.myTeam;
    if (m.correct) {
      sound.correct();
      haptics.success();
    } else {
      sound.wrong();
      haptics.error();
    }
    mount(
      `<div class="ctl ctl-reveal ${m.correct ? 'good' : 'bad'}">
         <div class="ctl-big">${m.correct ? 'CORRECT!' : m.chosen === null ? "TIME'S UP" : 'WRONG'}</div>
         ${m.correct ? `<div class="v-points">+${m.points.toLocaleString()}</div>` : `<p class="ctl-sub">It was <b>${esc(m.answerText)}</b></p>`}
         <div class="ctl-badge" style="--c:${team?.color ?? '#fff'}">${esc(team?.name ?? '')} · ${(team?.score ?? 0).toLocaleString()} · ${ordinal(m.rank)} place</div>
       </div>`,
      'ctl-screen',
    );
  }

  private final(teams: PublicTeam[]): void {
    const sorted = teams.slice().sort((a, b) => b.score - a.score);
    const rank = sorted.findIndex((t) => t.id === this.teamId) + 1;
    if (rank === 1) sound.fanfare();
    mount(
      `<div class="ctl">
         <div class="ctl-big">${rank === 1 ? 'YOU WIN! 🏆' : `${ordinal(rank)} place`}</div>
         <div class="ctl-standings">${sorted
           .map(
             (t, i) => `<div class="ctl-row ${t.id === this.teamId ? 'me' : ''}" style="--c:${t.color}"><span>${i + 1}. ${esc(t.name)}</span><b>${t.score.toLocaleString()}</b></div>`,
           )
           .join('')}</div>
         <p class="ctl-sub">Stay on this screen for a rematch.</p>
       </div>`,
      'ctl-screen',
    );
    this.qid = -1;
    this.inGame = false;
  }
}

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] ?? s[v] ?? s[0]}`;
}
