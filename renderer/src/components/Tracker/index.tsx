"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useReducer,
  useRef,
  useState,
} from "react";
import { LetterStat, statsReducer, StatState } from "./reducers";
import { DateTime, Duration, Interval } from "luxon";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faDungeon,
  faPercentage,
  faPersonRunning,
} from "@fortawesome/pro-duotone-svg-icons";
import Canvas from "../Canvas";
import { Key, Keyboard } from "@/keyboards/key";
import sample from "lodash.sample";
import { useSettings } from "@/lib/settings_hook";
import { useWords } from "@/lib/word-provider";
import { lookupKeyboard } from "@/keyboards";
import { Result, useResults } from "@/lib/result-provider";
import { ModalType, useModal } from "@/lib/modal-provider";
import clsx from "clsx";

export interface KeyPress {
  key: Key;
  ttl: number;
  i: number;
  j: number;
  correct: boolean;
}

export interface CurrentKeyRef {
  current: Key;
  i: number;
  j: number;
}

const initialStat: StatState = {
  correct: 0,
  incorrect: 0,
  time: Interval.after(DateTime.now(), 0),
  start: DateTime.now(),
  letters: [] as LetterStat[],
  immutableLetters: [] as LetterStat[],
};

function sign(num: number): string {
  if (num > 0) return "+"
  // if (num < 0) return "-"
  return ""
}

export default function Tracker() {
  const settings = useSettings();
  const { modal } = useModal();

  const [words, setWords] = useState("");
  const [wordList] = useWords();
  const [showChange, setShowChange] = useState(false)

  const [wordMetric, setWordMetric] = useState("cpm");

  const { putResult } = useResults();

  const [
    { correct, incorrect, time, letters, immutableLetters },
    statsDispatch,
  ] = useReducer(statsReducer, initialStat);

  const resetWords = useCallback(async () => {
    const selected: string[] = [];
    for (let i = 0; i < 15; i++) {
      selected.push(sample(wordList)!);
    }

    const pinned = selected.join(" ").replaceAll("  ", "");
    setWords(pinned);
  }, [wordList]);

  useEffect(() => {
    resetWords();
  }, [resetWords]);

  const keys = useRef<KeyPress[]>([]);
  const [currentKey, setCurrentKey] = useState<CurrentKeyRef>();

  useLayoutEffect(() => {
    if (words.length === 0) return;
    if (!keyboard.keyExists(words[letters.length].toLowerCase())) return;
    const key = keyboard.findKey(words[letters.length].toLowerCase());
    const [i, j] = keyboard.findIndex(words[letters.length].toLowerCase());
    setCurrentKey({ current: key, i, j });
  }, [letters.length, words]);

  const d = (time as Interval).toDuration();
  const total = correct + incorrect;
  const m = d.toMillis() / 1000 / 60;
  const cpm = total / m;
  const cps = cpm / 1000 / 60 / 60;
  const wpm = cpm / 5;
  const p = (correct / total) * 100;

  const keyboardLayout = lookupKeyboard(settings.keyboardName);
  const keyboard = new Keyboard(keyboardLayout);

  const intervalFn = () => {
    if (letters.length > 0) statsDispatch({ type: "TICK" });
  };

  const keyDown = (e: KeyboardEvent, ctx: CanvasRenderingContext2D) => {
    e.preventDefault();
    if (modal !== ModalType.NONE) {
      return;
    }

    if (e.key === "Shift") return;

    if (e.key === "Backspace") {
      statsDispatch({ type: "BACKSPACE" });
      return;
    }
    if (e.key === "Escape") {
      if (letters.length === 0) {
        resetWords();
      }
      statsDispatch({ type: "RESET" });
      return;
    }
    if (!keyboard.keyExists(e.key.toLowerCase())) return;

    if (letters.length === 0) {
      statsDispatch({ type: "START" });
      setShowChange(false)
    }

    const key = keyboard.findKey(e.key.toLowerCase());
    const [i, j] = keyboard.findIndex(e.key.toLowerCase());

    if (key.isInert) return;

    if (e.key === words[letters.length]) {
      statsDispatch({ type: "CORRECT", key: words[letters.length] });
      keys.current.push({ key: key, ttl: 255, i, j, correct: true });
    } else {
      statsDispatch({
        type: "INCORRECT",
        key: words[letters.length],
        pressedKey: e.key,
      });
      keys.current.push({ key: key, ttl: 255, i, j, correct: false });
    }

    if (letters.length === words.length - 1) {
      setShowChange(true)
      const results: Result = {
        correct,
        incorrect,
        keyPresses: [...immutableLetters],
        time: (time as Interval).toDuration().toISO() ?? "",
        datetime: new Date().toISOString(),
        level: settings.levelName,
        keyboard: settings.keyboardName,
        language: settings.language,
        capital: settings.capital,
        punctuation: settings.punctuation,
        numbers: settings.numbers,
      };

      putResult(results);
      resetWords();
      statsDispatch({ type: "RESET" });
    }

    if (e.key === words[letters.length]) {
      keyboard.drawKey(ctx, i, j, key, "rgba(0, 255, 0, 0.5)");
    } else {
      keyboard.drawKey(ctx, i, j, key, "rgba(255, 0, 0, 0.5)");
    }
  };

  const { results } = useResults();
  // get the typo diff between the last two results
  const typoDiff =
    results.length > 1
      ? results[results.length - 1].incorrect -
        results[results.length - 2].incorrect
      : 0;

  let cpmDiff = 0;
  let accuracyDiff = 0
  if (results.length > 1) {
    const cpm1 =
      (results[results.length - 1].correct +
        results[results.length - 1].incorrect) /
      Duration.fromISO(results[results.length - 1].time).as("minutes");
    const cpm2 =
      (results[results.length - 2].correct +
        results[results.length - 2].incorrect) /
      Duration.fromISO(results[results.length - 2].time).as("minutes");
    cpmDiff = cpm1 - cpm2;

    const acc1 = results[results.length-1].correct /(results[results.length-1].correct+results[results.length-1].incorrect)
    const acc2 = results[results.length-2].correct /(results[results.length-2].correct+results[results.length-2].incorrect)

    let accuracyDiff = acc1 - acc2
  }

  return (
    <div className="">
      <div className="flex gap-10 justify-between pt-10 font-mono mx-auto w-[600px]">
        <div className="flex items-center">
          <FontAwesomeIcon icon={faDungeon} size="3x" />
          <div className="ml-5">
            <p className="text-4xl">{incorrect}</p>
            <p className="text-sm text-gray-400">typos</p>
          </div>
          {showChange ? (<div>
            <p
              className={clsx(
                typoDiff <= 0 ? "text-green-400" : "text-red-400",
                "text-sm",
              )}
            >
              {sign(typoDiff)}{typoDiff}
            </p>
          </div>):null}
        </div>
        <div className="flex items-center">
          <FontAwesomeIcon icon={faPersonRunning} size="3x" />
          <div className="ml-5">
            <p className="text-4xl">
              {Number.isFinite(cpm) ? cpm.toFixed(0) : 0}
            </p>
            <p className="text-sm text-gray-400">char/min</p>
          </div>
          {showChange ? (<div>
            <p
              className={clsx(
                cpmDiff >= 0 ? "text-green-400" : "text-red-400",
                "text-sm",
              )}
            >
              {sign(cpmDiff)}{cpmDiff.toFixed(0)}
            </p>
          </div>): null}
        </div>
        <div className="flex items-center">
          <FontAwesomeIcon icon={faPercentage} size="3x" />
          <div className="ml-5">
            <p className="text-4xl">{Number.isFinite(p) ? p.toFixed(0) : 0}</p>
            <p className="text-sm text-gray-400">accuracy</p>
          </div>
          {showChange ? (<div>
            <p
              className={clsx(
                accuracyDiff >= 0 ? "text-green-400" : "text-red-400",
                "text-sm",
              )}
            >
              {sign(accuracyDiff)}{accuracyDiff.toFixed(0)}
            </p>
          </div>): null}
        </div>
      </div>
      <p className="font-['Roboto_Mono'] text-center p-10 whitespace-pre-wrap">
        {letters.map((letter, i) => (
          <span
            key={i}
            className={letter.correct ? "text-gray-400" : "bg-red-500"}
          >
            {letter.key}
          </span>
        ))}
        <span className="bg-yellow-600 font-bold text-gray-200">
          {words[letters.length]}
        </span>
        {words.substring(letters.length + 1, words.length)}
      </p>

      <Canvas
        letters={letters}
        currentKey={currentKey}
        keyDown={keyDown}
        keys={keys}
        intervalFn={intervalFn}
      />
    </div>
  );
}
