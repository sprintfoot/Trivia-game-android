import questions from './questions.json';
import { buildPictureQuestions } from './pictures';
import { buildTuneQuestions } from './tunes';
import { buildBlankQuestions } from './blanks';
import type { BankQuestion } from '../game/session';

/** Every question in the game: the text bank plus generated picture and tune rounds. */
export const BANK: readonly BankQuestion[] = [...(questions as BankQuestion[]), ...buildPictureQuestions(), ...buildTuneQuestions(), ...buildBlankQuestions()];
