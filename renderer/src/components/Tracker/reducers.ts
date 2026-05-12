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
  start: Temporal.Instant;
  time: Temporal.Duration;
  letters: LetterStat[];
  immutableLetters: LetterStat[];
}

export const statsReducer = (state: StatState, action: StatAction) => {
  switch (action.type) {
    case "CORRECT": {
      return {
        ...state,
        correct: state.correct + 1,
        time: state.start.until(Temporal.Now.instant()),
        letters: [...state.letters, { key: action.key, correct: true }],
        immutableLetters: [
          ...state.immutableLetters,
          { key: action.key, correct: true, timestamp: Temporal.Now.instant().epochMilliseconds },
        ],
      };
    }
    case "INCORRECT": {
      return {
        ...state,
        incorrect: state.incorrect + 1,
        time: state.start.until(Temporal.Now.instant()),
        letters: [
          ...state.letters,
          { key: action.key, correct: false, pressedKey: action.pressedKey },
        ],
        immutableLetters: [
          ...state.immutableLetters,
          {
            key: action.key,
            correct: false,
            timestamp: Temporal.Now.instant().epochMilliseconds,
            pressedKey: action.pressedKey,
          },
        ],
      };
    }
    case "BACKSPACE":
      return {
        ...state,
        time: state.start.until(Temporal.Now.instant()),
        letters: [...state.letters.slice(0, -1)],
      };
    case "START":
      return {
        ...state,
        start: Temporal.Now.instant(),
      };
    case "RESET":
      return {
        correct: 0,
        incorrect: 0,
        start: Temporal.Now.instant(),
        time: Temporal.Duration.from({ milliseconds: 0 }),
        letters: [] as LetterStat[],
        immutableLetters: [] as LetterStat[],
      };
    case "TICK":
      return {
        ...state,
        time: state.start.until(Temporal.Now.instant()),
      };
    default:
      return state;
  }
};
