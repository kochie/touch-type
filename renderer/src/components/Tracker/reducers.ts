import { DateTime, Interval } from "luxon";

export type StatAction =
  | { type: "CORRECT"; key: string }
  | { type: "INCORRECT"; key: string; pressedKey: string }
  | { type: "BACKSPACE" }
  | { type: "START" }
  | { type: "RESET" }
  | { type: "TICK" };

export interface LetterStat {
  key: string;
  correct: boolean;
  pressedKey?: string;
  timestamp?: number;
}

export interface StatState {
  correct: number;
  incorrect: number;
  start: DateTime;
  time: Interval;
  letters: LetterStat[];
  immutableLetters: LetterStat[];
}

export const statsReducer = (state: StatState, action: StatAction) => {
  switch (action.type) {
    case "CORRECT": {
      return {
        ...state,
        correct: state.correct + 1,
        time: Interval.fromDateTimes(state.start, DateTime.now()),
        letters: [...state.letters, { key: action.key, correct: true }],
        immutableLetters: [
          ...state.immutableLetters,
          { key: action.key, correct: true, timestamp: DateTime.now().toMillis()},
        ],
      };
    }
    case "INCORRECT": {
      return {
        ...state,
        incorrect: state.incorrect + 1,
        time: Interval.fromDateTimes(state.start, DateTime.now()),
        letters: [
          ...state.letters,
          { key: action.key, correct: false, pressedKey: action.pressedKey },
        ],
        immutableLetters: [
          ...state.immutableLetters,
          {
            key: action.key,
            correct: false,
            timestamp: DateTime.now().toMillis(),
            pressedKey: action.pressedKey,
          },
        ],
      };
    }
    case "BACKSPACE":
      return {
        ...state,
        time: Interval.fromDateTimes(state.start, DateTime.now()),
        letters: [...state.letters.slice(0, -1)],
      };
    case "START":
      return {
        ...state,
        start: DateTime.now(),
      };
    case "RESET":
      return {
        correct: 0,
        incorrect: 0,
        time: Interval.after(DateTime.now(), 0),
        letters: [] as LetterStat[],
        immutableLetters: [] as LetterStat[],
      };
    case "TICK":
      return {
        ...state,
        time: Interval.fromDateTimes(state.start, DateTime.now()),
      };
    default:
      return state;
  }
};
