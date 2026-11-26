import './styles.css';
import bank from './data/questions.json';
import { CATEGORIES, getCategory } from './game/categories';
import { GameSession, type BankQuestion, type GameConfig } from './game/session';
import { Stage } from './scene/stage';
import { sound } from './audio/sound';
import { haptics, setHapticsEnabled } from './audio/haptics';
import { loadSettings, saveSettings, type Settings } from './settings';
import * as ui from './ui/ui';

const BANK = bank as BankQuestion[];
const settings = loadSettings();
const stage = new Stage(document.getElementById('stage') as HTMLCanvasElement, settings.quality);
stage.onFirework = () => sound.firework();

function applySettings(s: Settings): void {
  sound.setEnabled(s.sound);
  sound.setMusicEnabled(s.music);
  setHapticsEnabled(s.haptics);
  stage.setQuality(s.quality);
  saveSettings(s);
}
applySettings(settings);
const openSettings = () => ui.openSettings(settings, applySettings);

async function playGame(config: GameConfig): Promise<'again' | 'setup'> {
  const session = new GameSession(config, BANK);
  stage.wheel.build(config.categories.map(getCategory));

  while (session.hasNextRound()) {
    const catId = session.startRound();
    const cat = getCategory(catId);

    // Spin the wheel for this round's category.
    stage.setMode('wheel');
    stage.setAccent('#38e1ff');
    sound.setMusic('lobby');
    ui.showRoundBanner(session.currentRound, session.totalRounds, session.isFinalRound && session.totalRounds > 1);
    await ui.wait(900);
    await stage.wheel.spinTo(catId, (speed) => {
      sound.wheelTick(speed);
      haptics.tick();
    });
    sound.categorySting();
    haptics.success();
    stage.setAccent(cat.color);
    await ui.showCategoryReveal(cat);

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
        useHint: () => session.useHint(),
      });
      const before = session.score;
      const result = session.submit(pick.chosen, pick.timeLeftMs);

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

async function main(): Promise<void> {
  stage.wheel.build(CATEGORIES);
  stage.setMode('idle');
  await ui.showTitle(openSettings);
  sound.unlock();
  applySettings(settings);
  sound.chime();
  haptics.tap();
  sound.setMusic('lobby');

  let config = await ui.showSetup(settings, openSettings);
  saveSettings(settings);
  for (;;) {
    const next = await playGame(config);
    if (next === 'setup') {
      stage.setMode('idle');
      stage.setAccent('#38e1ff');
      sound.setMusic('lobby');
      config = await ui.showSetup(settings, openSettings);
      saveSettings(settings);
    }
  }
}

void main();
