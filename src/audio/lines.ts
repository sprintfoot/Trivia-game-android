/**
 * The host's spoken one-liners. All original. {team}, {category}, {n} and {score} are filled in.
 * Phrased so they work for a team name ("Neon Ninjas") or a single player ("Sam").
 */
export const LINES = {
  intro: [
    'Welcome to Trivia Party! Phones down. Well, unless you need them to answer.',
    'Hello, brainiacs! And hello to everyone who just likes pressing buttons.',
    "Welcome! Tonight we find out who's a genius and who just has a really good guessing face.",
    "Let's play! Remember, there are no stupid answers. Just wrong ones. Loudly wrong ones.",
    "Stretch those brains, everybody. Careful. Don't pull anything.",
  ],
  round: [
    'Round {n}! Spinning the wheel of destiny. Well, the wheel of trivia.',
    'Round {n}. Let us see what the wheel has in store.',
    'Round {n}! Fingers on buzzers. Metaphorically.',
    'Here comes round {n}. Snacks down, brains up.',
  ],
  finalRound: [
    'Final round! Double points! This is where legends are made, and friendships are tested.',
    'Last round, double points. Anyone can still win. Statistically. Ish.',
    "Final round! If you've been saving your best answers, now would be a great time.",
  ],
  lightning: [
    'Lightning round! Five quick questions, eight seconds each. No thinking allowed. Well, a little.',
    'Lightning round! Fast fingers, faster brains. Go go go!',
  ],
  wager: [
    'Final wager! How sure are you? Bet big, win big. Or lose big. Mostly that.',
    'It all comes down to this. Place your bets!',
  ],
  category: [
    '{category}! Oh, I love this one.',
    "It's {category}. Somebody in this room has been waiting for this.",
    '{category}. No pressure.',
    'The wheel says {category}. The wheel has spoken.',
    '{category}! Time to show off.',
  ],
  correct: [
    'Correct! Look at you go.',
    'Yes! Big brain energy.',
    "That's right! Somebody's been reading.",
    'Nailed it.',
    "Correct! Take a bow. Not too long, there's another question.",
    "Spot on! I'd give you a high five, but I don't have hands.",
  ],
  fast: [
    'Lightning fast! Did you know that one, or are you psychic?',
    'Whoa, that was quick. Suspiciously quick.',
    "Faster than a cheetah on roller skates. That's fast.",
  ],
  wrong: [
    "Ooh, so close. Well, not really, but I'm being nice.",
    'Nope! But points for confidence.',
    "Wrong! Don't worry, I won't tell anyone. Except everyone in this room.",
    'That was a bold choice. Incorrect, but bold.',
    'Not quite. The answer was hiding in plain sight.',
  ],
  timeUp: [
    'Time is up! Were you thinking, or napping?',
    'Too slow! The clock waits for no one.',
    'And the clock wins that one.',
  ],
  streak: [
    '{n} in a row! You are on fire!',
    "That's {n} straight! Somebody call the fire department.",
    'A streak of {n}! Unstoppable!',
  ],
  hint: [
    'Using a hint? Smart. Sneaky, but smart.',
    'Fifty fifty! Let me clear out some of that nonsense for you.',
  ],
  nobody: [
    "Nobody got it! I'm genuinely impressed. In the wrong way.",
    "Zero for everyone! Now that's teamwork.",
    'Not a single right answer. I am going to pretend that question was really hard.',
  ],
  everyone: [
    "Everybody got it! Too easy? I'll fix that.",
    "Wow, everyone's a genius this time.",
  ],
  lead: [
    'New leader: {team}!',
    "Look who's on top now. It's {team}!",
    'And {team} move into first place. Someone is getting cocky.',
  ],
  winner: [
    'And the winner is... {team}! Take a victory lap. Around the couch is fine.',
    'Champions tonight: {team}! Everyone else, there is always the rematch.',
    'Give it up for {team}! Absolute trivia royalty.',
  ],
  tie: ["It's a tie! You're all winners. Or all equally not losers."],
  soloEnd: [
    'Game over! Not bad. Not bad at all.',
    "That's the game! Think you can beat that score?",
    'And that is the game. Take a bow, then try again.',
  ],
  // Used when a name or number has no recorded clip (custom player names, very long streaks).
  leadAny: ['We have a new leader!', 'Shake-up at the top! Somebody new is in first place.'],
  winnerAny: ['And we have a winner! Take a victory lap. Around the couch is fine.', 'Give it up for our champion! Absolute trivia royalty.'],
  streakAny: ['Another one! The streak continues!', 'Still on fire! Somebody stop them!'],
} as const;

export type LineKey = keyof typeof LINES;
