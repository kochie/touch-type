"use client";
import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { LetterStat, StatAction, statsReducer, StatState } from "./reducers";
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
import { useMutation } from "@apollo/client";
import { PUT_RESULT } from "@/transactions/putResult";
import { useResults } from "@/lib/result-provider";
import { ModalType, useModal } from "@/lib/modal-provider";

// import wordBlob from "@/assets/words.txt";

// import en from "@/assets/wordsets/en.txt"
// import fr from "@/assets/wordsets/fr.txt"
// import de from "@/assets/wordsets/de.txt"
// import es from "@/assets/wordsets/es.txt"

// interface IndexProps {
//   wordList: string[];
// }

// const wordSets = {
//   [Languages.ENGLISH]: en.replaceAll("\r", "").split("\n"),
//   [Languages.FRENCH]: fr.replaceAll("\r", "").split("\n"),
//   [Languages.GERMAN]: de.replaceAll("\r", "").split("\n"),
//   [Languages.SPANISH]: es.replaceAll("\r", "").split("\n")
// }

// const wordList = wordBlob.replaceAll("\r", "").split("\n");

export interface KeyPress {
  key: Key;
  ttl: number;
  i: number;
  j: number;
  correct: boolean;
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

  // const getWordList = useCallback(async () => {
  //   const buffer = (await window.electronAPI.getWordSet(
  //     settings.language
  //   )) as Uint8Array;

  //   const words = new TextDecoder("utf-8")
  //     .decode(buffer)
  //     .replaceAll("\r", "")
  //     .split("\n");
  //   const filtered = words.filter((word) => word.match(settings.level));
  //   setWordList(filtered);
  // }, [settings.level, settings.language]);

  // useEffect(() => {
  //   getWordList();
  // }, [getWordList]);

  const resetWords = useCallback(async () => {
    const pinned = sampleSize(wordList, 15).join(" ").replaceAll("  ", "");
    setWords(pinned);
  }, [wordList]);

  useEffect(() => {
    resetWords();
  }, [resetWords]);

  const keys = useRef<KeyPress[]>([]);

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
      // dispatch({ type: "CORRECT", key: words[letters.length] });
      statsDispatch({ type: "CORRECT", key: words[letters.length] });
      keys.current.push({ key: key, ttl: 255, i, j, correct: true });
    } else {
      // dispatch({ type: "INCORRECT", key: words[letters.length] });
      statsDispatch({
        type: "INCORRECT",
        key: words[letters.length],
        pressedKey: e.key,
      });
      keys.current.push({ key: key, ttl: 255, i, j, correct: false });
    }

    if (letters.length === words.length - 1) {
      // const filtered = ()
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

      

      // TODO: catch error with notification
      // TODO: check if looged in first
      

      resetWords();
      // setWords(sampleSize(filtered, 15).join(" ").replace("  ", ""));
      // const prevResults = JSON.parse(localStorage.getItem("results") ?? "[]");
      // localStorage.setItem(
      //   "results",
      //   JSON.stringify([...prevResults, results]),
      // );

      // dispatch({ type: "RESET" });
      statsDispatch({ type: "RESET" });
    }

    // if (!KEYS.keyExists(e.key)) return;

    // ctx.scale(1, 1);
    // const key = KEYS.findKey(e.key)
    if (e.key === words[letters.length]) {
      keyboard.drawKey(ctx, i, j, key, "rgba(0, 255, 0, 0.5)");
    } else {
      keyboard.drawKey(ctx, i, j, key, "rgba(255, 0, 0, 0.5)");
    }
  };

  return (
    <div className="">
      <div className="flex gap-10 justify-between pt-10 font-mono mx-auto w-[600px]">
        {/* <p>Correct: {correct}</p> */}
        <div className="flex items-center">
          <FontAwesomeIcon icon={faDungeon} size="3x" />
          <div className="ml-5">
            <p className="text-4xl">{incorrect}</p>
            <p className="text-sm text-gray-400">typos</p>
          </div>
        </div>
        {/* <p>Time: {d.toFormat("mm:ss")}</p> */}
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
          // <span
          //   key={i}
          //   className={letter.correct ? "bg-green-300" : "bg-red-500"}
          // >
          //   {letter.key}
          // </span>
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
        keyDown={keyDown}
        keys={keys}
        intervalFn={intervalFn}
      />
    </div>
  );
}
