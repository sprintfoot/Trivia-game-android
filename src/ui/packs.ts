import { exportPack, loadPacks, newPack, parseBulk, problem, savePacks, tidy, type CustomPack } from '../game/custom';
import { sound } from '../audio/sound';
import { esc } from './ui';

/**
 * The "My Questions" editor: a full-screen sheet over setup. Make packs, add questions one at a time
 * or paste many, switch packs on and off, and copy a pack to share it.
 */
export function openPackEditor(onClose: () => void): void {
  let packs = loadPacks();
  let openId: string | null = packs.length === 1 ? packs[0].id : null;
  let note = '';
  const overlay = document.createElement('div');
  overlay.className = 'modal packs-modal';
  document.body.appendChild(overlay);

  const commit = () => savePacks(packs);
  const close = () => {
    overlay.remove();
    onClose();
  };

  const listView = () => `
    <h2>📝 My Questions</h2>
    <p class="hint">Write your own questions: family inside jokes, a birthday quiz, anything. Tick <b>My Questions</b> in setup to play them.</p>
    <div class="pk-list">${
      packs.length
        ? packs
            .map(
              (p) => `<div class="pk-row">
                <label class="pk-on"><input type="checkbox" data-on="${p.id}" ${p.on ? 'checked' : ''}/><i class="sw"></i></label>
                <button class="pk-open" data-open="${p.id}"><b>${esc(p.name)}</b><span>${p.questions.length} question${p.questions.length === 1 ? '' : 's'}</span></button>
              </div>`,
            )
            .join('')
        : '<p class="pk-empty">No packs yet.</p>'
    }</div>
    <form class="pk-new" data-new><input name="name" maxlength="40" placeholder="New pack name, e.g. The Smiths" autocomplete="off"/><button class="btn primary" type="submit">ADD PACK</button></form>
    <button class="btn ghost" data-close data-focus>DONE</button>`;

  const packView = (p: CustomPack) => `
    <div class="pk-head"><button class="btn ghost pk-back" data-back>‹ PACKS</button><input class="pk-name" data-name value="${esc(p.name)}" maxlength="40" aria-label="Pack name"/></div>
    <form class="pk-add" data-add>
      <input name="prompt" maxlength="140" placeholder="Question, e.g. What is Grandpa's favorite snack?" autocomplete="off"/>
      <input name="right" maxlength="140" placeholder="✓ Right answer" autocomplete="off" class="pk-right"/>
      <div class="pk-wrongs">
        <input name="w1" maxlength="140" placeholder="✗ Wrong answer" autocomplete="off"/>
        <input name="w2" maxlength="140" placeholder="✗ Wrong (optional)" autocomplete="off"/>
        <input name="w3" maxlength="140" placeholder="✗ Wrong (optional)" autocomplete="off"/>
      </div>
      <button class="btn primary" type="submit">ADD QUESTION</button>
    </form>
    ${note ? `<p class="pk-note">${esc(note)}</p>` : ''}
    <ol class="pk-qs">${p.questions
      .map(
        (q, i) => `<li><div><b>${esc(q.prompt)}</b><span>✓ ${esc(q.right)} · ✗ ${q.wrong.map(esc).join(' · ✗ ')}</span></div><button class="pk-del" data-del="${i}" aria-label="Delete question">✕</button></li>`,
      )
      .join('')}</ol>
    <details class="pk-bulk"><summary>Paste many at once</summary>
      <p class="hint">One per line: <code>Question | right answer | wrong | wrong | wrong</code></p>
      <textarea data-bulk rows="5" placeholder="Who makes the best lasagna? | Aunt Rosa | Uncle Joe | Cousin Vinny | Grandma"></textarea>
      <button class="btn ghost" data-import>ADD THESE</button>
    </details>
    <div class="pk-actions">
      <button class="btn ghost" data-copy>📋 COPY PACK</button>
      <button class="btn ghost danger" data-remove>DELETE PACK</button>
    </div>`;

  const render = () => {
    const p = packs.find((x) => x.id === openId);
    overlay.innerHTML = `<div class="sheet packs-sheet">${p ? packView(p) : listView()}</div>`;
    note = '';
    wire(p);
  };

  const wire = (p?: CustomPack) => {
    const $ = <T extends Element>(sel: string) => overlay.querySelector<T>(sel);
    if (!p) {
      $('[data-close]')?.addEventListener('click', () => {
        sound.click();
        close();
      });
      overlay.querySelectorAll<HTMLInputElement>('[data-on]').forEach((inp) =>
        inp.addEventListener('change', () => {
          const pk = packs.find((x) => x.id === inp.dataset.on);
          if (pk) pk.on = inp.checked;
          commit();
          sound.toggle(inp.checked);
        }),
      );
      overlay.querySelectorAll<HTMLElement>('[data-open]').forEach((b) =>
        b.addEventListener('click', () => {
          sound.click();
          openId = b.dataset.open!;
          render();
        }),
      );
      $<HTMLFormElement>('[data-new]')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = ($<HTMLInputElement>('[data-new] input')?.value ?? '').trim();
        const pk = newPack(name);
        packs.push(pk);
        commit();
        sound.chime();
        openId = pk.id;
        render();
      });
      return;
    }
    $('[data-back]')?.addEventListener('click', () => {
      sound.click();
      openId = null;
      render();
    });
    $<HTMLInputElement>('[data-name]')?.addEventListener('change', (e) => {
      p.name = (e.target as HTMLInputElement).value.trim().slice(0, 40) || p.name;
      commit();
    });
    const form = $<HTMLFormElement>('[data-add]')!;
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const f = new FormData(form);
      const q = { prompt: String(f.get('prompt') ?? ''), right: String(f.get('right') ?? ''), wrong: ['w1', 'w2', 'w3'].map((k) => String(f.get(k) ?? '')) };
      const why = problem(q);
      if (why) {
        sound.wrong();
        note = why;
        // Keep what they typed.
        const keep = Object.fromEntries(f.entries());
        render();
        const again = overlay.querySelector<HTMLFormElement>('[data-add]')!;
        for (const [k, v] of Object.entries(keep)) (again.elements.namedItem(k) as HTMLInputElement).value = String(v);
        return;
      }
      p.questions.push(tidy(q));
      commit();
      sound.correct();
      render();
      overlay.querySelector<HTMLInputElement>('[data-add] input')?.focus();
    });
    overlay.querySelectorAll<HTMLElement>('[data-del]').forEach((b) =>
      b.addEventListener('click', () => {
        p.questions.splice(Number(b.dataset.del), 1);
        commit();
        sound.click();
        render();
      }),
    );
    $('[data-import]')?.addEventListener('click', () => {
      const { questions, errors } = parseBulk($<HTMLTextAreaElement>('[data-bulk]')!.value);
      p.questions.push(...questions);
      commit();
      if (questions.length) sound.correct();
      else sound.wrong();
      note = `Added ${questions.length} question${questions.length === 1 ? '' : 's'}.${errors.length ? ` Skipped: ${errors.slice(0, 3).join(' ')}${errors.length > 3 ? ' …' : ''}` : ''}`;
      render();
    });
    $('[data-copy]')?.addEventListener('click', () => {
      const text = exportPack(p);
      const btn = $<HTMLButtonElement>('[data-copy]')!;
      void navigator.clipboard?.writeText(text).then(
        () => (btn.textContent = '✓ COPIED'),
        () => (btn.textContent = 'COPY FAILED'),
      );
    });
    const remove = $<HTMLButtonElement>('[data-remove]')!;
    remove.addEventListener('click', () => {
      if (!remove.dataset.sure) {
        remove.dataset.sure = '1';
        remove.textContent = 'TAP AGAIN TO DELETE';
        return;
      }
      packs = packs.filter((x) => x.id !== p.id);
      commit();
      openId = null;
      render();
    });
  };

  render();
}
