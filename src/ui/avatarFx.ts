/** Avatars on screen, and their reactions: a cheer for a right answer, a tomato or a bop for a wrong one. */
import { avatarSvg, type Mood } from '../game/avatars';
import type { PublicTeam } from '../net/protocol';
import { sound } from '../audio/sound';
import { esc } from './ui';

export type Reaction = 'cheer' | 'tomato' | 'bop';

export function avatarHtml(id: string, mood: Mood = 'idle', cls = ''): string {
  return `<span class="av ${cls}" data-avatar="${id}">${avatarSvg(id, mood)}</span>`;
}

/** A row of every player's avatar, grouped by team, for the TV. */
export function crowdHtml(teams: readonly PublicTeam[]): string {
  const n = teams.reduce((sum, t) => sum + t.members.length, 0);
  return `<div class="crowd" style="--n:${Math.max(1, n)}">${teams
    .filter((t) => t.members.length)
    .map(
      (t) => `<div class="crowd-team" data-team="${t.id}" style="--c:${t.color}">${t.members
        .map((m) => `<span class="crowd-member" data-player="${m.id}" title="${esc(m.name)}">${avatarHtml(m.avatar)}<i>${esc(m.name)}</i></span>`)
        .join('')}</div>`,
    )
    .join('')}</div>`;
}

export function markVoted(root: ParentNode, playerId: string): void {
  const el = root.querySelector(`.crowd-member[data-player="${playerId}"]`);
  if (el && !el.classList.contains('voted')) el.classList.add('voted');
}

/** Plays a reaction on one avatar element. */
export function react(av: HTMLElement, reaction: Reaction, delayMs = 0): void {
  const id = av.dataset.avatar!;
  window.setTimeout(() => {
    av.innerHTML = avatarSvg(id, reaction === 'cheer' ? 'happy' : 'sad');
    av.classList.remove('cheer', 'tomato', 'bop');
    void av.offsetWidth;
    av.classList.add(reaction);
    if (reaction === 'tomato') {
      av.insertAdjacentHTML('beforeend', '<b class="fx-tomato"></b><b class="fx-splat"></b>');
      window.setTimeout(() => sound.splat(), 380);
    } else if (reaction === 'bop') {
      av.insertAdjacentHTML('beforeend', '<b class="fx-mallet"></b><b class="fx-stars">✦ ✧ ✦</b>');
      window.setTimeout(() => sound.bonk(), 330);
    }
  }, delayMs);
}

export const wrongReaction = (): Reaction => (Math.random() < 0.5 ? 'tomato' : 'bop');

/** Reacts every avatar in the TV crowd to its team's result. */
export function reactCrowd(root: ParentNode, results: ReadonlyMap<string, boolean>): void {
  let n = 0;
  root.querySelectorAll<HTMLElement>('.crowd-team').forEach((team) => {
    const correct = results.get(team.dataset.team!);
    if (correct === undefined) return;
    team.querySelectorAll<HTMLElement>('.av').forEach((av) => react(av, correct ? 'cheer' : wrongReaction(), 120 * n++));
  });
}
