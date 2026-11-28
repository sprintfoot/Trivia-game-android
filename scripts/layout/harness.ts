/**
 * Dev-only page that draws one screen with made-up data, so layouts can be checked at any size.
 * Open /scripts/layout/harness.html?screen=party-q&players=10 with `npm run dev`, or run check.mjs.
 */
import '../../src/styles.css';
import { BANK } from '../../src/data/bank';
import { CATEGORIES, getCategory } from '../../src/game/categories';
import { AVATARS } from '../../src/game/avatars';
import type { LiveQuestion, TeamScore } from '../../src/game/session';
import type { PublicTeam } from '../../src/net/protocol';
import * as party from '../../src/ui/party';
import * as ui from '../../src/ui/ui';
import { awardsHtml } from '../../src/ui/hall';
import { initHome, setHome } from '../../src/ui/home';
import { Controller } from '../../src/controller';
import { loadSettings } from '../../src/settings';

const params = new URLSearchParams(location.search);
const screen = params.get('screen') ?? 'party-q';
const count = Number(params.get('players') ?? 10);
const qKind = params.get('q') ?? 'long';

const NAMES = ['Tony Bagga Donut', 'Jules', 'ABBBYYYYYYYY', 'Prince Noah III', 'ava😴', 'Danielle F', 'Steve', 'Craigy pooppoo', 'Adam', 'Avavaavavava Longname'];
const COLORS = ['#38e1ff', '#ff4fa8', '#ffc83a', '#7dff4f', '#b06bff', '#ff8a3a', '#4fa8ff', '#5ef0b0', '#ff5a5a', '#e0e0ff'];
const teams: TeamScore[] = Array.from({ length: count }, (_, i) => ({
  id: `t${i}`,
  name: NAMES[i % NAMES.length],
  color: COLORS[i % COLORS.length],
  score: 25840 - i * 2311,
  streak: 0,
  bestStreak: 14 - i,
  correctCount: 27 - i,
  hintsLeft: 1,
}));
const pub: PublicTeam[] = teams.map((t, i) => ({
  ...t,
  members: [{ id: `p${i}`, name: t.name, online: true, avatar: AVATARS[i % AVATARS.length].id }],
}));

function question(): LiveQuestion {
  const pick = (f: (q: (typeof BANK)[number]) => boolean) => BANK.find(f)!;
  const q =
    qKind === 'face'
      ? pick((q) => q.picture?.kind === 'photo')
      : qKind === 'clues'
        ? pick((q) => q.picture?.kind === 'clues')
        : qKind === 'typed'
          ? pick((q) => !!q.accept)
          : qKind === 'short'
            ? pick((q) => q.prompt.length < 40 && !q.picture && q.choices.length === 4)
            : pick((q) => q.prompt.startsWith('In 1776'));
  return { ...q, number: 28, round: 5 };
}
const awards = [
  { id: 'a', icon: '⚡', title: 'Speed Demon', why: '4.0s average right answer', teamId: 't4' },
  { id: 'b', icon: '🔥', title: 'On Fire', why: '14 in a row', teamId: 't5' },
  { id: 'c', icon: '🧠', title: 'Big Brain', why: '85% right', teamId: 't4' },
  { id: 'd', icon: '⏱️', title: 'Clutch', why: '3 right with under 2 seconds left', teamId: 't3' },
  { id: 'e', icon: '🌩️', title: 'Storm Chaser', why: '5 right in the lightning round', teamId: 't4' },
  { id: 'f', icon: '🎲', title: 'High Roller', why: 'won a 17,847 point bet', teamId: 't6' },
  { id: 'g', icon: '🎯', title: 'Sharpshooter', why: '1 closest guess', teamId: 't1' },
  { id: 'h', icon: '🙌', title: 'No Help Needed', why: 'aced it without a 50/50', teamId: 't2' },
];
const names = new Map(teams.map((t) => [t.id, t.name]));
const cat = getCategory(question().category);
const never = () => new Promise<never>(() => undefined);
const noop = () => undefined;

initHome();
setHome({ mode: 'confirm', title: 'Quit?' });

const local = params.has('local')
  ? { name: 'Host', hintsLeft: 1, onPick: noop, onGuess: noop, onHint: () => null }
  : undefined;

switch (screen) {
  case 'title':
    setHome({ mode: 'hidden' });
    void ui.showTitle(noop, '🔥 3');
    break;
  case 'setup':
    void ui.showSetup(loadSettings(), noop, params.has('party'));
    break;
  case 'banner':
    ui.showRoundBanner(3, 5, false, 'normal', params.has('mix') ? CATEGORIES.slice(0, 8) : null);
    break;
  case 'solo-q':
    void ui.askQuestion(question(), cat, 600000, { score: 22674, streak: 4, round: 5, totalRounds: 5, questionNumber: 28, totalQuestions: 36, multiplier: 2 }, { onTension: noop, onTick: noop, hintsLeft: 2, useHint: () => [] });
    break;
  case 'solo-wager':
    void ui.askWager(cat, 22674, 22674);
    break;
  case 'solo-results':
    void ui.showResults({ score: 22674, correct: 11, total: 15, bestStreak: 7, newBest: true, previousBest: 0, hallRank: 1, awardsHtml: awardsHtml(awards) }, noop);
    break;
  case 'party-q': {
    const tq = party.tvQuestion(question(), cat, 600000, teams, { number: 28, total: 36, multiplier: 2 }, { onTension: noop, onTick: noop, allAnswered: () => false, crowd: pub, local });
    teams.forEach((t, i) => i % 2 && tq.setLocked(t.id, true));
    pub.forEach((t, i) => i % 3 && tq.voted(t.members[0].id));
    break;
  }
  case 'party-reveal': {
    const q = question();
    party.tvQuestion(q, cat, 600000, teams, { number: 28, total: 36, multiplier: 2 }, { onTension: noop, onTick: noop, allAnswered: () => true, crowd: pub });
    setTimeout(() => {
      void party.tvReveal(
        teams.map((t, i) => ({ teamId: t.id, question: q, chosen: i % 4, correct: i % 4 === q.answer, score: { base: 1000, speed: 300, streak: 0, multiplier: 1, hinted: false, total: 1300 }, streak: 1, kind: 'normal', timeLeftMs: 3000, timeLimitMs: 15000 })),
        teams,
      );
    }, 500);
    break;
  }
  case 'scores':
    void party.tvScores(new Map(teams.map((t) => [t.id, t.score - 1000])), teams, 'After round 3');
    break;
  case 'final':
    teams.forEach((t, i) => i >= count - 3 && count > 3 && (t.score = 0));
    void party.tvFinal(teams, true, awardsHtml(awards.slice(0, 6), names), new Map(teams.map((t, i) => [t.id, t.score === 0 ? -21560 : i === 0 ? 17847 : 0])));
    break;
  case 'wager':
    party.tvWager(cat, teams, 600000, () => false, local ? { name: 'Host', max: 22000, onBet: noop } : undefined);
    break;
  case 'lobby': {
    const fake = { code: 'WXYZ', mode: 'players', localPlayer: null, publicTeams: () => pub, addLocal: noop, removeLocal: noop, moveLocal: noop };
    void party.showLobby(fake as never, 'Host').started;
    break;
  }
  default: {
    // Phone controller screens: ctl-question, ctl-reveal, ctl-final, ctl-wager, ctl-lobby
    const client = { onStatus: noop, onMessage: noop, send: noop, leave: noop };
    const c = new Controller(client as never) as unknown as { handle: (m: unknown) => void };
    const q = question();
    const pc = { name: cat.name, icon: cat.icon, color: cat.color };
    c.handle({ t: 'welcome', playerId: 'p0', teamId: 't0', mode: 'players' });
    if (screen === 'ctl-lobby') c.handle({ t: 'lobby', mode: 'players', teams: pub, you: { playerId: 'p0', teamId: 't0' } });
    if (screen === 'ctl-question' || screen === 'ctl-reveal')
      c.handle({ t: 'question', qid: 1, number: 28, total: 36, multiplier: 2, prompt: q.prompt, choices: q.choices, category: pc, durationMs: 600000, hidden: [], hintsLeft: 1, teamSize: 1, media: q.picture ? 'picture' : null, typed: !!q.accept });
    if (screen === 'ctl-reveal')
      c.handle({ t: 'reveal', qid: 1, answer: q.answer, answerText: q.choices[q.answer], chosen: 1, correct: false, points: 0, rank: 4, teams: pub });
    if (screen === 'ctl-wager') c.handle({ t: 'wager', max: 22000, score: 22000, category: pc, durationMs: 600000 });
    if (screen === 'ctl-final') c.handle({ t: 'final', teams: pub, yourTeamId: 't4', awards: awards.slice(0, 6) });
  }
}
void never;
