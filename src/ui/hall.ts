import { getCategory } from '../game/categories';
import type { Award } from '../game/awards';
import { lifetime, topScores, type Hall } from '../game/hall';
import { sound } from '../audio/sound';
import { esc, mount, press } from './ui';

const day = (at: number) => new Date(at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

/** A row of award badges, e.g. on the results screen. names: who won each (party), or null (solo). */
export function awardsHtml(awards: readonly Award[], names?: Map<string, string>): string {
  if (!awards.length) return '';
  return `<div class="awards">${awards
    .map(
      (a, i) => `<div class="award" style="--d:${i * 180}ms">
        <div class="aw-ico">${a.icon}</div>
        <div class="aw-txt"><b>${esc(a.title)}</b>${names ? `<i>${esc(names.get(a.teamId) ?? '')}</i>` : ''}<span>${esc(a.why)}</span></div>
      </div>`,
    )
    .join('')}</div>`;
}

/** The hall of fame screen: best scores, lifetime stats, trophies and category strengths. */
export function showHall(hall: Hall, onClear: () => Hall): Promise<void> {
  let current = hall;
  const render = () => {
    const top = topScores(current, 10);
    const life = lifetime(current);
    const acc = life.answered ? Math.round((life.correct / life.answered) * 100) : 0;
    const best = life.categories.slice(0, 3);
    const worst = life.categories.slice(best.length).slice(-2).reverse();
    const catRow = ([c, r, a]: [string, number, number]) => {
      const cat = getCategory(c as never);
      return `<div class="hof-cat" style="--c:${cat.color}"><span>${cat.icon} ${esc(cat.name)}</span><b>${Math.round((r / a) * 100)}%</b></div>`;
    };
    const el = mount(
      `<header class="bar"><h2>🏆 Hall of Fame</h2></header>
       <div class="scroll hof">
         ${
           top.length === 0
             ? '<p class="hof-empty">No games yet. Play one and your best scores will show up here!</p>'
             : `<section class="hof-top">
                 <h3>Top scores</h3>
                 <ol>${top
                   .map(
                     (e, i) => `<li style="--c:${e.color}; --d:${i * 60}ms">
                       <span class="hof-rank">${['🥇', '🥈', '🥉'][i] ?? i + 1}</span>
                       <span class="hof-name">${esc(e.name)}<small>${e.mode === 'party' ? 'Party' : 'Solo'} · ${day(e.at)}</small></span>
                       <b>${e.score.toLocaleString()}</b>
                     </li>`,
                   )
                   .join('')}</ol>
               </section>
               <section class="hof-side">
                 <h3>Your stats</h3>
                 <div class="r-stats hof-stats">
                   <div><b>${life.games}</b><span>games</span></div>
                   <div><b>${life.answered ? `${acc}%` : '–'}</b><span>solo accuracy</span></div>
                   <div><b>${life.bestStreak}</b><span>best streak</span></div>
                 </div>
                 ${
                   life.trophies.length
                     ? `<h3>Trophy case</h3><div class="hof-trophies">${life.trophies
                         .map((t) => `<div class="hof-trophy" title="${esc(t.title)}"><span>${t.icon}</span><b>${esc(t.title)}</b><i>×${t.count}</i></div>`)
                         .join('')}</div>`
                     : ''
                 }
                 ${best.length ? `<h3>Best categories</h3>${best.map(catRow).join('')}` : ''}
                 ${worst.length ? `<h3>Needs work</h3>${worst.map(catRow).join('')}` : ''}
               </section>`
         }
       </div>
       <footer class="foot two">
         ${top.length ? '<button class="btn ghost" data-clear>CLEAR</button>' : ''}
         <button class="btn primary" data-back data-focus>BACK</button>
       </footer>`,
      'hall-screen',
    );
    return el;
  };

  return new Promise((resolve) => {
    const wire = (el: HTMLElement) => {
      press(el.querySelector('[data-back]')!, () => resolve());
      const clear = el.querySelector<HTMLElement>('[data-clear]');
      if (clear)
        press(clear, () => {
          if (clear.dataset.sure) {
            current = onClear();
            sound.wrong();
            wire(render());
          } else {
            clear.dataset.sure = '1';
            clear.textContent = 'TAP AGAIN TO CLEAR';
          }
        });
    };
    wire(render());
  });
}
