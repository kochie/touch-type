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
  faCode,
} from "@fortawesome/pro-duotone-svg-icons";
import Canvas from "../Canvas";
import { Key, Keyboard } from "@/keyboards/key";
import sample from "lodash.sample";
import { useSettings } from "@/lib/settings_hook";
import { useWords } from "@/lib/word-provider";
import { useCode } from "@/lib/code-provider";
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
  if (num > 0) return "+";
  // if (num < 0) return "-"
  return "";
}

/**
 * Render a character with visual indicators for special characters
 */
function renderChar(char: string, isTyped: boolean, isCorrect: boolean, isCurrent: boolean): React.ReactNode {
  const baseClass = isTyped
    ? isCorrect
      ? "text-gray-400"
      : "bg-red-500 text-white"
    : isCurrent
    ? "bg-yellow-600 font-bold text-gray-200"
    : "";

  // Handle special characters with visual indicators
  if (char === "\n") {
    return (
      <span className={clsx(baseClass, "text-gray-500")}>
        {"↵"}
        <br />
      </span>
    );
  }

  if (char === " ") {
    return <span className={baseClass}>{" "}</span>;
  }

  return <span className={baseClass}>{char}</span>;
}

export default function Tracker() {
  const settings = useSettings();
  const { modal } = useModal();

  const [words, setWords] = useState("");
  const [wordList] = useWords();
  const { currentSnippet, nextSnippet } = useCode();
  const [showChange, setShowChange] = useState(false);

  const [wordMetric, setWordMetric] = useState("cpm");

  const { putResult } = useResults();

  const [
    { correct, incorrect, time, letters, immutableLetters },
    statsDispatch,
  ] = useReducer(statsReducer, initialStat);

  // Get the current text based on mode
  const currentText = settings.codeMode ? currentSnippet : words;

  const resetWords = useCallback(async () => {
    if (settings.codeMode) {
      // In code mode, get next snippet from the provider
      nextSnippet();
    } else {
      // In word mode, generate random words
      const selected: string[] = [];
      for (let i = 0; i < 15; i++) {
        selected.push(sample(wordList)!);
      }
      const pinned = selected.join(" ").replaceAll("  ", "");
      setWords(pinned);
    }
  }, [wordList, settings.codeMode, nextSnippet]);

  useEffect(() => {
    resetWords();
  }, [resetWords]);

  const keys = useRef<KeyPress[]>([]);
  const [currentKey, setCurrentKey] = useState<CurrentKeyRef>();

  useLayoutEffect(() => {
    if (currentText.length === 0) return;
    const currentChar = currentText[letters.length];
    if (!currentChar) return;
    
    // For special characters like newline, don't try to find on keyboard
    if (currentChar === "\n" || currentChar === "\t") return;
    
    if (!keyboard.keyExists(currentChar.toLowerCase())) return;
    const key = keyboard.findKey(currentChar.toLowerCase());
    const [i, j] = keyboard.findIndex(currentChar.toLowerCase());
    setCurrentKey({ current: key, i, j });
  }, [letters.length, currentText]);

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
    if (modal !== ModalType.NONE) {
      return;
    }
    e.preventDefault();

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

    const expectedChar = currentText[letters.length];
    if (!expectedChar) return;

    // In code mode, handle special keys
    if (settings.codeMode) {
      // Handle Enter key for newlines
      if (e.key === "Enter" && expectedChar === "\n") {
        if (letters.length === 0) {
          statsDispatch({ type: "START" });
          setShowChange(false);
        }
        statsDispatch({ type: "CORRECT", key: "\n" });
        checkCompletion();
        return;
      }

      // Handle Tab key - convert to spaces based on tabWidth
      if (e.key === "Tab") {
        // Check if we're expecting spaces (indentation)
        const tabSpaces = " ".repeat(settings.tabWidth);
        const remainingText = currentText.substring(letters.length);
        
        if (remainingText.startsWith(tabSpaces)) {
          if (letters.length === 0) {
            statsDispatch({ type: "START" });
            setShowChange(false);
          }
          // Type all the spaces that make up the tab
          for (let i = 0; i < settings.tabWidth; i++) {
            statsDispatch({ type: "CORRECT", key: " " });
          }
          checkCompletion();
          return;
        } else if (expectedChar === " ") {
          // Just type a single space
          if (letters.length === 0) {
            statsDispatch({ type: "START" });
            setShowChange(false);
          }
          statsDispatch({ type: "CORRECT", key: " " });
          checkCompletion();
          return;
        }
      }
    }

    // For regular keys, check if the key exists on keyboard
    // Special handling for newlines and spaces in code mode
    const isSpecialCodeChar = settings.codeMode && (expectedChar === "\n" || expectedChar === " ");
    
    if (!isSpecialCodeChar && !keyboard.keyExists(e.key.toLowerCase())) return;

    if (letters.length === 0) {
      statsDispatch({ type: "START" });
      setShowChange(false);
    }

    // Handle the key press
    let key: Key | null = null;
    let i = 0, j = 0;

    if (keyboard.keyExists(e.key.toLowerCase())) {
      key = keyboard.findKey(e.key.toLowerCase());
      [i, j] = keyboard.findIndex(e.key.toLowerCase());
      if (key.isInert) return;
    }

    if (e.key === expectedChar) {
      statsDispatch({ type: "CORRECT", key: expectedChar });
      if (key) {
        keys.current.push({ key: key, ttl: 255, i, j, correct: true });
        keyboard.drawKey(ctx, i, j, key, "rgba(0, 255, 0, 0.5)");
      }
    } else {
      statsDispatch({
        type: "INCORRECT",
        key: expectedChar,
        pressedKey: e.key,
      });
      if (key) {
        keys.current.push({ key: key, ttl: 255, i, j, correct: false });
        keyboard.drawKey(ctx, i, j, key, "rgba(255, 0, 0, 0.5)");
      }
    }

    checkCompletion();
  };

  const checkCompletion = () => {
    if (letters.length === currentText.length - 1) {
      setShowChange(true);
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
        cpm: (correct + incorrect) / (time.toDuration().toMillis() / 1000 / 60),
        codeMode: settings.codeMode,
        codeLang: settings.codeMode ? settings.codeLang : undefined,
      };

      putResult(results);
      resetWords();
      statsDispatch({ type: "RESET" });
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
  let accuracyDiff = 0;
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

    const acc1 =
      results[results.length - 1].correct /
      (results[results.length - 1].correct +
        results[results.length - 1].incorrect);
    const acc2 =
      results[results.length - 2].correct /
      (results[results.length - 2].correct +
        results[results.length - 2].incorrect);

    let accuracyDiff = acc1 - acc2;
  }

  // Render the text display based on mode
  const renderTextDisplay = () => {
    if (settings.codeMode) {
      // Code mode: multi-line display with special character handling
      return (
        <pre className="font-['Roboto_Mono'] text-left p-6 whitespace-pre bg-gray-900/50 rounded-lg mx-auto max-w-[700px] overflow-x-auto text-sm leading-relaxed">
          {/* Line numbers */}
          <code>
            {currentText.split("").map((char, i) => {
              const isTyped = i < letters.length;
              const isCorrect = isTyped ? letters[i]?.correct : false;
              const isCurrent = i === letters.length;

              if (char === "\n") {
                return (
                  <span
                    key={i}
                    className={clsx(
                      isTyped
                        ? isCorrect
                          ? "text-gray-500"
                          : "bg-red-500 text-white"
                        : isCurrent
                        ? "bg-yellow-600/50"
                        : "text-gray-500",
                    )}
                  >
                    {isCurrent ? "↵" : ""}
                    {"\n"}
                  </span>
                );
              }

              if (char === " " && isCurrent) {
                return (
                  <span
                    key={i}
                    className="bg-yellow-600 font-bold"
                  >
                    {"·"}
                  </span>
                );
              }

              return (
                <span
                  key={i}
                  className={clsx(
                    isTyped
                      ? isCorrect
                        ? "text-gray-400"
                        : "bg-red-500 text-white"
                      : isCurrent
                      ? "bg-yellow-600 font-bold text-gray-200"
                      : "",
                  )}
                >
                  {char}
                </span>
              );
            })}
          </code>
        </pre>
      );
    } else {
      // Word mode: single line display (original behavior)
      return (
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
            {currentText[letters.length]}
          </span>
          {currentText.substring(letters.length + 1, currentText.length)}
        </p>
      );
    }
  };

  return (
    <div className="">
      <div className="flex gap-10 justify-between pt-10 font-mono mx-auto w-[600px]">
        <div className="flex items-center">
          <FontAwesomeIcon icon={settings.codeMode ? faCode : faDungeon} size="3x" />
          <div className="ml-5">
            <p className="text-4xl">{incorrect}</p>
            <p className="text-sm text-gray-400">typos</p>
          </div>
          {showChange ? (
            <div>
              <p
                className={clsx(
                  typoDiff <= 0 ? "text-green-400" : "text-red-400",
                  "text-sm",
                )}
              >
                {sign(typoDiff)}
                {typoDiff}
              </p>
            </div>
          ) : null}
        </div>
        <div className="flex items-center">
          <FontAwesomeIcon icon={faPersonRunning} size="3x" />
          <div className="ml-5">
            <p className="text-4xl">
              {Number.isFinite(cpm) ? cpm.toFixed(0) : 0}
            </p>
            <p className="text-sm text-gray-400">char/min</p>
          </div>
          {showChange ? (
            <div>
              <p
                className={clsx(
                  cpmDiff >= 0 ? "text-green-400" : "text-red-400",
                  "text-sm",
                )}
              >
                {sign(cpmDiff)}
                {cpmDiff.toFixed(0)}
              </p>
            </div>
          ) : null}
        </div>
        <div className="flex items-center">
          <FontAwesomeIcon icon={faPercentage} size="3x" />
          <div className="ml-5">
            <p className="text-4xl">{Number.isFinite(p) ? p.toFixed(0) : 0}</p>
            <p className="text-sm text-gray-400">accuracy</p>
          </div>
          {showChange ? (
            <div>
              <p
                className={clsx(
                  accuracyDiff >= 0 ? "text-green-400" : "text-red-400",
                  "text-sm",
                )}
              >
                {sign(accuracyDiff)}
                {accuracyDiff.toFixed(0)}
              </p>
            </div>
          ) : null}
        </div>
      </div>
      
      {/* Code mode indicator */}
      {settings.codeMode && (
        <div className="text-center text-sm text-gray-500 mt-4">
          <span className="bg-gray-800 px-3 py-1 rounded-full">
            Code Mode: {settings.codeLang.toUpperCase()} | Press Tab for indent, Enter for newline
          </span>
        </div>
      )}
      
      {renderTextDisplay()}

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
