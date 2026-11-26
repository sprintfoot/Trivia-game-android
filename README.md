# Trivia Party (working title)

An original party trivia game for Android, built with three.js and wrapped as a native app with Capacitor.

Play solo on one phone, or host a party on a TV where everyone answers on their own phone (iPhone or Android, no app needed for players).

## What's in phase 1

- **3D neon game-show stage** (three.js): sweeping spotlights, light beams, neon arches, a scrolling grid floor, bloom glow, and a floating crystal that speeds up and turns red as time runs out.
- **3D category wheel** that spins for each round, with chasing bulbs, peg ticks and a glowing winning segment.
- **18 categories, 391 original questions** (`src/data/questions.json`): General Knowledge, Movies, Disney & Pixar, TV Shows, Music, Pop Stars, Superheroes, Animals, Sports, Food & Drink, Science, Space, History, Geography, Holidays, Brands, Throwback and Tech & Gaming. Each question is tagged kids/teen/adult, and there are no repeats until a category runs out.
- **Scoring**: 500 for a right answer, up to 500 more for speed, +100 per answer once you're on a 3+ streak, and double points in the final round. All numbers live in `src/game/scoring.ts`.
- **Juice**: confetti and fireworks on correct answers, screen shake and buzzer on wrong ones, animated score count-ups and a results screen with personal best.
- **Sound**: every effect and the music are synthesised live with the Web Audio API (`src/audio/sound.ts`), so they're all original and there's nothing to license. The music speeds up and adds drums as the timer runs down, and ducks under sound effects. Recorded samples can be layered in later with `sound.loadSample()`.
- **Haptics** on taps, ticks, right and wrong answers (Capacitor Haptics on Android, `navigator.vibrate` on the web).
- **Settings**: sound, music, vibration, and graphics quality (Auto drops to Low on slow phones).

## How to play a party game

You need one screen everyone can see (the **host**), and everyone's phones.

**1. Set up the host screen.** Use any of these:
- An Android TV / Google TV with the app installed.
- An Android phone or tablet with the app, cast or mirrored to your TV.
- A laptop plugged into the TV, with the game open at **https://sprintfoot.github.io/Trivia-game-android/**.

**2. Open a room.** On the host, tap **HOST A PARTY**. Pick how you want to play:
- **2, 3, 4 or 6 teams**: friends join a team and answer together.
- **Solo players**: everyone plays for themselves.

Then pick categories, ages, rounds and timer, and tap **OPEN THE LOBBY**. The TV shows a QR code and a 4-letter room code.

**3. Everyone joins on their phone.** iPhone or Android, no app needed:
- Point the phone camera at the QR code and tap the link, **or**
- Go to **sprintfoot.github.io/Trivia-game-android**, tap **JOIN A GAME** and type the code.

Type your name. In team games, tap the team you want to be on (you're placed on the smallest team to start). Names pop up on the TV as people join.

**4. Start.** When everyone's in, tap **START GAME** on the host.

**Want to play too?** If you're running the host screen, tap **I'M PLAYING TOO** in the lobby (then tap a team to join it). You answer by tapping the answers on the host screen, or with 1-4 / A-D on a keyboard or remote. Or just join from your own phone like everyone else.

**5. Play.** Each round the wheel picks a category. The question and answers show on the TV; your phone shows the answer buttons.
- **Teams vote.** Each teammate taps an answer and sees teammates' votes live. The team's answer is its most popular vote (ties go to whichever was picked first), and you can change your vote until time runs out.
- The question ends as soon as everyone has voted, or when the timer runs out. Faster answers score more.
- **Hints:** anyone on a team can tap 💡 50/50 to remove two wrong answers for their team. It uses one of the team's hints and halves that question's points.
- After each question the TV shows the answer, which team picked what, and points. After each round there's a scoreboard. The last round is worth double.

**6. Rematch.** At the end, **REMATCH** goes back to the lobby with the same code, so phones can stay connected and people can swap teams.

**If a phone drops out** (screen locked, Wi-Fi blip), it reconnects by itself and keeps its team and score. Players work best on the same Wi-Fi as the host; mobile data usually works too.

**How it connects:** phones talk directly to the host. A free public PeerJS server only introduces them at the start, so there's nothing to set up and no account needed.

## Playing on a TV

- **Android TV / Google TV:** install the APK on the TV (it shows up in the TV's app row). Use the remote's arrows and OK button, or press 1–4 on a keyboard to answer and H for a hint.
- **Phone or tablet + TV:** turn the phone sideways (the layout switches to landscape) and cast or mirror the screen to the TV. The app runs full screen with the system bars hidden.
- **Laptop + HDMI:** run the web version, press the ⛶ full-screen button on the title screen.

## Picture Reveal rounds

The **Picture Reveal** category (125 questions) has five kinds of picture that uncover while the clock runs, so faster guesses score more:
- **Flags:** a 6×4 grid of tiles flips away to reveal a country's flag.
- **Emoji movies:** emoji clues pop in one by one and spell out a film (🦁👑 → The Lion King).
- **Zoom out:** starts zoomed right into an animal and slowly pulls back.
- **Shadows:** a black silhouette that slowly fills in with color.
- **Pixels:** starts as a handful of giant pixels and sharpens step by step.

No photos, movie stills or brand logos are bundled, because those are copyrighted. Flags are drawn from the MIT-licensed [flag-icons](https://github.com/lipis/flag-icons) project (licence in `src/assets/flags/LICENSE`), and emoji come from the phone's own emoji font. In party games, the picture shows on the TV and phones show the answer buttons.

## Fill in the Blank

The **Fill in the Blank** category has no answer buttons: you type the missing word. In a party game everyone types on their phone and sees teammates' guesses. If most of a team gets it right, the team scores. Matching is forgiving: case, accents, punctuation, "the/a/an" and a small typo are all fine, and numbers can be typed as digits or words ("8" or "eight").

## Avatars

When you join, pick one of 16 original cartoon characters. Your character shows in the lobby and along the bottom of the TV, with a ✓ once you've answered. Get it right and your character cheers. Get it wrong (or run out of time) and it takes a tomato to the face or a bop on the head with a cartoon mallet, on the TV and on your phone.

## Real or Made Up, Brain Teasers and Closest Guess

- **Real or Made Up** (40 statements): common myths and surprising true facts. Is it real, or did someone make it up?
- **Brain Teasers**: riddles, anagrams (type the unscrambled word) and ordering puzzles (put four things in order by year, height or age).
- **Closest Guess** (25 questions): type a number. Within 10% of the answer scores, and in a party game the closest team scores too. Numbers can be typed like "1,200", "1.2k" or "about 300".

## Lightning round and final wager

Both are on by default and can be switched off in setup under **Special rounds**.

- **⚡ Lightning round:** five quick questions, eight seconds each, from all your categories, just before the final round.
- **🎲 Final wager:** one last question. Each team bets some or all of its points (at least 500 can always be bet, so nobody is shut out). Right wins the bet, wrong loses it.

## Who Am I?

The **Who Am I?** category (40 famous people: painters, musicians, composers, actors, directors, athletes and writers) shows four clues, one at a time, hardest first. Answer early on fewer clues for more points.
## Staten Island

The **Staten Island** category (35 questions) covers the ferry, the bridges, neighborhoods, landmarks, history, food, sports and famous Staten Islanders. Facts were checked against public sources. It's off by default, so tick it in setup.

## Holiday packs

Six packs of about 15 questions each: 🎄 Christmas, 🎃 Halloween, 🦃 Thanksgiving, 💘 Valentine's Day, 🎆 Fourth of July and 🎉 New Year's. They're listed in setup under **Local & holiday packs** with Staten Island, and the pack for the current season is marked "In season" at the front.

## Name That Tune

The **Name That Tune** category plays a melody and you pick its title. The tune plays a bit at a
time: first the opening, then a longer stretch, then the whole thing on a loop until the answer is
shown, so fast ears score more. The background music goes quiet while a tune plays, and the host
voice doesn't read these questions out.

- All 31 melodies are public domain (nursery songs, carols, folk songs and classical pieces). The
  app plays its own synthesised arrangement, so there are no recordings to license.
- Advertising jingles are still under copyright, so they're asked about in words only (for
  example, "Which cereal goes 'Snap! Crackle! Pop!'?"). None are played.
- In a party game the tune plays on the TV only. Phones show "Listen to the TV!".

## Host voice

A game-show host cracks original one-liners throughout the game: at the start, each round, the category, right and wrong answers, streaks, hints, lead changes and the winner. With **Read questions aloud** on (Settings), the host also reads each question and its answers.

The voice is a natural-sounding recording, not the robotic phone voice. Every line and every question was recorded ahead of time with [Kokoro](https://github.com/hexgrad/kokoro), an open voice model (Apache-2.0), and ships with the game in `public/voice/` (about 14 MB of MP3s). Lines with a name in them are recorded for every category and every preset team name. Custom player names in Solo players mode get a line without the name. Anything without a recording falls back to the device's own text-to-speech.

**After adding questions or lines,** re-record (only new lines are recorded):

```
node scripts/voice/texts.mjs /tmp/voice-texts.json
.venv-voice/bin/python scripts/voice/gen.py /tmp/voice-texts.json <model dir> public/voice
```

Setup steps are at the top of `scripts/voice/gen.py`. A test fails if any line is missing a recording.

## Music

All music is original and synthesised live in the app: a game-show theme on the title and setup screens, a "here we go" fanfare when a game starts, and adaptive music during questions that speeds up as the timer runs down.

## Daily Challenge

**📅 Daily Challenge** on the title screen: the same 10 mixed questions for everyone on the same day (20 seconds each, no hints). Your first run of the day counts; after that it's practice. Play on back-to-back days to build a 🔥 streak, and tap **Share result** for a spoiler-free 🟩🟥 grid to paste in the family group chat.

## Hall of Fame and awards

Every finished game is saved on the device. **🏆 Hall of Fame** on the title screen shows the top 10 scores (solo and party), lifetime stats, a trophy case and your best and weakest categories.

At the end of a game, players and teams earn fun awards: ⚡ Speed Demon, 🔥 On Fire, 🧠 Big Brain, ⏱️ Clutch, 🌩️ Storm Chaser, 🎯 Sharpshooter, 🎲 High Roller, 🙌 No Help Needed, and a champ award for the best category. In a party game they show on the TV and on each winner's phone.

## Getting home

Tap 🏠 in the top-left corner (or press Back or Escape) to return to the title screen. During a game you're asked first. If you're hosting, this closes the room and every phone is told the game ended. On a phone it leaves the room, and before the game starts your name is removed from the lobby.

## Game options

- **Mix categories** (on by default): every round mixes your chosen categories one question at a time, so a picture can follow a tune and then a trivia question. Turn it off to spin the wheel for one category per round instead.
- Pick any mix of categories, 2–6 rounds, 3/5/7/10 questions per round, and a 10–30 second timer.
- **Most players are:** Kids (6–10), Teens (11–15) or Adults. Kids only get kid-friendly questions; teens never get adult ones.
- **50/50 hints:** Off, 1, 3 or 5 per game. A hint removes two wrong answers but halves that question's points.

## Run it

```bash
npm install
npm run dev        # open the printed URL on your computer or phone (same Wi-Fi)
npm test           # game logic tests
```

## Build the Android app

**Easiest:** every push and pull request runs the **Build Android APK** GitHub Action. It publishes the APK to the **Latest test build** pre-release on the repo's Releases page. Open that page on your phone, tap `trivia-party.apk`, and install it (you'll need to allow installs from unknown sources).

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
| `src/ui/` | Screens: title, setup, round intro, question, reveal, results, settings, party lobby/TV screens |
| `src/net/` | Party networking: host, phone client, message protocol |
| `src/controller.ts` | The phone controller for party games |
| `src/data/questions.json` | Question bank |
| `android/` | Capacitor Android project |

## Roadmap

1. ~~Setup~~
2. ~~Solo prototype~~ (this)
3. ~~Multiplayer: room codes, QR join, teams, live scoreboard~~
4. Call Out head-to-head mechanic, more reveal animations
5. Bigger question bank
6. Icon, final name, Play Store internal testing
