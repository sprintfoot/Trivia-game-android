import { mulberry32, shuffle, type AgeGroup, type BankQuestion } from '../game/session';
import type { CategoryId } from '../game/categories';

/**
 * Holiday packs: one category per holiday, so a December party can go all-in on Christmas.
 * Each entry: prompt, right answer, three wrong answers, age.
 */
const K: AgeGroup = 'kids';
const T: AgeGroup = 'teen';
const A: AgeGroup = 'adult';

type Q = [string, string, [string, string, string], AgeGroup];

export const HOLIDAY_PACKS: Record<'christmas' | 'halloween' | 'thanksgiving' | 'valentines' | 'july4' | 'newyear', Q[]> = {
  christmas: [
    ['What does Frosty the Snowman have for a nose?', 'A button', ['A carrot', 'A coal lump', 'A cherry'], K],
    ['In "How the Grinch Stole Christmas!", where does the Grinch live?', 'Mount Crumpit', ['Whoville', 'The North Pole', 'Candy Cane Lane'], T],
    ['Which reindeer is NOT one of Santa’s original eight from "’Twas the Night Before Christmas"?', 'Rudolph', ['Dasher', 'Comet', 'Blitzen'], T],
    ['In the movie "Elf", what is Buddy’s favorite food group?', 'Candy', ['Pizza', 'Cookies', 'Syrup'], T],
    ['What do children traditionally leave out for Santa in the United States?', 'Milk and cookies', ['Hot cocoa and toast', 'Apples and cheese', 'Juice and cake'], K],
    ['In "A Christmas Carol", what is Scrooge’s first name?', 'Ebenezer', ['Jacob', 'Bob', 'Fezziwig'], T],
    ['How many ghosts visit Scrooge in "A Christmas Carol", counting Jacob Marley?', 'Four', ['Three', 'Two', 'Five'], A],
    ['In "Home Alone", where are the McCallisters flying when they leave Kevin behind?', 'Paris', ['London', 'Rome', 'Florida'], T],
    ['What color are the berries of the mistletoe plant usually?', 'White', ['Red', 'Blue', 'Black'], A],
    ['Which famous New York tree is lit every year near the ice rink?', 'Rockefeller Center Christmas Tree', ['Times Square Tree', 'Central Park Pine', 'Bryant Park Spruce'], K],
    ['In the movie "A Christmas Story", what does Ralphie want for Christmas?', 'A Red Ryder BB gun', ['A bicycle', 'A train set', 'A puppy'], T],
    ['What are Santa’s helpers at the North Pole usually called?', 'Elves', ['Gnomes', 'Fairies', 'Pixies'], K],
    ['In the song, what did "my true love" give on the fifth day of Christmas?', 'Five golden rings', ['Five French hens', 'Five swans a-swimming', 'Five turtle doves'], K],
    ['Which plant, native to Mexico, has red leaves and is a Christmas favorite?', 'Poinsettia', ['Holly', 'Amaryllis', 'Ivy'], T],
    ['What is the best-selling single of all time, according to Guinness World Records?', 'White Christmas by Bing Crosby', ['Jingle Bell Rock by Bobby Helms', 'All I Want for Christmas Is You by Mariah Carey', 'Last Christmas by Wham!'], A],
    ['What is a Yule log in a bakery?', 'A rolled chocolate cake', ['A gingerbread house', 'A fruitcake', 'A candy cane'], T],
  ],
  halloween: [
    ['What do kids say at the door on Halloween?', 'Trick or treat!', ['Happy Halloween!', 'Boo to you!', 'Candy please!'], K],
    ['What is a carved Halloween pumpkin with a candle inside called?', 'Jack-o’-lantern', ['Pumpkin lamp', 'Gourd glow', 'Spook light'], K],
    ['Halloween traditions grew out of which ancient Celtic festival?', 'Samhain', ['Beltane', 'Yule', 'Imbolc'], A],
    ['In the original Irish tradition, jack-o’-lanterns were carved from which vegetable?', 'Turnips', ['Potatoes', 'Squash', 'Beets'], A],
    ['Which author wrote "Frankenstein"?', 'Mary Shelley', ['Bram Stoker', 'Edgar Allan Poe', 'Stephen King'], T],
    ['Which author wrote "Dracula"?', 'Bram Stoker', ['Mary Shelley', 'Oscar Wilde', 'H.G. Wells'], T],
    ['Which Halloween candy is shaped like a tiny cone with three colored stripes?', 'Candy corn', ['Jelly beans', 'Gumdrops', 'Smarties'], K],
    ['What animal do vampires famously turn into?', 'A bat', ['A wolf', 'A raven', 'A cat'], K],
    ['In "Hocus Pocus", how many Sanderson sisters are there?', 'Three', ['Two', 'Four', 'Five'], T],
    ['What is the name of the pumpkin king in "The Nightmare Before Christmas"?', 'Jack Skellington', ['Oogie Boogie', 'Zero', 'Lock'], K],
    ['Which ghost-busting team says "Who you gonna call?"', 'Ghostbusters', ['Scooby-Doo gang', 'The Addams Family', 'The Munsters'], K],
    ['In "Sleepy Hollow", what does the Headless Horseman throw?', 'A pumpkin', ['A lantern', 'A skull', 'A sword'], A],
    ['Which month is Halloween in?', 'October', ['September', 'November', 'August'], K],
    ['What is the fear of Halloween called?', 'Samhainophobia', ['Arachnophobia', 'Coulrophobia', 'Hallowphobia'], A],
    ['Which famous magician died on Halloween in 1926?', 'Harry Houdini', ['David Copperfield', 'Harry Blackstone', 'Howard Thurston'], A],
  ],
  thanksgiving: [
    ['What bird is the star of most Thanksgiving dinners?', 'Turkey', ['Chicken', 'Duck', 'Goose'], K],
    ['Which ship brought the Pilgrims to America in 1620?', 'The Mayflower', ['The Santa Maria', 'The Endeavour', 'The Speedwell'], K],
    ['The 1621 harvest feast is often called the first Thanksgiving. Which Native American people shared it with the Pilgrims?', 'The Wampanoag', ['The Cherokee', 'The Iroquois', 'The Sioux'], T],
    ['Which president made Thanksgiving a national holiday in 1863?', 'Abraham Lincoln', ['George Washington', 'Thomas Jefferson', 'Franklin D. Roosevelt'], T],
    ['Which writer campaigned for years to make Thanksgiving a national holiday?', 'Sarah Josepha Hale', ['Louisa May Alcott', 'Harriet Beecher Stowe', 'Emily Dickinson'], A],
    ['Which department store holds the famous Thanksgiving Day Parade in New York City?', 'Macy’s', ['Bloomingdale’s', 'Saks', 'Gimbels'], K],
    ['Which two NFL teams traditionally host a game on Thanksgiving every year?', 'Detroit Lions and Dallas Cowboys', ['New York Giants and Chicago Bears', 'Green Bay Packers and Pittsburgh Steelers', 'Miami Dolphins and New England Patriots'], T],
    ['What is the turkey the president lets go each year said to receive?', 'A pardon', ['A medal', 'A key to the city', 'A crown'], K],
    ['What tart red berry is made into a sauce for Thanksgiving?', 'Cranberry', ['Raspberry', 'Cherry', 'Strawberry'], K],
    ['The Friday after Thanksgiving is known for big sales. What is it called?', 'Black Friday', ['Cyber Friday', 'Sale Day', 'Gold Friday'], K],
    ['In which Massachusetts town did the Pilgrims settle?', 'Plymouth', ['Boston', 'Salem', 'Cape Cod'], T],
    ['Canada celebrates Thanksgiving in which month?', 'October', ['November', 'September', 'December'], T],
    ['Which president moved Thanksgiving a week earlier in 1939, a change people nicknamed "Franksgiving"?', 'Franklin D. Roosevelt', ['Herbert Hoover', 'Harry Truman', 'Calvin Coolidge'], A],
    ['What is the wishbone of a turkey also called?', 'The furcula', ['The sternum', 'The clavicle', 'The keel'], A],
    ['Which pie made from an orange squash is a Thanksgiving classic?', 'Pumpkin pie', ['Sweet potato pie', 'Carrot pie', 'Apple pie'], K],
  ],
  valentines: [
    ['What date is Valentine’s Day?', 'February 14', ['February 12', 'March 14', 'January 14'], K],
    ['What shape is most often used as the symbol of Valentine’s Day?', 'A heart', ['A star', 'A circle', 'A diamond'], K],
    ['Which flower is the classic Valentine’s gift?', 'Red rose', ['Tulip', 'Daisy', 'Sunflower'], K],
    ['What are the small heart-shaped candies with short messages on them called?', 'Conversation hearts', ['Love bites', 'Kiss drops', 'Sweet talkers'], K],
    ['In which Italian city do "Romeo and Juliet" take place?', 'Verona', ['Venice', 'Rome', 'Florence'], T],
    ['What do the letters "XO" mean at the end of a love note?', 'Kisses and hugs', ['Love and peace', 'Yes and no', 'Forever and always'], K],
    ['Which Greek god is the counterpart of the Roman Cupid?', 'Eros', ['Apollo', 'Hermes', 'Ares'], T],
    ['In Japan, on Valentine’s Day, who traditionally gives chocolate?', 'Women give chocolate to men', ['Men give chocolate to women', 'Children give it to teachers', 'Nobody, it’s not celebrated'], A],
    ['What is the name of the day on March 14 when men return the favor in Japan?', 'White Day', ['Red Day', 'Sweet Day', 'Thanks Day'], A],
    ['Which famous love story ends with the sinking of a ship?', 'Titanic', ['The Notebook', 'Casablanca', 'Grease'], T],
    ['What is Cupid usually holding?', 'A bow and arrows', ['A harp', 'A rose', 'A wand'], K],
    ['Which song from "The Lion King" is a love duet?', 'Can You Feel the Love Tonight', ['Hakuna Matata', 'Circle of Life', 'Be Prepared'], K],
    ['Which Shakespeare play includes the line "Wherefore art thou Romeo?"', 'Romeo and Juliet', ['Hamlet', 'Macbeth', 'Othello'], T],
    ['Which ancient Roman festival in mid-February is sometimes linked to Valentine’s Day?', 'Lupercalia', ['Saturnalia', 'Floralia', 'Vestalia'], A],
    ['What does "Galentine’s Day", popularized by "Parks and Recreation", celebrate?', 'Friendship between women', ['Single people', 'Pets', 'Grandparents'], A],
  ],
  july4: [
    ['What document was approved on July 4, 1776?', 'The Declaration of Independence', ['The Constitution', 'The Bill of Rights', 'The Gettysburg Address'], K],
    ['From which country did the 13 colonies declare independence?', 'Great Britain', ['France', 'Spain', 'The Netherlands'], K],
    ['Who was the main author of the Declaration of Independence?', 'Thomas Jefferson', ['George Washington', 'Benjamin Franklin', 'John Adams'], T],
    ['Whose large signature on the Declaration became a nickname for any signature?', 'John Hancock', ['Samuel Adams', 'Paul Revere', 'Ben Franklin'], T],
    ['How many stars are on the U.S. flag today?', '50', ['48', '13', '52'], K],
    ['How many stripes are on the U.S. flag?', '13', ['10', '12', '50'], K],
    ['Which two Founding Fathers, and later presidents, both died on July 4, 1826?', 'John Adams and Thomas Jefferson', ['George Washington and James Madison', 'James Monroe and John Quincy Adams', 'Benjamin Franklin and Alexander Hamilton'], A],
    ['In which city was the Declaration of Independence signed?', 'Philadelphia', ['Boston', 'New York', 'Washington, D.C.'], T],
    ['What famous bell in Philadelphia has a big crack in it?', 'The Liberty Bell', ['The Freedom Bell', 'The Victory Bell', 'The Founders’ Bell'], K],
    ['Which hot dog eating contest is held every Fourth of July on Coney Island?', 'Nathan’s Famous', ['Gray’s Papaya', 'Oscar Mayer', 'Hebrew National'], T],
    ['What is the U.S. national anthem?', 'The Star-Spangled Banner', ['America the Beautiful', 'God Bless America', 'My Country, ’Tis of Thee'], K],
    ['Who wrote the words to "The Star-Spangled Banner"?', 'Francis Scott Key', ['Betsy Ross', 'Paul Revere', 'Thomas Paine'], T],
    ['The Statue of Liberty was a gift from which country?', 'France', ['Great Britain', 'Italy', 'Spain'], K],
    ['Who was president on July 4, 1976, the 200th birthday of the U.S.?', 'Gerald Ford', ['Richard Nixon', 'Jimmy Carter', 'Ronald Reagan'], A],
    ['What do the 13 stripes on the U.S. flag stand for?', 'The original 13 colonies', ['13 battles', '13 presidents', '13 founders'], K],
  ],
  newyear: [
    ['What drops in Times Square at midnight on New Year’s Eve?', 'A giant ball', ['A star', 'Confetti cannon', 'A clock'], K],
    ['What song is traditionally sung at midnight on New Year’s?', 'Auld Lang Syne', ['Jingle Bells', 'Happy Birthday', 'Silent Night'], K],
    ['What do people make on January 1 to improve themselves?', 'Resolutions', ['Wishes', 'Promises to pets', 'Snow angels'], K],
    ['"Auld Lang Syne" is a poem by which Scottish poet?', 'Robert Burns', ['Walter Scott', 'Robert Louis Stevenson', 'Arthur Conan Doyle'], A],
    ['What does "Auld Lang Syne" roughly mean?', 'Old long since, or days gone by', ['Happy new year', 'Good luck to all', 'Sing together'], A],
    ['In Spain, what do people eat at each stroke of midnight on New Year’s Eve?', 'Twelve grapes', ['Twelve olives', 'Twelve almonds', 'Twelve cherries'], T],
    ['Which Pacific nation is among the first to celebrate the New Year each year?', 'Kiribati', ['Hawaii', 'Fiji', 'Samoa (American)'], A],
    ['January is named after which Roman god with two faces?', 'Janus', ['Jupiter', 'Juno', 'Mars'], T],
    ['In the Chinese zodiac, how many animals are there?', '12', ['10', '8', '13'], K],
    ['What is the Scottish name for New Year’s Eve celebrations?', 'Hogmanay', ['Ceilidh', 'Burns Night', 'Beltane'], A],
    ['Which sparkling wine is the classic New Year’s toast?', 'Champagne', ['Chardonnay', 'Merlot', 'Sangria'], T],
    ['What is the Jewish New Year called?', 'Rosh Hashanah', ['Yom Kippur', 'Passover', 'Purim'], T],
    ['What lucky Southern U.S. food is eaten on New Year’s Day?', 'Black-eyed peas', ['Corn on the cob', 'Pecan pie', 'Fried chicken'], A],
    ['What year did the Times Square ball drop begin?', '1907', ['1950', '1925', '1889'], A],
    ['What do noisemakers and party horns help people do at midnight?', 'Make noise to welcome the new year', ['Call the dog', 'Start the countdown', 'Wake up Santa'], K],
  ],
};

export function buildHolidayPackQuestions(): BankQuestion[] {
  const rng = mulberry32(1225);
  const out: BankQuestion[] = [];
  for (const [cat, qs] of Object.entries(HOLIDAY_PACKS)) {
    qs.forEach(([prompt, right, wrong, age], i) => {
      const choices = shuffle([right, ...wrong], rng);
      out.push({ id: `${cat}-${String(i + 1).padStart(3, '0')}`, category: cat as CategoryId, age, prompt, choices, answer: choices.indexOf(right) });
    });
  }
  return out;
}
