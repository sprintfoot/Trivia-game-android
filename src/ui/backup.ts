import { Capacitor, registerPlugin } from '@capacitor/core';
import { backupFileName, makeBackup, parseBackup, restoreBackup, summarize, type Backup } from '../backup';
import { esc, press } from './ui';

/** Native side (android/.../BackupPlugin.java): writes the file somewhere that survives an uninstall. */
interface BackupNative {
  saveToDownloads(o: { name: string; text: string }): Promise<{ where: string }>;
  share(o: { name: string; text: string }): Promise<void>;
}
const BackupNative = registerPlugin<BackupNative>('Backup');
const native = Capacitor.isNativePlatform();

const plural = (n: number, w: string) => `${n.toLocaleString()} ${w}${n === 1 ? '' : 's'}`;

function describe(b: Backup): string {
  const s = summarize(b);
  const bits = [plural(s.games, 'Hall of Fame game'), `${plural(s.packs, 'question pack')} (${plural(s.questions, 'question')})`];
  if (s.bestScore) bits.push(`personal best ${s.bestScore.toLocaleString()}`);
  if (s.hasSettings) bits.push('settings');
  return bits.join(', ');
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;opacity:0;pointer-events:none';
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try {
      ok = document.execCommand('copy');
    } catch {
      ok = false;
    }
    ta.remove();
    return ok;
  }
}

function download(name: string, text: string): void {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/** The Backup & restore sheet, opened from Settings. A successful restore reloads the game. */
export function openBackup(): void {
  const overlay = document.createElement('div');
  overlay.className = 'modal packs-modal';
  document.body.appendChild(overlay);
  const current = makeBackup(localStorage);
  let note = '';
  let pending: Backup | null = null;

  const render = () => {
    overlay.innerHTML = `<div class="sheet packs-sheet backup-sheet">
      <h2>💾 Backup &amp; restore</h2>
      <p class="hint">Saves your Hall of Fame, My Questions, personal best and settings to one small file. Keep it somewhere safe (Downloads, Google Drive, an email to yourself) so you can bring everything back after reinstalling or on a new device.</p>
      <p class="bk-what">On this device: ${esc(describe(current))}.</p>
      <div class="bk-btns">
        ${
          native
            ? `<button class="btn primary" data-save>⬇️ SAVE TO DOWNLOADS</button>
               <button class="btn ghost" data-share>📤 SHARE / SAVE TO DRIVE…</button>`
            : '<button class="btn primary" data-download>⬇️ DOWNLOAD BACKUP FILE</button>'
        }
        <button class="btn ghost" data-copy>📋 COPY AS TEXT</button>
      </div>
      <h3 class="bk-h">Restore</h3>
      ${
        pending
          ? `<p class="pk-note">This backup has: ${esc(describe(pending))}. It will be added to what's on this device; nothing here gets deleted.</p>
             <div class="bk-btns two"><button class="btn ghost" data-cancel>CANCEL</button><button class="btn primary" data-apply>RESTORE</button></div>`
          : `<label class="btn ghost bk-file">📂 CHOOSE BACKUP FILE<input type="file" data-file hidden/></label>
             <details class="pk-bulk"><summary>Or paste backup text</summary>
               <textarea data-paste rows="4" placeholder='{"app":"trivia-party", …}'></textarea>
               <button class="btn ghost" data-check>CHECK BACKUP</button>
             </details>`
      }
      ${note ? `<p class="pk-note">${esc(note)}</p>` : ''}
      <button class="btn ghost" data-close data-focus>DONE</button>
    </div>`;
    wire();
  };

  const $ = <T extends HTMLElement>(s: string) => overlay.querySelector<T>(s);
  const text = () => JSON.stringify(current);
  const done = (msg: string) => {
    note = msg;
    render();
  };
  const fail = (e: unknown) => done(e instanceof Error ? e.message : String(e));
  const load = (t: string) => {
    try {
      pending = parseBackup(t);
      note = '';
      render();
    } catch (e) {
      fail(e);
    }
  };

  const wire = () => {
    const save = $('[data-save]');
    if (save)
      press(save, () =>
        BackupNative.saveToDownloads({ name: backupFileName(), text: text() }).then(
          (r) => done(`✓ Saved to ${r.where}. It stays there even if you uninstall the game.`),
          (e) => done(`Couldn't save to Downloads (${e?.message ?? e}). Try SHARE instead.`),
        ),
      );
    const share = $('[data-share]');
    if (share) press(share, () => BackupNative.share({ name: backupFileName(), text: text() }).catch(fail));
    const dl = $('[data-download]');
    if (dl)
      press(dl, () => {
        download(backupFileName(), text());
        done('✓ Backup downloaded. Keep the file somewhere safe.');
      });
    press($('[data-copy]')!, () =>
      void copyText(text()).then((ok) =>
        done(ok ? '✓ Copied. Paste it somewhere safe, like an email or note to yourself.' : "Couldn't copy on this device."),
      ),
    );
    $<HTMLInputElement>('[data-file]')?.addEventListener('change', (e) => {
      const f = (e.target as HTMLInputElement).files?.[0];
      if (f) f.text().then(load, fail);
    });
    const check = $('[data-check]');
    if (check) press(check, () => load($<HTMLTextAreaElement>('[data-paste]')!.value));
    const cancel = $('[data-cancel]');
    if (cancel)
      press(cancel, () => {
        pending = null;
        done('');
      });
    const apply = $('[data-apply]');
    if (apply)
      press(apply, () => {
        if (!pending) return;
        try {
          restoreBackup(localStorage, pending);
        } catch (e) {
          fail(e);
          return;
        }
        // Settings and the hall are read at start-up, so restart the game to pick everything up.
        location.reload();
      });
    press($('[data-close]')!, () => overlay.remove());
  };

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove();
  });
  render();
  requestAnimationFrame(() => $('[data-focus]')?.focus());
}
