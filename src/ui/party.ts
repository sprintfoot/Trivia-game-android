import QRCode from 'qrcode';
import type { Category } from '../game/categories';
import type { AnswerResult, LiveQuestion, TeamScore } from '../game/session';
import type { PartyHost } from '../net/host';
import { joinUrl } from '../net/protocol';
import { sound } from '../audio/sound';
import { countUp, esc, mount, press, revealTyped, typeAnswerHtml, wait } from './ui';
import { pictureHtml, startReveal } from './picture';
import { avatarHtml, crowdHtml, markVoted, reactCrowd } from './avatarFx';
import type { PublicTeam } from '../net/protocol';

// ---------------- Lobby ----------------

/** The TV's lobby: room code, QR code and who's on which team. Resolves when the host taps Start. */
export function showLobby(host: PartyHost, hostName: string, hostAvatar?: string): { started: Promise<'start' | 'back'>; refresh: () => void } {
  const url = joinUrl(host.code);
  const el = mount(
    `<div class="lobby">
       <div class="lobby-join">
         <div class="join-steps">
           <div class="step">1. Open the camera and scan</div>
           <canvas class="qr" data-qr></canvas>
           <div class="step">or go to <b class="url">${esc(url.replace(/^https?:\/\//, '').split('?')[0])}</b></div>
           <div class="step">2. Enter the code</div>
           <div class="room-code">${host.code.split('').map((c) => `<span>${c}</span>`).join('')}</div>
         </div>
       </div>
       <div class="lobby-right">
         <div class="lobby-teams" data-teams></div>
         <button class="btn ghost play-too" data-local>🙋 I'M PLAYING TOO</button>
       </div>
     </div>
     <footer class="foot two">
       <button class="btn ghost" data-back>BACK</button>
       <button class="btn primary" data-start data-focus disabled>START GAME</button>
     </footer>`,
    'lobby-screen',
  );
  void QRCode.toCanvas(el.querySelector('[data-qr]') as HTMLCanvasElement, url, {
    width: 220,
    margin: 1,
    color: { dark: '#07061a', light: '#ffffff' },
  });

  const teamsEl = el.querySelector<HTMLElement>('[data-teams]')!;
  const startBtn = el.querySelector<HTMLButtonElement>('[data-start]')!;
  const localBtn = el.querySelector<HTMLButtonElement>('[data-local]')!;
  press(localBtn, () => {
    if (host.localPlayer) host.removeLocal();
    else host.addLocal(hostName, hostAvatar);
  });
  teamsEl.addEventListener('click', (e) => {
    const card = (e.target as HTMLElement).closest<HTMLElement>('.team-card[data-team]');
    if (card && host.localPlayer && host.mode === 'teams') {
      sound.click();
      host.moveLocal(card.dataset.team!);
    }
  });
  let known = 0;
  const refresh = () => {
    const teams = host.publicTeams();
    const total = teams.reduce((n, t) => n + t.members.length, 0);
    if (total > known) sound.chime();
    known = total;
    teamsEl.innerHTML = teams.length
      ? teams
          .map(
            (t) => `<div class="team-card${host.localPlayer && host.mode === 'teams' ? ' pickable' : ''}" data-team="${t.id}" style="--c:${t.color}">
              <div class="team-name">${esc(t.name)}</div>
              <div class="members">${
                t.members.length
                  ? t.members.map((m) => `<span class="member ${m.online ? '' : 'away'} ${m.id === host.localPlayer?.id ? 'me' : ''}">${avatarHtml(m.avatar, 'happy')}${m.id === host.localPlayer?.id ? '📺 ' : ''}${esc(m.name)}</span>`).join('')
                  : '<span class="empty">Waiting for players…</span>'
              }</div>
            </div>`,
          )
          .join('')
      : '<div class="lobby-empty">Players will appear here as they join.</div>';
    const me = host.localPlayer;
    localBtn.textContent = me ? `✓ ${me.name.toUpperCase()} IS PLAYING · TAP TO STOP` : "🙋 I'M PLAYING TOO";
    localBtn.classList.toggle('on', !!me);
    const hintEl = el.querySelector('.pick-hint');
    if (me && host.mode === 'teams') {
      if (!hintEl) localBtn.insertAdjacentHTML('afterend', '<p class="pick-hint hint">Tap a team to move yourself.</p>');
    } else hintEl?.remove();
    startBtn.disabled = total === 0;
    startBtn.textContent = total === 0 ? 'WAITING FOR PLAYERS' : `START GAME · ${total} PLAYER${total === 1 ? '' : 'S'}`;
  };
  refresh();

  const started = new Promise<'start' | 'back'>((resolve) => {
    press(startBtn, () => resolve('start'));
    press(el.querySelector('[data-back]')!, () => resolve('back'));
  });
  return { started, refresh };
}

// ---------------- Question on the TV ----------------

export interface TvQuestionHooks {
  onTension: (t: number) => void;
  onTick: (urgency: number) => void;
  /** Checked every frame: end the question early once every team has answered. */
  allAnswered: () => boolean;
  /** Everyone's avatars, shown along the bottom of the TV. */
  crowd?: readonly PublicTeam[];
  /** Set when the host is playing along: answers on the host screen are sent here. */
  local?: {
    name: string;
    hintsLeft: number;
    onPick: (choice: number) => void;
    onGuess: (text: string) => void;
    onHint: () => number[] | null;
  };
}

const LETTERS = ['A', 'B', 'C', 'D'];
const RING = 2 * Math.PI * 44;

function scoreStrip(teams: readonly TeamScore[]): string {
  return `<div class="score-strip">${teams
    .map(
      (t) =>
        `<div class="ss-team" data-team="${t.id}" style="--c:${t.color}"><span class="ss-name">${esc(t.name)}</span><span class="ss-score">${t.score.toLocaleString()}</span><span class="ss-lock">✓</span></div>`,
    )
    .join('')}</div>`;
}

/** Shows the question big on the TV while phones vote. Resolves when time is up or everyone has answered. */
export function tvQuestion(
  q: LiveQuestion,
  cat: Category,
  timeLimitMs: number,
  teams: readonly TeamScore[],
  info: { number: number; total: number; multiplier: number },
  hooks: TvQuestionHooks,
): { done: Promise<void>; setLocked: (teamId: string, locked: boolean) => void; hide: (idx: number[]) => void; voted: (playerId: string) => void } {
  const local = hooks.local;
  const tag = local ? 'button' : 'div';
  const el = mount(
    `<header class="hud tv-hud">
       ${scoreStrip(teams)}
       <div class="hud-mid">Q${info.number}/${info.total}${info.multiplier > 1 ? ' <span class="x2">×2</span>' : ''}</div>
     </header>
     <div class="q-area tv" style="--c:${cat.color}">
       <div class="timer"><svg viewBox="0 0 100 100"><circle class="track" cx="50" cy="50" r="44"/>
         <circle class="prog" cx="50" cy="50" r="44" stroke-dasharray="${RING}" stroke-dashoffset="0"/></svg>
         <span class="secs" data-secs>${Math.ceil(timeLimitMs / 1000)}</span></div>
       <div class="q-card ${q.picture ? 'has-pic' : ''}"><div class="q-cat">${cat.icon} ${esc(cat.name)}</div><div class="q-text">${esc(q.prompt)}</div>${q.picture ? pictureHtml(q.picture) : ''}</div>
       ${
         q.accept
           ? local
             ? typeAnswerHtml(`${local.name}, type here`)
             : typeAnswerHtml().replace(/<form[\s\S]*<\/form>/, '<p class="tv-type-note">✏️ Type your answer on your phone!</p>')
           : `<div class="answers">${q.choices
               .map(
                 (c, i) =>
                   `<${tag} class="ans" data-i="${i}" style="--d:${i * 70}ms"${local && i === 0 ? ' data-focus' : ''}><span class="letter">${LETTERS[i]}</span><span class="txt">${esc(c)}</span><span class="badges"></span></${tag}>`,
               )
               .join('')}</div>`
       }
       ${
         local
           ? `<div class="tv-local"><span class="tv-hint">${esc(local.name)}, tap your answer!</span>${
               local.hintsLeft > 0 ? `<button class="hint-btn" data-hint>💡 50/50 <span>${local.hintsLeft} left</span></button>` : ''
             }</div>`
           : '<p class="tv-hint">Answer on your phone!</p>'
       }
     </div>
     ${hooks.crowd ? crowdHtml(hooks.crowd) : ''}`,
    'question party-q',
  );
  sound.whoosh();
  const pic = q.picture ? startReveal(el, q.picture, timeLimitMs) : null;
  const prog = el.querySelector<SVGCircleElement>('.prog')!;
  const secs = el.querySelector<HTMLElement>('[data-secs]')!;
  const timerEl = el.querySelector<HTMLElement>('.timer')!;

  let closed = false;
  const hide = (idx: number[]) => {
    for (const i of idx) {
      const b = el.querySelector<HTMLElement>(`.ans[data-i="${i}"]`);
      b?.classList.add('gone');
      if (b instanceof HTMLButtonElement) b.disabled = true;
    }
  };
  let onKey: ((e: KeyboardEvent) => void) | null = null;
  if (local) {
    const pick = (i: number) => {
      const b = el.querySelector<HTMLButtonElement>(`.ans[data-i="${i}"]`);
      if (closed || !b || b.disabled) return;
      el.querySelectorAll('.ans.picked').forEach((x) => x.classList.remove('picked'));
      b.classList.add('picked');
      sound.click();
      local.onPick(i);
    };
    el.querySelectorAll<HTMLButtonElement>('button.ans').forEach((b) => b.addEventListener('click', () => pick(Number(b.dataset.i))));
    const form = el.querySelector<HTMLFormElement>('.type-form');
    form?.addEventListener('submit', (e) => {
      e.preventDefault();
      const input = form.querySelector('input')!;
      if (closed || !input.value.trim()) return;
      sound.lockIn();
      local.onGuess(input.value.trim());
      el.querySelector('[data-typed]')!.textContent = `Your answer: ${input.value.trim()}`;
      input.value = '';
    });
    const hintBtn = el.querySelector<HTMLButtonElement>('[data-hint]');
    const hint = () => {
      if (closed || !hintBtn || hintBtn.disabled) return;
      const hidden = local.onHint();
      hintBtn.disabled = true;
      if (hidden) {
        sound.hint();
        hide(hidden);
      }
    };
    hintBtn?.addEventListener('click', hint);
    onKey = (e: KeyboardEvent) => {
      if (q.accept) return;
      const k = e.key.toLowerCase();
      const idx = '1234'.indexOf(k) >= 0 ? '1234'.indexOf(k) : 'abcd'.indexOf(k);
      if (idx >= 0 && idx < q.choices.length) pick(idx);
      else if (k === 'h') hint();
    };
    window.addEventListener('keydown', onKey);
  }

  const setLocked = (teamId: string, locked: boolean) => {
    const chip = el.querySelector(`[data-team="${teamId}"]`);
    if (chip && locked && !chip.classList.contains('locked')) sound.lockIn();
    chip?.classList.toggle('locked', locked);
  };

  const done = new Promise<void>((resolve) => {
    const start = performance.now() + 350;
    let lastSec = Math.ceil(timeLimitMs / 1000);
    const loop = (now: number) => {
      const left = Math.max(0, timeLimitMs - Math.max(0, now - start));
      const frac = left / timeLimitMs;
      prog.style.strokeDashoffset = String(RING * (1 - frac));
      const s = Math.ceil(left / 1000);
      secs.textContent = String(s);
      timerEl.classList.toggle('danger', left <= 5000);
      hooks.onTension(1 - frac);
      if (s !== lastSec && s <= 5 && s > 0) {
        hooks.onTick(Math.max(0, 1 - left / 5000));
        timerEl.classList.remove('pulse');
        void timerEl.offsetWidth;
        timerEl.classList.add('pulse');
      }
      lastSec = s;
      if (left <= 0 || (now > start && hooks.allAnswered())) {
        hooks.onTension(0);
        pic?.finish();
        closed = true;
        if (onKey) window.removeEventListener('keydown', onKey);
        el.querySelectorAll<HTMLButtonElement | HTMLInputElement>('button.ans, [data-hint], .type-form input, .type-form button').forEach((b) => (b.disabled = true));
        resolve();
        return;
      }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  });
  return { done, setLocked, hide, voted: (playerId: string) => markVoted(el, playerId) };
}

/** Reveals the answer on the TV, with each team's pick and points. */
export async function tvReveal(results: AnswerResult[], teams: readonly TeamScore[], typed?: Map<string, string | undefined>): Promise<void> {
  const el = document.querySelector('.party-q') as HTMLElement;
  const q = results[0].question;
  const buttons = el.querySelectorAll<HTMLElement>('.ans');
  buttons[q.answer].classList.add('correct');
  if (typed) {
    revealTyped(el, q.choices[q.answer]);
    el.querySelector('.tv-type-note')?.remove();
    const list = document.createElement('div');
    list.className = 'typed-list';
    list.innerHTML = results
      .map((r) => {
        const t = teams.find((x) => x.id === r.teamId)!;
        const text = typed.get(r.teamId);
        return `<span class="badge ${r.correct ? '' : 'wrong'}" style="--c:${t.color}">${esc(t.name)}: ${text ? `“${esc(text)}”` : '⏱'}</span>`;
      })
      .join('');
    el.querySelector('.type-answers')?.appendChild(list);
  }
  buttons.forEach((b, i) => {
    if (i !== q.answer) b.classList.add('dim');
  });
  for (const r of results) {
    if (r.chosen === null || typed) continue;
    const t = teams.find((x) => x.id === r.teamId)!;
    const badge = document.createElement('span');
    badge.className = 'badge';
    badge.style.setProperty('--c', t.color);
    badge.textContent = t.name;
    buttons[r.chosen].querySelector('.badges')!.appendChild(badge);
    if (!r.correct) buttons[r.chosen].classList.replace('dim', 'wrong-soft');
  }
  el.querySelector('.tv-hint')?.remove();
  el.querySelector('.tv-local')?.remove();

  reactCrowd(el, new Map(results.map((r) => [r.teamId, r.correct])));
  const winners = results.filter((r) => r.correct);
  const pop = document.createElement('div');
  pop.className = `verdict ${winners.length ? 'good' : 'bad'}`;
  pop.innerHTML = `<div class="v-label">${winners.length === results.length ? 'EVERYONE GOT IT!' : winners.length ? 'CORRECT!' : 'NOBODY GOT IT!'}</div>
    <div class="v-parts">${results
      .map((r) => {
        const t = teams.find((x) => x.id === r.teamId)!;
        return `<span style="border-color:${t.color}">${esc(t.name)} ${r.correct ? `+${r.score.total.toLocaleString()}` : r.chosen === null ? '⏱' : '✗'}</span>`;
      })
      .join('')}</div>`;
  el.appendChild(pop);
  await wait(3200);
}

/** Leaderboard between questions, with animated score bars. */
export async function tvScores(before: Map<string, number>, standings: readonly TeamScore[], title: string): Promise<void> {
  const max = Math.max(1, ...standings.map((t) => t.score));
  const el = mount(
    `<div class="board">
       <h2 class="board-title">${esc(title)}</h2>
       ${standings
         .map(
           (t, i) => `<div class="board-row" style="--c:${t.color}; --d:${i * 90}ms">
             <span class="rank">${i + 1}</span>
             <span class="bname">${esc(t.name)}</span>
             <span class="score-bar"><i style="width:${((before.get(t.id) ?? 0) / max) * 100}%" data-w="${(t.score / max) * 100}%"></i></span>
             <span class="bscore" data-from="${before.get(t.id) ?? 0}" data-to="${t.score}">${(before.get(t.id) ?? 0).toLocaleString()}</span>
           </div>`,
         )
         .join('')}
     </div>`,
    'board-screen',
  );
  await wait(300);
  el.querySelectorAll<HTMLElement>('.score-bar i').forEach((b) => (b.style.width = b.dataset.w!));
  el.querySelectorAll<HTMLElement>('.bscore').forEach((s, i) =>
    void countUp(s, Number(s.dataset.from), Number(s.dataset.to), 900, i === 0 ? () => sound.points() : undefined),
  );
  await wait(2800);
}

/** Final podium. */
export function tvFinal(standings: readonly TeamScore[], soloPlayers = false): Promise<'again' | 'setup'> {
  const [first] = standings;
  const tie = standings.length > 1 && standings[1].score === first.score;
  const el = mount(
    `<div class="results">
       <div class="r-title">${tie ? "IT'S A TIE!" : `${esc(first.name)} ${soloPlayers ? 'WINS' : 'WIN'}!`}</div>
       <div class="podium">${standings
         .map(
           (t, i) => `<div class="pod" style="--c:${t.color}; --d:${(standings.length - i) * 250}ms">
             <div class="pod-medal">${['🥇', '🥈', '🥉'][i] ?? `#${i + 1}`}</div>
             <div class="pod-name">${esc(t.name)}</div>
             <div class="pod-score">${t.score.toLocaleString()}</div>
             <div class="pod-stats">${t.correctCount} right · best streak ${t.bestStreak}</div>
           </div>`,
         )
         .join('')}</div>
     </div>
     <footer class="foot two">
       <button class="btn ghost" data-setup>NEW GAME</button>
       <button class="btn primary" data-again data-focus>REMATCH</button>
     </footer>`,
    'results-screen',
  );
  return new Promise((resolve) => {
    press(el.querySelector('[data-again]')!, () => resolve('again'));
    press(el.querySelector('[data-setup]')!, () => resolve('setup'));
  });
}

export function showMessage(title: string, text: string): Promise<void> {
  const el = mount(
    `<div class="results"><div class="r-title">${esc(title)}</div><p class="hint">${esc(text)}</p></div>
     <footer class="foot"><button class="btn primary" data-ok data-focus>OK</button></footer>`,
    'results-screen',
  );
  return new Promise((resolve) => press(el.querySelector('[data-ok]')!, () => resolve()));
}

export function showMessageNoButton(text: string): void {
  mount(`<div class="results"><div class="r-title">${esc(text)}</div></div>`, 'results-screen');
}
