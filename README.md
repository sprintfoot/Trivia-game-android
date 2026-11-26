# Trivia Party (working title)

An original party trivia game for Android, built with three.js and wrapped as a native app with Capacitor.

This is **phase 1: the one-phone game**. Multiplayer rooms with join codes come in phase 2.

## What's in phase 1

- **3D neon game-show stage** (three.js): sweeping spotlights, light beams, neon arches, a scrolling grid floor, bloom glow, and a floating crystal that speeds up and turns red as time runs out.
- **3D category wheel** that spins for each round, with chasing bulbs, peg ticks and a glowing winning segment.
- **9 categories, 90 original questions** (`src/data/questions.json`), with no repeats until a category runs out.
- **Scoring**: 500 for a right answer, up to 500 more for speed, +100 per answer once you're on a 3+ streak, and double points in the final round. All numbers live in `src/game/scoring.ts`.
- **Juice**: confetti and fireworks on correct answers, screen shake and buzzer on wrong ones, animated score count-ups and a results screen with personal best.
- **Sound**: every effect and the music are synthesised live with the Web Audio API (`src/audio/sound.ts`), so they're all original and there's nothing to license. The music speeds up and adds drums as the timer runs down, and ducks under sound effects. Recorded samples can be layered in later with `sound.loadSample()`.
- **Haptics** on taps, ticks, right and wrong answers (Capacitor Haptics on Android, `navigator.vibrate` on the web).
- **Settings**: sound, music, vibration, and graphics quality (Auto drops to Low on slow phones).

## Run it

```bash
npm install
npm run dev        # open the printed URL on your computer or phone (same Wi-Fi)
npm test           # game logic tests
```

## Build the Android app

**Easiest:** every push and pull request runs the **Build Android APK** GitHub Action. Open the run under the repo's Actions tab and download `trivia-party-debug-apk`, then install it on your phone (you'll need to allow installs from unknown sources).

**Locally** (needs Android Studio):

```bash
npm run android:sync   # builds the web game and copies it into android/
npm run android:open   # opens Android Studio; press Run with your phone plugged in
```

## Project layout

| Path | What it is |
|---|---|
| `src/game/` | Pure game logic: categories, scoring, game session (unit-tested) |
| `src/scene/` | three.js stage, category wheel, confetti and fireworks |
| `src/audio/` | Synthesised sound effects, adaptive music, haptics |
| `src/ui/` | Screens: title, setup, round intro, question, reveal, results, settings |
| `src/data/questions.json` | Question bank |
| `android/` | Capacitor Android project |

## Roadmap

1. ~~Setup~~
2. ~~Solo prototype~~ (this)
3. Multiplayer: Firebase room codes, lobby, synced questions, live scoreboard
4. Call Out head-to-head mechanic, more reveal animations
5. Bigger question bank
6. Icon, final name, Play Store internal testing
