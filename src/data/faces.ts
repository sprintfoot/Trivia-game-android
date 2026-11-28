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
  // More famous faces
  ['billie-eilish', 'Billie Eilish', 'music', T],
  ['ariana-grande', 'Ariana Grande', 'music', K],
  ['justin-bieber', 'Justin Bieber', 'music', K],
  ['katy-perry', 'Katy Perry', 'music', K],
  ['shakira', 'Shakira', 'music', T],
  ['prince', 'Prince', 'music', A],
  ['david-bowie', 'David Bowie', 'music', A],
  ['freddie-mercury', 'Freddie Mercury', 'music', T],
  ['john-lennon', 'John Lennon', 'music', T],
  ['ringo-starr', 'Ringo Starr', 'music', A],
  ['mick-jagger', 'Mick Jagger', 'music', A],
  ['bob-marley', 'Bob Marley', 'music', T],
  ['bob-dylan', 'Bob Dylan', 'music', A],
  ['whitney-houston', 'Whitney Houston', 'music', T],
  ['aretha-franklin', 'Aretha Franklin', 'music', A],
  ['johnny-cash', 'Johnny Cash', 'music', A],
  ['willie-nelson', 'Willie Nelson', 'music', A],
  ['eminem', 'Eminem', 'music', T],
  ['snoop-dogg', 'Snoop Dogg', 'music', T],
  ['selena-gomez', 'Selena Gomez', 'music', K],
  ['miley-cyrus', 'Miley Cyrus', 'music', K],
  ['olivia-rodrigo', 'Olivia Rodrigo', 'music', K],
  ['dua-lipa', 'Dua Lipa', 'music', T],
  ['bad-bunny', 'Bad Bunny', 'music', T],
  ['lizzo', 'Lizzo', 'music', T],
  ['tina-turner', 'Tina Turner', 'music', A],
  ['celine-dion', 'Céline Dion', 'music', T],
  ['mariah-carey', 'Mariah Carey', 'music', T],
  ['britney-spears', 'Britney Spears', 'music', T],
  ['jon-bon-jovi', 'Jon Bon Jovi', 'music', A],
  ['bruce-springsteen', 'Bruce Springsteen', 'music', A],
  ['billy-joel', 'Billy Joel', 'music', A],
  ['garth-brooks', 'Garth Brooks', 'music', A],
  ['shania-twain', 'Shania Twain', 'music', A],
  ['carrie-underwood', 'Carrie Underwood', 'music', T],
  ['kelly-clarkson', 'Kelly Clarkson', 'music', T],
  ['pink', 'Pink', 'music', T],
  ['alicia-keys', 'Alicia Keys', 'music', T],
  ['ray-charles', 'Ray Charles', 'music', A],
  ['chuck-berry', 'Chuck Berry', 'music', A],
  ['little-richard', 'Little Richard', 'music', A],
  ['buddy-holly', 'Buddy Holly', 'music', A],
  ['james-brown', 'James Brown', 'music', A],
  ['diana-ross', 'Diana Ross', 'music', A],
  ['bing-crosby', 'Bing Crosby', 'music', A],
  ['ella-fitzgerald', 'Ella Fitzgerald', 'music', A],
  ['billie-holiday', 'Billie Holiday', 'music', A],
  ['duke-ellington', 'Duke Ellington', 'music', A],
  ['luciano-pavarotti', 'Luciano Pavarotti', 'music', A],
  ['yo-yo-ma', 'Yo-Yo Ma', 'music', A],
  ['jimi-hendrix', 'Jimi Hendrix', 'music', A],
  ['janis-joplin', 'Janis Joplin', 'music', A],
  ['ozzy-osbourne', 'Ozzy Osbourne', 'music', A],
  ['stevie-nicks', 'Stevie Nicks', 'music', A],
  ['barbra-streisand', 'Barbra Streisand', 'music', A],
  ['pharrell-williams', 'Pharrell Williams', 'music', T],
  ['lil-nas-x', 'Lil Nas X', 'music', T],
  ['sabrina-carpenter', 'Sabrina Carpenter', 'music', T],
  ['shawn-mendes', 'Shawn Mendes', 'music', T],
  ['camila-cabello', 'Camila Cabello', 'music', T],
  ['nicki-minaj', 'Nicki Minaj', 'music', T],
  ['cardi-b', 'Cardi B', 'music', T],
  ['jay-z', 'Jay-Z', 'music', T],
  ['tom-cruise', 'Tom Cruise', 'screen', T],
  ['brad-pitt', 'Brad Pitt', 'screen', T],
  ['angelina-jolie', 'Angelina Jolie', 'screen', T],
  ['julia-roberts', 'Julia Roberts', 'screen', A],
  ['denzel-washington', 'Denzel Washington', 'screen', T],
  ['scarlett-johansson', 'Scarlett Johansson', 'screen', T],
  ['chris-pratt', 'Chris Pratt', 'screen', T],
  ['emma-watson', 'Emma Watson', 'screen', K],
  ['daniel-radcliffe', 'Daniel Radcliffe', 'screen', K],
  ['johnny-depp', 'Johnny Depp', 'screen', T],
  ['keanu-reeves', 'Keanu Reeves', 'screen', T],
  ['harrison-ford', 'Harrison Ford', 'screen', T],
  ['arnold-schwarzenegger', 'Arnold Schwarzenegger', 'screen', T],
  ['sylvester-stallone', 'Sylvester Stallone', 'screen', T],
  ['jackie-chan', 'Jackie Chan', 'screen', K],
  ['robin-williams', 'Robin Williams', 'screen', T],
  ['jim-carrey', 'Jim Carrey', 'screen', T],
  ['eddie-murphy', 'Eddie Murphy', 'screen', T],
  ['adam-sandler', 'Adam Sandler', 'screen', T],
  ['ryan-reynolds', 'Ryan Reynolds', 'screen', T],
  ['hugh-jackman', 'Hugh Jackman', 'screen', T],
  ['margot-robbie', 'Margot Robbie', 'screen', T],
  ['emma-stone', 'Emma Stone', 'screen', T],
  ['sandra-bullock', 'Sandra Bullock', 'screen', T],
  ['nicole-kidman', 'Nicole Kidman', 'screen', A],
  ['cate-blanchett', 'Cate Blanchett', 'screen', A],
  ['samuel-l-jackson', 'Samuel L. Jackson', 'screen', T],
  ['clint-eastwood', 'Clint Eastwood', 'screen', A],
  ['john-wayne', 'John Wayne', 'screen', A],
  ['james-dean', 'James Dean', 'screen', A],
  ['marlon-brando', 'Marlon Brando', 'screen', A],
  ['humphrey-bogart', 'Humphrey Bogart', 'screen', A],
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
  // More famous paintings

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
