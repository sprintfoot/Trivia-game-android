import credits from './faceCredits.json';
import { mulberry32, shuffle, type AgeGroup, type BankQuestion } from '../game/session';

/**
 * Famous Faces: free-licensed photos (public domain or Creative Commons, from Wikimedia Commons)
 * and public-domain paintings that start blocky and come clearer. Credits are shown when the answer
 * is revealed and listed in public/faces/CREDITS.md.
 */
const K: AgeGroup = 'kids';
const T: AgeGroup = 'teen';
const A: AgeGroup = 'adult';

type Field = 'music' | 'screen' | 'sports' | 'icons';

/** id (photo file name), name, field, age. */
const PEOPLE: [string, string, Field, AgeGroup][] = [
  ['taylor-swift', 'Taylor Swift', 'music', K],
  ['beyonce', 'Beyoncé', 'music', K],
  ['elvis-presley', 'Elvis Presley', 'music', T],
  ['michael-jackson', 'Michael Jackson', 'music', T],
  ['dolly-parton', 'Dolly Parton', 'music', T],
  ['lady-gaga', 'Lady Gaga', 'music', T],
  ['ed-sheeran', 'Ed Sheeran', 'music', K],
  ['paul-mccartney', 'Paul McCartney', 'music', A],
  ['elton-john', 'Elton John', 'music', T],
  ['rihanna', 'Rihanna', 'music', T],
  ['bruno-mars', 'Bruno Mars', 'music', T],
  ['stevie-wonder', 'Stevie Wonder', 'music', A],
  ['frank-sinatra', 'Frank Sinatra', 'music', A],
  ['louis-armstrong', 'Louis Armstrong', 'music', A],
  ['tom-hanks', 'Tom Hanks', 'screen', K],
  ['dwayne-johnson', 'Dwayne Johnson', 'screen', K],
  ['meryl-streep', 'Meryl Streep', 'screen', A],
  ['marilyn-monroe', 'Marilyn Monroe', 'screen', A],
  ['audrey-hepburn', 'Audrey Hepburn', 'screen', A],
  ['charlie-chaplin', 'Charlie Chaplin', 'screen', T],
  ['zendaya', 'Zendaya', 'screen', T],
  ['will-smith', 'Will Smith', 'screen', T],
  ['morgan-freeman', 'Morgan Freeman', 'screen', T],
  ['leonardo-dicaprio', 'Leonardo DiCaprio', 'screen', T],
  ['jennifer-lopez', 'Jennifer Lopez', 'screen', T],
  ['oprah-winfrey', 'Oprah Winfrey', 'screen', T],
  ['walt-disney', 'Walt Disney', 'screen', K],
  ['lucille-ball', 'Lucille Ball', 'screen', A],
  ['serena-williams', 'Serena Williams', 'sports', T],
  ['michael-jordan', 'Michael Jordan', 'sports', K],
  ['muhammad-ali', 'Muhammad Ali', 'sports', T],
  ['lebron-james', 'LeBron James', 'sports', K],
  ['simone-biles', 'Simone Biles', 'sports', K],
  ['babe-ruth', 'Babe Ruth', 'sports', T],
  ['pele', 'Pelé', 'sports', T],
  ['lionel-messi', 'Lionel Messi', 'sports', K],
  ['tom-brady', 'Tom Brady', 'sports', T],
  ['usain-bolt', 'Usain Bolt', 'sports', T],
  ['jackie-robinson', 'Jackie Robinson', 'sports', A],
  ['frida-kahlo', 'Frida Kahlo', 'icons', A],
  ['albert-einstein', 'Albert Einstein', 'icons', K],
  ['mark-twain', 'Mark Twain', 'icons', A],
  ['andy-warhol', 'Andy Warhol', 'icons', A],
  ['neil-armstrong', 'Neil Armstrong', 'icons', T],
  ['amelia-earhart', 'Amelia Earhart', 'icons', T],
  ['martin-luther-king-jr', 'Martin Luther King Jr.', 'icons', T],
  ['abraham-lincoln', 'Abraham Lincoln', 'icons', K],
  ['salvador-dali', 'Salvador Dalí', 'icons', A],
  ['pablo-picasso', 'Pablo Picasso', 'icons', A],
];

/** Famous paintings: id, painting, painter, three other painters, age. */
const PAINTINGS: [string, string, string, [string, string, string], AgeGroup][] = [
  ['mona-lisa', 'Mona Lisa', 'Leonardo da Vinci', ['Michelangelo', 'Raphael', 'Botticelli'], K],
  ['starry-night', 'The Starry Night', 'Vincent van Gogh', ['Claude Monet', 'Paul Cézanne', 'Edvard Munch'], T],
  ['the-scream', 'The Scream', 'Edvard Munch', ['Vincent van Gogh', 'Gustav Klimt', 'Egon Schiele'], T],
  ['pearl-earring', 'Girl with a Pearl Earring', 'Johannes Vermeer', ['Rembrandt', 'Frans Hals', 'Jan van Eyck'], A],
  ['great-wave', 'The Great Wave off Kanagawa', 'Hokusai', ['Hiroshige', 'Utamaro', 'Sesshū'], A],
  ['american-gothic', 'American Gothic', 'Grant Wood', ['Norman Rockwell', 'Edward Hopper', 'Andrew Wyeth'], A],
  ['creation-of-adam', 'The Creation of Adam', 'Michelangelo', ['Raphael', 'Leonardo da Vinci', 'Caravaggio'], T],
  ['water-lilies', 'Water Lilies', 'Claude Monet', ['Édouard Manet', 'Pierre-Auguste Renoir', 'Edgar Degas'], A],
  ['sunflowers', 'Sunflowers', 'Vincent van Gogh', ['Paul Gauguin', 'Claude Monet', 'Henri Matisse'], T],
  ['night-watch', 'The Night Watch', 'Rembrandt', ['Johannes Vermeer', 'Peter Paul Rubens', 'Diego Velázquez'], A],
];

interface Credit {
  title: string;
  license: string;
  artist: string;
}
const CREDITS = credits as Record<string, Credit>;

const creditLine = (c: Credit) => `${c.artist ? `${c.artist} · ` : ''}${c.license} · Wikimedia Commons`;

/** Only people and paintings whose free-licensed image was found and checked are used. */
export function buildFaceQuestions(): BankQuestion[] {
  const rng = mulberry32(2026);
  const out: BankQuestion[] = [];
  const have = PEOPLE.filter(([id]) => CREDITS[id]);
  for (const [id, name, field, age] of have) {
    // Wrong answers come from the same field (music, screen, ...), topped up from others if it is short.
    const same = shuffle(have.filter((p) => p[2] === field && p[0] !== id).map((p) => p[1]), rng);
    const rest = shuffle(have.filter((p) => p[2] !== field).map((p) => p[1]), rng);
    const others = [...same, ...rest].slice(0, 3);
    const choices = shuffle([name, ...others], rng);
    out.push({ id: `face-${id}`, category: 'faces', age, prompt: 'Who is this?', choices, answer: choices.indexOf(name), picture: { kind: 'photo', id, credit: creditLine(CREDITS[id]) } });
  }
  for (const [id, title, painter, wrong, age] of PAINTINGS) {
    if (!CREDITS[id]) continue;
    const choices = shuffle([painter, ...wrong], rng);
    out.push({ id: `painting-${id}`, category: 'faces', age, prompt: `Who painted ${title}?`, choices, answer: choices.indexOf(painter), picture: { kind: 'photo', id, credit: creditLine(CREDITS[id]) } });
  }
  return out;
}
