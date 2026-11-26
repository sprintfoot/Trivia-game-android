import questions from './questions.json';
import { buildPictureQuestions } from './pictures';
import type { BankQuestion } from '../game/session';

/** Every question in the game: the text bank plus generated picture rounds. */
export const BANK: readonly BankQuestion[] = [...(questions as BankQuestion[]), ...buildPictureQuestions()];
