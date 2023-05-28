"use client"
import { useEffect, useReducer, useRef, useState } from "react";
import { statsReducer } from "./reducers";
import { DateTime, Interval } from "luxon";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faDungeon, faPercentage, faPersonRunning } from "@fortawesome/pro-duotone-svg-icons";
import Canvas from "../Canvas";
import { Key, Keyboard } from "@/lib/keyboard_layouts";
import sampleSize from "lodash.samplesize";
import { useSettings } from "@/lib/settings_hook";

import wordBlob from "@/assets/words.txt"

interface IndexProps {
    wordList: string[];
  }

const wordList = wordBlob.replaceAll("\r", "").split("\n");

interface KeyPress {
  key: Key;
  ttl: number;
  i: number;
  j: number;
  correct: boolean;
}

export default function Tracker({modal}) {
  const [words, setWords] = useState("")

  const [{ correct, incorrect, time, letters }, statsDispatch] = useReducer(
    statsReducer,
    {
      correct: 0,
      incorrect: 0,
      time: Interval.after(DateTime.now(), 0),
      start: DateTime.now(),
      letters: [],
    }
  );

  const settings = useSettings()

  useEffect(() => {
    const filtered = wordList.filter((word) => word.match(settings.level));
    // console.log(filtered);
    setWords(sampleSize(filtered, 15).join(" "));
  }, [wordList, settings.level]);

  const keys = useRef<KeyPress[]>([]);

  const d = (time as Interval).toDuration();
  const total = correct + incorrect;
  const m = d.toMillis() / 1000 / 60;
  const cpm = total / m;
  const p = (correct / total) * 100;

  const keyboard = new Keyboard(settings.keyboard);

  const intervalFn = () => {
    if (letters.length > 0) statsDispatch({ type: "TICK" });
  };

  const keyDown = (e: KeyboardEvent, ctx: CanvasRenderingContext2D) => {
    if (modal) {
      return;
    }

    if (e.key === "Backspace") {
      statsDispatch({ type: "BACKSPACE" });
      return;
    }
    if (e.key === "Escape") {
      if (letters.length === 0) {
        const filtered = wordList.filter((word) => word.match(settings.level));
        // console.log(LEVEL_1);
        setWords(sampleSize(filtered, 15).join(" "));
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
      statsDispatch({ type: "INCORRECT", key: words[letters.length] });
      keys.current.push({ key: key, ttl: 255, i, j, correct: false });
    }

    if (letters.length === words.length - 1) {
      const filtered = wordList.filter((word) => word.match(settings.level));
      setWords(sampleSize(filtered, 15).join(" ").replace("  ", ""));
      const prevResults = JSON.parse(localStorage.getItem("results") ?? "[]");
      localStorage.setItem(
        "results",
        JSON.stringify([
          ...prevResults,
          {
            correct,
            incorrect,
            time: (time as Interval).toDuration().toISO(),
            level: settings.levelName,
            keyboard: settings.keyboardName,
          },
        ])
      );
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
              <p className="text-4xl">
                {Number.isFinite(p) ? p.toFixed(0) : 0}
              </p>
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
  )
}