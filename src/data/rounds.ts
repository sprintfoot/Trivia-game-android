/**
 * Real or Made Up, Brain Teasers (riddles, anagrams, put-in-order) and Closest Guess.
 * All original questions.
 */
import type { AgeGroup, BankQuestion } from '../game/session';
import { mulberry32, shuffle } from '../game/session';

const K: AgeGroup = 'kids';
const T: AgeGroup = 'teen';
const A: AgeGroup = 'adult';

// [statement, is it real?, age]
const TRUTH: [string, boolean, AgeGroup][] = [
  ['Octopuses have three hearts.', true, K],
  ['Goldfish only have a three-second memory.', false, K],
  ['Bananas are berries, but strawberries are not.', true, T],
  ['Bulls get angry when they see the color red.', false, K],
  ['A day on Venus is longer than its year.', true, T],
  ['You swallow about eight spiders a year in your sleep.', false, K],
  ['Sharks existed before trees.', true, T],
  ['The Great Wall of China is easy to see from space with your bare eyes.', false, T],
  ['Honey can stay edible for thousands of years.', true, K],
  ['Bats are blind.', false, K],
  ['Cows have best friends and get stressed when apart.', true, K],
  ['Lightning never strikes the same place twice.', false, K],
  ['A group of flamingos is called a flamboyance.', true, T],
  ['Humans only use 10 percent of their brains.', false, T],
  ['Wombat poop is shaped like cubes.', true, K],
  ['Ostriches bury their heads in the sand when scared.', false, K],
  ['There are more trees on Earth than stars in the Milky Way.', true, A],
  ['Chameleons change color mainly to blend into the background.', false, T],
  ['Sea otters hold hands while they sleep so they do not drift apart.', true, K],
  ['Napoleon was unusually short for his time.', false, A],
  ['Scotland’s national animal is the unicorn.', true, T],
  ['Cracking your knuckles gives you arthritis.', false, T],
  ['A snail can sleep for up to three years.', true, K],
  ['Penguins mate for life, every single one of them.', false, A],
  ['Some turtles can breathe through their bottoms.', true, K],
  ['Vikings wore horned helmets into battle.', false, T],
  ['The Eiffel Tower can grow taller in summer heat.', true, T],
  ['Hair and nails keep growing after you die.', false, A],
  ['Butterflies taste with their feet.', true, K],
  ['Dropping a penny from a skyscraper can kill someone below.', false, T],
  ['Oxford University is older than the Aztec Empire.', true, A],
  ['Eating carrots lets you see in the dark.', false, K],
  ['Koalas sleep up to 20 hours a day.', true, K],
  ['Glass is a slow-flowing liquid, which is why old windows are thicker at the bottom.', false, A],
  ['Cleopatra lived closer in time to the Moon landing than to the building of the Great Pyramid.', true, A],
  ['Dogs see only in black and white.', false, T],
  ['A jiffy is an actual unit of time.', true, A],
  ['Waking a sleepwalker can give them a heart attack.', false, A],
  ['Polar bears have black skin under their white fur.', true, T],
  ['Different parts of the tongue taste different flavors, like sweet only at the tip.', false, T],
];

// Riddles: [riddle, answer, wrong answers, age]
const RIDDLES: [string, string, string[], AgeGroup][] = [
  ['What has keys but can’t open locks?', 'A piano', ['A map', 'A prison', 'A treasure chest'], K],
  ['What gets wetter the more it dries?', 'A towel', ['A sponge', 'Rain', 'A fish'], K],
  ['What has a face and two hands but no arms or legs?', 'A clock', ['A doll', 'A mirror', 'A coin'], K],
  ['What has to be broken before you can use it?', 'An egg', ['A promise', 'A window', 'A lock'], K],
  ['What goes up but never comes down?', 'Your age', ['A balloon', 'Smoke', 'A rocket'], K],
  ['What has one eye but can’t see?', 'A needle', ['A storm', 'A potato', 'A pirate'], K],
  ['I’m tall when I’m young and short when I’m old. What am I?', 'A candle', ['A tree', 'A pencil', 'A snowman'], K],
  ['What can you catch but not throw?', 'A cold', ['A ball', 'A fish', 'A bus'], K],
  ['What has many teeth but can’t bite?', 'A comb', ['A zipper', 'A saw', 'A shark toy'], T],
  ['The more of me you take, the more you leave behind. What am I?', 'Footsteps', ['Memories', 'Time', 'Breath'], T],
  ['What has cities but no houses, forests but no trees, and water but no fish?', 'A map', ['A painting', 'A globe of glass', 'A dream'], T],
  ['What can travel around the world while staying in a corner?', 'A stamp', ['A spider', 'The internet', 'A shadow'], T],
  ['What has a neck but no head?', 'A bottle', ['A guitar', 'A shirt', 'A giraffe toy'], T],
  ['What word becomes shorter when you add two letters to it?', 'Short', ['Long', 'Small', 'Brief'], A],
  ['What can fill a room but takes up no space?', 'Light', ['Air', 'Music', 'Silence'], A],
  ['If you have me, you want to share me. If you share me, you don’t have me. What am I?', 'A secret', ['A cake', 'Money', 'A joke'], A],
];

// Anagrams (typed): [scrambled, answers, hint, age]
const ANAGRAMS: [string, string[], string, AgeGroup][] = [
  ['TAC', ['cat'], 'a pet', K],
  ['OGD', ['dog', 'god'], 'a pet', K],
  ['LPEAP', ['apple'], 'a fruit', K],
  ['FRAGEFI', ['giraffe'], 'an animal', K],
  ['NOMO', ['moon'], 'in the night sky', K],
  ['ZAPIZ', ['pizza'], 'a food', K],
  ['BRAITB', ['rabbit'], 'an animal', K],
  ['NAANAB', ['banana'], 'a fruit', K],
  ['NETHAPLE', ['elephant'], 'an animal', T],
  ['OCLOHCATE', ['chocolate'], 'a treat', T],
  ['DRUNHET', ['thunder'], 'weather', T],
  ['CANOLVO', ['volcano'], 'nature', T],
  ['TEPLAN', ['planet'], 'in space', T],
  ['HTGILHSALF', ['flashlight', 'flash light'], 'helps you see in the dark', A],
  ['KRAMTEPRUSE', ['supermarket'], 'where you shop for food', A],
  ['NOITULOS', ['solution'], 'the answer to a problem', A],
];

// Put in order: [question, items in the right order, age]
const ORDERS: [string, string[], AgeGroup][] = [
  ['Smallest to biggest', ['Ant', 'Cat', 'Horse', 'Whale'], K],
  ['Shortest to longest', ['Minute', 'Hour', 'Day', 'Week'], K],
  ['Closest to farthest from the Sun', ['Mercury', 'Earth', 'Mars', 'Jupiter'], K],
  ['Fewest to most legs', ['Snake', 'Chicken', 'Dog', 'Spider'], K],
  ['Smallest to biggest', ['Pea', 'Grape', 'Apple', 'Watermelon'], K],
  ['Oldest to newest invention', ['Wheel', 'Printing press', 'Telephone', 'Internet'], T],
  ['Shortest to tallest', ['Statue of Liberty', 'Eiffel Tower', 'Empire State Building', 'Burj Khalifa'], T],
  ['Smallest to largest country by area', ['France', 'India', 'Brazil', 'Russia'], T],
  ['Earliest to latest in the year', ['Valentine’s Day', 'Independence Day (US)', 'Halloween', 'Christmas'], K],
  ['Fewest to most players on a team (on the field)', ['Tennis (singles)', 'Basketball', 'Baseball', 'Soccer'], T],
  ['Oldest to youngest', ['Egyptian pyramids', 'Roman Colosseum', 'Machu Picchu', 'Eiffel Tower'], A],
  ['Lightest to heaviest', ['Hydrogen', 'Helium', 'Carbon', 'Iron'], A],
  ['Earliest to latest', ['First Moon landing', 'First email', 'First iPhone', 'First TikTok video'], A],
  ['Shortest to longest river', ['Thames', 'Danube', 'Mississippi', 'Nile'], A],
  ['Smallest to largest ocean', ['Arctic', 'Indian', 'Atlantic', 'Pacific'], T],
];

// Closest guess: [question, answer, unit, age]
const ESTIMATES: [string, number, string, AgeGroup][] = [
  ['How many bones are in the adult human body?', 206, 'bones', T],
  ['How many keys are on a standard piano?', 88, 'keys', T],
  ['How tall is the Eiffel Tower, in meters?', 330, 'meters', A],
  ['How many days does it take the Moon to orbit Earth (roughly)?', 27, 'days', T],
  ['How many countries are there in the world (UN members)?', 193, 'countries', A],
  ['How many teeth does an adult usually have?', 32, 'teeth', K],
  ['How many hours are in a week?', 168, 'hours', K],
  ['How many legs do 12 spiders have altogether?', 96, 'legs', K],
  ['How many minutes are in a day?', 1440, 'minutes', T],
  ['How long is a blue whale, in meters?', 30, 'meters', T],
  ['How many years did the Hundred Years’ War actually last?', 116, 'years', A],
  ['How many hearts does a squid have plus an octopus have, together?', 6, 'hearts', T],
  ['What year did the Titanic sink?', 1912, '', A],
  ['How many stairs to the top of the Eiffel Tower?', 1665, 'steps', A],
  ['How many players are on the field in a game of American football (both teams)?', 22, 'players', T],
  ['How many seconds are in an hour?', 3600, 'seconds', K],
  ['How fast can a cheetah run, in km per hour?', 110, 'km/h', T],
  ['How many moons does Mars have?', 2, 'moons', K],
  ['How many squares are on a chessboard (just the small ones)?', 64, 'squares', K],
  ['How deep is the deepest part of the ocean, in meters?', 10935, 'meters', A],
  ['What year did the first person walk on the Moon?', 1969, '', T],
  ['How many feet tall is Mount Everest?', 29032, 'feet', A],
  ['How many dimples are on a typical golf ball?', 336, 'dimples', A],
  ['How long is the Great Wall of China with all its branches, in miles?', 13171, 'miles', A],
  ['How many weeks are in a year?', 52, 'weeks', K],
];

function permutations(right: string[], rng: () => number): string[][] {
  const out = [right];
  const seen = new Set([right.join('|')]);
  while (out.length < 4) {
    const p = shuffle(right, rng);
    const key = p.join('|');
    if (!seen.has(key)) {
      seen.add(key);
      out.push(p);
    }
  }
  return out;
}

export function buildRoundQuestions(): BankQuestion[] {
  const rng = mulberry32(2026);
  const out: BankQuestion[] = [];
  TRUTH.forEach(([s, real, age], i) =>
    out.push({ id: `truth-${i + 1}`, category: 'truth', age, prompt: `Real or made up? ${s}`, choices: ['Real', 'Made up'], answer: real ? 0 : 1, fixedOrder: true }),
  );
  RIDDLES.forEach(([q, right, wrong, age], i) => {
    const choices = shuffle([right, ...wrong], rng);
    out.push({ id: `riddle-${i + 1}`, category: 'teasers', age, prompt: `Riddle: ${q}`, choices, answer: choices.indexOf(right) });
  });
  ANAGRAMS.forEach(([letters, accept, hint, age], i) =>
    out.push({ id: `anagram-${i + 1}`, category: 'teasers', age, prompt: `Unscramble ${letters.split('').join(' ')} (${hint})`, choices: [accept[0].toUpperCase()], answer: 0, accept }),
  );
  ORDERS.forEach(([q, items, age], i) => {
    const perms = shuffle(permutations(items, rng), rng);
    const choices = perms.map((p) => p.join(' → '));
    out.push({ id: `order-${i + 1}`, category: 'teasers', age, prompt: `Put in order: ${q}`, choices, answer: choices.indexOf(items.join(' → ')) });
  });
  ESTIMATES.forEach(([q, value, unit, age], i) =>
    out.push({
      id: `guess-${i + 1}`,
      category: 'estimate',
      age,
      prompt: q,
      choices: [`${value.toLocaleString('en-US')}${unit ? ` ${unit}` : ''}`],
      answer: 0,
      estimate: { value, unit: unit || undefined },
    }),
  );
  return out;
}
