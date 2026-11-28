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
  // More jingles and slogans (asked about in words only)
  ['Which cereal\'s ads say "Silly rabbit, ___ are for kids!"?', 'Trix', ['Lucky Charms', 'Cocoa Puffs', 'Froot Loops'], 'kids'],
  ['Which cereal\'s bird mascot is "cuckoo for" it?', 'Cocoa Puffs', ['Froot Loops', 'Trix', 'Honey Nut Cheerios'], 'kids'],
  ['Which cereal is "magically delicious"?', 'Lucky Charms', ['Trix', 'Cap\'n Crunch', 'Frosted Flakes'], 'kids'],
  ['Which toy store\'s jingle went "I don\'t wanna grow up, I\'m a ___ kid"?', 'Toys "R" Us', ['KB Toys', 'FAO Schwarz', 'Walmart'], 'kids'],
  ['Which chocolate "melts in your mouth, not in your hands"?', 'M&M\'s', ['Hershey\'s Kisses', 'Smarties', 'Milky Way'], 'kids'],
  ['Which brand of crackers is "the snack that smiles back"?', 'Goldfish', ['Cheez-It', 'Ritz', 'Teddy Grahams'], 'kids'],
  ['Which pizza chain\'s ads say "Pizza! Pizza!"?', 'Little Caesars', ['Domino\'s', 'Pizza Hut', 'Papa John\'s'], 'kids'],
  ['Which juice brand\'s mascot is a big pitcher who bursts through walls shouting "Oh yeah!"?', 'Kool-Aid', ['Hawaiian Punch', 'Capri Sun', 'Tang'], 'kids'],
  ['Which cereal\'s mascot is a captain on a ship?', 'Cap\'n Crunch', ['Lucky Charms', 'Count Chocula', 'Trix'], 'kids'],
  ['Which cookie\'s slogan asks "Milk\'s favorite cookie"?', 'Oreo', ['Chips Ahoy!', 'Nilla Wafers', 'Fig Newtons'], 'kids'],
  ['Which fast-food chain\'s slogan was "Eat Fresh"?', 'Subway', ['Chipotle', 'Panera', 'Jimmy John\'s'], 'teen'],
  ['Which fast-food chain\'s slogan is "Think outside the bun"?', 'Taco Bell', ['Chipotle', 'Del Taco', 'Wendy\'s'], 'teen'],
  ['Which chain\'s slogan is "Finger lickin\' good"?', 'KFC', ['Popeyes', 'Chick-fil-A', 'Church\'s'], 'teen'],
  ['Which pizza chain says "Better ingredients. Better pizza."?', 'Papa John\'s', ['Domino\'s', 'Pizza Hut', 'Little Caesars'], 'teen'],
  ['Which candy bar says "You\'re not you when you\'re hungry"?', 'Snickers', ['Twix', 'Milky Way', 'Mars'], 'teen'],
  ['Which gum brand says "Double your pleasure, double your fun"?', 'Doublemint', ['Juicy Fruit', 'Trident', 'Big Red'], 'teen'],
  ['Which brand\'s slogan is "Because you\'re worth it"?', 'L\'Oréal', ['Maybelline', 'Revlon', 'Dove'], 'teen'],
  ['Which brand\'s slogan is "Maybe she\'s born with it"?', 'Maybelline', ['L\'Oréal', 'CoverGirl', 'Revlon'], 'teen'],
  ['Which credit card asks "What\'s in your wallet?"?', 'Capital One', ['Visa', 'American Express', 'Discover'], 'teen'],
  ['Which credit card\'s ads called some things "Priceless"?', 'Mastercard', ['Visa', 'American Express', 'Discover'], 'teen'],
  ['Which store\'s slogan is "Expect more. Pay less."?', 'Target', ['Walmart', 'Costco', 'Kmart'], 'teen'],
  ['Which store\'s slogan is "Save money. Live better."?', 'Walmart', ['Target', 'Kroger', 'Costco'], 'teen'],
  ['Which car company\'s slogan was "Built Ford Tough" for its trucks?', 'Ford', ['Chevrolet', 'Dodge', 'GMC'], 'teen'],
  ['Which brand of batteries has a pink bunny that "keeps going and going"?', 'Energizer', ['Duracell', 'Rayovac', 'Panasonic'], 'teen'],
  ['Which brand of paper towel was called "the quicker picker-upper"?', 'Bounty', ['Brawny', 'Viva', 'Scott'], 'teen'],
  ['Which mint is "curiously strong"?', 'Altoids', ['Tic Tac', 'Mentos', 'Certs'], 'teen'],
  ['Which mint brand\'s ads featured people "freshmaker" moments?', 'Mentos', ['Altoids', 'Tic Tac', 'Life Savers'], 'teen'],
  ['Which soup brand says "M\'m! M\'m! Good!"?', 'Campbell\'s', ['Progresso', 'Heinz', 'Lipton'], 'teen'],
  ['Which ketchup brand\'s ads made waiting for slow ketchup famous with "Anticipation"?', 'Heinz', ['Hunt\'s', 'French\'s', 'Del Monte'], 'teen'],
  ['Which hot sauce brand\'s slogan is "I put that ___ on everything"?', 'Frank\'s RedHot', ['Tabasco', 'Cholula', 'Sriracha'], 'teen'],
  ['Which brand of baked beans has a talking dog named Duke in its ads?', 'Bush\'s', ['Heinz', 'B&M', 'Van Camp\'s'], 'teen'],
  ['Which drink\'s famous ad campaign asked "Got ___?"', 'Milk', ['Juice', 'Soda', 'Coffee'], 'teen'],
  ['Which insurance company has a gecko mascot?', 'Geico', ['State Farm', 'Progressive', 'Allstate'], 'teen'],
  ['Which insurance company\'s ads feature "Flo"?', 'Progressive', ['Geico', 'Allstate', 'Liberty Mutual'], 'teen'],
  ['Which insurance company asks "Are you in good hands?"', 'Allstate', ['State Farm', 'Nationwide', 'Farmers'], 'teen'],
  ['Which insurance company\'s jingle is "Nationwide is on your side"?', 'Nationwide', ['State Farm', 'Allstate', 'Geico'], 'teen'],
  ['Which pet food brand\'s jingle went "Meow meow meow meow"?', 'Meow Mix', ['Friskies', 'Whiskas', 'Fancy Feast'], 'teen'],
  ['Which hot dog brand\'s jingle went "I wish I were an ___ wiener"?', 'Oscar Mayer', ['Ball Park', 'Nathan\'s', 'Hebrew National'], 'adult'],
  ['Which bologna brand\'s jingle spells out "My bologna has a first name"?', 'Oscar Mayer', ['Boar\'s Head', 'Armour', 'Bar-S'], 'adult'],
  ['Which car rental company said "We try harder"?', 'Avis', ['Hertz', 'Enterprise', 'Budget'], 'adult'],
  ['Which brand said "Where\'s the beef?" in a famous 1984 ad?', 'Wendy\'s', ['McDonald\'s', 'Burger King', 'Arby\'s'], 'adult'],
  ['Which airline jingle invited you to "fly the friendly skies"?', 'United Airlines', ['Delta', 'American Airlines', 'Pan Am'], 'adult'],
  ['Which cat food brand\'s ads starred a finicky cat named Morris?', '9Lives', ['Meow Mix', 'Friskies', 'Purina'], 'adult'],
  ['Which brand\'s jingle says "Nobody doesn\'t like ___"?', 'Sara Lee', ['Pillsbury', 'Entenmann\'s', 'Little Debbie'], 'adult'],
  ['Which cassette tape brand asked "Is it live, or is it ___?"', 'Memorex', ['Maxell', 'TDK', 'Sony'], 'adult'],
  ['Which shampoo\'s ads said "I told two friends, and they told two friends"?', 'Fabergé Organics', ['Head & Shoulders', 'Pantene', 'Prell'], 'adult'],
  ['Which brand of watch "takes a licking and keeps on ticking"?', 'Timex', ['Casio', 'Swatch', 'Seiko'], 'adult'],
  ['Which fast-food chain\'s jingle went "Hold the pickles, hold the lettuce"?', 'Burger King', ['McDonald\'s', 'Wendy\'s', 'Jack in the Box'], 'teen'],
  ['Which restaurant chain is famous for the slogan "Eat Mor Chikin" with cows holding signs?', 'Chick-fil-A', ['KFC', 'Popeyes', 'Bojangles'], 'teen'],
  ['Which candy was advertised as "two great tastes that taste great together"?', 'Reese\'s Peanut Butter Cups', ['Snickers', 'Twix', 'Butterfinger'], 'teen'],
  ['Which cola\'s ads were part of the "Pepsi Challenge" taste test against its rival?', 'Pepsi', ['RC Cola', 'Dr Pepper', 'Tab'], 'adult'],
  ['Which antacid\'s jingle went "How do you spell relief? R-O-L-A-I-D-S"?', 'Rolaids', ['Tums', 'Alka-Seltzer', 'Pepto-Bismol'], 'adult'],
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
