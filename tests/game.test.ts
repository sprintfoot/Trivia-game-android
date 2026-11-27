import { describe, expect, it } from 'vitest';
import { BANK } from '../src/data/bank';
import { CATEGORIES } from '../src/game/categories';
import { scoreAnswer, SCORING } from '../src/game/scoring';
import { GameSession, mulberry32, parseGuess, type GameConfig } from '../src/game/session';
import { decideTeamAnswer, makeRoomCode } from '../src/game/teams';
import { isMatch, normalize } from '../src/game/match';
import { AVATARS, avatarSvg } from '../src/game/avatars';

const config = (over: Partial<GameConfig> = {}): GameConfig => ({
  categories: ['science', 'history', 'music'],
  rounds: 3,
  questionsPerRound: 3,
  timeLimitMs: 15000,
  ...over,
});

describe('question bank', () => {
  it('has well-formed questions for every category', () => {
    const ids = new Set<string>();
    for (const q of BANK) {
      expect(ids.has(q.id)).toBe(false);
      ids.add(q.id);
      if (q.accept) {
        // Fill in the blank: one shown answer, which is also accepted.
        expect(q.choices).toHaveLength(1);
        expect(q.answer).toBe(0);
        expect(isMatch(q.choices[0], q.accept)).toBe(true);
      } else if (q.estimate) {
        // Closest guess: the shown answer is the number itself.
        expect(q.choices).toHaveLength(1);
        expect(parseGuess(q.choices[0])).toBe(q.estimate.value);
      } else if (q.fixedOrder) {
        // Real or made up: two answers in a fixed order.
        expect(q.choices).toEqual(['Real', 'Made up']);
        expect([0, 1]).toContain(q.answer);
      } else {
        expect(q.choices).toHaveLength(4);
        expect(new Set(q.choices).size).toBe(4);
        expect(q.answer).toBeGreaterThanOrEqual(0);
        expect(q.answer).toBeLessThan(4);
      }
      expect(['kids', 'teen', 'adult']).toContain(q.age);
      expect(CATEGORIES.some((c) => c.id === q.category)).toBe(true);
    }
    expect(BANK.length).toBeGreaterThanOrEqual(380);
    for (const c of CATEGORIES) {
      if (c.id === 'custom') continue; // written by the players
      const qs = BANK.filter((q) => q.category === c.id);
      expect(qs.length).toBeGreaterThanOrEqual(15);
      // Enough kid-friendly questions that kids games don't fall back to the full category.
      expect(qs.filter((q) => q.age === 'kids').length).toBeGreaterThanOrEqual(4);
    }
  });
});

describe('scoreAnswer', () => {
  const base = { timeLimitMs: 10000, streakBefore: 0, multiplier: 1 };

  it('gives nothing for a wrong answer', () => {
    expect(scoreAnswer({ ...base, correct: false, timeLeftMs: 9000 }).total).toBe(0);
  });

  it('adds a speed bonus that shrinks with time', () => {
    expect(scoreAnswer({ ...base, correct: true, timeLeftMs: 10000 }).total).toBe(1000);
    expect(scoreAnswer({ ...base, correct: true, timeLeftMs: 5000 }).total).toBe(750);
    expect(scoreAnswer({ ...base, correct: true, timeLeftMs: 0 }).total).toBe(500);
  });

  it('adds a streak bonus from the third correct answer in a row', () => {
    expect(scoreAnswer({ ...base, correct: true, timeLeftMs: 0, streakBefore: 1 }).streak).toBe(0);
    expect(scoreAnswer({ ...base, correct: true, timeLeftMs: 0, streakBefore: 2 }).streak).toBe(SCORING.streakBonus);
  });

  it('applies the multiplier to the whole answer', () => {
    expect(scoreAnswer({ ...base, correct: true, timeLeftMs: 10000, multiplier: 2 }).total).toBe(2000);
  });
});

describe('GameSession', () => {
  it('plays a full game and doubles points in the final round', () => {
    const s = new GameSession(config(), BANK, mulberry32(42));
    let rounds = 0;
    while (s.hasNextRound()) {
      const cat = s.startRound();
      rounds += 1;
      expect(s.multiplier).toBe(rounds === 3 ? 2 : 1);
      while (s.hasNextQuestion()) {
        const q = s.nextQuestion();
        expect(q.category).toBe(cat);
        s.submit(q.answer, 15000);
      }
    }
    expect(rounds).toBe(3);
    expect(s.history).toHaveLength(9);
    expect(s.correctCount).toBe(9);
    expect(s.bestStreak).toBe(9);
    // Rounds 1-2: 6 answers worth 1000, plus streak bonus from answer 3 onward (7 answers).
    // Round 3: 3 answers worth (1000 + 100) * 2.
    expect(s.score).toBe(6 * 1000 + 4 * 100 + 3 * 1100 * 2);
  });

  it('keeps the correct answer after shuffling choices', () => {
    const s = new GameSession(config(), BANK, mulberry32(7));
    s.startRound();
    const q = s.nextQuestion();
    const original = BANK.find((b) => b.id === q.id)!;
    expect(q.choices[q.answer]).toBe(original.choices[original.answer]);
  });

  it('resets the streak on a wrong or timed-out answer', () => {
    const s = new GameSession(config(), BANK, mulberry32(1));
    s.startRound();
    const q1 = s.nextQuestion();
    s.submit(q1.answer, 1000);
    s.nextQuestion();
    const r = s.submit(null, 5000);
    expect(r.correct).toBe(false);
    expect(r.score.total).toBe(0);
    expect(s.streak).toBe(0);
  });

  it('spreads rounds over the chosen categories', () => {
    const s = new GameSession(config({ rounds: 3 }), BANK, mulberry32(3));
    expect(new Set(s.roundCategories).size).toBe(3);
  });

  it('never repeats a question until the category runs out', () => {
    const s = new GameSession(config({ categories: ['tech'], rounds: 2, questionsPerRound: 5 }), BANK, mulberry32(9));
    const seen = new Set<string>();
    while (s.hasNextRound()) {
      s.startRound();
      while (s.hasNextQuestion()) {
        const q = s.nextQuestion();
        expect(seen.has(q.id)).toBe(false);
        seen.add(q.id);
        s.submit(null, 0);
      }
    }
    expect(seen.size).toBe(10);
  });
});

describe('picture questions', () => {
  it('builds flag, emoji and zoom rounds with four distinct choices', () => {
    const pics = BANK.filter((q) => q.picture && q.picture.kind !== 'tune' && q.picture.kind !== 'clues' && q.picture.kind !== 'photo');
    expect(pics.length).toBeGreaterThanOrEqual(80);
    expect(new Set(pics.map((q) => q.picture!.kind))).toEqual(new Set(['flag', 'emoji', 'zoom', 'shadow', 'pixel']));
    for (const q of pics) {
      expect(q.category).toBe('pictures');
      expect(new Set(q.choices).size).toBe(4);
    }
    const france = pics.find((q) => q.id === 'flag-fr')!;
    expect(france.choices[france.answer]).toBe('France');
  });

  it('builds Who Am I? questions with four clues that never name the answer', () => {
    const who = BANK.filter((q) => q.category === 'whoami');
    expect(who.length).toBeGreaterThanOrEqual(40);
    for (const q of who) {
      expect(q.picture?.kind).toBe('clues');
      if (q.picture?.kind !== 'clues') continue;
      expect(q.picture.clues).toHaveLength(4);
      expect(new Set(q.choices).size).toBe(4);
      const surname = q.choices[q.answer].split(' ').at(-1)!.toLowerCase();
      for (const c of q.picture.clues) expect(c.toLowerCase()).not.toContain(surname);
    }
  });
});

describe('age groups', () => {
  it('only serves kids questions to kids when enough exist', () => {
    const s = new GameSession(config({ categories: ['sports'], ageGroup: 'kids', rounds: 1, questionsPerRound: 4 }), BANK, mulberry32(5));
    s.startRound();
    while (s.hasNextQuestion()) {
      const q = s.nextQuestion();
      expect(q.age).toBe('kids');
      s.submit(null, 0);
    }
  });

  it('never serves adult questions to teens', () => {
    const s = new GameSession(config({ categories: ['screen', 'food'], ageGroup: 'teen', rounds: 2, questionsPerRound: 5 }), BANK, mulberry32(8));
    while (s.hasNextRound()) {
      s.startRound();
      while (s.hasNextQuestion()) {
        expect(s.nextQuestion().age).not.toBe('adult');
        s.submit(null, 0);
      }
    }
  });
});

describe('hints', () => {
  it('hides two wrong answers, halves the points and counts down', () => {
    const s = new GameSession(config({ hints: 1 }), BANK, mulberry32(11));
    s.startRound();
    const q = s.nextQuestion();
    expect(s.canUseHint()).toBe(true);
    const hidden = s.useHint();
    expect(hidden).toHaveLength(2);
    expect(hidden).not.toContain(q.answer);
    expect(s.hintsLeft).toBe(0);
    expect(s.canUseHint()).toBe(false);
    const r = s.submit(q.answer, 15000);
    expect(r.score.hinted).toBe(true);
    expect(r.score.total).toBe(500);
    s.nextQuestion();
    expect(s.canUseHint()).toBe(false);
  });

  it('has no hints by default', () => {
    const s = new GameSession(config(), BANK, mulberry32(12));
    s.startRound();
    s.nextQuestion();
    expect(s.canUseHint()).toBe(false);
  });
});

describe('teams', () => {
  const teams = [
    { id: 'a', name: 'A', color: '#fff' },
    { id: 'b', name: 'B', color: '#000' },
  ];

  it('scores each team separately and ranks them', () => {
    const s = new GameSession(config({ hints: 1 }), BANK, mulberry32(21), teams);
    s.startRound();
    const q = s.nextQuestion();
    s.useHint('b');
    expect(s.hiddenFor('b')).toHaveLength(2);
    expect(s.hiddenFor('a')).toHaveLength(0);
    const wrong = (q.answer + 1) % 4;
    const results = s.submitAll([
      { teamId: 'a', chosen: wrong, timeLeftMs: 15000 },
      { teamId: 'b', chosen: q.answer, timeLeftMs: 15000 },
    ]);
    expect(results.map((r) => r.correct)).toEqual([false, true]);
    expect(s.team('b').score).toBe(500);
    expect(s.team('a').score).toBe(0);
    expect(s.standings()[0].id).toBe('b');
  });

  it('treats a team with no pick as out of time', () => {
    const s = new GameSession(config(), BANK, mulberry32(22), teams);
    s.startRound();
    const q = s.nextQuestion();
    const [a, b] = s.submitAll([{ teamId: 'a', chosen: q.answer, timeLeftMs: 0 }]);
    expect(a.correct).toBe(true);
    expect(b.chosen).toBeNull();
    expect(b.score.total).toBe(0);
  });
});

describe('decideTeamAnswer', () => {
  it('picks the most popular latest vote, ties to the earliest', () => {
    expect(decideTeamAnswer([])).toEqual({ choice: null, at: null });
    expect(
      decideTeamAnswer([
        { playerId: 'p1', choice: 2, at: 100 },
        { playerId: 'p2', choice: 1, at: 200 },
      ]).choice,
    ).toBe(2);
    expect(
      decideTeamAnswer([
        { playerId: 'p1', choice: 2, at: 100 },
        { playerId: 'p2', choice: 1, at: 200 },
        { playerId: 'p3', choice: 1, at: 300 },
      ]),
    ).toEqual({ choice: 1, at: 300 });
    // p1 changes their mind; only the latest vote counts.
    expect(
      decideTeamAnswer([
        { playerId: 'p1', choice: 2, at: 100 },
        { playerId: 'p2', choice: 1, at: 200 },
        { playerId: 'p1', choice: 1, at: 250 },
      ]).choice,
    ).toBe(1);
  });

  it('makes readable room codes', () => {
    const code = makeRoomCode(mulberry32(3));
    expect(code).toMatch(/^[A-HJKMNP-Z]{4}$/);
  });
});

describe('name that tune', async () => {
  const { TUNES, parseNotes, buildTuneQuestions, JINGLE_TRIVIA } = await import('../src/data/tunes');

  it('parses every melody into real notes', () => {
    for (const [id, t] of Object.entries(TUNES)) {
      const notes = parseNotes(t.notes);
      expect(notes.length, id).toBeGreaterThanOrEqual(8);
      for (const [f, b] of notes) {
        expect(b).toBeGreaterThan(0);
        if (f !== null) expect(f).toBeGreaterThan(80);
        if (f !== null) expect(f).toBeLessThan(2500);
      }
    }
  });

  it('makes a tune question for every melody with 4 distinct choices', () => {
    const qs = buildTuneQuestions().filter((q) => q.picture?.kind === 'tune');
    expect(qs.length).toBe(Object.keys(TUNES).length);
    for (const q of qs) {
      expect(new Set(q.choices).size).toBe(4);
      expect(q.choices[q.answer]).toBe(TUNES[(q.picture as { id: string }).id].title);
    }
  });

  it('includes jingle trivia asked in words only', () => {
    expect(JINGLE_TRIVIA.length).toBeGreaterThanOrEqual(10);
    expect(BANK.filter((q) => q.category === 'tunes').length).toBeGreaterThanOrEqual(40);
  });
});

describe('host playing along', async () => {
  const { PartyHost } = await import('../src/net/host');

  it('adds the host as a player who can vote and move team', () => {
    const host = new PartyHost();
    host.mode = 'teams';
    host.teams = [
      { id: 't1', name: 'A', color: '#f00' },
      { id: 't2', name: 'B', color: '#0f0' },
    ];
    const me = host.addLocal('Craig')!;
    expect(me.local).toBe(true);
    expect(host.publicTeams().flatMap((t) => t.members)).toMatchObject([{ id: me.id, name: 'Craig', online: true }]);
    host.moveLocal('t2');
    expect(host.localPlayer!.teamId).toBe('t2');

    host.locked = true;
    host.teams = host.activeTeams();
    host.openQuestion(1, 10000);
    expect(host.allVoted()).toBe(false);
    host.localVote(2);
    expect(host.votesFor('t2').map((v) => v.choice)).toEqual([2]);
    expect(host.allVoted()).toBe(true);
  });

  it('gives the host their own entry in solo-players mode and can remove it', () => {
    const host = new PartyHost();
    host.mode = 'players';
    const me = host.addLocal('  ')!;
    expect(me.name).toBe('Host');
    expect(host.teams.map((t) => t.name)).toEqual(['Host']);
    host.removeLocal();
    expect(host.teams).toEqual([]);
    expect(host.localPlayer).toBeUndefined();
  });
});

describe('recorded host voice', async () => {
  const { allVoiceTexts, clipId, lineVariants } = await import('../src/audio/voiceTexts');
  const { readFileSync } = await import('node:fs');
  const clips = new Set<string>(JSON.parse(readFileSync('public/voice/index.json', 'utf8')));

  it('has a recording for every line and question', () => {
    const missing = allVoiceTexts().filter((t) => !clips.has(clipId(t)));
    expect(missing.slice(0, 5)).toEqual([]);
  });

  it('records named lines for every category and team', () => {
    expect(lineVariants('category').some((t) => t.includes('Name That Tune'))).toBe(true);
    expect(lineVariants('winner').some((t) => t.includes('Neon Ninjas'))).toBe(true);
  });
});

describe('fill in the blank', () => {
  it('matches typed answers forgivingly', () => {
    expect(isMatch('paris', ['Paris'])).toBe(true);
    expect(isMatch('  PARIS! ', ['Paris'])).toBe(true);
    expect(isMatch('the pacific', ['Pacific'])).toBe(true);
    expect(isMatch('Shakespere', ['Shakespeare'])).toBe(true);
    expect(isMatch('photosyntesis', ['photosynthesis'])).toBe(true);
    expect(isMatch('eight', ['8'])).toBe(true);
    expect(isMatch('8', ['eight'])).toBe(true);
    expect(isMatch('9', ['8', 'eight'])).toBe(false);
    expect(isMatch('cat', ['bat'])).toBe(false);
    expect(isMatch('London', ['Paris'])).toBe(false);
    expect(isMatch('', ['Paris'])).toBe(false);
    expect(isMatch('butterflies', ['butterfly'])).toBe(true);
    expect(normalize('Café & Co.')).toBe('cafeandco');
  });

  it('never offers a 50/50 on a typed question', () => {
    const s = new GameSession({ categories: ['blanks'], rounds: 1, questionsPerRound: 3, timeLimitMs: 10000, hints: 3 }, BANK, mulberry32(4));
    s.startRound();
    const q = s.nextQuestion();
    expect(q.accept).toBeDefined();
    expect(s.canUseHint()).toBe(false);
    expect(s.submit(0, 5000).correct).toBe(true);
  });
});

describe('avatars', () => {
  it('has distinct avatars that draw in every mood', () => {
    expect(new Set(AVATARS.map((a) => a.id)).size).toBe(AVATARS.length);
    expect(AVATARS.length).toBeGreaterThanOrEqual(12);
    for (const a of AVATARS) for (const mood of ['idle', 'happy', 'sad'] as const) expect(avatarSvg(a.id, mood)).toMatch(/^<svg[\s\S]*<\/svg>$/);
  });
});

describe('new round types', () => {
  it('reads typed numbers', () => {
    expect(parseGuess('1,200')).toBe(1200);
    expect(parseGuess('about 300')).toBe(300);
    expect(parseGuess('1.5k')).toBe(1500);
    expect(parseGuess('2 million')).toBe(2_000_000);
    expect(parseGuess('no idea')).toBeNull();
  });

  it('scores a closest guess within 10%, and the closest team', () => {
    const solo = new GameSession(config({ categories: ['estimate'], rounds: 1 }), BANK, mulberry32(3));
    solo.startRound();
    let q = solo.nextQuestion();
    expect(solo.submit(0, 5000, q.estimate!.value * 1.05).correct).toBe(true);
    q = solo.nextQuestion();
    expect(solo.submit(0, 5000, q.estimate!.value * 2 + 10).correct).toBe(false);

    const teams = new GameSession(config({ categories: ['estimate'], rounds: 1 }), BANK, mulberry32(4), [
      { id: 'a', name: 'A', color: '#f00' },
      { id: 'b', name: 'B', color: '#0f0' },
    ]);
    teams.startRound();
    const v = teams.nextQuestion().estimate!.value;
    const [a, b] = teams.submitAll([
      { teamId: 'a', chosen: 0, timeLeftMs: 5000, guess: v * 3 + 10 },
      { teamId: 'b', chosen: 0, timeLeftMs: 5000, guess: v * 5 + 10 },
    ]);
    expect(a.correct).toBe(true);
    expect(b.correct).toBe(false);
  });

  it('adds a lightning round before the final round and a wager at the end', () => {
    const s = new GameSession(config({ rounds: 3, lightning: true, finalWager: true }), BANK, mulberry32(5));
    expect(s.totalRounds).toBe(5);
    const kinds: string[] = [];
    const finals: boolean[] = [];
    while (s.hasNextRound()) {
      s.startRound();
      kinds.push(s.roundKind);
      finals.push(s.isFinalRound);
      if (s.roundKind === 'lightning') expect(s.timeLimitMs).toBe(8000);
      if (s.roundKind === 'wager') s.setWager('solo', 400);
      while (s.hasNextQuestion()) {
        const q = s.nextQuestion();
        if (s.roundKind === 'lightning') expect(q.choices).toHaveLength(4);
        s.submit(q.answer, 15000);
      }
    }
    expect(kinds).toEqual(['normal', 'normal', 'lightning', 'normal', 'wager']);
    expect(finals).toEqual([false, false, false, true, false]);
    expect(s.history.at(-1)!.score.total).toBe(400);
  });

  it('caps wagers at the score, with a floor of 500, and loses them on a wrong answer', () => {
    const s = new GameSession(config({ rounds: 1, questionsPerRound: 1, finalWager: true }), BANK, mulberry32(6));
    s.startRound();
    s.nextQuestion();
    s.submit(null, 0);
    expect(s.maxWager()).toBe(500);
    expect(s.setWager('solo', 9999)).toBe(500);
    s.startRound();
    expect(s.roundKind).toBe('wager');
    s.setWager('solo', 300);
    const q = s.nextQuestion();
    const r = s.submit((q.answer + 1) % q.choices.length, 5000);
    expect(r.correct).toBe(false);
    // Can't lose more than you have.
    expect(r.score.total).toBe(0);
  });

  it('does not read units as multipliers', () => {
    expect(parseGuess('206 bones')).toBe(206);
    expect(parseGuess('330 meters')).toBe(330);
  });
});

describe('mixed categories', () => {
  it('mixes the chosen categories inside each round, never the same one twice in a row', () => {
    const cats = config().categories;
    const s = new GameSession(config({ rounds: 2, questionsPerRound: 6, mixCategories: true }), BANK, mulberry32(7));
    expect(s.mixed).toBe(true);
    for (let r = 0; r < 2; r++) {
      s.startRound();
      const seen: string[] = [];
      while (s.hasNextQuestion()) {
        seen.push(s.nextQuestion().category);
        s.submit(null, 0);
      }
      // Each pass deals every category once, so six questions show all three, twice each.
      for (const c of cats) expect(seen.filter((x) => x === c)).toHaveLength(2);
      for (let i = 1; i < seen.length; i++) expect(seen[i]).not.toBe(seen[i - 1]);
    }
  });

  it('keeps one category per round when mixing is off', () => {
    const s = new GameSession(config({ questionsPerRound: 4 }), BANK, mulberry32(8));
    expect(s.mixed).toBe(false);
    const cat = s.startRound();
    while (s.hasNextQuestion()) {
      expect(s.nextQuestion().category).toBe(cat);
      s.submit(null, 0);
    }
  });

  it('is not mixed with a single category', () => {
    expect(new GameSession(config({ categories: ['science'], mixCategories: true }), BANK).mixed).toBe(false);
  });
});

describe('awards and hall of fame', async () => {
  const { computeAwards } = await import('../src/game/awards');
  const { addGame, emptyHall, gameRecord, lifetime, topScores, MAX_GAMES } = await import('../src/game/hall');

  const twoTeams = () =>
    new GameSession(config({ rounds: 1, questionsPerRound: 6 }), BANK, mulberry32(21), [
      { id: 'a', name: 'Aces', color: '#f00' },
      { id: 'b', name: 'Bees', color: '#0f0' },
    ]);

  it('gives Speed Demon, On Fire and Big Brain to the team that earned them', () => {
    const s = twoTeams();
    s.startRound();
    while (s.hasNextQuestion()) {
      const q = s.nextQuestion();
      // Aces: always right and fast. Bees: right but slow, wrong on every other question.
      s.submitAll([
        { teamId: 'a', chosen: q.answer, timeLeftMs: 13000 },
        { teamId: 'b', chosen: q.number % 2 ? q.answer : (q.answer + 1) % q.choices.length, timeLeftMs: 1500 },
      ]);
    }
    const awards = computeAwards(s.history, s.standings());
    const by = (id: string) => awards.find((a) => a.id === id);
    expect(by('speed')?.teamId).toBe('a');
    expect(by('speed')?.why).toBe('2.0s average right answer');
    expect(by('streak')?.teamId).toBe('a');
    expect(by('brain')?.teamId).toBe('a');
    expect(by('clutch')?.teamId).toBe('b');
    expect(by('roller')).toBeUndefined();
  });

  it('gives no awards for a game with nothing to celebrate', () => {
    const s = new GameSession(config({ rounds: 1, questionsPerRound: 3 }), BANK, mulberry32(22));
    s.startRound();
    while (s.hasNextQuestion()) {
      s.nextQuestion();
      s.submit(null, 0);
    }
    expect(computeAwards(s.history, s.standings())).toEqual([]);
  });

  it('keeps a hall of fame with top scores and lifetime stats', () => {
    let hall = emptyHall();
    for (let g = 0; g < 3; g++) {
      const s = new GameSession(config({ rounds: 1, questionsPerRound: 4 }), BANK, mulberry32(30 + g));
      s.startRound();
      while (s.hasNextQuestion()) {
        const q = s.nextQuestion();
        s.submit(g === 2 ? null : q.answer, 10000);
      }
      const team = { ...s.teams[0], name: 'Craig' };
      hall = addGame(hall, gameRecord('solo', [team], s.history, computeAwards(s.history, [team]), 1000 + g));
    }
    const top = topScores(hall);
    expect(top).toHaveLength(2); // a zero score isn't a high score
    expect(top[0].score).toBeGreaterThanOrEqual(top[1].score);
    const life = lifetime(hall);
    expect(life.games).toBe(3);
    expect(life.answered).toBe(12);
    expect(life.correct).toBe(8);
    expect(life.bestStreak).toBe(4);
    expect(life.trophies.find((t) => t.title === 'On Fire')?.count).toBe(2);
    expect(life.categories.reduce((n, c) => n + c[2], 0)).toBe(12);
  });

  it('only keeps the newest games', () => {
    let hall = emptyHall();
    const rec = { at: 0, mode: 'solo' as const, entries: [], awards: [] };
    for (let i = 0; i < MAX_GAMES + 5; i++) hall = addGame(hall, { ...rec, at: i });
    expect(hall.games).toHaveLength(MAX_GAMES);
    expect(hall.games[0].at).toBe(MAX_GAMES + 4);
  });
});

describe('holiday packs', async () => {
  const { seasonalPack, PACK_CATEGORIES } = await import('../src/game/categories');
  it('suggests the pack that is in season', () => {
    expect(seasonalPack(new Date(2026, 10, 26))).toBe('thanksgiving');
    expect(seasonalPack(new Date(2026, 9, 3))).toBe('halloween');
    expect(seasonalPack(new Date(2026, 11, 20))).toBe('christmas');
    expect(seasonalPack(new Date(2026, 11, 31))).toBe('newyear');
    expect(seasonalPack(new Date(2027, 0, 2))).toBe('newyear');
    expect(seasonalPack(new Date(2027, 1, 10))).toBe('valentines');
    expect(seasonalPack(new Date(2027, 6, 1))).toBe('july4');
    expect(seasonalPack(new Date(2027, 3, 1))).toBeNull();
  });
  it('has at least 15 questions in every pack', () => {
    for (const c of PACK_CATEGORIES.filter((x) => x !== 'custom')) expect(BANK.filter((q) => q.category === c).length).toBeGreaterThanOrEqual(15);
  });
});

describe('daily challenge', async () => {
  const daily = await import('../src/game/daily');
  const { emptyHall, addGame } = await import('../src/game/hall');

  const play = (key: string) => {
    const s = new GameSession(daily.dailyConfig(), BANK, mulberry32(daily.dailySeed(key)));
    const ids: string[] = [];
    while (s.hasNextRound()) {
      s.startRound();
      while (s.hasNextQuestion()) {
        const q = s.nextQuestion();
        ids.push(q.id);
        s.submit(q.answer, 10000, q.estimate?.value);
      }
    }
    return { s, ids };
  };

  it('deals the same 10 questions to everyone on the same day, and new ones the next day', () => {
    const a = play('2026-11-26');
    const b = play('2026-11-26');
    const c = play('2026-11-27');
    expect(a.ids).toHaveLength(daily.DAILY_QUESTIONS);
    expect(a.ids).toEqual(b.ids);
    expect(c.ids).not.toEqual(a.ids);
    expect(new Set(a.ids).size).toBe(daily.DAILY_QUESTIONS);
  });

  it('counts a streak of days in a row', () => {
    const rec = (d: string) => ({ at: 0, mode: 'solo' as const, entries: [{ name: 'You', score: 100, correct: 5, answered: 10, bestStreak: 2, color: '#fff' }], awards: [], daily: d });
    let hall = emptyHall();
    for (const d of ['2026-11-22', '2026-11-24', '2026-11-25']) hall = addGame(hall, rec(d));
    const today = new Date(2026, 10, 26);
    expect(daily.dailyStreak(hall, today)).toBe(2); // yesterday and the day before still count
    expect(daily.todaysDaily(hall, today)).toBeNull();
    hall = addGame(hall, rec('2026-11-26'));
    expect(daily.dailyStreak(hall, today)).toBe(3);
    expect(daily.todaysDaily(hall, today)?.score).toBe(100);
    expect(daily.dailyStreak(hall, new Date(2026, 10, 29))).toBe(0);
  });

  it('makes a spoiler-free share text', () => {
    const { s } = play('2026-11-26');
    const text = daily.shareText('2026-11-26', s.history, s.score, 3);
    expect(text).toContain('🟩'.repeat(10));
    expect(text).toContain('10/10');
    expect(text).toContain('3-day streak');
    for (const r of s.history) {
      const ans = r.question.choices[r.question.answer];
      if (ans.length > 3) expect(text).not.toContain(ans);
    }
  });

  it('uses local dates', () => {
    expect(daily.dateKey(new Date(2026, 0, 5))).toBe('2026-01-05');
  });
});

describe('custom question packs', async () => {
  const custom = await import('../src/game/custom');

  it('reads pasted questions and reports bad lines', () => {
    const { questions, errors } = custom.parseBulk(
      ['# The Smiths', "What is Grandpa's favorite snack? | Pretzels | Popcorn | Grapes", '', 'No answers here', 'Same | A | a', 'Two choices | Yes | No'].join('\n'),
    );
    expect(questions).toEqual([
      { prompt: "What is Grandpa's favorite snack?", right: 'Pretzels', wrong: ['Popcorn', 'Grapes'] },
      { prompt: 'Two choices', right: 'Yes', wrong: ['No'] },
    ]);
    expect(errors).toEqual(['Line 4: Add the right answer.', 'Line 5: Each answer must be different.']);
  });

  it('round-trips a pack through shareable text', () => {
    const pack = { ...custom.newPack('Family'), questions: [{ prompt: 'Q1?', right: 'A', wrong: ['B', 'C', 'D'] }] };
    const back = custom.parseBulk(custom.exportPack(pack));
    expect(back.questions).toEqual(pack.questions);
  });

  it('plays packs that are switched on, for every age group', () => {
    const on = { ...custom.newPack('On'), questions: [{ prompt: 'Who is the tallest cousin?', right: 'Mike', wrong: ['Ann', 'Lou'] }] };
    const off = { ...custom.newPack('Off'), on: false, questions: [{ prompt: 'Hidden?', right: 'Y', wrong: ['N'] }] };
    const qs = custom.customBankQuestions([on, off]);
    expect(qs).toHaveLength(1);
    expect(custom.customCount([on, off])).toBe(1);
    const s = new GameSession(config({ categories: ['custom'], rounds: 1, questionsPerRound: 2, ageGroup: 'kids' }), [...BANK, ...qs], mulberry32(5));
    s.startRound();
    const q = s.nextQuestion();
    expect(q.prompt).toBe('Who is the tallest cousin?');
    expect([...q.choices].sort()).toEqual(['Ann', 'Lou', 'Mike']);
    expect(s.submit(q.choices.indexOf('Mike'), 5000).correct).toBe(true);
  });
});

describe('famous faces', async () => {
  const credits = (await import('../src/data/faceCredits.json')).default as Record<string, { license: string; title: string }>;
  const fs = await import('node:fs');

  it('only uses free-licensed images that are in the app, with a credit', () => {
    const faces = BANK.filter((q) => q.category === 'faces');
    expect(faces.length).toBeGreaterThanOrEqual(15);
    for (const q of faces) {
      expect(q.picture?.kind).toBe('photo');
      if (q.picture?.kind !== 'photo') continue;
      const c = credits[q.picture.id];
      expect(c.license).toMatch(/^(public domain|pd|cc0|cc by(-sa)?( [0-9.]+)?)/i);
      expect(q.picture.credit).toContain(c.license);
      expect(fs.existsSync(`public/faces/${q.picture.id}.jpg`)).toBe(true);
      expect(new Set(q.choices).size).toBe(4);
    }
  });
});
