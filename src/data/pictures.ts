/**
 * Picture-reveal questions. Pictures are never copyrighted stills or logos:
 * country flags (drawings from the MIT-licensed flag-icons project), emoji puzzles,
 * and zoomed-in emoji, all drawn on the device.
 */
import type { AgeGroup, BankQuestion } from '../game/session';
import { mulberry32, shuffle } from '../game/session';

type Age = AgeGroup;
const K: Age = 'kids';
const T: Age = 'teen';
const A: Age = 'adult';

// [code, country, age, region]
const FLAGS: [string, string, Age, string][] = [
  ['fr', 'France', K, 'eu'], ['de', 'Germany', T, 'eu'], ['it', 'Italy', K, 'eu'], ['es', 'Spain', T, 'eu'],
  ['gb', 'United Kingdom', K, 'eu'], ['ie', 'Ireland', T, 'eu'], ['pt', 'Portugal', T, 'eu'], ['nl', 'Netherlands', T, 'eu'],
  ['se', 'Sweden', T, 'eu'], ['no', 'Norway', T, 'eu'], ['dk', 'Denmark', T, 'eu'], ['fi', 'Finland', A, 'eu'],
  ['ch', 'Switzerland', T, 'eu'], ['gr', 'Greece', T, 'eu'], ['pl', 'Poland', A, 'eu'], ['be', 'Belgium', A, 'eu'],
  ['at', 'Austria', A, 'eu'], ['ua', 'Ukraine', T, 'eu'],
  ['us', 'United States', K, 'am'], ['ca', 'Canada', K, 'am'], ['mx', 'Mexico', K, 'am'], ['br', 'Brazil', K, 'am'],
  ['ar', 'Argentina', T, 'am'], ['cl', 'Chile', A, 'am'], ['co', 'Colombia', A, 'am'], ['jm', 'Jamaica', T, 'am'],
  ['pe', 'Peru', A, 'am'], ['cu', 'Cuba', A, 'am'],
  ['jp', 'Japan', K, 'as'], ['cn', 'China', K, 'as'], ['in', 'India', T, 'as'], ['kr', 'South Korea', T, 'as'],
  ['au', 'Australia', K, 'as'], ['nz', 'New Zealand', T, 'as'], ['th', 'Thailand', A, 'as'], ['vn', 'Vietnam', A, 'as'],
  ['ph', 'Philippines', A, 'as'], ['sa', 'Saudi Arabia', A, 'as'], ['tr', 'Turkey', T, 'as'], ['il', 'Israel', T, 'as'],
  ['za', 'South Africa', T, 'af'], ['eg', 'Egypt', T, 'af'], ['ng', 'Nigeria', A, 'af'], ['ke', 'Kenya', A, 'af'],
  ['gh', 'Ghana', A, 'af'], ['ma', 'Morocco', A, 'af'],
];

// [emoji clues, answer, wrong answers, age]
const EMOJI_MOVIES: [string[], string, string[], Age][] = [
  [['🦁', '👑'], 'The Lion King', ['Madagascar', 'The Jungle Book', 'Zootopia'], K],
  [['❄️', '👸', '⛄'], 'Frozen', ['Tangled', 'Moana', 'Brave'], K],
  [['🧸', '🤠', '🚀'], 'Toy Story', ['Cars', 'Up', 'Monsters, Inc.'], K],
  [['🐠', '🔍'], 'Finding Nemo', ['The Little Mermaid', 'Shark Tale', 'Luca'], K],
  [['🏠', '🎈', '👴'], 'Up', ['Coco', 'Inside Out', 'Soul'], K],
  [['🐀', '👨‍🍳', '🍲'], 'Ratatouille', ['Cinderella', 'Stuart Little', 'Flushed Away'], K],
  [['🚗', '⚡', '🏁'], 'Cars', ['Turbo', 'Planes', 'Speed Racer'], K],
  [['🐼', '🥋'], 'Kung Fu Panda', ['Turning Red', 'Mulan', 'Big Hero 6'], K],
  [['🧞', '🪔', '🐒'], 'Aladdin', ['Pinocchio', 'Hercules', 'The Jungle Book'], K],
  [['🕷️', '🧑', '🏙️'], 'Spider-Man', ['Ant-Man', 'Batman', 'Iron Man'], K],
  [['🦖', '🏞️', '🚙'], 'Jurassic Park', ['The Good Dinosaur', 'King Kong', 'Ice Age'], K],
  [['🐘', '👂', '✈️'], 'Dumbo', ['Horton Hears a Who!', 'Babar', 'Tarzan'], K],
  [['🚢', '🧊', '💔'], 'Titanic', ['Jaws', 'Life of Pi', 'Pirates of the Caribbean'], T],
  [['💍', '🌋', '🧙'], 'The Lord of the Rings', ['Harry Potter', 'The Chronicles of Narnia', 'Dune'], T],
  [['👽', '📞', '🏠'], 'E.T.', ['Alien', 'Men in Black', 'Close Encounters of the Third Kind'], T],
  [['👻', '🚫'], 'Ghostbusters', ['Casper', 'Beetlejuice', 'Coco'], T],
  [['🍫', '🏭', '🎫'], 'Charlie and the Chocolate Factory', ['Matilda', 'Hugo', 'Chicken Run'], T],
  [['🦈', '🏖️', '🛥️'], 'Jaws', ['Finding Nemo', 'Moana', 'Waterworld'], T],
  [['🦍', '🏙️', '✈️'], 'King Kong', ['Planet of the Apes', 'Godzilla', 'Rampage'], T],
  [['⚡', '👓', '🧙'], 'Harry Potter', ['The Hobbit', 'Percy Jackson', 'The Chronicles of Narnia'], T],
  [['⏰', '🔙', '🚗'], 'Back to the Future', ['Groundhog Day', 'Cars', 'Interstellar'], T],
  [['🌪️', '👠', '🦁'], 'The Wizard of Oz', ['Twister', 'Cinderella', 'The Lion King'], T],
  [['🏴‍☠️', '🦜', '💀'], 'Pirates of the Caribbean', ['Peter Pan', 'Treasure Planet', 'Hook'], T],
  [['🥊', '🐯', '🏃'], 'Rocky', ['Creed', 'Raging Bull', 'Million Dollar Baby'], A],
  [['💊', '🐇', '🕶️'], 'The Matrix', ['Alice in Wonderland', 'Inception', 'Men in Black'], A],
  [['🏃', '🍫', '🪶'], 'Forrest Gump', ['Big', 'Cast Away', 'Rain Man'], A],
  [['🦇', '🃏', '🌃'], 'The Dark Knight', ['Spider-Man', 'Joker', 'Watchmen'], T],
];

// [emoji, answer, wrong answers, age]
const ZOOM_ANIMALS: [string, string, string[], Age][] = [
  ['🦒', 'Giraffe', ['Zebra', 'Camel', 'Deer'], K],
  ['🐘', 'Elephant', ['Rhino', 'Hippo', 'Mammoth'], K],
  ['🦓', 'Zebra', ['Horse', 'Tiger', 'Okapi'], K],
  ['🐧', 'Penguin', ['Puffin', 'Toucan', 'Owl'], K],
  ['🦩', 'Flamingo', ['Swan', 'Pelican', 'Heron'], K],
  ['🐙', 'Octopus', ['Squid', 'Jellyfish', 'Starfish'], K],
  ['🦔', 'Hedgehog', ['Porcupine', 'Mouse', 'Armadillo'], K],
  ['🐢', 'Turtle', ['Crocodile', 'Frog', 'Snail'], K],
  ['🦜', 'Parrot', ['Toucan', 'Peacock', 'Canary'], K],
  ['🦥', 'Sloth', ['Koala', 'Monkey', 'Lemur'], T],
  ['🦦', 'Otter', ['Beaver', 'Seal', 'Weasel'], T],
  ['🦉', 'Owl', ['Eagle', 'Hawk', 'Parrot'], K],
  ['🦚', 'Peacock', ['Parrot', 'Turkey', 'Pheasant'], T],
  ['🐊', 'Crocodile', ['Lizard', 'Snake', 'Turtle'], K],
  ['🦘', 'Kangaroo', ['Rabbit', 'Wallaby', 'Deer'], T],
  ['🦨', 'Skunk', ['Raccoon', 'Badger', 'Squirrel'], T],
];

export function buildPictureQuestions(): BankQuestion[] {
  const rng = mulberry32(77);
  const out: BankQuestion[] = [];
  const add = (q: Omit<BankQuestion, 'choices' | 'answer'> & { right: string; wrong: string[] }) => {
    const choices = shuffle([q.right, ...q.wrong.slice(0, 3)], rng);
    const { right, wrong: _wrong, ...rest } = q;
    out.push({ ...rest, choices, answer: choices.indexOf(right) });
  };

  for (const [code, name, age, region] of FLAGS) {
    const others = shuffle(
      FLAGS.filter((f) => f[3] === region && f[0] !== code).map((f) => f[1]),
      rng,
    );
    add({ id: `flag-${code}`, category: 'pictures', age, prompt: "Which country's flag is this?", picture: { kind: 'flag', code }, right: name, wrong: others });
  }
  EMOJI_MOVIES.forEach(([clues, right, wrong, age], i) =>
    add({ id: `emoji-${i + 1}`, category: 'pictures', age, prompt: 'Which movie do these emoji spell out?', picture: { kind: 'emoji', clues }, right, wrong }),
  );
  ZOOM_ANIMALS.forEach(([emoji, right, wrong, age], i) => {
    const x = 0.2 + rng() * 0.6;
    const y = 0.2 + rng() * 0.6;
    add({ id: `zoom-${i + 1}`, category: 'pictures', age, prompt: 'Zooming out… what animal is this?', picture: { kind: 'zoom', emoji, x, y }, right, wrong });
  });
  return out;
}
