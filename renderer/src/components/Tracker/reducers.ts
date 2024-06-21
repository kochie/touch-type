import { DateTime, Interval } from "luxon";

export const statsReducer = (state, action) => {
  switch (action.type) {
    case "CORRECT":
      return {
        ...state,
        correct: state.correct + 1,
        time: Interval.fromDateTimes(state.start, DateTime.now()),
        letters: [...state.letters, { key: action.key, correct: true }],
      };
    case "INCORRECT":
      return {
        ...state,
        incorrect: state.incorrect + 1,
        time: Interval.fromDateTimes(state.start, DateTime.now()),
        letters: [...state.letters, { key: action.key, correct: false }],
      };
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
        letters: [],
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
