import type { Picture } from '../game/session';
import { sound } from '../audio/sound';
import { TUNES, parseNotes } from '../data/tunes';

const FLAG_URLS = import.meta.glob<string>('../assets/flags/*.svg', { eager: true, query: '?url', import: 'default' });

function flagUrl(code: string): string {
  return FLAG_URLS[`../assets/flags/${code}.svg`] ?? '';
}

const escHtml = (t: string) => t.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

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
    case 'shadow':
      return `<div class="pic pic-shadow"><span>${p.emoji}</span></div>`;
    case 'pixel':
      return `<div class="pic pic-pixel"><canvas width="240" height="240"></canvas></div>`;
    case 'clues':
      return `<ol class="pic pic-clues">${p.clues.map((c, i) => `<li><b>${i + 1}</b><span>${escHtml(c)}</span></li>`).join('')}</ol>`;
    case 'tune':
      return `<div class="pic pic-tune"><div class="vinyl"><b></b></div>
        <div class="eq">${Array.from({ length: 7 }, (_, i) => `<i style="--i:${i}"></i>`).join('')}</div>
        <div class="tune-label">🎧 Listen…</div></div>`;
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

  if (p.kind === 'clues') {
    // One clue at a time, hardest first, so a quick answer on fewer clues scores more.
    const items = [...root.querySelectorAll<HTMLElement>('.pic-clues li')];
    items.forEach((li, n) => at(n === 0 ? 200 : (n / items.length) * span, () => {
      li.classList.add('on');
      sound.pop(n);
    }));
    return {
      finish: () => {
        timers.forEach(clearTimeout);
        items.forEach((li) => li.classList.add('on'));
      },
    };
  }

  if (p.kind === 'tune') return startTune(root, p.id);

  if (p.kind === 'shadow') {
    const span = root.querySelector<HTMLElement>('.pic-shadow span')!;
    // Stays a silhouette for a while, then the color seeps in.
    at(durationMs * 0.35, () => {
      span.style.transition = `filter ${durationMs * 0.4}ms ease-in`;
      span.classList.add('lit');
    });
    return {
      finish: () => {
        timers.forEach(clearTimeout);
        span.style.transition = 'filter 0.4s';
        span.classList.add('lit');
      },
    };
  }

  if (p.kind === 'pixel') {
    const canvas = root.querySelector<HTMLCanvasElement>('.pic-pixel canvas')!;
    const steps = [5, 7, 10, 14, 20, 28, 40, 64, 240];
    const draw = (res: number) => drawPixelated(canvas, p.emoji, res);
    draw(steps[0]);
    steps.forEach((res, n) => n && at((n / (steps.length - 1)) * span, () => {
      draw(res);
      if (n < steps.length - 1) sound.tileFlip();
    }));
    return {
      finish: () => {
        timers.forEach(clearTimeout);
        draw(240);
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

/**
 * Plays the tune a bit at a time: the opening, then a longer stretch, then the whole thing on a
 * loop until the answer is revealed. Background music is held while it plays.
 */
function startTune(root: HTMLElement, id: string): { finish: () => void } {
  const tune = TUNES[id];
  const pic = root.querySelector<HTMLElement>('.pic-tune');
  const label = root.querySelector<HTMLElement>('.tune-label');
  if (!tune || !pic) return { finish: () => {} };
  const notes = parseNotes(tune.notes);
  const cuts = [Math.max(3, Math.round(notes.length * 0.35)), Math.max(5, Math.round(notes.length * 0.65)), notes.length];
  let stage = 0;
  let stop: () => void = () => {};
  let timer = 0;
  let done = false;

  sound.holdMusic(true);
  const play = () => {
    if (done) return;
    const n = cuts[Math.min(stage, cuts.length - 1)];
    if (label) label.textContent = stage === 0 ? '🎧 Listen…' : stage === 1 ? '🎧 A little more…' : '🎧 The whole tune!';
    pic.classList.add('playing');
    stop = sound.playMelody(notes.slice(0, n), tune.bpm, () => {
      pic.classList.remove('playing');
      stage++;
      timer = window.setTimeout(play, 900);
    });
  };
  timer = window.setTimeout(play, 350);

  return {
    finish: () => {
      done = true;
      window.clearTimeout(timer);
      stop();
      pic.classList.remove('playing');
      if (label) label.textContent = `🎶 ${tune.title}`;
      sound.holdMusic(false);
    },
  };
}

/** Draws an emoji at a low resolution, then blows it up with hard pixel edges. */
function drawPixelated(canvas: HTMLCanvasElement, emoji: string, res: number): void {
  const size = canvas.width;
  const small = document.createElement('canvas');
  small.width = small.height = res;
  const sc = small.getContext('2d')!;
  sc.textAlign = 'center';
  sc.textBaseline = 'middle';
  sc.font = `${res * 0.82}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
  sc.fillText(emoji, res / 2, res * 0.54);
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, size, size);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(small, 0, 0, size, size);
}
