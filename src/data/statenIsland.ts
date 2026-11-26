import type { AgeGroup } from '../game/session';
import type { BankQuestion } from '../game/session';

/** Staten Island trivia. Each entry: prompt, choices (first one is right), age. Facts checked against public sources. */
const K: AgeGroup = 'kids';
const T: AgeGroup = 'teen';
const A: AgeGroup = 'adult';

const SI: [string, string[], AgeGroup][] = [
  ['How much does it cost to ride the Staten Island Ferry?', ['Nothing, it’s free', '$2.90', '$5', '$1'], K],
  ['Which bridge connects Staten Island to Brooklyn?', ['Verrazzano-Narrows Bridge', 'Brooklyn Bridge', 'Goethals Bridge', 'Bayonne Bridge'], K],
  ['Staten Island Chuck, who predicts the weather every February 2nd, is what kind of animal?', ['Groundhog', 'Beaver', 'Squirrel', 'Raccoon'], K],
  ['Which is New York City’s least populated borough?', ['Staten Island', 'The Bronx', 'Manhattan', 'Queens'], K],
  ['The Staten Island Ferry is famous for its bright color. What color is it?', ['Orange', 'Blue', 'Green', 'Yellow'], K],
  ['From the Staten Island Ferry you get a great free view of which famous statue?', ['The Statue of Liberty', 'The Charging Bull', 'The Thinker', 'Atlas'], K],
  ['In which Staten Island neighborhood does the ferry dock?', ['St. George', 'Tottenville', 'Great Kills', 'New Dorp'], T],
  ['The Staten Island Ferry sails to which terminal in Manhattan?', ['Whitehall Terminal', 'Grand Central Terminal', 'Port Authority', 'Pier 17'], T],
  ['Which of these bridges does NOT connect Staten Island to New Jersey?', ['George Washington Bridge', 'Goethals Bridge', 'Outerbridge Crossing', 'Bayonne Bridge'], T],
  ['The Outerbridge Crossing got its name from…', ['A man named Outerbridge', 'Being the outermost bridge', 'A ship called the Outer', 'Its outer walkway'], A],
  ['Staten Island is the same place as which New York county?', ['Richmond County', 'Kings County', 'Nassau County', 'Westchester County'], T],
  ['Which famous hip-hop group comes from Staten Island, which they nicknamed “Shaolin”?', ['Wu-Tang Clan', 'Run-DMC', 'Public Enemy', 'A Tribe Called Quest'], T],
  ['Which comedian starred in the 2020 movie “The King of Staten Island”, based on his own life?', ['Pete Davidson', 'Adam Sandler', 'Kevin Hart', 'Seth Rogen'], T],
  ['The four friends of TV’s “Impractical Jokers” grew up in which borough?', ['Staten Island', 'Queens', 'The Bronx', 'Brooklyn'], T],
  ['Freshkills Park is being built on top of what?', ['A huge former landfill', 'An old airport', 'A drained lake', 'An army base'], T],
  ['The Staten Island Railway runs from St. George to which South Shore neighborhood?', ['Tottenville', 'Port Richmond', 'West Brighton', 'Stapleton'], T],
  ['Tottenville, on Staten Island, is the southernmost point of which state?', ['New York', 'New Jersey', 'Connecticut', 'Pennsylvania'], T],
  ['Staten Island’s name comes from the Dutch “Staaten Eylandt”, honoring…', ['The Dutch parliament, the States General', 'A Dutch captain named Staaten', 'The island’s stone cliffs', 'A Lenape chief'], A],
  ['Todt Hill on Staten Island is famous for being…', ['The highest point on the Atlantic coast from Maine to Florida', 'The site of the first ferry dock', 'A volcano', 'The oldest vineyard in America'], A],
  ['In 1776, Benjamin Franklin and John Adams met British Admiral Lord Howe for peace talks at which Staten Island house?', ['The Conference House', 'The Alice Austen House', 'The Seguine Mansion', 'Snug Harbor'], A],
  ['Sailors’ Snug Harbor in Livingston was first built as a home for whom?', ['Retired sailors', 'Orphans', 'Soldiers’ widows', 'Ferry captains'], T],
  ['Historic Richmond Town is…', ['A historic village and museum complex', 'A shopping mall', 'A minor league ballpark', 'A ferry boat'], T],
  ['Which Staten Island team began playing baseball in St. George in 2022?', ['Staten Island FerryHawks', 'Staten Island Yankees', 'Staten Island Pirates', 'Staten Island Mets'], T],
  ['Before 2021, Staten Island’s minor league team was a farm team of which MLB club?', ['New York Yankees', 'New York Mets', 'Boston Red Sox', 'Philadelphia Phillies'], T],
  ['In 1964, a team from Staten Island’s Mid-Island Little League won what?', ['The Little League World Series', 'The Super Bowl', 'The Stanley Cup', 'The U.S. Open'], A],
  ['Denino’s, a Port Richmond pizzeria famous for thin-crust pies, has been around since…', ['1937', '1987', '1965', '2001'], A],
  ['In 1993, Staten Island voters said yes to what?', ['Leaving New York City to become their own city', 'Building a subway to Manhattan', 'Making the ferry free', 'Renaming the borough'], A],
  ['The Staten Island Expressway is part of which interstate highway?', ['I-278', 'I-95', 'I-80', 'I-495'], A],
  ['Staten Island is often nicknamed…', ['The Forgotten Borough', 'The Big Apple', 'The Empire Borough', 'The Island of Lights'], T],
  ['The Alice Austen House in Rosebank honors one of America’s first female…', ['Photographers', 'Senators', 'Pilots', 'Doctors'], A],
  ['Which inventor, who worked on an early telephone, lived in the Rosebank house that is now a museum with Garibaldi’s name?', ['Antonio Meucci', 'Alexander Graham Bell', 'Thomas Edison', 'Nikola Tesla'], A],
  ['Sandy Ground, on Staten Island’s South Shore, is one of the oldest settlements in the U.S. founded by…', ['Free Black Americans', 'Dutch fur traders', 'Irish fishermen', 'Swedish farmers'], A],
  ['In 2014, the groundhog playing Staten Island Chuck famously slipped from the hands of which mayor?', ['Bill de Blasio', 'Michael Bloomberg', 'Rudy Giuliani', 'Eric Adams'], T],
  ['The Staten Island Greenbelt is…', ['A huge network of parks and woodland trails', 'A toll road', 'A ferry route', 'A shopping district'], T],
  ['Which Staten Island college sits on Grymes Hill?', ['Wagner College', 'Fordham University', 'Hofstra University', 'Pace University'], A],
];

export function buildStatenIslandQuestions(): BankQuestion[] {
  return SI.map(([prompt, choices, age], i) => ({
    id: `statenisland-${String(i + 1).padStart(3, '0')}`,
    category: 'statenisland' as const,
    age,
    prompt,
    choices,
    answer: 0,
  }));
}
