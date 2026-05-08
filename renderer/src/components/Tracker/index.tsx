"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useReducer,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { LetterStat, statsReducer, StatState } from "./reducers";
import { DateTime, Duration, Interval } from "luxon";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faDungeon,
  faPercentage,
  faPersonRunning,
  faSwords,
  faFlag,
} from "@fortawesome/pro-duotone-svg-icons";
import Canvas from "../Canvas";
import { Key, Keyboard } from "@/keyboards/key";
import sample from "lodash.sample";
import { useSettings } from "@/lib/settings_hook";
import { useWords } from "@/lib/word-provider";
import { lookupKeyboard } from "@/keyboards";
import { Result, useResults } from "@/lib/result-provider";
import { ModalType, useModal } from "@/lib/modal-provider";
import { usePvP } from "@/lib/pvp-provider";
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

export default function Tracker() {
  const settings = useSettings();
  const { modal } = useModal();
  const router = useRouter();
  const { currentRace, completeRace, forfeitRace } = usePvP();

  const [words, setWords] = useState("");
  const [wordList] = useWords();
  const [showChange, setShowChange] = useState(false);

  const { putResult } = useResults();

  const [
    { correct, incorrect, time, letters, immutableLetters },
    statsDispatch,
  ] = useReducer(statsReducer, initialStat);

  const resetWords = useCallback(async () => {
    // PvP mode: word_set is locked at challenge creation; never re-sample.
    if (currentRace) {
      const set =
        currentRace.kind === "creating"
          ? currentRace.wordSet
          : currentRace.challenge.word_set;
      setWords(set.join(" "));
      return;
    }
    const selected: string[] = [];
    for (let i = 0; i < 15; i++) {
      selected.push(sample(wordList)!);
    }
    const pinned = selected.join(" ").replaceAll("  ", "");
    setWords(pinned);
  }, [wordList, currentRace]);

  useEffect(() => {
    resetWords();
  }, [resetWords]);

  const keys = useRef<KeyPress[]>([]);
  const [currentKey, setCurrentKey] = useState<CurrentKeyRef>();

  useLayoutEffect(() => {
    if (words.length === 0) return;
    // After a PvP race completes the keyDown handler navigates away, but
    // this effect fires once more before unmount with letters.length ===
    // words.length — guard the bounds so words[letters.length] isn't
    // undefined.
    if (letters.length >= words.length) return;
    const next = words[letters.length].toLowerCase();
    if (!keyboard.keyExists(next)) return;
    const key = keyboard.findKey(next);
    const [i, j] = keyboard.findIndex(next);
    setCurrentKey({ current: key, i, j });
  }, [letters.length, words]);

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
    e.preventDefault();

    if (e.key === "Shift") return;

    if (e.key === "Backspace") {
      statsDispatch({ type: "BACKSPACE" });
      return;
    }
    if (e.key === "Escape") {
      // PvP mode: Escape is a no-op (use the Forfeit button to exit).
      if (currentRace) return;
      if (letters.length === 0) {
        resetWords();
      }
      statsDispatch({ type: "RESET" });
      return;
    }
    if (!keyboard.keyExists(e.key.toLowerCase())) return;

    if (letters.length === 0) {
      statsDispatch({ type: "START" });
      setShowChange(false);
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
      setShowChange(true);
      const finalCpm =
        (correct + incorrect) / (time.toDuration().toMillis() / 1000 / 60);
      const isoTime = (time as Interval).toDuration().toISO() ?? "";
      const finalKeyPresses = [...immutableLetters];

      if (currentRace) {
        // PvP mode: route the completed race to the provider, then navigate
        // to the challenge detail page so the user sees the link (creating)
        // or the result comparison (racing).
        completeRace({
          cpm: finalCpm,
          correct,
          incorrect,
          time: isoTime,
          key_presses: finalKeyPresses,
        }).then((completed) => {
          if (completed) {
            router.push(`/pvp/challenge?id=${completed.id}`);
          } else {
            router.push("/pvp");
          }
        });
      } else {
        const results: Result = {
          correct,
          incorrect,
          keyPresses: finalKeyPresses,
          time: isoTime,
          datetime: new Date().toISOString(),
          level: settings.levelName,
          keyboard: settings.keyboardName,
          language: settings.language,
          capital: settings.capital,
          punctuation: settings.punctuation,
          numbers: settings.numbers,
          cpm: finalCpm,
        };

        putResult(results);
        resetWords();
        statsDispatch({ type: "RESET" });
      }
    }

    if (e.key === words[letters.length]) {
      keyboard.drawKey(ctx, i, j, key, "rgba(0, 255, 0, 0.5)");
    } else {
      keyboard.drawKey(ctx, i, j, key, "rgba(255, 0, 0, 0.5)");
    }
  };

  const handleForfeit = () => {
    forfeitRace();
    router.push("/pvp");
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

  // PvP banner content
  const pvpBanner = currentRace ? (
    <div
      data-testid="pvp-mode-banner"
      className="flex items-center justify-between gap-4 px-4 py-2 mb-2 mx-auto max-w-[800px] rounded-lg bg-yellow-500/15 border border-yellow-500/40 text-yellow-100"
    >
      <div className="flex items-center gap-2">
        <FontAwesomeIcon icon={faSwords} className="w-5 h-5 text-yellow-400" />
        <span className="font-bold">PvP Battle</span>
        <span className="text-sm opacity-80">
          {currentRace.kind === "racing"
            ? `Target ${Math.round(currentRace.challenge.challenger_cpm)} CPM`
            : "Setting the score to beat"}
        </span>
      </div>
      <button
        data-testid="pvp-forfeit"
        onClick={handleForfeit}
        className="flex items-center gap-1 px-3 py-1 rounded-md bg-red-500/80 hover:bg-red-500 text-white text-sm font-semibold transition-colors"
      >
        <FontAwesomeIcon icon={faFlag} className="w-3 h-3" />
        Forfeit
      </button>
    </div>
  ) : null;

  return (
    <div
      className={clsx(
        currentRace &&
          "ring-4 ring-yellow-500/60 ring-offset-0 rounded-lg pb-2",
      )}
    >
      {pvpBanner}
      <div className="flex gap-10 justify-between pt-10 font-mono mx-auto w-[600px]">
        <div className="flex items-center">
          <FontAwesomeIcon icon={faDungeon} size="3x" />
          <div className="ml-5">
            <p className="text-4xl">{incorrect}</p>
            <p className="text-sm text-gray-400">typos</p>
          </div>
          {showChange && !currentRace ? (
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
          {showChange && !currentRace ? (
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
          {showChange && !currentRace ? (
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
