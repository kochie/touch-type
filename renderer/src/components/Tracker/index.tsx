"use client";
import { useCallback, useEffect, useLayoutEffect, useReducer, useRef, useState } from "react";
import { LetterStat, statsReducer, StatState } from "./reducers";
import { DateTime, Interval } from "luxon";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faDungeon,
  faPercentage,
  faPersonRunning,
} from "@fortawesome/pro-duotone-svg-icons";
import Canvas from "../Canvas";
import { Key, Keyboard } from "@/keyboards/key";
import sampleSize from "lodash.samplesize";
import { useSettings } from "@/lib/settings_hook";
import { useWords } from "@/lib/word-provider";
import { lookupKeyboard } from "@/keyboards";
import { useResults } from "@/lib/result-provider";
import { ModalType, useModal } from "@/lib/modal-provider";


export interface KeyPress {
  key: Key;
  ttl: number;
  i: number;
  j: number;
  correct: boolean;
}

export interface CurrentKeyRef {
  current: Key
  i: number
  j: number
}

const initialStat: StatState = {
  correct: 0,
  incorrect: 0,
  time: Interval.after(DateTime.now(), 0),
  start: DateTime.now(),
  letters: [] as LetterStat[],
  immutableLetters: [] as LetterStat[],
};

export default function Tracker() {
  const settings = useSettings();
  const {modal} = useModal()

  const [words, setWords] = useState("");
  const [wordList] = useWords();

  const {putResult} = useResults()

  const [{ correct, incorrect, time, letters, immutableLetters }, statsDispatch] = useReducer(
    statsReducer,
    initialStat,
  );


  const resetWords = useCallback(async () => {
    const pinned = sampleSize(wordList, 15).join(" ").replaceAll("  ", "");
    setWords(pinned);
  }, [wordList]);

  useEffect(() => {
    resetWords();
  }, [resetWords]);

  const keys = useRef<KeyPress[]>([]);
  const [currentKey, setCurrentKey] = useState<CurrentKeyRef>();
  useLayoutEffect(() => {
    if (words.length === 0) return;
    console.log(letters.length, words[letters.length]);
    const key = keyboard.findKey(words[letters.length]);
    const [i, j] = keyboard.findIndex(words[letters.length]);
    setCurrentKey({ current: key, i, j })
  }, [letters.length, words])

  const d = (time as Interval).toDuration();
  const total = correct + incorrect;
  const m = d.toMillis() / 1000 / 60;
  const cpm = total / m;
  const p = (correct / total) * 100;

  const keyboardLayout = lookupKeyboard(settings.keyboardName);
  const keyboard = new Keyboard(keyboardLayout);

  const intervalFn = () => {
    if (letters.length > 0) statsDispatch({ type: "TICK" });
  };

  const keyDown = (e: KeyboardEvent, ctx: CanvasRenderingContext2D) => {
    if (modal !== ModalType.NONE) {
      return;
    }

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
    e.preventDefault();

    if (!keyboard.keyExists(e.key)) return;

    if (letters.length === 0) {
      statsDispatch({ type: "START" });
    }

    const key = keyboard.findKey(e.key);
    const [i, j] = keyboard.findIndex(e.key);

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
      const results = {
        correct,
        incorrect,
        keyPresses: [...immutableLetters],
        time: (time as Interval).toDuration().toISO() ?? "",
        datetime: new Date().toISOString(),
        level: settings.levelName,
        keyboard: settings.keyboardName,
        language: settings.language,
      };

      putResult(results)
      resetWords();
      statsDispatch({ type: "RESET" });
    }

    if (e.key === words[letters.length]) {
      keyboard.drawKey(ctx, i, j, key, "rgba(0, 255, 0, 0.5)");
    } else {
      keyboard.drawKey(ctx, i, j, key, "rgba(255, 0, 0, 0.5)");
    }
  };


  return (
    <div className="">
      <div className="flex gap-10 justify-between pt-10 font-mono mx-auto w-[600px]">
        <div className="flex items-center">
          <FontAwesomeIcon icon={faDungeon} size="3x" />
          <div className="ml-5">
            <p className="text-4xl">{incorrect}</p>
            <p className="text-sm text-gray-400">typos</p>
          </div>
        </div>
        <div className="flex items-center">
          <FontAwesomeIcon icon={faPersonRunning} size="3x" />
          <div className="ml-5">
            <p className="text-4xl">
              {Number.isFinite(cpm) ? cpm.toFixed(0) : 0}
            </p>
            <p className="text-sm text-gray-400">char/min</p>
          </div>
        </div>
        <div className="flex items-center">
          <FontAwesomeIcon icon={faPercentage} size="3x" />
          <div className="ml-5">
            <p className="text-4xl">{Number.isFinite(p) ? p.toFixed(0) : 0}</p>
            <p className="text-sm text-gray-400">accuracy</p>
          </div>
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
