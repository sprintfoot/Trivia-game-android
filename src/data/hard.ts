import { mulberry32, shuffle, type BankQuestion } from '../game/session';
import type { CategoryId } from '../game/categories';

/**
 * Expert questions: harder ones for the Experts level (16 and up).
 * Each row: category, question, right answer, three wrong answers.
 */
const HARD: [CategoryId, string, string, string, string, string][] = [
  // General knowledge
  ['general', 'What is the only letter that does not appear in any US state name?', 'Q', 'J', 'X', 'Z'],
  ['general', 'How many squares are on a chessboard, counting every size (1×1 up to 8×8)?', '204', '64', '128', '256'],
  ['general', 'What is a group of crows called?', 'A murder', 'A parliament', 'A conspiracy', 'A pride'],
  ['general', 'In which country was the game of chess most likely invented?', 'India', 'Persia', 'China', 'Egypt'],
  ['general', 'What does the "SPF" on sunscreen stand for?', 'Sun Protection Factor', 'Solar Protection Formula', 'Skin Protection Factor', 'Sun Proof Filter'],
  ['general', 'Which language has the most native speakers in the world?', 'Mandarin Chinese', 'Spanish', 'English', 'Hindi'],
  ['general', 'What is the fear of long words called?', 'Hippopotomonstrosesquippedaliophobia', 'Logophobia', 'Verbophobia', 'Sesquipedalophobia'],
  ['general', 'How many bones are in the adult human hand, including the wrist?', '27', '19', '32', '21'],
  ['general', 'What is the name of the dot above a lowercase "i"?', 'Tittle', 'Jot', 'Serif', 'Pip'],
  ['general', 'Which playing card is nicknamed "the suicide king" because he appears to stab himself?', 'King of hearts', 'King of spades', 'King of clubs', 'King of diamonds'],

  // Movies
  ['screen', 'Which film won the first ever Academy Award for Best Picture?', 'Wings', 'Sunrise', 'The Jazz Singer', 'All Quiet on the Western Front'],
  ['screen', 'Who directed "2001: A Space Odyssey"?', 'Stanley Kubrick', 'Steven Spielberg', 'George Lucas', 'Ridley Scott'],
  ['screen', 'In "Citizen Kane", what is "Rosebud"?', 'A sled', 'A horse', 'A boat', 'A girl'],
  ['screen', 'Which performer has won the most Academy Awards for acting?', 'Katharine Hepburn', 'Meryl Streep', 'Daniel Day-Lewis', 'Jack Nicholson'],
  ['screen', 'What is the name of the hotel in "The Shining"?', 'The Overlook Hotel', 'The Bates Motel', 'The Stanley Hotel', 'The Grand Budapest'],
  ['screen', 'Which 1997 film was the first to earn over $1 billion worldwide?', 'Titanic', 'Jurassic Park', 'Star Wars: Episode I', 'Independence Day'],
  ['screen', 'In "The Godfather", what animal\'s head is left in the film producer\'s bed?', 'A horse', 'A bull', 'A dog', 'A goat'],
  ['screen', 'Who composed the music for "Jaws", "Star Wars" and "Harry Potter"?', 'John Williams', 'Hans Zimmer', 'Danny Elfman', 'James Horner'],
  ['screen', 'Which film features the line "I\'m going to make him an offer he can\'t refuse"?', 'The Godfather', 'Goodfellas', 'Scarface', 'Casino'],
  ['screen', 'What was the first feature-length film made entirely with computer animation?', 'Toy Story', 'Shrek', 'Antz', 'A Bug\'s Life'],

  // Disney & Pixar
  ['disney', 'What was the first full-length animated feature film Disney released?', 'Snow White and the Seven Dwarfs', 'Pinocchio', 'Fantasia', 'Bambi'],
  ['disney', 'In "Up", what is the name of the explorer Carl and Ellie idolised?', 'Charles Muntz', 'Russell Fredricksen', 'Dug Montgomery', 'Kevin Burke'],
  ['disney', 'What is the name of the pizza restaurant in "Toy Story"?', 'Pizza Planet', 'Pizza Galaxy', 'Rocket Pizza', 'Space Slice'],
  ['disney', 'In "Ratatouille", what is the name of the food critic?', 'Anton Ego', 'Auguste Gusteau', 'Skinner', 'Colette Tatou'],
  ['disney', 'What does "WALL-E" stand for?', 'Waste Allocation Load Lifter – Earth-Class', 'Waste And Litter Lifter – Earth', 'World Automated Loading Lifter – Earth', 'Waste Allocation Lifter – Electric'],
  ['disney', 'Which was the first animated film nominated for Best Picture at the Oscars?', 'Beauty and the Beast', 'The Lion King', 'Aladdin', 'The Little Mermaid'],
  ['disney', 'In "Monsters, Inc.", what is Sulley\'s full first name?', 'James', 'Sullivan', 'Samuel', 'Steven'],
  ['disney', 'What year did Disneyland open in California?', '1955', '1948', '1962', '1971'],
  ['disney', 'Which Pixar film is set mainly in the Land of the Dead?', 'Coco', 'Soul', 'Onward', 'Luca'],

  // TV
  ['tv', 'In "Breaking Bad", what was Walter White\'s alias?', 'Heisenberg', 'Schrödinger', 'Einstein', 'Oppenheimer'],
  ['tv', 'What is the name of the coffee shop in "Friends"?', 'Central Perk', 'Java Joe\'s', 'The Grind', 'Monk\'s'],
  ['tv', 'In "Seinfeld", what is Kramer\'s first name?', 'Cosmo', 'Kenny', 'Newman', 'Jerome'],
  ['tv', 'Which TV show is set in the fictional town of Hawkins, Indiana?', 'Stranger Things', 'Twin Peaks', 'Riverdale', 'Gravity Falls'],
  ['tv', 'In "The Office" (US), what is the name of the paper company?', 'Dunder Mifflin', 'Wernham Hogg', 'Sabre Paper', 'Michael Scott Paper Co.'],
  ['tv', 'Which show features the houses Stark, Lannister and Targaryen?', 'Game of Thrones', 'The Witcher', 'Vikings', 'The Last Kingdom'],
  ['tv', 'How many seasons did "The Sopranos" run?', '6', '5', '7', '8'],
  ['tv', 'What was the first music video ever played on MTV in 1981?', '"Video Killed the Radio Star"', '"Thriller"', '"Take On Me"', '"Money for Nothing"'],
  ['tv', 'In "The Simpsons", what is the name of Mr. Burns\'s assistant?', 'Waylon Smithers', 'Lenny Leonard', 'Carl Carlson', 'Seymour Skinner'],

  // Music
  ['music', 'How many symphonies did Beethoven complete?', '9', '7', '12', '5'],
  ['music', 'Which band released the album "The Dark Side of the Moon"?', 'Pink Floyd', 'Led Zeppelin', 'The Who', 'Genesis'],
  ['music', 'How many keys does a standard piano have?', '88', '76', '92', '64'],
  ['music', 'Which composer wrote "The Four Seasons"?', 'Antonio Vivaldi', 'Johann Sebastian Bach', 'George Frideric Handel', 'Wolfgang Amadeus Mozart'],
  ['music', 'What was the Beatles\' first single released in the UK?', '"Love Me Do"', '"Please Please Me"', '"She Loves You"', '"I Want to Hold Your Hand"'],
  ['music', 'Which album is the best-selling album of all time worldwide?', 'Thriller', 'Back in Black', 'The Dark Side of the Moon', 'Bat Out of Hell'],
  ['music', 'In music, what does "forte" mean?', 'Loud', 'Fast', 'Slow', 'Soft'],
  ['music', 'Which singer was known as "The Queen of Soul"?', 'Aretha Franklin', 'Diana Ross', 'Whitney Houston', 'Tina Turner'],
  ['music', 'Which rock band was originally named "The Quarrymen"?', 'The Beatles', 'The Rolling Stones', 'The Kinks', 'The Hollies'],

  // Pop stars
  ['pop', 'What is Lady Gaga\'s real first name?', 'Stefani', 'Stephanie', 'Gabriella', 'Joanne'],
  ['pop', 'Which artist has won the most Grammy Awards ever?', 'Beyoncé', 'Taylor Swift', 'Quincy Jones', 'Michael Jackson'],
  ['pop', 'What was the name of Taylor Swift\'s first album?', 'Taylor Swift', 'Fearless', 'Speak Now', 'Red'],
  ['pop', 'What is Bruno Mars\'s real first name?', 'Peter', 'Bruno', 'Michael', 'Joseph'],
  ['pop', 'Which country is the singer Shakira from?', 'Colombia', 'Mexico', 'Spain', 'Argentina'],
  ['pop', 'Which group had hits with "Wannabe" and "Spice Up Your Life"?', 'Spice Girls', 'All Saints', 'Destiny\'s Child', 'Girls Aloud'],
  ['pop', 'Elton John\'s "Candle in the Wind 1997" was a tribute to whom?', 'Princess Diana', 'Marilyn Monroe', 'John Lennon', 'Freddie Mercury'],
  ['pop', 'Which K-pop group released "Dynamite" in 2020?', 'BTS', 'BLACKPINK', 'EXO', 'TWICE'],
  ['pop', 'What is the name of Beyoncé\'s 2016 visual album?', 'Lemonade', 'Renaissance', 'Formation', 'Cowboy Carter'],

  // Superheroes
  ['heroes', 'What is the name of Thor\'s hammer?', 'Mjölnir', 'Stormbreaker', 'Gungnir', 'Jarnbjorn'],
  ['heroes', 'In which year did Superman first appear in a comic?', '1938', '1945', '1929', '1952'],
  ['heroes', 'What metal is bonded to Wolverine\'s skeleton?', 'Adamantium', 'Vibranium', 'Titanium', 'Uru'],
  ['heroes', 'What is the name of Black Panther\'s home country?', 'Wakanda', 'Genosha', 'Latveria', 'Sokovia'],
  ['heroes', 'Which villain is the Joker\'s girlfriend?', 'Harley Quinn', 'Poison Ivy', 'Catwoman', 'Killer Frost'],
  ['heroes', 'Which comic book writer co-created Spider-Man, the X-Men and the Fantastic Four?', 'Stan Lee', 'Jack Kirby', 'Bob Kane', 'Alan Moore'],
  ['heroes', 'What is the Flash\'s real name in the 2023 film "The Flash"?', 'Barry Allen', 'Wally West', 'Jay Garrick', 'Bart Allen'],
  ['heroes', 'Which Infinity Stone was hidden on the planet Vormir?', 'The Soul Stone', 'The Mind Stone', 'The Time Stone', 'The Reality Stone'],
  ['heroes', 'What is the name of Batman\'s butler?', 'Alfred Pennyworth', 'Lucius Fox', 'James Gordon', 'Edwin Jarvis'],

  // Animals
  ['animals', 'How many hearts does an octopus have?', '3', '1', '2', '8'],
  ['animals', 'What is the only mammal capable of true flight?', 'The bat', 'The flying squirrel', 'The sugar glider', 'The colugo'],
  ['animals', 'What colour is a polar bear\'s skin?', 'Black', 'White', 'Pink', 'Grey'],
  ['animals', 'Which animal has the longest pregnancy of any land mammal?', 'The African elephant', 'The giraffe', 'The rhinoceros', 'The blue whale'],
  ['animals', 'What is a baby kangaroo called?', 'A joey', 'A kit', 'A cub', 'A pup'],
  ['animals', 'Which bird can fly backwards?', 'The hummingbird', 'The kingfisher', 'The swift', 'The sparrow'],
  ['animals', 'What is the largest species of shark?', 'The whale shark', 'The great white shark', 'The basking shark', 'The tiger shark'],
  ['animals', 'How many stomach compartments does a cow have?', '4', '2', '3', '6'],
  ['animals', 'Which animal\'s fingerprints are almost identical to a human\'s?', 'The koala', 'The chimpanzee', 'The gorilla', 'The raccoon'],

  // Sports
  ['sports', 'In which year were the first modern Olympic Games held?', '1896', '1900', '1888', '1912'],
  ['sports', 'How many players are on a rugby union team on the field?', '15', '13', '11', '12'],
  ['sports', 'Which country has won the most FIFA World Cups?', 'Brazil', 'Germany', 'Italy', 'Argentina'],
  ['sports', 'In golf, what is three under par on a single hole called?', 'An albatross', 'An eagle', 'A condor', 'A birdie'],
  ['sports', 'Who holds the record for the most career home runs in Major League Baseball?', 'Barry Bonds', 'Hank Aaron', 'Babe Ruth', 'Alex Rodriguez'],
  ['sports', 'What is the maximum break in snooker?', '147', '155', '140', '180'],
  ['sports', 'Which tennis tournament is played on grass?', 'Wimbledon', 'The French Open', 'The US Open', 'The Australian Open'],
  ['sports', 'How long is a marathon?', '26.2 miles', '24 miles', '25.5 miles', '27.3 miles'],
  ['sports', 'Which quarterback has won the most Super Bowls?', 'Tom Brady', 'Joe Montana', 'Terry Bradshaw', 'Patrick Mahomes'],

  // Food & drink
  ['food', 'Which spice comes from the crocus flower and is the most expensive by weight?', 'Saffron', 'Vanilla', 'Cardamom', 'Turmeric'],
  ['food', 'What is the main ingredient of traditional hummus?', 'Chickpeas', 'Lentils', 'Fava beans', 'White beans'],
  ['food', 'Which country does the cheese Manchego come from?', 'Spain', 'Italy', 'Portugal', 'Greece'],
  ['food', 'What type of pastry are éclairs and profiteroles made from?', 'Choux pastry', 'Puff pastry', 'Shortcrust pastry', 'Filo pastry'],
  ['food', 'What is the Japanese word for raw fish served without rice?', 'Sashimi', 'Sushi', 'Nigiri', 'Tempura'],
  ['food', 'Which nut is used to make marzipan?', 'Almond', 'Hazelnut', 'Pistachio', 'Walnut'],
  ['food', 'Which grape is used to make most red Burgundy wine?', 'Pinot Noir', 'Merlot', 'Cabernet Sauvignon', 'Syrah'],
  ['food', 'What is the scale used to measure the heat of chili peppers?', 'The Scoville scale', 'The Mohs scale', 'The Brix scale', 'The Kelvin scale'],
  ['food', 'Which Italian city is the home of pesto?', 'Genoa', 'Naples', 'Bologna', 'Florence'],

  // Science
  ['science', 'What is the chemical symbol for tungsten?', 'W', 'Tu', 'Tn', 'Tg'],
  ['science', 'What is the most abundant gas in Earth\'s atmosphere?', 'Nitrogen', 'Oxygen', 'Argon', 'Carbon dioxide'],
  ['science', 'What is the powerhouse of the cell?', 'The mitochondria', 'The nucleus', 'The ribosome', 'The Golgi apparatus'],
  ['science', 'What is the speed of light, roughly, in kilometres per second?', '300,000', '150,000', '30,000', '3,000,000'],
  ['science', 'Which scientist proposed the three laws of motion?', 'Isaac Newton', 'Galileo Galilei', 'Albert Einstein', 'Johannes Kepler'],
  ['science', 'What is the hardest natural substance?', 'Diamond', 'Quartz', 'Titanium', 'Graphene'],
  ['science', 'How many chromosomes do humans normally have?', '46', '23', '48', '44'],
  ['science', 'What is the pH of pure water at room temperature?', '7', '0', '5', '14'],
  ['science', 'Which element has the atomic number 1?', 'Hydrogen', 'Helium', 'Oxygen', 'Carbon'],
  ['science', 'What is the largest organ of the human body?', 'The skin', 'The liver', 'The brain', 'The lungs'],

  // Space
  ['space', 'Which planet has the most known moons?', 'Saturn', 'Jupiter', 'Uranus', 'Neptune'],
  ['space', 'What is the nearest large spiral galaxy to the Milky Way?', 'Andromeda', 'Triangulum', 'Sombrero', 'Whirlpool'],
  ['space', 'How long does light from the Sun take to reach Earth?', 'About 8 minutes', 'About 8 seconds', 'About 1 hour', 'About 1 day'],
  ['space', 'What was the name of the first artificial satellite?', 'Sputnik 1', 'Explorer 1', 'Vostok 1', 'Luna 1'],
  ['space', 'Which planet rotates on its side?', 'Uranus', 'Neptune', 'Venus', 'Mars'],
  ['space', 'What is the hottest planet in our solar system?', 'Venus', 'Mercury', 'Mars', 'Jupiter'],
  ['space', 'Who was the first woman to travel into space?', 'Valentina Tereshkova', 'Sally Ride', 'Mae Jemison', 'Svetlana Savitskaya'],
  ['space', 'What is the largest volcano in the solar system?', 'Olympus Mons', 'Mauna Kea', 'Maxwell Montes', 'Elysium Mons'],
  ['space', 'Which space telescope, launched in 2021, is seen as Hubble\'s successor?', 'James Webb', 'Kepler', 'Spitzer', 'Chandra'],

  // History
  ['history', 'In which year did the Berlin Wall fall?', '1989', '1991', '1985', '1979'],
  ['history', 'Who was the first emperor of Rome?', 'Augustus', 'Julius Caesar', 'Nero', 'Caligula'],
  ['history', 'Which ancient wonder was located in Alexandria?', 'The Lighthouse', 'The Hanging Gardens', 'The Colossus', 'The Mausoleum'],
  ['history', 'In which year did the Titanic sink?', '1912', '1905', '1915', '1921'],
  ['history', 'Which English king had six wives?', 'Henry VIII', 'Henry VII', 'Edward VI', 'Richard III'],
  ['history', 'The Magna Carta was signed in which year?', '1215', '1066', '1415', '1314'],
  ['history', 'Who was the US president during the Louisiana Purchase?', 'Thomas Jefferson', 'John Adams', 'James Madison', 'George Washington'],
  ['history', 'Which empire was ruled by Suleiman the Magnificent?', 'The Ottoman Empire', 'The Persian Empire', 'The Mughal Empire', 'The Byzantine Empire'],
  ['history', 'What year did World War I begin?', '1914', '1912', '1916', '1918'],
  ['history', 'Who led the first expedition to sail all the way around the world?', 'Ferdinand Magellan', 'Francis Drake', 'Christopher Columbus', 'Vasco da Gama'],

  // Geography
  ['geography', 'What is the capital of Australia?', 'Canberra', 'Sydney', 'Melbourne', 'Perth'],
  ['geography', 'Which country has the most time zones, counting overseas territories?', 'France', 'Russia', 'United States', 'United Kingdom'],
  ['geography', 'What is the smallest country in the world by area?', 'Vatican City', 'Monaco', 'San Marino', 'Liechtenstein'],
  ['geography', 'Which river flows through Baghdad?', 'The Tigris', 'The Euphrates', 'The Jordan', 'The Nile'],
  ['geography', 'What is the capital of Canada?', 'Ottawa', 'Toronto', 'Montreal', 'Vancouver'],
  ['geography', 'Which African country was formerly known as Abyssinia?', 'Ethiopia', 'Eritrea', 'Somalia', 'Sudan'],
  ['geography', 'What is the deepest lake in the world?', 'Lake Baikal', 'Lake Tanganyika', 'Lake Superior', 'Crater Lake'],
  ['geography', 'Which US state has the longest coastline?', 'Alaska', 'Florida', 'California', 'Hawaii'],
  ['geography', 'Which desert is the driest non-polar desert on Earth?', 'The Atacama', 'The Sahara', 'The Gobi', 'The Kalahari'],
  ['geography', 'What is the capital of New Zealand?', 'Wellington', 'Auckland', 'Christchurch', 'Queenstown'],

  // Brands
  ['brands', 'What was Google\'s original name?', 'BackRub', 'Googol', 'PageRank', 'SearchIt'],
  ['brands', 'Which company makes the PlayStation?', 'Sony', 'Nintendo', 'Microsoft', 'Sega'],
  ['brands', 'What does "IKEA" stand for, roughly?', 'The founder\'s initials, farm and village', 'Swedish for "home living"', 'International Kitchen Equipment Association', 'Nothing, it is made up'],
  ['brands', 'Which car company has a prancing horse logo?', 'Ferrari', 'Lamborghini', 'Porsche', 'Maserati'],
  ['brands', 'Nike is named after a goddess from which mythology?', 'Greek', 'Roman', 'Norse', 'Egyptian'],
  ['brands', 'What was the original name of Pepsi?', 'Brad\'s Drink', 'Cola Delight', 'Pep Soda', 'Caleb\'s Cola'],
  ['brands', 'Which company\'s logo is a bitten apple?', 'Apple', 'Acer', 'BlackBerry', 'Asus'],
  ['brands', 'Which fashion brand uses a crocodile logo?', 'Lacoste', 'Ralph Lauren', 'Fred Perry', 'Tommy Hilfiger'],
  ['brands', 'The LEGO company is based in which country?', 'Denmark', 'Sweden', 'Germany', 'Netherlands'],

  // Throwback
  ['decades', 'Which year did the first iPhone go on sale?', '2007', '2005', '2009', '2010'],
  ['decades', 'Which band sang "Bohemian Rhapsody" in 1975?', 'Queen', 'ABBA', 'The Eagles', 'Fleetwood Mac'],
  ['decades', 'What dance craze swept the world in 1996 with a song by Los del Río?', 'The Macarena', 'The Lambada', 'The Electric Slide', 'The Running Man'],
  ['decades', 'Which toy was the must-have gift of Christmas 1998?', 'Furby', 'Tickle Me Elmo', 'Tamagotchi', 'Beanie Babies'],
  ['decades', 'Which 1980s puzzle has 43 quintillion possible positions?', 'Rubik\'s Cube', 'Tetris', 'Simon', 'Rubik\'s Snake'],
  ['decades', 'In which year was Woodstock held?', '1969', '1967', '1971', '1965'],
  ['decades', 'Which 1977 film made Darth Vader famous?', 'Star Wars', 'The Empire Strikes Back', 'Close Encounters of the Third Kind', 'Alien'],
  ['decades', 'What did the "Y2K bug" worry people would break?', 'Computers reading the year 2000 as 1900', 'Phone networks running out of numbers', 'Satellites falling from orbit', 'Bank cards expiring'],
  ['decades', 'Which company released the Walkman in 1979?', 'Sony', 'Panasonic', 'Philips', 'Toshiba'],

  // Tech & gaming
  ['tech', 'What does "HTTP" stand for?', 'HyperText Transfer Protocol', 'High Transfer Text Protocol', 'HyperText Transmission Program', 'Hosted Text Transfer Protocol'],
  ['tech', 'Who is credited with inventing the World Wide Web?', 'Tim Berners-Lee', 'Bill Gates', 'Vint Cerf', 'Steve Jobs'],
  ['tech', 'In which year was the original PlayStation released in Japan?', '1994', '1991', '1996', '1998'],
  ['tech', 'In which year was the first "Super Mario Bros." released?', '1985', '1981', '1989', '1990'],
  ['tech', 'What does "GPU" stand for?', 'Graphics Processing Unit', 'General Processing Unit', 'Graphics Power Unit', 'Gaming Processing Unit'],
  ['tech', 'How many bits are in a byte?', '8', '4', '16', '10'],
  ['tech', 'Which programming language was named after a comedy troupe?', 'Python', 'Ruby', 'Java', 'Perl'],
  ['tech', 'What was the name of the first web browser?', 'WorldWideWeb', 'Mosaic', 'Netscape Navigator', 'Lynx'],
  ['tech', 'In "Minecraft", what material do you need to build a Nether portal?', 'Obsidian', 'Bedrock', 'Netherrack', 'Diamond'],
  ['tech', 'In which country was the game "Tetris" first created?', 'The Soviet Union', 'Japan', 'United States', 'Finland'],
];

export function buildHardQuestions(): BankQuestion[] {
  const rng = mulberry32(1616);
  const counts = new Map<string, number>();
  return HARD.map(([category, prompt, right, ...wrong]) => {
    const n = (counts.get(category) ?? 0) + 1;
    counts.set(category, n);
    const choices = /^\d/.test(right) ? [right, ...wrong].sort((a, b) => parseFloat(a.replace(/,/g, '')) - parseFloat(b.replace(/,/g, ''))) : shuffle([right, ...wrong], rng);
    return { id: `hard-${category}-${String(n).padStart(2, '0')}`, category, age: 'expert', prompt, choices, answer: choices.indexOf(right) };
  });
}
