import type { Picture } from '../game/session';
import { sound } from '../audio/sound';

const FLAG_URLS = import.meta.glob<string>('../assets/flags/*.svg', { eager: true, query: '?url', import: 'default' });

function flagUrl(code: string): string {
  return FLAG_URLS[`../assets/flags/${code}.svg`] ?? '';
}

const COLS = 6;
const ROWS = 4;

export function pictureHtml(p: Picture): string {
  switch (p.kind) {
    case 'flag':
      return `<div class="pic pic-flag"><img src="${flagUrl(p.code)}" alt="" draggable="false"/>
        <div class="tiles">${Array.from({ length: COLS * ROWS }, (_, i) => `<i style="--i:${i}"></i>`).join('')}</div></div>`;
    case 'emoji':
      return `<div class="pic pic-emoji">${p.clues.map((c) => `<span>${c}</span>`).join('')}</div>`;
    case 'zoom':
      return `<div class="pic pic-zoom"><span style="transform-origin:${p.x * 100}% ${p.y * 100}%">${p.emoji}</span></div>`;
  }
}

/**
 * Starts uncovering the picture over the question's time. Returns finish(), which shows the whole
 * picture at once (used when the answer is revealed).
 */
export function startReveal(root: HTMLElement, p: Picture, durationMs: number): { finish: () => void } {
  const timers: number[] = [];
  const at = (ms: number, fn: () => void) => timers.push(window.setTimeout(fn, ms));
  // Leave the last part of the timer with the full picture showing.
  const span = durationMs * 0.8;

  if (p.kind === 'flag') {
    const tiles = [...root.querySelectorAll<HTMLElement>('.tiles i')];
    const order = tiles.map((_, i) => i).sort(() => Math.random() - 0.5);
    // A couple of tiles start open so there's something to look at straight away.
    order.forEach((idx, n) => at(n < 2 ? 300 : 300 + (n / order.length) * span, () => {
      tiles[idx].classList.add('off');
      if (n % 3 === 0) sound.tileFlip();
    }));
    return {
      finish: () => {
        timers.forEach(clearTimeout);
        tiles.forEach((t) => t.classList.add('off'));
      },
    };
  }

  if (p.kind === 'emoji') {
    const spans = [...root.querySelectorAll<HTMLElement>('.pic-emoji span')];
    spans.forEach((s, n) => at(300 + (n / spans.length) * span * 0.75, () => {
      s.classList.add('on');
      sound.pop(n);
    }));
    return {
      finish: () => {
        timers.forEach(clearTimeout);
        spans.forEach((s) => s.classList.add('on'));
      },
    };
  }

  const emoji = root.querySelector<HTMLElement>('.pic-zoom span')!;
  emoji.style.transition = 'none';
  emoji.style.transform = 'scale(5)';
  requestAnimationFrame(() =>
    requestAnimationFrame(() => {
      emoji.style.transition = `transform ${span}ms cubic-bezier(0.3, 0, 0.6, 1)`;
      emoji.style.transform = 'scale(1)';
    }),
  );
  return {
    finish: () => {
      emoji.style.transition = 'transform 0.4s ease-out';
      emoji.style.transform = 'scale(1)';
    },
  };
}
