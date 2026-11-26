import { mulberry32, shuffle, type AgeGroup, type BankQuestion } from '../game/session';

/**
 * "Who am I?": four clues about a famous person, hardest first, that appear one at a time.
 * Each entry: field icon, answer, clues, wrong answers, age. Only well-documented, respectful facts.
 */
const K: AgeGroup = 'kids';
const T: AgeGroup = 'teen';
const A: AgeGroup = 'adult';

type Entry = [string, string, [string, string, string, string], [string, string, string], AgeGroup];

const PEOPLE: Entry[] = [
  // Painters and artists
  ['🎨', 'Leonardo da Vinci', ['I was born in Italy in 1452.', 'I filled notebooks with designs for flying machines.', 'I painted The Last Supper.', 'I painted the Mona Lisa.'], ['Michelangelo', 'Raphael', 'Botticelli'], K],
  ['🎨', 'Vincent van Gogh', ['I was born in the Netherlands in 1853.', 'I sold very few paintings in my lifetime.', 'I painted many vases of sunflowers.', 'I painted The Starry Night.'], ['Claude Monet', 'Paul Cézanne', 'Pablo Picasso'], T],
  ['🎨', 'Pablo Picasso', ['I was born in Málaga, Spain, in 1881.', 'My "Blue Period" paintings are famous.', 'I helped invent Cubism.', 'I painted Guernica.'], ['Salvador Dalí', 'Henri Matisse', 'Joan Miró'], T],
  ['🎨', 'Frida Kahlo', ['I was born in Coyoacán, Mexico, in 1907.', 'I was married to the muralist Diego Rivera.', 'Many of my paintings are self-portraits.', 'I often painted myself with flowers in my hair.'], ["Georgia O'Keeffe", 'Mary Cassatt', 'Tamara de Lempicka'], A],
  ['🎨', 'Michelangelo', ['I was born near Florence in 1475.', 'I designed the dome of St. Peter’s Basilica.', 'I carved the marble statue of David.', 'I painted the ceiling of the Sistine Chapel.'], ['Leonardo da Vinci', 'Raphael', 'Donatello'], T],
  ['🎨', 'Claude Monet', ['I was born in Paris in 1840.', 'One of my paintings gave Impressionism its name.', 'I painted my garden at Giverny again and again.', 'I’m famous for my paintings of water lilies.'], ['Pierre-Auguste Renoir', 'Edgar Degas', 'Édouard Manet'], A],
  ['🎨', 'Andy Warhol', ['I grew up in Pittsburgh.', 'My New York studio was called The Factory.', 'I made colorful prints of Marilyn Monroe.', 'I painted Campbell’s Soup cans.'], ['Roy Lichtenstein', 'Keith Haring', 'Jean-Michel Basquiat'], T],
  ['🎨', 'Salvador Dalí', ['I was born in Catalonia, Spain, in 1904.', 'I was a leading Surrealist.', 'My mustache curled up at the ends.', 'I painted melting clocks in The Persistence of Memory.'], ['René Magritte', 'Pablo Picasso', 'Joan Miró'], T],
  ['🎨', 'Bob Ross', ['I spent 20 years in the U.S. Air Force.', 'I painted on TV in a soft, calm voice.', 'My show was called The Joy of Painting.', 'I loved painting “happy little trees.”'], ['Thomas Kinkade', 'Norman Rockwell', 'Andy Warhol'], K],
  // Musicians
  ['🎤', 'Elvis Presley', ['I was born in Tupelo, Mississippi.', 'My Memphis home is called Graceland.', 'I starred in the movie Jailhouse Rock.', 'I’m called the King of Rock and Roll.'], ['Johnny Cash', 'Buddy Holly', 'Chuck Berry'], T],
  ['🎤', 'Michael Jackson', ['I grew up in Gary, Indiana.', 'I sang with my brothers when I was a kid.', 'I made the moonwalk famous.', 'My album Thriller is one of the best-selling albums ever.'], ['Prince', 'Stevie Wonder', 'Usher'], T],
  ['🎤', 'Taylor Swift', ['I was born in Pennsylvania in 1989.', 'I started out as a country singer.', 'I re-recorded my early albums so I could own them.', 'My Eras Tour broke concert records.'], ['Katy Perry', 'Selena Gomez', 'Ariana Grande'], K],
  ['🎤', 'Beyoncé', ['I was born in Houston, Texas.', 'I first found fame in the group Destiny’s Child.', 'I sang “Single Ladies (Put a Ring on It).”', 'I’ve won more Grammy Awards than anyone in history.'], ['Rihanna', 'Mariah Carey', 'Alicia Keys'], T],
  ['🎤', 'Paul McCartney', ['I was born in Liverpool in 1942.', 'I played bass guitar in my famous band.', 'I wrote the song “Yesterday.”', 'I was a Beatle alongside John, George and Ringo.'], ['Mick Jagger', 'Elton John', 'Rod Stewart'], T],
  ['🎤', 'Elton John', ['I was born Reginald Dwight.', 'I write songs with the lyricist Bernie Taupin.', 'I sang “Rocket Man.”', 'I wrote the music for Disney’s The Lion King.'], ['Freddie Mercury', 'David Bowie', 'Billy Joel'], A],
  ['🎤', 'Freddie Mercury', ['I was born on the island of Zanzibar.', 'I studied graphic design in London.', 'My band’s Live Aid show in 1985 is legendary.', 'I sang “Bohemian Rhapsody” with Queen.'], ['David Bowie', 'Mick Jagger', 'Robert Plant'], A],
  ['🎤', 'Dolly Parton', ['I grew up in the Smoky Mountains of Tennessee.', 'My Imagination Library sends free books to children.', 'I wrote “Jolene” and “I Will Always Love You.”', 'I starred in the movie 9 to 5 and wrote its theme song.'], ['Reba McEntire', 'Shania Twain', 'Loretta Lynn'], T],
  ['🎻', 'Wolfgang Amadeus Mozart', ['I was born in Salzburg in 1756.', 'I wrote my first pieces when I was five.', 'I wrote the opera The Magic Flute.', 'I composed Eine kleine Nachtmusik.'], ['Ludwig van Beethoven', 'Johann Sebastian Bach', 'Joseph Haydn'], T],
  ['🎻', 'Ludwig van Beethoven', ['I was born in Bonn, Germany, in 1770.', 'I kept composing after I lost my hearing.', 'My Ninth Symphony includes the “Ode to Joy.”', 'My Fifth Symphony begins da-da-da-DUM.'], ['Wolfgang Amadeus Mozart', 'Frédéric Chopin', 'Johannes Brahms'], T],
  // Film, TV and stage
  ['🎬', 'Charlie Chaplin', ['I was born in London in 1889.', 'I helped found the studio United Artists.', 'I starred in silent films like The Gold Rush.', 'My character, the Tramp, wore a bowler hat and carried a cane.'], ['Buster Keaton', 'Harold Lloyd', 'Stan Laurel'], A],
  ['🎬', 'Marilyn Monroe', ['I was born Norma Jeane in Los Angeles.', 'I starred in Some Like It Hot.', 'I sang “Happy Birthday, Mr. President” to John F. Kennedy.', 'A photo of my white dress over a subway grate is famous.'], ['Audrey Hepburn', 'Grace Kelly', 'Elizabeth Taylor'], A],
  ['🎬', 'Tom Hanks', ['I was born in California in 1956.', 'I won Best Actor Oscars two years in a row.', 'I voice Woody in Toy Story.', 'In one movie I said life is like a box of chocolates.'], ['Tom Cruise', 'Harrison Ford', 'Denzel Washington'], T],
  ['🎬', 'Dwayne Johnson', ['I played college football at the University of Miami.', 'I was a WWE champion.', 'I voiced Maui in Moana.', 'My nickname is The Rock.'], ['John Cena', 'Vin Diesel', 'Jason Momoa'], K],
  ['🎬', 'Meryl Streep', ['I was born in New Jersey in 1949.', 'I’ve been nominated for more acting Oscars than anyone.', 'I played a tough fashion editor in The Devil Wears Prada.', 'I sang ABBA songs in Mamma Mia!'], ['Julia Roberts', 'Sandra Bullock', 'Glenn Close'], A],
  ['🎬', 'Steven Spielberg', ['I was born in Cincinnati in 1946.', 'I co-founded the studio DreamWorks.', 'My movie Jaws made people nervous about swimming.', 'I directed E.T. the Extra-Terrestrial.'], ['George Lucas', 'James Cameron', 'Martin Scorsese'], T],
  ['🎬', 'Walt Disney', ['I was born in Chicago in 1901.', 'I created Mickey Mouse with Ub Iwerks.', 'I opened a theme park in Anaheim, California, in 1955.', 'My name is on one of the world’s biggest entertainment companies.'], ['Jim Henson', 'Charles Schulz', 'Stan Lee'], K],
  ['🎬', 'Jim Henson', ['I was born in Mississippi in 1936.', 'I directed the fantasy film The Dark Crystal.', 'I created puppets for Sesame Street.', 'I was the original performer of Kermit the Frog.'], ['Walt Disney', 'Fred Rogers', 'Frank Oz'], T],
  ['🎬', 'Oprah Winfrey', ['I was born in Kosciusko, Mississippi.', 'I founded a leadership school for girls in South Africa.', 'My book club turned novels into bestsellers.', 'My talk show ran for 25 years.'], ['Ellen DeGeneres', 'Martha Stewart', 'Barbara Walters'], T],
  ['🎭', 'Lin-Manuel Miranda', ['I grew up in the Inwood neighborhood of Manhattan.', 'My first Broadway hit was In the Heights.', 'I wrote songs for Disney’s Moana and Encanto.', 'I wrote and starred in the musical Hamilton.'], ['Hugh Jackman', 'Ben Platt', 'Leslie Odom Jr.'], T],
  ['💥', 'Stan Lee', ['I was born in New York City in 1922.', 'I was the longtime editor of Marvel Comics.', 'I popped up in cameos in lots of Marvel movies.', 'I co-created Spider-Man.'], ['Bob Kane', 'Charles Schulz', 'Jim Davis'], T],
  // Sports
  ['🏀', 'Michael Jordan', ['I played college basketball at North Carolina.', 'I took a break to play minor league baseball.', 'I won six NBA titles with the Chicago Bulls.', 'My Nike sneaker line, named after me, is hugely famous.'], ['LeBron James', 'Kobe Bryant', 'Magic Johnson'], K],
  ['🎾', 'Serena Williams', ['I grew up in Compton, California.', 'I won Olympic gold medals in doubles.', 'I won 23 Grand Slam singles titles.', 'My sister Venus is also a tennis champion.'], ['Steffi Graf', 'Maria Sharapova', 'Naomi Osaka'], T],
  ['⚾', 'Babe Ruth', ['I was born in Baltimore in 1895.', 'I started out as a pitcher for the Boston Red Sox.', 'Old Yankee Stadium was called “the House That I Built.”', 'My nickname was the Bambino.'], ['Lou Gehrig', 'Joe DiMaggio', 'Mickey Mantle'], T],
  ['🥊', 'Muhammad Ali', ['I won Olympic gold in Rome in 1960.', 'I fought George Foreman in the Rumble in the Jungle.', 'I was born Cassius Clay.', 'I said I could float like a butterfly and sting like a bee.'], ['Joe Frazier', 'Mike Tyson', 'Sugar Ray Leonard'], T],
  ['⚽', 'Pelé', ['I was born in Brazil in 1940.', 'I played for Santos and the New York Cosmos.', 'I’m the only player to win three World Cups.', 'I’m often called the King of Football.'], ['Diego Maradona', 'Ronaldo', 'Lionel Messi'], T],
  ['🤸', 'Simone Biles', ['I was born in Ohio in 1997.', 'Several gymnastics moves are named after me.', 'I’ve won more World Championship medals than any other gymnast.', 'I won four gold medals at the 2016 Rio Olympics.'], ['Gabby Douglas', 'Nadia Comăneci', 'Aly Raisman'], K],
  // Writers
  ['✍️', 'William Shakespeare', ['I was born in Stratford-upon-Avon.', 'My plays were performed at the Globe Theatre.', 'I wrote 154 sonnets.', 'I wrote Romeo and Juliet.'], ['Charles Dickens', 'Christopher Marlowe', 'Jane Austen'], T],
  ['✍️', 'Dr. Seuss', ['I went to Dartmouth College.', 'I wrote a whole book using only 50 different words.', 'My real name was Theodor Geisel.', 'I wrote The Cat in the Hat.'], ['Roald Dahl', 'Shel Silverstein', 'Maurice Sendak'], K],
  ['✍️', 'Mark Twain', ['I grew up in Hannibal, Missouri.', 'I worked as a Mississippi riverboat pilot.', 'My real name was Samuel Clemens.', 'I wrote Adventures of Huckleberry Finn.'], ['Edgar Allan Poe', 'Jack London', 'Herman Melville'], A],
  ['✍️', 'J.K. Rowling', ['I wrote parts of my first book in Edinburgh cafés.', 'I also write crime novels as Robert Galbraith.', 'My first book was turned down by many publishers.', 'I created Harry Potter.'], ['Roald Dahl', 'C.S. Lewis', 'Suzanne Collins'], K],
];

export const WHO_AM_I_COUNT = PEOPLE.length;

export function buildWhoAmIQuestions(): BankQuestion[] {
  const rng = mulberry32(411);
  return PEOPLE.map(([icon, right, clues, wrong, age], i) => {
    const choices = shuffle([right, ...wrong], rng);
    return {
      id: `whoami-${String(i + 1).padStart(3, '0')}`,
      category: 'whoami' as const,
      age,
      prompt: 'Who am I?',
      choices,
      answer: choices.indexOf(right),
      picture: { kind: 'clues' as const, icon, clues: [...clues] },
    };
  });
}
