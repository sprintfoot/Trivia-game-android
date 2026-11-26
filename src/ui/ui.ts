import { CATEGORIES, DEFAULT_CATEGORIES, type Category, type CategoryId } from '../game/categories';
import { AGE_GROUPS, type AgeGroup, type AnswerResult, type GameConfig, type LiveQuestion } from '../game/session';
import type { Settings } from '../settings';
import { sound } from '../audio/sound';
import { pictureHtml, startReveal } from './picture';
import { haptics } from '../audio/haptics';

const root = document.getElementById('ui')!;
const flashEl = document.getElementById('flash')!;

export const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

export const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export function mount(html: string, cls = ''): HTMLElement {
  root.innerHTML = `<section class="screen ${cls}">${html}</section>`;
  const el = root.firstElementChild as HTMLElement;
  // TV remotes and keyboards: put focus on the screen's main action.
  requestAnimationFrame(() => el.querySelector<HTMLElement>('[data-focus]')?.focus({ preventScroll: true }));
  return el;
}

export const canFullscreen = () => !!document.documentElement.requestFullscreen && !document.fullscreenElement;

export function toggleFullscreen(): void {
  if (document.fullscreenElement) void document.exitFullscreen();
  else void document.documentElement.requestFullscreen?.().catch(() => undefined);
}

export function press(el: Element, fn: () => void): void {
  el.addEventListener('click', () => {
    sound.click();
    haptics.tap();
    fn();
  });
}

export function flash(color: string): void {
  flashEl.style.background = color;
  flashEl.classList.remove('on');
  void flashEl.offsetWidth;
  flashEl.classList.add('on');
}

/** Counts a number up inside an element. */
export function countUp(el: HTMLElement, from: number, to: number, ms: number, onStep?: () => void): Promise<void> {
  return new Promise((resolve) => {
    const start = performance.now();
    let lastStep = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / ms);
      const v = Math.round(from + (to - from) * (1 - Math.pow(1 - p, 3)));
      el.textContent = v.toLocaleString();
      if (onStep && now - lastStep > 70 && p < 1) {
        lastStep = now;
        onStep();
      }
      if (p < 1) requestAnimationFrame(tick);
      else resolve();
    };
    requestAnimationFrame(tick);
  });
}

// ---------------- Title ----------------

export type TitleChoice = 'solo' | 'host' | 'join';

export function showTitle(onSettings: () => void): Promise<TitleChoice> {
  const el = mount(
    `<div class="title-wrap">
       <div class="logo"><span class="l1">TRIVIA</span><span class="l2">PARTY</span></div>
       <p class="tagline">Spin. Answer. Brag.</p>
       <div class="title-actions">
         <button class="btn primary big" data-choice="host" data-focus>HOST A PARTY</button>
         <div class="title-row">
           <button class="btn ghost" data-choice="join">JOIN A GAME</button>
           <button class="btn ghost" data-choice="solo">PLAY SOLO</button>
         </div>
       </div>
     </div>
     <div class="corner-btns">
       ${canFullscreen() ? '<button class="icon-btn" aria-label="Full screen" data-fs>⛶</button>' : ''}
       <button class="icon-btn" aria-label="Settings" data-settings>⚙️</button>
     </div>`,
    'title',
  );
  el.querySelector('[data-settings]')!.addEventListener('click', (e) => {
    e.stopPropagation();
    onSettings();
  });
  el.querySelector('[data-fs]')?.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleFullscreen();
    (e.currentTarget as HTMLElement).remove();
  });
  return new Promise((resolve) => {
    el.querySelectorAll<HTMLElement>('[data-choice]').forEach((b) =>
      b.addEventListener('click', () => {
        const choice = b.dataset.choice as TitleChoice;
        // Going full screen needs a tap; the TV/host screen is where it matters.
        if (choice !== 'join' && canFullscreen() && window.matchMedia('(pointer: coarse)').matches) toggleFullscreen();
        resolve(choice);
      }),
    );
  });
}

// ---------------- Setup ----------------

const ROUND_OPTIONS = [2, 3, 4, 5, 6];
const QPR_OPTIONS = [3, 5, 7, 10];
const TIME_OPTIONS = [10, 15, 20, 30];
const HINT_OPTIONS = [0, 1, 3, 5];

function segmented(name: string, options: (number | string)[], value: number | string, label: (o: number | string) => string = String): string {
  return `<div class="seg" data-seg="${name}">${options
    .map((o) => `<button class="seg-opt ${o === value ? 'on' : ''}" data-val="${o}">${label(o)}</button>`)
    .join('')}</div>`;
}

export interface PartyOptions {
  teamMode: 'teams' | 'players';
  teamCount: number;
}

const TEAM_OPTIONS = [2, 3, 4, 6, 0];

export function showSetup(settings: Settings, onSettings: () => void, party = false): Promise<GameConfig & { party: PartyOptions }> {
  const known = new Set(CATEGORIES.map((c) => c.id));
  const saved = settings.lastCategories?.filter((id) => known.has(id));
  const chosen = new Set<CategoryId>(saved?.length ? saved : DEFAULT_CATEGORIES);
  const vals: { rounds: number; qpr: number; time: number; hints: number; age: AgeGroup; teams: number } = {
    teams: settings.teamMode === 'players' ? 0 : settings.teamCount,
    rounds: settings.rounds,
    qpr: settings.questionsPerRound,
    time: settings.timeLimitSec,
    hints: settings.hints,
    age: settings.ageGroup,
  };
  const ageLabel = (o: number | string) => {
    const g = AGE_GROUPS.find((a) => a.id === o)!;
    return `${g.label}<small>${g.detail}</small>`;
  };

  const el = mount(
    `<header class="bar"><h2>Game setup</h2><button class="icon-btn" aria-label="Settings" data-settings>⚙️</button></header>
     <div class="scroll">
       ${party ? `<h3>Play as</h3>${segmented('teams', TEAM_OPTIONS, vals.teams, (o) => (o === 0 ? 'Solo players' : `${o} teams`))}` : ''}
       <h3>Categories <span class="count" data-count></span><button class="link" data-all>All</button></h3>
       <div class="chips">${CATEGORIES.map(
         (c) =>
           `<button class="chip ${chosen.has(c.id) ? 'on' : ''}" data-cat="${c.id}" style="--c:${c.color}">
              <span class="ico">${c.icon}</span>${esc(c.name)}</button>`,
       ).join('')}</div>
       <h3>Most players are</h3>${segmented('age', AGE_GROUPS.map((a) => a.id), vals.age, ageLabel)}
       <h3>Rounds</h3>${segmented('rounds', ROUND_OPTIONS, vals.rounds)}
       <h3>Questions per round</h3>${segmented('qpr', QPR_OPTIONS, vals.qpr)}
       <h3>Answer timer</h3>${segmented('time', TIME_OPTIONS, vals.time, (o) => `${o}s`)}
       <h3>50/50 hints per game</h3>${segmented('hints', HINT_OPTIONS, vals.hints, (o) => (o === 0 ? 'Off' : String(o)))}
       <p class="hint">A hint removes two wrong answers but halves that question's points. The last round is worth double.</p>
     </div>
     <footer class="foot"><button class="btn primary big" data-start data-focus>${party ? 'OPEN THE LOBBY' : 'START GAME'}</button></footer>`,
    'setup',
  );

  const startBtn = el.querySelector<HTMLButtonElement>('[data-start]')!;
  const refresh = () => {
    el.querySelectorAll<HTMLElement>('[data-cat]').forEach((b) => b.classList.toggle('on', chosen.has(b.dataset.cat as CategoryId)));
    startBtn.disabled = chosen.size === 0;
    el.querySelector('[data-count]')!.textContent = `${chosen.size} of ${CATEGORIES.length}`;
  };

  el.querySelector('[data-settings]')!.addEventListener('click', onSettings);
  el.querySelectorAll<HTMLElement>('[data-cat]').forEach((b) =>
    b.addEventListener('click', () => {
      const id = b.dataset.cat as CategoryId;
      if (chosen.has(id)) chosen.delete(id);
      else chosen.add(id);
      sound.toggle(chosen.has(id));
      haptics.tap();
      refresh();
    }),
  );
  press(el.querySelector('[data-all]')!, () => {
    const all = chosen.size === CATEGORIES.length;
    chosen.clear();
    if (!all) CATEGORIES.forEach((c) => chosen.add(c.id));
    refresh();
  });
  el.querySelectorAll<HTMLElement>('[data-seg]').forEach((seg) => {
    seg.querySelectorAll<HTMLElement>('.seg-opt').forEach((opt) =>
      press(opt, () => {
        seg.querySelectorAll('.seg-opt').forEach((o) => o.classList.remove('on'));
        opt.classList.add('on');
        const key = seg.dataset.seg as keyof typeof vals;
        if (key === 'age') vals.age = opt.dataset.val as AgeGroup;
        else vals[key] = Number(opt.dataset.val);
      }),
    );
  });
  refresh();

  return new Promise((resolve) => {
    press(startBtn, () => {
      // Keep wheel order consistent with the category list.
      const categories = CATEGORIES.filter((c) => chosen.has(c.id)).map((c) => c.id);
      settings.lastCategories = categories;
      settings.rounds = vals.rounds;
      settings.questionsPerRound = vals.qpr;
      settings.timeLimitSec = vals.time;
      settings.hints = vals.hints;
      settings.ageGroup = vals.age;
      if (party) {
        settings.teamMode = vals.teams === 0 ? 'players' : 'teams';
        if (vals.teams) settings.teamCount = vals.teams;
      }
      resolve({
        party: { teamMode: vals.teams === 0 ? 'players' : 'teams', teamCount: vals.teams || 2 },
        categories,
        rounds: vals.rounds,
        questionsPerRound: vals.qpr,
        timeLimitMs: vals.time * 1000,
        ageGroup: vals.age,
        hints: vals.hints,
      });
    });
  });
}

// ---------------- Round intro & wheel ----------------

export function showRoundBanner(round: number, total: number, final: boolean): void {
  mount(
    `<div class="round-banner ${final ? 'final' : ''}">
       <div class="round-label">${final ? 'FINAL ROUND' : `ROUND ${round}`}</div>
       <div class="round-sub">${final ? 'Double points!' : `of ${total}`}</div>
     </div>
     <p class="spin-hint">Spinning for a category…</p>`,
    'wheel-screen',
  );
}

export async function showCategoryReveal(cat: Category): Promise<void> {
  mount(
    `<div class="cat-reveal" style="--c:${cat.color}">
       <div class="cat-ico">${cat.icon}</div>
       <div class="cat-name">${esc(cat.name)}</div>
     </div>`,
    'wheel-screen',
  );
  flash(cat.color);
  await wait(1500);
}

// ---------------- Question ----------------

export interface Hud {
  score: number;
  streak: number;
  round: number;
  totalRounds: number;
  questionNumber: number;
  totalQuestions: number;
  multiplier: number;
}

export interface AnswerPick {
  chosen: number | null;
  timeLeftMs: number;
}

const LETTERS = ['A', 'B', 'C', 'D'];
const RING = 2 * Math.PI * 44;

function hudHtml(h: Hud): string {
  return `<header class="hud">
    <div class="hud-score"><span class="lbl">SCORE</span><span class="val" data-score>${h.score.toLocaleString()}</span></div>
    <div class="hud-mid">Q${h.questionNumber}/${h.totalQuestions}${h.multiplier > 1 ? ' <span class="x2">×2</span>' : ''}</div>
    <div class="hud-streak ${h.streak >= 2 ? 'hot' : ''}" data-streak>🔥 ${h.streak}</div>
  </header>`;
}

export interface QuestionHooks {
  onTension: (t: number) => void;
  onTick: (urgency: number) => void;
  /** Hints left, or 0 to hide the button. useHint returns the answer indices to hide. */
  hintsLeft: number;
  useHint: () => number[];
}

export function askQuestion(q: LiveQuestion, cat: Category, timeLimitMs: number, hud: Hud, hooks: QuestionHooks): Promise<AnswerPick> {
  const el = mount(
    `${hudHtml(hud)}
     <div class="q-area" style="--c:${cat.color}">
       <div class="timer"><svg viewBox="0 0 100 100"><circle class="track" cx="50" cy="50" r="44"/>
         <circle class="prog" cx="50" cy="50" r="44" stroke-dasharray="${RING}" stroke-dashoffset="0"/></svg>
         <span class="secs" data-secs>${Math.ceil(timeLimitMs / 1000)}</span></div>
       <div class="q-card ${q.picture ? 'has-pic' : ''}"><div class="q-cat">${cat.icon} ${esc(cat.name)}</div><div class="q-text">${esc(q.prompt)}</div>${q.picture ? pictureHtml(q.picture) : ''}</div>
       ${hooks.hintsLeft > 0 ? `<button class="hint-btn" data-hint>💡 50/50 <span>${hooks.hintsLeft} left</span></button>` : ''}
       <div class="answers">${q.choices
         .map(
           (c, i) =>
             `<button class="ans" data-i="${i}" ${i === 0 ? 'data-focus' : ''} style="--d:${i * 70}ms"><span class="letter">${LETTERS[i]}</span><span class="txt">${esc(c)}</span></button>`,
         )
         .join('')}</div>
     </div>`,
    'question',
  );
  const prog = el.querySelector<SVGCircleElement>('.prog')!;
  const secs = el.querySelector<HTMLElement>('[data-secs]')!;
  const timerEl = el.querySelector<HTMLElement>('.timer')!;
  sound.whoosh();
  const pic = q.picture ? startReveal(el, q.picture, timeLimitMs) : null;

  return new Promise((resolve) => {
    const start = performance.now() + 350; // let the card animate in before the clock starts
    let done = false;
    let lastSec = Math.ceil(timeLimitMs / 1000);

    const finish = (chosen: number | null) => {
      if (done) return;
      done = true;
      window.removeEventListener('keydown', onKey);
      pic?.finish();
      hintBtn?.setAttribute('disabled', '');
      const left = Math.max(0, timeLimitMs - (performance.now() - start));
      el.querySelectorAll<HTMLButtonElement>('.ans').forEach((b) => (b.disabled = true));
      if (chosen !== null) el.querySelector(`[data-i="${chosen}"]`)!.classList.add('picked');
      hooks.onTension(0);
      resolve({ chosen, timeLeftMs: chosen === null ? 0 : left });
    };

    const pick = (i: number) => {
      const b = el.querySelector<HTMLButtonElement>(`.ans[data-i="${i}"]`);
      if (done || !b || b.disabled) return;
      sound.lockIn();
      haptics.heavy();
      finish(i);
    };
    el.querySelectorAll<HTMLButtonElement>('.ans').forEach((b) => b.addEventListener('click', () => pick(Number(b.dataset.i))));

    const hintBtn = el.querySelector<HTMLButtonElement>('[data-hint]');
    const hint = () => {
      if (done || !hintBtn || hintBtn.disabled) return;
      hintBtn.disabled = true;
      sound.hint();
      haptics.tap();
      for (const i of hooks.useHint()) {
        const b = el.querySelector<HTMLButtonElement>(`.ans[data-i="${i}"]`)!;
        b.disabled = true;
        b.classList.add('gone');
      }
    };
    hintBtn?.addEventListener('click', hint);

    // Keyboard / TV remote: 1-4 or A-D to answer, H for a hint.
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      const idx = '1234'.indexOf(k) >= 0 ? '1234'.indexOf(k) : 'abcd'.indexOf(k);
      if (idx >= 0 && idx < q.choices.length) pick(idx);
      else if (k === 'h') hint();
    };
    window.addEventListener('keydown', onKey);

    const loop = (now: number) => {
      if (done) return;
      const elapsed = Math.max(0, now - start);
      const left = Math.max(0, timeLimitMs - elapsed);
      const frac = left / timeLimitMs;
      prog.style.strokeDashoffset = String(RING * (1 - frac));
      const s = Math.ceil(left / 1000);
      secs.textContent = String(s);
      const urgency = Math.max(0, 1 - left / 5000);
      timerEl.classList.toggle('danger', left <= 5000);
      hooks.onTension(1 - frac);
      if (s !== lastSec && s <= 5 && s > 0) {
        hooks.onTick(urgency);
        timerEl.classList.remove('pulse');
        void timerEl.offsetWidth;
        timerEl.classList.add('pulse');
      }
      lastSec = s;
      if (left <= 0) {
        finish(null);
        return;
      }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  });
}

export async function showReveal(result: AnswerResult, prevScore: number, onPoints: () => void): Promise<void> {
  const el = root.querySelector('.question') as HTMLElement;
  const buttons = el.querySelectorAll<HTMLElement>('.ans');
  buttons[result.question.answer].classList.add('correct');
  if (result.chosen !== null && !result.correct) buttons[result.chosen].classList.add('wrong');
  buttons.forEach((b, i) => {
    if (i !== result.question.answer && i !== result.chosen) b.classList.add('dim');
  });

  const s = result.score;
  const label = result.correct ? 'CORRECT!' : result.chosen === null ? "TIME'S UP" : 'WRONG';
  const parts: string[] = [];
  if (result.correct) {
    parts.push(`<span>Answer +${s.base}</span>`);
    if (s.speed) parts.push(`<span>Speed +${s.speed}</span>`);
    if (s.streak) parts.push(`<span class="hot">Streak +${s.streak}</span>`);
    if (s.multiplier > 1) parts.push(`<span class="x2">×${s.multiplier}</span>`);
    if (s.hinted) parts.push(`<span>Hint ½</span>`);
  }
  const pop = document.createElement('div');
  pop.className = `verdict ${result.correct ? 'good' : 'bad'}`;
  pop.innerHTML = `<div class="v-label">${label}</div>
    ${result.correct ? `<div class="v-points">+${s.total.toLocaleString()}</div><div class="v-parts">${parts.join('')}</div>` : ''}`;
  el.appendChild(pop);

  const streakEl = el.querySelector<HTMLElement>('[data-streak]')!;
  streakEl.textContent = `🔥 ${result.streak}`;
  streakEl.classList.toggle('hot', result.streak >= 2);
  if (result.correct && result.streak >= 3) streakEl.classList.add('bump');

  if (result.correct) {
    await wait(400);
    await countUp(el.querySelector<HTMLElement>('[data-score]')!, prevScore, prevScore + s.total, 700, onPoints);
    await wait(1300);
  } else {
    await wait(2000);
  }
}

// ---------------- Results ----------------

function rankTitle(accuracy: number): string {
  if (accuracy >= 0.95) return 'Trivia Titan';
  if (accuracy >= 0.8) return 'Quiz Whiz';
  if (accuracy >= 0.6) return 'Sharp Mind';
  if (accuracy >= 0.4) return 'Getting Warmer';
  return 'Party Starter';
}

export interface ResultsData {
  score: number;
  correct: number;
  total: number;
  bestStreak: number;
  newBest: boolean;
  previousBest: number;
}

export function showResults(d: ResultsData, onPoints: () => void): Promise<'again' | 'setup'> {
  const acc = d.total ? d.correct / d.total : 0;
  const el = mount(
    `<div class="results">
       <div class="r-title">${rankTitle(acc)}</div>
       ${d.newBest ? '<div class="r-best">NEW PERSONAL BEST!</div>' : ''}
       <div class="r-score" data-final>0</div>
       <div class="r-stats">
         <div><b>${d.correct}/${d.total}</b><span>correct</span></div>
         <div><b>${Math.round(acc * 100)}%</b><span>accuracy</span></div>
         <div><b>${d.bestStreak}</b><span>best streak</span></div>
       </div>
       ${!d.newBest && d.previousBest ? `<p class="hint">Personal best: ${d.previousBest.toLocaleString()}</p>` : ''}
     </div>
     <footer class="foot two">
       <button class="btn ghost" data-setup>CHANGE SETUP</button>
       <button class="btn primary" data-again data-focus>PLAY AGAIN</button>
     </footer>`,
    'results-screen',
  );
  void countUp(el.querySelector<HTMLElement>('[data-final]')!, 0, d.score, 2200, onPoints);
  return new Promise((resolve) => {
    press(el.querySelector('[data-again]')!, () => resolve('again'));
    press(el.querySelector('[data-setup]')!, () => resolve('setup'));
  });
}

// ---------------- Settings ----------------

export function openSettings(settings: Settings, onChange: (s: Settings) => void): void {
  const overlay = document.createElement('div');
  overlay.className = 'modal';
  type Key = 'sound' | 'music' | 'haptics' | 'voice' | 'readQuestions';
  const toggle = (key: Key, label: string) =>
    `<label class="row"><span>${label}</span><input type="checkbox" data-key="${key}" ${settings[key] ? 'checked' : ''}/><i class="sw"></i></label>`;
  overlay.innerHTML = `<div class="sheet">
      <h2>Settings</h2>
      ${toggle('sound', 'Sound effects')}
      ${toggle('music', 'Music')}
      ${toggle('voice', 'Host voice (funny one-liners)')}
      ${toggle('readQuestions', 'Read questions aloud')}
      ${toggle('haptics', 'Vibration')}
      <div class="row col"><span>Graphics</span>
        <div class="seg" data-q>${(['auto', 'high', 'low'] as const)
          .map((q) => `<button class="seg-opt ${settings.quality === q ? 'on' : ''}" data-val="${q}">${q[0].toUpperCase() + q.slice(1)}</button>`)
          .join('')}</div></div>
      <p class="hint">Every sound is synthesised live in the app. The host voice uses your device's built-in speech.</p>
      ${canFullscreen() ? '<button class="btn ghost" data-fs>FULL SCREEN</button>' : ''}
      <button class="btn primary" data-close data-focus>DONE</button>
    </div>`;
  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.querySelector<HTMLElement>('[data-focus]')?.focus());

  overlay.querySelectorAll<HTMLInputElement>('input[data-key]').forEach((inp) =>
    inp.addEventListener('change', () => {
      settings[inp.dataset.key as Key] = inp.checked;
      onChange(settings);
      sound.toggle(inp.checked);
    }),
  );
  overlay.querySelectorAll<HTMLElement>('[data-q] .seg-opt').forEach((b) =>
    press(b, () => {
      overlay.querySelectorAll('[data-q] .seg-opt').forEach((o) => o.classList.remove('on'));
      b.classList.add('on');
      settings.quality = b.dataset.val as Settings['quality'];
      onChange(settings);
    }),
  );
  overlay.querySelector('[data-fs]')?.addEventListener('click', () => {
    toggleFullscreen();
    overlay.remove();
  });
  const close = () => overlay.remove();
  press(overlay.querySelector('[data-close]')!, close);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });
}

