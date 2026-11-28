// Screenshots every screen at common phone sizes and reports overlaps and cut-off content.
// Usage: npx vite --port 5199 &  then  node scripts/layout/check.mjs [outDir] [screenFilter]
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');
import { mkdirSync, writeFileSync } from 'node:fs';

const BASE = process.env.BASE ?? 'http://localhost:5199/scripts/layout/harness.html';
const out = process.argv[2] ?? 'layout-shots';
const filter = process.argv[3] ?? '';
mkdirSync(out, { recursive: true });

const SIZES = [
  ['p360', 360, 740], ['p411', 411, 891], ['p393', 393, 852],
  ['l740', 740, 360], ['l891', 891, 411], ['l852', 852, 393],
  ['tv', 1280, 720],
];
const SCREENS = [
  'title', 'setup', 'setup&party', 'banner&mix', 'solo-q&q=long', 'solo-q&q=face', 'solo-q&q=clues', 'solo-wager', 'solo-results',
  'party-q&q=long', 'party-q&q=face', 'party-q&q=clues', 'party-q&q=typed', 'party-q&q=short&local', 'party-q&q=clues&local',
  'party-reveal&q=short', 'scores', 'final', 'final&players=3', 'wager&local', 'lobby',
  'ctl-lobby', 'ctl-question&q=long', 'ctl-reveal&q=short', 'ctl-wager', 'ctl-final',
];
// Things that must not cover each other or leave the screen.
const KEYS = '.home-btn:not([hidden]), .hud-mid, .hud-score, .ss-team, .timer, .q-card, .q-text, .pic, .ans, .hint-btn, .tv-hint, .tv-local, .crowd-member, .foot .btn, .pod, .award, .board-row, .type-answers, .verdict, .r-title, .r-score, .r-stats, .wager-team, .wager-btn';

const browser = await chromium.launch();
const report = [];
await Promise.all(SIZES.map(async ([sname, w, h]) => {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, hasTouch: w < 1000, isMobile: w < 1000 });
  for (const s of SCREENS) {
    const screen = s.split('&')[0];
    const tag = s.replace(/[&=]/g, '_');
    if (filter && !tag.includes(filter)) continue;
    const page = await ctx.newPage();
    await page.goto(`${BASE}?screen=${s}&players=${s.includes('players=') ? '' : 10}`.replace('&players=&', '&'));
    await page.waitForTimeout(screen === 'party-reveal' ? 1400 : screen.includes('final') || screen === 'solo-results' ? 3200 : 900);
    const problems = await page.evaluate((KEYS) => {
      const W = innerWidth, H = innerHeight;
      const els = [...document.querySelectorAll(KEYS)].filter((e) => {
        const r = e.getBoundingClientRect();
        const cs = getComputedStyle(e);
        return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.opacity !== '0' && cs.display !== 'none';
      });
      const label = (e) => e.className.toString().split(' ')[0] + (e.textContent ? `"${e.textContent.trim().slice(0, 18)}"` : '');
      // What you can actually see of an element: its text for headings, cut down by any box that clips it.
      const vis = (e) => {
        let r = e.getBoundingClientRect();
        if (e.matches('.r-title, .tv-hint, .q-text')) {
          const range = document.createRange();
          range.selectNodeContents(e);
          r = range.getBoundingClientRect();
        }
        let { left, top, right, bottom } = r;
        for (let p = e.parentElement; p; p = p.parentElement) {
          const cs = getComputedStyle(p);
          if (cs.overflowX === 'visible' && cs.overflowY === 'visible') continue;
          const c = p.getBoundingClientRect();
          left = Math.max(left, c.left); top = Math.max(top, c.top); right = Math.min(right, c.right); bottom = Math.min(bottom, c.bottom);
        }
        return { left, top, right, bottom };
      };
      const scroller = (e) => { for (let p = e.parentElement; p; p = p.parentElement) { const o = getComputedStyle(p).overflowY; if ((o === 'auto' || o === 'scroll') && p.scrollHeight > p.clientHeight + 1) return p; } return null; };
      const out = [];
      for (const e of els) {
        const r = e.getBoundingClientRect();
        const sc = scroller(e);
        if (!sc && (r.left < -1 || r.top < -1 || r.right > W + 1 || r.bottom > H + 1)) out.push(`OFFSCREEN ${label(e)} ${Math.round(r.left)},${Math.round(r.top)},${Math.round(r.right)},${Math.round(r.bottom)}`);
        // text cut off inside its own box (ellipsis is fine)
        if (e.scrollWidth > e.clientWidth + 2 && getComputedStyle(e).textOverflow !== 'ellipsis' && getComputedStyle(e).overflowX !== 'visible') out.push(`CLIPPED-X ${label(e)}`);
      }
      for (let i = 0; i < els.length; i++)
        for (let j = i + 1; j < els.length; j++) {
          const a = els[i], b = els[j];
          if (a.contains(b) || b.contains(a)) continue;
          // The answer pop-up is meant to sit on top for a moment.
          if (a.closest('.verdict') || b.closest('.verdict')) continue;
          // pics/texts are inside q-card; only compare siblings at meaningful level
          const ra = vis(a), rb = vis(b);
          const ox = Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left);
          const oy = Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top);
          if (ox > 3 && oy > 3) {
            const sa = scroller(a), sb = scroller(b);
            // overlap in a scroll container with a fixed thing (home btn) is real; two items in same scroller are real too
            out.push(`OVERLAP ${label(a)} x ${label(b)} (${Math.round(ox)}x${Math.round(oy)})`);
          }
        }
      // whole-page horizontal scroll
      if (document.documentElement.scrollWidth > W + 1) out.push(`HSCROLL ${document.documentElement.scrollWidth}`);
      return out;
    }, KEYS);
    await page.screenshot({ path: `${out}/${sname}-${tag}.png` });
    if (problems.length) report.push(`## ${sname} ${s}\n` + problems.map((p) => '  ' + p).join('\n'));
    await page.close();
  }
  await ctx.close();
}));
report.sort();
await browser.close();
writeFileSync(`${out}/report.txt`, report.join('\n'));
console.log(report.join('\n') || 'No problems found');
