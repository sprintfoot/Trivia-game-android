import './styles.css';
import { BANK } from './data/bank';
import { CATEGORIES, getCategory, type Category } from './game/categories';
import { GameSession, type GameConfig } from './game/session';
import { decideTeamAnswer } from './game/teams';
import { PartyHost } from './net/host';
import { PartyClient } from './net/client';
import type { PublicCategory } from './net/protocol';
import { Controller, joinError, joinForm } from './controller';
import * as party from './ui/party';
import { Stage } from './scene/stage';
import { sound } from './audio/sound';
import { haptics, setHapticsEnabled } from './audio/haptics';
import { voice } from './audio/voice';
import { loadSettings, saveSettings, type Settings } from './settings';
import * as ui from './ui/ui';

const settings = loadSettings();
const stage = new Stage(document.getElementById('stage') as HTMLCanvasElement, settings.quality);
stage.onFirework = () => sound.firework();

function applySettings(s: Settings): void {
  sound.setEnabled(s.sound);
  sound.setMusicEnabled(s.music);
  setHapticsEnabled(s.haptics);
  voice.enabled = s.voice;
  voice.readQuestions = s.readQuestions;
  if (!s.voice) voice.stop();
  stage.setQuality(s.quality);
  saveSettings(s);
}
applySettings(settings);
const openSettings = () => ui.openSettings(settings, applySettings);

async function playGame(config: GameConfig): Promise<'again' | 'setup'> {
  const session = new GameSession(config, BANK);
  stage.wheel.build(config.categories.map(getCategory));
  voice.line('intro');

  while (session.hasNextRound()) {
    const cat = await spinForRound(session, null);

    stage.setMode('question');
    sound.setMusic('question');
    while (session.hasNextQuestion()) {
      const q = session.nextQuestion();
      const hud: ui.Hud = {
        score: session.score,
        streak: session.streak,
        round: session.currentRound,
        totalRounds: session.totalRounds,
        questionNumber: q.number,
        totalQuestions: session.totalQuestions,
        multiplier: session.multiplier,
      };
      voice.question(q.prompt, q.choices);
      const pick = await ui.askQuestion(q, cat, config.timeLimitMs, hud, {
        onTension: (t) => {
          stage.setTension(t);
          sound.setIntensity(t);
        },
        onTick: (u) => {
          sound.clockTick(u);
          haptics.tick();
        },
        hintsLeft: session.hintsLeft,
        useHint: () => {
          voice.line('hint');
          return session.useHint();
        },
      });
      const before = session.score;
      const result = session.submit(pick.chosen, pick.timeLeftMs);

      if (result.correct) {
        if (result.streak >= 3) voice.line('streak', { n: result.streak });
        else if (pick.timeLeftMs > config.timeLimitMs * 0.7) voice.line('fast');
        else voice.line('correct');
      } else voice.line(pick.chosen === null ? 'timeUp' : 'wrong');
      if (result.correct) {
        sound.correct();
        if (result.streak >= 3) sound.streak(result.streak);
        haptics.success();
        stage.celebrate();
        ui.flash('rgba(80,255,170,0.35)');
      } else {
        if (pick.chosen === null) sound.timeUp();
        else sound.wrong();
        haptics.error();
        stage.fail();
        ui.flash('rgba(255,40,60,0.4)');
      }
      await ui.showReveal(result, before, () => sound.points());
    }
  }

  // Final results.
  const previousBest = settings.bestScore;
  const newBest = session.score > previousBest;
  if (newBest) settings.bestScore = session.score;
  saveSettings(settings);

  stage.setMode('results');
  stage.setAccent('#ffcc33');
  stage.bigCelebrate();
  sound.setMusic('results');
  sound.fanfare();
  haptics.success();
  setTimeout(() => voice.line('soloEnd', { score: session.score.toLocaleString() }), 1800);
  return ui.showResults(
    {
      score: session.score,
      correct: session.correctCount,
      total: session.history.length,
      bestStreak: session.bestStreak,
      newBest,
      previousBest,
    },
    () => sound.points(),
  );
}

// ---------------- Party: host (TV) ----------------

const pub = (c: Category): PublicCategory => ({ name: c.name, icon: c.icon, color: c.color });

async function spinForRound(session: GameSession, host: PartyHost | null): Promise<Category> {
  const catId = session.startRound();
  const cat = getCategory(catId);
  const final = session.isFinalRound && session.totalRounds > 1;
  stage.setMode('wheel');
  stage.setAccent('#38e1ff');
  sound.setMusic('lobby');
  host?.broadcast({ t: 'screen', screen: 'wheel', text: final ? 'Final round! Double points!' : `Round ${session.currentRound}` });
  ui.showRoundBanner(session.currentRound, session.totalRounds, final);
  if (final) voice.line('finalRound');
  else if (session.currentRound > 1) voice.line('round', { n: session.currentRound });
  await ui.wait(900);
  await stage.wheel.spinTo(catId, (speed) => {
    sound.wheelTick(speed);
    haptics.tick();
  });
  sound.categorySting();
  haptics.success();
  stage.setAccent(cat.color);
  host?.broadcast({ t: 'screen', screen: 'category', text: 'Get ready…', category: pub(cat) });
  voice.line('category', { category: cat.name });
  await ui.showCategoryReveal(cat);
  return cat;
}

async function hostParty(config: GameConfig, opts: ui.PartyOptions): Promise<void> {
  const host = new PartyHost();
  party.showMessageNoButton('Opening a room…');
  try {
    await host.open(opts.teamMode, opts.teamCount);
  } catch (e) {
    await party.showMessage("Couldn't open a room", e instanceof Error ? e.message : String(e));
    return;
  }

  for (;;) {
    host.locked = false;
    stage.setMode('idle');
    stage.setAccent('#38e1ff');
    sound.setMusic('lobby');
    const lobby = party.showLobby(host);
    host.events = { onLobby: lobby.refresh };
    host.lobbyChanged();
    if ((await lobby.started) === 'back') {
      host.close();
      return;
    }

    // Lock the line-up: only teams with players take part; late joiners slot into those teams.
    host.locked = true;
    host.teams = host.activeTeams();
    const session = new GameSession(config, BANK, Math.random, host.teams);
    host.bindScores(() => session.teams);
    host.events = {
      onHint: (teamId) => {
        if (!session.teams.some((t) => t.id === teamId) || !session.canUseHint(teamId)) return null;
        const hidden = session.useHint(teamId);
        voice.line('hint');
        return { hidden, hintsLeft: session.team(teamId).hintsLeft };
      },
    };
    host.lobbyChanged();
    stage.wheel.build(config.categories.map(getCategory));
    voice.line('intro');

    let qid = 0;
    while (session.hasNextRound()) {
      const roundStart = new Map(session.teams.map((t) => [t.id, t.score]));
      const cat = await spinForRound(session, host);
      stage.setMode('question');
      sound.setMusic('question');

      while (session.hasNextQuestion()) {
        const q = session.nextQuestion();
        qid += 1;
        host.openQuestion(qid, config.timeLimitMs);
        const opened = performance.now();
        host.each((p) => ({
          t: 'question',
          qid,
          number: q.number,
          total: session.totalQuestions,
          multiplier: session.multiplier,
          prompt: q.prompt,
          choices: q.choices,
          category: pub(cat),
          durationMs: config.timeLimitMs,
          hidden: p.teamId ? session.hiddenFor(p.teamId) : [],
          hintsLeft: p.teamId && session.teams.some((t) => t.id === p.teamId) ? session.team(p.teamId).hintsLeft : 0,
          teamSize: p.teamId ? host.membersOf(p.teamId).length : 1,
          picture: !!q.picture,
        }));

        voice.question(q.prompt, q.choices);
        const tv = party.tvQuestion(
          q,
          cat,
          config.timeLimitMs,
          session.teams,
          { number: q.number, total: session.totalQuestions, multiplier: session.multiplier },
          {
            onTension: (t) => {
              stage.setTension(t);
              sound.setIntensity(t);
            },
            onTick: (u) => sound.clockTick(u),
            allAnswered: () => host.allVoted(),
          },
        );
        host.events.onVote = (teamId) => tv.setLocked(teamId, host.teamDecided(teamId));
        await tv.done;
        host.closeQuestion();
        host.events.onVote = undefined;

        const leaderBefore = session.standings()[0];
        const leaderScoreBefore = leaderBefore.score;
        const results = session.submitAll(
          session.teams.map((t) => {
            const d = decideTeamAnswer(host.votesFor(t.id));
            return { teamId: t.id, chosen: d.choice, timeLeftMs: d.at === null ? 0 : Math.max(0, config.timeLimitMs - (d.at - opened)) };
          }),
        );
        if (results.some((r) => r.correct)) {
          sound.correct();
          stage.celebrate();
          ui.flash('rgba(80,255,170,0.35)');
        } else {
          sound.wrong();
          stage.fail();
          ui.flash('rgba(255,40,60,0.4)');
        }
        const standings = session.standings();
        const right = results.filter((r) => r.correct).length;
        const newLeader = standings[0].id !== leaderBefore.id && standings[0].score > leaderScoreBefore && (standings[1]?.score ?? -1) < standings[0].score;
        if (right === 0) voice.line('nobody');
        else if (right === results.length && results.length > 1) voice.line('everyone');
        else if (newLeader) voice.line('lead', { team: standings[0].name });
        else voice.line('correct');
        const teamsPub = host.publicTeams();
        host.each((p) => {
          const r = results.find((x) => x.teamId === p.teamId);
          return {
            t: 'reveal',
            qid,
            answer: q.answer,
            answerText: q.choices[q.answer],
            chosen: r?.chosen ?? null,
            correct: r?.correct ?? false,
            points: r?.score.total ?? 0,
            rank: standings.findIndex((t) => t.id === p.teamId) + 1,
            teams: teamsPub,
          };
        });
        await party.tvReveal(results, session.teams);
      }

      if (session.teams.length > 1 && session.hasNextRound()) {
        host.broadcast({ t: 'screen', screen: 'scores', text: 'Scores!' });
        await party.tvScores(roundStart, session.standings(), `After round ${session.currentRound}`);
      }
    }

    stage.setMode('results');
    stage.setAccent('#ffcc33');
    stage.bigCelebrate();
    sound.setMusic('results');
    sound.fanfare();
    host.broadcast({ t: 'final', teams: host.publicTeams(), yourTeamId: null });
    const top = session.standings();
    setTimeout(() => {
      if (top.length > 1 && top[0].score === top[1].score) voice.line('tie');
      else voice.line('winner', { team: top[0].name });
    }, 1500);
    const next = await party.tvFinal(session.standings(), host.mode === 'players');
    if (next === 'setup') {
      host.close();
      return;
    }
    // Rematch: back to the lobby with the same room code so people can swap teams.
    host.bindScores(() => []);
  }
}

// ---------------- Party: phone ----------------

async function joinParty(presetCode = ''): Promise<void> {
  stage.setPaused(true);
  sound.setMusic('off');
  let code = presetCode;
  for (;;) {
    const form = await joinForm(settings, code);
    if (!form) {
      stage.setPaused(false);
      return;
    }
    code = form.code;
    const client = new PartyClient(form.code, form.name);
    try {
      await client.connect();
    } catch (e) {
      client.leave();
      joinError(e instanceof Error ? e.message : String(e));
      await ui.wait(2500);
      continue;
    }
    new Controller(client);
    return new Promise(() => undefined); // the controller runs until the page closes
  }
}

// ---------------- Start ----------------

async function main(): Promise<void> {
  const joinCode = new URLSearchParams(window.location.search).get('join');
  if (joinCode) {
    // Opened from the TV's QR code: go straight to joining, no 3D stage needed.
    document.addEventListener('pointerdown', () => sound.unlock(), { once: true });
    await joinParty(joinCode.toUpperCase().slice(0, 4));
  }

  stage.wheel.build(CATEGORIES);
  stage.setMode('idle');
  for (;;) {
    stage.setMode('idle');
    stage.setAccent('#38e1ff');
    const choice = await ui.showTitle(openSettings);
    sound.unlock();
    applySettings(settings);
    sound.chime();
    haptics.tap();

    if (choice === 'join') {
      await joinParty();
      continue;
    }
    sound.setMusic('lobby');
    const config = await ui.showSetup(settings, openSettings, choice === 'host');
    saveSettings(settings);
    if (choice === 'host') {
      await hostParty(config, config.party);
      continue;
    }
    let solo = config;
    for (;;) {
      const next = await playGame(solo);
      if (next === 'setup') {
        stage.setMode('idle');
        stage.setAccent('#38e1ff');
        sound.setMusic('lobby');
        solo = await ui.showSetup(settings, openSettings);
        saveSettings(settings);
      }
    }
  }
}

void main();
