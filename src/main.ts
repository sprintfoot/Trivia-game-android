import './styles.css';
import { BANK } from './data/bank';
import { CATEGORIES, getCategory, type Category, type CategoryId } from './game/categories';
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
import { isMatch } from './game/match';
import { DEFAULT_AVATAR } from './game/avatars';
import { isTyped, parseGuess } from './game/session';
import { computeAwards } from './game/awards';
import { addGame, gameRecord, loadHall, saveHall, topScores, emptyHall } from './game/hall';
import { awardsHtml, showHall } from './ui/hall';

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
  sound.introStinger();
  voice.line('intro');

  while (session.hasNextRound()) {
    const cat = await spinForRound(session, null);

    stage.setMode('question');
    sound.setMusic('question');
    if (session.roundKind === 'wager') {
      const bet = await ui.askWager(cat, session.score, session.maxWager());
      session.setWager('solo', bet);
      stage.setMode('question');
    }
    while (session.hasNextQuestion()) {
      const q = session.nextQuestion();
      const qcat = catFor(session, cat, q);
      if (qcat !== cat) stage.setAccent(qcat.color);
      const hud: ui.Hud = {
        score: session.score,
        streak: session.streak,
        round: session.currentRound,
        totalRounds: session.totalRounds,
        questionNumber: q.number,
        totalQuestions: session.totalQuestions,
        multiplier: session.multiplier,
      };
      if (q.picture?.kind !== 'tune') voice.question(q.prompt, isTyped(q) ? [] : q.choices);
      const pick = await ui.askQuestion(q, qcat, session.timeLimitMs, hud, {
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
      const result = session.submit(pick.chosen, pick.timeLeftMs, pick.guess);

      if (result.correct) {
        if (result.streak >= 3) voice.line('streak', { n: result.streak });
        else if (pick.timeLeftMs > session.timeLimitMs * 0.7) voice.line('fast');
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
      await ui.showReveal(result, before, () => sound.points(), pick.typed, settings.avatar || DEFAULT_AVATAR);
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
  const me = { ...session.teams[0], name: settings.playerName?.trim() || 'You' };
  const awards = computeAwards(session.history, [me]);
  const rec = gameRecord('solo', [me], session.history, awards);
  const hall = addGame(loadHall(), rec);
  saveHall(hall);
  const rank = topScores(hall, 10).findIndex((e) => e.at === rec.at && e.score === me.score) + 1;
  return ui.showResults(
    {
      score: session.score,
      correct: session.correctCount,
      total: session.history.length,
      bestStreak: session.bestStreak,
      newBest,
      previousBest,
      awardsHtml: awardsHtml(awards),
      hallRank: rank || undefined,
    },
    () => sound.points(),
  );
}

// ---------------- Party: host (TV) ----------------

const pub = (c: Category): PublicCategory => ({ name: c.name, icon: c.icon, color: c.color });

/** Stands in for a category during the lightning round, whose questions come from all of them. */
const LIGHTNING_CAT: Category = { id: 'general', name: 'Lightning Round', icon: '⚡', color: '#ffe14d' };

/** Stands in for a category during a mixed round, whose questions come from all of them. */
const MIXED_CAT: Category = { id: 'general', name: 'Mixed Round', icon: '🔀', color: '#38e1ff' };

/** The category to show with a question: its own one when the round mixes categories. */
const catFor = (session: GameSession, roundCat: Category, q: { category: CategoryId }): Category =>
  session.roundKind === 'lightning' || (session.roundKind === 'normal' && session.mixed) ? getCategory(q.category) : roundCat;

async function spinForRound(session: GameSession, host: PartyHost | null): Promise<Category> {
  const catId = session.startRound();
  const cat = getCategory(catId);
  const kind = session.roundKind;
  const final = session.isFinalRound && session.config.rounds > 1;
  // Mixed rounds have no wheel to spin: show the round's categories over the stage instead.
  stage.setMode(kind === 'normal' && session.mixed ? 'question' : 'wheel');
  stage.setAccent(kind === 'lightning' ? '#ffe14d' : '#38e1ff');
  sound.setMusic('lobby');
  host?.broadcast({
    t: 'screen',
    screen: 'wheel',
    text: kind === 'lightning' ? '⚡ Lightning round!' : kind === 'wager' ? '🎲 Final wager!' : final ? 'Final round! Double points!' : `Round ${session.currentRound}`,
  });
  const mixed = kind === 'normal' && session.mixed;
  ui.showRoundBanner(session.currentRound, session.totalRounds, final, kind, mixed ? session.config.categories.map(getCategory) : null);
  if (mixed) {
    if (final) voice.line('finalRound');
    else if (session.currentRound > 1) voice.line('mixedRound', { n: session.currentRound });
    else voice.line('mixed');
    await ui.wait(2600);
    return MIXED_CAT;
  }
  if (kind === 'lightning') {
    voice.line('lightning');
    sound.introStinger();
    await ui.wait(3200);
    return LIGHTNING_CAT;
  }
  if (kind === 'wager') voice.line('wager');
  else if (final) voice.line('finalRound');
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
    const lobby = party.showLobby(host, settings.playerName?.trim() || 'Host', settings.avatar || undefined);
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
    let tvNow: ReturnType<typeof party.tvQuestion> | null = null;
    host.events = {
      onHint: (teamId) => {
        if (!session.teams.some((t) => t.id === teamId) || !session.canUseHint(teamId)) return null;
        const hidden = session.useHint(teamId);
        voice.line('hint');
        // A teammate's hint also clears answers on the host's screen when the host is playing.
        if (host.localPlayer?.teamId === teamId) tvNow?.hide(hidden);
        return { hidden, hintsLeft: session.team(teamId).hintsLeft };
      },
    };
    host.lobbyChanged();
    stage.wheel.build(config.categories.map(getCategory));
    sound.introStinger();
    voice.line('intro');

    let qid = 0;
    while (session.hasNextRound()) {
      const roundStart = new Map(session.teams.map((t) => [t.id, t.score]));
      const cat = await spinForRound(session, host);
      if (session.roundKind === 'wager') await partyWager(session, host, cat);
      stage.setMode('question');
      sound.setMusic('question');

      while (session.hasNextQuestion()) {
        const q = session.nextQuestion();
        const qcat = catFor(session, cat, q);
        if (qcat !== cat) stage.setAccent(qcat.color);
        qid += 1;
        const accept = q.accept;
        host.matcher = accept ? (text) => isMatch(text, accept) : q.estimate ? (text) => parseGuess(text) !== null : null;
        host.openQuestion(qid, session.timeLimitMs);
        const opened = performance.now();
        host.each((p) => ({
          t: 'question',
          qid,
          number: q.number,
          total: session.totalQuestions,
          multiplier: session.multiplier,
          prompt: q.prompt,
          // Never send a fill-in-the-blank answer to the phones.
          choices: isTyped(q) ? [] : q.choices,
          category: pub(qcat),
          durationMs: session.timeLimitMs,
          hidden: p.teamId ? session.hiddenFor(p.teamId) : [],
          hintsLeft: p.teamId && session.teams.some((t) => t.id === p.teamId) && session.canUseHint(p.teamId) ? session.team(p.teamId).hintsLeft : 0,
          teamSize: p.teamId ? host.membersOf(p.teamId).length : 1,
          media: q.picture ? (q.picture.kind === 'tune' ? 'tune' : 'picture') : null,
          typed: isTyped(q),
          numeric: !!q.estimate,
        }));

        if (q.picture?.kind !== 'tune') voice.question(q.prompt, isTyped(q) ? [] : q.choices);
        const me = host.localPlayer;
        const myTeam = me?.teamId && session.teams.some((t) => t.id === me.teamId) ? me.teamId : null;
        const tv = party.tvQuestion(
          q,
          qcat,
          session.timeLimitMs,
          session.teams,
          { number: q.number, total: session.totalQuestions, multiplier: session.multiplier },
          {
            onTension: (t) => {
              stage.setTension(t);
              sound.setIntensity(t);
            },
            onTick: (u) => sound.clockTick(u),
            allAnswered: () => host.allVoted(),
            crowd: host.publicTeams().filter((t) => session.teams.some((s) => s.id === t.id)),
            local:
              me && myTeam
                ? {
                    name: me.name,
                    hintsLeft: session.canUseHint(myTeam) ? session.team(myTeam).hintsLeft : 0,
                    numeric: !!q.estimate,
                    onPick: (i) => host.localVote(i),
                    onGuess: (text) => host.localGuess(text),
                    onHint: () => host.localHint()?.hidden ?? null,
                  }
                : undefined,
          },
        );
        tvNow = tv;
        if (myTeam) tv.hide(session.hiddenFor(myTeam));
        host.events.onVote = (teamId, playerId) => {
          tv.setLocked(teamId, host.teamDecided(teamId));
          tv.voted(playerId);
        };
        await tv.done;
        host.closeQuestion();
        host.matcher = null;
        host.events.onVote = undefined;

        const leaderBefore = session.standings()[0];
        const leaderScoreBefore = leaderBefore.score;
        const results = session.submitAll(
          session.teams.map((t) => {
            const d = decideTeamAnswer(host.votesFor(t.id));
            // Closest guess: the team's number is the middle of its members' guesses.
            const guesses = q.estimate ? host.teamTexts(t.id).map(parseGuess).filter((n): n is number => n !== null) : [];
            return {
              teamId: t.id,
              chosen: d.choice,
              timeLeftMs: d.at === null ? 0 : Math.max(0, session.timeLimitMs - (d.at - opened)),
              guess: guesses.length ? median(guesses) : null,
            };
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
        await party.tvReveal(
          results,
          session.teams,
          q.accept
            ? new Map(results.map((r) => [r.teamId, host.teamText(r.teamId, r.chosen)]))
            : q.estimate
              ? new Map(results.map((r) => [r.teamId, r.guess == null ? undefined : r.guess.toLocaleString('en-US')]))
              : undefined,
        );
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
    const standings = session.standings();
    const awards = computeAwards(session.history, standings);
    saveHall(addGame(loadHall(), gameRecord('party', standings, session.history, awards)));
    host.broadcast({ t: 'final', teams: host.publicTeams(), yourTeamId: null, awards });
    const top = session.standings();
    setTimeout(() => {
      if (top.length > 1 && top[0].score === top[1].score) voice.line('tie');
      else voice.line('winner', { team: top[0].name });
    }, 1500);
    const next = await party.tvFinal(standings, host.mode === 'players', awardsHtml(awards, new Map(standings.map((t) => [t.id, t.name]))));
    if (next === 'setup') {
      host.close();
      return;
    }
    // Rematch: back to the lobby with the same room code so people can swap teams.
    host.bindScores(() => []);
  }
}

/** Final wager: every team bets on its phones (or the host on the TV) before the last question. */
async function partyWager(session: GameSession, host: PartyHost, cat: Category): Promise<void> {
  const DURATION = 20000;
  const bets = new Set<string>();
  const me = host.localPlayer;
  const myTeam = me?.teamId && session.teams.some((t) => t.id === me.teamId) ? me.teamId : null;
  const inGame = (teamId: string | null): teamId is string => !!teamId && session.teams.some((t) => t.id === teamId);
  const tv = party.tvWager(
    cat,
    session.teams,
    DURATION,
    // Done once every team with someone online has bet.
    () => session.teams.every((t) => bets.has(t.id) || host.membersOf(t.id).every((m) => !m.conn && !m.local)),
    me && myTeam ? { name: me.name, max: session.maxWager(myTeam), onBet: (amount) => host.localBet(amount) } : undefined,
  );
  host.events.onBet = (teamId, amount) => {
    if (!inGame(teamId)) return null;
    const accepted = session.setWager(teamId, amount);
    bets.add(teamId);
    tv.setBet(teamId, accepted);
    return accepted;
  };
  host.each((p) => ({
    t: 'wager',
    max: inGame(p.teamId) ? session.maxWager(p.teamId) : 0,
    score: inGame(p.teamId) ? session.team(p.teamId).score : 0,
    category: pub(cat),
    durationMs: DURATION,
  }));
  await tv.done;
  // A moment for late taps to land, then lock the bets.
  await ui.wait(1200);
  host.events.onBet = undefined;
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
    const client = new PartyClient(form.code, form.name, form.avatar);
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
  // Browsers only allow sound after a tap or key press; the Android app allows it straight away.
  const wake = () => sound.unlock();
  document.addEventListener('pointerdown', wake, { once: true });
  document.addEventListener('keydown', wake, { once: true });
  sound.unlock();
  for (;;) {
    stage.setMode('idle');
    stage.setAccent('#38e1ff');
    sound.setMusic('intro');
    const choice = await ui.showTitle(openSettings);
    sound.unlock();
    applySettings(settings);
    sound.chime();
    haptics.tap();

    if (choice === 'join') {
      await joinParty();
      continue;
    }
    if (choice === 'hall') {
      await showHall(loadHall(), () => {
        saveHall(emptyHall());
        return emptyHall();
      });
      continue;
    }
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
        sound.setMusic('intro');
        solo = await ui.showSetup(settings, openSettings);
        saveSettings(settings);
      }
    }
  }
}

void main();

function median(xs: number[]): number {
  const s = xs.slice().sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2);
}
