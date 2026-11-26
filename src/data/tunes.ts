/**
 * Name That Tune. Every melody here is in the public domain (folk songs, carols and classical
 * pieces written long ago), and the app plays its own synthesised arrangement, so there are no
 * recordings to license. Brand jingles are only asked about in words, never played.
 *
 * Notes are "NOTE:BEATS" (beats in quarter notes); "R" is a rest.
 */
import type { AgeGroup, BankQuestion } from '../game/session';
import { mulberry32, shuffle } from '../game/session';

export interface Tune {
  title: string;
  group: 'kids' | 'holiday' | 'classical';
  age: AgeGroup;
  bpm: number;
  notes: string;
}

export const TUNES: Record<string, Tune> = {
  twinkle: { title: 'Twinkle, Twinkle, Little Star', group: 'kids', age: 'kids', bpm: 110,
    notes: 'C5:1 C5:1 G5:1 G5:1 A5:1 A5:1 G5:2 F5:1 F5:1 E5:1 E5:1 D5:1 D5:1 C5:2' },
  birthday: { title: 'Happy Birthday', group: 'kids', age: 'kids', bpm: 100,
    notes: 'G4:0.75 G4:0.25 A4:1 G4:1 C5:1 B4:2 G4:0.75 G4:0.25 A4:1 G4:1 D5:1 C5:2' },
  mary: { title: 'Mary Had a Little Lamb', group: 'kids', age: 'kids', bpm: 120,
    notes: 'E5:1 D5:1 C5:1 D5:1 E5:1 E5:1 E5:2 D5:1 D5:1 D5:2 E5:1 G5:1 G5:2 E5:1 D5:1 C5:1 D5:1 E5:1 E5:1 E5:1 E5:1 D5:1 D5:1 E5:1 D5:1 C5:3' },
  rowboat: { title: 'Row, Row, Row Your Boat', group: 'kids', age: 'kids', bpm: 100,
    notes: 'C5:1 C5:1 C5:0.75 D5:0.25 E5:1 E5:0.75 D5:0.25 E5:0.75 F5:0.25 G5:2 C6:0.33 C6:0.33 C6:0.34 G5:0.33 G5:0.33 G5:0.34 E5:0.33 E5:0.33 E5:0.34 C5:0.33 C5:0.33 C5:0.34 G5:0.75 F5:0.25 E5:0.75 D5:0.25 C5:2' },
  london: { title: 'London Bridge Is Falling Down', group: 'kids', age: 'kids', bpm: 120,
    notes: 'G5:1.5 A5:0.5 G5:1 F5:1 E5:1 F5:1 G5:2 D5:1 E5:1 F5:2 E5:1 F5:1 G5:2' },
  macdonald: { title: 'Old MacDonald Had a Farm', group: 'kids', age: 'kids', bpm: 130,
    notes: 'G4:1 G4:1 G4:1 D4:1 E4:1 E4:1 D4:2 B4:1 B4:1 A4:1 A4:1 G4:3' },
  jacques: { title: 'Frère Jacques', group: 'kids', age: 'kids', bpm: 120,
    notes: 'C5:1 D5:1 E5:1 C5:1 C5:1 D5:1 E5:1 C5:1 E5:1 F5:1 G5:2 E5:1 F5:1 G5:2' },
  yankee: { title: 'Yankee Doodle', group: 'kids', age: 'kids', bpm: 130,
    notes: 'C5:1 C5:1 D5:1 E5:1 C5:1 E5:1 D5:1 G4:1 C5:1 C5:1 D5:1 E5:1 C5:2 B4:2' },
  susanna: { title: 'Oh! Susanna', group: 'kids', age: 'teen', bpm: 120,
    notes: 'C5:0.5 D5:0.5 E5:1 G5:1 G5:1.5 A5:0.5 G5:1 E5:1 C5:1.5 D5:0.5 E5:1 E5:1 D5:1 C5:1 D5:3' },
  saints: { title: 'When the Saints Go Marching In', group: 'kids', age: 'teen', bpm: 150,
    notes: 'C5:1 E5:1 F5:1 G5:5 C5:1 E5:1 F5:1 G5:5 C5:1 E5:1 F5:1 G5:2 E5:2 C5:2 E5:2 D5:4' },
  ballgame: { title: 'Take Me Out to the Ball Game', group: 'kids', age: 'teen', bpm: 160,
    notes: 'C5:2 C6:1 A5:1 G5:1 E5:1 G5:3 D5:3 C5:2 C6:1 A5:1 G5:1 E5:1 G5:5' },
  cucaracha: { title: 'La Cucaracha', group: 'kids', age: 'teen', bpm: 140,
    notes: 'C5:0.5 C5:0.5 C5:0.5 F5:1.5 A5:1 C5:0.5 C5:0.5 C5:0.5 F5:1.5 A5:2 F5:0.5 F5:0.5 E5:0.5 E5:0.5 D5:0.5 D5:0.5 C5:2' },
  lullaby: { title: "Brahms' Lullaby", group: 'kids', age: 'teen', bpm: 90,
    notes: 'E5:0.5 E5:0.5 G5:2 E5:0.5 E5:0.5 G5:2 E5:0.5 G5:0.5 C6:1 B5:1.5 A5:0.5 A5:1 G5:1' },

  jingle: { title: 'Jingle Bells', group: 'holiday', age: 'kids', bpm: 140,
    notes: 'E5:1 E5:1 E5:2 E5:1 E5:1 E5:2 E5:1 G5:1 C5:1.5 D5:0.5 E5:4 F5:1 F5:1 F5:1.5 F5:0.5 F5:1 E5:1 E5:1 E5:0.5 E5:0.5 E5:1 D5:1 D5:1 E5:1 D5:2 G5:2' },
  silent: { title: 'Silent Night', group: 'holiday', age: 'kids', bpm: 100,
    notes: 'G5:1.5 A5:0.5 G5:1 E5:3 G5:1.5 A5:0.5 G5:1 E5:3 D6:2 D6:1 B5:3 C6:2 C6:1 G5:3' },
  deck: { title: 'Deck the Halls', group: 'holiday', age: 'kids', bpm: 130,
    notes: 'D5:1.5 C5:0.5 B4:1 A4:1 G4:1 A4:1 B4:1 G4:1 A4:0.5 B4:0.5 C5:0.5 A4:0.5 B4:1.5 A4:0.5 G4:1 F#4:1 G4:2' },
  wewish: { title: 'We Wish You a Merry Christmas', group: 'holiday', age: 'kids', bpm: 150,
    notes: 'D5:1 G5:1 G5:0.5 A5:0.5 G5:0.5 F#5:0.5 E5:1 E5:1 E5:1 A5:1 A5:0.5 B5:0.5 A5:0.5 G5:0.5 F#5:1 D5:1 D5:1 B5:1 B5:0.5 C6:0.5 B5:0.5 A5:0.5 G5:1 E5:1 D5:0.5 D5:0.5 E5:1 A5:1 F#5:1 G5:2' },
  auldlang: { title: 'Auld Lang Syne', group: 'holiday', age: 'teen', bpm: 100,
    notes: 'C5:1 F5:1.5 F5:0.5 F5:1 A5:1 G5:1.5 F5:0.5 G5:1 A5:0.5 G5:0.5 F5:1.5 F5:0.5 A5:1 C6:1 D6:3' },

  odejoy: { title: 'Ode to Joy (Beethoven)', group: 'classical', age: 'kids', bpm: 120,
    notes: 'E5:1 E5:1 F5:1 G5:1 G5:1 F5:1 E5:1 D5:1 C5:1 C5:1 D5:1 E5:1 E5:1.5 D5:0.5 D5:2' },
  elise: { title: 'Für Elise (Beethoven)', group: 'classical', age: 'teen', bpm: 80,
    notes: 'E6:0.5 D#6:0.5 E6:0.5 D#6:0.5 E6:0.5 B5:0.5 D6:0.5 C6:0.5 A5:1.5 C5:0.5 E5:0.5 A5:0.5 B5:1.5 E5:0.5 G#5:0.5 B5:0.5 C6:1.5 E5:0.5 E6:0.5 D#6:0.5 E6:0.5 D#6:0.5 E6:0.5 B5:0.5 D6:0.5 C6:0.5 A5:1.5' },
  fifth: { title: "Beethoven's 5th Symphony", group: 'classical', age: 'teen', bpm: 108,
    notes: 'R:0.5 G4:0.5 G4:0.5 G4:0.5 D#4:3 R:0.5 F4:0.5 F4:0.5 F4:0.5 D4:4' },
  nachtmusik: { title: 'Eine kleine Nachtmusik (Mozart)', group: 'classical', age: 'adult', bpm: 120,
    notes: 'G5:1 R:0.5 D5:0.5 G5:1 R:0.5 D5:0.5 G5:0.5 D5:0.5 G5:0.5 B5:0.5 D6:2 C6:1 R:0.5 A5:0.5 C6:1 R:0.5 A5:0.5 C6:0.5 A5:0.5 F#5:0.5 A5:0.5 D5:2' },
  mountainking: { title: 'In the Hall of the Mountain King (Grieg)', group: 'classical', age: 'teen', bpm: 120,
    notes: 'B4:0.5 C#5:0.5 D5:0.5 E5:0.5 F#5:0.5 D5:0.5 F#5:1 F5:0.5 C#5:0.5 F5:1 E5:0.5 C5:0.5 E5:1 B4:0.5 C#5:0.5 D5:0.5 E5:0.5 F#5:0.5 D5:0.5 F#5:0.5 B5:0.5 A5:0.5 F#5:0.5 D5:0.5 F#5:0.5 A5:2' },
  danube: { title: 'The Blue Danube (Strauss)', group: 'classical', age: 'adult', bpm: 160,
    notes: 'D5:1 D5:1 F#5:1 A5:1 A5:2 A6:1 A6:2 F#6:1 F#6:2 D5:1 D5:1 F#5:1 A5:1 A5:2 A6:1 A6:2 G6:1 G6:2' },
  bride: { title: 'Bridal Chorus ("Here Comes the Bride")', group: 'classical', age: 'teen', bpm: 80,
    notes: 'C5:1 F5:0.75 F5:0.25 F5:2 C5:1 G5:0.75 E5:0.25 F5:2 C5:1 F5:0.75 A#5:0.25 A#5:1 A5:0.75 G5:0.25 F5:0.75 E5:0.25 F5:0.75 G5:0.25 F5:2' },
  habanera: { title: 'Habanera from Carmen (Bizet)', group: 'classical', age: 'adult', bpm: 90,
    notes: 'D6:0.75 C#6:0.25 C6:0.5 C6:0.5 B5:0.5 A#5:0.5 A5:0.75 G#5:0.25 G5:0.5 G5:0.5 F5:1 E5:1' },
  canon: { title: 'Canon in D (Pachelbel)', group: 'classical', age: 'adult', bpm: 100,
    notes: 'F#6:2 E6:2 D6:2 C#6:2 B5:2 A5:2 B5:2 C#6:2' },
  greensleeves: { title: 'Greensleeves', group: 'classical', age: 'adult', bpm: 130,
    notes: 'A4:1 C5:2 D5:1 E5:1.5 F5:0.5 E5:1 D5:2 B4:1 G4:1.5 A4:0.5 B4:1 C5:2 A4:1 A4:1.5 G#4:0.5 A4:1 B4:2 G#4:1 E4:2' },
  entertainer: { title: 'The Entertainer (Joplin)', group: 'classical', age: 'teen', bpm: 90,
    notes: 'D5:0.25 D#5:0.25 E5:0.25 C6:0.5 E5:0.25 C6:0.5 E5:0.25 C6:1.25 C6:0.25 D6:0.25 D#6:0.25 E6:0.25 C6:0.25 D6:0.25 E6:0.5 B5:0.25 D6:0.5 C6:1' },
  toccata: { title: 'Toccata and Fugue in D minor (Bach)', group: 'classical', age: 'teen', bpm: 60,
    notes: 'A5:0.125 G5:0.125 A5:1.5 R:0.25 G5:0.125 F5:0.125 E5:0.125 D5:0.125 C#5:1 D5:2' },
  spring: { title: 'Spring from The Four Seasons (Vivaldi)', group: 'classical', age: 'adult', bpm: 110,
    notes: 'E5:0.5 G#5:0.5 G#5:0.5 G#5:0.5 F#5:0.25 E5:0.25 B5:1.5 B5:0.25 A5:0.25 G#5:0.5 G#5:0.5 G#5:0.5 F#5:0.25 E5:0.25 B5:1.5' },
};

const NOTE_INDEX: Record<string, number> = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };

/** Parses "E5:1 R:0.5 …" into [frequency or null for a rest, beats]. */
export function parseNotes(notes: string): [number | null, number][] {
  return notes
    .trim()
    .split(/\s+/)
    .map((tok) => {
      const [n, b] = tok.split(':');
      const beats = Number(b);
      if (!(beats > 0)) throw new Error(`Bad note length: ${tok}`);
      if (n === 'R') return [null, beats];
      const m = /^([A-G]#?)(\d)$/.exec(n);
      if (!m) throw new Error(`Bad note: ${tok}`);
      const midi = 12 * (Number(m[2]) + 1) + NOTE_INDEX[m[1]];
      return [440 * Math.pow(2, (midi - 69) / 12), beats];
    });
}

// [prompt, right, wrong answers, age]
export const JINGLE_TRIVIA: [string, string, string[], AgeGroup][] = [
  ['Which fast-food chain\'s jingle goes "ba da ba ba ba"?', "McDonald's", ['Burger King', 'Wendy\'s', 'Taco Bell'], 'kids'],
  ['Which cereal goes "Snap! Crackle! Pop!"?', 'Rice Krispies', ['Corn Flakes', 'Cheerios', 'Froot Loops'], 'kids'],
  ['Tony the Tiger says "They\'re gr-r-reat!" about which cereal?', 'Frosted Flakes', ['Cocoa Puffs', 'Lucky Charms', 'Rice Krispies'], 'kids'],
  ['Which streaming service opens its shows with a "ta-dum" sound?', 'Netflix', ['Disney+', 'Hulu', 'YouTube'], 'teen'],
  ['Which tech company is known for a five-note "bong" and the slogan "Intel Inside"?', 'Intel', ['AMD', 'IBM', 'Dell'], 'teen'],
  ['Which drink\'s 1971 advert had a hilltop choir singing "I\'d Like to Teach the World to Sing"?', 'Coca-Cola', ['Pepsi', 'Sprite', '7 Up'], 'adult'],
  ['Which chocolate bar\'s jingle goes "Gimme a break, gimme a break"?', 'KitKat', ['Twix', 'Snickers', 'Mars'], 'teen'],
  ['"Plop plop, fizz fizz, oh what a relief it is" advertised which product?', 'Alka-Seltzer', ['Pepto-Bismol', 'Tums', 'Aspirin'], 'adult'],
  ['"The best part of waking up is ___ in your cup." Which coffee brand?', 'Folgers', ['Maxwell House', 'Nescafé', 'Starbucks'], 'adult'],
  ['"Like a good neighbor, ___ is there." Which insurance company?', 'State Farm', ['Allstate', 'Geico', 'Progressive'], 'adult'],
  ['Which soft drink invited you to "be a Pepper"?', 'Dr Pepper', ['Pepsi', 'Mountain Dew', 'Sprite'], 'teen'],
  ["Which airline's adverts made Delibes' \"Flower Duet\" famous?", 'British Airways', ['Air France', 'Lufthansa', 'Emirates'], 'adult'],
  ['"Have it your way" was the slogan of which burger chain?', 'Burger King', ["McDonald's", "Wendy's", 'Five Guys'], 'teen'],
];

export function buildTuneQuestions(): BankQuestion[] {
  const rng = mulberry32(99);
  const out: BankQuestion[] = [];
  for (const [id, tune] of Object.entries(TUNES)) {
    const wrong = shuffle(
      Object.entries(TUNES).filter(([oid, t]) => t.group === tune.group && oid !== id).map(([, t]) => t.title),
      rng,
    ).slice(0, 3);
    const choices = shuffle([tune.title, ...wrong], rng);
    out.push({
      id: `tune-${id}`,
      category: 'tunes',
      age: tune.age,
      prompt: 'Name that tune!',
      choices,
      answer: choices.indexOf(tune.title),
      picture: { kind: 'tune', id },
    });
  }
  JINGLE_TRIVIA.forEach(([prompt, right, wrong, age], i) => {
    const choices = shuffle([right, ...wrong], rng);
    out.push({ id: `jingle-${i + 1}`, category: 'tunes', age, prompt, choices, answer: choices.indexOf(right) });
  });
  return out;
}
