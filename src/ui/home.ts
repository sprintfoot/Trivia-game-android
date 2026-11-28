import { haptics } from '../audio/haptics';
import { sound } from '../audio/sound';
import { voice } from '../audio/voice';

/**
 * The Home button: a small 🏠 in the corner of every screen except the title.
 * Mid-game it asks first, then ends the game (closing a party room or leaving one) and reloads to the title.
 * The phone's Back button, Android TV remotes and the Escape key do the same.
 */

type Mode = 'hidden' | 'free' | 'confirm';

interface HomeState {
  mode: Mode;
  /** The question asked before quitting, when mode is 'confirm'. */
  title?: string;
  detail?: string;
  /** Runs just before going home, e.g. telling the phones the room is closing. */
  cleanup?: () => void;
}

let state: HomeState = { mode: 'hidden' };
let btn: HTMLButtonElement | null = null;
let dialog: HTMLElement | null = null;
let leaving = false;
let trapped = false;

export function initHome(): void {
  btn = document.createElement('button');
  btn.className = 'home-btn';
  btn.setAttribute('aria-label', 'Home');
  btn.innerHTML = '<span aria-hidden="true">🏠</span>';
  btn.hidden = true;
  btn.addEventListener('click', () => {
    sound.click();
    haptics.tap();
    requestHome();
  });
  document.body.appendChild(btn);

  // Back button (phones, Android TV remotes) and Escape act like the Home button.
  window.addEventListener('popstate', () => {
    trapped = false;
    if (state.mode === 'hidden' || leaving) return;
    trapBack();
    requestHome();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || state.mode === 'hidden') return;
    if (document.querySelector('.modal:not(.home-confirm)')) return; // let other dialogs close first
    e.preventDefault();
    if (dialog) closeDialog();
    else requestHome();
  });
}

/** Called by each screen: where the Home button shows and whether it asks first. */
export function setHome(next: HomeState): void {
  state = next;
  if (btn) btn.hidden = next.mode === 'hidden';
  if (next.mode === 'hidden') closeDialog();
  else trapBack();
}

/** Keeps one history entry above the title so Back lands on us instead of leaving the app. */
function trapBack(): void {
  if (trapped) return;
  history.pushState({ trivia: 'game' }, '');
  trapped = true;
}

/** Same as tapping 🏠: asks first when the screen says to, then goes back to the start. */
export function requestHome(): void {
  if (state.mode === 'hidden' || leaving) return;
  if (state.mode === 'free') goHome();
  else openDialog();
}

function openDialog(): void {
  if (dialog) return;
  dialog = document.createElement('div');
  dialog.className = 'modal home-confirm';
  dialog.innerHTML = `<div class="sheet">
      <div class="home-ico">🏠</div>
      <h2>${state.title ?? 'Quit to the home screen?'}</h2>
      <p class="hint">${state.detail ?? 'This game will end.'}</p>
      <div class="home-actions">
        <button class="btn ghost" data-stay data-focus>KEEP PLAYING</button>
        <button class="btn primary" data-quit>QUIT</button>
      </div>
    </div>`;
  document.body.appendChild(dialog);
  requestAnimationFrame(() => dialog?.querySelector<HTMLElement>('[data-focus]')?.focus());
  dialog.querySelector('[data-stay]')!.addEventListener('click', () => {
    sound.click();
    closeDialog();
  });
  dialog.querySelector('[data-quit]')!.addEventListener('click', () => {
    sound.click();
    haptics.tap();
    goHome();
  });
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) closeDialog();
  });
}

function closeDialog(): void {
  dialog?.remove();
  dialog = null;
}

/** The page URL for the title screen: the same address without a room code. */
export function homeUrl(href: string): string {
  const u = new URL(href);
  u.searchParams.delete('join');
  u.hash = '';
  return u.toString();
}

function goHome(): void {
  if (leaving) return;
  leaving = true;
  try {
    state.cleanup?.();
  } catch {
    // Going home matters more than a clean goodbye.
  }
  voice.stop();
  sound.setMusic('off');
  closeDialog();
  document.body.classList.add('going-home');
  // A fresh start is the surest way to stop every timer, round and connection of the game in progress.
  setTimeout(() => location.replace(homeUrl(location.href)), 420);
}
